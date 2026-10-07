// Traduce puntero, rueda y teclado en ordenes al mapa. Las distancias salen en pixeles del lienzo.
export function escuchar(el, mapa) {
  const dedos = new Map(); // id del puntero -> [x, y] en pixeles del lienzo
  let movido = 0, zInicial = 0, toque = { t: 0, x: 0, y: 0 };
  let rueda = 0, ultimaRueda = 0;

  const pos = e => {
    const r = el.getBoundingClientRect(), k = mapa.proporcion();
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
  };
  const par = () => {
    const [a, b] = [...dedos.values()];
    return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
  };

  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    dedos.set(e.pointerId, pos(e));
    if (dedos.size === 1) { movido = 0; zInicial = mapa.estado().z; }
  });

  el.addEventListener('pointermove', e => {
    if (!dedos.has(e.pointerId)) return;
    const antes = dedos.get(e.pointerId), ahora = pos(e);
    if (dedos.size === 1) {
      dedos.set(e.pointerId, ahora);
      movido += Math.abs(ahora[0] - antes[0]) + Math.abs(ahora[1] - antes[1]);
      mapa.mover(ahora[0] - antes[0], ahora[1] - antes[1]);
    } else if (dedos.size === 2) {
      const a = par();
      dedos.set(e.pointerId, ahora);
      const b = par();
      movido = Infinity;
      mapa.mover(b.x - a.x, b.y - a.y);
      if (a.d > 0) mapa.escalarEn(b.d / a.d, b.x, b.y);
    }
  });

  const soltar = e => {
    if (!dedos.has(e.pointerId)) return;
    const [x, y] = dedos.get(e.pointerId);
    dedos.delete(e.pointerId);
    if (dedos.size) return;
    const ahora = performance.now(), umbral = 12 * mapa.proporcion();
    if (e.type === 'pointerup' && movido < umbral) {
      // dos toques seguidos en el mismo sitio: acercar ahi
      if (ahora - toque.t < 320 && Math.hypot(x - toque.x, y - toque.y) < 3 * umbral) {
        toque.t = 0;
        mapa.paso(1, x, y);
        return;
      }
      toque = { t: ahora, x, y };
    }
    // un pellizco corto avanza hacia donde iba, no rebota a la parada de la que salio
    const z = mapa.estado().z, cambio = z / zInicial;
    mapa.asentar(x, y, cambio > 1.08 ? 1 : cambio < 0.92 ? -1 : 0);
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);

  // la rueda va por pasos: cada tramo de giro lleva a la parada siguiente
  el.addEventListener('wheel', e => {
    e.preventDefault();
    const ahora = performance.now();
    if (ahora - ultimaRueda < 220) return;
    rueda += e.deltaY * (e.deltaMode ? 30 : 1);
    if (Math.abs(rueda) < 50) return;
    const [x, y] = pos(e);
    mapa.paso(rueda < 0 ? 1 : -1, x, y);
    rueda = 0;
    ultimaRueda = ahora;
  }, { passive: false });

  el.addEventListener('keydown', e => {
    const p = 96 * mapa.proporcion();
    const flechas = { ArrowLeft: [p, 0], ArrowRight: [-p, 0], ArrowUp: [0, p], ArrowDown: [0, -p] };
    if (flechas[e.key]) { mapa.mover(...flechas[e.key]); mapa.asentar(); }
    else if (e.key === '+' || e.key === '=') mapa.paso(1);
    else if (e.key === '-' || e.key === '_') mapa.paso(-1);
    else if (e.key === '0') mapa.verTodo();
    else return;
    e.preventDefault();
  });
}
