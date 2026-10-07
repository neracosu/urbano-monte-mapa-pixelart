"""El escaneo original: donde esta, como se parte en teselas y como se lee una region."""
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

BASE = 'https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~303661~90074314'
ANCHO, ALTO, LADO = 62079, 62160, 1536
AGENTE = 'monte.neracosu.com/1.0 (proyecto educativo sin fines comerciales)'

# el compuesto pasa del limite de seguridad de Pillow; las teselas no, pero el lienzo armado puede
Image.MAX_IMAGE_PIXELS = None


def url_region(x, y, w, h):
    return f'{BASE}/{x},{y},{w},{h}/full/0/default.jpg'


def rejilla(ancho=ANCHO, alto=ALTO, lado=LADO):
    """Cajas (col, fila, x, y, w, h) que cubren el mapa sin solaparse, por filas."""
    for fila, y in enumerate(range(0, alto, lado)):
        for col, x in enumerate(range(0, ancho, lado)):
            yield col, fila, x, y, min(lado, ancho - x), min(lado, alto - y)


def ruta_tesela(raiz, col, fila):
    return Path(raiz) / f'{fila:02d}' / f'{col:02d}.jpg'


def bajar(url, destino, abrir=urllib.request.urlopen, intentos=4, pausa=1.0, espera=5.0):
    """Baja url a destino si no esta. Escribe a un .parte y lo renombra solo si decodifica entero."""
    destino = Path(destino)
    if destino.exists():
        return False
    destino.parent.mkdir(parents=True, exist_ok=True)
    parte = destino.with_suffix('.parte')
    for n in range(intentos):
        try:
            pedido = urllib.request.Request(url, headers={'User-Agent': AGENTE})
            with abrir(pedido, timeout=60) as r:
                parte.write_bytes(r.read())
            with Image.open(parte) as img:
                img.load()
            parte.rename(destino)
            time.sleep(pausa)
            return True
        except Exception as e:
            parte.unlink(missing_ok=True)
            print(f'  intento {n + 1} de {intentos} fallo: {e}', file=sys.stderr)
            time.sleep(espera * (n + 1))
    raise RuntimeError(f'no se pudo bajar {url}')


def leer_region(raiz, x, y, w, h, bajar_faltantes=True, ancho=ANCHO, alto=ALTO, lado=LADO):
    """La region (x, y, w, h) del escaneo, armada con las teselas guardadas en raiz."""
    if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > ancho or y + h > alto:
        raise ValueError(f'la region {x},{y},{w},{h} queda fuera del mapa de {ancho} x {alto}')
    lienzo = Image.new('RGB', (w, h))
    for fila in range(y // lado, (y + h - 1) // lado + 1):
        for col in range(x // lado, (x + w - 1) // lado + 1):
            tx, ty = col * lado, fila * lado
            ruta = ruta_tesela(raiz, col, fila)
            if bajar_faltantes:
                bajar(url_region(tx, ty, min(lado, ancho - tx), min(lado, alto - ty)), ruta)
            with Image.open(ruta) as tesela:
                lienzo.paste(tesela.convert('RGB'), (tx - x, ty - y))
    return lienzo
