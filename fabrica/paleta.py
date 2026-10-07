"""La paleta sale de los colores del propio mapa."""
import numpy as np
from PIL import Image

TOPE = 4_000_000  # pixeles de muestra: de sobra para un corte por la mediana


def extraer(muestras, n):
    """Hasta n colores representativos de las muestras, de oscuro a claro. (k, 3) uint8."""
    pix = np.concatenate([np.asarray(m.convert('RGB')).reshape(-1, 3) for m in muestras])
    pix = pix[::max(1, len(pix) // TOPE)]
    tira = Image.fromarray(np.ascontiguousarray(pix).reshape(1, -1, 3), 'RGB')
    q = tira.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    # Pillow puede dejar indices sin uso en medio: se toman los usados, no los primeros
    usados = sorted(i for _, i in q.getcolors())
    p = np.unique(np.array(q.getpalette(), dtype=np.uint8).reshape(-1, 3)[usados], axis=0)
    luz = p.astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    return p[np.argsort(luz, kind='stable')]
