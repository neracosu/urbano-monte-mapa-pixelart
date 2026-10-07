import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  acercarEn, aMapa, aPantalla, asentar, escalaMinima, limitar, nivelPara, paradas, siguienteParada, verTodo,
} from '../public/visor/camara.js';

const niveles = [4, 8, 16, 32, 64, 128, 256].map((factor, k) => ({
  k, factor, ancho: Math.ceil(62079 / factor), alto: Math.ceil(62160 / factor),
  cols: Math.ceil(Math.ceil(62079 / factor) / 256), filas: Math.ceil(Math.ceil(62160 / factor) / 256),
}));
const MAPA = { ancho: 62079, alto: 62160, lado: 256, niveles };
const TELEFONO = { ancho: 1170, alto: 2532 };

test('paradas: una por nivel y los aumentos enteros del mas fino', () => {
  const p = paradas(niveles);
  assert.equal(p.length, 14);
  assert.deepEqual(p.slice(0, 7), [1 / 256, 1 / 128, 1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4]);
  assert.deepEqual(p.slice(7), [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
});

test('escalaMinima: la mayor parada en la que el mapa entero cabe', () => {
  assert.equal(escalaMinima(MAPA, TELEFONO), 1 / 64);
  assert.equal(escalaMinima(MAPA, { ancho: 100, alto: 100 }), 1 / 256);
});

test('asentar: la parada mas cercana, nunca por debajo de la minima', () => {
  assert.equal(asentar(0.02, MAPA, TELEFONO), 1 / 64);
  assert.equal(asentar(0.6, MAPA, TELEFONO), 0.5);
  assert.equal(asentar(100, MAPA, TELEFONO), 2);
  assert.equal(asentar(0.0001, MAPA, TELEFONO), 1 / 64);
});

test('asentar con direccion: un gesto corto avanza, no rebota', () => {
  assert.equal(asentar(0.27, MAPA, TELEFONO, 1), 0.5);
  assert.equal(asentar(0.24, MAPA, TELEFONO, -1), 1 / 8);
  assert.equal(asentar(0.25, MAPA, TELEFONO, 1), 0.25);
  assert.equal(asentar(0.25, MAPA, TELEFONO, -1), 0.25);
  assert.equal(asentar(5, MAPA, TELEFONO, 1), 2);
  assert.equal(asentar(0.001, MAPA, TELEFONO, -1), 1 / 64);
});

test('siguienteParada: un paso arriba o abajo, con tope', () => {
  assert.equal(siguienteParada(0.25, 1, MAPA, TELEFONO), 0.5);
  assert.equal(siguienteParada(0.25, -1, MAPA, TELEFONO), 1 / 8);
  assert.equal(siguienteParada(2, 1, MAPA, TELEFONO), 2);
  assert.equal(siguienteParada(1 / 64, -1, MAPA, TELEFONO), 1 / 64);
});

test('nivelPara: el nivel mas grueso cuyo pixel no pasa de dos en pantalla', () => {
  assert.equal(nivelPara(1 / 16, niveles).factor, 16);
  assert.equal(nivelPara(0.05, niveles).factor, 32);
  assert.equal(nivelPara(0.75, niveles).factor, 4);
  assert.equal(nivelPara(0.001, niveles).factor, 256);
});

test('aPantalla y aMapa son inversas', () => {
  const cam = { x: 30000, y: 20000, z: 0.25 };
  const [px, py] = aPantalla(cam, TELEFONO, 31000, 20400);
  assert.deepEqual([px, py], [585 + 250, 1266 + 100]);
  assert.deepEqual(aMapa(cam, TELEFONO, px, py), [31000, 20400]);
});

test('acercarEn deja quieto el punto bajo el dedo', () => {
  const cam = { x: 30000, y: 20000, z: 0.25 };
  const antes = aMapa(cam, TELEFONO, 100, 200);
  const despues = aMapa(acercarEn(cam, 0.5, 100, 200, TELEFONO), TELEFONO, 100, 200);
  assert.ok(Math.abs(antes[0] - despues[0]) < 1e-6 && Math.abs(antes[1] - despues[1]) < 1e-6);
});

test('limitar no deja salir la vista del mapa', () => {
  const c = limitar({ x: -500, y: 999999, z: 0.25 }, MAPA, TELEFONO);
  assert.equal(c.x, 1170 / 2 / 0.25);
  assert.equal(c.y, 62160 - 2532 / 2 / 0.25);
  assert.equal(c.z, 0.25);
});

test('limitar centra el mapa en el eje donde cabe entero y acota la escala', () => {
  const c = limitar({ x: 10, y: 10, z: 0.000001 }, MAPA, TELEFONO);
  assert.deepEqual(c, { x: 62079 / 2, y: 62160 / 2, z: 1 / 64 });
  assert.equal(limitar({ x: 10, y: 10, z: 50 }, MAPA, TELEFONO).z, 2);
});

test('verTodo: centrado y en la escala minima', () => {
  assert.deepEqual(verTodo(MAPA, TELEFONO), { x: 62079 / 2, y: 62160 / 2, z: 1 / 64 });
});
