# Offline-Sync und Identität: Koordinaten-Board und Companion

Stand: 01.10.2026

## 1. Trennung von Anzeige und Tool

### Ausgangslage

Das Koordinaten-Board und die Companion PWA laufen aktuell zu einem System zusammen. Anzeige und Tool stecken in einer Anwendung, und das soll stärker getrennt werden.

### Lösung

| Rolle | Gerät | Aufgabe |
| --- | --- | --- |
| Anzeige | Board im Raum | Öffentlicher Bildschirm, jeder hat Zugriff, keine Entscheidungen |
| Tool | Handy | Persönlicher Client: anlegen, bearbeiten, Entscheidungen treffen |

Entscheidungen gehören dorthin, wo die Identität sitzt, also aufs Handy.

## 2. Offline-Betrieb

### Ausgangslage

Das Handy soll auch ohne Serververbindung weiterlaufen und Inhalte erweitern können. Beim nächsten Serverkontakt soll alles übertragen werden. Freie Änderungen an allen Daten würden dabei zu viele Konflikte erzeugen.

### Lösung

- Ein **Service Worker** hält die App offline lauffähig.
- **Grundregel: Bestehende Daten sind offline unveränderlich.**
- Offline dürfen nur **neue Einträge angelegt** und diese **neu angelegten Einträge geändert** werden.
- Neue Einträge gehören ausschließlich ihrem Ersteller, deshalb können sie nicht in Konflikt geraten.

## 3. Warteschlange mit zwei Klassen

### Ausgangslage

Neues soll beim Verbinden sofort auf den Server. Eingriffe in bestehende Daten, zum Beispiel Löschen, dürfen aber nicht ungeprüft durchlaufen. Rein lokales Ausblenden, bei dem der Eintrag beim Sync wieder auftaucht, wäre frustrierend.

### Lösung

| Klasse | Beispiele | Verhalten beim Sync |
| --- | --- | --- |
| Automatisch | Neue Einträge, Änderungen an eigenen neuen Einträgen, Zustandswechsel | Wird sofort übertragen |
| Prüfpflichtig | Löschen oder Ändern bestehender Daten | Wird auf Konflikte geprüft und wartet auf Bestätigung |

- Die Warteschlange wird **pro Identität** geführt, damit niemand fremde offene Anfragen mitschickt.
- Die Bestätigung erfolgt **nur am Handy**, nie am Board.
- Das Handy hat ein **Postfach** mit offenen Anfragen. Die Anfragen verfallen nicht, sie bleiben liegen, bis sie abgearbeitet sind.
- Zur Entscheidung wird der aktuelle Serverstand neben der Anfrage angezeigt.
- Das Board zeigt betroffene Einträge bis zur Entscheidung vorerst normal weiter an.

## 4. Zustandswechsel

### Ausgangslage

Aktuell wird nichts gelöscht. Der wichtigste Offline-Fall ist der Wechsel eines Zustands, zum Beispiel wenn eine Aufgabe an einer Koordinate von „offen“ auf „erledigt“ gesetzt wird.

### Lösung

Ein Zustandswechsel ist praktisch konfliktfrei: Setzen zwei Personen unabhängig voneinander auf „erledigt“, ist das Ergebnis dasselbe. Zustandswechsel laufen deshalb **automatisch** durch wie neue Einträge. Für den aktuellen Umfang entfällt damit der Bestätigungsmechanismus vorerst.

## 5. Identität und Anmeldung

### Ausgangslage

Bisher gibt man bei der Anmeldung optional einen Namen an. Sobald Anfragen und Postfächer jemandem gehören, reicht das nicht mehr.

### Lösung

- Es gibt eine **feste Anmeldung an einen Account** statt eines freien Anzeigenamens.
- Jeder Eintrag trägt von Anfang an eine **stabile Benutzer-ID**, nicht den Anzeigenamen.
- Die Anmeldung ist **vorerst leichtgewichtig**, etwa über einen Gerätecode, der einmal freigeschaltet wird.
- Das Anmeldeverfahren ist **gekapselt und austauschbar**: Das System fragt nur „wer bist du“, und dahinter kann später ein vollwertiges Login stehen, ohne dass die Daten angefasst werden müssen. So bleibt es für andere Projekte wiederverwendbar.

## 6. Geräte: persönlich oder geteilt

### Ausgangslage

Ein Gerät freizuschalten ist sicherer. Manche Geräte werden aber von mehreren Personen bedient, andere nur von einer.

### Lösung

| Gerätetyp | Verhalten |
| --- | --- |
| Persönlich | Freigeschaltet und dauerhaft einer Person zugeordnet |
| Geteilt | Bekommt ein eigenes Profil, das als „geteilt“ gekennzeichnet ist |

Das Gerät trägt das Vertrauen, das Profil trägt die Zuordnung.

**Einschränkung:** Beim geteilten Profil gehört das Postfach allen Nutzern des Geräts. Für Anlegen und Zustandswechsel ist das unproblematisch, für Konfliktfälle wie Löschen bräuchte es aber einen echten Besitzer.

## 7. Ausblick: großes System mit vielen Nutzern

### Ausgangslage

Das Tool wird für zu Hause gebaut, soll aber wie ein großes System aufgebaut sein. Es soll zugleich ein echtes Werkzeug und ein Lernprojekt mit Blick auf den Berufseinstieg sein.

### Lösung

- Eine **Rollen- und Rechteverteilung** legt fest, wer prüfpflichtige Anfragen bestätigen darf. Die Mechanik der Warteschlange bleibt dabei unverändert.
- Entscheider-Rollen werden über mögliche Konflikte informiert, und eine zusätzliche Absicherung bleibt bestehen.
- Ein **Protokoll** hält fest, wer wann was entschieden hat. Bei vielen Nutzern ist das die eigentliche Absicherung.
- **Leitlinie:** Strukturen jetzt einbauen, Ausbaustufen erst später. Ein Rollenfeld existiert also schon, in dem vorerst überall „Besitzer“ steht, aber noch keine Rechteverwaltung.

## Offene Punkte

- [ ] Wer entscheidet bei geteilten Profilen über prüfpflichtige Anfragen, falls dort doch gelöscht wird?
- [ ] Konkretes leichtgewichtiges Anmeldeverfahren festlegen (z. B. Gerätecode)
- [ ] Ablauf der Gerätefreischaltung am Board
- [ ] Welche Zustandswechsel gibt es neben „offen → erledigt“?
