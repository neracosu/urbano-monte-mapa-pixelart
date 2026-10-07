"""Arma las imagenes de la prueba visual de la etapa 1.

    python -m fabrica.prueba ~/monte-fuente public/prueba
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from .fuente import leer_region
from .paleta import extraer
from .pixelar import a_imagen, cuantizar, reducir
from scipy import ndimage as ndi

from .rellenar import rellenar, silueta_por_color

LADO_ZONA = 3072
# coordenadas del escaneo, multiplos de 24 para que casen con los factores 4, 6 y 8
ZONAS = [
    {'id': 'texto', 'x': 27288, 'y': 45600},
    {'id': 'costa', 'x': 20640, 'y': 32616},
    {'id': 'rey', 'x': 24624, 'y': 41376},
]
CRIATURA = {'id': 'monstruo-marino', 'caja': (50688, 27360, 1512, 2688), 'factor': 6, 'colores': 32}
# clave, factor (pixeles del escaneo por pixel del dibujo), colores
COMBOS = [('a', 4, 48), ('b', 6, 32), ('c', 6, 16), ('d', 8, 16)]


def construir(fuente, salida):
    salida = Path(salida)
    salida.mkdir(parents=True, exist_ok=True)
    regiones = {z['id']: leer_region(fuente, z['x'], z['y'], LADO_ZONA, LADO_ZONA) for z in ZONAS}
    recorte = leer_region(fuente, *CRIATURA['caja'])
    muestras = list(regiones.values()) + [recorte]
    paletas = {n: extraer(muestras, n) for n in sorted({c[2] for c in COMBOS} | {CRIATURA['colores']})}

    for z in ZONAS:
        img = regiones[z['id']]
        img.resize((768, 768), Image.LANCZOS).save(salida / f"{z['id']}-original.jpg", quality=88)
        for clave, factor, n in COMBOS:
            indices = cuantizar(reducir(img, factor), paletas[n], z['x'] // factor, z['y'] // factor)
            a_imagen(indices, paletas[n]).save(salida / f"{z['id']}-{clave}.png", optimize=True)

    f, pal = CRIATURA['factor'], paletas[CRIATURA['colores']]
    x0, y0 = CRIATURA['caja'][0] // f, CRIATURA['caja'][1] // f
    a = reducir(recorte, f)
    figura = silueta_por_color(a)
    # el relleno toma 3 pixeles de margen: el halo del contorno no es mar
    hueco = ndi.binary_dilation(figura, iterations=3)
    a_imagen(cuantizar(rellenar(a, hueco), pal, x0, y0), pal).save(salida / 'criatura-fondo.png', optimize=True)
    color = pal[cuantizar(a, pal, x0, y0)]
    alfa = np.where(figura, 255, 0).astype(np.uint8)
    Image.fromarray(np.dstack([color, alfa]), 'RGBA').save(salida / 'criatura-sprite.png', optimize=True)
    # para revisar el recorte a ojo: la figura tenida de rojo sobre el original
    revision = a.copy()
    revision[figura] = revision[figura] * 0.5 + np.array([255, 0, 0], dtype=np.float32) * 0.5
    Image.fromarray(revision.astype(np.uint8), 'RGB').save(salida / 'criatura-silueta.png')

    (salida / 'paletas.json').write_text(json.dumps({str(n): p.tolist() for n, p in paletas.items()}))
    print(f'listo: {len(ZONAS) * (len(COMBOS) + 1) + 3} imagenes en {salida}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    construir(sys.argv[1], sys.argv[2])
