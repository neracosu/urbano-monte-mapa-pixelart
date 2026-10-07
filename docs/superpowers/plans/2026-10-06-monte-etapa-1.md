# Monte, etapa 1 (prueba visual) — plan de implementación y calendario

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar en `monte.neracosu.com/prueba/` una prueba visual con tres zonas del mapa de Urbano Monte en cuatro combinaciones de tamaño de píxel y paleta, más una criatura recortada, borrada del fondo y animada, para que Neri elija; y dejar el escaneo completo descargado.

**Architecture:** Repositorio nuevo en `~/monte` con dos mitades: `fabrica/` (Python, convierte el escaneo en pixel art) y `public/` (lo que sirve Apache). La fábrica lee el escaneo de una carpeta de teselas originales fuera del repositorio (`~/monte-fuente`), descargadas de IIIF una sola vez. Esta etapa construye las piezas de la fábrica que las etapas 2 y 3 reutilizan sin cambios: fuente, paleta, pixelado, silueta y relleno.

**Tech Stack:** Python 3.10 en `venv` (Pillow, numpy, scipy, pytest); HTML, CSS y JS vanilla sin dependencias; `playwright-core` solo como herramienta de verificación con el Chromium ya cacheado en `~/.cache/ms-playwright`.

**Spec:** `docs/superpowers/specs/2026-10-06-monte-design.md` (se copia al repositorio nuevo en la tarea 1).

## Calendario hasta la presentación

Peor caso: presentación el lunes 12 de octubre de 2026. Cada etapa posterior tiene su propio plan, que se escribe al cerrar la anterior porque depende de lo que Neri elija.

| Día | Qué se hace | Qué necesita de Neri |
|---|---|---|
| Mar 6 | Este plan completo: repositorio, fábrica base, prueba visual publicada, descarga del escaneo en marcha | Visto bueno para crear el subdominio |
| Mié 7 | Etapa 2a: teselas de todos los niveles, cámara, gestos, mapa navegable en el teléfono | Elegir combinación (A, B, C o D) a primera hora |
| Jue 8 | Etapa 2b: entrada de las 60 hojas, giro, «ver el original», créditos. De noche: hoja de contactos del inventario | — |
| Vie 9 | Etapa 3a: recortes, animaciones de catálogo, bestiario y álbum | Revisar el inventario por la mañana |
| Sáb 10 | Etapa 3b: fichas en dos niveles, pulido en móvil. **Congelamiento al cierre del día** | Revisar todas las fichas |
| Dom 11 | Solo correcciones. Ensayo completo de la demostración en teléfono y escritorio | Ensayo |
| Lun 12 | Presentación | — |

Si algo se atrasa, se recorta en este orden: fichas documentadas (pasan a descriptivas), animación de las criaturas menos visibles, entrada de las 60 hojas. No se recortan: mapa navegable, «ver el original», créditos.

## Hechos verificados el 2026-10-06

- IIIF: `https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~303661~90074314`, 62.079 × 62.160 px. Una región de 1.536 × 1.536 a resolución completa baja en 1,5 s y pesa unos 560 KB. La descarga completa son 1.681 teselas: cerca de 1 GB y de 70 minutos con un segundo de pausa.
- **El compuesto ya incluye las cuatro esquinas** (rollos de texto y diagramas sobre fondo oscuro). Queda resuelto ese pendiente de la spec.
- Zonas elegidas mirando el mapa (coordenadas del escaneo, múltiplos de 24):
  - `texto`: (27288, 45600) — un rollo con letra manuscrita de Monte y el rótulo «MARE».
  - `costa`: (20640, 32616) — costa con ríos, árboles y topónimos.
  - `rey`: (24624, 41376) — la barca de «RE PHILIPO» con tres figuras.
  - criatura: caja (50688, 27360, 1512, 2400) — monstruo marino gris sobre mar limpio.
- En `~/.cache/ms-playwright` hay `chromium-1243`. El servidor no tiene Pillow ni numpy globales.
- Los subdominios de la cuenta son carpetas `public_html/<subdominio>` con dueño `neracosu:nobody` y modo `750`, y están en el `.gitignore` del repositorio de la web.

## Global Constraints

- Sitio estático: HTML, CSS y módulos ES sin dependencias ni paso de compilación. No hay proceso en PM2. No se lanza ningún build.
- La fábrica corre fuera del docroot. El escaneo descargado vive en `~/monte-fuente/`, fuera del docroot y del repositorio.
- Entorno Python propio (`.venv`) dentro del repositorio; no se instala nada global.
- Las coordenadas van siempre en píxeles del escaneo original.
- En reposo, un píxel del dibujo ocupa un número entero de píxeles de pantalla. Tope de densidad de pantalla: 3.
- Tramado ordenado, que depende solo de la posición del píxel: sin costuras y repetible.
- Respeta `prefers-reduced-motion`.
- Texto visible en español de Venezuela, voz de usted. Comentarios en el código sin acentos. Sin emojis.
- Créditos visibles: Urbano Monte; David Rumsey Map Collection, Stanford; ensamblaje de Brandon Rumsey; licencia CC BY-NC-SA 3.0 para las imágenes derivadas.
- El directorio raíz del docroot conserva dueño `neracosu:nobody` y modo `750`. Nunca `chown -R` ni `rsync -a` sobre él.
- Descarga de Rumsey: un pedido a la vez, con pausa de un segundo, y agente `monte.neracosu.com/1.0 (proyecto educativo sin fines comerciales)`.
- Se revisa a 390 px de ancho en navegador real antes de dar algo por terminado.
- Commits en español sin acentos, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Descarga cortada a la mitad** (se cae la red o la sesión): al reanudar no debe quedar ninguna tesela truncada dada por buena. Prueba en la tarea 1 (`test_bajar_descarta_lo_que_no_es_imagen`).
2. **Región que toca el borde derecho o inferior** (la última columna mide 639 px y la última fila 720) o que se sale del mapa: debe armarse bien en el borde y fallar con un mensaje claro si se sale. Pruebas en la tarea 1 (`test_leer_region_en_el_borde`, `test_leer_region_fuera_del_mapa`).
3. **Zona cuyo tamaño no es múltiplo del factor de píxel**: debe fallar diciéndolo, no recortar en silencio y desalinear el tramado. Prueba en la tarea 2 (`test_reducir_rechaza_tamano_que_no_cuadra`).
4. **Umbral de silueta mal puesto** (no detecta nada, o se traga toda la caja): debe fallar diciendo hacia dónde mover el umbral, no entregar un recorte vacío ni un fondo borrado entero. Pruebas en la tarea 3 (`test_silueta_sin_figura`, `test_silueta_que_cubre_todo`, `test_rellenar_sin_fondo`).
5. **Teléfono de 390 px**: la página de la prueba no debe desbordarse a lo ancho ni mostrar el pixel art a escala no entera, porque Neri decidiría sobre una imagen deformada. Verificación en la tarea 4 con `herramientas/ver.mjs`.

