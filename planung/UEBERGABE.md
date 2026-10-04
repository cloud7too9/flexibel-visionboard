# Übergabe · Umsetzung des Plans (Stand 04.10.2026)

> **Einstieg für den nächsten Chat:** zuerst [`../UEBERGABE.md`](../UEBERGABE.md) (Arbeitsweise, Konventionen), dann diese Datei, dann [`WARTELISTE.md`](WARTELISTE.md) (was auf Max wartet). Der Plan selbst steht in [`PLAN.md`](PLAN.md).
>
> Diese Datei beschreibt, was aus `PLAN.md` gebaut ist, wo es liegt, wie man es startet und testet und was als Nächstes kommt.

---

## 1. Kurzfassung

- **Gebaut und in `main`:**
  - Strang C (ganzer Biom-Import), mit der Fixture-Welt von Max und Biom-ID 195 (Phase 1 abgeschlossen)
  - der Anzeige-Link für andere Geräte
  - das Widget-Dashboard A0–A6, einschließlich **Anordnen am Handy**
  - aus Strang B die Phasen **B1** (Datenmodell) und **B2** (Accounts mit PIN)
  - **CI auf GitHub:** Bei jedem PR und jedem Push auf `main` laufen alle Tests (Kapitel 6)
  - **Nur Bedrock (E15):** Java gibt es nirgendwo mehr, auch nicht bei den Portalen
- **Als Nächstes** (Kapitel 9):
  1. **Bauplan „Sitzung“** (E16) schreiben und mit Max abnicken
  2. **Offline B3–B5** mit HTTPS am Board (N5 ist entschieden: eigenes Zertifikat)
  3. A7 (Größenstufen je Widget): Planungsrunde mit Max
  4. Inhalte, die noch nicht beschrieben sind (Warteliste, Kapitel 4)
- **Git:**
  - **Alles ist in `main`.** Offene PRs: keine.
  - **Gemergt wird nur nach Rückfrage bei Max**, auch wenn Claude den Merge ausführt.
  - 16 gemergte Branches warten aufs Löschen durch Max (Kapitel 3). In der Cloud-Sitzung darf Claude keine Branches löschen.
- **Tests:** alle grün in `main`, lokal und in der CI (Kapitel 6).
- **Für Max wichtig:** Seit B2 gelten alte Anmeldungen nicht mehr. Jedes Handy meldet sich einmal neu an, mit Name und eigener PIN.

### Diese Runde (04.10.2026)

| PR | Inhalt |
|---|---|
| #19 | Ergebnisse von Phase 1 des Biom-Plans nachgeholt: Fixture-Welt von Max, Biom-ID 195 = Dappled Forest, Höhenkarte `z*16 + x`. Lagen nur auf `bereich/karte-mcworld`. |
| #20 | Die ganze Kette A2–A6 + B1/B2 + Anzeige-Link in einem Merge (ersetzt die gestapelten #12–#17) |
| #21 | CI: `.github/workflows/tests.yml`, dazu ein Fix für eine Race Condition in `anzeige-link.test.mjs` |
| #22 | Nur Bedrock: Java-Umschaltung entfernt. Entscheidungen festgehalten. Diese Übergabe. |

Entscheidungen von Max (Details in `WARTELISTE.md` und `PLAN.md`, Kapitel 7):

| Nr. | Entscheidung |
|---|---|
| N5 | HTTPS am Board mit **eigenem Zertifikat**, das iPhone vertraut ihm einmal |
| E15 | **Nur Bedrock**, Java gibt es nirgendwo |
| E16 | Das Board bekommt eine **Sitzung**, die lebt, solange das Board läuft. „Aufs Board“ fügt den Inhalt als **Widget an der ersten freien Stelle** ein, am Handy verschieb- und entfernbar. |
| E8 | Themes für Sammelobjekte, Banner, Rüstung: **vertagt**, wird an anderer Stelle geklärt |
| H1, H3–H6 | abgenommen |
| Mergen | **nur nach Rückfrage bei Max** |

Frühere Entscheidungen (01.10.2026): Strang C als ganzer Biom-Import, N1 (abgehakt wird im Bereich der Companion), N2 (Anordnen als React-Route `/dashboard/anordnen`), N4 (Board-PIN im QR-Code bleibt, Account-PIN kommt dazu), Arbeitsweise „Was Eingaben braucht, kommt auf die Warteliste, alles andere wird erledigt“.

