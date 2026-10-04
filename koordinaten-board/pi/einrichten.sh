#!/usr/bin/env bash
# Richtet den Pi einmal als reinen Server ein (Raspberry Pi OS Lite, 64 Bit): sudo ./einrichten.sh
#   - Node.js 22 (NodeSource), falls /usr/bin/node fehlt oder älter als 20 ist
#   - Benutzer „board“ führt den Server aus und besitzt die Daten,
#     Benutzer „runner“ bekommt den GitHub-Runner und verteilt neue Fassungen
#   - /opt/koordinaten-board für den Code (gehört runner)
#   - Dienst koordinaten-board mit Autostart; gestartet wird er beim ersten Verteilen
#   - runner darf als root genau einen Befehl: den Dienst neu starten
# Mehrfach ausführen schadet nicht. Schritt für Schritt: ANLEITUNG.md
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte mit sudo starten: sudo $0"
  exit 1
fi
HIER="$(cd "$(dirname "$0")" && pwd)"

apt-get update
apt-get install -y curl ca-certificates

node_haupt() { /usr/bin/node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_haupt)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(/usr/bin/node --version)"

id board >/dev/null 2>&1 || useradd --system --home-dir /var/lib/koordinaten-board --no-create-home --shell /usr/sbin/nologin board
id runner >/dev/null 2>&1 || useradd --create-home --shell /bin/bash runner
install -d -o runner -g runner -m 755 /opt/koordinaten-board

install -m 644 "$HIER/koordinaten-board.service" /etc/systemd/system/koordinaten-board.service
systemctl daemon-reload
systemctl enable koordinaten-board

# sudo liest in sudoers.d keine Dateien mit Punkt im Namen; die .neu-Datei ist bis zum Umbenennen wirkungslos
REGEL=/etc/sudoers.d/koordinaten-board
echo 'runner ALL=(root) NOPASSWD: /usr/bin/systemctl restart koordinaten-board' > "$REGEL.neu"
chmod 440 "$REGEL.neu"
visudo -cf "$REGEL.neu"
mv "$REGEL.neu" "$REGEL"

echo
echo "Pi eingerichtet. Weiter mit ANLEITUNG.md, Schritt 3 (GitHub-Runner als Benutzer runner)."