---

## Estructura de archivos

```
~/monte/
  .gitignore
  README.md                 creditos, licencia, como correr
  CLAUDE.md                 reglas del proyecto para sesiones futuras
  pytest.ini
  package.json              solo devDependency: playwright-core
  publicar.sh               copia public/ al docroot sin tocar sus permisos
  docs/superpowers/         spec y planes
  fabrica/
    __init__.py
    fuente.py               constantes IIIF, rejilla, bajar, leer_region
    descargar.py            CLI: descarga completa y verificacion
    paleta.py               extraer(muestras, n)
    pixelar.py              reducir, cuantizar, a_imagen
    rellenar.py             silueta_por_color, rellenar
    prueba.py               CLI: arma las imagenes de la prueba visual
  tests/
    test_fuente.py
    test_pixelar.py
    test_rellenar.py
  herramientas/
    ver.mjs                 abre una URL en Chromium headless y revisa
  public/
    prueba/
      index.html            las tres zonas en cuatro combinaciones
      criatura.html         la criatura animada
      prueba.css
      escala.js             pone cada imagen a escala entera
      criatura.js           animacion por filas
```

---

### Task 1: Repositorio, entorno y lectura del escaneo

**Files:**
- Create: `~/monte/.gitignore`, `README.md`, `CLAUDE.md`, `pytest.ini`, `package.json`
- Create: `~/monte/fabrica/__init__.py`, `fabrica/fuente.py`, `fabrica/descargar.py`
- Test: `~/monte/tests/test_fuente.py`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `fabrica.fuente.ANCHO = 62079`, `ALTO = 62160`, `LADO = 1536`
  - `url_region(x, y, w, h) -> str`
  - `rejilla(ancho=ANCHO, alto=ALTO, lado=LADO) -> iterador de (col, fila, x, y, w, h)`
  - `ruta_tesela(raiz, col, fila) -> pathlib.Path`
  - `bajar(url, destino, abrir=urllib.request.urlopen, intentos=4, pausa=1.0, espera=5.0) -> bool` (True si bajó, False si ya estaba)
  - `leer_region(raiz, x, y, w, h, bajar_faltantes=True, ancho=ANCHO, alto=ALTO, lado=LADO) -> PIL.Image` en modo RGB
  - `fabrica.descargar.descargar_todo(raiz, pausa=1.0)`, `verificar(raiz) -> list[str]`
  - CLI: `python -m fabrica.descargar <raiz> [--verificar]`

- [ ] **Step 1: Crear el repositorio y el entorno**

```bash
mkdir -p ~/monte/fabrica ~/monte/tests ~/monte/herramientas ~/monte/public/prueba ~/monte/docs/superpowers/specs ~/monte/docs/superpowers/plans
cd ~/monte && git init -b main
python3 -m venv .venv
.venv/bin/pip install --quiet Pillow numpy scipy pytest
.venv/bin/python -c "import PIL, numpy, scipy; print(PIL.__version__, numpy.__version__, scipy.__version__)"
cp ~/public_html/docs/superpowers/specs/2026-10-06-monte-design.md docs/superpowers/specs/
cp ~/public_html/docs/superpowers/plans/2026-10-06-monte-etapa-1.md docs/superpowers/plans/
touch fabrica/__init__.py
```

Expected: imprime tres números de versión, sin errores.

- [ ] **Step 2: Archivos de base**

`.gitignore`:

```
.venv/
node_modules/
__pycache__/
.pytest_cache/
capturas/
public/prueba/*.png
public/prueba/*.jpg
public/prueba/*.json
```

`pytest.ini`:

```ini
[pytest]
testpaths = tests
```

`package.json`:

```json
{
  "name": "monte",
  "private": true,
  "type": "module",
  "devDependencies": {
    "playwright-core": "^1.50.0"
  }
}
```

`README.md`:

```markdown
# Monte

El planisferio de Urbano Monte (Milán, 1587) en pixel art navegable.
Publicado en https://monte.neracosu.com

## Créditos

- Mapa: Urbano Monte, 1587.
- Imagen: David Rumsey Map Collection, David Rumsey Map Center, Stanford Libraries.
  Compuesto de las 60 hojas ensamblado por Brandon Rumsey.
  https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~303661~90074314
- Las imágenes derivadas de este proyecto se publican bajo CC BY-NC-SA 3.0,
  la misma licencia de la colección: con atribución, sin uso comercial.

## Cómo correr

    python3 -m venv .venv && .venv/bin/pip install Pillow numpy scipy pytest
    .venv/bin/pytest
    .venv/bin/python -m fabrica.descargar ~/monte-fuente
    .venv/bin/python -m fabrica.prueba ~/monte-fuente public/prueba
```

