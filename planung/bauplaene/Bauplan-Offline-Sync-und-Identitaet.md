# Bauplan: Offline-Sync und Identität

Stand: 01.10.2026 · Grundlage: Offline-Sync-und-Identitaet

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt (Koordinaten-Board, Companion PWA, Server) gehört nicht dazu.

## Leitlinie

**Strukturen jetzt einbauen, Ausbaustufen später.** Felder und Schnittstellen existieren von Anfang an, auch wenn sie vorerst nur einen Wert kennen.

## 1. Rollen der Geräte

| Rolle | Gerät | Darf |
| --- | --- | --- |
| Anzeige | Board im Raum | Nur anzeigen. Keine Entscheidungen, keine Bestätigungen |
| Tool | Handy | Anlegen, bearbeiten, Zustände wechseln, Entscheidungen treffen |

Board-Oberfläche enthält keine Bedienelemente, die Bestätigungen oder Entscheidungen auslösen.

## 2. Datenmodell

```ts
interface Eintrag {
  id: string;            // auf dem Client erzeugt (UUID), damit offline anlegen möglich ist
  erstellerId: string;   // stabile Benutzer-ID, nie Anzeigename
  syncStatus: "lokalNeu" | "synchronisiert";
  // … fachliche Felder
}

interface Benutzer {
  id: string;            // stabil
  anzeigename: string;   // nur Anzeige, nie Schlüssel
  rolle: "Besitzer";     // Rollenfeld existiert, vorerst überall "Besitzer"
}

interface Profil {
  id: string;
  benutzerId: string;
  geteilt: boolean;      // geteiltes Gerät → eigenes, gekennzeichnetes Profil
}

interface Geraet {
  id: string;
  freigeschaltet: boolean;
  typ: "persoenlich" | "geteilt";
  profilId: string;      // Gerät trägt das Vertrauen, Profil die Zuordnung
}
```

## 3. Offline-Betrieb

- **Service Worker** hält die App offline lauffähig (App-Shell cachen).
- Lokale Datenhaltung in IndexedDB.
- **Grundregel:** Bestehende Daten (`syncStatus = "synchronisiert"`) sind offline **unveränderlich**.
- Offline erlaubt:
  - neue Einträge anlegen (`syncStatus = "lokalNeu"`)
  - Einträge mit `syncStatus = "lokalNeu"` ändern
  - Zustandswechsel (siehe Abschnitt 5)
- Die UI sperrt Bearbeiten von synchronisierten Einträgen, solange keine Verbindung besteht.

## 4. Warteschlange

```ts
interface Anfrage {
  id: string;
  benutzerId: string;     // Warteschlange pro Identität
  klasse: "automatisch" | "pruefpflichtig";
  art: "anlegen" | "aendernEigenNeu" | "zustandswechsel" | "aendernBestehend" | "loeschen";
  eintragId: string;
  daten: unknown;
  erstelltAm: string;
}
```

| Klasse | Arten | Verhalten beim Sync |
| --- | --- | --- |
| automatisch | anlegen, aendernEigenNeu, zustandswechsel | Sofort übertragen |
| pruefpflichtig | aendernBestehend, loeschen | Konfliktprüfung, wartet auf Bestätigung |

- Beim Sync werden **nur Anfragen der angemeldeten Identität** gesendet.
- Klasse wird aus `art` abgeleitet, nicht frei gesetzt.
- **Aktueller Umfang:** Es wird nichts gelöscht, und Zustandswechsel laufen automatisch. Die Klasse `pruefpflichtig` existiert im Modell, der Bestätigungsmechanismus wird **noch nicht gebaut**.

Ausbaustufe Postfach (später, nur Struktur vorhalten):

- Postfach am Handy listet offene prüfpflichtige Anfragen.
- Anfragen **verfallen nicht**.
- Zur Entscheidung wird der aktuelle Serverstand neben der Anfrage gezeigt.
- Bestätigung **nur am Handy**.
- Das Board zeigt betroffene Einträge bis zur Entscheidung unverändert an.

## 5. Zustandswechsel

- Modellieren als Setzen eines Zielzustands, nicht als Umschalten: `{ eintragId, zustand: "erledigt" }`.
- Dadurch idempotent: Setzen zwei Personen unabhängig auf „erledigt“, ist das Ergebnis gleich.
- Bekannt ist bisher nur `"offen" → "erledigt"`. Zustände als erweiterbare Aufzählung anlegen.

## 6. Identität und Anmeldung

- Feste Anmeldung an einen Account statt freiem Namen.
- Anmeldeverfahren **gekapselt** hinter einer Schnittstelle:

```ts
interface IdentitaetsAnbieter {
  werBistDu(): Promise<Benutzer | null>;
}
```

- Erste Implementierung: **leichtgewichtig**, z. B. Gerätecode, der einmal freigeschaltet wird. Konkretes Verfahren ist noch offen.
- Später austauschbar gegen vollwertiges Login, ohne Datenmigration, weil alle Daten an `Benutzer.id` hängen.
- Modul so schneiden, dass es in andere Projekte übernommen werden kann.

## 7. Geräte

| Typ | Verhalten |
| --- | --- |
| Persönlich | Freigeschaltet, dauerhaft einer Person zugeordnet |
| Geteilt | Eigenes Profil mit `geteilt = true`; Postfach gehört allen Nutzern des Geräts |

Einschränkung beachten: Geteilte Profile sind für Anlegen und Zustandswechsel unproblematisch, haben für prüfpflichtige Anfragen aber keinen echten Besitzer.

## Ausbaustufen (nicht jetzt)

- Rollen- und Rechteverwaltung: wer prüfpflichtige Anfragen bestätigen darf
- Information von Entscheider-Rollen über mögliche Konflikte
- Protokoll: wer hat wann was entschieden
- Postfach mit Bestätigungs-UI

## Nicht Teil dieses Bauplans (offen)

- Konkretes Anmeldeverfahren
- Ablauf der Gerätefreischaltung am Board
- Entscheidung über prüfpflichtige Anfragen bei geteilten Profilen
- Weitere Zustandswechsel neben „offen → erledigt“

## Reihenfolge und Git

1. Datenmodell mit `erstellerId`, `syncStatus`, Rollenfeld → Commit „Datenmodell: stabile Benutzer-ID und Sync-Status“
2. `IdentitaetsAnbieter` mit Gerätecode-Platzhalter → Commit „Identität gekapselt“
3. Service Worker und IndexedDB → Commit „Offline-Betrieb mit Service Worker“, danach pushen
4. Sperre für synchronisierte Einträge offline → Commit „Offline-Regel: Bestehendes unveränderlich“
5. Warteschlange pro Identität, nur Klasse automatisch aktiv → Commit „Sync-Warteschlange“
6. Zustandswechsel idempotent → Commit „Zustandswechsel offline“, danach pushen

Vor Schritt 3 einen eigenen Branch anlegen; Service-Worker-Caching kann alte Stände festhalten und ist leichter isoliert zu testen.
