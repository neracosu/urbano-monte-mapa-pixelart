// Camara del mapa: logica pura, sin DOM. Dos sistemas de coordenadas:
// mapa (pixeles del escaneo original) y lienzo (pixeles del canvas, origen arriba a la izquierda).
// cam = { x, y, z }: el punto del mapa que cae en el centro del lienzo y los pixeles de lienzo por pixel del escaneo.

export const AUMENTO_MAX = 8; // en el nivel mas fino, hasta 8 pixeles de lienzo por pixel del dibujo

// Las escalas de reposo, de menor a mayor: una por nivel (un pixel del dibujo = un pixel del lienzo)
// y, pasado el mas fino, sus aumentos enteros.
export function paradas(niveles) {
  const p = niveles.map(n => 1 / n.factor).sort((a, b) => a - b);
  const fina = p[p.length - 1];
  for (let n = 2; n <= AUMENTO_MAX; n++) p.push(fina * n);
  return p;
}

// La mayor parada en la que el mapa entero cabe en el lienzo; si ninguna, la mas chica.
export function escalaMinima(mapa, lienzo) {
  const cabe = Math.min(lienzo.ancho / mapa.ancho, lienzo.alto / mapa.alto);
  const ps = paradas(mapa.niveles);
  let min = ps[0];
  for (const p of ps) if (p <= cabe) min = p;
  return min;
}

// La parada donde descansa una escala. dir > 0: la primera que no quede por debajo (el gesto acercaba);
// dir < 0: la ultima que no quede por encima; dir = 0: la mas cercana.
export function asentar(z, mapa, lienzo, dir = 0) {
  const min = escalaMinima(mapa, lienzo);
  const ps = paradas(mapa.niveles).filter(p => p >= min);
  const holgura = 1.02;
  if (dir > 0) return ps.find(p => p * holgura >= z) ?? ps[ps.length - 1];
  if (dir < 0) return ps.findLast(p => p <= z * holgura) ?? ps[0];
  let mejor = ps[0], error = Infinity;
  for (const p of ps) {
    const e = Math.abs(Math.log(p / z));
    if (e < error) { error = e; mejor = p; }
  }
  return mejor;
}

export function siguienteParada(z, dir, mapa, lienzo) {
  const min = escalaMinima(mapa, lienzo);
  const ps = paradas(mapa.niveles).filter(p => p >= min);
  const i = ps.indexOf(asentar(z, mapa, lienzo));
  return ps[Math.max(0, Math.min(ps.length - 1, i + Math.sign(dir)))];
}

// El nivel con que se pinta una escala: el mas grueso cuyo pixel ocupa menos de dos en el lienzo.
// Asi nunca se achica un pixel art; entre paradas se ve el nivel grueso algo ampliado.
export function nivelPara(z, niveles) {
  const orden = [...niveles].sort((a, b) => a.factor - b.factor);
  let nivel = orden[0];
  for (const n of orden) if (z * n.factor < 2) nivel = n;
  return nivel;
}

export function aPantalla(cam, lienzo, x, y) {
  return [(x - cam.x) * cam.z + lienzo.ancho / 2, (y - cam.y) * cam.z + lienzo.alto / 2];
}

export function aMapa(cam, lienzo, px, py) {
  return [(px - lienzo.ancho / 2) / cam.z + cam.x, (py - lienzo.alto / 2) / cam.z + cam.y];
}

// Cambia la escala dejando quieto el punto del mapa que esta bajo (px, py).
export function acercarEn(cam, z, px, py, lienzo) {
  const [mx, my] = aMapa(cam, lienzo, px, py);
  return { x: mx - (px - lienzo.ancho / 2) / z, y: my - (py - lienzo.alto / 2) / z, z };
}

// Acota la escala y no deja que la vista se salga del mapa; donde el mapa cabe entero, lo centra.
export function limitar(cam, mapa, lienzo) {
  const ps = paradas(mapa.niveles);
  const z = Math.max(escalaMinima(mapa, lienzo), Math.min(ps[ps.length - 1], cam.z));
  const eje = (c, largo, vista) => {
    const media = vista / (2 * z);
    return largo * z <= vista ? largo / 2 : Math.max(media, Math.min(largo - media, c));
  };
  return { x: eje(cam.x, mapa.ancho, lienzo.ancho), y: eje(cam.y, mapa.alto, lienzo.alto), z };
}

export function verTodo(mapa, lienzo) {
  return { x: mapa.ancho / 2, y: mapa.alto / 2, z: escalaMinima(mapa, lienzo) };
}
