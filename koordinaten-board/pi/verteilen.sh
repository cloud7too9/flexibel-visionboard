#!/usr/bin/env bash
# Läuft auf dem Pi im GitHub-Runner (Benutzer runner): neue Fassung auspacken, Server-Pakete installieren,
# umschalten und den Dienst neu starten. Die laufende Fassung liegt in app/, die vorige bleibt als app.alt/
# liegen (zurückholen von Hand: ANLEITUNG.md). Release-Ordner und /version kommen mit Stufe 3.
# Aufruf: bash verteilen.sh <paket.tar.gz>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Aufruf: $0 <paket.tar.gz>"
  exit 1
fi
PAKET="$(realpath "$1")"
ORDNER="${BOARD_ORDNER:-/opt/koordinaten-board}"

# Erst vollständig vorbereiten, solange die alte Fassung noch läuft
rm -rf "$ORDNER/app.neu"
mkdir -p "$ORDNER/app.neu"
tar -xzf "$PAKET" -C "$ORDNER/app.neu"
npm ci --omit=dev --prefix "$ORDNER/app.neu/koordinaten-board/server" --no-audit --no-fund

rm -rf "$ORDNER/app.alt"
if [ -d "$ORDNER/app" ]; then mv "$ORDNER/app" "$ORDNER/app.alt"; fi
mv "$ORDNER/app.neu" "$ORDNER/app"

sudo -n /usr/bin/systemctl restart koordinaten-board
echo "Neue Fassung in $ORDNER/app, Dienst koordinaten-board neu gestartet."
