import numpy as np
import pytest

from fabrica.rellenar import rellenar, silueta_por_color

MAR = [150, 190, 215]


def escena():
    """Mar liso de 40 x 40 con una figura gris de 12 x 10 y una mota suelta."""
    a = np.full((40, 40, 3), MAR, dtype=np.float32)
    a[14:26, 15:25] = [90, 90, 95]
    a[5:7, 30:32] = [90, 90, 95]
    return a


def test_silueta_toma_la_figura_mayor_y_deja_la_mota():
    m = silueta_por_color(escena())
    assert m.dtype == bool and m.shape == (40, 40)
    assert m[14:26, 15:25].all()
    assert not m[5:7, 30:32].any()
    assert m.sum() <= 14 * 12  # la figura mas un pixel de margen por lado


def test_silueta_tapa_los_huecos_de_la_figura():
    a = escena()
    a[18:21, 18:21] = MAR  # un ojo del color del mar
    assert silueta_por_color(a)[18:21, 18:21].all()


def test_silueta_sin_figura():
    with pytest.raises(ValueError, match='baje el umbral'):
        silueta_por_color(np.full((20, 20, 3), MAR, dtype=np.float32))


def test_silueta_que_cubre_todo():
    a = np.full((20, 20, 3), MAR, dtype=np.float32)
    a[2:18, 2:18] = [90, 90, 95]
    with pytest.raises(ValueError, match='suba el umbral'):
        silueta_por_color(a)


def test_rellenar_devuelve_el_fondo():
    a = escena()
    m = silueta_por_color(a)
    r = rellenar(a, m)
    assert r.shape == a.shape and r.dtype == np.float32
    assert np.abs(r[m] - MAR).max() < 0.01
    assert np.array_equal(r[~m], a[~m])


def test_rellenar_sin_fondo():
    with pytest.raises(ValueError, match='cubre todo'):
        rellenar(np.zeros((4, 4, 3), dtype=np.float32), np.ones((4, 4), dtype=bool))
