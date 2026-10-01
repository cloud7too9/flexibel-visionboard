# Widget-Größensystem für das Leitstand-Dashboard

Stand: 01.10.2026

## Ausgangslage

Das Dashboard zeigt mehrere Widgets gleichzeitig an; jedes Widget bringt eigene Größenstufen mit, und je größer die Stufe, desto mehr Informationen zeigt es.

Das Problem: Beim Entwerfen der Widget-Ansichten in anderen Tools sollen die Größen frei variieren dürfen. Im Dashboard selbst sind aber nur feste Größen einstellbar, und alle Widgets müssen sich am Ende lückenlos auf verschiedenen Geräten anordnen lassen.

Erste Überlegung war ein Pixel-Raster, etwa nur jeder fünfte Pixel als Größenende.

## Lösung: Zellen-Raster statt Pixel-Raster

Gerastert wird in abstrakten Zellen, nicht in Pixeln. Ein Pixel-Raster liefert zwar saubere Sprünge, passt aber nicht automatisch zur Bildschirmbreite der verschiedenen Geräte.

Das Dashboard hat eine feste Spaltenzahl (Beispiel: 12), unabhängig von der Bildschirmbreite. Die tatsächliche Pixelgröße einer Zelle rechnet das Dashboard pro Gerät selbst aus.

Widgets belegen immer ganze Zellen. Dadurch sprechen alle Widgets dieselbe Sprache und ordnen sich lückenlos an.

Freie Variation beim Entwurf bleibt erlaubt: Krumme Entwurfsmaße werden auf die nächste ganze Zelle gerundet, bevor sie in den Vertrag wandern. Die Rundung ist der Übergang von der freien Design-Welt in die saubere Dashboard-Welt.

## Größen-Vertrag zwischen Dashboard und Widget

Der Vertrag hat zwei Ebenen, und beide sprechen ausschließlich in ganzen Zellen.

| Seite | Legt fest |
| --- | --- |
| Dashboard | Globales Raster: feste Spaltenzahl, Seitenverhältnis einer Zelle, Umrechnung Zelle → Pixel pro Gerät |
| Widget | Angebotene Größenstufen, Mindestgröße, optional Maximalgröße |

Jede Größenstufe eines Widgets beschreibt sich über vier Angaben:

- Name der Stufe (z. B. klein, mittel, groß)
- Breite in Zellen
- Höhe in Zellen
- Informationsumfang, der bei dieser Stufe angezeigt wird

Mit Mindest- und Maximalgröße kann das Dashboard bei der Anordnung jederzeit prüfen, ob eine Stufe in den verfügbaren Platz passt.

## Größte Stufe und Vollbild

Die größte reguläre Stufe wird bewusst so bemessen, dass daneben gerade noch eine Spalte bzw. Reihe weiterer Widgets Platz hat. Über allen Rasterstufen gibt es zusätzlich eine Sonderstufe Vollbild.

| Stufe | Belegung | Einsatz |
| --- | --- | --- |
| Kleine bis große Stufen | Ganze Zellen im Raster | Normale Dashboard-Ansicht mit mehreren Widgets |
| Größte Rasterstufe | Gesamtbreite minus eine Widget-Spalte | Geteilter Bildschirm: ein Haupt-Tool plus Seitenleiste aus kleinen Widgets |
| Vollbild | Gesamte sichtbare Fläche, außerhalb des Rasters | Ein Tool allein, mit vollem Informationsumfang |

Damit kann jedes eigene Tool wahlweise als Vollbild laufen oder auf einem geteilten Bildschirm neben anderen Widgets.

## Offene Punkte

- [ ] Konkrete Spaltenzahl festlegen (12 ist nur ein Beispiel)
- [ ] Seitenverhältnis einer Zelle festlegen
- [ ] Verhalten auf dem Handy: Reduziert sich die Spaltenzahl, und was passiert dann mit der größten Stufe?
- [ ] Ist Vollbild eine Pflicht-Stufe für jedes Widget oder optional?
