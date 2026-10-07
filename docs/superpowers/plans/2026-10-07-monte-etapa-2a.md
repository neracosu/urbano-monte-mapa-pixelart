# Monte, etapa 2a (teselas y mapa navegable) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `https://monte.neracosu.com/` muestre el planisferio completo en pixel art (combinación A: 4 píxeles del escaneo por píxel del dibujo, 48 colores), navegable con arrastre, pellizco, rueda, teclado y botones, en teléfono y escritorio.

**Architecture:** La fábrica reduce el escaneo entero a una «base» en disco (el nivel más fino, sin cuantizar) y de ella saca una pirámide de niveles, cada uno la mitad del anterior; cada nivel se pasa a la paleta con tramado ordenado y se corta en teselas PNG de 256. El visor es un canvas a pantalla completa con cuatro módulos: cámara (lógica pura), teselas (qué hace falta y su carga), pintor (dibuja a escala entera) y gestos; `mapa.js` los une y expone la API.

**Tech Stack:** Python 3.10 en `.venv` (Pillow, numpy, scipy, pytest); HTML, CSS y módulos ES sin dependencias; `node --test` para la lógica pura; `playwright-core` para verificar en Chromium.

**Spec:** `docs/superpowers/specs/2026-10-06-monte-design.md`

## Decisiones de esta etapa

- **Combinación A** (elegida por el dueño): factor 4, 48 colores.
- **Niveles**: factores 4, 8, 16, 32, 64, 128 y 256. El más fino mide 15.520 × 15.540; el más grueso, 243 × 243 en una sola tesela. Unas 5.000 teselas.
- **Borde**: 62.079 no es múltiplo de 4. La última fracción de píxel se completa repitiendo el borde del escaneo.
- **Cada nivel sale del escaneo, no del pixel art**: se promedia la base (que es el escaneo reducido, en decimales) y recién después se cuantiza. Promediar de dos en dos equivale a promediar el bloque entero.
- **Paleta**: 48 colores sacados del nivel que cabe en 2.048 px, que ya resume el mapa entero.
- **Paradas del zoom**: en reposo la escala es `1 / factor` de algún nivel (un píxel del dibujo = un píxel del lienzo) o, pasado el nivel más fino, un aumento entero de 2 a 8. Entre paradas solo se está durante el gesto.
- **Durante el gesto** se pinta el nivel cuyo píxel no se achica: nunca se reduce un pixel art.
- **Giro, entrada de las 60 hojas, «ver el original» y créditos**: etapa 2b.
- **El sitio lleva `noindex`** hasta el congelamiento; se quita al publicar la versión de presentación.
- **Las teselas no entran al repositorio** (unos 150 MB derivados y reproducibles): se generan y se publican con `publicar.sh`.

## Global Constraints

- Sitio estático: HTML, CSS y módulos ES sin dependencias ni paso de compilación. Sin PM2. No se lanza ningún build.
- La fábrica corre fuera del docroot. El escaneo y la base viven en `~/monte-fuente/`.
- Las coordenadas del mapa van en píxeles del escaneo original (62.079 × 62.160).
- En reposo, un píxel del dibujo ocupa un número entero de píxeles del lienzo. Tope de densidad del lienzo: 3.
- Tramado ordenado por posición global: sin costuras entre teselas y repetible byte a byte.
- Respeta `prefers-reduced-motion`.
- Texto visible en español de Venezuela, voz de usted, sin emojis. Comentarios del código sin acentos.
- Créditos a la vista: Urbano Monte; David Rumsey Map Collection, Stanford; CC BY-NC-SA 3.0.
- El docroot conserva `neracosu:nobody 750`. Publicar solo con `./publicar.sh`.
- El repositorio es público: ningún dato privado en commits ni documentos.
- Se revisa a 390 px de ancho en navegador real antes de dar algo por terminado.
- Commits en español sin acentos, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Falta o está dañada una tesela del escaneo a mitad de la construcción**: debe fallar nombrándola y no dejar una base a medias dada por buena. Prueba en la tarea 1 (`test_construir_base_no_deja_una_base_a_medias`).
2. **Lienzo más grande que el mapa, o que cambia de tamaño** (monitor grande, girar el teléfono): el mapa queda centrado y la escala sigue en una parada. Pruebas en la tarea 2 (`limitar centra...`) y verificación de cambio de tamaño en la tarea 3.
3. **Una tesela no carga** (red inestable del teléfono): se ve la misma zona de un nivel más grueso, se reintenta y el mapa termina completo. Verificación en la tarea 3 (`ver-mapa.mjs` corta la primera descarga de varias teselas).
4. **Gesto corto de zoom** (un paso de rueda, un pellizco pequeño): debe avanzar a la parada siguiente, no rebotar a la anterior. Prueba en la tarea 2 (`asentar con direccion...`).
5. **Densidad de pantalla fraccionaria o distinta de 3**: en reposo el aumento sigue siendo entero. Verificación en la tarea 3 a densidades 2, 2,625 y 3.

---

## Estructura de archivos

```
fabrica/niveles.py       geometria de los niveles (pura)
fabrica/base.py          promediar, construir_base
fabrica/teselar.py       mitad, piramide, paleta_del_mapa, teselar, manifiesto, CLI
tests/test_teselar.py
public/index.html        el mapa
public/estilo.css
public/visor/camara.js   logica pura de la camara
public/visor/teselas.js  que teselas se ven (puro) y su almacen
public/visor/pintor.js   dibuja un cuadro
public/visor/gestos.js   puntero, rueda, teclado
public/visor/mapa.js     une todo; API publica
public/visor/principal.js arranque de la pagina
tests-js/camara.test.js
tests-js/teselas.test.js
herramientas/ver-mapa.mjs verificacion del mapa en Chromium
public/mapa.json         generado
public/teselas/          generado, fuera del repositorio
```

---

### Task 1: La fábrica de teselas

**Files:**
- Create: `fabrica/niveles.py`, `fabrica/base.py`, `fabrica/teselar.py`
- Test: `tests/test_teselar.py`

**Interfaces:**
- Consumes: `fabrica.fuente.rejilla`, `ruta_tesela`, `ANCHO`, `ALTO`, `LADO`; `fabrica.paleta.extraer`; `fabrica.pixelar.cuantizar`, `a_imagen`.
- Produces:
  - `fabrica.niveles.FACTOR_BASE = 4`, `LADO_TESELA = 256`, `niveles(ancho, alto, factor_base=4, lado=256) -> list[dict]` con claves `k, factor, ancho, alto, cols, filas`.
  - `fabrica.base.promediar(a, factor) -> ndarray float32`, `construir_base(fuente, destino, factor, ancho, alto, lado, avisar=None) -> ndarray (memmap de solo lectura)`.
  - `fabrica.teselar.mitad(a)`, `piramide(base, lado) -> list[ndarray]`, `paleta_del_mapa(capas, n) -> ndarray`, `teselar(capas, paleta, salida, lado=256) -> (sello, cuenta)`, `manifiesto(capas, paleta, sello, ancho, alto, factor, lado) -> dict`.
  - CLI `python -m fabrica.teselar <fuente> <publico>`: escribe `<publico>/teselas/{k}/{fila}/{col}.png` y `<publico>/mapa.json`.
  - `mapa.json`: `{ ancho, alto, factor, lado, colores, sello, paleta: [[r,g,b]...], niveles: [{k, factor, ancho, alto, cols, filas}] }`, niveles de fino a grueso.

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/test_teselar.py`:

```python
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
            t = np.asarray(Image.open(tmp_path / 't' / '0' / str(fila) / f'{col}.png'))
            armado[fila * 4:fila * 4 + t.shape[0], col * 4:col * 4 + t.shape[1]] = t
    assert np.array_equal(armado, entero)
    assert Image.open(tmp_path / 't' / '0' / '2' / '2.png').size == (2, 1)
    assert Image.open(tmp_path / 't' / '2' / '0' / '0.png').mode == 'P'
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
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd ~/monte && .venv/bin/pytest tests/test_teselar.py -q`
Expected: FAIL en la colección con `ModuleNotFoundError: No module named 'fabrica.base'`.

- [ ] **Step 3: Implementar `fabrica/niveles.py`**

```python
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
```

- [ ] **Step 4: Implementar `fabrica/base.py`**

```python
"""La base: el escaneo entero reducido al pixel mas fino, sin cuantizar, en un .npy que se lee por trozos."""
from pathlib import Path

