# Übergabe · Koordinaten-Board

Stand: 29.09.2026 · Einstieg für einen neuen Chat

Arbeitsweise, Zusammenspiel mit der Companion und projektübergreifende Entscheidungen stehen in der [Übergabe im Repo-Wurzelordner](../UEBERGABE.md). Funktionen, Starten, Fehlersuche und Einstellungen stehen in `README.md`.

---

## Stand: Server der Companion + Anzeige im Zimmer

**Zusammenführung (Branch `board/zusammenfuehrung`, Entscheidung von Max am 29.09.2026):** Das Board ist der eine Server für Companion und Anzeige. Es liefert die Companion unter `/` aus, hält alle Daten (`daten.json`) und synchronisiert live. Die eigene Handy-Oberfläche (React-Steuerung) ist abgelöst, der Client ist nur noch die Anzeige unter `/anzeige`. Die alten Board-Orte wurden nicht übernommen (Max: neu anfangen), `zustand.json` bleibt als Sicherung liegen.

Ein Gerät im Zimmer zeigt die Orte der aktiven Welt groß an. Alle anderen öffnen per QR-Code die Companion, treten mit Board-PIN und Account (Name + eigene PIN) bei und lesen **Chunkbase-Seed-Map-Screenshots per OCR** aus.

- **Technik**:
  - Server: Fastify 5 (+ websocket/multipart/static)
  - Client: Vite + React 19 + TypeScript
  - Speicher: JSON-Datei mit atomarem Speichern
  - Anmeldung: PIN + HMAC-Token
  - Texterkennung: tesseract.js lokal (`eng`, best_int), Feature-Namen per Levenshtein unscharf zugeordnet
