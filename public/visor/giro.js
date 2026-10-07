// Giro del mapa en cuartos de vuelta (0 a 3, en el sentido del reloj). Logica pura.
// «Vista» es el lienzo tal como lo ve la camara, sin girar; «real» es el canvas en pantalla.
// A 90 grados cada pixel de la vista cae en un pixel entero del lienzo: el pixel art no se emborrona.

export function vista(lienzo, giro) {
  return giro % 2 ? { ancho: lienzo.alto, alto: lienzo.ancho } : { ancho: lienzo.ancho, alto: lienzo.alto };
}

// La transformacion de la vista al lienzo, lista para setTransform(a, b, c, d, e, f).
export function matriz(lienzo, giro) {
  return [
    [1, 0, 0, 1, 0, 0],
    [0, 1, -1, 0, lienzo.ancho, 0],
    [-1, 0, 0, -1, lienzo.ancho, lienzo.alto],
    [0, -1, 1, 0, 0, lienzo.alto],
  ][giro];
}

export function aReal(lienzo, giro, x, y) {
  const [a, b, c, d, e, f] = matriz(lienzo, giro);
  return [a * x + c * y + e, b * x + d * y + f];
}

export function aVirtual(lienzo, giro, px, py) {
  const [a, b, c, d, e, f] = matriz(lienzo, giro);
  // la inversa de una rotacion de cuarto de vuelta es su traspuesta
  return [a * (px - e) + b * (py - f), c * (px - e) + d * (py - f)];
}

export function deltaVirtual(giro, dx, dy) {
  const [a, b, c, d] = matriz({ ancho: 0, alto: 0 }, giro);
  return [a * dx + b * dy, c * dx + d * dy];
}
