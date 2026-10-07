// La criatura se dibuja fila por fila: cada fila se corre un poco segun una onda (ondular)
// y toda la figura sube y baja (flotar). Siempre en pixeles enteros del dibujo.
import { escalaEntera } from './escala.js';

const lienzo = document.getElementById('lienzo'), g = lienzo.getContext('2d');
const aviso = document.getElementById('aviso');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fondo = new Image(), figura = new Image();

function medir() { escalaEntera(lienzo, lienzo.width); }

function cuadro(ms) {
  const t = ms / 1000;
  g.drawImage(fondo, 0, 0);
  const sube = quieto ? 0 : Math.round(Math.sin(t * 1.6) * 2);
  for (let y = 0; y < figura.naturalHeight; y++) {
    const corre = quieto ? 0 : Math.round(Math.sin(t * 2.4 + y * 0.09) * 1.5);
    g.drawImage(figura, 0, y, figura.naturalWidth, 1, corre, y + sube, figura.naturalWidth, 1);
  }
  if (!quieto) requestAnimationFrame(cuadro);
}

let faltan = 2;
for (const [img, src] of [[fondo, 'criatura-fondo.png'], [figura, 'criatura-sprite.png']]) {
  img.onload = () => {
    if (--faltan) return;
    lienzo.width = fondo.naturalWidth;
    lienzo.height = fondo.naturalHeight;
    g.imageSmoothingEnabled = false;
    medir();
    addEventListener('resize', medir);
    if (quieto) aviso.textContent = 'Su dispositivo pide menos movimiento: la criatura se muestra quieta.';
    requestAnimationFrame(cuadro);
  };
  img.onerror = () => { aviso.textContent = `No se pudo cargar ${src}.`; };
  img.src = src;
}
