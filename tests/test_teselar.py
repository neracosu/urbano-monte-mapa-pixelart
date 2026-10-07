import io
import json

import numpy as np
import pytest
from PIL import Image

from fabrica import fuente
from fabrica.base import construir_base, promediar
from fabrica.niveles import niveles
from fabrica.pixelar import cuantizar
from fabrica.teselar import manifiesto, mitad, paleta_del_mapa, piramide, teselar

GRISES = np.array([[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]], dtype=np.uint8)


def falsa_fuente(raiz, ancho, alto, lado):
    """Teselas lisas, cada una de un color segun su columna y su fila."""
    for col, fila, x, y, w, h in fuente.rejilla(ancho, alto, lado):
        ruta = fuente.ruta_tesela(raiz, col, fila)
        ruta.parent.mkdir(parents=True, exist_ok=True)
        b = io.BytesIO()
        Image.new('RGB', (w, h), (col * 40, fila * 40, 100)).save(b, 'JPEG', quality=95)
        ruta.write_bytes(b.getvalue())


def leer(ruta):
    with Image.open(ruta) as img:
        return img.mode, img.size, np.asarray(img).copy()


def test_niveles_del_mapa_real():
    ns = niveles(62079, 62160)
    assert [n['factor'] for n in ns] == [4, 8, 16, 32, 64, 128, 256]
    assert [n['k'] for n in ns] == list(range(7))
    assert (ns[0]['ancho'], ns[0]['alto'], ns[0]['cols'], ns[0]['filas']) == (15520, 15540, 61, 61)
    assert (ns[-1]['ancho'], ns[-1]['alto'], ns[-1]['cols'], ns[-1]['filas']) == (243, 243, 1, 1)


def test_promediar_completa_el_borde_repitiendolo():
    a = np.zeros((2, 3, 3), dtype=np.float32)
    a[:, 2] = 90
    r = promediar(a, 2)
    assert r.shape == (1, 2, 3) and r.dtype == np.float32
    assert r[0, 0].tolist() == [0, 0, 0]
    assert r[0, 1].tolist() == [90, 90, 90]


def test_construir_base(tmp_path):
    falsa_fuente(tmp_path / 'f', 38, 36, 8)
    base = construir_base(tmp_path / 'f', tmp_path / 'base.npy', 4, ancho=38, alto=36, lado=8)
    assert base.shape == (9, 10, 3)
    assert np.abs(base[0, 0] - [0, 0, 100]).max() <= 3
    assert np.abs(base[8, 9] - [160, 160, 100]).max() <= 3
    assert list(tmp_path.glob('*.parte.npy')) == []
    otra = construir_base(tmp_path / 'f', tmp_path / 'base.npy', 4, ancho=38, alto=36, lado=8)
    assert np.array_equal(base, otra)


def test_construir_base_no_deja_una_base_a_medias(tmp_path):
    falsa_fuente(tmp_path / 'f', 38, 36, 8)
    fuente.ruta_tesela(tmp_path / 'f', 2, 3).unlink()
    with pytest.raises(FileNotFoundError, match='03/02.jpg'):
        construir_base(tmp_path / 'f', tmp_path / 'base.npy', 4, ancho=38, alto=36, lado=8)
    assert not (tmp_path / 'base.npy').exists()


def test_construir_base_rechaza_un_lado_que_no_cuadra(tmp_path):
    with pytest.raises(ValueError, match='multiplo'):
        construir_base(tmp_path / 'f', tmp_path / 'base.npy', 4, ancho=38, alto=36, lado=6)


def test_mitad_redondea_hacia_arriba():
    a = np.arange(5 * 3 * 3, dtype=np.float32).reshape(5, 3, 3)
    r = mitad(a, franja=1)
    assert r.shape == (3, 2, 3)
    assert np.allclose(r[0, 0], a[0:2, 0:2].mean(axis=(0, 1)))
    assert np.allclose(r[2, 1], a[4, 2])  # la esquina sobrante se repite a si misma
    assert np.allclose(r, mitad(a, franja=512))


def test_teselar_sin_costuras_y_repetible(tmp_path):
    base = np.random.default_rng(5).uniform(0, 255, (9, 10, 3)).astype(np.float32)
    capas = piramide(base, 4)
    assert [c.shape[:2] for c in capas] == [(9, 10), (5, 5), (3, 3)]
    sello, cuenta = teselar(capas, GRISES, tmp_path / 't', lado=4)
    assert cuenta == 9 + 4 + 1
    entero = cuantizar(base, GRISES)
    armado = np.zeros((9, 10), dtype=np.uint8)
    for fila in range(3):
        for col in range(3):
            t = leer(tmp_path / 't' / '0' / str(fila) / f'{col}.png')[2]
            armado[fila * 4:fila * 4 + t.shape[0], col * 4:col * 4 + t.shape[1]] = t
    assert np.array_equal(armado, entero)
    assert leer(tmp_path / 't' / '0' / '2' / '2.png')[1] == (2, 1)
    assert leer(tmp_path / 't' / '2' / '0' / '0.png')[0] == 'P'
    assert teselar(capas, GRISES, tmp_path / 't2', lado=4) == (sello, cuenta)


def test_paleta_y_manifiesto(tmp_path):
    base = np.random.default_rng(5).uniform(0, 255, (9, 10, 3)).astype(np.float32)
    capas = piramide(base, 4)
    paleta = paleta_del_mapa(capas, 4)
    assert paleta.dtype == np.uint8 and paleta.shape == (4, 3)
    m = manifiesto(capas, paleta, 'abc', 38, 36, 4, 4)
    assert json.loads(json.dumps(m)) == m
    assert (m['ancho'], m['alto'], m['factor'], m['lado'], m['colores'], m['sello']) == (38, 36, 4, 4, 4, 'abc')
    assert m['niveles'] == niveles(38, 36, 4, 4)
    assert m['paleta'] == paleta.tolist()
