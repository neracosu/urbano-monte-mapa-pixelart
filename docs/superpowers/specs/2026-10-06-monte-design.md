# Monte — el planisferio de Urbano Monte (1587) en pixel art navegable

Especificación de diseño. Aprobada en conversación el 2026-10-06.
Destino: `monte.neracosu.com`, repositorio propio.

## 1. Propósito

Recrear el planisferio manuscrito de Urbano Monte (Milán, 1587) como un mapa web
navegable, con zoom, en pixel art de aire nostálgico (16 bits), para despertar el
interés de los más jóvenes por el mapa y su época.

El proyecto se presenta la semana del 12 de octubre de 2026 ante un publico
exigente en historia. La presentación es en español.

### Criterios de éxito

1. **Fidelidad**: el pixel art es el mapa de Monte, no una reinterpretación. Cada
   costa, texto y figura está donde Monte la puso, y se puede comprobar contra el
   original desde la propia página.
2. **Atractivo**: cada criatura del mapa está animada y se puede tocar; hay un
   bestiario para coleccionar que da motivo para recorrer el mapa entero.
3. **Rigor**: ninguna ficha afirma algo que no tenga fuente. Los créditos y la
   licencia están a la vista.
4. **Móvil primero**: se usa con comodidad en un teléfono a 390 px de ancho.
5. **Demostración sin fallas**: carga rápida, sin errores en consola, sin
   criaturas dobles ni teselas con costuras.

### Dicho por el dueño / supuesto

- Dicho: mapa navegable con zoom, idéntico al original en pixel art HD nostálgico;
  todas las criaturas animadas e interactivas; animación mixta; bestiario para
  coleccionar; uso fácil en móvil; `monte.neracosu.com`; motor propio en canvas;
  prueba visual como primer paso; presentación la próxima semana, en español, ante
  un historiador.
- Supuesto: gratuito y sin publicidad; fecha de trabajo el lunes 12 de octubre
  (peor caso); nombre del proyecto «Monte» mientras no se elija otro.

## 2. La fuente

- Compuesto de las 60 hojas ensamblado por Brandon Rumsey, David Rumsey Map
  Collection (Stanford). Ficha: `RUMSEY~8~1~303661~90074314`.
- Servidor IIIF verificado el 2026-10-06:
  `https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~303661~90074314/info.json`
  — 62.079 × 62.160 px, teselas de 1.536 px, factores de escala 1 a 128, formatos
  jpg y png, admite región por píxel.
- Estructura del mapa: proyección azimutal polar norte; cinco anillos de 4, 8, 12,
  18 y 18 hojas, más 4 hojas de esquina.
- Licencia de la colección: CC BY-NC-SA 3.0. Obras derivadas permitidas con
  atribución, sin uso comercial y con la misma licencia.

### Por confirmar al empezar

- Si el compuesto incluye las 4 hojas de esquina o vienen en fichas aparte.
- El límite de cada hoja dentro del compuesto (hace falta para la entrada animada
  y para decir en qué hoja está cada criatura).

## 3. Arquitectura

Sitio estático: HTML, CSS y módulos ES sin dependencias ni paso de compilación.
Apache lo sirve directo; no hay proceso en PM2.

Dos mitades que no se conocen entre sí salvo por archivos:

- **La fábrica** (`fabrica/`, Python, corre en el servidor, fuera del docroot):
  convierte el escaneo en teselas, recortes de criaturas y datos.
- **El visor** (`public/`, navegador): pinta el mapa, anima las criaturas y lleva
  el bestiario.

### 3.1 El visor

Tres capas sobre la misma cámara:

1. **Teselas** del mapa, en un lienzo a escala entera sin suavizado.
2. **Criaturas** animadas, en el mismo lienzo de píxeles; solo las visibles.
3. **Lienzo nítido** encima: etiquetas, indicadores y lo que deba leerse siempre
   bien. La ficha y el álbum son HTML normal.

Unidades, cada una con un solo propósito:

