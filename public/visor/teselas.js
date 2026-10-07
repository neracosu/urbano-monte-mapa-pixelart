// Que teselas hacen falta para una vista (puro) y el almacen que las carga y las recuerda.

// El rectangulo de una tesela en pixeles de su nivel. Las del borde miden lo que queda.
export function rectTesela(nivel, col, fila, lado) {
  const x = col * lado, y = fila * lado;
  return { x, y, w: Math.min(lado, nivel.ancho - x), h: Math.min(lado, nivel.alto - y) };
}

// Las teselas del nivel que tocan el lienzo, por filas.
export function visibles(cam, lienzo, nivel, lado) {
  const mx = lienzo.ancho / (2 * cam.z), my = lienzo.alto / (2 * cam.z), paso = nivel.factor * lado;
  const c0 = Math.max(0, Math.floor((cam.x - mx) / paso)), c1 = Math.min(nivel.cols - 1, Math.floor((cam.x + mx) / paso));
  const f0 = Math.max(0, Math.floor((cam.y - my) / paso)), f1 = Math.min(nivel.filas - 1, Math.floor((cam.y + my) / paso));
  const lista = [];
  for (let fila = f0; fila <= f1; fila++) for (let col = c0; col <= c1; col++) lista.push({ k: nivel.k, col, fila });
  return lista;
}

// Almacen de imagenes: pide cada tesela una vez, reintenta si falla y olvida las menos usadas.
export function crearAlmacen(urlDe, alCargar, tope = 400) {
  const teselas = new Map(); // clave -> { img, intentos }; el orden del Map es el de uso
  const clave = (k, col, fila) => `${k}/${fila}/${col}`;

  function cargar(c, t, k, col, fila) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { t.img = img; alCargar(); };
    img.onerror = () => {
      t.intentos++;
      if (t.intentos <= 2) setTimeout(() => cargar(c, t, k, col, fila), 1200 * t.intentos);
      // tras tres fallos se olvida: la proxima vez que haga falta se vuelve a pedir desde cero
      else setTimeout(() => { if (teselas.get(c) === t) teselas.delete(c); alCargar(); }, 8000);
    };
    img.src = urlDe(k, col, fila);
  }

  return {
    // La imagen si ya esta; si no, la pide y devuelve null.
    pedir(k, col, fila) {
      const c = clave(k, col, fila);
      let t = teselas.get(c);
      if (t) {
        teselas.delete(c);
        teselas.set(c, t);
      } else {
        t = { img: null, intentos: 0 };
        teselas.set(c, t);
        cargar(c, t, k, col, fila);
        if (teselas.size > tope) teselas.delete(teselas.keys().next().value);
      }
      return t.img;
    },
    // La imagen solo si ya esta cargada; no pide nada.
    lista(k, col, fila) {
      return teselas.get(clave(k, col, fila))?.img ?? null;
    },
  };
}
