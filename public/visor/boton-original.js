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
    const r = regionOriginal(e, e.vista, mapa.datos);
    if (r.w <= 0 || r.h <= 0) return;
    activo = true;
    nota.hidden = true;
    boton.setAttribute('aria-pressed', 'true');
    boton.setAttribute('aria-busy', 'true');
    // la zona esta en pixeles de la vista; con el mapa girado, sus esquinas caen en otro sitio del canvas
    const [ax, ay] = mapa.aLienzo(r.izq, r.arriba), [bx, by] = mapa.aLienzo(r.izq + r.anchoLienzo, r.arriba + r.altoLienzo);
    Object.assign(capa.style, {
      left: `${Math.min(ax, bx) / k}px`, top: `${Math.min(ay, by) / k}px`,
      width: `${Math.abs(bx - ax) / k}px`, height: `${Math.abs(by - ay) / k}px`,
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
    capa.src = urlOriginal(mapa.datos, r, e.giro);
    // en cuanto el mapa se mueve, el original deja de casar con lo de abajo: se apaga
    soltar = mapa.alCambiar(n => {
      if (n.x !== e.x || n.y !== e.y || n.z !== e.z || n.giro !== e.giro || n.ancho !== e.ancho || n.alto !== e.alto) apagar();
    });
  }

  boton.addEventListener('click', () => (activo ? apagar() : encender()));
}
