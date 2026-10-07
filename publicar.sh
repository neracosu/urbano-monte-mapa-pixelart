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
