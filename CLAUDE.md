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
- El servidor no trae ensurepip: el venv se crea con `--without-pip` y pip entra con get-pip.py.
- El repositorio en GitHub es publico: nada de datos privados en commits ni documentos.
