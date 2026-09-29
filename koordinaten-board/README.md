# Koordinaten-Board

Lokales Board für Minecraft-Koordinaten. Ein Gerät im Raum (Laptop, Mini-PC, Raspberry Pi am TV) zeigt alle gespeicherten Orte groß an. Alle anderen verbinden sich per Handy übers WLAN und tragen Orte ein – am schnellsten per **Screenshot aus der Seed Map**.

Alles läuft offline im eigenen Netz: keine Cloud, kein Konto, die Texterkennung passiert lokal auf dem Board-Gerät.

## Funktionen

**Optik:** angelehnt an die Live-Karte der Minecraft Companion PWA – jede Dimension färbt die Oberfläche ein (Oberwelt grün, Nether rot, End violett).

**Anzeige** (`/anzeige`, nur auf dem Board-Gerät selbst)
- Angeheftete Orte groß oben (bis zu 6), alle anderen in drei Spalten: Oberwelt, Nether, Ende
- Automatische Umrechnung Oberwelt ↔ Nether (÷ 8 / × 8) bei jedem Ort
- Lange Listen scrollen von selbst langsam durch
- Neue und geänderte Orte leuchten kurz auf und sind mit „NEU“ markiert
- QR-Code + PIN zum Beitreten, wer online ist, zuletzt gespeicherte Orte

**Handy** (Startseite)
- **Screenshot auslesen**: Ein oder mehrere Seed-Map-Screenshots mit aufgeklapptem Popup auswählen → Name, Typ, X/(Y)/Z und Dimension werden erkannt → prüfen → speichern. Optional wird ein Kartenausschnitt (Popup + Marker, ohne Werbung) als Bild gespeichert.
- Erkennt die Features aus der Feature-Liste (Village, Stronghold, Nether Fortress, End City …), korrigiert kleine OCR-Fehler und ordnet eine Kategorie zu
- Warnt bei Orten, die schon gespeichert sind (gleiche Dimension, ±3 Blöcke)
- **Manuell** eintragen, mit ±-Taste (die iOS-Zifferntastatur hat kein Minus) und Einfügefeld für F3+C-Text, `/tp`-Befehle oder „X: … Z: …“
- Suche, Filter nach Dimension und Kategorie
- **Mein Standort**: sortiert die Liste nach Entfernung mit Himmelsrichtung (auch über Nether/Oberwelt hinweg)
- Koordinaten oder fertigen `/execute … tp`-Befehl kopieren, anheften, bearbeiten, löschen
- Export aller Orte als JSON

**Companion-PWA**
- Die Companion kann per QR-Code-Scan beitreten wie ein Handy. Dafür sind `/api/beitreten` und `/api/ich` für andere Ursprünge freigegeben (CORS, inkl. Private-Network-Access-Antwort für Chrome). `/api/anzeige` mit der PIN bleibt gesperrt.
- Nach **5 falschen PINs** ist das Gerät **60 s gesperrt** (`server/src/sperre.js`), damit keine Webseite die 4-stellige PIN durchprobieren kann.

## Starten

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

**Windows:** `start.bat` doppelklicken. Beim ersten Start werden die Pakete installiert und die Oberfläche gebaut, danach öffnet sich die Anzeige im Edge-Vollbild. Windows fragt beim ersten Start nach der Firewall – **Private Netzwerke erlauben**, sonst kommen die Handys nicht durch.

**Raspberry Pi / Linux:** `./start.sh` – startet Server und Chromium im Kiosk-Modus.

**Von Hand:**
```bash
npm run installieren
npm run build
npm start
```

Die Konsole zeigt dann die Adresse für die Handys und die PIN. Einfacher: den QR-Code auf der Anzeige scannen – die PIN ist darin schon enthalten.

## Handy verbindet nicht?

