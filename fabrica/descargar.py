"""Descarga completa del escaneo, tesela por tesela. Reanudable: lo que ya esta no se vuelve a pedir.

    python -m fabrica.descargar ~/monte-fuente
    python -m fabrica.descargar ~/monte-fuente --verificar
"""
import sys

from PIL import Image

from .fuente import bajar, rejilla, ruta_tesela, url_region


def descargar_todo(raiz, pausa=1.0):
    cajas = list(rejilla())
    for n, (col, fila, x, y, w, h) in enumerate(cajas, 1):
        if bajar(url_region(x, y, w, h), ruta_tesela(raiz, col, fila), pausa=pausa):
            print(f'{n}/{len(cajas)} fila {fila} col {col}', flush=True)


def verificar(raiz):
    """Lista de problemas: teselas que faltan, no abren o no miden lo que deben."""
    malas = []
    for col, fila, x, y, w, h in rejilla():
        ruta = ruta_tesela(raiz, col, fila)
        try:
            with Image.open(ruta) as tesela:
                if tesela.size != (w, h):
                    malas.append(f'{ruta}: mide {tesela.size}, deberia medir {(w, h)}')
        except OSError as e:
            malas.append(f'{ruta}: {e}')
    return malas


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if '--verificar' in sys.argv:
        problemas = verificar(sys.argv[1])
        print('\n'.join(problemas) if problemas else 'completo: 1681 teselas con su medida')
        sys.exit(1 if problemas else 0)
    descargar_todo(sys.argv[1])
