import numpy as np
import pytest
from PIL import Image

from fabrica.paleta import extraer
from fabrica.pixelar import a_imagen, cuantizar, reducir

GRISES = np.array([[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]], dtype=np.uint8)


def test_reducir_promedia_bloques():
    a = np.zeros((4, 4, 3), dtype=np.uint8)
    a[:2, :2] = 100
    a[:2, 2:] = [10, 20, 30]
    a[2:, :2, 0] = [[0, 40], [80, 120]]
    r = reducir(Image.fromarray(a, 'RGB'), 2)
    assert r.shape == (2, 2, 3)
    assert r[0, 0].tolist() == [100, 100, 100]
    assert r[0, 1].tolist() == [10, 20, 30]
    assert r[1, 0].tolist() == [60, 0, 0]


def test_reducir_rechaza_tamano_que_no_cuadra():
    with pytest.raises(ValueError, match='multiplo'):
        reducir(Image.new('RGB', (10, 8)), 4)


def test_cuantizar_solo_usa_la_paleta_y_es_repetible():
    a = np.random.default_rng(7).uniform(0, 255, (20, 28, 3)).astype(np.float32)
    uno = cuantizar(a, GRISES)
    assert uno.dtype == np.uint8 and uno.shape == (20, 28)
    assert uno.max() < len(GRISES)
    assert np.array_equal(uno, cuantizar(a, GRISES))


def test_cuantizar_no_deja_costuras():
    # partir en una columna que no es multiplo de 4 obliga a respetar la posicion global
    a = np.random.default_rng(3).uniform(0, 255, (9, 14, 3)).astype(np.float32)
    entero = cuantizar(a, GRISES, x0=100, y0=50)
    izquierda = cuantizar(a[:, :6], GRISES, x0=100, y0=50)
    derecha = cuantizar(a[:, 6:], GRISES, x0=106, y0=50)
    assert np.array_equal(entero, np.hstack([izquierda, derecha]))
    arriba = cuantizar(a[:5], GRISES, x0=100, y0=50)
    abajo = cuantizar(a[5:], GRISES, x0=100, y0=55)
    assert np.array_equal(entero, np.vstack([arriba, abajo]))


def test_cuantizar_trama_los_tonos_intermedios():
    a = np.full((8, 8, 3), 128, dtype=np.float32)
    usados = set(np.unique(cuantizar(a, GRISES)).tolist())
    assert usados == {1, 2}


def test_a_imagen_conserva_los_colores():
    indices = np.array([[0, 3], [2, 1]], dtype=np.uint8)
    img = a_imagen(indices, GRISES)
    assert img.mode == 'P'
    assert np.asarray(img.convert('RGB'))[0, 1].tolist() == [255, 255, 255]
    assert np.asarray(img.convert('RGB'))[1, 0].tolist() == [170, 170, 170]


def test_extraer_ordena_de_oscuro_a_claro():
    a = np.zeros((8, 8, 3), dtype=np.uint8)
    a[:, :4] = [200, 180, 120]
    a[:, 4:] = [20, 30, 60]
    p = extraer([Image.fromarray(a, 'RGB')], 2)
    assert p.dtype == np.uint8 and p.shape == (2, 3)
    assert np.abs(p[0].astype(int) - [20, 30, 60]).max() <= 2
    assert np.abs(p[1].astype(int) - [200, 180, 120]).max() <= 2


def test_extraer_devuelve_solo_colores_en_uso():
    # mas colores que cupo: lo que salga tiene que ser paleta que alguna muestra usa
    rng = np.random.default_rng(11)
    colores = rng.integers(0, 256, (40, 3), dtype=np.uint8)
    a = np.repeat(np.repeat(colores.reshape(5, 8, 3), 6, axis=0), 6, axis=1)
    p = extraer([Image.fromarray(a, 'RGB')], 32)
    pix = a.reshape(-1, 3).astype(int)
    cercano = ((pix[:, None, :] - p[None].astype(int)) ** 2).sum(axis=2).argmin(axis=1)
    assert set(cercano.tolist()) == set(range(len(p)))
    assert len({tuple(c) for c in p.tolist()}) == len(p)