import numpy as np
from PIL import Image

from .fuente import ALTO, ANCHO, LADO, rejilla, ruta_tesela


def promediar(a, factor):
    """Promedia bloques de factor x factor. Lo que sobra abajo y a la derecha se completa repitiendo el borde."""
    a = np.asarray(a, dtype=np.float32)
    sobra_y, sobra_x = -a.shape[0] % factor, -a.shape[1] % factor
    if sobra_y or sobra_x:
        a = np.pad(a, ((0, sobra_y), (0, sobra_x), (0, 0)), mode='edge')
    return a.reshape(a.shape[0] // factor, factor, a.shape[1] // factor, factor, 3).mean(axis=(1, 3))


def construir_base(fuente, destino, factor, ancho=ANCHO, alto=ALTO, lado=LADO, avisar=None):
    """Arma la base tesela por tesela. Si destino ya existe con la medida correcta, lo reutiliza."""
    if lado % factor:
        raise ValueError(f'el lado de tesela {lado} no es multiplo de {factor}')
    destino = Path(destino)
    forma = (-(-alto // factor), -(-ancho // factor), 3)
    if destino.exists():
        base = np.load(destino, mmap_mode='r')
        if base.shape == forma:
            return base
    parte = destino.with_suffix('.parte.npy')
    base = np.lib.format.open_memmap(parte, mode='w+', dtype=np.float32, shape=forma)
    try:
        for col, fila, x, y, w, h in rejilla(ancho, alto, lado):
            ruta = ruta_tesela(fuente, col, fila)
            if not ruta.exists():
                raise FileNotFoundError(f'falta la tesela {ruta.parent.name}/{ruta.name} del escaneo')
            with Image.open(ruta) as tesela:
                if tesela.size != (w, h):
                    raise ValueError(f'{ruta}: mide {tesela.size}, deberia medir {(w, h)}')
                bloque = promediar(np.asarray(tesela.convert('RGB')), factor)
            base[y // factor:y // factor + bloque.shape[0], x // factor:x // factor + bloque.shape[1]] = bloque
            if avisar:
                avisar(col, fila)
        base.flush()
    except BaseException:
        del base
        parte.unlink(missing_ok=True)
        raise
    del base
    parte.rename(destino)
    return np.load(destino, mmap_mode='r')
```

- [ ] **Step 5: Implementar `fabrica/teselar.py`**

```python
"""De la base a las teselas de todos los niveles.

    python -m fabrica.teselar ~/monte-fuente public
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from .base import construir_base, promediar
from .fuente import ALTO, ANCHO
from .niveles import FACTOR_BASE, LADO_TESELA, niveles
from .paleta import extraer
from .pixelar import a_imagen, cuantizar

COLORES = 48


def mitad(a, franja=512):
    """El nivel siguiente: cada pixel promedia 2 x 2 del anterior. Por franjas, para no cargar todo."""
    alto, ancho = a.shape[:2]
    sal = np.empty((-(-alto // 2), -(-ancho // 2), 3), dtype=np.float32)
    for y in range(0, alto, 2 * franja):
        sal[y // 2:y // 2 + franja] = promediar(a[y:y + 2 * franja], 2)
    return sal


def piramide(base, lado=LADO_TESELA):
    """La base y sus mitades sucesivas, hasta la que cabe en una tesela."""
    capas = [base]
    while capas[-1].shape[0] > lado or capas[-1].shape[1] > lado:
        capas.append(mitad(capas[-1]))
    return capas


def paleta_del_mapa(capas, n, tope=2048):
    """Los n colores del mapa, sacados de la capa mas fina que no pase de tope: ya resume el mapa entero."""
    capa = next(c for c in capas if max(c.shape[:2]) <= tope)
    muestra = Image.fromarray(np.asarray(capa).round().clip(0, 255).astype(np.uint8), 'RGB')
    return extraer([muestra], n)


def teselar(capas, paleta, salida, lado=LADO_TESELA, avisar=None):
    """Escribe salida/{k}/{fila}/{col}.png. Devuelve (sello, cuantas): el sello resume el contenido."""
    salida = Path(salida)
    sello, cuenta = hashlib.sha1(), 0
    for k, capa in enumerate(capas):
        alto, ancho = capa.shape[:2]
        for fila, y in enumerate(range(0, alto, lado)):
            carpeta = salida / str(k) / str(fila)
            carpeta.mkdir(parents=True, exist_ok=True)
            for col, x in enumerate(range(0, ancho, lado)):
                indices = cuantizar(np.asarray(capa[y:y + lado, x:x + lado]), paleta, x, y)
                ruta = carpeta / f'{col}.png'
                a_imagen(indices, paleta).save(ruta, optimize=True)
                sello.update(ruta.read_bytes())
                cuenta += 1
        if avisar:
            avisar(k, cuenta)
    return sello.hexdigest()[:10], cuenta


def manifiesto(capas, paleta, sello, ancho, alto, factor, lado):
    ns = niveles(ancho, alto, factor, lado)
    medidas = [(c.shape[1], c.shape[0]) for c in capas]
    if medidas != [(n['ancho'], n['alto']) for n in ns]:
        raise ValueError(f'las capas {medidas} no casan con los niveles calculados')
    return {'ancho': ancho, 'alto': alto, 'factor': factor, 'lado': lado, 'colores': len(paleta),
            'sello': sello, 'paleta': np.asarray(paleta).tolist(), 'niveles': ns}


def construir(fuente, publico):
    fuente, publico = Path(fuente), Path(publico)
    hechas = [0]

    def avance(col, fila):
        hechas[0] += 1
        if hechas[0] % 200 == 0:
            print(f'base: {hechas[0]} teselas del escaneo', flush=True)

    base = construir_base(fuente, fuente / f'base-f{FACTOR_BASE}.npy', FACTOR_BASE, avisar=avance)
    print(f'base lista: {base.shape[1]} x {base.shape[0]}', flush=True)
    capas = piramide(base)
    paleta = paleta_del_mapa(capas, COLORES)
    print(f'paleta: {len(paleta)} colores; {len(capas)} niveles', flush=True)
    sello, cuenta = teselar(capas, paleta, publico / 'teselas',
                            avisar=lambda k, n: print(f'nivel {k} listo, van {n} teselas', flush=True))
    m = manifiesto(capas, paleta, sello, ANCHO, ALTO, FACTOR_BASE, LADO_TESELA)
    (publico / 'mapa.json').write_text(json.dumps(m, separators=(',', ':')))
    print(f'listo: {cuenta} teselas, sello {sello}', flush=True)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    construir(sys.argv[1], sys.argv[2])
```

- [ ] **Step 6: Correr y ver que pasan**

Run: `cd ~/monte && .venv/bin/pytest -q -W error`
Expected: 34 passed (26 de antes más 8).

- [ ] **Step 7: Commit**

```bash
cd ~/monte && printf 'public/teselas/\npublic/mapa.json\n' >> .gitignore && git add -A && git commit -m "feat(fabrica): base del escaneo, piramide de niveles y teselas con su manifiesto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Cámara y rejilla de teselas (lógica pura)

**Files:**
- Create: `public/visor/camara.js`, `public/visor/teselas.js`
- Test: `tests-js/camara.test.js`, `tests-js/teselas.test.js`

**Interfaces:**
- Consumes: la forma de `mapa.json` (tarea 1): `{ ancho, alto, lado, niveles: [{k, factor, ancho, alto, cols, filas}] }`.
- Produces (todo puro; `cam = { x, y, z }`, `lienzo = { ancho, alto }` en píxeles del canvas):
  - `camara.js`: `AUMENTO_MAX = 8`, `paradas(niveles) -> number[]` ascendente, `escalaMinima(mapa, lienzo)`, `asentar(z, mapa, lienzo, dir = 0)`, `siguienteParada(z, dir, mapa, lienzo)`, `nivelPara(z, niveles) -> nivel`, `aPantalla(cam, lienzo, x, y) -> [px, py]`, `aMapa(cam, lienzo, px, py) -> [x, y]`, `acercarEn(cam, z, px, py, lienzo) -> cam`, `limitar(cam, mapa, lienzo) -> cam`, `verTodo(mapa, lienzo) -> cam`.
  - `teselas.js`: `rectTesela(nivel, col, fila, lado) -> {x, y, w, h}` en píxeles del nivel, `visibles(cam, lienzo, nivel, lado) -> [{k, col, fila}]`, `crearAlmacen(urlDe, alCargar, tope = 400) -> { pedir(k, col, fila), lista(k, col, fila) }` (devuelven la imagen o `null`).

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests-js/camara.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  acercarEn, aMapa, aPantalla, asentar, escalaMinima, limitar, nivelPara, paradas, siguienteParada, verTodo,
} from '../public/visor/camara.js';

const niveles = [4, 8, 16, 32, 64, 128, 256].map((factor, k) => ({
  k, factor, ancho: Math.ceil(62079 / factor), alto: Math.ceil(62160 / factor),
  cols: Math.ceil(Math.ceil(62079 / factor) / 256), filas: Math.ceil(Math.ceil(62160 / factor) / 256),
}));
const MAPA = { ancho: 62079, alto: 62160, lado: 256, niveles };
const TELEFONO = { ancho: 1170, alto: 2532 };

test('paradas: una por nivel y los aumentos enteros del mas fino', () => {
  const p = paradas(niveles);
  assert.equal(p.length, 14);
  assert.deepEqual(p.slice(0, 7), [1 / 256, 1 / 128, 1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4]);
  assert.deepEqual(p.slice(7), [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
});

test('escalaMinima: la mayor parada en la que el mapa entero cabe', () => {
  assert.equal(escalaMinima(MAPA, TELEFONO), 1 / 64);
  assert.equal(escalaMinima(MAPA, { ancho: 100, alto: 100 }), 1 / 256);
});

test('asentar: la parada mas cercana, nunca por debajo de la minima', () => {
  assert.equal(asentar(0.02, MAPA, TELEFONO), 1 / 64);
  assert.equal(asentar(0.6, MAPA, TELEFONO), 0.5);
  assert.equal(asentar(100, MAPA, TELEFONO), 2);
  assert.equal(asentar(0.0001, MAPA, TELEFONO), 1 / 64);
});

test('asentar con direccion: un gesto corto avanza, no rebota', () => {
  assert.equal(asentar(0.27, MAPA, TELEFONO, 1), 0.5);
  assert.equal(asentar(0.24, MAPA, TELEFONO, -1), 1 / 8);
  assert.equal(asentar(0.25, MAPA, TELEFONO, 1), 0.25);
  assert.equal(asentar(0.25, MAPA, TELEFONO, -1), 0.25);
  assert.equal(asentar(5, MAPA, TELEFONO, 1), 2);
  assert.equal(asentar(0.001, MAPA, TELEFONO, -1), 1 / 64);
});

test('siguienteParada: un paso arriba o abajo, con tope', () => {
  assert.equal(siguienteParada(0.25, 1, MAPA, TELEFONO), 0.5);
  assert.equal(siguienteParada(0.25, -1, MAPA, TELEFONO), 1 / 8);
  assert.equal(siguienteParada(2, 1, MAPA, TELEFONO), 2);
  assert.equal(siguienteParada(1 / 64, -1, MAPA, TELEFONO), 1 / 64);
});

test('nivelPara: el nivel mas grueso cuyo pixel no pasa de dos en pantalla', () => {
  assert.equal(nivelPara(1 / 16, niveles).factor, 16);
  assert.equal(nivelPara(0.05, niveles).factor, 32);
  assert.equal(nivelPara(0.75, niveles).factor, 4);
  assert.equal(nivelPara(0.001, niveles).factor, 256);
});

test('aPantalla y aMapa son inversas', () => {
  const cam = { x: 30000, y: 20000, z: 0.25 };
  const [px, py] = aPantalla(cam, TELEFONO, 31000, 20400);
  assert.deepEqual([px, py], [585 + 250, 1266 + 100]);
  assert.deepEqual(aMapa(cam, TELEFONO, px, py), [31000, 20400]);
});

test('acercarEn deja quieto el punto bajo el dedo', () => {
  const cam = { x: 30000, y: 20000, z: 0.25 };
  const antes = aMapa(cam, TELEFONO, 100, 200);
  const despues = aMapa(acercarEn(cam, 0.5, 100, 200, TELEFONO), TELEFONO, 100, 200);
  assert.ok(Math.abs(antes[0] - despues[0]) < 1e-6 && Math.abs(antes[1] - despues[1]) < 1e-6);
});

test('limitar no deja salir la vista del mapa', () => {
  const c = limitar({ x: -500, y: 999999, z: 0.25 }, MAPA, TELEFONO);
  assert.equal(c.x, 1170 / 2 / 0.25);
  assert.equal(c.y, 62160 - 2532 / 2 / 0.25);
  assert.equal(c.z, 0.25);
});

test('limitar centra el mapa en el eje donde cabe entero y acota la escala', () => {
  const c = limitar({ x: 10, y: 10, z: 0.000001 }, MAPA, TELEFONO);
  assert.deepEqual(c, { x: 62079 / 2, y: 62160 / 2, z: 1 / 64 });
  assert.equal(limitar({ x: 10, y: 10, z: 50 }, MAPA, TELEFONO).z, 2);
});

test('verTodo: centrado y en la escala minima', () => {
  assert.deepEqual(verTodo(MAPA, TELEFONO), { x: 62079 / 2, y: 62160 / 2, z: 1 / 64 });
});
```

`tests-js/teselas.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectTesela, visibles } from '../public/visor/teselas.js';

const nivel = (k, factor) => {
  const ancho = Math.ceil(62079 / factor), alto = Math.ceil(62160 / factor);
  return { k, factor, ancho, alto, cols: Math.ceil(ancho / 256), filas: Math.ceil(alto / 256) };
};

test('rectTesela: las del borde miden lo que queda', () => {
  assert.deepEqual(rectTesela(nivel(0, 4), 3, 2, 256), { x: 768, y: 512, w: 256, h: 256 });
  assert.deepEqual(rectTesela(nivel(0, 4), 60, 60, 256), { x: 15360, y: 15360, w: 160, h: 180 });
});

test('visibles: el mapa entero en el telefono', () => {
  const v = visibles({ x: 62079 / 2, y: 62160 / 2, z: 1 / 64 }, { ancho: 1170, alto: 2532 }, nivel(4, 64), 256);
  assert.equal(v.length, 16);
  assert.deepEqual(v[0], { k: 4, col: 0, fila: 0 });
  assert.deepEqual(v[15], { k: 4, col: 3, fila: 3 });
});

test('visibles: solo lo que toca el lienzo', () => {
  const v = visibles({ x: 31040, y: 31080, z: 0.25 }, { ancho: 512, alto: 512 }, nivel(0, 4), 256);
  assert.equal(v.length, 9);
  assert.deepEqual([v[0].col, v[0].fila, v[8].col, v[8].fila], [29, 29, 31, 31]);
});

test('visibles: nada si la vista esta fuera del mapa', () => {
  assert.deepEqual(visibles({ x: -90000, y: 0, z: 0.25 }, { ancho: 512, alto: 512 }, nivel(0, 4), 256), []);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd ~/monte && node --test tests-js/ 2>&1 | tail -8`
Expected: FAIL con `Cannot find module` de `camara.js` y de `teselas.js`.

- [ ] **Step 3: Implementar `public/visor/camara.js`**

```js
// Camara del mapa: logica pura, sin DOM. Dos sistemas de coordenadas:
// mapa (pixeles del escaneo original) y lienzo (pixeles del canvas, origen arriba a la izquierda).
// cam = { x, y, z }: el punto del mapa que cae en el centro del lienzo y los pixeles de lienzo por pixel del escaneo.

export const AUMENTO_MAX = 8; // en el nivel mas fino, hasta 8 pixeles de lienzo por pixel del dibujo

// Las escalas de reposo, de menor a mayor: una por nivel (un pixel del dibujo = un pixel del lienzo)
// y, pasado el mas fino, sus aumentos enteros.
export function paradas(niveles) {
  const p = niveles.map(n => 1 / n.factor).sort((a, b) => a - b);
  const fina = p[p.length - 1];
  for (let n = 2; n <= AUMENTO_MAX; n++) p.push(fina * n);
  return p;
}

// La mayor parada en la que el mapa entero cabe en el lienzo; si ninguna, la mas chica.
export function escalaMinima(mapa, lienzo) {
  const cabe = Math.min(lienzo.ancho / mapa.ancho, lienzo.alto / mapa.alto);
  const ps = paradas(mapa.niveles);
  let min = ps[0];
  for (const p of ps) if (p <= cabe) min = p;
  return min;
}

// La parada donde descansa una escala. dir > 0: la primera que no quede por debajo (el gesto acercaba);
// dir < 0: la ultima que no quede por encima; dir = 0: la mas cercana.
export function asentar(z, mapa, lienzo, dir = 0) {
  const min = escalaMinima(mapa, lienzo);
  const ps = paradas(mapa.niveles).filter(p => p >= min);
  const holgura = 1.02;
  if (dir > 0) return ps.find(p => p * holgura >= z) ?? ps[ps.length - 1];
  if (dir < 0) return ps.findLast(p => p <= z * holgura) ?? ps[0];
  let mejor = ps[0], error = Infinity;
  for (const p of ps) {
    const e = Math.abs(Math.log(p / z));
    if (e < error) { error = e; mejor = p; }
  }
  return mejor;
}

export function siguienteParada(z, dir, mapa, lienzo) {
  const min = escalaMinima(mapa, lienzo);
  const ps = paradas(mapa.niveles).filter(p => p >= min);
  const i = ps.indexOf(asentar(z, mapa, lienzo));
  return ps[Math.max(0, Math.min(ps.length - 1, i + Math.sign(dir)))];
}

// El nivel con que se pinta una escala: el mas grueso cuyo pixel ocupa menos de dos en el lienzo.
// Asi nunca se achica un pixel art; entre paradas se ve el nivel grueso algo ampliado.
export function nivelPara(z, niveles) {
  const orden = [...niveles].sort((a, b) => a.factor - b.factor);
  let nivel = orden[0];
  for (const n of orden) if (z * n.factor < 2) nivel = n;
  return nivel;
}

export function aPantalla(cam, lienzo, x, y) {
  return [(x - cam.x) * cam.z + lienzo.ancho / 2, (y - cam.y) * cam.z + lienzo.alto / 2];
}

export function aMapa(cam, lienzo, px, py) {
  return [(px - lienzo.ancho / 2) / cam.z + cam.x, (py - lienzo.alto / 2) / cam.z + cam.y];
}

// Cambia la escala dejando quieto el punto del mapa que esta bajo (px, py).
export function acercarEn(cam, z, px, py, lienzo) {
  const [mx, my] = aMapa(cam, lienzo, px, py);
  return { x: mx - (px - lienzo.ancho / 2) / z, y: my - (py - lienzo.alto / 2) / z, z };
}

// Acota la escala y no deja que la vista se salga del mapa; donde el mapa cabe entero, lo centra.
export function limitar(cam, mapa, lienzo) {
  const ps = paradas(mapa.niveles);
  const z = Math.max(escalaMinima(mapa, lienzo), Math.min(ps[ps.length - 1], cam.z));
  const eje = (c, largo, vista) => {
    const media = vista / (2 * z);
    return largo * z <= vista ? largo / 2 : Math.max(media, Math.min(largo - media, c));
  };
  return { x: eje(cam.x, mapa.ancho, lienzo.ancho), y: eje(cam.y, mapa.alto, lienzo.alto), z };
}

export function verTodo(mapa, lienzo) {
  return { x: mapa.ancho / 2, y: mapa.alto / 2, z: escalaMinima(mapa, lienzo) };
}
```

- [ ] **Step 4: Implementar `public/visor/teselas.js`**

```js
// Que teselas hacen falta para una vista (puro) y el almacen que las carga y las recuerda.

// El rectangulo de una tesela en pixeles de su nivel. Las del borde miden lo que queda.
export function rectTesela(nivel, col, fila, lado) {
  const x = col * lado, y = fila * lado;
  return { x, y, w: Math.min(lado, nivel.ancho - x), h: Math.min(lado, nivel.alto - y) };
}

// Las teselas del nivel que tocan el lienzo, por filas.
export function visibles(cam, lienzo, nivel, lado) {
  const mx = lienzo.ancho / (2 * cam.z), my = lienzo.alto / (2 * cam.z), paso = nivel.factor * lado;
  const c0 = Math.max(0, Math.floor((cam.x - mx) / paso)), c1 = Math.min(nivel.cols - 1, Math.floor((cam.x + mx) / paso));
  const f0 = Math.max(0, Math.floor((cam.y - my) / paso)), f1 = Math.min(nivel.filas - 1, Math.floor((cam.y + my) / paso));
  const lista = [];
  for (let fila = f0; fila <= f1; fila++) for (let col = c0; col <= c1; col++) lista.push({ k: nivel.k, col, fila });
  return lista;
}

// Almacen de imagenes: pide cada tesela una vez, reintenta si falla y olvida las menos usadas.
export function crearAlmacen(urlDe, alCargar, tope = 400) {
  const teselas = new Map(); // clave -> { img, intentos }; el orden del Map es el de uso
  const clave = (k, col, fila) => `${k}/${fila}/${col}`;

  function cargar(c, t, k, col, fila) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { t.img = img; alCargar(); };
    img.onerror = () => {
      t.intentos++;
      if (t.intentos <= 2) setTimeout(() => cargar(c, t, k, col, fila), 1200 * t.intentos);
      // tras tres fallos se olvida: la proxima vez que haga falta se vuelve a pedir desde cero
      else setTimeout(() => { if (teselas.get(c) === t) teselas.delete(c); alCargar(); }, 8000);
    };
    img.src = urlDe(k, col, fila);
  }

  return {
    // La imagen si ya esta; si no, la pide y devuelve null.
    pedir(k, col, fila) {
      const c = clave(k, col, fila);
      let t = teselas.get(c);
      if (t) {
        teselas.delete(c);
        teselas.set(c, t);
      } else {
        t = { img: null, intentos: 0 };
        teselas.set(c, t);
        cargar(c, t, k, col, fila);
        if (teselas.size > tope) teselas.delete(teselas.keys().next().value);
      }
      return t.img;
    },
    // La imagen solo si ya esta cargada; no pide nada.
    lista(k, col, fila) {
      return teselas.get(clave(k, col, fila))?.img ?? null;
    },
  };
}
```

- [ ] **Step 5: Correr y ver que pasan**

Run: `cd ~/monte && node --test tests-js/ 2>&1 | tail -8`
Expected: `pass 15`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
cd ~/monte && git add -A && git commit -m "feat(visor): camara con paradas de escala entera y rejilla de teselas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: El mapa en el navegador

**Files:**
- Create: `public/visor/pintor.js`, `public/visor/gestos.js`, `public/visor/mapa.js`, `public/visor/principal.js`
- Create: `public/index.html`, `public/estilo.css`
- Create: `herramientas/ver-mapa.mjs`
- Modify: `public/.htaccess` (bloque de caché de scripts, estilos y datos)

**Interfaces:**
- Consumes: todo lo de la tarea 2; `mapa.json` y `teselas/{k}/{fila}/{col}.png` (tarea 1).
- Produces:
  - `pintor.js`: `pintar(g, lienzo, cam, mapa, almacen) -> { faltan, nivel, aumento }`.
  - `gestos.js`: `escuchar(el, mapa)`; usa de `mapa`: `proporcion()`, `estado()`, `mover(dx, dy)`, `escalarEn(f, px, py)`, `asentar(px, py, dir)`, `paso(dir, px, py)`, `verTodo()`.
  - `mapa.js`: `crearMapa(el, { base = '' }) -> Promise<api>` con los métodos anteriores más `alCambiar(f) -> quitar`. `estado() -> { x, y, z, k, aumento, faltan, reposo, ancho, alto }`.
  - La página deja la API en `window.mapa` y pone la clase `listo` en `<body>`.
  - `node herramientas/ver-mapa.mjs <url> [anchoxalto] [captura.png] [densidad]`: código 0 si el mapa carga, se mueve y descansa a escala entera.

- [ ] **Step 1: `public/visor/pintor.js`**

```js
// Dibuja un cuadro: las teselas del nivel que toca, en pixeles enteros y sin suavizado.
import { nivelPara } from './camara.js';
import { rectTesela, visibles } from './teselas.js';

const FONDO = '#0f1620';

export function pintar(g, lienzo, cam, mapa, almacen) {
  g.imageSmoothingEnabled = false;
  g.fillStyle = FONDO;
  g.fillRect(0, 0, lienzo.ancho, lienzo.alto);
  const nivel = nivelPara(cam.z, mapa.niveles), s = cam.z * nivel.factor;
  // la esquina del lienzo en pixeles de pantalla del mapa, redondeada: todo lo demas se mide desde ahi
  const ox = Math.round(cam.x * cam.z - lienzo.ancho / 2), oy = Math.round(cam.y * cam.z - lienzo.alto / 2);
  // la tesela mas gruesa cubre el mapa entero: se mantiene siempre a mano como respaldo
  const grueso = mapa.niveles[mapa.niveles.length - 1];
  almacen.pedir(grueso.k, 0, 0);
  let faltan = 0;
  for (const t of visibles(cam, lienzo, nivel, mapa.lado)) {
    const r = rectTesela(nivel, t.col, t.fila, mapa.lado);
    const x0 = Math.round(r.x * s) - ox, y0 = Math.round(r.y * s) - oy;
    const ancho = Math.round((r.x + r.w) * s) - ox - x0, alto = Math.round((r.y + r.h) * s) - oy - y0;
    const img = almacen.pedir(nivel.k, t.col, t.fila);
    if (img) {
      g.drawImage(img, x0, y0, ancho, alto);
      continue;
    }
    faltan++;
    // mientras llega, la misma zona tomada del nivel mas fino que ya este cargado por encima
    for (const otro of mapa.niveles) {
      if (otro.factor <= nivel.factor) continue;
      const d = otro.factor / nivel.factor;
      const col = Math.floor(r.x / d / mapa.lado), fila = Math.floor(r.y / d / mapa.lado);
      const respaldo = almacen.lista(otro.k, col, fila);
      if (!respaldo) continue;
      g.drawImage(respaldo, r.x / d - col * mapa.lado, r.y / d - fila * mapa.lado, r.w / d, r.h / d, x0, y0, ancho, alto);
      break;
    }
  }
  return { faltan, nivel, aumento: s };
}
```

- [ ] **Step 2: `public/visor/gestos.js`**

```js
// Traduce puntero, rueda y teclado en ordenes al mapa. Las distancias salen en pixeles del lienzo.
export function escuchar(el, mapa) {
  const dedos = new Map(); // id del puntero -> [x, y] en pixeles del lienzo
  let movido = 0, zInicial = 0, toque = { t: 0, x: 0, y: 0 };
  let rueda = 0, ultimaRueda = 0;

  const pos = e => {
    const r = el.getBoundingClientRect(), k = mapa.proporcion();
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
  };
  const par = () => {
    const [a, b] = [...dedos.values()];
    return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
  };

  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    dedos.set(e.pointerId, pos(e));
    if (dedos.size === 1) { movido = 0; zInicial = mapa.estado().z; }
  });

  el.addEventListener('pointermove', e => {
    if (!dedos.has(e.pointerId)) return;
    const antes = dedos.get(e.pointerId), ahora = pos(e);
    if (dedos.size === 1) {
      dedos.set(e.pointerId, ahora);
      movido += Math.abs(ahora[0] - antes[0]) + Math.abs(ahora[1] - antes[1]);
      mapa.mover(ahora[0] - antes[0], ahora[1] - antes[1]);
    } else if (dedos.size === 2) {
      const a = par();
      dedos.set(e.pointerId, ahora);
      const b = par();
      movido = Infinity;
      mapa.mover(b.x - a.x, b.y - a.y);
      if (a.d > 0) mapa.escalarEn(b.d / a.d, b.x, b.y);
    }
  });

  const soltar = e => {
    if (!dedos.has(e.pointerId)) return;
    const [x, y] = dedos.get(e.pointerId);
    dedos.delete(e.pointerId);
    if (dedos.size) return;
    const ahora = performance.now(), umbral = 12 * mapa.proporcion();
    if (e.type === 'pointerup' && movido < umbral) {
      // dos toques seguidos en el mismo sitio: acercar ahi
      if (ahora - toque.t < 320 && Math.hypot(x - toque.x, y - toque.y) < 3 * umbral) {
        toque.t = 0;
        mapa.paso(1, x, y);
        return;
      }
      toque = { t: ahora, x, y };
    }
    // un pellizco corto avanza hacia donde iba, no rebota a la parada de la que salio
    const z = mapa.estado().z, cambio = z / zInicial;
    mapa.asentar(x, y, cambio > 1.08 ? 1 : cambio < 0.92 ? -1 : 0);
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);

  // la rueda va por pasos: cada tramo de giro lleva a la parada siguiente
  el.addEventListener('wheel', e => {
    e.preventDefault();
    const ahora = performance.now();
    if (ahora - ultimaRueda < 220) return;
    rueda += e.deltaY * (e.deltaMode ? 30 : 1);
    if (Math.abs(rueda) < 50) return;
    const [x, y] = pos(e);
    mapa.paso(rueda < 0 ? 1 : -1, x, y);
    rueda = 0;
    ultimaRueda = ahora;
  }, { passive: false });

  el.addEventListener('keydown', e => {
    const p = 96 * mapa.proporcion();
    const flechas = { ArrowLeft: [p, 0], ArrowRight: [-p, 0], ArrowUp: [0, p], ArrowDown: [0, -p] };
    if (flechas[e.key]) { mapa.mover(...flechas[e.key]); mapa.asentar(); }
    else if (e.key === '+' || e.key === '=') mapa.paso(1);
    else if (e.key === '-' || e.key === '_') mapa.paso(-1);
    else if (e.key === '0') mapa.verTodo();
    else return;
    e.preventDefault();
  });
}
```

- [ ] **Step 3: `public/visor/mapa.js`**

```js
// El mapa: une camara, teselas, pintor y gestos, y expone la API que usa el resto de la pagina.
import { acercarEn, asentar, limitar, siguienteParada, verTodo } from './camara.js';
import { escuchar } from './gestos.js';
import { pintar } from './pintor.js';
import { crearAlmacen } from './teselas.js';

const DENSIDAD_MAX = 3; // tope de pixeles del lienzo por pixel CSS: cuida a los telefonos modestos

export async function crearMapa(el, { base = '' } = {}) {
  const resp = await fetch(`${base}mapa.json`, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`mapa.json respondio ${resp.status}`);
  const mapa = await resp.json();

  const g = el.getContext('2d', { alpha: false });
  const lienzo = { ancho: 0, alto: 0 };
  const oyentes = new Set();
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  let cam = { x: mapa.ancho / 2, y: mapa.alto / 2, z: 1 };
  let ultimo = { faltan: 0, nivel: mapa.niveles[0], aumento: 1 };
  let pendiente = 0, animacion = 0, reposo = true;

  const almacen = crearAlmacen((k, col, fila) => `${base}teselas/${k}/${fila}/${col}.png?v=${mapa.sello}`, pedirCuadro);

  function estado() {
    return { ...cam, k: ultimo.nivel.k, aumento: ultimo.aumento, faltan: ultimo.faltan, reposo, ancho: lienzo.ancho, alto: lienzo.alto };
  }
  function pedirCuadro() {
    if (!pendiente) pendiente = requestAnimationFrame(cuadro);
  }
  function cuadro() {
    pendiente = 0;
    if (!lienzo.ancho) return;
    ultimo = pintar(g, lienzo, cam, mapa, almacen);
    for (const f of oyentes) f(estado());
  }
  function poner(nueva) {
    cam = limitar(nueva, mapa, lienzo);
    pedirCuadro();
  }
  function detener() {
    cancelAnimationFrame(animacion);
    animacion = 0;
  }

  // Lleva la escala a zFinal dejando quieto el punto bajo (px, py). Al terminar, el mapa descansa.
  function animar(zFinal, px, py, ms = 180) {
    detener();
    const inicio = cam, t0 = performance.now();
    if (zFinal === cam.z) { reposo = true; pedirCuadro(); return; }
    reposo = false;
    const paso = ahora => {
      const t = quieto.matches ? 1 : Math.min(1, (ahora - t0) / ms), suave = t * (2 - t);
      const z = t === 1 ? zFinal : inicio.z * Math.pow(zFinal / inicio.z, suave);
      poner(acercarEn(inicio, z, px, py, lienzo));
      if (t < 1) animacion = requestAnimationFrame(paso);
      else { animacion = 0; reposo = true; }
    };
    animacion = requestAnimationFrame(paso);
  }

  function medir() {
    const d = Math.min(window.devicePixelRatio || 1, DENSIDAD_MAX);
    const ancho = Math.max(1, Math.round(el.clientWidth * d)), alto = Math.max(1, Math.round(el.clientHeight * d));
    if (ancho === lienzo.ancho && alto === lienzo.alto) return;
    const primera = !lienzo.ancho;
    el.width = lienzo.ancho = ancho;
    el.height = lienzo.alto = alto;
    detener();
    // al cambiar de tamano la escala vuelve a una parada valida para el lienzo nuevo
    cam = primera ? verTodo(mapa, lienzo) : limitar({ ...cam, z: asentar(cam.z, mapa, lienzo) }, mapa, lienzo);
    reposo = true;
    pedirCuadro();
  }

  const centro = () => [lienzo.ancho / 2, lienzo.alto / 2];
  const api = {
    estado,
    proporcion: () => lienzo.ancho / (el.clientWidth || 1),
    mover(dx, dy) {
      detener();
      reposo = false;
      poner({ ...cam, x: cam.x - dx / cam.z, y: cam.y - dy / cam.z });
    },
    escalarEn(f, px, py) {
      detener();
      reposo = false;
      poner(acercarEn(cam, cam.z * f, px, py, lienzo));
    },
    asentar(px = centro()[0], py = centro()[1], dir = 0) {
      animar(asentar(cam.z, mapa, lienzo, dir), px, py);
    },
    paso(dir, px = centro()[0], py = centro()[1]) {
      animar(siguienteParada(cam.z, dir, mapa, lienzo), px, py);
    },
    verTodo() {
      animar(verTodo(mapa, lienzo).z, ...centro(), 260);
    },
    alCambiar(f) {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
  };

  new ResizeObserver(medir).observe(el);
  medir();
  escuchar(el, api);
  return api;
}
```

- [ ] **Step 4: `public/visor/principal.js`, `public/index.html`, `public/estilo.css`**

`public/visor/principal.js`:

```js
import { crearMapa } from './mapa.js';

const el = document.getElementById('mapa'), aviso = document.getElementById('aviso');
try {
  const mapa = await crearMapa(el);
  window.mapa = mapa;
  document.getElementById('acercar').addEventListener('click', () => mapa.paso(1));
  document.getElementById('alejar').addEventListener('click', () => mapa.paso(-1));
  document.getElementById('todo').addEventListener('click', () => mapa.verTodo());
  document.body.classList.add('listo');
} catch (e) {
  console.error(e);
  aviso.textContent = 'No se pudo cargar el mapa. Revise su conexión y recargue la página.';
  aviso.hidden = false;
}
```

`public/index.html`:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0f1620">
<title>Monte: el planisferio de 1587 en pixel art</title>
<meta name="description" content="El planisferio de Urbano Monte (Milán, 1587), el mapa del mundo más grande del siglo XVI, convertido en pixel art para recorrerlo con el dedo.">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="estilo.css">
</head>
<body>
<canvas id="mapa" tabindex="0" role="application"
  aria-label="Planisferio de Urbano Monte, 1587. Arrastre para moverse. Teclas más y menos para el zoom, flechas para moverse y cero para ver todo."></canvas>
<div class="controles" role="group" aria-label="Zoom">
  <button id="acercar" type="button" aria-label="Acercar">+</button>
  <button id="alejar" type="button" aria-label="Alejar">&minus;</button>
  <button id="todo" type="button" aria-label="Ver el mapa completo">Todo</button>
</div>
<p class="credito">Urbano Monte, 1587 &middot; David Rumsey Map Collection, Stanford &middot; CC BY-NC-SA 3.0</p>
<p id="aviso" class="aviso" role="alert" hidden></p>
<noscript><p class="aviso">Este mapa necesita JavaScript para funcionar.</p></noscript>
<script type="module" src="visor/principal.js"></script>
</body>
</html>
```

`public/estilo.css`:

```css
:root { color-scheme: dark; --fondo: #0f1620; --papel: #e9dfc4; --tinta: #c9bd9b; --acento: #5ed29c; }
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; overflow: hidden; overscroll-behavior: none; background: var(--fondo); }
body { font: 15px/1.4 system-ui, sans-serif; color: var(--papel); }
#mapa {
  position: fixed; inset: 0; width: 100%; height: 100%; display: block;
  touch-action: none; cursor: grab; outline: none;
  image-rendering: crisp-edges; image-rendering: pixelated;
}
#mapa:active { cursor: grabbing; }
#mapa:focus-visible { box-shadow: inset 0 0 0 3px var(--acento); }
.controles {
  position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: 8px;
}
.controles button {
  min-width: 48px; height: 48px; padding: 0 10px; border: 2px solid var(--papel); border-radius: 0;
  background: var(--fondo); color: var(--papel); font: 700 18px/1 ui-monospace, monospace; cursor: pointer;
}
.controles button:hover, .controles button:focus-visible { background: var(--papel); color: var(--fondo); outline: none; }
.credito {
  position: fixed; left: max(12px, env(safe-area-inset-left)); bottom: max(12px, env(safe-area-inset-bottom));
  max-width: calc(100% - 96px); margin: 0; padding: 4px 8px; background: rgb(15 22 32 / .82);
  font-size: 11px; color: var(--tinta); pointer-events: none;
}
.aviso {
  position: fixed; inset: 0; margin: auto; width: min(90%, 420px); height: fit-content; padding: 16px;
  background: var(--fondo); border: 2px solid var(--papel); text-align: center;
}
```

- [ ] **Step 5: Caché de scripts, estilos y datos**

En `public/.htaccess`, dentro del bloque `<IfModule mod_expires.c>`, debajo de la línea de `text/html`, agregar:

```apache
  # los modulos se importan entre si sin sello: se revalidan siempre. Las teselas si llevan sello.
  ExpiresByType application/javascript "access plus 0 seconds"
  ExpiresByType text/javascript "access plus 0 seconds"
  ExpiresByType text/css "access plus 0 seconds"
  ExpiresByType application/json "access plus 0 seconds"
```

y en el bloque `<IfModule mod_headers.c>`, cambiar `<FilesMatch "\.html$">` por `<FilesMatch "\.(html|js|css|json)$">`.

- [ ] **Step 6: `herramientas/ver-mapa.mjs`**

```js
// Abre el mapa en Chromium headless y comprueba que carga, se mueve y descansa a escala entera.
//   node herramientas/ver-mapa.mjs <url> [anchoxalto] [captura.png] [densidad]
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const RUTA_CHROME = 'chrome-linux64/chrome';
const [url, tam = '390x844', captura = 'capturas/mapa.png', densidad] = process.argv.slice(2);
if (!url) { console.error('uso: node herramientas/ver-mapa.mjs <url> [anchoxalto] [captura.png] [densidad]'); process.exit(2); }
const [width, height] = tam.split('x').map(Number), movil = width < 600;

const cache = join(homedir(), '.cache/ms-playwright');
const carpeta = readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => a.split('-')[1] - b.split('-')[1]).pop();
const navegador = await chromium.launch({ executablePath: join(cache, carpeta, RUTA_CHROME) });
const contexto = await navegador.newContext({
  viewport: { width, height }, deviceScaleFactor: Number(densidad) || (movil ? 3 : 1), hasTouch: movil, isMobile: movil,
});
const pagina = await contexto.newPage();
const fallas = [], cortadas = new Set();
pagina.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fallas.push(`consola: ${m.text()}`); });
pagina.on('pageerror', e => fallas.push(`error: ${e.message}`));
// la primera descarga de una de cada cinco teselas se corta: el mapa tiene que reponerse solo
await pagina.route('**/teselas/**', ruta => {
  const u = ruta.request().url(), n = Number(u.match(/(\d+)\.png/)[1]);
  if (n % 5 === 1 && !cortadas.has(u)) { cortadas.add(u); return ruta.abort(); }
  return ruta.continue();
});

const estado = () => pagina.evaluate(() => window.mapa.estado());
const descansar = async () => {
  await pagina.waitForFunction(() => { const e = window.mapa?.estado(); return e && e.reposo && e.faltan === 0; }, null, { timeout: 30000 });
  return estado();
};
const colores = () => pagina.evaluate(() => {
  const c = document.getElementById('mapa'), g = c.getContext('2d'), vistos = new Set();
  for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) {
    const d = g.getImageData(Math.floor(c.width * i / 20), Math.floor(c.height * j / 20), 1, 1).data;
    vistos.add(`${d[0]},${d[1]},${d[2]}`);
  }
  return vistos.size;
});
const revisar = (e, que) => {
  if (!Number.isInteger(e.aumento)) fallas.push(`${que}: aumento ${e.aumento}, no entero`);
};

try {
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForSelector('body.listo', { timeout: 15000 });
  const inicio = await descansar();
  revisar(inicio, 'al abrir');
  if (await colores() < 8) fallas.push('al abrir: el lienzo esta casi vacio');
  if (inicio.ancho !== Math.round(width * Math.min(Number(densidad) || (movil ? 3 : 1), 3))) fallas.push(`el lienzo mide ${inicio.ancho} de ancho`);

  // acercar tres veces con el boton
  for (let i = 0; i < 3; i++) { await pagina.click('#acercar'); await descansar(); }
  const cerca = await descansar();
  revisar(cerca, 'tras acercar');
  if (!(cerca.z > inicio.z * 7)) fallas.push(`acercar tres veces: de ${inicio.z} a ${cerca.z}`);
  if (await colores() < 8) fallas.push('tras acercar: el lienzo esta casi vacio');

  // arrastrar
  await pagina.mouse.move(width / 2, height / 2);
  await pagina.mouse.down();
  await pagina.mouse.move(width / 2 - 120, height / 2 - 80, { steps: 6 });
  await pagina.mouse.up();
  const movido = await descansar();
  revisar(movido, 'tras arrastrar');
  if (!(movido.x > cerca.x && movido.y > cerca.y)) fallas.push('arrastrar no movio el mapa');
  if (movido.z !== cerca.z) fallas.push('arrastrar cambio la escala');

  // rueda: un paso acerca una parada
  await pagina.mouse.wheel(0, -120);
  await pagina.waitForTimeout(400);
  const rueda = await descansar();
  revisar(rueda, 'tras la rueda');
  if (!(rueda.z > movido.z)) fallas.push(`un paso de rueda no acerco: ${movido.z} -> ${rueda.z}`);

  // pellizco corto con dos dedos: debe avanzar a la parada siguiente
  if (movil) {
    const cdp = await contexto.newCDPSession(pagina);
    const dedos = sep => [{ x: width / 2 - sep, y: height / 2, id: 1 }, { x: width / 2 + sep, y: height / 2, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: dedos(40) });
    for (const sep of [44, 48, 52, 56]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: dedos(sep) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pagina.waitForTimeout(400);
    const pellizco = await descansar();
    revisar(pellizco, 'tras el pellizco');
    if (!(pellizco.z > rueda.z)) fallas.push(`un pellizco corto no avanzo: ${rueda.z} -> ${pellizco.z}`);
  }

  // cambiar el tamano del lienzo (girar el telefono, ventana mas chica)
  await pagina.setViewportSize({ width: height, height: width });
  await pagina.waitForTimeout(300);
  revisar(await descansar(), 'tras girar');
  await pagina.setViewportSize({ width, height });
  await pagina.waitForTimeout(300);

  // tecla 0: volver a ver todo
  await pagina.focus('#mapa');
  await pagina.keyboard.press('0');
  await pagina.waitForTimeout(500);
  const todo = await descansar();
  revisar(todo, 'tras ver todo');
  if (todo.z !== inicio.z) fallas.push(`ver todo dejo la escala en ${todo.z}, no en ${inicio.z}`);

  const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (desborde > 0) fallas.push(`la pagina se desborda ${desborde}px`);
  if (!cortadas.size) fallas.push('no se corto ninguna tesela: la prueba de reposicion no corrio');
  mkdirSync(dirname(captura), { recursive: true });
  await pagina.screenshot({ path: captura });
  console.log(`${url} a ${tam}: abre en 1/${1 / inicio.z}, llego a ${rueda.z}, ${cortadas.size} teselas cortadas y repuestas`);
} catch (e) {
  fallas.push(`la revision no termino: ${e.message.split('\n')[0]}`);
  mkdirSync(dirname(captura), { recursive: true });
  await pagina.screenshot({ path: captura }).catch(() => {});
}
await navegador.close();
if (fallas.length) { console.error(fallas.join('\n')); process.exit(1); }
console.log('sin fallas');
```

- [ ] **Step 7: Generar las teselas del mapa entero**

Requiere la descarga completa y verificada:

```bash
cd ~/monte && .venv/bin/python -m fabrica.descargar ~/monte-fuente --verificar
nohup .venv/bin/python -m fabrica.teselar ~/monte-fuente public > ~/monte-fuente/teselar.log 2>&1 &
```

Expected: `completo: 1681 teselas con su medida`. El log termina en `listo: 5023 teselas, sello <10 hex>` (61×61 + 31×31 + 16×16 + 8×8 + 4×4 + 2×2 + 1 = 5023). Tarda varios minutos.

- [ ] **Step 8: Verificar en local**

```bash
cd ~/monte && node --test tests-js/ 2>&1 | grep -E '^# (pass|fail)'
(python3 -m http.server 8137 --bind 127.0.0.1 -d public >/dev/null 2>&1 & echo $! > capturas/http.pid); sleep 1
node herramientas/ver-mapa.mjs http://127.0.0.1:8137/ 390x844 capturas/mapa-movil.png
node herramientas/ver-mapa.mjs http://127.0.0.1:8137/ 390x844 capturas/mapa-movil-2.png 2
node herramientas/ver-mapa.mjs http://127.0.0.1:8137/ 412x915 capturas/mapa-movil-2625.png 2.625
node herramientas/ver-mapa.mjs http://127.0.0.1:8137/ 1280x800 capturas/mapa-escritorio.png
kill "$(cat capturas/http.pid)"
```

Expected: `# pass 15`, `# fail 0` y `sin fallas` cuatro veces. Después, abrir `capturas/mapa-movil.png` y `capturas/mapa-escritorio.png` con la herramienta de lectura de imágenes: el planisferio entero, centrado, con los botones y el crédito sin taparse.

- [ ] **Step 9: Commit**

```bash
cd ~/monte && .venv/bin/pytest -q && git add -A && git commit -m "feat(visor): el mapa navegable con arrastre, pellizco, rueda, teclado y botones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Publicar

**Files:**
- Modify: ninguno del repositorio.

**Interfaces:**
- Consumes: `./publicar.sh`, `herramientas/ver-mapa.mjs`, `herramientas/ver.mjs`.
- Produces: `https://monte.neracosu.com/` respondiendo `200` con el mapa navegable.

- [ ] **Step 1: Publicar y verificar por el dominio público**

```bash
cd ~/monte && ./publicar.sh
curl -s -o /dev/null -w '%{http_code}\n' https://monte.neracosu.com/
curl -s -o /dev/null -w '%{http_code}\n' https://monte.neracosu.com/mapa.json
curl -sI https://monte.neracosu.com/visor/mapa.js | grep -i cache-control
curl -sI "https://monte.neracosu.com/teselas/6/0/0.png" | grep -iE '^HTTP|cache-control|expires'
node herramientas/ver-mapa.mjs https://monte.neracosu.com/ 390x844 capturas/pub-mapa-movil.png
node herramientas/ver-mapa.mjs https://monte.neracosu.com/ 1280x800 capturas/pub-mapa-escritorio.png
node herramientas/ver.mjs https://monte.neracosu.com/prueba/index.html 390x844 capturas/pub-prueba.png
curl -s -o /dev/null -w '%{http_code}\n' https://neracosu.com/
stat -c '%U:%G %a' ~/public_html/monte.neracosu.com
```

Expected: `200`, `200`, `Cache-Control: no-cache` en el script, la tesela con `200` y caducidad larga, `sin fallas` tres veces, `200` y `neracosu:nobody 750`.

- [ ] **Step 2: Subir y actualizar la memoria**

```bash
cd ~/monte && git push origin main
```

Actualizar `~/.claude/projects/-home-neracosu-public-html/memory/project_monte.md` (párrafo de estado) y su línea en `MEMORY.md`: etapa 2a publicada, sello de las teselas y lo que sigue (2b).