---

## 2. Stand je Phase

| Phase | Ergebnis | Wichtige Dateien |
|---|---|---|
| **C** Welt-Import | `.zip`/`.mcworld` im Browser lesen (Web Worker). Biome als Kacheln ans Board, je Welt in `biome/<weltId>.json`. Import-Sheet mit Anleitung (iPhone), Prüfung, Fortschritt. Biom-Ebene auf der Karte. Phase 1 an der Fixture-Welt geprüft. | `companion/biom-welt.js`, `biom-import.worker.js`, `biom-ids.js`, `regeln.js` (`biomImportPruefen`), Board `daten.js` (`biome…`), `companion/tests/daten/fixture-seed.mcworld` |
| **Anzeige-Link** | Jede Anzeige hat einen eigenen Schlüssel. Andere Geräte (TV, Tablet) werden mit dem Link zur Anzeige. QR-Code und Verwaltung stehen im Board-Sheet der Companion. | Board `server.js` (`anzeigeZugang`), `daten.js` (`anzeige…`), `client/src/lib/zugang.ts` |
| **A0** Übernahme | MainHub läuft als `companion/widgets/` (Vite, React, TS, Tailwind, zustand). | `companion/widgets/` |
| **A1** Raster | 32 Spalten, quadratische Zellen, die Reihen folgen der Höhe. | `lib/raster.ts` |
| **A2** Größen-Vertrag | Größenstufen statt freier Größen. Passt-Prüfung mit Belegungsmatrix. Vollbild als eigene Route. | `model/widget-vertrag.ts`, `lib/collision-utils.ts`, `pages/VollbildPage.tsx` |
| **A3** Struktur | Die Kette Bereich → Widget-Typ → Instanz. Zusatzinhalte je Stufe. Galerie mit Suche. | `model/widget-struktur.ts`, `components/AddPanelModal.tsx` |
| **A4** Register und Karten | **13 Typen**. Typen mit Quelle gibt es mehrfach; die Quelle wählt man beim Hinzufügen. Gehäuse und Inhalt sind getrennt. **Die Karten baut der Server** mit denselben Anzeigeschemas wie „Aufs Board“. Ohne Board gibt es Beispielkarten, Änderungen kommen live über `/ws`. | `companion/board-karten.js`, Board `widgets.js`, `features/karten/`, `model/widget-register.ts` |
| **A5** Themes | Theme je Bereich: Karte nach Dimension, Handbuch als Buch, Baupläne blau mit Gitter, Portale schwarz-lila ohne Rot und Grün. Platzhalter für E8. | `model/widget-themes.ts`, `shared/styles/themes.css` |
| **A6** Layout pro Anzeige | Layout und Reihen je Anzeige am Server. Am Board ist das Dashboard reine Anzeige (live). **Anordnen am Handy** unter `/dashboard/anordnen`: leere Widgets, Auswahl-Leiste, Galerie, Layer, Vollbild steuern. Das Board liefert `/dashboard` aus. | Board `layout.js`, `daten.js` (`anzeigeLayout…`), `pages/AnordnenPage.tsx`, `features/anordnen/` |
| **B1** Datenmodell | IDs neuer Einträge kommen vom Handy (UUID, auch über http). Jeder Eintrag hat `erstellerId`. Es gibt die Sammlungen `benutzer`, `profile`, `geraete`. | `regeln.js` (`neueEintragId`, `idGueltig`), Board `daten.js` (`eintragId`) |
| **B2** Accounts mit PIN | Board-PIN, dann Account wählen oder anlegen (Name + eigene PIN, 4–8 Ziffern). Die PIN wird nur als **scrypt-Hash** gespeichert. Sperre je Gerät und Account. Das Token ist der **Geräteschlüssel**. `werBistDu()` gekapselt an Board und Companion. | Board `identitaet.js`, Companion `IDENTITAET`, Sheet „Beitreten“ |
| **E15** Nur Bedrock | Portal-Prüfung mit festem Suchradius ±128 (`PORTAL_SUCHRADIUS`), kein Umschalter, kein `edition` mehr im Kontext der Karten. Der Welt-Import weist Java-Welten mit klarer Meldung ab. | `companion/board-karten.js`, Portal-Verwaltung in `companion-prototyp.html` |
| **CI** | Drei Jobs bei jedem PR und Push auf `main`, Screenshots als Download „bilder“ | `.github/workflows/tests.yml` |
| **B3–B5** Offline | nicht gebaut. N5 ist entschieden (eigenes Zertifikat), kann losgehen. | – |
| **E16** Sitzung | nicht gebaut. Zuerst Bauplan zum Abnicken. | – |
| **A7** Größenstufen | nicht gebaut: Planungsrunde mit Max (E6) | – |

