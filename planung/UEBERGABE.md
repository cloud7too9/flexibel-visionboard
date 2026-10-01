# Übergabe · Umsetzung des Plans (Stand 01.10.2026)

> **Einstieg für den nächsten Chat:** zuerst [`../UEBERGABE.md`](../UEBERGABE.md) (Arbeitsweise, Konventionen), dann diese Datei, dann [`WARTELISTE.md`](WARTELISTE.md) (was auf Max wartet). Der Plan selbst steht in [`PLAN.md`](PLAN.md).
>
> Diese Datei beschreibt, was aus `PLAN.md` gebaut ist, wo es liegt, wie man es startet und testet und was als Nächstes kommt.

---

## 1. Kurzfassung

- **Gebaut:**
  - Strang C (ganzer Biom-Import)
  - der Anzeige-Link für andere Geräte
  - das Widget-Dashboard A0–A6, einschließlich **Anordnen am Handy**
  - aus Strang B die Phasen **B1** (Datenmodell) und **B2** (Accounts mit PIN)
- **Offen:**
  - B3–B5 (Offline-Betrieb): warten auf die Entscheidung **N5 (HTTPS)**
  - A7 (Größenstufen je Widget): Planungsrunde mit Max
  - die Haltepunkte H1–H6 zum Anschauen
  - einige Inhalte, die noch nicht beschrieben sind (siehe Warteliste)
- **Git:**
  - Alle Branches sind gepusht.
  - In `main` ist noch nichts gemergt. Für jeden Branch ist ein **gestapelter Pull Request** offen: **#7–#17**, siehe Kapitel 3. Gemergt wird nach Plan durch Max.
  - `board/identitaet` enthält alles.
- **Tests:** alle grün auf `board/identitaet`, siehe Kapitel 6.
- **Für Max wichtig:** Seit B2 gelten alte Anmeldungen nicht mehr. Jedes Handy meldet sich einmal neu an, mit Name und eigener PIN.

Entscheidungen von Max in dieser Runde:

| Nr. | Entscheidung |
|---|---|
| Strang C | Umfang: der **ganze Biom-Import** (Phasen 2–5 des Biom-Plans) |
| N1 | Abgehakt wird **im Bereich der Companion**. „Anzeige anordnen“ ordnet nur an. |
| N2 | **Weg 1**: React-Route `/dashboard/anordnen` aus `companion/widgets/`, geöffnet aus der Companion |
| N4 | „Ja“ = Die **Board-PIN im QR-Code bleibt** als Zugang zum Server, die Account-PIN kommt dazu |
| Arbeitsweise | „Was Eingaben braucht, kommt auf die Warteliste, alles andere wird erledigt“ → `WARTELISTE.md` |

---

## 2. Stand je Phase

