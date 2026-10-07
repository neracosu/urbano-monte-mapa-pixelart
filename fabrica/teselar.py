"""De la base a las teselas de todos los niveles.

    python -m fabrica.teselar ~/monte-fuente public
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from .base import construir_base, promediar
from .fuente import ALTO, ANCHO
from .niveles import FACTOR_BASE, LADO_TESELA, niveles
from .paleta import extraer
from .pixelar import a_imagen, cuantizar

COLORES = 48


def mitad(a, franja=512):
    """El nivel siguiente: cada pixel promedia 2 x 2 del anterior. Por franjas, para no cargar todo."""
    alto, ancho = a.shape[:2]
    sal = np.empty((-(-alto // 2), -(-ancho // 2), 3), dtype=np.float32)
    for y in range(0, alto, 2 * franja):
        sal[y // 2:y // 2 + franja] = promediar(a[y:y + 2 * franja], 2)
    return sal


def piramide(base, lado=LADO_TESELA):
    """La base y sus mitades sucesivas, hasta la que cabe en una tesela."""
    capas = [base]
    while capas[-1].shape[0] > lado or capas[-1].shape[1] > lado:
        capas.append(mitad(capas[-1]))
    return capas


def paleta_del_mapa(capas, n, tope=2048):
    """Los n colores del mapa, sacados de la capa mas fina que no pase de tope: ya resume el mapa entero."""
    capa = next(c for c in capas if max(c.shape[:2]) <= tope)
    muestra = Image.fromarray(np.asarray(capa).round().clip(0, 255).astype(np.uint8), 'RGB')
    return extraer([muestra], n)


def teselar(capas, paleta, salida, lado=LADO_TESELA, avisar=None):
    """Escribe salida/{k}/{fila}/{col}.png. Devuelve (sello, cuantas): el sello resume el contenido."""
    salida = Path(salida)
    sello, cuenta = hashlib.sha1(), 0
    for k, capa in enumerate(capas):
        alto, ancho = capa.shape[:2]
        for fila, y in enumerate(range(0, alto, lado)):
            carpeta = salida / str(k) / str(fila)
            carpeta.mkdir(parents=True, exist_ok=True)
            for col, x in enumerate(range(0, ancho, lado)):
                indices = cuantizar(np.asarray(capa[y:y + lado, x:x + lado]), paleta, x, y)
                ruta = carpeta / f'{col}.png'
                a_imagen(indices, paleta).save(ruta, optimize=True)
                sello.update(ruta.read_bytes())
                cuenta += 1
        if avisar:
            avisar(k, cuenta)
    return sello.hexdigest()[:10], cuenta


def manifiesto(capas, paleta, sello, ancho, alto, factor, lado):
    ns = niveles(ancho, alto, factor, lado)
    medidas = [(c.shape[1], c.shape[0]) for c in capas]
    if medidas != [(n['ancho'], n['alto']) for n in ns]:
        raise ValueError(f'las capas {medidas} no casan con los niveles calculados')
    return {'ancho': ancho, 'alto': alto, 'factor': factor, 'lado': lado, 'colores': len(paleta),
            'sello': sello, 'paleta': np.asarray(paleta).tolist(), 'niveles': ns}


def construir(fuente, publico):
    fuente, publico = Path(fuente), Path(publico)
    hechas = [0]

    def avance(col, fila):
        hechas[0] += 1
        if hechas[0] % 200 == 0:
            print(f'base: {hechas[0]} teselas del escaneo', flush=True)

    base = construir_base(fuente, fuente / f'base-f{FACTOR_BASE}.npy', FACTOR_BASE, avisar=avance)
    print(f'base lista: {base.shape[1]} x {base.shape[0]}', flush=True)
    capas = piramide(base)
    paleta = paleta_del_mapa(capas, COLORES)
    print(f'paleta: {len(paleta)} colores; {len(capas)} niveles', flush=True)
    sello, cuenta = teselar(capas, paleta, publico / 'teselas',
                            avisar=lambda k, n: print(f'nivel {k} listo, van {n} teselas', flush=True))
    m = manifiesto(capas, paleta, sello, ANCHO, ALTO, FACTOR_BASE, LADO_TESELA)
    (publico / 'mapa.json').write_text(json.dumps(m, separators=(',', ':')))
    print(f'listo: {cuenta} teselas, sello {sello}', flush=True)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    construir(sys.argv[1], sys.argv[2])
