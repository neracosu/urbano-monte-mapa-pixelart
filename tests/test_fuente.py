import io

import numpy as np
import pytest
from PIL import Image

from fabrica import fuente


def jpeg(color, tam=(4, 4)):
    b = io.BytesIO()
    Image.new('RGB', tam, color).save(b, 'JPEG', quality=95)
    return b.getvalue()


def test_rejilla_cubre_el_mapa_sin_solaparse():
    cajas = list(fuente.rejilla())
    assert len(cajas) == 41 * 41
    assert sum(w * h for _, _, _, _, w, h in cajas) == fuente.ANCHO * fuente.ALTO
    assert cajas[-1] == (40, 40, 61440, 61440, 639, 720)


def test_url_region():
    assert fuente.url_region(1536, 3072, 1536, 720) == fuente.BASE + '/1536,3072,1536,720/full/0/default.jpg'


def test_ruta_tesela(tmp_path):
    assert fuente.ruta_tesela(tmp_path, 3, 12) == tmp_path / '12' / '03.jpg'


def test_bajar_guarda_y_no_repite(tmp_path):
    llamadas = []

    def abrir(pedido, timeout):
        llamadas.append(pedido.full_url)
        return io.BytesIO(jpeg((10, 20, 30)))

    destino = tmp_path / '00' / '00.jpg'
    assert fuente.bajar('https://ejemplo.test/a', destino, abrir=abrir, pausa=0, espera=0) is True
    assert destino.exists()
    assert fuente.bajar('https://ejemplo.test/a', destino, abrir=abrir, pausa=0, espera=0) is False
    assert llamadas == ['https://ejemplo.test/a']


def test_bajar_descarta_lo_que_no_es_imagen(tmp_path):
    def abrir(pedido, timeout):
        return io.BytesIO(jpeg((10, 20, 30), (64, 64))[:200])

    destino = tmp_path / '00' / '00.jpg'
    with pytest.raises(RuntimeError):
        fuente.bajar('https://ejemplo.test/a', destino, abrir=abrir, intentos=2, pausa=0, espera=0)
    assert not destino.exists()
    assert list(tmp_path.rglob('*.parte')) == []


def falsa_fuente(raiz, ancho=10, alto=9, lado=4):
    """Un mapa de 10 x 9 en teselas de 4: cada tesela de un color segun su columna y su fila."""
    for col, fila, x, y, w, h in fuente.rejilla(ancho, alto, lado):
        ruta = fuente.ruta_tesela(raiz, col, fila)
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_bytes(jpeg((col * 80, fila * 80, 100), (w, h)))


def test_leer_region_en_el_borde(tmp_path):
    falsa_fuente(tmp_path)
    img = fuente.leer_region(tmp_path, 3, 3, 7, 6, bajar_faltantes=False, ancho=10, alto=9, lado=4)
    assert img.size == (7, 6)
    a = np.asarray(img).astype(int)
    assert np.abs(a[0, 0] - [0, 0, 100]).max() <= 3      # mapa (3, 3): tesela 0, 0
    assert np.abs(a[1, 1] - [80, 80, 100]).max() <= 3    # mapa (4, 4): tesela 1, 1
    assert np.abs(a[5, 6] - [160, 160, 100]).max() <= 3  # mapa (9, 8): la esquina, tesela 2, 2


def test_leer_region_fuera_del_mapa(tmp_path):
    falsa_fuente(tmp_path)
    with pytest.raises(ValueError, match='fuera del mapa'):
        fuente.leer_region(tmp_path, 8, 0, 5, 2, bajar_faltantes=False, ancho=10, alto=9, lado=4)
    with pytest.raises(ValueError, match='fuera del mapa'):
        fuente.leer_region(tmp_path, -1, 0, 2, 2, bajar_faltantes=False, ancho=10, alto=9, lado=4)