| Phase | Ergebnis | Branch | Wichtige Dateien |
|---|---|---|---|
| **C** Welt-Import | `.zip`/`.mcworld` im Browser lesen (Web Worker). Biome als Kacheln ans Board, je Welt in `biome/<weltId>.json`. Import-Sheet mit Anleitung (iPhone), Prüfung, Fortschritt. Biom-Ebene auf der Karte. | `bereich/karte-welt-upload` | `companion/biom-welt.js`, `biom-import.worker.js`, `regeln.js` (`biomImportPruefen`), Board `daten.js` (`biome…`) |
| **Anzeige-Link** | Jede Anzeige hat einen eigenen Schlüssel. Andere Geräte (TV, Tablet) werden mit dem Link zur Anzeige. QR-Code und Verwaltung stehen im Board-Sheet der Companion. | `board/anzeige-link` | Board `server.js` (`anzeigeZugang`), `daten.js` (`anzeige…`), `client/src/lib/zugang.ts` |
| **A0** Übernahme | MainHub läuft als `companion/widgets/` (Vite, React, TS, Tailwind, zustand). | `bereich/widgets-uebernahme` | `companion/widgets/` |
| **A1** Raster | 32 Spalten, quadratische Zellen, die Reihen folgen der Höhe. | `bereich/widgets-raster` | `lib/raster.ts` |
| **A2** Größen-Vertrag | Größenstufen statt freier Größen. Passt-Prüfung mit Belegungsmatrix. Vollbild als eigene Route. | `bereich/widgets-groessen` | `model/widget-vertrag.ts`, `lib/collision-utils.ts`, `pages/VollbildPage.tsx` |
| **A3** Struktur | Die Kette Bereich → Widget-Typ → Instanz. Zusatzinhalte je Stufe. Galerie mit Suche. | `bereich/widgets-struktur` | `model/widget-struktur.ts`, `components/AddPanelModal.tsx` |
| **A4** Register und Karten | **13 Typen**. Typen mit Quelle gibt es mehrfach; die Quelle wählt man beim Hinzufügen. Gehäuse und Inhalt sind getrennt. **Die Karten baut der Server** mit denselben Anzeigeschemas wie „Aufs Board“. Ohne Board gibt es Beispielkarten, Änderungen kommen live über `/ws`. | `bereich/widgets-register` | `companion/board-karten.js`, Board `widgets.js`, `features/karten/`, `model/widget-register.ts` |
| **A5** Themes | Theme je Bereich: Karte nach Dimension, Handbuch als Buch, Baupläne blau mit Gitter, Portale schwarz-lila ohne Rot und Grün. Platzhalter für E8. | `bereich/widgets-themes` | `model/widget-themes.ts`, `shared/styles/themes.css` |
| **A6** Layout pro Anzeige | Layout und Reihen je Anzeige am Server. Am Board ist das Dashboard reine Anzeige (live). **Anordnen am Handy** unter `/dashboard/anordnen`: leere Widgets, Auswahl-Leiste, Galerie, Layer, Vollbild steuern. Das Board liefert `/dashboard` aus. | `bereich/widgets-anzeigen` | Board `layout.js`, `daten.js` (`anzeigeLayout…`), `pages/AnordnenPage.tsx`, `features/anordnen/` |
| **B1** Datenmodell | IDs neuer Einträge kommen vom Handy (UUID, auch über http). Jeder Eintrag hat `erstellerId`. Es gibt die Sammlungen `benutzer`, `profile`, `geraete`. | `board/identitaet` | `regeln.js` (`neueEintragId`, `idGueltig`), Board `daten.js` (`eintragId`) |
| **B2** Accounts mit PIN | Board-PIN, dann Account wählen oder anlegen (Name + eigene PIN, 4–8 Ziffern). Die PIN wird nur als **scrypt-Hash** gespeichert. Sperre je Gerät und Account. Das Token ist der **Geräteschlüssel**. `werBistDu()` gekapselt an Board und Companion. | `board/identitaet` | Board `identitaet.js`, Companion `IDENTITAET`, Sheet „Beitreten“ |
| **B3–B5** Offline | nicht gebaut: wartet auf **N5** (Service Worker brauchen HTTPS) | – | – |
| **A7** Größenstufen | nicht gebaut: Planungsrunde mit Max (E6) | – | – |

Pfade unter `model/`, `lib/`, `components/` und `features/` liegen in `companion/widgets/src/` (`model/`, `lib/` und `components/` unter `features/workspace/`). „Board“ meint `koordinaten-board/server/src/`.

---

## 3. Branches und Mergen

Die Branches bauen aufeinander auf. Jeder enthält alle davor:

```
main ── bereich/karte-welt-upload (C) ── board/anzeige-link ──┐
                                                               │ (gemergt in -register)
bereich/mainhub-visionboard ── widgets-uebernahme (A0) ── -raster (A1) ── -groessen (A2)
   ── -struktur (A3) ── -register (A4) ── -themes (A5) ── -anzeigen (A6) ── board/identitaet (B1, B2)
```

- `bereich/mainhub-visionboard` (die MainHub-Übernahme per Subtree, vor dieser Runde) ist **noch nicht in `main`**.
- Zwei Merge-Commits verbinden die Ketten:
  - `9f7dee9` holt Strang C und den Anzeige-Link in die Widgets-Kette.
  - `10f3c8c` holt A6 nach `board/identitaet`.
- **Offene Pull Requests (gestapelt):** Jeder zielt auf seinen Vorgänger, damit im Diff nur seine Phase steht.

  | PR | Head → Basis | Inhalt |
  |---|---|---|
  | #7 | `bereich/karte-welt-upload` → `main` | Strang C: Welt-Import (H1, H2) |
  | #8 | `board/anzeige-link` → `bereich/karte-welt-upload` | Anzeige-Link |
  | #9 | `bereich/mainhub-visionboard` → `main` | MainHub-Übernahme und Plan (von vor dieser Runde) |
  | #10 | `bereich/widgets-uebernahme` → `bereich/mainhub-visionboard` | A0 |
  | #11 | `bereich/widgets-raster` → `bereich/widgets-uebernahme` | A1 |
  | #12 | `bereich/widgets-groessen` → `bereich/widgets-raster` | A2 (H3) |
  | #13 | `bereich/widgets-struktur` → `bereich/widgets-groessen` | A3 |
  | #14 | `bereich/widgets-register` → `bereich/widgets-struktur` | A4 (H4), mit dem Merge von #7/#8 |
  | #15 | `bereich/widgets-themes` → `bereich/widgets-register` | A5 (H5) |
  | #16 | `bereich/widgets-anzeigen` → `bereich/widgets-themes` | A6 (H6) |
  | #17 | `board/identitaet` → `bereich/widgets-anzeigen` | B1 + B2 |

