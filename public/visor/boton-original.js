// El boton «Original»: superpone sobre el lienzo la digitalizacion real de la zona que se esta viendo.
import { regionOriginal, urlOriginal } from './original.js';

export function conectarOriginal(boton, capa, nota, mapa) {
  let activo = false, soltar = null, reloj = 0;

  function apagar() {
    activo = false;
    boton.setAttribute('aria-pressed', 'false');
    boton.removeAttribute('aria-busy');
    capa.hidden = true;
    capa.removeAttribute('src');
    soltar?.();
    soltar = null;
  }

  function avisar() {
    nota.innerHTML = '';
    nota.append('No se pudo traer la imagen original. Puede verla en ');
    const a = document.createElement('a');
    a.href = mapa.datos.original.ficha;
    a.rel = 'noopener';
    a.textContent = 'la colección David Rumsey';
    nota.append(a, '.');
    nota.hidden = false;
    clearTimeout(reloj);
    reloj = setTimeout(() => { nota.hidden = true; }, 9000);
  }

  function encender() {
    const e = mapa.estado(), k = mapa.proporcion();
    const r = regionOriginal(e, { ancho: e.ancho, alto: e.alto }, mapa.datos);
    if (r.w <= 0 || r.h <= 0) return;
    activo = true;
    nota.hidden = true;
    boton.setAttribute('aria-pressed', 'true');
    boton.setAttribute('aria-busy', 'true');
    Object.assign(capa.style, {
      left: `${r.izq / k}px`, top: `${r.arriba / k}px`, width: `${r.anchoLienzo / k}px`, height: `${r.altoLienzo / k}px`,
    });
    capa.onload = () => {
      if (!activo) return;
      boton.removeAttribute('aria-busy');
      capa.hidden = false;
    };
    capa.onerror = () => {
      if (!activo) return;
      apagar();
      avisar();
    };
    capa.src = urlOriginal(mapa.datos, r);
    // en cuanto el mapa se mueve, el original deja de casar con lo de abajo: se apaga
    soltar = mapa.alCambiar(n => {
      if (n.x !== e.x || n.y !== e.y || n.z !== e.z || n.ancho !== e.ancho || n.alto !== e.alto) apagar();
    });
  }

  boton.addEventListener('click', () => (activo ? apagar() : encender()));
}