`CLAUDE.md`:

```markdown
# Monte — notas para Claude

Planisferio de Urbano Monte (1587) en pixel art navegable. Spec y planes en `docs/superpowers/`.

- `fabrica/` (Python, `.venv`) convierte el escaneo en pixel art. `public/` es lo que sirve Apache.
- El escaneo original vive en `~/monte-fuente/`: no entra al repositorio ni al docroot.
- Sitio estatico: sin dependencias de navegador, sin build, sin PM2.
- Coordenadas siempre en pixeles del escaneo original (62079 x 62160).
- Pixel art a escala entera, sin suavizado. Tramado ordenado: el mismo escaneo da las mismas teselas.
- Ninguna ficha afirma algo sin fuente. Neri revisa todas antes de publicar.
- Publicar con `./publicar.sh`. Nunca `rsync -a` ni `chown -R` sobre el docroot: su grupo es `nobody`.
- Verificar en navegador real a 390 px: `node herramientas/ver.mjs <url> 390x844`.
- Espanol de Venezuela, voz de usted, sin emojis. Comentarios del codigo sin acentos.
- A Rumsey se le pide una tesela a la vez, con pausa.
```

- [ ] **Step 3: Escribir las pruebas que fallan**

`tests/test_fuente.py`:

```python
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
```

- [ ] **Step 4: Correr y ver que fallan**

Run: `cd ~/monte && .venv/bin/pytest tests/test_fuente.py -v`
Expected: FAIL en la colección con `ImportError: cannot import name 'fuente'`.

- [ ] **Step 5: Implementar `fabrica/fuente.py`**

```python
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
```

- [ ] **Step 6: Correr y ver que pasan**

Run: `cd ~/monte && .venv/bin/pytest tests/test_fuente.py -v`
Expected: 7 passed.

- [ ] **Step 7: Implementar `fabrica/descargar.py`**

```python
"""Descarga completa del escaneo, tesela por tesela. Reanudable: lo que ya esta no se vuelve a pedir.

    python -m fabrica.descargar ~/monte-fuente
    python -m fabrica.descargar ~/monte-fuente --verificar
"""
import sys

from PIL import Image

from .fuente import bajar, rejilla, ruta_tesela, url_region


def descargar_todo(raiz, pausa=1.0):
    cajas = list(rejilla())
    for n, (col, fila, x, y, w, h) in enumerate(cajas, 1):
        if bajar(url_region(x, y, w, h), ruta_tesela(raiz, col, fila), pausa=pausa):
            print(f'{n}/{len(cajas)} fila {fila} col {col}', flush=True)


def verificar(raiz):
    """Lista de problemas: teselas que faltan, no abren o no miden lo que deben."""
    malas = []
    for col, fila, x, y, w, h in rejilla():
        ruta = ruta_tesela(raiz, col, fila)
        try:
            with Image.open(ruta) as tesela:
                if tesela.size != (w, h):
                    malas.append(f'{ruta}: mide {tesela.size}, deberia medir {(w, h)}')
        except OSError as e:
            malas.append(f'{ruta}: {e}')
    return malas


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if '--verificar' in sys.argv:
        problemas = verificar(sys.argv[1])
        print('\n'.join(problemas) if problemas else 'completo: 1681 teselas con su medida')
        sys.exit(1 if problemas else 0)
    descargar_todo(sys.argv[1])
```

- [ ] **Step 8: Probar contra el servidor real con una sola tesela**

```bash
cd ~/monte && .venv/bin/python -c "
from fabrica.fuente import leer_region
img = leer_region('$HOME/monte-fuente', 30720, 30720, 1536, 1536)
print(img.size, img.getpixel((768, 768)))"
ls -la ~/monte-fuente/20/20.jpg
```

Expected: `(1536, 1536)` y un color; el archivo `20/20.jpg` existe y pesa cerca de 560 KB.

- [ ] **Step 9: Commit**

