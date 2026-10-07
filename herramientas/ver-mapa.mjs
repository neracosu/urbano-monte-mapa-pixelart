// Abre el mapa en Chromium headless y comprueba que carga, se mueve y descansa a escala entera.
//   node herramientas/ver-mapa.mjs <url> [anchoxalto] [captura.png] [densidad]
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const RUTA_CHROME = 'chrome-linux64/chrome';
const [url, tam = '390x844', captura = 'capturas/mapa.png', densidad] = process.argv.slice(2);
if (!url) { console.error('uso: node herramientas/ver-mapa.mjs <url> [anchoxalto] [captura.png] [densidad]'); process.exit(2); }
const [width, height] = tam.split('x').map(Number), movil = width < 600;

const cache = join(homedir(), '.cache/ms-playwright');
const carpeta = readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => a.split('-')[1] - b.split('-')[1]).pop();
const navegador = await chromium.launch({ executablePath: join(cache, carpeta, RUTA_CHROME) });
const contexto = await navegador.newContext({
  viewport: { width, height }, deviceScaleFactor: Number(densidad) || (movil ? 3 : 1), hasTouch: movil, isMobile: movil,
});
const pagina = await contexto.newPage();
const fallas = [], cortadas = new Set();
pagina.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fallas.push(`consola: ${m.text()}`); });
pagina.on('pageerror', e => fallas.push(`error: ${e.message}`));
// la primera descarga de una de cada cinco teselas se corta: el mapa tiene que reponerse solo
await pagina.route('**/teselas/**', ruta => {
  const u = ruta.request().url(), n = Number(u.match(/(\d+)\.png/)[1]);
  if (n % 5 === 1 && !cortadas.has(u)) { cortadas.add(u); return ruta.abort(); }
  return ruta.continue();
});

const estado = () => pagina.evaluate(() => window.mapa.estado());
const descansar = async () => {
  await pagina.waitForFunction(() => { const e = window.mapa?.estado(); return e && e.reposo && e.faltan === 0; }, null, { timeout: 30000 });
  return estado();
};
const colores = () => pagina.evaluate(() => {
  const c = document.getElementById('mapa'), g = c.getContext('2d'), vistos = new Set();
  for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) {
    const d = g.getImageData(Math.floor(c.width * i / 20), Math.floor(c.height * j / 20), 1, 1).data;
    vistos.add(`${d[0]},${d[1]},${d[2]}`);
  }
  return vistos.size;
});
const revisar = (e, que) => {
  if (!Number.isInteger(e.aumento)) fallas.push(`${que}: aumento ${e.aumento}, no entero`);
};

try {
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForSelector('body.listo', { timeout: 15000 });
  const inicio = await descansar();
  revisar(inicio, 'al abrir');
  if (await colores() < 8) fallas.push('al abrir: el lienzo esta casi vacio');
  if (inicio.ancho !== Math.round(width * Math.min(Number(densidad) || (movil ? 3 : 1), 3))) fallas.push(`el lienzo mide ${inicio.ancho} de ancho`);

  // acercar tres veces con el boton
  for (let i = 0; i < 3; i++) { await pagina.click('#acercar'); await descansar(); }
  const cerca = await descansar();
  revisar(cerca, 'tras acercar');
  if (!(cerca.z > inicio.z * 7)) fallas.push(`acercar tres veces: de ${inicio.z} a ${cerca.z}`);
  if (await colores() < 8) fallas.push('tras acercar: el lienzo esta casi vacio');

  // arrastrar
  await pagina.mouse.move(width / 2, height / 2);
  await pagina.mouse.down();
  await pagina.mouse.move(width / 2 - 120, height / 2 - 80, { steps: 6 });
  await pagina.mouse.up();
  const movido = await descansar();
  revisar(movido, 'tras arrastrar');
  if (!(movido.x > cerca.x && movido.y > cerca.y)) fallas.push('arrastrar no movio el mapa');
  if (movido.z !== cerca.z) fallas.push('arrastrar cambio la escala');

  // rueda: un paso acerca una parada (con emulacion tactil el navegador no entrega eventos de rueda)
  let rueda = movido;
  if (!movil) {
    await pagina.mouse.wheel(0, -120);
    await pagina.waitForTimeout(400);
    rueda = await descansar();
    revisar(rueda, 'tras la rueda');
    if (!(rueda.z > movido.z)) fallas.push(`un paso de rueda no acerco: ${movido.z} -> ${rueda.z}`);
  }

  // pellizco corto con dos dedos: debe avanzar a la parada siguiente
  if (movil) {
    const cdp = await contexto.newCDPSession(pagina);
    const dedos = sep => [{ x: width / 2 - sep, y: height / 2, id: 1 }, { x: width / 2 + sep, y: height / 2, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: dedos(40) });
    for (const sep of [44, 48, 52, 56]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: dedos(sep) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pagina.waitForTimeout(400);
    const pellizco = await descansar();
    revisar(pellizco, 'tras el pellizco');
    if (!(pellizco.z > rueda.z)) fallas.push(`un pellizco corto no avanzo: ${rueda.z} -> ${pellizco.z}`);
  }

  // cambiar el tamano del lienzo (girar el telefono, ventana mas chica)
  await pagina.setViewportSize({ width: height, height: width });
  await pagina.waitForTimeout(300);
  revisar(await descansar(), 'tras girar');
  await pagina.setViewportSize({ width, height });
  await pagina.waitForTimeout(300);

  // tecla 0: volver a ver todo
  await pagina.focus('#mapa');
  await pagina.keyboard.press('0');
  await pagina.waitForTimeout(500);
  const todo = await descansar();
  revisar(todo, 'tras ver todo');
  if (todo.z !== inicio.z) fallas.push(`ver todo dejo la escala en ${todo.z}, no en ${inicio.z}`);

  const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (desborde > 0) fallas.push(`la pagina se desborda ${desborde}px`);
  if (!cortadas.size) fallas.push('no se corto ninguna tesela: la prueba de reposicion no corrio');
  mkdirSync(dirname(captura), { recursive: true });
  await pagina.screenshot({ path: captura });
  console.log(`${url} a ${tam}: abre en 1/${1 / inicio.z}, llego a ${rueda.z}, ${cortadas.size} teselas cortadas y repuestas`);
} catch (e) {
  fallas.push(`la revision no termino: ${e.message.split('\n')[0]}`);
  mkdirSync(dirname(captura), { recursive: true });
  await pagina.screenshot({ path: captura }).catch(() => {});
}
await navegador.close();
if (fallas.length) { console.error(fallas.join('\n')); process.exit(1); }
console.log('sin fallas');