| Módulo | Qué hace | Depende de |
|---|---|---|
| `camara.js` | Posición, zoom y giro; convierte entre mapa y pantalla; asienta el zoom en escala entera. Lógica pura, sin DOM. | nada |
| `gestos.js` | Traduce puntero, pellizco, rueda y teclado en órdenes a la cámara. | `camara` |
| `teselas.js` | Decide qué teselas hacen falta, las carga, las guarda en caché y las descarta. | `camara` |
| `criaturas.js` | Carga el inventario; calcula el cuadro de animación de cada criatura visible. | datos |
| `pintor.js` | Dibuja teselas y criaturas en el lienzo de píxeles, y el lienzo nítido. | los tres anteriores |
| `mapa.js` | API pública: `pick(x, y)`, `screenOf(id)`, `volarA(id)`, `girar()`. | todo lo anterior |
| `bestiario.js` | Progreso, álbum y contador. Lógica pura con almacenamiento inyectado. | datos |
| `ficha.js` | Panel inferior con la ficha de una criatura. | `bestiario`, `mapa` |
| `entrada.js` | Secuencia de las 60 hojas armándose. | `pintor` |
| `original.js` | «Ver el original»: pide a IIIF la región en pantalla. | `camara` |

El bestiario, la ficha y un futuro recorrido guiado solo hablan con `mapa.js`.

### 3.2 Zoom y escala entera

- Cada nivel de zoom es su propio pixel art, generado desde el escaneo original.
  No se encoge un pixel art ya hecho.
- Mientras se pellizca, el zoom es continuo y se estira lo que hay en pantalla. Al
  soltar, se asienta en la escala entera más cercana con una transición corta.
- En reposo, un píxel del dibujo ocupa siempre un número entero de píxeles de
  pantalla. Tope de densidad de pantalla: 3.
- Giro en cuartos de vuelta, con animación. A 90° los píxeles siguen exactos.

### 3.3 La fábrica

1. **Descarga** (`descargar.py`): las 1.681 teselas a resolución completa, de una
   en una, con pausa entre pedidos y reanudable. Destino: `~/monte-fuente/`, fuera
   del docroot y del repositorio. Verifica cantidad y dimensiones totales.
2. **Paleta** (`paleta.py`): colores extraídos del propio mapa. El número de
   colores se fija en la prueba visual.
3. **Pixelado** (`pixelar.py`): por nivel, reduce desde el original y cuantiza a la
   paleta con tramado ordenado (depende solo de la posición del píxel: sin
   costuras y repetible).
4. **Teselas** (`teselar.py`): PNG de paleta indexada, `teselas/{nivel}/{fila}/{col}.png`.
5. **Criaturas** (`recortar.py`): por cada entrada del inventario, recorta la
   silueta, la pixela con la misma paleta y rellena su hueco en las teselas con la
   textura vecina.
6. **Manifiesto** (`manifiesto.py`): `mapa.json` con niveles, tamaños, paleta,
   límites de hojas y sello de versión.

Entorno Python propio (`venv`) dentro del repositorio; no se instala nada global.

### 3.4 Datos de una criatura

`datos/criaturas.json`, una entrada por criatura:

- `id`, `nombre`, `tipo` (marina, terrestre, mítica, nave, personaje)
- `hoja`: número de tavola de Monte
- `caja`: rectángulo en coordenadas del escaneo original
- `silueta`: polígono de recorte, mismas coordenadas
- `partes`: lista opcional de partes móviles con su punto de giro
- `animacion`: combinación del catálogo — `flotar`, `ondular`, `mecer`,
  `parpadear`, `boca`, `chorro`, `brillo`
- `fondo`: `rellenado` o `intacto` (si el relleno no convenció)
- `ficha`: `nivel` (`documentada` o `descriptiva`), `texto`, `cita_monte`
  (italiano), `traduccion`, `fuentes`
- `estrella`: reservado para la etapa de sprites redibujados

Las coordenadas van siempre en píxeles del escaneo original, para que no dependan
del tamaño de píxel elegido.

## 4. Experiencia

### Entrada

Las 60 hojas se arman anillo por anillo (4, 8, 12, 18, 18) hasta formar el
planisferio. Pocos segundos, se salta con un toque, no se repite en la segunda
visita y con «menos movimiento» se muestra el mapa ya armado.

### Mapa

Pantalla completa. Controles: contador del bestiario, acercar, alejar, «ver todo»,
girar y «ver el original». Arrastrar con un dedo, pellizcar, doble toque para
acercar; rueda y teclado en escritorio. La página no se desplaza por accidente.

### Ver el original

Al mantener presionado el control, la zona en pantalla se sustituye por el escaneo
real pedido a IIIF. Si Rumsey no responde, el control avisa y enlaza a la ficha de
la colección; el resto del mapa no se ve afectado.

