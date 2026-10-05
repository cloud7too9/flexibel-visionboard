# Banner-Icons (Bedrock)

Für die Anleitung im Banner-Detail: Wolle und Stock (Werkbank), Farbstoffe und Bannervorlage (Webstuhl).

Quelle wie beim Rüstungs-Baukasten: Mojangs [`bedrock-samples`](https://github.com/Mojang/bedrock-samples), Branch `main`, `resource_pack/textures/`, unverändert, nur umbenannt (05.10.2026):

| Datei | Original |
|---|---|
| `wolle_<farbe>.png` | `blocks/wool_colored_<farbe>.png` (Hellgrau = `silver`) |
| `farbstoff_<farbe>.png` | `items/dye_powder_<farbe>.png`; Weiß, Schwarz, Blau, Braun die neuen Farbstoffe `dye_powder_<farbe>_new.png` (nicht Knochenmehl, Tintenbeutel, Lapislazuli, Kakaobohnen) |
| `stock.png` | `items/stick.png` |
| `bannervorlage.png` | `items/banner_pattern.png` (Bedrock nutzt ein Bild für alle Bannervorlagen) |

`<farbe>` sind die IDs aus `FARBEN` in `regeln.js`.
