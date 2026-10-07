"""Separar una criatura del fondo y borrar su hueco con lo que la rodea."""
import numpy as np
from scipy import ndimage as ndi


def silueta_por_color(a, umbral=38.0):
    """True donde esta la figura: la mancha mas grande que se aparta del color del borde de la caja."""
    a = np.asarray(a, dtype=np.float32)
    borde = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    fondo = np.median(borde, axis=0)
    distinta = np.sqrt(((a - fondo) ** 2).sum(axis=2)) > umbral
    etiquetas, cuantas = ndi.label(distinta)
    if cuantas == 0:
        raise ValueError('ninguna figura se distingue del fondo: baje el umbral')
    tamanos = ndi.sum(distinta, etiquetas, range(1, cuantas + 1))
    figura = etiquetas == int(np.argmax(tamanos)) + 1
    figura = ndi.binary_dilation(ndi.binary_fill_holes(figura), iterations=1)
    if figura.mean() > 0.6:
        raise ValueError('la silueta cubre mas del 60 % de la caja: suba el umbral o agrande la caja')
    return figura


def rellenar(a, mascara):
    """Reemplaza lo enmascarado, del borde hacia adentro, por el promedio de los vecinos ya conocidos."""
    a = np.array(a, dtype=np.float32)
    conocido = ~np.asarray(mascara, dtype=bool)
    if not conocido.any():
        raise ValueError('la mascara cubre todo: no hay fondo de donde rellenar')
    while not conocido.all():
        ap = np.pad(a * conocido[:, :, None], ((1, 1), (1, 1), (0, 0)))
        cp = np.pad(conocido.astype(np.float32), 1)
        suma = ap[:-2, 1:-1] + ap[2:, 1:-1] + ap[1:-1, :-2] + ap[1:-1, 2:]
        cuenta = cp[:-2, 1:-1] + cp[2:, 1:-1] + cp[1:-1, :-2] + cp[1:-1, 2:]
        nuevos = ~conocido & (cuenta > 0)
        a[nuevos] = suma[nuevos] / cuenta[nuevos][:, None]
        conocido |= nuevos
    return a
