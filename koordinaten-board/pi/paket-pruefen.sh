#!/usr/bin/env bash
# Prüft ein Paket so, wie der Pi es nutzt: auspacken, Server-Pakete ohne Entwicklungs-Abhängigkeiten
# installieren, mit leerem Datenordner starten, alles abrufen, was der Server ausliefert, mit SIGTERM beenden.
# Fehlt eine Datei im Paket (paket-bauen.sh), schlägt die Prüfung fehl, bevor etwas auf den Pi geht.
# Aufruf: bash koordinaten-board/pi/paket-pruefen.sh <paket.tar.gz>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Aufruf: $0 <paket.tar.gz>"
  exit 1
fi
PAKET="$(realpath "$1")"
PORT="${PORT:-3990}"
ADRESSE="http://127.0.0.1:$PORT"
ORDNER="$(mktemp -d)"
SERVER=""
trap '[ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null; rm -rf "$ORDNER"' EXIT

tar -xzf "$PAKET" -C "$ORDNER"
npm ci --omit=dev --prefix "$ORDNER/koordinaten-board/server" --no-audit --no-fund

DATEN_ORDNER="$ORDNER/daten" PORT="$PORT" node "$ORDNER/koordinaten-board/server/src/server.js" > "$ORDNER/server.log" 2>&1 &
SERVER=$!

for _ in $(seq 1 30); do
  curl -fs "$ADRESSE/api/server" > /dev/null && break
  sleep 1
done
if ! curl -fs "$ADRESSE/api/server" > /dev/null; then
  echo "Server startet nicht"
  cat "$ORDNER/server.log"
  exit 1
fi

for pfad in / /regeln.js /board-karten.js /biom-welt.js /biom-import.worker.js /icons/manifest.json \
            /vendor/mcbe-leveldb.js /ruestungs-baukasten/manifest.json /anzeige /dashboard/; do
  if ! curl -fs -o /dev/null "$ADRESSE$pfad"; then
    echo "Fehlt im Paket: $pfad"
    cat "$ORDNER/server.log"
    exit 1
  fi
  echo "ok  $pfad"
done

kill -TERM "$SERVER"
if ! wait "$SERVER"; then
  echo "Server hat sich auf SIGTERM nicht sauber beendet"
  cat "$ORDNER/server.log"
  exit 1
fi
SERVER=""
echo "Paket in Ordnung: startet, liefert aus, endet sauber auf SIGTERM."
