#!/usr/bin/env bash
# Koordinaten-Board starten: Server + Anzeige im Vollbild (Chromium-Kiosk, z. B. Raspberry Pi)
set -e
cd "$(dirname "$0")"

[ -d server/node_modules ] || npm run installieren
[ -d client/dist ] || npm run build

node server/src/server.js &
SERVER=$!
trap 'kill $SERVER' EXIT

sleep 3
BROWSER=$(command -v chromium-browser || command -v chromium || command -v google-chrome || true)
if [ -n "$BROWSER" ] && [ -n "$DISPLAY$WAYLAND_DISPLAY" ]; then
  "$BROWSER" --kiosk --noerrdialogs --disable-infobars --no-first-run http://localhost:3000/anzeige &
else
  echo "Kein Browser/Bildschirm gefunden – Anzeige manuell öffnen: http://localhost:3000/anzeige"
fi

wait $SERVER