- **Starten**: `start.bat` auf Windows (Node 20+) oder `start.sh`. Die Anzeige unter `/anzeige` öffnet der Board-Rechner selbst (localhost) oder ein anderes Gerät mit **Anzeige-Link** (Branch `board/anzeige-link`): `daten.anzeigen` = `{ id, name, schluessel }`, beim ersten Start „Board“. `/api/anzeige` und `/ws?rolle=anzeige` prüfen `?anzeige=…&schluessel=…`; „Neuer Schlüssel“ trennt verbundene Anzeigen mit altem Link (Code 4003). Verwaltet wird in der Companion (Board → Anzeigen) über `GET/POST /api/anzeigen`, `PUT /api/anzeigen/:id`, `POST /api/anzeigen/:id/schluessel`, `GET /api/anzeigen/:id/qr` (SVG vom Server, Paket `qrcode`). Der Link nutzt dieselbe Adresse wie der QR-Code der Handys; die Konsole nennt ihn beim Start. Die Anzeige merkt sich den Schlüssel (`client/src/lib/zugang.ts`).
- **Tests**: `npm test` → 57 Tests (Erkennung 13, Banner-Erkennung 4 mit echter OCR am Referenzbild, Identität 3, Companion-API 12 – der Anzeige-Link wird über die Netzwerkadresse des Rechners „von außen“ geprüft, Daten + Anzeige-Sicht 9, Regeln 7 – davon einer, der die Rüstungs-Stammdaten gegen das Baukasten-Manifest prüft, Karten 4, Netzwerk 3, PIN-Sperre 2), alle grün. Die API-Tests starten einen echten Server-Prozess mit leerem Datenordner.
- **Server-Aufbau**:
  - `daten.js`: Welten, Typen, Instanzen, Sammelobjekte, Banner, Rüstungs-Sets (`ruestung`, für alle Welten, Branch `bereich/ruestung`), Portale, Einstellungen (`titel`, `qrZeigen`, `aktiveWelt`). Abläufe wie der DEMO-Mock der Companion.
  - **Welt-Import** (Branch `bereich/karte-welt-upload`): `biomeLesen`/`biomeSetzen`/`biomeLoeschen` je Welt in `daten/biome/<weltId>.json` (atomar, nacheinander geschrieben), Route `GET/PUT/DELETE /api/welten/:id/biome` mit `bodyLimit` 64 MB, Regel `biomImportPruefen` aus `regeln.js`. Beim Laden entfernt `biomPunkteEntfernen()` alte Biom-Orte aus Screenshots (Sicherung `daten.vor-welt-import.json`). `server.js` liefert Worker, Dekoder, `biom-ids.js` und `vendor/` aus `companion/` aus.
  - `server.js` liefert zusätzlich `Companion/app/ruestungs-baukasten/` unter `/ruestungs-baukasten/` aus (Texturen, fertige Icons, ES-Module für Umfärben und 3D-Figur).
  - `companion-api.js`: REST unter `/api` nach dem Vertrag in `index.html` der Companion (Abschnitt 4), Bearer-Token aus dem Beitreten. Dazu `/api/board/einstellungen` und `PUT /api/orte/instanzen/:id/angeheftet`. Jede Änderung meldet per WebSocket `{ art:"geaendert", bereich, weltId }`.
  - `regeln.js`: lädt `Companion/app/regeln.js` per `node:vm` – dieselben Regeln wie am Handy, nichts nachgebaut.
  - **Accounts mit PIN, Phase B2** (Branch `board/identitaet`, N4: Board-PIN bleibt): `identitaet.js` – `anmelden()` (Board-PIN, dann Account per Name finden oder anlegen, eigene PIN 4–8 Ziffern, `pinHashen`/`pinPasst` mit scrypt), `konten()`, `werBistDu(req)`/`ausToken()` (Token `{ b: benutzerId, g: geraetId, f: farbe }`, signiert mit `geheim.txt`; gilt nur, solange das Gerät freigeschaltet ist). `daten.js`: `benutzerAnlegen`, `benutzerMitName` (ohne Groß-/Kleinschreibung, eindeutig), `geraetAnlegen` (persönliches Profil je Account), `benutzerVonGeraet`. Routen: `POST /api/beitreten { pin, name, kontoPin }` → `{ token, id, name, neu }`, `POST /api/beitreten/konten { pin }`, `GET /api/ich` → `{ id, name, farbe }`. Companion-API, Widgets und `/ws` fragen alle `werBistDu`. Geteilte Geräte gibt es nur im Modell (`typ`, `profile.geteilt`).
  - **Datenmodell Strang B, Phase B1** (Branch `board/identitaet`): Orte, Portale, Banner und Rüstungs-Sets nehmen eine ID vom Handy an (`eintragId()`: UUID, geprüft mit `idGueltig` aus `regeln.js`, 400/409; ohne ID wie bisher `neueId`). Alle Einträge mit Urheber (auch der Sammel-Status) tragen `erstellerId` – bis zu den Accounts (B2) „unbekannt“, alte Daten bekommen es beim Laden (`erstellerNachtragen`). Leere Sammlungen `benutzer`, `profile`, `geraete` für B2. `syncStatus` gibt es nur am Handy (B3/B4).
  - **Layout pro Anzeige** (Branch `bereich/widgets-anzeigen`, A6): `daten.anzeigen[]` bekommt `reihen` und `layout` (`{ layer:[{ id, name, instanzen }], aktiverLayer }`, geprüft mit `layoutPruefen` aus `layout.js` gegen die Typen in `WIDGETS`). Handys: `GET/PUT /api/anzeigen/:id/layout` (→ `geaendert('layout')`) und `PUT /api/anzeigen/:id/vollbild` (`anzeigeVollbildSetzen`: nur ein Widget im aktiven Layer; endet, wenn es dort nicht mehr liegt); die Anzeige: `GET /api/anzeige/layout`, `PUT /api/anzeige/reihen` (Zugang wie `/api/anzeige`, localhost ohne Link = erste Anzeige, `anzeigeLokal()`). Die Liste `GET /api/anzeigen` enthält `reihen`, aber kein Layout.
  - **Dashboard unter `/dashboard`** (Schritt aus A6, vorgezogen): `server.js` liefert `companion/widgets/dist` aus (`DASHBOARD_DIST`), `/dashboard` leitet mit Query auf `/dashboard/` um, eigene Routen bekommen `index.html` (ohne Cache). Bauen: `npm run dashboard:installieren && npm run dashboard:build`. Die Startskripte bauen es noch nicht mit.
  - `widgets.js` (Branch `bereich/widgets-register`, Phase A4): `GET /api/widgets/:typ?quelle=…` und `/api/widgets/:typ/quellen`. `WIDGETS` ordnet jedem Widget-Typ des Dashboards ein Anzeigeschema aus `Companion/app/board-karten.js` zu (im selben vm-Kontext wie `regeln.js` geladen, Export `karten`); Handbuch, Baupläne, Koordinatensammlung und Eigene Liste liefern nur einen Hinweis. Zugang: `anzeigeZugang` oder Bearer-Token. Portal-Regeln am Board: Bedrock. `pngDaten()` rendert die Banner-Vorschau mit `pngjs`.
  - `sicht.js`: Orte der aktiven Welt in der alten `Ort`-Form für die Anzeige.
  - `erkennung.js` + `fuerCompanion()`: OCR für `/api/orte/auslesen`.
  - `banner-erkennung.js` + `bildvorbereitung.js`: Banner-Anleitungen (Branch `bereich/banner-screenshot`). Ohne Seed-Map-Popup wird das Bild 3× vergrößert und für helle, dann dunkle Schrift in Schwarz-Weiß gewandelt; Zeilen „<Farbe> <Muster>“ werden unscharf über `regeln.js` zugeordnet. Kostet bis zu zwei weitere OCR-Läufe (~1 s am PC). WebP wird nicht vorbereitet.
  - `/api/server` → `{ name:"koordinaten-board" }`: daran erkennt die Companion den Live-Betrieb.
