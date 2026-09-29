# Übergabe · Koordinaten-Board

Stand: 29.09.2026 · Einstieg für einen neuen Chat

Arbeitsweise, Zusammenspiel mit der Companion und projektübergreifende Entscheidungen stehen in der [Übergabe im Repo-Wurzelordner](../UEBERGABE.md). Funktionen, Starten, Fehlersuche und Einstellungen stehen in `README.md`.

---

## Stand: fertig, läuft eigenständig

Ein Gerät im Zimmer zeigt Minecraft-Koordinaten groß an. Alle anderen verbinden sich per Handy (QR-Code mit PIN), tragen Orte ein und lesen dafür **Chunkbase-Seed-Map-Screenshots per OCR** aus.

- **Technik**:
  - Server: Fastify 5 (+ websocket/multipart/static)
  - Client: Vite + React 19 + TypeScript
  - Speicher: JSON-Datei mit atomarem Speichern
  - Anmeldung: PIN + HMAC-Token
  - Texterkennung: tesseract.js lokal (`eng`, best_int), Feature-Namen per Levenshtein unscharf zugeordnet
- **Starten**: `start.bat` auf Windows (Node 20+) oder `start.sh`. Die Anzeige unter `/anzeige` ist nur vom Board-Rechner selbst erreichbar.
- **Tests**: `npm test` → 19 Tests (Erkennung 11, Netzwerk 3, PIN-Sperre 2, Karten 3), alle grün.
- **Für die Companion** (Branch `board/scanner`):
  - CORS für `/api/beitreten` und `/api/ich`, Sperre nach 5 falschen PINs für 60 s.
  - „Aufs Board“: WebSocket-Nachrichten `zeigen` / `verbergen`, an alle `gezeigt`. Die Karte wird geprüft (`server/src/zeigen.js`), nur im Speicher gehalten und auf der Anzeige groß gezeigt (`client/src/anzeige/Gezeigt.tsx`). Optionales Feld `typ` → Kennblock neben dem Titel.
- **Kennblöcke** (Branch `bereich/sammelobjekte`): PNGs der Strukturen in `client/public/icons/struktur_kennbloecke/`, eine Kopie der Bilder aus `companion/icons/`. `OrtIcon` (`client/src/komponenten/OrtIcon.tsx`) zeigt das Bild, wenn der Typ eins hat (`lib/kennbloecke.ts`), sonst das Linien-Icon der Kategorie – in Anzeige, Handy-Liste und Ort-Detail. Pfadruinen fehlt noch ein Bild.
- **Git**: Der Verlauf ist mit allen Commits im Repo erhalten (Ordner `koordinaten-board/`). Letzter Commit hier: „QR-Code lernt die tatsächlich erreichbare Adresse“ (früher `75b00b2`).
- ⚠️ **Ein Commit fehlt noch**: Laut alter Übergabe steht `main` bei Max auf `0b1d2f4` mit 15 Tests (Netzwerk 4). Dieser Commit war nicht im Zip. Bei Gelegenheit aus dem lokalen Board-Repo nachziehen, z. B. per `git format-patch 75b00b2..0b1d2f4` und im Repo mit `git am --directory=koordinaten-board` einspielen.

## Gelöst bei Max

- Der QR-Code zeigte die Hyper-V-Adresse `172.24.0.1` statt WLAN `192.168.8.184`. Jetzt wird die Adresse über die Route gewählt, und das Board merkt sich die tatsächlich erreichbare Adresse (`server/daten/adresse.txt`).
- Die Firewall-Freigabe braucht ein **Admin-Terminal**.

## Bezug zur Companion

- Das Board ist das Raum-Dashboard. Die Bereiche der Companion sollen später als Widgets darauf laufen (siehe `../UEBERGABE.md` → Zusammenspiel).
- Die OCR aus `server/src/erkennung.js` soll `/orte/auslesen` der Companion bedienen. Dafür fehlen noch das neue Antwortformat und die Biom-Liste.
- Das Board hat ein eigenes, einfacheres Datenmodell (`client/src/lib/typen.ts`: `Ort` mit Name, Kategorie, Typ). Das gemeinsame Datenmodell der Companion steht in `../referenz/minecraft_tool_datenmodell.md`. Ob und wie das Board darauf umgestellt wird, hängt an der offenen Entscheidung zur Datenhaltung.
- Die Seed-Map-Screenshots, auf denen die Erkennung beruht, liegen in `../referenz/seedmap/`.
