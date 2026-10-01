# Bauplan: Welt-Import per ZIP mit Anleitung

Stand: 01.10.2026 · Grundlage: Welt-Export-iPhone

Dieser Bauplan beschreibt die technischen Entscheidungen. Die Anpassung an das konkrete Projekt gehört nicht dazu, ebenso wenig das Auslesen der Biome aus den Weltdaten.

## Ziel

Nutzer laden eine Minecraft-Welt als ZIP hoch. Die App prüft den Aufbau und gibt verständliche Hinweise, wenn die ZIP falsch gepackt ist. Eine Anleitung in der App erklärt den Weg über die Dateien-App am iPhone.

## 1. Upload

- Dateiauswahl akzeptiert **`.zip`**. Umbenennen in `.mcworld` ist nicht nötig.
- `.mcworld` ist inhaltlich dasselbe Format und kann zusätzlich angenommen werden, ohne Mehraufwand.
- Entpacken im Browser (z. B. JSZip oder fflate), kein Server-Schritt nötig für die Prüfung.

## 2. Prüfung des ZIP-Aufbaus

Gültig ist eine Welt, wenn auf **oberster Ebene** liegen:

- `level.dat`
- `levelname.txt`
- `db/` (Ordner)

Fehlerfälle mit eigener Meldung:

| Befund | Ursache | Meldung an den Nutzer |
| --- | --- | --- |
| Genau ein Unterordner, darin `level.dat` usw. | Ordner selbst statt Inhalt komprimiert | „Bitte den Weltordner öffnen und den Inhalt komprimieren, nicht den Ordner selbst.“ |
| `level.dat` oder `db/` fehlt | Falscher Ordner oder unvollständig | „Das sieht nicht nach einem Minecraft-Weltordner aus.“ |
| Datei ist keine ZIP | z. B. falsche Datei gewählt | „Bitte die erzeugte Archiv.zip auswählen.“ |

- Weltname aus `levelname.txt` lesen und vor dem Import zur Bestätigung anzeigen.

## 3. Anleitung in der App

- Bezeichnung: **„Weltordner aus der Dateien-App hochladen“**, nicht „Welt exportieren“. Es gibt keinen Export-Button in Minecraft.
- Genau ein Weg, drei Schritte:
  1. Dateien-App: Auf meinem iPhone → Minecraft → games → com.mojang → minecraftWorlds
  2. Richtigen Weltordner über `levelname.txt` finden, Ordner **öffnen**, alles darin auswählen, „Komprimieren“
  3. Die entstandene `Archiv.zip` hier hochladen
- Die Anleitung steht direkt neben dem Upload-Feld.
- Vorerst nur iPhone. Struktur so anlegen, dass weitere Plattformen als eigene Anleitungen ergänzt werden können.

## Nicht Teil dieses Bauplans (offen)

- Anleitung für Android und PC
- Umgang mit nur teilweise generierten Gebieten (Biome existieren nur in besuchten Chunks)
- Auslesen der Biome aus `db/`

## Reihenfolge und Git

1. Upload-Feld mit ZIP-Annahme → Commit „Welt-Upload: ZIP annehmen“
2. Aufbau-Prüfung mit Fehlerfällen und Tests (je eine Test-ZIP pro Fall) → Commit „Welt-Upload: Aufbau prüfen“
3. Anleitung neben dem Upload → Commit „Anleitung Dateien-App iPhone“, danach pushen
