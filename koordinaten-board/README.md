# Koordinaten-Board

Lokales Board für Minecraft-Koordinaten und **der Server der Companion**. Ein Gerät im Raum (Laptop, Mini-PC, Raspberry Pi am TV) zeigt die Orte der aktiven Welt groß an. Alle anderen öffnen per QR-Code die **Companion** am Handy, die das Board selbst ausliefert: Orte (am schnellsten per **Screenshot aus der Seed Map**), Sammelobjekte, Portal-Verbindungen, Banner und Rüstungs-Sets – alle Daten liegen auf dem Board.

Alles läuft offline im eigenen Netz: keine Cloud, kein Konto, die Texterkennung passiert lokal auf dem Board-Gerät.

## Funktionen

**Optik:** angelehnt an die Live-Karte der Minecraft Companion PWA – jede Dimension färbt die Oberfläche ein (Oberwelt grün, Nether rot, End violett).

**Anzeige** (`/anzeige`, auf dem Board-Gerät selbst oder mit **Anzeige-Link** auf einem anderen Gerät)
- Angeheftete Orte groß oben (bis zu 6), alle anderen in drei Spalten: Oberwelt, Nether, Ende
- Automatische Umrechnung Oberwelt ↔ Nether (÷ 8 / × 8) bei jedem Ort
- Lange Listen scrollen von selbst langsam durch
- Neue und geänderte Orte leuchten kurz auf und sind mit „NEU“ markiert
- QR-Code + PIN zum Beitreten, wer online ist, zuletzt gespeicherte Orte
- Strukturen mit Kennblock (z. B. Netherziegel für „Nether Fortress“) zeigen das Bild statt des Linien-Icons, auch in der Handy-Liste und im Ort-Detail. Bilder: `companion/icons/struktur_kennbloecke/` (der Server liefert sie unter `/icons/` aus), Zuordnung Typ → Bild: `client/src/lib/kennbloecke.ts`