```bash
cd ~/monte && git add -A && git commit -m "feat(fabrica): repositorio, entorno y lectura del escaneo por teselas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Paleta y pixelado

**Files:**
- Create: `~/monte/fabrica/paleta.py`, `~/monte/fabrica/pixelar.py`
- Test: `~/monte/tests/test_pixelar.py`

**Interfaces:**
- Consumes: nada de la tarea 1.
- Produces:
  - `fabrica.paleta.extraer(muestras, n) -> numpy.ndarray` de forma `(hasta n, 3)`, `uint8`, ordenada de oscuro a claro. `muestras` es una lista de `PIL.Image`.
  - `fabrica.pixelar.reducir(img, factor) -> numpy.ndarray` de forma `(alto // factor, ancho // factor, 3)`, `float32`. Falla con `ValueError` si el tamaño no es múltiplo del factor.
  - `fabrica.pixelar.cuantizar(a, paleta, x0=0, y0=0, fuerza=24.0) -> numpy.ndarray` de forma `(alto, ancho)`, `uint8`, con índices de la paleta. `x0, y0` es la posición del bloque en la cuadrícula del nivel.
  - `fabrica.pixelar.a_imagen(indices, paleta) -> PIL.Image` en modo `P`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/test_pixelar.py`:

```python
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
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd ~/monte && .venv/bin/pytest tests/test_pixelar.py -v`
Expected: FAIL en la colección con `ModuleNotFoundError: No module named 'fabrica.paleta'`.

- [ ] **Step 3: Implementar `fabrica/pixelar.py`**

```python
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
```

- [ ] **Step 4: Implementar `fabrica/paleta.py`**

```python
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
    usados = len(q.getcolors())
    p = np.array(q.getpalette(), dtype=np.uint8).reshape(-1, 3)[:usados]
    luz = p.astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    return p[np.argsort(luz, kind='stable')]
```

- [ ] **Step 5: Correr y ver que pasan**

Run: `cd ~/monte && .venv/bin/pytest tests/test_pixelar.py -v`
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
cd ~/monte && git add -A && git commit -m "feat(fabrica): paleta sacada del mapa y pixelado con tramado ordenado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Silueta y relleno del fondo

**Files:**
- Create: `~/monte/fabrica/rellenar.py`
- Test: `~/monte/tests/test_rellenar.py`

**Interfaces:**
- Consumes: nada de las tareas anteriores (trabaja sobre arreglos como los que devuelve `reducir`).
- Produces:
  - `fabrica.rellenar.silueta_por_color(a, umbral=38.0) -> numpy.ndarray` de forma `(alto, ancho)`, `bool`, `True` donde está la figura. Falla con `ValueError` si no distingue ninguna figura o si la silueta pasa del 60 % de la caja.
  - `fabrica.rellenar.rellenar(a, mascara) -> numpy.ndarray` `float32` de la misma forma que `a`, con lo enmascarado reemplazado por el fondo vecino. Falla con `ValueError` si la máscara lo cubre todo.

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/test_rellenar.py`:

```python
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
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd ~/monte && .venv/bin/pytest tests/test_rellenar.py -v`
Expected: FAIL en la colección con `ModuleNotFoundError: No module named 'fabrica.rellenar'`.

- [ ] **Step 3: Implementar `fabrica/rellenar.py`**

```python
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
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `cd ~/monte && .venv/bin/pytest -v`
Expected: 20 passed (7 + 7 + 6).

- [ ] **Step 5: Commit**

```bash
cd ~/monte && git add -A && git commit -m "feat(fabrica): silueta por color y relleno del fondo de una criatura

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: La prueba visual, armada y revisada en local

**Files:**
- Create: `~/monte/fabrica/prueba.py`
- Create: `~/monte/public/prueba/index.html`, `criatura.html`, `prueba.css`, `escala.js`, `criatura.js`
- Create: `~/monte/herramientas/ver.mjs`

**Interfaces:**
- Consumes: `leer_region` (tarea 1); `extraer`, `reducir`, `cuantizar`, `a_imagen` (tarea 2); `silueta_por_color`, `rellenar` (tarea 3).
- Produces:
  - CLI `python -m fabrica.prueba <fuente> <salida>`: escribe en `<salida>` los archivos `{texto,costa,rey}-original.jpg`, `{texto,costa,rey}-{a,b,c,d}.png`, `criatura-fondo.png`, `criatura-sprite.png`, `criatura-silueta.png` y `paletas.json`.
  - `fabrica.prueba.ZONAS`, `CRIATURA`, `COMBOS` como constantes del módulo.
  - CLI `node herramientas/ver.mjs <url> [anchoxalto] [captura.png]`: sale con código 0 si la página no tiene errores, no se desborda y muestra todo elemento `.pixel` a escala entera; con código 1 y la lista de fallas si no.

- [ ] **Step 1: Implementar `fabrica/prueba.py`**

```python
"""Arma las imagenes de la prueba visual de la etapa 1.

    python -m fabrica.prueba ~/monte-fuente public/prueba
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from .fuente import leer_region
from .paleta import extraer
from .pixelar import a_imagen, cuantizar, reducir
from .rellenar import rellenar, silueta_por_color

LADO_ZONA = 3072
# coordenadas del escaneo, multiplos de 24 para que casen con los factores 4, 6 y 8
ZONAS = [
    {'id': 'texto', 'x': 27288, 'y': 45600},
    {'id': 'costa', 'x': 20640, 'y': 32616},
    {'id': 'rey', 'x': 24624, 'y': 41376},
]
CRIATURA = {'id': 'monstruo-marino', 'caja': (50688, 27360, 1512, 2400), 'factor': 6, 'colores': 32}
# clave, factor (pixeles del escaneo por pixel del dibujo), colores
COMBOS = [('a', 4, 48), ('b', 6, 32), ('c', 6, 16), ('d', 8, 16)]


def construir(fuente, salida):
    salida = Path(salida)
    salida.mkdir(parents=True, exist_ok=True)
    regiones = {z['id']: leer_region(fuente, z['x'], z['y'], LADO_ZONA, LADO_ZONA) for z in ZONAS}
    recorte = leer_region(fuente, *CRIATURA['caja'])
    muestras = list(regiones.values()) + [recorte]
    paletas = {n: extraer(muestras, n) for n in sorted({c[2] for c in COMBOS} | {CRIATURA['colores']})}

    for z in ZONAS:
        img = regiones[z['id']]
        img.resize((768, 768), Image.LANCZOS).save(salida / f"{z['id']}-original.jpg", quality=88)
        for clave, factor, n in COMBOS:
            indices = cuantizar(reducir(img, factor), paletas[n], z['x'] // factor, z['y'] // factor)
            a_imagen(indices, paletas[n]).save(salida / f"{z['id']}-{clave}.png", optimize=True)

    f, pal = CRIATURA['factor'], paletas[CRIATURA['colores']]
    x0, y0 = CRIATURA['caja'][0] // f, CRIATURA['caja'][1] // f
    a = reducir(recorte, f)
    figura = silueta_por_color(a)
    a_imagen(cuantizar(rellenar(a, figura), pal, x0, y0), pal).save(salida / 'criatura-fondo.png', optimize=True)
    color = pal[cuantizar(a, pal, x0, y0)]
    alfa = np.where(figura, 255, 0).astype(np.uint8)
    Image.fromarray(np.dstack([color, alfa]), 'RGBA').save(salida / 'criatura-sprite.png', optimize=True)
    # para revisar el recorte a ojo: la figura tenida de rojo sobre el original
    revision = a.copy()
    revision[figura] = revision[figura] * 0.5 + np.array([255, 0, 0], dtype=np.float32) * 0.5
    Image.fromarray(revision.astype(np.uint8), 'RGB').save(salida / 'criatura-silueta.png')

    (salida / 'paletas.json').write_text(json.dumps({str(n): p.tolist() for n, p in paletas.items()}))
    print(f'listo: {len(ZONAS) * (len(COMBOS) + 1) + 3} imagenes en {salida}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    construir(sys.argv[1], sys.argv[2])
```

- [ ] **Step 2: Correr la fábrica de la prueba**

Run: `cd ~/monte && .venv/bin/python -m fabrica.prueba ~/monte-fuente public/prueba && ls -la public/prueba/*.png | wc -l`
Expected: `listo: 18 imagenes en public/prueba` y `15` (12 de zonas más 3 de la criatura). Baja unas 20 teselas, cerca de un minuto.

- [ ] **Step 3: Revisar el recorte de la criatura mirando la imagen**

Abrir `public/prueba/criatura-silueta.png` con la herramienta de lectura de imágenes. Tiene que verse el monstruo marino entero teñido de rojo, sin trozos de mar ni de otras figuras, y sin tocar los bordes de la imagen.

Si falta parte del cuerpo, bajar el umbral; si se tiñe mar, subirlo: pasar `umbral=` en la llamada a `silueta_por_color` dentro de `construir` (probar 30, 46). Si la figura toca un borde, agrandar `CRIATURA['caja']` en pasos de 24 hacia ese lado. Volver a correr el paso 2 hasta que el recorte esté limpio. Dejar en un comentario junto a `CRIATURA` el valor que quedó.

- [ ] **Step 4: Las páginas de la prueba**

`public/prueba/prueba.css`:

```css
:root { color-scheme: dark; --fondo: #0f1620; --papel: #e9dfc4; --tinta: #c9bd9b; --acento: #5ed29c; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--fondo); color: var(--papel); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 1.5rem; margin: 0 0 4px; }
h2 { font-size: 1.15rem; margin: 40px 0 4px; }
h3 { font-size: 1rem; margin: 24px 0 8px; color: var(--acento); }
p { margin: 0 0 12px; color: var(--tinta); }
a { color: var(--acento); }
figure { margin: 0 0 8px; overflow: hidden; }
img, canvas { display: block; max-width: none; }
.pixel { image-rendering: pixelated; image-rendering: crisp-edges; }
.original { width: 100%; max-width: 768px; height: auto; }
.nota { font-size: .875rem; }
footer { margin-top: 48px; font-size: .8125rem; color: var(--tinta); }
```

`public/prueba/escala.js`:

```js
// Pone cada imagen .pixel a la mayor escala entera que cabe en su contenedor:
// un pixel del dibujo ocupa siempre un numero entero de pixeles de pantalla.
export function escalaEntera(el, natural) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const k = Math.max(1, Math.floor((el.parentElement.clientWidth * dpr) / natural));
  el.style.width = `${(natural * k) / dpr}px`;
  return k;
}

function ajustar() {
  for (const img of document.querySelectorAll('img.pixel')) {
    if (!img.naturalWidth) continue;
    const k = escalaEntera(img, img.naturalWidth);
    const nota = img.closest('section')?.querySelector('[data-escala]');
    if (nota) nota.textContent = `Cada píxel del dibujo ocupa ${k} × ${k} píxeles de su pantalla.`;
  }
}

for (const img of document.querySelectorAll('img.pixel')) img.addEventListener('load', ajustar);
addEventListener('resize', ajustar);
ajustar();
```

`public/prueba/index.html` — las tres zonas repiten la misma estructura con su `id`:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Monte: prueba de píxel y paleta</title>
<link rel="stylesheet" href="prueba.css">
</head>
<body>
<main>
  <h1>Monte: prueba de píxel y paleta</h1>
  <p>Tres zonas del planisferio de Urbano Monte (1587) en cuatro combinaciones. Elija la que mejor
    conserve la letra de Monte sin dejar de verse como pixel art, y dígame la letra: A, B, C o D.</p>
  <p><a href="criatura.html">Ver la criatura animada</a></p>

  <h2>Zona 1: letra manuscrita</h2>
  <figure><img class="original" src="texto-original.jpg" alt="Rollo con texto manuscrito de Monte, escaneo original"></figure>
  <section><h3>A · píxel fino, 48 colores</h3>
    <figure><img class="pixel" src="texto-a.png" alt="La misma zona en la combinación A"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>B · píxel medio, 32 colores</h3>
    <figure><img class="pixel" src="texto-b.png" alt="La misma zona en la combinación B"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>C · píxel medio, 16 colores</h3>
    <figure><img class="pixel" src="texto-c.png" alt="La misma zona en la combinación C"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>D · píxel grueso, 16 colores</h3>
    <figure><img class="pixel" src="texto-d.png" alt="La misma zona en la combinación D"></figure>
    <p class="nota" data-escala></p></section>

  <h2>Zona 2: costa con topónimos</h2>
  <figure><img class="original" src="costa-original.jpg" alt="Costa con ríos, árboles y nombres de lugares, escaneo original"></figure>
  <section><h3>A · píxel fino, 48 colores</h3>
    <figure><img class="pixel" src="costa-a.png" alt="La misma zona en la combinación A"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>B · píxel medio, 32 colores</h3>
    <figure><img class="pixel" src="costa-b.png" alt="La misma zona en la combinación B"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>C · píxel medio, 16 colores</h3>
    <figure><img class="pixel" src="costa-c.png" alt="La misma zona en la combinación C"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>D · píxel grueso, 16 colores</h3>
    <figure><img class="pixel" src="costa-d.png" alt="La misma zona en la combinación D"></figure>
    <p class="nota" data-escala></p></section>

  <h2>Zona 3: la barca del rey Felipe</h2>
  <figure><img class="original" src="rey-original.jpg" alt="Barca con tres figuras y el rótulo RE PHILIPO, escaneo original"></figure>
  <section><h3>A · píxel fino, 48 colores</h3>
    <figure><img class="pixel" src="rey-a.png" alt="La misma zona en la combinación A"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>B · píxel medio, 32 colores</h3>
    <figure><img class="pixel" src="rey-b.png" alt="La misma zona en la combinación B"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>C · píxel medio, 16 colores</h3>
    <figure><img class="pixel" src="rey-c.png" alt="La misma zona en la combinación C"></figure>
    <p class="nota" data-escala></p></section>
  <section><h3>D · píxel grueso, 16 colores</h3>
    <figure><img class="pixel" src="rey-d.png" alt="La misma zona en la combinación D"></figure>
    <p class="nota" data-escala></p></section>

  <footer>Mapa de Urbano Monte, 1587. Imagen: David Rumsey Map Collection, David Rumsey Map Center,
    Stanford Libraries; compuesto de Brandon Rumsey. Imágenes derivadas bajo CC BY-NC-SA 3.0.</footer>
</main>
<script type="module" src="escala.js"></script>
</body>
</html>
```

`public/prueba/criatura.html`:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Monte: prueba de criatura animada</title>
<link rel="stylesheet" href="prueba.css">
</head>
<body>
<main>
  <h1>Monte: prueba de criatura animada</h1>
  <p>El monstruo marino está recortado del propio mapa y se mueve por código. Debajo, el mar se
    rellenó donde estaba dibujado. Fíjese si se nota el parche y si el movimiento le convence.</p>
  <p><a href="index.html">Volver a las combinaciones</a></p>
  <figure><canvas id="lienzo" class="pixel" role="img" aria-label="Monstruo marino del mapa de Monte, animado"></canvas></figure>
  <p class="nota" id="aviso" role="status"></p>

  <h2>Cómo quedó el recorte</h2>
  <p>En rojo, lo que el proceso tomó como criatura.</p>
  <figure><img class="pixel" src="criatura-silueta.png" alt="El recorte de la criatura marcado en rojo"></figure>

  <h2>El mar sin la criatura</h2>
  <figure><img class="pixel" src="criatura-fondo.png" alt="El mismo trozo de mar con la criatura borrada"></figure>

  <footer>Mapa de Urbano Monte, 1587. Imagen: David Rumsey Map Collection, David Rumsey Map Center,
    Stanford Libraries; compuesto de Brandon Rumsey. Imágenes derivadas bajo CC BY-NC-SA 3.0.</footer>
</main>
<script type="module" src="escala.js"></script>
<script type="module" src="criatura.js"></script>
</body>
</html>
```

`public/prueba/criatura.js`:

```js
// La criatura se dibuja fila por fila: cada fila se corre un poco segun una onda (ondular)
// y toda la figura sube y baja (flotar). Siempre en pixeles enteros del dibujo.
import { escalaEntera } from './escala.js';

const lienzo = document.getElementById('lienzo'), g = lienzo.getContext('2d');
const aviso = document.getElementById('aviso');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fondo = new Image(), figura = new Image();

function medir() { escalaEntera(lienzo, lienzo.width); }

function cuadro(ms) {
  const t = ms / 1000;
  g.drawImage(fondo, 0, 0);
  const sube = quieto ? 0 : Math.round(Math.sin(t * 1.6) * 2);
  for (let y = 0; y < figura.naturalHeight; y++) {
    const corre = quieto ? 0 : Math.round(Math.sin(t * 2.4 + y * 0.09) * 1.5);
    g.drawImage(figura, 0, y, figura.naturalWidth, 1, corre, y + sube, figura.naturalWidth, 1);
  }
  if (!quieto) requestAnimationFrame(cuadro);
}

let faltan = 2;
for (const [img, src] of [[fondo, 'criatura-fondo.png'], [figura, 'criatura-sprite.png']]) {
  img.onload = () => {
    if (--faltan) return;
    lienzo.width = fondo.naturalWidth;
    lienzo.height = fondo.naturalHeight;
    g.imageSmoothingEnabled = false;
    medir();
    addEventListener('resize', medir);
    if (quieto) aviso.textContent = 'Su dispositivo pide menos movimiento: la criatura se muestra quieta.';
    requestAnimationFrame(cuadro);
  };
  img.onerror = () => { aviso.textContent = `No se pudo cargar ${src}.`; };
  img.src = src;
}
```

- [ ] **Step 5: La herramienta de verificación en navegador**

```bash
cd ~/monte && npm install --no-audit --no-fund && ls ~/.cache/ms-playwright/chromium-1243/
```

Expected: aparece una carpeta `chrome-linux`. Si el nombre es otro, usar ese en `RUTA_CHROME` del archivo siguiente.

`herramientas/ver.mjs`:

```js
// Abre una URL en Chromium headless y revisa lo que un ojo se salta:
// errores, recursos que no cargan, desborde a lo ancho y pixel art a escala no entera.
//   node herramientas/ver.mjs <url> [anchoxalto] [captura.png]
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const RUTA_CHROME = 'chrome-linux/chrome';
const [url, tam = '390x844', captura = 'capturas/ver.png'] = process.argv.slice(2);
if (!url) { console.error('uso: node herramientas/ver.mjs <url> [anchoxalto] [captura.png]'); process.exit(2); }
const [width, height] = tam.split('x').map(Number);

const cache = join(homedir(), '.cache/ms-playwright');
const carpeta = readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort().pop();
if (!carpeta) { console.error(`no hay Chromium en ${cache}`); process.exit(2); }

const navegador = await chromium.launch({ executablePath: join(cache, carpeta, RUTA_CHROME) });
const pagina = await navegador.newPage({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 3 : 1 });
const fallas = [];
pagina.on('console', m => { if (m.type() === 'error') fallas.push(`consola: ${m.text()}`); });
pagina.on('pageerror', e => fallas.push(`error: ${e.message}`));
pagina.on('requestfailed', r => fallas.push(`no cargo: ${r.url()}`));
pagina.on('response', r => { if (r.status() >= 400) fallas.push(`${r.status()}: ${r.url()}`); });

await pagina.goto(url, { waitUntil: 'networkidle' });
const medidas = await pagina.evaluate(() => ({
  desborde: document.documentElement.scrollWidth - window.innerWidth,
  pixel: [...document.querySelectorAll('.pixel')].map(e => {
    const natural = e.naturalWidth || e.width;
    return { quien: e.id || e.getAttribute('src'), natural, k: (e.getBoundingClientRect().width * window.devicePixelRatio) / natural };
  }),
}));
mkdirSync(dirname(captura), { recursive: true });
await pagina.screenshot({ path: captura, fullPage: true });
await navegador.close();

if (medidas.desborde > 0) fallas.push(`la pagina se desborda ${medidas.desborde}px a lo ancho`);
if (!medidas.pixel.length) fallas.push('no hay ningun elemento .pixel en la pagina');
for (const p of medidas.pixel) {
  if (!p.natural) fallas.push(`${p.quien}: no cargo`);
  else if (p.k < 1 || Math.abs(p.k - Math.round(p.k)) > 0.01) fallas.push(`${p.quien}: escala ${p.k.toFixed(3)}, no entera`);
}
console.log(`${url} a ${tam}: ${medidas.pixel.length} elementos de pixel art, captura en ${captura}`);
if (fallas.length) { console.error(fallas.join('\n')); process.exit(1); }
console.log('sin fallas');
```

- [ ] **Step 6: Revisar en local a 390 px y en escritorio**

```bash
cd ~/monte && mkdir -p capturas && (python3 -m http.server 8137 --bind 127.0.0.1 -d public >/dev/null 2>&1 & echo $! > capturas/http.pid)
node herramientas/ver.mjs http://127.0.0.1:8137/prueba/index.html 390x844 capturas/index-movil.png
node herramientas/ver.mjs http://127.0.0.1:8137/prueba/criatura.html 390x844 capturas/criatura-movil.png
node herramientas/ver.mjs http://127.0.0.1:8137/prueba/index.html 1280x800 capturas/index-escritorio.png
node herramientas/ver.mjs http://127.0.0.1:8137/prueba/criatura.html 1280x800 capturas/criatura-escritorio.png
kill "$(cat capturas/http.pid)"
```

Expected: las cuatro corridas terminan en `sin fallas`. La de `index.html` informa 12 elementos de pixel art; la de `criatura.html`, 3.

Después, abrir las cuatro capturas con la herramienta de lectura de imágenes y comprobar a ojo: en la zona de texto se distingue cuál combinación deja leer la letra; en la criatura no se ve doble ni queda una mancha lisa evidente donde estaba. Anotar lo observado para el mensaje a Neri. Si el parche del mar se ve como una mancha lisa, decirlo tal cual: es justo lo que esta prueba vino a averiguar.

- [ ] **Step 7: Commit**

```bash
cd ~/monte && .venv/bin/pytest -q && git add -A && git commit -m "feat(prueba): tres zonas en cuatro combinaciones y una criatura animada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `20 passed` antes del commit.

---

### Task 5: Publicar la prueba y dejar bajando el escaneo completo

**Files:**
- Create: `~/monte/publicar.sh`
- Create: `~/public_html/monte.neracosu.com/.htaccess` (por `publicar.sh`, desde `public/.htaccess`)
- Create: `~/monte/public/.htaccess`
- Modify: `~/public_html/.gitignore` (una línea nueva junto a `juego.atalaya.neracosu.com/`)

**Interfaces:**
- Consumes: `public/prueba/` armada (tarea 4); `fabrica.descargar` (tarea 1); `herramientas/ver.mjs` (tarea 4).
- Produces: `https://monte.neracosu.com/prueba/` respondiendo `200`; `~/monte-fuente/` con las 1.681 teselas verificadas; `./publicar.sh` para las etapas siguientes.

- [ ] **Step 1: Pedir el visto bueno de Neri para crear el subdominio**

Decirle exactamente esto y esperar su respuesta: «Voy a crear el subdominio `monte.neracosu.com` con carpeta `public_html/monte.neracosu.com` y a agregar esa carpeta al `.gitignore` del repositorio de la web. ¿Procedo?». No seguir sin un sí.

- [ ] **Step 2: Crear el subdominio y comprobar sus permisos**

```bash
uapi SubDomain addsubdomain domain=monte rootdomain=neracosu.com dir=public_html/monte.neracosu.com
stat -c '%U:%G %a %n' ~/public_html/monte.neracosu.com ~/public_html
```

Expected: `status: 1` en la salida de `uapi`; la carpeta nueva y `public_html` salen las dos como `neracosu:nobody 750`. Si la nueva sale con otro grupo o modo:

```bash
chown neracosu:nobody ~/public_html/monte.neracosu.com && chmod 750 ~/public_html/monte.neracosu.com
```

Comprobar que la web principal sigue viva: `curl -s -o /dev/null -w '%{http_code}\n' https://neracosu.com/` → `200`.

- [ ] **Step 3: `.htaccess` del sitio y script de publicación**

`public/.htaccess`:

```apache
Options -Indexes
AddDefaultCharset UTF-8

RewriteEngine On
RewriteCond %{HTTPS} off
RewriteCond %{REQUEST_URI} !^/\.well-known/
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  # la prueba no es para buscadores
  <If "%{REQUEST_URI} =~ m#^/prueba/#">
    Header set X-Robots-Tag "noindex, nofollow"
  </If>
</IfModule>
```

`publicar.sh`:

```bash
#!/usr/bin/env bash
# Copia public/ al docroot. Sin -a ni -p: el directorio raiz del docroot es neracosu:nobody 750
# y Apache entra por el grupo; cambiarlo deja el sitio en 403.
set -euo pipefail
DESTINO="$HOME/public_html/monte.neracosu.com"
cd "$(dirname "$0")"
[ -d "$DESTINO" ] || { echo "no existe $DESTINO" >&2; exit 1; }
rsync -r --times --omit-dir-times public/ "$DESTINO"/
permisos="$(stat -c '%U:%G %a' "$DESTINO")"
if [ "$permisos" != "neracosu:nobody 750" ]; then
  echo "ALTO: $DESTINO quedo como $permisos y debe ser neracosu:nobody 750" >&2
  exit 1
fi
echo "publicado en $DESTINO ($permisos)"
```

```bash
cd ~/monte && chmod +x publicar.sh && ./publicar.sh
```

Expected: `publicado en /home/neracosu/public_html/monte.neracosu.com (neracosu:nobody 750)`.

- [ ] **Step 4: Verificar por el dominio público**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://monte.neracosu.com/prueba/
curl -s -o /dev/null -w '%{http_code}\n' https://monte.neracosu.com/prueba/texto-b.png
curl -sI https://monte.neracosu.com/prueba/ | grep -iE 'x-robots-tag|cache-control'
cd ~/monte && node herramientas/ver.mjs https://monte.neracosu.com/prueba/index.html 390x844 capturas/publico-index.png
node herramientas/ver.mjs https://monte.neracosu.com/prueba/criatura.html 390x844 capturas/publico-criatura.png
```

Expected: `200`, `200`, las dos cabeceras presentes y `sin fallas` dos veces.

Si `curl` falla por el certificado, es que AutoSSL todavía no lo emitió para el subdominio nuevo. Comprobar con `curl -sk` que el contenido sí responde `200`, y decirle a Neri que el enlace mostrará advertencia hasta que cPanel emita el certificado (puede lanzarlo él desde cPanel, «SSL/TLS Status», «Run AutoSSL»). No dar la tarea por terminada hasta que responda `200` sin `-k`.

- [ ] **Step 5: Ignorar la carpeta en el repositorio de la web**

En `~/public_html/.gitignore`, debajo de la línea `juego.atalaya.neracosu.com/`, agregar:

```
monte.neracosu.com/
```

```bash
cd ~/public_html && git status --short | grep -c monte.neracosu.com
git add .gitignore && git commit -m "gitignore: el subdominio de Monte (monte.neracosu.com)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `0` (la carpeta ya no aparece como sin seguimiento). Solo commit; el push de ese repositorio lo decide Neri.

- [ ] **Step 6: Dejar bajando el escaneo completo**

```bash
cd ~/monte && nohup .venv/bin/python -m fabrica.descargar ~/monte-fuente > ~/monte-fuente/descarga.log 2>&1 &
echo $! > ~/monte-fuente/descarga.pid
sleep 20; tail -3 ~/monte-fuente/descarga.log
```

Expected: líneas del tipo `37/1681 fila 0 col 36`. Tarda cerca de 70 minutos. Es un solo proceso con pausa de un segundo; no lanzar un segundo en paralelo.

- [ ] **Step 7: Commit del repositorio de Monte**

```bash
cd ~/monte && git add -A && git commit -m "feat: publicacion en monte.neracosu.com sin tocar los permisos del docroot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Entregar la prueba a Neri**

Mensaje a Neri con: el enlace `https://monte.neracosu.com/prueba/`, lo que se observó en las capturas (qué combinación deja leer la letra, cómo quedó el parche del mar), una recomendación de combinación con su razón, y la pregunta: «¿Con cuál combinación seguimos, y le convence el borrado del fondo?».

- [ ] **Step 9: Cuando termine la descarga, verificarla**

```bash
cd ~/monte && .venv/bin/python -m fabrica.descargar ~/monte-fuente --verificar; du -sh ~/monte-fuente
```

Expected: `completo: 1681 teselas con su medida` y cerca de 1 GB. Si lista teselas malas, borrarlas y volver a correr el paso 6: solo baja las que faltan.

- [ ] **Step 10: Actualizar la memoria del proyecto**

En `~/.claude/projects/-home-neracosu-public-html/memory/project_monte.md`, reemplazar el párrafo de **Estado** por: repositorio en `~/monte`, prueba publicada en `monte.neracosu.com/prueba/`, escaneo completo en `~/monte-fuente`, y la combinación que Neri eligió (o «esperando su elección»). Actualizar la línea correspondiente en `MEMORY.md`.