Pfade unter `model/`, `lib/`, `components/` und `features/` liegen in `companion/widgets/src/` (`model/`, `lib/` und `components/` unter `features/workspace/`). „Board“ meint `koordinaten-board/server/src/`.

---

## 3. Branches und Mergen

- **Alles ist in `main`**, offene PRs gibt es nicht. Gearbeitet wurde zuletzt auf `claude/pr-status-review-yrg9m9`. Er ist mit #22 gemergt und kann für die nächste Runde neu von `main` abzweigen.
- **Mergen:** nur nach Rückfrage bei Max, immer mit **„Create a merge commit“**.
- **Zum Löschen** (Max auf GitHub → Branches; Inhalt komplett in `main`):
  `bereich/banner-screenshot`, `bereich/karte-welt-upload`, `bereich/mainhub-visionboard`, `bereich/ruestung`, `bereich/sammelobjekte`, `bereich/widgets-uebernahme`, `bereich/widgets-raster`, `bereich/widgets-groessen`, `bereich/widgets-struktur`, `bereich/widgets-register`, `bereich/widgets-themes`, `bereich/widgets-anzeigen`, `board/anzeige-link`, `board/identitaet`, `board/scanner`, `board/zusammenfuehrung`.
  Bei `bereich/karte-welt-upload` fehlt in `main` nur der leere Merge-Commit von #8.
