// El mapa: une camara, teselas, pintor y gestos, y expone la API que usa el resto de la pagina.
// La camara trabaja sobre la «vista» (el lienzo sin girar); el giro se aplica al pintar y al leer los gestos.
import { acercarEn, asentar, limitar, nivelPara, siguienteParada, verTodo } from './camara.js';
import { escuchar } from './gestos.js';
import { aReal, aVirtual, deltaVirtual, matriz, vista } from './giro.js';
import { pintar } from './pintor.js';
import { crearAlmacen } from './teselas.js';

const DENSIDAD_MAX = 3; // tope de pixeles del lienzo por pixel CSS: cuida a los telefonos modestos
const FONDO = '#0f1620';

export async function crearMapa(el, { base = '' } = {}) {
  const resp = await fetch(`${base}mapa.json`, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`mapa.json respondio ${resp.status}`);
  const mapa = await resp.json();

  const g = el.getContext('2d', { alpha: false });
  const real = { ancho: 0, alto: 0 }; // el canvas en pantalla
  let lienzo = { ancho: 0, alto: 0 }; // la vista: el canvas tal como lo ve la camara
  const oyentes = new Set();
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  let cam = { x: mapa.ancho / 2, y: mapa.alto / 2, z: 1 };
  let giro = 0, desvio = 0; // desvio: radianes que le faltan al giro mientras se anima
  let ultimo = { faltan: 0 };
  let pendiente = 0, animacion = 0, reposo = true;

  const almacen = crearAlmacen((k, col, fila) => `${base}teselas/${k}/${fila}/${col}.png?v=${mapa.sello}`, pedirCuadro);

  function estado() {
    // nivel y aumento salen de la camara, no del ultimo cuadro; y no hay reposo con un cuadro por pintar
    const nivel = nivelPara(cam.z, mapa.niveles);
    return {
      ...cam, giro, k: nivel.k, aumento: cam.z * nivel.factor, faltan: ultimo.faltan,
      reposo: reposo && !pendiente, ancho: real.ancho, alto: real.alto, vista: { ...lienzo },
    };
  }
  function pedirCuadro() {
    if (!pendiente) pendiente = requestAnimationFrame(cuadro);
  }
  function cuadro() {
    pendiente = 0;
    if (!real.ancho) return;
    if (desvio) {
      // a mitad de giro: se limpia todo y se rota alrededor del centro; el suavizado sigue apagado
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = FONDO;
      g.fillRect(0, 0, real.ancho, real.alto);
      g.translate(real.ancho / 2, real.alto / 2);
      g.rotate(giro * Math.PI / 2 + desvio);
      g.translate(-lienzo.ancho / 2, -lienzo.alto / 2);
    } else {
      g.setTransform(...matriz(real, giro));
    }
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
    desvio = 0;
  }

  // Corre paso(t) con t de 0 a 1 durante ms; al terminar, el mapa descansa.
  function animar(ms, paso) {
    detener();
    const t0 = performance.now();
    reposo = false;
    const tic = ahora => {
      const t = quieto.matches ? 1 : Math.max(0, Math.min(1, (ahora - t0) / ms));
      paso(t, t * (2 - t));
      if (t < 1) animacion = requestAnimationFrame(tic);
      else { animacion = 0; reposo = true; }
    };
    animacion = requestAnimationFrame(tic);
  }

  // Lleva la escala a zFinal dejando quieto el punto de la vista (vx, vy).
  function escalar(zFinal, vx, vy, ms = 180) {
    if (zFinal === cam.z) { detener(); reposo = true; pedirCuadro(); return; }
    const inicio = cam;
    animar(ms, (t, suave) => {
      const z = t === 1 ? zFinal : inicio.z * Math.pow(zFinal / inicio.z, suave);
      poner(acercarEn(inicio, z, vx, vy, lienzo));
    });
  }

  function medir() {
    const d = Math.min(window.devicePixelRatio || 1, DENSIDAD_MAX);
    const ancho = Math.max(1, Math.round(el.clientWidth * d)), alto = Math.max(1, Math.round(el.clientHeight * d));
    if (ancho === real.ancho && alto === real.alto) return;
    const primera = !real.ancho;
    el.width = real.ancho = ancho;
    el.height = real.alto = alto;
    lienzo = vista(real, giro);
    detener();
    // al cambiar de tamano la escala vuelve a una parada valida para el lienzo nuevo
    cam = primera ? verTodo(mapa, lienzo) : limitar({ ...cam, z: asentar(cam.z, mapa, lienzo) }, mapa, lienzo);
    reposo = true;
    pedirCuadro();
  }

  // Los gestos y los botones hablan en pixeles del canvas; la camara, en pixeles de la vista.
  const enVista = (px, py) => (px === undefined ? [lienzo.ancho / 2, lienzo.alto / 2] : aVirtual(real, giro, px, py));

  const api = {
    estado,
    datos: mapa,
    proporcion: () => real.ancho / (el.clientWidth || 1),
    // de un punto de la vista a pixeles del canvas (para colocar cosas encima del mapa)
    aLienzo: (vx, vy) => aReal(real, giro, vx, vy),
    mover(dx, dy) {
      detener();
      reposo = false;
      const [vx, vy] = deltaVirtual(giro, dx, dy);
      poner({ ...cam, x: cam.x - vx / cam.z, y: cam.y - vy / cam.z });
    },
    escalarEn(f, px, py) {
      detener();
      reposo = false;
      poner(acercarEn(cam, cam.z * f, ...enVista(px, py), lienzo));
    },
    asentar(px, py, dir = 0) {
      escalar(asentar(cam.z, mapa, lienzo, dir), ...enVista(px, py));
    },
    paso(dir, px, py) {
      escalar(siguienteParada(cam.z, dir, mapa, lienzo), ...enVista(px, py));
    },
    verTodo() {
      escalar(verTodo(mapa, lienzo).z, ...enVista(), 260);
    },
    // Un cuarto de vuelta, como el mapa de Monte sobre su eje. dir: 1 en el sentido del reloj, -1 al reves.
    girar(dir = 1) {
      detener();
      giro = (giro + (dir < 0 ? 3 : 1)) % 4;
      lienzo = vista(real, giro);
      cam = limitar({ ...cam, z: asentar(cam.z, mapa, lienzo) }, mapa, lienzo);
      const falta = (dir < 0 ? 1 : -1) * Math.PI / 2;
      animar(420, (t, suave) => {
        desvio = t === 1 ? 0 : falta * (1 - suave);
        pedirCuadro();
      });
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
