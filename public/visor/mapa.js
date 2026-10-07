// El mapa: une camara, teselas, pintor y gestos, y expone la API que usa el resto de la pagina.
import { acercarEn, asentar, limitar, nivelPara, siguienteParada, verTodo } from './camara.js';
import { escuchar } from './gestos.js';
import { pintar } from './pintor.js';
import { crearAlmacen } from './teselas.js';

const DENSIDAD_MAX = 3; // tope de pixeles del lienzo por pixel CSS: cuida a los telefonos modestos

export async function crearMapa(el, { base = '' } = {}) {
  const resp = await fetch(`${base}mapa.json`, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`mapa.json respondio ${resp.status}`);
  const mapa = await resp.json();

  const g = el.getContext('2d', { alpha: false });
  const lienzo = { ancho: 0, alto: 0 };
  const oyentes = new Set();
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  let cam = { x: mapa.ancho / 2, y: mapa.alto / 2, z: 1 };
  let ultimo = { faltan: 0 };
  let pendiente = 0, animacion = 0, reposo = true;

  const almacen = crearAlmacen((k, col, fila) => `${base}teselas/${k}/${fila}/${col}.png?v=${mapa.sello}`, pedirCuadro);

  function estado() {
    // nivel y aumento salen de la camara, no del ultimo cuadro; y no hay reposo con un cuadro por pintar
    const nivel = nivelPara(cam.z, mapa.niveles);
    return {
      ...cam, k: nivel.k, aumento: cam.z * nivel.factor, faltan: ultimo.faltan,
      reposo: reposo && !pendiente, ancho: lienzo.ancho, alto: lienzo.alto,
    };
  }
  function pedirCuadro() {
    if (!pendiente) pendiente = requestAnimationFrame(cuadro);
  }
  function cuadro() {
    pendiente = 0;
    if (!lienzo.ancho) return;
    ultimo = pintar(g, lienzo, cam, mapa, almacen);
    for (const f of oyentes) f(estado());
  }
  function poner(nueva) {
    cam = limitar(nueva, mapa, lienzo);
    pedirCuadro();
  }
  function detener() {
    cancelAnimationFrame(animacion);
    animacion = 0;
  }

  // Lleva la escala a zFinal dejando quieto el punto bajo (px, py). Al terminar, el mapa descansa.
  function animar(zFinal, px, py, ms = 180) {
    detener();
    const inicio = cam, t0 = performance.now();
    if (zFinal === cam.z) { reposo = true; pedirCuadro(); return; }
    reposo = false;
    const paso = ahora => {
      const t = quieto.matches ? 1 : Math.min(1, (ahora - t0) / ms), suave = t * (2 - t);
      const z = t === 1 ? zFinal : inicio.z * Math.pow(zFinal / inicio.z, suave);
      poner(acercarEn(inicio, z, px, py, lienzo));
      if (t < 1) animacion = requestAnimationFrame(paso);
      else { animacion = 0; reposo = true; }
    };
    animacion = requestAnimationFrame(paso);
  }

  function medir() {
    const d = Math.min(window.devicePixelRatio || 1, DENSIDAD_MAX);
    const ancho = Math.max(1, Math.round(el.clientWidth * d)), alto = Math.max(1, Math.round(el.clientHeight * d));
    if (ancho === lienzo.ancho && alto === lienzo.alto) return;
    const primera = !lienzo.ancho;
    el.width = lienzo.ancho = ancho;
    el.height = lienzo.alto = alto;
    detener();
    // al cambiar de tamano la escala vuelve a una parada valida para el lienzo nuevo
    cam = primera ? verTodo(mapa, lienzo) : limitar({ ...cam, z: asentar(cam.z, mapa, lienzo) }, mapa, lienzo);
    reposo = true;
    pedirCuadro();
  }

  const centro = () => [lienzo.ancho / 2, lienzo.alto / 2];
  const api = {
    estado,
    proporcion: () => lienzo.ancho / (el.clientWidth || 1),
    mover(dx, dy) {
      detener();
      reposo = false;
      poner({ ...cam, x: cam.x - dx / cam.z, y: cam.y - dy / cam.z });
    },
    escalarEn(f, px, py) {
      detener();
      reposo = false;
      poner(acercarEn(cam, cam.z * f, px, py, lienzo));
    },
    asentar(px = centro()[0], py = centro()[1], dir = 0) {
      animar(asentar(cam.z, mapa, lienzo, dir), px, py);
    },
    paso(dir, px = centro()[0], py = centro()[1]) {
      animar(siguienteParada(cam.z, dir, mapa, lienzo), px, py);
    },
    verTodo() {
      animar(verTodo(mapa, lienzo).z, ...centro(), 260);
    },
    alCambiar(f) {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
  };

  new ResizeObserver(medir).observe(el);
  medir();
  escuchar(el, api);
  return api;
}
