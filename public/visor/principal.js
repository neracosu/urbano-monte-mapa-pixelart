import { conectarOriginal } from './boton-original.js';
import { crearMapa } from './mapa.js';

const el = document.getElementById('mapa'), aviso = document.getElementById('aviso');
try {
  const mapa = await crearMapa(el);
  window.mapa = mapa;
  document.getElementById('acercar').addEventListener('click', () => mapa.paso(1));
  document.getElementById('alejar').addEventListener('click', () => mapa.paso(-1));
  document.getElementById('todo').addEventListener('click', () => mapa.verTodo());
  conectarOriginal(document.getElementById('ver-original'), document.getElementById('original'), document.getElementById('nota'), mapa);
  document.body.classList.add('listo');
} catch (e) {
  console.error(e);
  aviso.textContent = 'No se pudo cargar el mapa. Revise su conexión y recargue la página.';
  aviso.hidden = false;
}
