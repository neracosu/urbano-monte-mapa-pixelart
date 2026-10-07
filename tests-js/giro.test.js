import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aReal, aVirtual, deltaVirtual, matriz, vista } from '../public/visor/giro.js';

const L = { ancho: 1170, alto: 2532 };

test('vista: en cuartos impares el lienzo se ve acostado', () => {
  assert.deepEqual(vista(L, 0), { ancho: 1170, alto: 2532 });
  assert.deepEqual(vista(L, 1), { ancho: 2532, alto: 1170 });
  assert.deepEqual(vista(L, 2), { ancho: 1170, alto: 2532 });
  assert.deepEqual(vista(L, 3), { ancho: 2532, alto: 1170 });
});

test('matriz: solo ceros, unos y desplazamientos enteros', () => {
  assert.deepEqual(matriz(L, 0), [1, 0, 0, 1, 0, 0]);
  assert.deepEqual(matriz(L, 1), [0, 1, -1, 0, 1170, 0]);
  assert.deepEqual(matriz(L, 2), [-1, 0, 0, -1, 1170, 2532]);
  assert.deepEqual(matriz(L, 3), [0, -1, 1, 0, 0, 2532]);
});

test('aReal lleva las esquinas de la vista a las del lienzo', () => {
  for (let g = 0; g < 4; g++) {
    const v = vista(L, g);
    const esquinas = [[0, 0], [v.ancho, 0], [v.ancho, v.alto], [0, v.alto]].map(([x, y]) => aReal(L, g, x, y).join());
    assert.deepEqual([...esquinas].sort(), ['0,0', '0,2532', '1170,0', '1170,2532'].sort(), `giro ${g}`);
    assert.equal(esquinas[0], ['0,0', '1170,0', '1170,2532', '0,2532'][g], `giro ${g}: a donde va el origen`);
  }
});

test('aVirtual es la inversa de aReal', () => {
  for (let g = 0; g < 4; g++) {
    const [x, y] = aReal(L, g, 123, 456);
    assert.deepEqual(aVirtual(L, g, x, y), [123, 456], `giro ${g}`);
  }
});

test('deltaVirtual: arrastrar a la derecha en pantalla', () => {
  assert.deepEqual(deltaVirtual(0, 10, 0), [10, 0]);
  assert.deepEqual(deltaVirtual(1, 10, 0), [0, -10]);
  assert.deepEqual(deltaVirtual(2, 10, 0), [-10, 0]);
  assert.deepEqual(deltaVirtual(3, 10, 0), [0, 10]);
});
