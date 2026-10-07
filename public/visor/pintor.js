// Dibuja un cuadro: las teselas del nivel que toca, en pixeles enteros y sin suavizado.
import { nivelPara } from './camara.js';
import { rectTesela, visibles } from './teselas.js';

const FONDO = '#0f1620';

export function pintar(g, lienzo, cam, mapa, almacen) {
  g.imageSmoothingEnabled = false;
  g.fillStyle = FONDO;
  g.fillRect(0, 0, lienzo.ancho, lienzo.alto);
  const nivel = nivelPara(cam.z, mapa.niveles), s = cam.z * nivel.factor;
  // la esquina del lienzo en pixeles de pantalla del mapa, redondeada: todo lo demas se mide desde ahi
  const ox = Math.round(cam.x * cam.z - lienzo.ancho / 2), oy = Math.round(cam.y * cam.z - lienzo.alto / 2);
  // la tesela mas gruesa cubre el mapa entero: se mantiene siempre a mano como respaldo
  const grueso = mapa.niveles[mapa.niveles.length - 1];
  almacen.pedir(grueso.k, 0, 0);
  let faltan = 0;
  for (const t of visibles(cam, lienzo, nivel, mapa.lado)) {
    const r = rectTesela(nivel, t.col, t.fila, mapa.lado);
    const x0 = Math.round(r.x * s) - ox, y0 = Math.round(r.y * s) - oy;
    const ancho = Math.round((r.x + r.w) * s) - ox - x0, alto = Math.round((r.y + r.h) * s) - oy - y0;
    const img = almacen.pedir(nivel.k, t.col, t.fila);
    if (img) {
      g.drawImage(img, x0, y0, ancho, alto);
      continue;
    }
    faltan++;
    // mientras llega, la misma zona tomada del nivel mas fino que ya este cargado por encima
    for (const otro of mapa.niveles) {
      if (otro.factor <= nivel.factor) continue;
      const d = otro.factor / nivel.factor;
      const col = Math.floor(r.x / d / mapa.lado), fila = Math.floor(r.y / d / mapa.lado);
      const respaldo = almacen.lista(otro.k, col, fila);
      if (!respaldo) continue;
      g.drawImage(respaldo, r.x / d - col * mapa.lado, r.y / d - fila * mapa.lado, r.w / d, r.h / d, x0, y0, ancho, alto);
      break;
    }
  }
  return { faltan, nivel, aumento: s };
}
