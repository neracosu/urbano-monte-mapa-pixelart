# Monte

El planisferio de Urbano Monte (Milán, 1587) en pixel art navegable.
Publicado en https://monte.neracosu.com

## Créditos

- Mapa: Urbano Monte, 1587.
- Imagen: David Rumsey Map Collection, David Rumsey Map Center, Stanford Libraries.
  Compuesto de las 60 hojas ensamblado por Brandon Rumsey.
  https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~303661~90074314
- Las imágenes derivadas de este proyecto se publican bajo CC BY-NC-SA 3.0,
  la misma licencia de la colección: con atribución, sin uso comercial.

## Cómo correr

    python3 -m venv --without-pip .venv   # y pip con get-pip.py si el servidor no trae ensurepip
    .venv/bin/pip install Pillow numpy scipy pytest
    .venv/bin/pytest
    .venv/bin/python -m fabrica.descargar ~/monte-fuente
    .venv/bin/python -m fabrica.prueba ~/monte-fuente public/prueba
