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
    # el suavizado deja entrar un rastro de la mota vecina: menos de un tono de la paleta
    assert np.abs(r[m] - MAR).max() < 2
    assert np.array_equal(r[~m], a[~m])


def test_rellenar_sin_fondo():
    with pytest.raises(ValueError, match='cubre todo'):
        rellenar(np.zeros((4, 4, 3), dtype=np.float32), np.ones((4, 4), dtype=bool))


def test_silueta_suelta_las_lineas_finas_pegadas_a_la_figura():
    a = escena()
    a[0:14, 20] = [90, 90, 95]  # un meridiano de un pixel que baja hasta tocar la figura
    m = silueta_por_color(a)
    assert not m[0:12, 20].any()
    assert m[14:26, 15:25].all()


def test_rellenar_continua_la_textura_del_mar():
    # mar con un punto oscuro cada 4 pixeles, como el punteado de Monte
    a = np.full((48, 48, 3), MAR, dtype=np.float32)
    a[::4, ::4] = [110, 120, 110]
    m = np.zeros((48, 48), dtype=bool)
    m[18:30, 18:30] = True
    r = rellenar(a, m)
    oscuros = (r[m][:, 0] < 135).sum()
    assert oscuros >= 4                      # el parche no es una mancha lisa
    assert r[m].min() >= 105 and r[m].max() <= 225   # ni colores ajenos al mar
    assert np.array_equal(r[~m], a[~m])


def test_silueta_que_toca_el_borde_de_la_caja():
    a = np.full((40, 40, 3), MAR, dtype=np.float32)
    a[30:40, 15:25] = [90, 90, 95]  # la cola se sale por abajo
    with pytest.raises(ValueError, match='agrande la caja'):
        silueta_por_color(a)


def test_silueta_demasiado_chica():
    a = np.full((40, 40, 3), MAR, dtype=np.float32)
    a[10:13, 10:13] = [90, 90, 95]  # solo una mota: el umbral dejo fuera a la figura
    with pytest.raises(ValueError, match='baje el umbral'):
        silueta_por_color(a)


def test_rellenar_no_copia_la_tinta_vecina():
    a = np.full((48, 48, 3), MAR, dtype=np.float32)
    a[::4, ::4] = [110, 120, 110]
    a[:, 13:15] = [40, 30, 25]  # un trazo de tinta a 3 pixeles de la mascara
    m = np.zeros((48, 48), dtype=bool)
    m[18:30, 18:30] = True
    r = rellenar(a, m)
    assert r[m].min() >= 80  # el trazo no aparece reflejado dentro del parche
