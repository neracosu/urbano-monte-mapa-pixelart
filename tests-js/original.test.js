import assert from 'node:assert/strict';
import { test } from 'node:test';
import { regionOriginal, urlOriginal } from '../public/visor/original.js';

const MAPA = { ancho: 62079, alto: 62160, original: { iiif: 'https://ejemplo.test/iiif/X' } };

test('regionOriginal: la zona en pantalla, en pixeles del escaneo y del lienzo', () => {
  const r = regionOriginal({ x: 31040, y: 31080, z: 0.25 }, { ancho: 512, alto: 512 }, MAPA);
  assert.deepEqual(r, { x: 30016, y: 30056, w: 2048, h: 2048, ancho: 512, izq: 0, arriba: 0, anchoLienzo: 512, altoLienzo: 512 });
});

test('regionOriginal: con el mapa entero a la vista se recorta al mapa', () => {
  const r = regionOriginal({ x: 62079 / 2, y: 31080, z: 1 / 64 }, { ancho: 1170, alto: 2532 }, MAPA);
  assert.deepEqual([r.x, r.y, r.w, r.h], [0, 0, 62079, 62160]);
  assert.equal(r.ancho, 970);
  assert.ok(Math.abs(r.izq - 99.99) < 0.02 && Math.abs(r.arriba - 780.375) < 0.001);
  assert.ok(Math.abs(r.anchoLienzo - 62079 / 64) < 0.001 && Math.abs(r.altoLienzo - 971.25) < 0.001);
});

test('regionOriginal: no pide mas detalle del que tiene el escaneo ni mas del tope', () => {
  const cerca = regionOriginal({ x: 31040, y: 31080, z: 2 }, { ancho: 1000, alto: 1000 }, MAPA);
  assert.equal(cerca.w, 500);
  assert.equal(cerca.ancho, 500);       // ampliado en pantalla, no en el servidor
  const ancha = regionOriginal({ x: 31040, y: 31080, z: 0.25 }, { ancho: 3840, alto: 2160 }, MAPA);
  assert.equal(ancha.ancho, 2048);      // tope del pedido
});

test('urlOriginal: region y ancho en el formato de IIIF', () => {
  assert.equal(urlOriginal(MAPA, { x: 30016, y: 30056, w: 2048, h: 2048, ancho: 512 }),
    'https://ejemplo.test/iiif/X/30016,30056,2048,2048/512,/0/default.jpg');
  assert.equal(urlOriginal(MAPA, { x: 1, y: 2, w: 30, h: 40, ancho: 15 }, 3), 'https://ejemplo.test/iiif/X/1,2,30,40/15,/270/default.jpg');
});