**Handy: die Companion** (Startseite `/`)
- Der Server liefert die Companion aus (`../companion/companion-prototyp.html`, per `COMPANION_DATEI` austauschbar). Den QR-Code der Anzeige mit der normalen Kamera-App scannen → die Companion öffnet sich mit der PIN → Name eingeben → beigetreten.
- Alle Bereiche arbeiten auf den Daten des Boards (`server/daten/daten.json`): Welten mit Seed, Orte der Karte, Sammelobjekte, Portal-Verbindungen, Banner, Rüstungs-Sets. Änderungen kommen bei allen Handys live an.
- Der **Rüstungs-Baukasten** der Companion (`companion/ruestungs-baukasten/`: Texturen, fertige Icons, `baukasten.js`, `figur3d.js`, `manifest.json`) wird unter `/ruestungs-baukasten/` ausgeliefert. Erst über http kann die Companion die Texturen umfärben und die 3D-Figur bauen.
- **Screenshot auslesen** über die lokale Texterkennung des Boards (`/api/orte/auslesen`): Kategorie, Variante (die Klammer im Titel, z. B. „Stairway“), X/(Y)/Z und Dimension. Kleine OCR-Fehler werden korrigiert.
- **Banner-Anleitungen** („Black Base“, „Cyan Bordure“ …) erkennt dieselbe Route, wenn kein Seed-Map-Popup drauf ist: Das Bild wird vergrößert und in Schwarz-Weiß umgewandelt (`bildvorbereitung.js`, sonst liest Tesseract weiße Schrift auf Grau nicht), die Zeilen werden unscharf den englischen Farb- und Musternamen aus `regeln.js` zugeordnet (`banner-erkennung.js`).
- Geprüft wird mit denselben Regeln wie in der Companion: Der Server lädt `../companion/regeln.js` (`server/src/regeln.js`).
- **Anzeige steuern** (Board-Sheet der Companion): Welt auf der Anzeige, Titel, QR-Code zeigen; Orte im Detail „Auf der Anzeige anheften“.
- Beitreten per PIN. Nach **5 falschen PINs** ist das Gerät **60 s gesperrt** (`server/src/sperre.js`). `/api/beitreten` und `/api/ich` bleiben per CORS offen, falls eine Companion von einem anderen Server beitritt.
- **Aufs Board**: Jeder Inhalt der Companion (Ort, Sammelobjekt, Sammel-Fortschritt, Portal-Verbindung, Banner, Rüstungs-Set) lässt sich groß auf die Anzeige werfen. Die Karte liegt über den Spalten, im Theme ihrer Dimension, mit Absender; eine neue ersetzt die alte, gespeichert wird sie nicht. Mit `typ` (Seed-Map-Typ) steht der Kennblock neben dem Titel, ein `bild`-Block (z. B. die Banner-Vorschau oder die Rüstungs-Figur) links neben den übrigen. Aufbau und Prüfung: `server/src/zeigen.js`.
- **Welt-Import (Biome)**: Die Companion liest einen hochgeladenen Weltordner (`.zip`/`.mcworld`) selbst im Browser (Web Worker) und schickt die Biome als Kacheln ans Board (`PUT /api/welten/:id/biome`, geprüft mit `biomImportPruefen` aus `regeln.js`, bis 64 MB). Das Board speichert sie je Welt in `server/daten/biome/<weltId>.json` und meldet `geaendert` „biome“. Worker, Dekoder und Bibliothek liefert es unter `/biom-import.worker.js`, `/biom-welt.js`, `/biom-dekoder.js`, `/biom-ids.js` und `/vendor/` aus. Biom-Punkte aus Screenshots gibt es nicht mehr; alte entfernt der Server beim Start (Sicherung `daten.vor-welt-import.json`).
- **Widget-Dashboard** (`companion/widgets`, in Arbeit): Der Server liefert den Build unter `/dashboard` aus (eigene Routen wie `/dashboard/vollbild/…` → `index.html`; `/dashboard?anzeige=…&schluessel=…` behält den Anzeige-Link). `GET /api/widgets/:typ?quelle=…` liefert die fertige Karte eines Widget-Typs (z. B. `portale.verbindungen`, `banner.banner?quelle=b_3`) aus den Daten der aktiven Welt – gebaut mit denselben Anzeigeschemas wie „Aufs Board“ (`companion/board-karten.js`, per `node:vm` geladen), geprüft mit `zeigen.js`. Ohne Inhalt kommt `{ karte:null, hinweis }` (Bereich geplant, keine Welt, Quelle gelöscht). `GET /api/widgets/:typ/quellen` nennt, was man beim Hinzufügen als Quelle wählen kann. Lesen darf die Anzeige (localhost oder Anzeige-Link) und jedes beigetretene Handy; nach Änderungen meldet `/ws` wie immer `geaendert`. Die Banner-Vorschau rendert der Server als PNG (`pngjs`), die Rüstungs-Figur gibt es nur in der Companion.
- **Layout pro Anzeige** (Widget-Dashboard, A6): Jede Anzeige hat ihr eigenes Widget-Layout (Layer mit Widgets im Raster, aktiver Layer) und meldet, wie viele Reihen auf ihren Bildschirm passen (`PUT /api/anzeige/reihen`). Das Dashboard liest sein Layout über `GET /api/anzeige/layout` (welche Anzeige, sagt der Anzeige-Link; localhost ohne Link ist „Board“). Handys lesen und speichern es über `GET/PUT /api/anzeigen/:id/layout` (Form geprüft in `server/src/layout.js`) und starten mit `PUT /api/anzeigen/:id/vollbild` `{ instanzId|null }` das Vollbild an der Anzeige; Änderungen gehen live als `geaendert` „layout“. Angeordnet wird am Handy unter `/dashboard/anordnen` (aus der Companion: Board → Anzeigen → „Anzeige anordnen“).
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

**Widget-Dashboard** (in Arbeit, ersetzt später `/anzeige`): einmal `npm run dashboard:installieren && npm run dashboard:build`, dann `http://localhost:3000/dashboard`. Es gilt derselbe Anzeige-Link (`/dashboard?anzeige=…&schluessel=…`).