1. **Firewall (Windows):** `firewall-freigeben.bat` ausführen (fragt einmal nach Admin-Rechten). Das Skript entfernt Blockier-Regeln für `node.exe` – die legt Windows an, wenn man die Firewall-Abfrage beim ersten Start wegklickt – und gibt den Port nur für Geräte im eigenen Netz frei. `start.bat` macht das beim ersten Start automatisch.
2. **Richtige Adresse:** Der Server wählt die Adresse, über die der Rechner ins Netz geht. Zeigt der QR-Code trotzdem eine falsche an: die richtige Adresse (`ipconfig` → WLAN-Adapter) einmal von Hand am Handy eingeben – das Board merkt sich die Adresse, über die ein Gerät tatsächlich hereinkam, und nutzt sie ab dann für den QR-Code (gespeichert in `server/daten/adresse.txt`). Hat der Rechner mehrere Adapter (WSL, Hyper-V, Docker, VirtualBox, VPN), zeigen Konsole und Anzeige unter „Klappt nicht? Andere Adressen“ die Alternativen. Zur Not fest einstellen: `set OEFFENTLICHE_URL=http://192.168.178.23:3000`.
3. **Selbes Netz:** Handy im gleichen WLAN wie der Rechner – nicht im Gäste-WLAN (Geräte sind dort voneinander abgeschottet) und nicht über mobile Daten.
4. **Adresse genau so eingeben:** `http://…:3000` – mit Port, ohne `https`.
5. **Gegenprobe:** Die Adresse aus dem QR-Code im Browser auf dem Board-Rechner selbst öffnen. Lädt sie dort, aber nicht am Handy, liegt es an Firewall oder Netz.

## Ablauf mit der Seed Map

1. Auf der Seed Map (z. B. chunkbase.com) einen Ort antippen, sodass das Popup mit Name und Koordinaten aufklappt
2. Screenshot machen – die Dimension oben im Dropdown darf mit drauf sein, dann wird sie mit erkannt
3. Im Board auf **Screenshot** tippen, einen oder gleich mehrere Screenshots auswählen
4. Erkannte Werte prüfen, ggf. korrigieren → **Orte speichern**

Ist ein Popup von Werbung verdeckt oder nicht aufgeklappt, meldet das Board „Kein Popup gefunden“ statt falsche Werte zu raten.

## Entwicklung

```bash
npm run dev:server    # Server mit Auto-Neustart auf :3000
npm run dev:client    # Vite auf :5173 (leitet /api, /ws, /medien an :3000 weiter)
npm test              # Tests der Screenshot-Auswertung
```

Aufbau:
```
server/src/server.js      Fastify: Beitritt, Upload, Texterkennung, WebSocket-Sync, liefert client/dist aus
server/src/zustand.js     Orte + Einstellungen, Validierung, Speichern als JSON
server/src/erkennung.js   OCR (tesseract.js) + Auswertung des Seed-Map-Popups, Feature-Liste
client/src/anzeige/       Große Anzeige
client/src/steuerung/     Handy-Oberfläche
```

Neue Feature-Typen oder andere Kategorien: Liste `FEATURES` in `server/src/erkennung.js`.

## Daten

Alles liegt in `server/daten/`:
- `zustand.json` – alle Orte und Einstellungen (zum Sichern einfach kopieren)
- `medien/` – Bilder und Kartenausschnitte
- `pin.txt` – Raum-PIN (löschen = neue PIN beim nächsten Start)
- `geheim.txt` – Schlüssel für die Anmeldungen (löschen = alle Handys müssen neu beitreten)

## Einstellungen per Umgebungsvariable

| Variable | Standard | Zweck |
|---|---|---|
| `PORT` | `3000` | Port des Servers |
| `RAUM_PIN` | zufällig, in `pin.txt` | feste PIN setzen |
| `ANZEIGE_OFFEN` | aus | `1` = Anzeige darf auch von anderen Geräten geöffnet werden (z. B. Smart-TV-Browser) |
| `OEFFENTLICHE_URL` | automatisch | Adresse im QR-Code, falls die automatische LAN-IP falsch ist |
| `DATEN_ORDNER` | `server/daten` | Speicherort |
