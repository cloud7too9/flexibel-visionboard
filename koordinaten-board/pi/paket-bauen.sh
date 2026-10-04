#!/usr/bin/env bash
# Baut das Paket für den Pi: Server-Quellen, die gebaute Anzeige (client/dist), das gebaute
# Widget-Dashboard (companion/widgets/dist) und was der Server aus companion/ ausliefert (server.js).
# Ohne node_modules: Die Server-Pakete installiert der Pi selbst (arm64). Gebaut wird dort nichts (1 GB RAM).
# Aufruf aus dem Repo: bash koordinaten-board/pi/paket-bauen.sh <Zielordner>   → <Zielordner>/paket.tar.gz
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Aufruf: $0 <Zielordner>"
  exit 1
fi
mkdir -p "$1"
ZIEL="$(cd "$1" && pwd)"
cd "$(dirname "$0")/../.."

npm ci --prefix koordinaten-board/client --no-audit --no-fund
npm --prefix koordinaten-board/client run build
npm ci --prefix companion/widgets --no-audit --no-fund
npm --prefix companion/widgets run build

tar -czf "$ZIEL/paket.tar.gz" \
  koordinaten-board/server/src koordinaten-board/server/package.json koordinaten-board/server/package-lock.json \
  koordinaten-board/client/dist \
  companion/companion-prototyp.html companion/regeln.js companion/board-karten.js companion/biom-*.js \
  companion/icons companion/vendor companion/ruestungs-baukasten companion/widgets/dist

echo "Paket: $ZIEL/paket.tar.gz ($(du -h "$ZIEL/paket.tar.gz" | cut -f1))"
