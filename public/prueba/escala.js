// Pone cada imagen .pixel a la mayor escala entera que cabe en su contenedor:
// un pixel del dibujo ocupa siempre un numero entero de pixeles de pantalla.
export function escalaEntera(el, natural) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const k = Math.max(1, Math.floor((el.parentElement.clientWidth * dpr) / natural));
  el.style.width = `${(natural * k) / dpr}px`;
  return k;
}

function ajustar() {
  for (const img of document.querySelectorAll('img.pixel')) {
    if (!img.naturalWidth) continue;
    const k = escalaEntera(img, img.naturalWidth);
    const nota = img.closest('section')?.querySelector('[data-escala]');
    if (nota) nota.textContent = `Cada píxel del dibujo ocupa ${k} × ${k} píxeles de su pantalla.`;
  }
}

for (const img of document.querySelectorAll('img.pixel')) img.addEventListener('load', ajustar);
addEventListener('resize', ajustar);
ajustar();
