# Raspberry Pi als Server

Stufe 1 aus [`planung/Integration-drei-Konzepte.md`](../../planung/Integration-drei-Konzepte.md): Der Pi 5 (1 GB RAM) ist **nur Server**. Auf ihm läuft keine Anzeige; die Anzeige öffnet ein anderes Gerät mit dem Anzeige-Link. Die Daten liegen wie bisher in `daten.json` (PostgreSQL kommt später).

## So kommt eine neue Fassung auf den Pi

```
Push auf main ──▶ Tests (GitHub) grün ──▶ „Auf den Pi“ (.github/workflows/pi.yml)
                                           1. GitHub baut das Paket und prüft es   (paket-bauen.sh, paket-pruefen.sh)
                                           2. Runner auf dem Pi: auspacken, Server-Pakete installieren,
                                              umschalten, Dienst neu starten         (verteilen.sh)
```

Der Pi baut nichts selbst, dafür reicht 1 GB RAM nicht sicher. Er installiert nur die Server-Pakete für seinen Prozessor.

| Was | Wo auf dem Pi | Gehört |
|---|---|---|
| laufende Fassung | `/opt/koordinaten-board/app` | `runner` |
| vorige Fassung | `/opt/koordinaten-board/app.alt` | `runner` |
| Daten (`daten.json`, `pin.txt`, `geheim.txt`, `biome/`) | `/var/lib/koordinaten-board` | `board` |
| Dienst | `koordinaten-board` (startet beim Einschalten) | – |
| GitHub-Runner | `/home/runner/actions-runner` | `runner` |

## Einmal einrichten

1. **System:** Mit dem Raspberry Pi Imager **Raspberry Pi OS Lite (64-bit)** aufspielen, ohne Desktop, das spart Speicher. Im Imager gleich SSH, Benutzer und WLAN einstellen. Im Router dem Pi eine **feste IP** geben (DHCP-Reservierung), sonst ändern sich QR-Code und Anzeige-Link.

2. **Pi einrichten** (per SSH):
   ```bash
   sudo apt install -y git
   git clone https://github.com/cloud7too9/flexibel-visionboard.git
   sudo flexibel-visionboard/koordinaten-board/pi/einrichten.sh
   ```
   Das Skript installiert Node.js 22, legt die Benutzer `board` und `runner` an, richtet den Dienst mit Autostart ein und erlaubt `runner`, den Dienst neu zu starten (sonst nichts).

3. **GitHub-Runner** auf dem Pi:
   - Auf GitHub: Repo → **Settings → Actions → Runners → New self-hosted runner** → **Linux**, **ARM64**. Die Seite zeigt die Befehle mit Download-Link und Token.
   - Am Pi als Benutzer `runner` ausführen. Beim Befehl `./config.sh …` am Ende `--labels pi` anhängen:
     ```bash
     sudo -iu runner
     mkdir actions-runner && cd actions-runner
     # Download und Entpacken: die zwei Befehle von der GitHub-Seite
     ./config.sh --url https://github.com/cloud7too9/flexibel-visionboard --token <TOKEN> --labels pi
     exit
     ```
     Meldet `config.sh` fehlende Bibliotheken: `sudo bash -c 'cd /home/runner/actions-runner && ./bin/installdependencies.sh'`, dann `config.sh` noch einmal.
   - Runner als Dienst starten (läuft danach auch nach jedem Einschalten):
     ```bash
     sudo bash -c 'cd /home/runner/actions-runner && ./svc.sh install runner && ./svc.sh start'
     ```

4. **Schutz fürs öffentliche Repo:** Repo → **Settings → Actions → General** → bei den Workflows aus Forks **„Require approval for all external contributors“** wählen. Ein fremder Pull Request könnte sonst einen Workflow mitbringen, der auf dem Pi läuft. Der Workflow „Auf den Pi“ selbst läuft nie für Pull Requests.

5. **Freischalten:** Repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**: Name `PI_AKTIV`, Wert `ja`. Vorher läuft „Auf den Pi“ gar nicht, auch nicht nach Pushes auf `main`.

6. **Erste Fassung verteilen:** Repo → **Actions → Auf den Pi → Run workflow** (Branch `main`). Danach geht jede Änderung auf `main` nach grünen Tests von selbst auf den Pi.

7. **Adresse, PIN und Anzeige-Link** stehen im Log:
   ```bash
   journalctl -u koordinaten-board -n 20
   ```
   Den Anzeige-Link (`http://<Pi>:3000/anzeige?anzeige=a_1&schluessel=…`) auf dem Anzeigegerät öffnen. Dort steht der QR-Code zum Beitreten. Für das Widget-Dashboard `/anzeige` im Link durch `/dashboard` ersetzen.

## Daten vom bisherigen Board-Rechner übernehmen (optional)

Auf dem bisherigen Rechner liegen die Daten in `koordinaten-board/server/daten/`. Ohne Übernahme beginnt der Pi leer (neue PIN, keine Accounts). Erst nach Schritt 6 übernehmen: Den Datenordner legt der Dienst beim ersten Start an.

```bash
# vom bisherigen Rechner aus (ohne adresse.txt, die gehört zum alten Rechner)
scp daten.json pin.txt geheim.txt <benutzer>@<Pi>:/tmp/
scp -r biome <benutzer>@<Pi>:/tmp/

# auf dem Pi
sudo systemctl stop koordinaten-board
sudo cp -r /tmp/daten.json /tmp/pin.txt /tmp/geheim.txt /tmp/biome /var/lib/koordinaten-board/
sudo chown -R board:board /var/lib/koordinaten-board
sudo systemctl start koordinaten-board
```

Die Handys melden sich danach einmal neu an, weil die Adresse eine andere ist.

## Im Alltag (per SSH)

| Was | Befehl |
|---|---|
| Läuft der Server? | `systemctl status koordinaten-board` |
| Log mitlesen | `journalctl -u koordinaten-board -f` |
| Stoppen / Starten / Neu starten | `sudo systemctl stop koordinaten-board` (bzw. `start`, `restart`) |
| Daten sichern | `sudo tar -czf ~/board-daten-$(date +%F).tar.gz -C /var/lib koordinaten-board` |
| Runner läuft? | GitHub → Settings → Actions → Runners (grüner Punkt „Idle“) |

Stoppen schickt SIGTERM: Der Server speichert `daten.json` und endet sauber. Herunterfahren (`sudo poweroff`) macht dasselbe, Stecker ziehen nicht. Nach dem Einschalten starten Server und Runner von selbst.

**Vorige Fassung zurückholen**, wenn eine neue nicht startet:

```bash
sudo systemctl stop koordinaten-board
sudo -u runner bash -c 'cd /opt/koordinaten-board && mv app app.kaputt && mv app.alt app'
sudo systemctl start koordinaten-board
```

## Was noch fehlt

- **Stufe 3:** Release-Ordner statt `app`/`app.alt`, `/version` und die Meldung einer neuen Fassung über `/ws`
- **Stufe 4:** das Skript `tool` (pausieren, fortsetzen, Zustand), Zustandsprüfung nach dem Verteilen, kompletter Test am Pi
- **PostgreSQL** mit Eingang/Bestand und Verarbeiter: später
- **HTTPS** (N5): Voraussetzung für den Service Worker am Handy (Stufe 2)