### Bestiario

- Tocar una criatura abre su ficha en un panel inferior que se cierra deslizando.
  El área sensible es mayor que el dibujo cuando la criatura se ve pequeña.
- Álbum con todas las criaturas; las no descubiertas, en silueta. Contador
  «descubiertas de total», siempre con el total real del inventario.
- Progreso en `localStorage`, con lectura y escritura protegidas: si falla, el
  mapa funciona y el álbum simplemente no recuerda.
- Enlace propio por criatura (`#criatura=<id>`): al abrirlo, la cámara vuela hasta
  ella.

### Fichas

Dos niveles, visibles como tales para quien lee:

- **Documentada**: qué es, qué se creía en 1587, cita de Monte con traducción
  marcada como propia, y fuentes.
- **Descriptiva**: qué se ve y en qué hoja está, sin interpretar.

Fuentes admitidas: el catálogo de la colección Rumsey, el ensayo de Katherine
Parker («A Mind at Work») y el texto del propio mapa. Voz de usted, español de
Venezuela llano. El dueño revisa todas las fichas antes de publicar.

### Créditos

Página propia: Urbano Monte; David Rumsey Map Collection, Stanford; ensamblaje de
Brandon Rumsey; Katherine Parker; licencia CC BY-NC-SA 3.0 para las imágenes
derivadas; enlace a la ficha original.

### Accesibilidad

Navegable con teclado, respeta `prefers-reduced-motion`, las fichas y el álbum son
HTML legible por lector de pantalla, contraste suficiente en el texto nítido.

## 5. Fallas previstas

| Qué puede fallar | Qué hace el sitio |
|---|---|
| Una tesela no carga | Reintenta; mientras tanto muestra la del nivel anterior estirada |
| `localStorage` bloqueado | El bestiario funciona sin recordar |
| IIIF de Rumsey caído | «Ver el original» avisa y enlaza; nada más cambia |
| El relleno del fondo se nota | Esa criatura pasa a `fondo: intacto` y usa una animación que no la desplaza |
| Teléfono modesto | Solo se animan las criaturas visibles; tope de densidad 3 |
| Inventario muy grande para el plazo | Se animan primero las más visibles; el contador dice el total real |

## 6. Pruebas

- **Fábrica**: el mismo escaneo produce las mismas teselas byte a byte; los bordes
  de teselas vecinas coinciden; el inventario cumple su esquema y ninguna criatura
  queda sin recorte, animación o ficha.
- **Visor** (`node --test`, lógica pura): conversiones de la cámara, asentado en
  escala entera, selección de teselas visibles, `pick`, progreso del bestiario con
  y sin almacenamiento.
- **Navegador real** (headless): a 390 px y en escritorio — entrada, arrastre,
  pellizco, giro, abrir ficha, álbum, enlace a una criatura, «ver el original», y
  consola sin errores.
- **Publicación**: `200` por `https://monte.neracosu.com/`.

## 7. Publicación

- Subdominio `monte.neracosu.com` creado con las herramientas de cPanel, con aviso
  previo al dueño. El directorio raíz del docroot conserva el grupo `nobody`.
- HTML sin caché; scripts y estilos con sello de versión; teselas con caché larga
  y el sello del manifiesto en la ruta.
- Repositorio propio. El escaneo descargado no entra al repositorio.
- Comentarios en el código sin acentos; texto visible en español de Venezuela.

## 8. Etapas

1. **Prueba visual**: tres zonas (costa con texto, monstruo marino, retrato) en
   tres o cuatro combinaciones de tamaño de píxel y paleta, más una criatura
   completa recortada, borrada del fondo y animada. El dueño elige.
2. **Mapa navegable**: fábrica completa, visor, entrada, giro, «ver el original»,
   créditos.
3. **Criaturas y bestiario**: inventario revisado por el dueño, recortes,
   animaciones de catálogo, fichas en dos niveles, álbum.
4. **Estrellas redibujadas**: después de la presentación.

Congelamiento dos días antes de la presentación: desde ahí, solo correcciones.

## 9. Fuera de alcance

- Sprites redibujados cuadro por cuadro (etapa 4, posterior).
- Recorrido guiado.
- Versión en inglés u otros idiomas.
- Cuentas de usuario, servidor propio o base de datos.
- Cambio de proyección cartográfica.
- Sonido y música.
