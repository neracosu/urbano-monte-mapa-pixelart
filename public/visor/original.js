// «Ver el original»: la misma zona que esta en pantalla, pedida a la coleccion que guarda el manuscrito.
import { aMapa, aPantalla } from './camara.js';

const TOPE = 2048; // ancho maximo del pedido, en pixeles

// La zona visible recortada al mapa: (x, y, w, h) en pixeles del escaneo, el ancho a pedir,
// y donde cae esa zona en el lienzo.
export function regionOriginal(cam, lienzo, mapa, tope = TOPE) {
  const [mx0, my0] = aMapa(cam, lienzo, 0, 0), [mx1, my1] = aMapa(cam, lienzo, lienzo.ancho, lienzo.alto);
  const x = Math.max(0, Math.floor(mx0)), y = Math.max(0, Math.floor(my0));
  const w = Math.min(mapa.ancho, Math.ceil(mx1)) - x, h = Math.min(mapa.alto, Math.ceil(my1)) - y;
  const [izq, arriba] = aPantalla(cam, lienzo, x, y);
  return {
    x, y, w, h,
    ancho: Math.max(1, Math.min(tope, w, Math.round(w * cam.z))),
    izq, arriba, anchoLienzo: w * cam.z, altoLienzo: h * cam.z,
  };
}

export function urlOriginal(mapa, r) {
  return `${mapa.original.iiif}/${r.x},${r.y},${r.w},${r.h}/${r.ancho},/0/default.jpg`;
}