- **So mergen:**
  - Von unten nach oben, mit **„Create a merge commit“**. Bei Squash oder Rebase passen die PRs darüber nicht mehr.
  - Wird beim Mergen der Branch gelöscht, stellt GitHub den nächsten PR selbst auf `main` um. #14 zeigt die Änderungen aus #7/#8 so lange mit, bis die gemergt sind.
  - #7/#8 und #9–#17 sind zwei Stränge und können in beliebiger Reihenfolge zueinander gemergt werden.
- Nach dem Mergen die Branches löschen.

Commits dieser Runde (ohne Merges), in Reihenfolge:

| Branch | Commits |
|---|---|
| `bereich/karte-welt-upload` | `84ed32f` Welt-Upload: Aufbau prüfen, Worker · `5a1d02e` Biom-Raster: Datenmodell, Regeln, Board-API · `e9c1efd` Welt-Import in der Karte · `2570c56` Doku und Übergabe |
| `board/anzeige-link` | `51db22f` Anzeige-Link für andere Geräte |
| `bereich/widgets-uebernahme` | `b6d4082` MainHub als companion/widgets lauffähig |
| `bereich/widgets-raster` | `7ab7275` · `bedcfda` · `ca7eba6` (Raster) |
| `bereich/widgets-groessen` | `c777042` Größen-Vertrag · `5de5ccc` Passt-Prüfung · `e8d03ee` Größenstufen · `76f9fc2` Vollbild |
| `bereich/widgets-struktur` | `223f46c` Widget-Struktur |
| `bereich/widgets-register` | `e00aeea` board-karten.js · `2e5e602` Board-Karten im Server · `a174a6a` Mehrfach und Quelle · `dfc67b4` 13 Typen · `436da0d` Gehäuse/Inhalt · `a913663` Karten vom Board · `a980f09` Quelle wählen · `b097d3b` Karten-Darstellung · `f23a1e3` Dashboard unter /dashboard · `876aad6` Doku |
| `bereich/widgets-themes` | `23f3a36` Warteliste · `cd011d1` · `ed8119e` · `792261d` (Themes) · `c54583a` Doku |
| `bereich/widgets-anzeigen` | `0905882` Anzeigen-Layout am Server · `90ba916` Dashboard zeigt Layout · `d1873ae` Doku · `766544a` **Anordnen am Handy** |
| `board/identitaet` | `75d4f89` IDs vom Handy und Ersteller · `1cae081` Überblick · `c09ec0a` N1/N4 entschieden · `8ee1ad6` **Accounts mit PIN, Identität gekapselt** |

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

## 6. Tests (alle grün auf `board/identitaet`, 01.10.2026)

| Teil | Befehl | Ergebnis |
|---|---|---|
| Board-Server | `cd koordinaten-board && npm test` | 57 Tests |
| Widgets | `cd companion/widgets && npm run typecheck && npm test` | Typecheck ok, 108 Unit-Tests |
| Companion und Dashboard (Playwright) | `cd companion/tests && npm test` | 14 Dateien, 509 Prüfungen |

Die Playwright-Dateien: `biom-dekoder` (18, `node --test`), `banner` (23), `portale` (29), `sammelobjekte` (64), `kennbloecke` (14), `board` (58), `live` (72), `anzeigeschema` (31), `ruestung` (52), `karte-mcworld` (52), `anzeige-link` (15), `widgets` (36), `widgets-board` (20), `widgets-anordnen` (25).

Voraussetzungen für die Playwright-Tests:
- Alles muss gebaut sein:
  - `npm --prefix ../../koordinaten-board run installieren && npm --prefix ../../koordinaten-board run build`
  - `npm --prefix ../widgets install && npm --prefix ../widgets run build`
- In der Cloud-Umgebung braucht es `CHROMIUM=/opt/pw-browsers/chromium`.
- Die Tests starten eigene Board-Prozesse auf Ports 3185–3198. Ein hängender Prozess blockiert den nächsten Lauf; mit `ps -eo pid,args | grep "node src/server.js"` finden.
- Screenshots für die Haltepunkte landen in `companion/tests/bilder/`.

---

## 7. Wichtig zu wissen (Stolperfallen)

