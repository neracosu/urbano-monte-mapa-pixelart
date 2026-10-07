"""La base: el escaneo entero reducido al pixel mas fino, sin cuantizar, en un .npy que se lee por trozos."""
from pathlib import Path

import numpy as np
from PIL import Image

from .fuente import ALTO, ANCHO, LADO, rejilla, ruta_tesela


def promediar(a, factor):
    """Promedia bloques de factor x factor. Lo que sobra abajo y a la derecha se completa repitiendo el borde."""
    a = np.asarray(a, dtype=np.float32)
    sobra_y, sobra_x = -a.shape[0] % factor, -a.shape[1] % factor
    if sobra_y or sobra_x:
        a = np.pad(a, ((0, sobra_y), (0, sobra_x), (0, 0)), mode='edge')
    return a.reshape(a.shape[0] // factor, factor, a.shape[1] // factor, factor, 3).mean(axis=(1, 3))


def construir_base(fuente, destino, factor, ancho=ANCHO, alto=ALTO, lado=LADO, avisar=None):
    """Arma la base tesela por tesela. Si destino ya existe con la medida correcta, lo reutiliza."""
    if lado % factor:
        raise ValueError(f'el lado de tesela {lado} no es multiplo de {factor}')
    destino = Path(destino)
    forma = (-(-alto // factor), -(-ancho // factor), 3)
    if destino.exists():
        base = np.load(destino, mmap_mode='r')
        if base.shape == forma:
            return base
    parte = destino.with_suffix('.parte.npy')
    base = np.lib.format.open_memmap(parte, mode='w+', dtype=np.float32, shape=forma)
    try:
        for col, fila, x, y, w, h in rejilla(ancho, alto, lado):
            ruta = ruta_tesela(fuente, col, fila)
            if not ruta.exists():
                raise FileNotFoundError(f'falta la tesela {ruta.parent.name}/{ruta.name} del escaneo')
            with Image.open(ruta) as tesela:
                if tesela.size != (w, h):
                    raise ValueError(f'{ruta}: mide {tesela.size}, deberia medir {(w, h)}')
                bloque = promediar(np.asarray(tesela.convert('RGB')), factor)
            base[y // factor:y // factor + bloque.shape[0], x // factor:x // factor + bloque.shape[1]] = bloque
            if avisar:
                avisar(col, fila)
        base.flush()
    except BaseException:
        del base
        parte.unlink(missing_ok=True)
        raise
    del base
    parte.rename(destino)
    return np.load(destino, mmap_mode='r')
