# Koordinaten-Board

Lokales Board für Minecraft-Koordinaten und **der Server der Companion**. Ein Gerät im Raum (Laptop, Mini-PC, Raspberry Pi am TV) zeigt die Orte der aktiven Welt groß an. Alle anderen öffnen per QR-Code die **Companion** am Handy, die das Board selbst ausliefert: Orte (am schnellsten per **Screenshot aus der Seed Map**), Sammelobjekte, Portal-Verbindungen und Banner – alle Daten liegen auf dem Board.

Alles läuft offline im eigenen Netz: keine Cloud, kein Konto, die Texterkennung passiert lokal auf dem Board-Gerät.

## Funktionen

**Optik:** angelehnt an die Live-Karte der Minecraft Companion PWA – jede Dimension färbt die Oberfläche ein (Oberwelt grün, Nether rot, End violett).

**Anzeige** (`/anzeige`, nur auf dem Board-Gerät selbst)
- Angeheftete Orte groß oben (bis zu 6), alle anderen in drei Spalten: Oberwelt, Nether, Ende
- Automatische Umrechnung Oberwelt ↔ Nether (÷ 8 / × 8) bei jedem Ort
- Lange Listen scrollen von selbst langsam durch
- Neue und geänderte Orte leuchten kurz auf und sind mit „NEU“ markiert
- QR-Code + PIN zum Beitreten, wer online ist, zuletzt gespeicherte Orte
- Strukturen mit Kennblock (z. B. Netherziegel für „Nether Fortress“) zeigen das Bild statt des Linien-Icons, auch in der Handy-Liste und im Ort-Detail. Bilder: `client/public/icons/struktur_kennbloecke/`, Zuordnung Typ → Bild: `client/src/lib/kennbloecke.ts`

**Handy: die Companion** (Startseite `/`)
- Der Server liefert die Companion aus (`../companion/companion-prototyp.html`, per `COMPANION_DATEI` austauschbar). Den QR-Code der Anzeige mit der normalen Kamera-App scannen → die Companion öffnet sich mit der PIN → Name eingeben → beigetreten.
- Alle Bereiche arbeiten auf den Daten des Boards (`server/daten/daten.json`): Welten mit Seed, Orte der Karte, Sammelobjekte, Portal-Verbindungen, Banner. Änderungen kommen bei allen Handys live an.
- **Screenshot auslesen** über die lokale Texterkennung des Boards (`/api/orte/auslesen`): Kategorie, Variante (die Klammer im Titel, z. B. „Stairway“), X/(Y)/Z und Dimension. Kleine OCR-Fehler werden korrigiert.
- **Banner-Anleitungen** („Black Base“, „Cyan Bordure“ …) erkennt dieselbe Route, wenn kein Seed-Map-Popup drauf ist: Das Bild wird vergrößert und in Schwarz-Weiß umgewandelt (`bildvorbereitung.js`, sonst liest Tesseract weiße Schrift auf Grau nicht), die Zeilen werden unscharf den englischen Farb- und Musternamen aus `regeln.js` zugeordnet (`banner-erkennung.js`).
- Geprüft wird mit denselben Regeln wie in der Companion: Der Server lädt `../companion/regeln.js` (`server/src/regeln.js`).
- **Anzeige steuern** (Board-Sheet der Companion): Welt auf der Anzeige, Titel, QR-Code zeigen; Orte im Detail „Auf der Anzeige anheften“.
- Beitreten per PIN. Nach **5 falschen PINs** ist das Gerät **60 s gesperrt** (`server/src/sperre.js`). `/api/beitreten` und `/api/ich` bleiben per CORS offen, falls eine Companion von einem anderen Server beitritt.
- **Aufs Board**: Jeder Inhalt der Companion (Ort, Sammelobjekt, Sammel-Fortschritt, Portal-Verbindung, Banner) lässt sich groß auf die Anzeige werfen. Die Karte liegt über den Spalten, im Theme ihrer Dimension, mit Absender; eine neue ersetzt die alte, gespeichert wird sie nicht. Mit `typ` (Seed-Map-Typ) steht der Kennblock neben dem Titel, ein `bild`-Block (z. B. die Banner-Vorschau) links neben den übrigen. Aufbau und Prüfung: `server/src/zeigen.js`.
- Aus der früheren Handy-Oberfläche des Boards noch nicht übernommen: Notiz, Kartenausschnitt als Bild, Export als JSON.

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
3. In der Companion (Karte) unten auf **Screenshot** tippen, einen oder gleich mehrere Screenshots auswählen
4. Erkannte Werte prüfen, ggf. korrigieren → **speichern**

Ist ein Popup von Werbung verdeckt oder nicht aufgeklappt, meldet das Board „Kein Popup gefunden“ statt falsche Werte zu raten.

## Entwicklung

```bash
npm run dev:server    # Server mit Auto-Neustart auf :3000
npm run dev:client    # Vite auf :5173 (leitet /api, /ws, /medien an :3000 weiter)
npm test              # Server-Tests: Daten, Companion-API, Regeln, Erkennung, Karten, Netzwerk, PIN-Sperre
```

Aufbau:
```
server/src/server.js        Fastify: Beitritt, WebSocket, liefert Companion (/) und Anzeige (/anzeige) aus
server/src/daten.js         gemeinsame Daten (daten.json): Welten, Orte, Sammelobjekte, Banner, Portale, Einstellungen
server/src/companion-api.js REST-API der Companion unter /api (Vertrag: companion-prototyp.html, Abschnitt 4)
server/src/regeln.js        lädt ../companion/regeln.js per node:vm – dieselben Regeln wie am Handy
server/src/sicht.js         Orte der aktiven Welt in der Form, die die Anzeige kennt
server/src/erkennung.js     OCR (tesseract.js) + Auswertung des Seed-Map-Popups, fuerCompanion()
server/src/banner-erkennung.js  Banner-Anleitung → Grundfarbe + Ebenen
server/src/bildvorbereitung.js  JPEG/PNG vergrößern, Schwarz-Weiß (jpeg-js, pngjs)
server/src/zeigen.js        „Aufs Board“: Karten vom Handy prüfen
server/src/sperre.js        Sperre nach falschen PINs
client/src/anzeige/         Große Anzeige (Gezeigt.tsx: geworfene Karte) – der Client ist nur noch die Anzeige
```

Neue Feature-Typen für die Texterkennung: Liste `FEATURES` in `server/src/erkennung.js`. Kategorien, Biome und Regeln stehen in `../companion/regeln.js`.

## Daten

Alles liegt in `server/daten/`:
- `daten.json` – alle Welten, Orte, Sammelobjekte, Banner, Portal-Verbindungen und die Einstellungen der Anzeige (zum Sichern einfach kopieren)
- `zustand.json`, `medien/` – Orte und Bilder der früheren Handy-Oberfläche; werden nicht mehr gelesen und bleiben als Sicherung liegen
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
| `COMPANION_ORDNER` | `../companion` | Ordner mit Companion-Seite, `regeln.js` und `icons/` |
| `COMPANION_DATEI` | `companion-prototyp.html` | Seite, die unter `/` ausgeliefert wird (später z. B. `modul-a-live-karte.html`) |
