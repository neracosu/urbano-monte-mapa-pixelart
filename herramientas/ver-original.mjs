// Comprueba el boton «Original»: trae la digitalizacion, la coloca sobre el mapa y se apaga al mover.
//   node herramientas/ver-original.mjs <url> [anchoxalto] [captura.png]
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const [url, tam = '390x844', captura = 'capturas/original.png'] = process.argv.slice(2);
const [width, height] = tam.split('x').map(Number), movil = width < 600;
const cache = join(homedir(), '.cache/ms-playwright');
const carpeta = readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => a.split('-')[1] - b.split('-')[1]).pop();
const navegador = await chromium.launch({ executablePath: join(cache, carpeta, 'chrome-linux64/chrome') });
const pagina = await navegador.newPage({ viewport: { width, height }, deviceScaleFactor: movil ? 3 : 1 });
const fallas = [];
pagina.on('pageerror', e => fallas.push(`error: ${e.message}`));
try {
  await pagina.goto(url);
  await pagina.waitForSelector('body.listo');
  const descansar = () => pagina.waitForFunction(() => { const e = window.mapa.estado(); return e.reposo && e.faltan === 0; }, null, { timeout: 30000 });
  await descansar();
  for (let i = 0; i < 2; i++) { await pagina.click('#acercar'); await descansar(); }
  mkdirSync(dirname(captura), { recursive: true });
  await pagina.screenshot({ path: captura.replace('.png', '-pixel.png') });
  await pagina.click('#ver-original');
  await pagina.waitForSelector('#original:not([hidden])', { timeout: 30000 });
  const caja = await pagina.evaluate(() => {
    const r = document.getElementById('original').getBoundingClientRect(), i = document.getElementById('original');
    return { x: r.x, y: r.y, w: r.width, h: r.height, natural: i.naturalWidth, pulsado: document.getElementById('ver-original').getAttribute('aria-pressed') };
  });
  if (!caja.natural) fallas.push('la imagen original no cargo');
  if (caja.pulsado !== 'true') fallas.push('el boton no quedo marcado');
  if (caja.w < width * 0.5) fallas.push(`el original mide ${caja.w}px de ancho en una ventana de ${width}`);
  await pagina.screenshot({ path: captura });
  await pagina.mouse.move(width / 2, height / 2);
  await pagina.mouse.down();
  await pagina.mouse.move(width / 2 - 60, height / 2 - 40, { steps: 4 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(300);
  if (!(await pagina.evaluate(() => document.getElementById('original').hidden))) fallas.push('el original no se apago al mover el mapa');
  console.log(`${url} a ${tam}: original de ${caja.natural}px puesto en ${Math.round(caja.x)},${Math.round(caja.y)} ${Math.round(caja.w)}x${Math.round(caja.h)}`);
} catch (e) {
  fallas.push(`la revision no termino: ${e.message.split('\n')[0]}`);
}
await navegador.close();
if (fallas.length) { console.error(fallas.join('\n')); process.exit(1); }
console.log('sin fallas');
