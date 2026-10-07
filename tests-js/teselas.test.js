import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectTesela, visibles } from '../public/visor/teselas.js';

const nivel = (k, factor) => {
  const ancho = Math.ceil(62079 / factor), alto = Math.ceil(62160 / factor);
  return { k, factor, ancho, alto, cols: Math.ceil(ancho / 256), filas: Math.ceil(alto / 256) };
};

test('rectTesela: las del borde miden lo que queda', () => {
  assert.deepEqual(rectTesela(nivel(0, 4), 3, 2, 256), { x: 768, y: 512, w: 256, h: 256 });
  assert.deepEqual(rectTesela(nivel(0, 4), 60, 60, 256), { x: 15360, y: 15360, w: 160, h: 180 });
});

test('visibles: el mapa entero en el telefono', () => {
  const v = visibles({ x: 62079 / 2, y: 62160 / 2, z: 1 / 64 }, { ancho: 1170, alto: 2532 }, nivel(4, 64), 256);
  assert.equal(v.length, 16);
  assert.deepEqual(v[0], { k: 4, col: 0, fila: 0 });
  assert.deepEqual(v[15], { k: 4, col: 3, fila: 3 });
});

test('visibles: solo lo que toca el lienzo', () => {
  const v = visibles({ x: 31040, y: 31080, z: 0.25 }, { ancho: 512, alto: 512 }, nivel(0, 4), 256);
  assert.equal(v.length, 9);
  assert.deepEqual([v[0].col, v[0].fila, v[8].col, v[8].fila], [29, 29, 31, 31]);
});

test('visibles: nada si la vista esta fuera del mapa', () => {
  assert.deepEqual(visibles({ x: -90000, y: 0, z: 0.25 }, { ancho: 512, alto: 512 }, nivel(0, 4), 256), []);
});