Die Konsole zeigt dann die Adresse für die Handys und die PIN. Einfacher: den QR-Code auf der Anzeige scannen – die PIN ist darin schon enthalten.

**Anzeige auf einem anderen Gerät** (TV-Browser, Tablet, zweiter Laptop): Der Server läuft auf einem Rechner, die Anzeige kann auf jedem Gerät im WLAN laufen. Dafür hat jede Anzeige einen **Anzeige-Link** mit eigenem Schlüssel:
- Die Konsole nennt ihn beim Start: `Anzeige auf anderem Gerät: http://192.168.…:3000/anzeige?anzeige=a_1&schluessel=…`
- In der Companion unter **Board → Anzeigen**: Link kopieren oder als QR-Code zeigen (mit dem Tablet abscannen), Anzeigen anlegen und umbenennen. **Neuer Schlüssel** macht alte Links ungültig; verbundene Anzeigen mit altem Link werden getrennt.
- Der Browser merkt sich den Schlüssel – nach einem Neustart des TVs reicht `http://…:3000/anzeige`.
- Wie bei den Handys muss die **Firewall** des Board-Rechners Geräte im eigenen Netz durchlassen (Windows: „Private Netzwerke erlauben“ bzw. `firewall-freigeben.bat`).
- Auf dem Board-Rechner selbst (`localhost`) braucht die Anzeige keinen Link. `ANZEIGE_OFFEN=1` öffnet sie als Notschalter für jedes Gerät im Netz, ohne Schutz.

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
server/src/daten.js         gemeinsame Daten (daten.json): Welten, Orte, Sammelobjekte, Banner, Rüstungs-Sets, Portale, Einstellungen
server/src/companion-api.js REST-API der Companion unter /api (Vertrag: companion-prototyp.html, Abschnitt 4)
server/src/regeln.js        lädt ../companion/regeln.js (und board-karten.js) per node:vm – dieselben Regeln wie am Handy
server/src/widgets.js       Widget-Typ + Quelle → Karte fürs Dashboard (GET /api/widgets/:typ)
server/src/layout.js        Widget-Layout einer Anzeige prüfen (Form, Widget-Typen, Grenzen)
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
- `daten.json` – alle Welten, Orte, Sammelobjekte, Banner, Rüstungs-Sets, Portal-Verbindungen, die Anzeigen mit ihren Schlüsseln und die Einstellungen der Anzeige (zum Sichern einfach kopieren)
- `biome/<weltId>.json` – Welt-Import je Welt (Angaben zur Welt + Biom-Kacheln); eigene Dateien, weil sie groß werden können
- `daten.vor-welt-import.json` – Sicherung, falls beim Umstieg auf den Welt-Import alte Biom-Punkte entfernt wurden
- `zustand.json`, `medien/` – Orte und Bilder der früheren Handy-Oberfläche; werden nicht mehr gelesen und bleiben als Sicherung liegen
- `pin.txt` – Raum-PIN (löschen = neue PIN beim nächsten Start)
- `geheim.txt` – Schlüssel für die Anmeldungen (löschen = alle Handys müssen neu beitreten)

## Einstellungen per Umgebungsvariable

| Variable | Standard | Zweck |
|---|---|---|
| `PORT` | `3000` | Port des Servers |
| `RAUM_PIN` | zufällig, in `pin.txt` | feste PIN setzen |
| `ANZEIGE_OFFEN` | aus | Notschalter: `1` = Anzeige darf von jedem Gerät im Netz geöffnet werden, ohne Anzeige-Link |
| `OEFFENTLICHE_URL` | automatisch | Adresse im QR-Code, falls die automatische LAN-IP falsch ist |
| `DATEN_ORDNER` | `server/daten` | Speicherort |
| `COMPANION_ORDNER` | `../companion` | Ordner mit Companion-Seite, `regeln.js`, `icons/`, `ruestungs-baukasten/` und den Dateien des Welt-Imports (`biom-*.js`, `vendor/`) |
| `COMPANION_DATEI` | `companion-prototyp.html` | Seite, die unter `/` ausgeliefert wird (später z. B. `modul-a-live-karte.html`) |
