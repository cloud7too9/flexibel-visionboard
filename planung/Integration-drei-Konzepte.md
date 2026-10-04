# Integration der drei Konzepte: so wird es angewendet

Stand: 05.10.2026 · Bezug: Pi-Server-und-Datenbanken, Live-Update, Server-Pause-und-Neustart

Dieses Dokument fasst zusammen, wie die drei allgemeinen Konzepte auf die konkrete Situation angewendet werden. Die Baupläne bleiben allgemein; hier steht, was davon jetzt wirklich zählt.

## Fokus: so schnell wie möglich einsetzbar

Leitgedanke ist nicht Vollständigkeit, sondern möglichst schneller Einsatz. Alles, was für den Alltagsfall nicht gebraucht wird, wird nur als Struktur vorgehalten und noch nicht gebaut. Entscheidungen fallen zugunsten des kürzesten lauffähigen Wegs.

## Ausgangslage

- Der Raspberry Pi 5 (1 GB RAM) dient rein als Server. Auf diesem Gerät läuft keine Anzeige; das Board läuft auf einem separaten Gerät.
- Der Server kann eventuell heruntergefahren oder pausiert werden. Das ist ein normaler Zustand, kein Fehler.
- Die Anzeige (Board) wird ohnehin nur bei aktivem Server gebraucht. „Server weg = Board zeigt nichts Neues“ ist der erwartete Zustand.
- Am Handy fällt offline derzeit sehr wenig an, und das sind konfliktfreie neue Einträge.

## Anwendung der drei Konzepte

### Handy: der einzige Teil, der robust sein muss

- Der Service Worker hält die App offline lauffähig und überbrückt jede Server-Abwesenheit.
- Neue Einträge wandern in die Warteschlange und synchronisieren sich automatisch bei der nächsten Verbindung auf den Server.
- Weil offline kaum etwas anfällt und es konfliktfreie neue Einträge sind, läuft die Warteschlange rein automatisch. Prüfpflichtige Klasse und Postfach werden nur als Struktur vorgehalten, nicht gebaut.
- Beim Wiederverbinden in Reihe: erst Warteschlange senden, dann `/version` prüfen. An diesem einen Punkt greifen Pause/Neustart und Live-Update ineinander.

### Board: schlank halten

- Service Worker optional und einfach: letzten Stand cachen plus Hinweis „Server nicht erreichbar“.
- Keine Warteschlange, weil das Board nichts anlegt.
- Die Unterscheidung „pausiert“ gegen „ausgefallen“ aus dem Pause-Bauplan ist fürs Board nicht nötig.

### Server: darf jederzeit weg sein

- Pi rein als Server, keine Anzeige auf dem Gerät.
- Sauberes Beenden (SIGTERM) und Autostart gemäß Pause-Bauplan, damit der Server stabil verschwindet und wiederkommt.
- Steuerung vorerst nur per SSH über das Skript `tool`.

## Was dadurch vorerst entfällt

- Prüfpflichtige Warteschlange und Postfach am Handy (nur Struktur)
- Pausiert-gegen-ausgefallen-Unterscheidung am Board
- Handy-Knopf mit Wächter für Pause/Fortsetzen

## Umsetzungsreihenfolge (kürzester lauffähiger Weg)

1. Pi als reiner Server: PostgreSQL mit Eingang/Bestand, Verarbeiter, self-hosted Runner
2. Handy: Service Worker mit automatischer Warteschlange und Sync bei nächster Verbindung
3. Live-Update: Release-Ordner, `/version`, WebSocket-Meldung (Kanal gleich für weitere Nachrichtentypen anlegen)
4. Pause/Neustart: Skript `tool`, SIGTERM, Autostart, Zustandsprüfung im Deployment
5. Board: schlanker Cache plus Nicht-erreichbar-Hinweis

Jede Stufe auf eigenem Branch, nach Abschluss in den Hauptzweig zusammenführen und pushen. Stufe 4 vor dem Zusammenführen einmal komplett testen (pausieren, neu starten, fortsetzen, herunterfahren, einschalten).

## Offene Punkte

- [ ] Anzeigegerät für das Board festlegen
- [ ] Ab wann lohnt sich der Ausbau der prüfpflichtigen Klasse (steigt das Offline-Aufkommen)?

---

## Entscheidungen

| Datum | Entscheidung |
|---|---|
| 05.10.2026 | **Zuerst mit `daten.json`, PostgreSQL später** (Max). Stufe 1 richtet den Pi als reinen Server mit dem heutigen Speicher ein. Eingang/Bestand und Verarbeiter gehören zu PostgreSQL und kommen mit ihm; bis dahin schreibt der Server wie heute direkt in `daten.json`. |

## Hinweise zur Umsetzung

- **Stufe 2 braucht HTTPS.** Am Handy läuft die Companion über `http://192.168…`. Dort registriert der Browser keinen Service Worker. Vorher kommt also das eigene Zertifikat am Board (N5, entschieden, noch nicht gebaut; Weg in `UEBERGABE.md`, Kapitel 9).
- **Kein Hintergrund-Sync am iPhone.** Safari kennt keine Background Sync API. „Sync bei nächster Verbindung“ heißt dort: Die Warteschlange geht raus, sobald die App offen ist und der Server wieder antwortet (beim Start, bei `online` und beim Wiederverbinden von `/ws`).
- **Warteschlange ohne Eingang:** Die IDs neuer Einträge kommen schon heute vom Handy (B1). Die Warteschlange kann deshalb die normalen API-Aufrufe nachholen; einen Eintrag, der schon angekommen ist, erkennt der Server an seiner ID (Antwort 409).
- **Den WebSocket-Kanal gibt es schon:** `/ws` überträgt `geaendert`, `zustand`, `gezeigt` und `teilnehmer`. Die Meldung zu einer neuen Fassung (Stufe 3) wird ein weiterer Nachrichtentyp.
- **Companion im eigenen Repo:** Die Branches `board/pwa` (dieses Repo) und `bereich/pwa` (Repo MineTool) trennen die Companion als eigene PWA ab. Darauf baut Stufe 2 auf. Nach dem Merge holt das Paket für den Pi die Companion aus dem anderen Repo (`koordinaten-board/pi/paket-bauen.sh` anpassen).

## Stand der Umsetzung

| Stufe | Stand |
|---|---|
| 1 · Pi als reiner Server | **gebaut** (mit `daten.json`): Dienst, Einrichtung, Paket bauen und prüfen, Verteilen über den Runner. Anleitung: [`koordinaten-board/pi/ANLEITUNG.md`](../koordinaten-board/pi/ANLEITUNG.md). Am echten Pi noch nicht ausprobiert. PostgreSQL folgt später. |
| 2 · Handy: Service Worker, Warteschlange | offen; vorher HTTPS (N5) |
| 3 · Live-Update | offen |
| 4 · Pause/Neustart | offen; Haltepunkt: einmal komplett am Pi testen |
| 5 · Board: Cache, Hinweis | offen |
