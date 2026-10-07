"""Del escaneo al pixel art: reducir por bloques y pasar a la paleta con tramado ordenado."""
import numpy as np
from PIL import Image

# matriz de Bayer 4x4 centrada en cero: el umbral de cada pixel depende solo de su posicion
BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.46875


def reducir(img, factor):
    """Promedia bloques de factor x factor. Devuelve (alto // factor, ancho // factor, 3) float32."""
    ancho, alto = img.size
    if ancho % factor or alto % factor:
        raise ValueError(f'{ancho} x {alto} no es multiplo de {factor}')
    a = np.asarray(img.convert('RGB'), dtype=np.float32)
    return a.reshape(alto // factor, factor, ancho // factor, factor, 3).mean(axis=(1, 3))


def cuantizar(a, paleta, x0=0, y0=0, fuerza=24.0):
    """Indice del color de la paleta mas cercano a cada pixel, con tramado ordenado.

    x0, y0: posicion del bloque en la cuadricula del nivel, para que dos bloques vecinos casen."""
    alto, ancho = a.shape[:2]
    umbral = BAYER4[((np.arange(alto) + y0) % 4)[:, None], ((np.arange(ancho) + x0) % 4)[None, :]]
    tramado = np.asarray(a, dtype=np.float32) + umbral[:, :, None] * fuerza
    p = np.asarray(paleta, dtype=np.float32)
    indices = np.empty((alto, ancho), dtype=np.uint8)
    # por franjas: la distancia a cada color ocupa alto x ancho x colores
    for y in range(0, alto, 64):
        franja = tramado[y:y + 64]
        d = ((franja[:, :, None, :] - p[None, None, :, :]) ** 2).sum(axis=3)
        indices[y:y + 64] = d.argmin(axis=2)
    return indices


def a_imagen(indices, paleta):
    img = Image.fromarray(np.asarray(indices, dtype=np.uint8), mode='P')
    img.putpalette(np.asarray(paleta, dtype=np.uint8).flatten().tolist())
    return img
