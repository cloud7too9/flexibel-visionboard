# Welt-Export vom iPhone: Anleitung in der App

Stand: 01.10.2026

## Ausgangslage

Die Biome für die Karte kommen ausschließlich aus exportierten Minecraft-Welten. Nutzer müssen ihre Welt dafür selbst vom iPhone holen. Die App übernimmt das nicht automatisch, sie enthält nur eine Anleitung.

Eine fremde Anleitung beschrieb den Weg über die Dateien-App: Weltordner kopieren, komprimieren und die ZIP in `.mcworld` umbenennen.

## Erkenntnisse

- **Es gibt keinen Export-Button.** Die gesamte Minecraft-App wurde am iPhone durchsucht, die Funktion ist nirgends auffindbar.
- **Eine fertige `.mcworld` liegt nicht im Dateisystem.** Minecraft speichert Welten immer als entpackte Ordner. `.mcworld` ist nur ein Verpackungsformat für den Export und entspricht inhaltlich einer ZIP des Ordnerinhalts.
- **Der Weg über die Dateien-App funktioniert.** Der Weltordner ist erreichbar, und die Daten ließen sich entnehmen.
- **Die fremde Anleitung hat zwei Fehlerquellen:**
  - Wird der Ordner selbst komprimiert, liegt er in der ZIP als Unterordner. Bei einer echten `.mcworld` liegen `level.dat`, `levelname.txt` und `db/` auf oberster Ebene.
  - Das Umbenennen in `.mcworld` scheitert leicht, weil iOS Endungen ausblendet und dann `…mcworld.zip` entsteht.

## Lösung

Die App nimmt **`.zip` an**, deshalb entfällt das Umbenennen. Die Anleitung besteht aus nur einem Weg mit drei Schritten:

1. In der Dateien-App öffnen: Auf meinem iPhone → Minecraft → games → com.mojang → minecraftWorlds
2. Den richtigen Weltordner über `levelname.txt` finden, ihn **öffnen**, alles darin auswählen und „Komprimieren“ wählen
3. Die entstandene `Archiv.zip` in der App hochladen

Die Anleitung erscheint nicht unter „Welt exportieren“, sondern unter einer Bezeichnung wie **„Weltordner aus der Dateien-App hochladen“**. So sucht niemand nach einem Button, den es nicht gibt.

## Offene Punkte

- [ ] Soll die Anleitung auch Android und PC abdecken oder vorerst nur iPhone?
- [ ] Biome stehen nur in bereits generierten Chunks. Reicht eine Karte, die nur besuchte Gebiete zeigt?
