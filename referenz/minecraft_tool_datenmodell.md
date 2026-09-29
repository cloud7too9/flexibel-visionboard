# Minecraft Tool – Minimales Datenmodell

## Dynamische Tabellen

### `World`

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | ID | Eindeutige Welt |
| `seed` | string | Minecraft Seed |

### `Dimension`

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | ID | Eindeutige Dimension |
| `worldId` | FK | Zugehörige Welt |
| `type` | enum | `overworld` / `nether` / `end` |

Jede Welt besitzt:

- Overworld
- Nether
- End

### `FeatureInstance`

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | ID | Eindeutiges Vorkommen |
| `dimensionId` | FK | Dimension |
| `featureTypeId` | FK | Feature Type |
| `x` | number | X-Koordinate |
| `y` | number? | Optionale Y-Koordinate |
| `z` | number | Z-Koordinate |

---

# Statische Tabellen

## `Biome`

| Feld | Typ |
|---|---|
| `id` | ID |
| `name` | string |
| `groups` | Group-Referenzen |
| `dimensions` | Dimension-Referenzen |

### Biomes

#### Plains

- Plains
- Snowy Plains
- Mushroom Fields
- Savanna
- Sunflower Plains
- Ice Spikes

#### Woodlands

- Forest
- Taiga
- Jungle
- Sparse Jungle
- Birch Forest
- Dark Forest
- Snowy Taiga
- Old Growth Pine Taiga
- Flower Forest
- Old Growth Birch Forest
- Old Growth Spruce Taiga
- Bamboo Jungle
- Grove
- Cherry Grove
- Pale Garden
- Dappled Forest

#### Caves

- Dripstone Caves
- Lush Caves
- Deep Dark
- Sulfur Caves

#### Mountains

- Windswept Hills
- Windswept Forest
- Stony Shore
- Savanna Plateau
- Windswept Gravelly Hills
- Windswept Savanna
- Meadow
- Snowy Slopes
- Frozen Peaks
- Jagged Peaks
- Stony Peaks

#### Swamps

- Swamp
- Mangrove Swamp

#### Sandy

- Desert
- Beach
- Snowy Beach
- Badlands
- Wooded Badlands
- Eroded Badlands

#### Water

- Ocean
- River
- Frozen Ocean
- Frozen River
- Deep Ocean
- Warm Ocean
- Lukewarm Ocean
- Cold Ocean
- Deep Lukewarm Ocean
- Deep Cold Ocean
- Deep Frozen Ocean

#### Nether

- Nether Wastes
- Soul Sand Valley
- Crimson Forest
- Warped Forest
- Basalt Deltas

#### End

- The End
- Small End Islands
- End Midlands
- End Highlands
- End Barrens

---

# `Group`

## Terrain

- Land (45)
- Ocean (9)
- River (2)

## Category

- Plains (6)
- Woodlands (16)
- Mountains (11)
- Swamps (2)
- Water (11)
- Caves (4)
- Sandy (6)

## Animal Spawn Biomes

- Warm Farm Animals (14)
- Temperate Farm Animals (20)
- Cold Farm Animals (22)
- Temperate Frogs (32)
- Warm Frogs (12)
- Cold Frogs (12)

---

# `FeatureCategory`

Die folgenden Begriffe sind die von dir genannten Feature-Kategorien.

## Overworld

- Biomes
- Slime Chunk
- Spawn Point
- Village
- Ancient City
- Dungeon
- Stronghold
- Mansion
- Monument
- Mineshaft
- Outpost
- Ruined Portal
- Jungle Temple
- Desert Temple
- Witch Hut
- Shipwreck
- Ocean Ruins
- Cave
- Lava Pool
- Treasure
- Igloo
- Fossil
- Ravine
- Geode
- Apple
- Ore Veins
- Desert Well
- Trail Ruins
- Trial Chamber
- Camp

> `Zoom in to show all selected features` wird nicht als FeatureCategory geführt, da es sich um eine UI-Funktion handelt.

## Nether

- Biomes
- Nether Fortress
- Bastion
- Ruined Portal
- Nether Fossil

## End

- Biomes
- End City
- End Gateway

---

# `FeatureType`

Aktuell sind noch keine vollständigen Feature Types definiert.

Die Struktur ist:

```text
FeatureCategory
└── FeatureType
    └── FeatureInstance
```

Beispiel:

```text
Village
└── Snowy Village
    ├── Instance
    ├── Instance
    └── Instance
```

Dabei gilt:

- `Village` = Feature Category
- `Snowy Village` = Feature Type
- Die einzelnen konkreten Vorkommen = Feature Instances

Es werden keine weiteren Feature Types erfunden, solange sie nicht definiert wurden.

---

# Beziehungen

```text
World
 │
 └── 1:N
      │
   Dimension
      │
      ├── N:M ─── Biome
      │              │
      │              └── N:M ─── Group
      │
      └── 1:N
           │
      FeatureInstance
           │
           └── N:1
                │
           FeatureType
                │
                └── N:1
                     │
                FeatureCategory
```

---

# Koordinaten

Die Koordinatenumrechnung betrifft ausschließlich Overworld und Nether.

```text
Overworld → Nether = ÷ 8
Nether → Overworld = × 8
```

Für das End wird keine Koordinatenumrechnung erfasst.

---

# Aktueller Modellkern

```text
DATABASE
├── World
├── Dimension
└── FeatureInstance

STATIC CONFIG
├── Biome
├── Group
├── FeatureCategory
└── FeatureType
```

Das Modell soll bewusst minimal bleiben. Erweiterungen werden erst vorgenommen, wenn ein konkreter Anwendungsfall zeigt, dass sie benötigt werden.

---

# Erweiterungen (umgesetzt im Board-Server, `koordinaten-board/server/src/daten.js`)

Jede Erweiterung hat einen konkreten Anwendungsfall aus einem Bereich der Companion:

| Tabelle / Feld | Zweck | Bereich |
|---|---|---|
| `FeatureInstance.quelle` | `screenshot` oder `manuell` – neue Varianten und Biome nur aus Screenshots | Karte |
| `FeatureInstance.von`, `.am` | wer den Ort eingetragen hat und wann (Anzeige: „zuletzt gespeichert“, „Neu“) | Karte, Anzeige |
| `FeatureInstance.angeheftet` | groß oben auf der Anzeige im Zimmer | Anzeige |
| Sammel-Status je Welt `{ objektId: { von, am } }` | abgehakte Rüstungsbesätze | Sammelobjekte |
| Portal-Verbindung je Welt `{ name, oberwelt, nether, von, am }` | Portale verknüpfen und prüfen | Portal-Verwaltung |
| Banner `{ name, basis, ebenen, von, am }` | Baupläne, für alle Welten | Banner |
| Einstellungen `{ titel, qrZeigen, aktiveWelt }` | was die Anzeige im Zimmer zeigt | Anzeige |

`FeatureType` ist welt-übergreifend (eine Variante wie „Stairway“ gilt in allen Welten). Dimensionen werden nicht gespeichert, sondern je Welt abgeleitet (`d_<welt>_<type>`).