- **Für die Companion** (früher Branch `board/scanner`):
  - CORS für `/api/beitreten`, `/api/beitreten/konten` und `/api/ich`, Sperre nach 5 falschen PINs für 60 s (Board-PIN je IP, eigene PIN je IP und Account).
  - „Aufs Board“: WebSocket-Nachrichten `zeigen` / `verbergen`, an alle `gezeigt`. Die Karte wird geprüft (`server/src/zeigen.js`), nur im Speicher gehalten und auf der Anzeige groß gezeigt (`client/src/anzeige/Gezeigt.tsx`). Optional `typ` → Kennblock neben dem Titel; Block `bild` (PNG/JPEG/WebP als Data-URL, max. 200 KB) links neben den übrigen.
- **Kennblöcke**: Die Anzeige lädt sie unter `/icons/…`, der Server liefert dafür `Companion/app/icons` aus (keine Kopie mehr im Client). `OrtIcon` zeigt das Bild, wenn der Typ eins hat (`lib/kennbloecke.ts`), sonst das Linien-Icon der Kategorie. Pfadruinen fehlt noch ein Bild.
- **Aufräumen möglich**: `client/src/stil.css` enthält noch Regeln der alten Handy-Oberfläche (`.ort`, `.sheet` …), `komponenten/Icon.tsx` Symbole, die nur sie brauchte.
- **Git**: Der Verlauf ist mit allen Commits im Repo erhalten (Ordner `koordinaten-board/`). Letzter Commit hier: „QR-Code lernt die tatsächlich erreichbare Adresse“ (früher `75b00b2`).
- ⚠️ **Ein Commit fehlt noch**: Laut alter Übergabe steht `main` bei Max auf `0b1d2f4` mit 15 Tests (Netzwerk 4). Dieser Commit war nicht im Zip. Bei Gelegenheit aus dem lokalen Board-Repo nachziehen, z. B. per `git format-patch 75b00b2..0b1d2f4` und im Repo mit `git am --directory=koordinaten-board` einspielen.

## Gelöst bei Max

- Der QR-Code zeigte die Hyper-V-Adresse `172.24.0.1` statt WLAN `192.168.8.184`. Jetzt wird die Adresse über die Route gewählt, und das Board merkt sich die tatsächlich erreichbare Adresse (`server/daten/adresse.txt`).
- Die Firewall-Freigabe braucht ein **Admin-Terminal**.

## Bezug zur Companion

- Das Board ist das Raum-Dashboard. Die Bereiche der Companion sollen später als Widgets darauf laufen (siehe `../UEBERGABE.md` → Zusammenspiel).
- Die OCR bedient `/api/orte/auslesen` der Companion. Ein Biom-Popup erkennt `fuerCompanion()` weiter als Biom; die Companion zeigt es ausgegraut, denn Biome kommen nur noch aus dem Welt-Import.
- Gespeichert wird im gemeinsamen Datenmodell der Companion (`../referenz/minecraft_tool_datenmodell.md` + Erweiterungen). Die Anzeige bekommt davon über `sicht.js` weiter ihre einfache `Ort`-Form (`client/src/lib/typen.ts`).
- Die Seed-Map-Screenshots, auf denen die Erkennung beruht, liegen in `../referenz/seedmap/`.
