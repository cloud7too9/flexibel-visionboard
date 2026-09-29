# Rüstungs-Baukasten (Minecraft Bedrock)

Grafiken und Logik, um Rüstungsteile mit Besatz-Muster, Besatz-Material, Lederfarbe und Verzauberungs-Glanz zu kombinieren.
Alle Texturen stammen aus Mojangs `bedrock-samples` (resource_pack/textures), die deutschen Namen aus `texts/de_DE.lang`.

## Ordner

| Ordner | Inhalt |
|---|---|
| `items/` | Inventar-Icons 16×16 aller Rüstungsteile (Leder, Kette, Eisen, Gold, Diamant, Netherit, Kupfer, Schildkrötenpanzer). Leder ist geteilt: `leather_<teil>.png` (Graustufen, wird eingefärbt) + `leather_<teil>_overlay.png` (ungefärbte Details). |
| `modell/` | Rüstungstexturen fürs Spielermodell, 64×32 im klassischen Skin-Layout. `_1` = Helm, Harnisch, Stiefel. `_2` = Beinschutz. Leder wieder mit `_overlay`. |
| `besatz/muster/` | 18 Besatz-Muster als Graustufen: `<muster>.png` für Ebene 1, `<muster>_leggings.png` für Ebene 2. |
| `besatz/items/` | Besatz-Overlay für die Inventar-Icons (je Teil eins, für alle Muster gleich). |
| `besatz/paletten/` | `trim_palette.png` (8 Grauwerte = Schlüssel) und je Material eine 8-Farben-Palette, bei Eisen, Gold, Diamant, Netherit und Kupfer zusätzlich `_darker`. |
| `effekte/` | Glanz-Texturen für Item und Modell. |
| `skin/steve.png` | Standard-Skin als Träger für die Figur. |
| `traeger/armor_stand.png` | Textur des Rüstungsständers. Das Modell (Würfel aus `armor_stand.geo.json`) steht im Manifest unter `traeger.staender`. |
| `bloecke/` | Hintergrund- und Sockeltexturen je Dimension (Deepslate, Netherrack, Obsidian, polierter Deepslate, polierter Schwarzstein, Endsteinziegel) plus Steinstufe. |
| `slots/` | Leere Rüstungsslots (Platzhalter). |
| `vorlagen/`, `zutaten/` | Icons der Schmiedevorlagen und Besatz-Materialien für die Auswahl-UI. |
| `fertig/items/` | 1116 vorgerenderte Item-Icons aller Kombinationen. Schema: `<ruestung>_<teil>[_<farbstoff>][__<material>].png` |
| `manifest.json` | Alle Namen, Pfade, Paletten (als Hex), Farbstoffe und Regeln. |
| `baukasten.js` | ES-Modul ohne Abhängigkeiten: `itemIcon()`, `ruestungsEbene()`, `figur()` (flache 2D-Figur). |
| `figur3d.js` | 3D-Figur mit three.js (r128 oder neuer): Rüstungsständer oder Steve auf einem Sockel, drehbar. |

## Regeln (so rechnet das Spiel)

1. **Besatz umfärben:** Muster-Pixel haben einen der 8 Grauwerte aus `trim_palette.png` (224, 192, 160, 128, 96, 64, 32, 0). Jeder Grauwert wird durch die Farbe an derselben Position in der Material-Palette ersetzt.
2. **Dunklere Palette:** Ist das Besatz-Material gleich dem Rüstungsmaterial (Eisen auf Eisen, Gold auf Gold, Diamant, Netherit, Kupfer), wird `<material>_darker` genommen.
3. **Leder färben:** Graustufen-Pixel × Farbe (Multiplikation je Kanal), dann das Overlay unverändert darüber. Ungefärbt = `#A06540`. Farbstoff-Werte stehen im Manifest (Bedrock-Weiß ist `#F0F0F0`).
4. **Reihenfolge je Teil:** Grundtextur → Besatz → Glanz.
5. **Inventar-Icon:** zeigt nur die Besatz-Farbe, nicht das Muster. Das Muster ist nur am getragenen Modell sichtbar.
6. **Figur:** Ebene 1 wird um 1 px aufgebläht, Ebene 2 um 0,5 px. Zeichenfolge: Beinschutz, Stiefel, Harnisch, Helm.

## Einsatz

```js
import { erstelleBaukasten } from './ruestungs-baukasten/baukasten.js';
const manifest = await (await fetch('./ruestungs-baukasten/manifest.json')).json();
const bk = erstelleBaukasten({ manifest, basisPfad: './ruestungs-baukasten/' });

const icon = await bk.itemIcon({ ruestung: 'leather', teil: 'helmet', farbe: '#b02e26', material: 'gold' });
const figur = await bk.figur({
  ansicht: 'vorn', massstab: 8,
  ausruestung: {
    helmet:     { ruestung: 'iron', muster: 'coast', material: 'iron' },
    chestplate: { ruestung: 'diamond', muster: 'silence', material: 'gold', glanz: true },
    leggings:   { ruestung: 'leather', farbe: '#3c44aa', muster: 'wild', material: 'emerald' },
    boots:      { ruestung: 'netherite', muster: 'rib', material: 'redstone' },
  },
});
document.body.append(icon, figur); // CSS: image-rendering: pixelated
```

### 3D-Figur

```js
import { erstelleFigur3D } from './ruestungs-baukasten/figur3d.js';
// three.js vorher laden, z. B. <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">
const fig = erstelleFigur3D({ THREE, baukasten: bk, canvas: document.querySelector('#figur'), breite: 360, hoehe: 480 });
await fig.setzen({
  traeger: 'staender',                       // oder 'steve'
  sockel: manifest.dimensionen[0].sockel,    // Oberwelt, Nether, End
  ausruestung: { helmet: { ruestung: 'netherite', muster: 'eye', material: 'redstone' } },
});
fig.drehen(-0.55, 0.16);                     // Blickwinkel und Neigung in Radiant
fig.glanzTick(phase);                        // nur nötig, wenn ein Teil glanz: true hat
```

Rechte: Texturen © Mojang Studios, Nutzung nach den Minecraft Usage Guidelines (minecraft.net/usage-guidelines).

## Showcase-Ansicht

`../ruestungs-showcase.html` ist die aktuelle Ansicht als einzelne Datei (alle Grafiken eingebettet, three.js per CDN).
Rezept-Slots öffnen Dropdowns für Vorlage, Rüstung und Material; die Rüstung links zeigt die Grundform, der Besatz ist nur an der 3D-Figur sichtbar.
Die Download-Buttons funktionieren nur in der Claude-Vorschau; im Companion durch eigene Downloads ersetzen.
