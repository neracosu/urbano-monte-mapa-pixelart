"""Geometria de los niveles de zoom: cuantos hay y cuanto mide cada uno."""

FACTOR_BASE = 4     # pixeles del escaneo por pixel del dibujo en el nivel mas fino (combinacion A)
LADO_TESELA = 256


def niveles(ancho, alto, factor_base=FACTOR_BASE, lado=LADO_TESELA):
    """Del mas fino (k = 0) al que cabe en una sola tesela. Cada uno mide la mitad del anterior."""
    lista = []
    while True:
        factor = factor_base * 2 ** len(lista)
        w, h = -(-ancho // factor), -(-alto // factor)
        lista.append({'k': len(lista), 'factor': factor, 'ancho': w, 'alto': h,
                      'cols': -(-w // lado), 'filas': -(-h // lado)})
        if w <= lado and h <= lado:
            return lista