- **Typecheck der Widgets:** Dafür `npm run typecheck` nehmen (`tsc -b`). `tsc -p .` prüft nichts, weil die oberste `tsconfig.json` nur Referenzen enthält. `npm run build` prüft ebenfalls.
- **Die Playwright-Tests laufen gegen `dist`.** Nach Änderungen an den Widgets erst `npm run build`, sonst testet man den alten Stand.
- **Am Handy läuft die Companion über `http://192.168…`, also nicht in einem sicheren Kontext.**
  - `crypto.randomUUID` gibt es dort nicht. Deshalb erzeugt `neueEintragId()` die IDs aus `getRandomValues`.
  - Service Worker gehen dort gar nicht, das ist **N5**.
- **Alte Anmeldungen:** Tokens von vor B2 werden abgelehnt. Die Companion prüft beim Start mit `IDENTITAET.werBistDu()` und öffnet dann das Beitreten. Die Accounts bleiben, auch wenn man `geheim.txt` löscht (nur die Anmeldungen verfallen).
- **Migrationen beim Laden von `daten.json`:**
  - Alte Biom-Punkte werden entfernt, mit Sicherung `daten.vor-welt-import.json`.
  - Fehlende `erstellerId` wird zu „unbekannt“.
- **Am Board kein Bearbeiten:** Das Dashboard ist dort reine Anzeige. Geändert wird nur über `/dashboard/anordnen` (Token) oder ohne Board im Browser-Speicher.
- **Portal-Regeln am Board** sind fest Bedrock. Die Edition ist eine Einstellung je Handy (offene Frage in der Warteliste).
- **Platzhalter-Größen:** Kleine Widgets schneiden ihre Karte ab, zum Beispiel der Sammel-Fortschritt mit 4×3 Zellen. Das ist bekannt und wird mit A7 gelöst.
- **`ENOENT … daten.json.tmp`** in den Server-Tests ist harmlos. Ein verzögertes Speichern trifft auf den schon gelöschten Testordner.
- **Die Startskripte** (`start.bat`, `start.sh`) bauen das Dashboard noch nicht mit. Das ist sinnvoll, sobald `/dashboard` die alte `/anzeige` ablöst.

---

## 8. Was auf Max wartet (Details in `WARTELISTE.md`)

- **Haltepunkte zum Anschauen:**
  - H1: Welt-Import
  - H2: Biom-Prüfung an echten Welten. Dafür braucht es Dateien von Max: `fixture-seed.mcworld` und die Realm-Welt.
  - H3: Raster
  - H4: Galerie mit 13 Typen
  - H5: Themes
  - **H6: Anzeige am Handy anordnen** (der Haltepunkt aus A6)
- **N5:** HTTPS für den Offline-Betrieb (B3–B5). Möglich wären HTTPS am Board mit eigenem Zertifikat (das iPhone vertraut ihm einmal), ein Zertifikat für eine eigene Domain, oder kein Service Worker.
- **Entscheidungen:**
  - A7/E6: Größenstufen und `seitenleistenBreite`
  - E8: Themes für Sammelobjekte, Banner und Rüstung
  - wann `/dashboard` die alte `/anzeige` ablöst
  - Portal-Regeln am Board
- **Inhalte beschreiben:**
  - Koordinatensammlung, Eigene Liste
  - echte Gesamtkarte mit Markern (braucht einen neuen Karten-Block)
  - die Bereiche Handbuch und Baupläne

---

## 9. Nächste Schritte, sobald Antworten da sind

1. **Nach N5:** B3 auf einem eigenen Branch `bereich/offline`, wie es der Bauplan verlangt:
   - `companion/sw.js` mit versioniertem Cache
   - IndexedDB statt `localStorage`
   - Test mit `context.setOffline(true)`
   - Haltepunkt am echten iPhone
   - danach B4 (Offline-Regel, Warteschlange je Account) und B5 (Zustandswechsel, zuerst beim Abhaken der Sammelobjekte)
2. **Nach A7:** echte Stufen statt der Platzhalter im Register, `SEITENLEISTEN_BREITE` setzen, größte Rasterstufe bauen.
3. **Nach E8:** die Platzhalter-Themes in `themes.css` ersetzen. Am Widget-Code ändert sich nichts.
4. **`/dashboard` statt `/anzeige`:** Dafür fehlen „Aufs Board“ (geworfene Karte), der QR-Code zum Beitreten und die Orte mit Kennblöcken. Danach den Anzeige-Link auf `/dashboard` umstellen und die Startskripte das Dashboard mitbauen lassen.
5. **Inhalte**, sobald beschrieben: Typen mit Quelle bekommen ihre Quelle in `widgets.js` (`quellenVon`) und ein Anzeigeschema in `board-karten.js`.