- **Behalten:** `bereich/karte-mcworld`. Dort liegen die Phasen 2–4 des Biom-Plans in einer älteren Fassung (Prüfseite `welt-pruefen.html`, `welt-import.test.mjs` mit einer 55-MB-Welt). #7 hat sie ersetzt; Phase 1 kam mit #19.
- **Empfehlung:** In den Repo-Einstellungen „Automatically delete head branches“ einschalten. Dann verschwindet ein Branch nach dem Merge, und ein PR kann nicht mehr in einen schon gemergten Branch gehen (so ging #8 verloren).

### Verlauf bis 04.10.2026

- #7 (Strang C), #9 (MainHub), #10 (A0), #11 (A1) wurden einzeln gemergt.
- #8 (Anzeige-Link) wurde in `bereich/karte-welt-upload` gemergt, als der schon in `main` war. Der Anzeige-Link kam erst mit #20 nach `main` (über `9f7dee9`).
- #12–#17 waren gestapelt (jeder PR auf seinen Vorgänger). GitHub ließ die Basis von #17 nicht auf `main` umstellen („part of a stack“). Darum brachte **#20** denselben Branch `board/identitaet` in einem Merge nach `main`; #12 hat GitHub selbst als gemergt markiert, #13–#17 sind geschlossen.
- Commits der Kette (ohne Merges): C `84ed32f` · `5a1d02e` · `e9c1efd` · `2570c56`; Anzeige-Link `51db22f`; A0 `b6d4082`; A1 `7ab7275` · `bedcfda` · `ca7eba6`; A2 `c777042` · `5de5ccc` · `e8d03ee` · `76f9fc2`; A3 `223f46c`; A4 `e00aeea` … `876aad6`; A5 `23f3a36` … `c54583a`; A6 `0905882` · `90ba916` · `d1873ae` · `766544a`; B1/B2 `75d4f89` · `1cae081` · `c09ec0a` · `8ee1ad6`.

---

## 4. So hängt jetzt alles zusammen

```
Handy (Companion, /)                 Board-Server (Fastify, :3000)                Anzeige im Zimmer
───────────────────                  ─────────────────────────────                ─────────────────
Beitreten: Board-PIN + Account  ──▶  identitaet.js: anmelden → Token (Gerät)
  (Name + eigene PIN)                werBistDu(req) für API, /ws, Widgets
Daten anlegen (ID vom Handy)    ──▶  daten.js (daten.json): erstellerId = Account
„Aufs Board“ (BOARD_KARTEN)     ──▶  /ws zeigen → gezeigt                    ──▶  /anzeige (alt, React)
Board → Anzeigen → anordnen     ──▶  PUT /api/anzeigen/:id/layout, /vollbild
  = /dashboard/anordnen               layout.js prüft, geaendert „layout“      ──▶  /dashboard (Widgets)
                                     GET /api/widgets/:typ → Karte aus              lädt Layout seiner Anzeige,
                                     board-karten.js (gemeinsam mit Handy)           meldet Reihen, rendert Karten
```

- **Eine Quelle für Karten:** `companion/board-karten.js` übersetzt Daten in Karten aus Titel und Blöcken (`koordinaten`, `zeilen`, `text`, `bild`). Die Companion nutzt die Datei für „Aufs Board“, der Server lädt sie per `node:vm` für die Widgets. Neue Daten gehören in beide Kontexte: `boardKontext()` in der Seite und `kontext()` in `widgets.js`.
- **Neuer Widget-Typ:**
  1. Eintrag im Register `widget-register.ts`.
  2. Zuordnung in `WIDGETS` (Board `widgets.js`).
  3. Gegebenenfalls ein Anzeigeschema in `BOARD_KARTEN`.
- **Rollen:**
  - **Anzeige**: localhost ohne Link ist die erste Anzeige „Board“, andere Geräte brauchen den Anzeige-Link. Sie hat keine Bedienelemente.
  - **Steuerung**: ein Handy mit Token. Es ändert Layouts und startet das Vollbild.
- **Identität:** Das Token enthält Account und Gerät. Ein gesperrtes Gerät oder ein Token von vor B2 gilt nicht. Hinter `werBistDu()` kann später ein richtiges Login stehen, ohne die Daten anzufassen.
- **Heute vs. E16:** „Aufs Board“ geht heute über `/ws` (`zeigen` → `gezeigt`) an die alte `/anzeige` und bleibt dort liegen. Mit der Sitzung (E16) wird daraus ein Widget im Dashboard (Kapitel 9).

---

## 5. Starten und ausprobieren

```bash
cd koordinaten-board
npm run installieren && npm run build                  # Server + alte Anzeige
npm run dashboard:installieren && npm run dashboard:build   # Widget-Dashboard (companion/widgets → dist)
npm start                                              # Windows: start.bat (baut das Dashboard noch nicht mit)
```

- **Handy:** QR-Code der Anzeige scannen → „Beitreten“. Dort die Board-PIN eingeben, einen Account antippen oder einen neuen Namen tippen, dazu die eigene PIN.
- **Anzeige:** `http://localhost:3000/dashboard` (Widgets) oder `/anzeige` (alt). Auf anderen Geräten mit dem Anzeige-Link (Konsole oder Board → Anzeigen).
- **Anordnen:** am Handy Board → Anzeigen → „Anzeige anordnen“, am besten im Querformat.
- **Ohne Board:** `cd companion/widgets && npm run dev`. Dann gibt es Beispielkarten, man bearbeitet lokal, die Galerie geht im Bearbeiten-Modus. `companion/companion-prototyp.html` direkt geöffnet läuft im DEMO-Mock.

---

## 6. Tests (alle grün in `main`, 04.10.2026)

| Teil | Befehl | Ergebnis |
|---|---|---|
| Board-Server | `cd koordinaten-board && npm test` | 57 Tests |
| Widgets | `cd companion/widgets && npm run typecheck && npm test` | Typecheck ok, 108 Unit-Tests |
| Companion und Dashboard (Playwright) | `cd companion/tests && npm test` | 14 Dateien, 492 Prüfungen und 20 Dekoder-Tests |

**CI auf GitHub:** `.github/workflows/tests.yml` führt alle drei Teile bei jedem Pull Request und jedem Push auf `main` aus (Jobs „Board-Server“, „Widgets“, „Companion und Dashboard (Playwright)“, zusammen etwa 5 Minuten). Die Screenshots aus `companion/tests/bilder/`, darunter die Haltepunkte, hängen als Download „bilder“ am Lauf (14 Tage). Ein neuer Push auf denselben PR bricht den alten Lauf ab.

Die Playwright-Dateien: `biom-dekoder` (20, `node --test`), `banner` (23), `portale` (29), `sammelobjekte` (64), `kennbloecke` (14), `board` (58), `live` (72), `anzeigeschema` (31), `ruestung` (52), `karte-mcworld` (52), `anzeige-link` (16), `widgets` (36), `widgets-board` (20), `widgets-anordnen` (25).

Voraussetzungen für die Playwright-Tests:
- Alles muss gebaut sein:
  - `npm --prefix ../../koordinaten-board run installieren && npm --prefix ../../koordinaten-board run build`
  - `npm --prefix ../widgets install && npm --prefix ../widgets run build`
- In der Cloud-Umgebung braucht es `CHROMIUM=/opt/pw-browsers/chromium`. Auf GitHub installiert die CI Chromium selbst (`npx playwright install --with-deps chromium`).
- Die Tests starten eigene Board-Prozesse auf Ports 3185–3198. Ein hängender Prozess blockiert den nächsten Lauf; mit `ps -eo pid,args | grep "node src/server.js"` finden. Server-Tests und Playwright nicht parallel starten.
- Screenshots für die Haltepunkte landen in `companion/tests/bilder/`.

---

## 7. Wichtig zu wissen (Stolperfallen)

- **Typecheck der Widgets:** Dafür `npm run typecheck` nehmen (`tsc -b`). `tsc -p .` prüft nichts, weil die oberste `tsconfig.json` nur Referenzen enthält. `npm run build` prüft ebenfalls.
- **Die Playwright-Tests laufen gegen `dist`.** Nach Änderungen an den Widgets erst `npm run build`, sonst testet man den alten Stand.
- **Tests auf dem langsameren Runner:** Nach dem Beitreten öffnet die Companion bei einem leeren Board „Noch keine Welt“ erst nach dem Laden der Welten. Ein Test, der Sheets schließt, muss vorher auf dieses Sheet warten (`.sheet-kopf h2` = „Welt“), sonst überdeckt es später den nächsten Klick. Nachstellen lässt sich so etwas mit einer Verzögerung per `page.route("**/api/orte/welten", …)`.
- **Am Handy läuft die Companion über `http://192.168…`, also nicht in einem sicheren Kontext.**
  - `crypto.randomUUID` gibt es dort nicht. Deshalb erzeugt `neueEintragId()` die IDs aus `getRandomValues`.
  - Service Worker gehen dort gar nicht. Deshalb kommt mit B3 HTTPS (N5).
- **Alte Anmeldungen:** Tokens von vor B2 werden abgelehnt. Die Companion prüft beim Start mit `IDENTITAET.werBistDu()` und öffnet dann das Beitreten. Die Accounts bleiben, auch wenn man `geheim.txt` löscht (nur die Anmeldungen verfallen).
- **Migrationen beim Laden von `daten.json`:**
  - Alte Biom-Punkte werden entfernt, mit Sicherung `daten.vor-welt-import.json`.
  - Fehlende `erstellerId` wird zu „unbekannt“.
- **Am Board kein Bearbeiten:** Das Dashboard ist dort reine Anzeige. Geändert wird nur über `/dashboard/anordnen` (Token) oder ohne Board im Browser-Speicher.
- **Portal-Regeln:** Es gibt nur Bedrock (E15). Handy und Board rechnen mit ±128 in beiden Dimensionen.
- **Platzhalter-Größen:** Kleine Widgets schneiden ihre Karte ab, zum Beispiel der Sammel-Fortschritt mit 4×3 Zellen. Das ist bekannt und wird mit A7 gelöst.
- **`ENOENT … daten.json.tmp`** in den Server-Tests ist harmlos. Ein verzögertes Speichern trifft auf den schon gelöschten Testordner.
- **Die Startskripte** (`start.bat`, `start.sh`) bauen das Dashboard noch nicht mit. Das kommt mit E16, wenn `/dashboard` die Anzeige wird.
- **GitHub und Git:**
  - Gestapelte PRs lassen sich auf GitHub nicht auf eine andere Basis umstellen („part of a stack“). Lieber keine Stapel mehr, sondern einen PR je abgeschlossenem Schritt direkt gegen `main`.
  - Haben zwei Stränge sich vorher schon gekreuzt (zwei Merge-Basen), meldet GitHub einen Konflikt, den `git` lokal ohne Konflikt löst. Abhilfe: `main` in den Branch mergen und pushen.
  - In der Cloud-Sitzung lehnt der Git-Proxy das Löschen von Branches ab (HTTP 403). Das macht Max auf GitHub.

---

## 8. Was auf Max wartet (Details in `WARTELISTE.md`)

- **Bauplan „Sitzung“ abnicken** (E16), sobald er geschrieben ist.
- **A7/E6:** Planungsrunde zu den Größenstufen je Widget und `seitenleistenBreite`.
- **Inhalte beschreiben:**
  - Koordinatensammlung, Eigene Liste
  - echte Gesamtkarte mit Markern (braucht einen neuen Karten-Block)
  - die Bereiche Handbuch und Baupläne
- **Realm-Welt am iPhone** importieren (Laufzeit, Speicher). Rest von H2.
- **Später:** B3 am echten iPhone (Home-Bildschirm-App, Flugmodus); E8 (Themes) an anderer Stelle.
- **Aufräumen:** 16 Branches löschen (Kapitel 3).

---

## 9. Nächste Schritte

1. **Bauplan „Sitzung“ (E16)** als `planung/bauplaene/Bauplan-Sitzung.md`, dann Max fragen. Fest steht:
   - Die Sitzung lebt, solange das Board läuft. Ein Neustart beginnt leer; das gespeicherte Layout der Anzeige (A6) bleibt.
   - Inhalte lassen sich während der Laufzeit live ändern.
   - „Aufs Board“ fügt den Inhalt als **Widget an der ersten freien Stelle** ein (Größe aus dem Größen-Vertrag, Passt-Prüfung aus A2). Am Handy lässt er sich in „Anzeige anordnen“ verschieben oder entfernen.

   Im Bauplan zu klären:
   - Wo die Sitzung liegt: im Speicher des Servers, neben `layout.js`. Bekommt sie einen eigenen Layer über dem gespeicherten Layout?
   - Was passiert, wenn kein Platz frei ist.
   - Ob `/anzeige` wegfällt. Dann brauchen der QR-Code zum Beitreten und die Orte mit Kennblöcken eigene Widgets, der Anzeige-Link zeigt auf `/dashboard`, und die Startskripte bauen das Dashboard mit.
   - Wie die Anzeigeschemas (`BOARD_KARTEN`, Quelle wie `portal:<id>`) auf Widget-Typen mit Quelle abgebildet werden. `WIDGETS` und `quellenVon` in Board `widgets.js` sind der Anknüpfungspunkt.
2. **Offline B3–B5 mit HTTPS** auf einem eigenen Branch (der Bauplan verlangt `bereich/offline`):
   - **HTTPS am Board:** Das Board erzeugt beim ersten Start eine eigene Zertifizierungsstelle und daraus ein Server-Zertifikat mit der IP im Heimnetz (SAN), höchstens 825 Tage gültig, sonst lehnt iOS es ab.
   - **Am iPhone:** Das Zertifikat der Zertifizierungsstelle gibt es über http als Profil zum Laden. Danach unter Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen voll vertrauen. Der QR-Code führt danach auf `https://…`.
   - `companion/sw.js` mit versioniertem Cache (die Seite kommt heute bewusst ohne Cache, `OHNE_CACHE`), IndexedDB statt `localStorage`, Test mit `context.setOffline(true)`.
   - ⏸ Haltepunkt am echten iPhone (Home-Bildschirm-App, Flugmodus).
   - Danach B4 (Offline-Regel, Warteschlange je Account) und B5 (Zustandswechsel, zuerst beim Abhaken der Sammelobjekte).
3. **Nach A7:** echte Stufen statt der Platzhalter im Register, `SEITENLEISTEN_BREITE` setzen, größte Rasterstufe bauen.
4. **Inhalte**, sobald beschrieben: Typen mit Quelle bekommen ihre Quelle in `widgets.js` (`quellenVon`) und ein Anzeigeschema in `board-karten.js`.
5. **E8**, wenn an anderer Stelle geklärt: die Platzhalter-Themes in `themes.css` ersetzen. Am Widget-Code ändert sich nichts.
