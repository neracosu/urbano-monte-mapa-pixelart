// Abre una URL en Chromium headless y revisa lo que un ojo se salta:
// errores, recursos que no cargan, desborde a lo ancho y pixel art a escala no entera.
//   node herramientas/ver.mjs <url> [anchoxalto] [captura.png]
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const RUTA_CHROME = 'chrome-linux64/chrome';
const [url, tam = '390x844', captura = 'capturas/ver.png'] = process.argv.slice(2);
if (!url) { console.error('uso: node herramientas/ver.mjs <url> [anchoxalto] [captura.png]'); process.exit(2); }
const [width, height] = tam.split('x').map(Number);

const cache = join(homedir(), '.cache/ms-playwright');
const carpeta = readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort().pop();
if (!carpeta) { console.error(`no hay Chromium en ${cache}`); process.exit(2); }

const navegador = await chromium.launch({ executablePath: join(cache, carpeta, RUTA_CHROME) });
const pagina = await navegador.newPage({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 3 : 1 });
const fallas = [];
pagina.on('console', m => { if (m.type() === 'error') fallas.push(`consola: ${m.text()}`); });
pagina.on('pageerror', e => fallas.push(`error: ${e.message}`));
pagina.on('requestfailed', r => fallas.push(`no cargo: ${r.url()}`));
pagina.on('response', r => { if (r.status() >= 400) fallas.push(`${r.status()}: ${r.url()}`); });

await pagina.goto(url, { waitUntil: 'networkidle' });
const medidas = await pagina.evaluate(() => ({
  desborde: document.documentElement.scrollWidth - window.innerWidth,
  pixel: [...document.querySelectorAll('.pixel')].map(e => {
    const natural = e.naturalWidth || e.width;
    return { quien: e.id || e.getAttribute('src'), natural, k: (e.getBoundingClientRect().width * window.devicePixelRatio) / natural };
  }),
}));
mkdirSync(dirname(captura), { recursive: true });
await pagina.screenshot({ path: captura, fullPage: true });
await navegador.close();

if (medidas.desborde > 0) fallas.push(`la pagina se desborda ${medidas.desborde}px a lo ancho`);
if (!medidas.pixel.length) fallas.push('no hay ningun elemento .pixel en la pagina');
for (const p of medidas.pixel) {
  if (!p.natural) fallas.push(`${p.quien}: no cargo`);
  else if (p.k < 1 || Math.abs(p.k - Math.round(p.k)) > 0.01) fallas.push(`${p.quien}: escala ${p.k.toFixed(3)}, no entera`);
}
console.log(`${url} a ${tam}: ${medidas.pixel.length} elementos de pixel art, captura en ${captura}`);
if (fallas.length) { console.error(fallas.join('\n')); process.exit(1); }
console.log('sin fallas');
