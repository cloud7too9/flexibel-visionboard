/* ============================================================================
   Companion · STAMMDATEN UND REGELN (gemeinsam mit dem Board-Server)
   ----------------------------------------------------------------------------
   Klassisches Script, kein Modul: companion-prototyp.html bindet es per
   <script src="regeln.js"> ein und läuft so auch direkt als Datei (file://).
   Der Board-Server lädt dieselbe Datei mit node:vm
   (koordinaten-board/server/src/regeln.js) – Handy und Server prüfen also mit
   genau denselben Regeln. Deshalb hier nur reine Daten und Funktionen:
   kein DOM, kein fetch, keine Oberfläche.
   ========================================================================== */
"use strict";

const WELTGRENZE = 30000000;   // Minecraft-Weltgrenze ±30 Mio.

/* ---- Dimensionen ------------------------------------------------------- */
const DIM_ORDER = Object.freeze(["overworld", "nether", "end"]);
const DIM_LABEL = Object.freeze({ overworld:"Oberwelt", nether:"Nether", end:"End" });
const dimLabel = (d) => DIM_LABEL[d] ?? d;
const inDim = (d) => (d === "overworld" ? "in der Oberwelt" : `im ${dimLabel(d)}`);

/* ---- Kategorien und Biome (Datenmodell) --------------------------------- */
const EIGENE_ORTE = "Eigene Orte";
const BIOMES = "Biomes";

// FeatureCategory je Dimension (Reihenfolge wie in der Seed Map)
const FEATURE_KATEGORIEN = Object.freeze({
  overworld: ["Biomes", "Slime Chunk", "Spawn Point", "Village", "Ancient City", "Dungeon", "Stronghold",
    "Mansion", "Monument", "Mineshaft", "Outpost", "Ruined Portal", "Jungle Temple", "Desert Temple",
    "Witch Hut", "Shipwreck", "Ocean Ruins", "Cave", "Lava Pool", "Treasure", "Igloo", "Fossil", "Ravine",
    "Geode", "Apple", "Ore Veins", "Desert Well", "Trail Ruins", "Trial Chamber", "Camp"],
  nether: ["Biomes", "Nether Fortress", "Bastion", "Ruined Portal", "Nether Fossil"],
  end: ["Biomes", "End City", "End Gateway"],
});

// Biome nach Kategorie-Gruppe; Nether/End bestimmen die Dimension
const BIOM_GRUPPEN = Object.freeze({
  Plains: ["Plains", "Snowy Plains", "Mushroom Fields", "Savanna", "Sunflower Plains", "Ice Spikes"],
  Woodlands: ["Forest", "Taiga", "Jungle", "Sparse Jungle", "Birch Forest", "Dark Forest", "Snowy Taiga",
    "Old Growth Pine Taiga", "Flower Forest", "Old Growth Birch Forest", "Old Growth Spruce Taiga",
    "Bamboo Jungle", "Grove", "Cherry Grove", "Pale Garden", "Dappled Forest"],
  Caves: ["Dripstone Caves", "Lush Caves", "Deep Dark", "Sulfur Caves"],
  Mountains: ["Windswept Hills", "Windswept Forest", "Stony Shore", "Savanna Plateau", "Windswept Gravelly Hills",
    "Windswept Savanna", "Meadow", "Snowy Slopes", "Frozen Peaks", "Jagged Peaks", "Stony Peaks"],
  Swamps: ["Swamp", "Mangrove Swamp"],
  Sandy: ["Desert", "Beach", "Snowy Beach", "Badlands", "Wooded Badlands", "Eroded Badlands"],
  Water: ["Ocean", "River", "Frozen Ocean", "Frozen River", "Deep Ocean", "Warm Ocean", "Lukewarm Ocean",
    "Cold Ocean", "Deep Lukewarm Ocean", "Deep Cold Ocean", "Deep Frozen Ocean"],
  Nether: ["Nether Wastes", "Soul Sand Valley", "Crimson Forest", "Warped Forest", "Basalt Deltas"],
  End: ["The End", "Small End Islands", "End Midlands", "End Highlands", "End Barrens"],
});
const BIOME = Object.freeze(Object.entries(BIOM_GRUPPEN).flatMap(([gruppe, namen]) =>
  namen.map((name) => Object.freeze({
    name, gruppe, dimension: gruppe === "Nether" ? "nether" : gruppe === "End" ? "end" : "overworld",
  }))));
const biomFinden = (name) => BIOME.find((b) => b.name.toLowerCase() === String(name || "").trim().toLowerCase()) || null;

/* ---- Sammelobjekte ------------------------------------------------------ */
/* Sammelobjekte: Rüstungs-Modifikationen (Schmiedevorlagen). Deutsche Namen wie in
   Bedrock (texts/de_DE.lang, z. B. „Wächterzier“), englischer Name daneben.
   Fundort = FeatureCategory der Karte → Verknüpfung zu bekannten Orten.
   Stand: 18 Rüstungsbesätze (inkl. Fluss/Blitz aus 1.21) + Netheritaufwertung. */
const SAMMELOBJEKTE = Object.freeze([
  { id:"sentry",    name:"Wächterzier",    en:"Sentry",     kategorie:"Outpost",         dim:"overworld", quelle:"Truhe im Plünderer-Außenposten" },
  { id:"dune",      name:"Dünenzier",      en:"Dune",       kategorie:"Desert Temple",   dim:"overworld", quelle:"Truhe im Wüstentempel" },
  { id:"wild",      name:"Wilde Zier",     en:"Wild",       kategorie:"Jungle Temple",   dim:"overworld", quelle:"Truhe im Dschungeltempel" },
  { id:"coast",     name:"Küstenzier",     en:"Coast",      kategorie:"Shipwreck",       dim:"overworld", quelle:"Schatz-, Karten- oder Vorratstruhe im Schiffswrack" },
  { id:"wayfinder", name:"Wegfinderzier",  en:"Wayfinder",  kategorie:"Trail Ruins",     dim:"overworld", quelle:"Seltsamer Kies – mit dem Pinsel freilegen" },
  { id:"raiser",    name:"Erheberzier",    en:"Raiser",     kategorie:"Trail Ruins",     dim:"overworld", quelle:"Seltsamer Kies – mit dem Pinsel freilegen" },
  { id:"shaper",    name:"Formerzier",     en:"Shaper",     kategorie:"Trail Ruins",     dim:"overworld", quelle:"Seltsamer Kies – mit dem Pinsel freilegen" },
  { id:"host",      name:"Hüterzier",      en:"Host",       kategorie:"Trail Ruins",     dim:"overworld", quelle:"Seltsamer Kies – mit dem Pinsel freilegen" },
  { id:"vex",       name:"Plagegeistzier", en:"Vex",        kategorie:"Mansion",         dim:"overworld", quelle:"Truhe im Waldanwesen" },
  { id:"tide",      name:"Gezeitenzier",   en:"Tide",       kategorie:"Monument",        dim:"overworld", quelle:"Drop vom Großen Wächter im Ozeanmonument" },
  { id:"ward",      name:"Mündelzier",     en:"Ward",       kategorie:"Ancient City",    dim:"overworld", quelle:"Truhe in der Antiken Stätte" },
  { id:"silence",   name:"Stillezier",     en:"Silence",    kategorie:"Ancient City",    dim:"overworld", quelle:"Truhe in der Antiken Stätte – sehr selten" },
  { id:"bolt",      name:"Blitzzier",      en:"Bolt",       kategorie:"Trial Chamber",   dim:"overworld", quelle:"Tresor in der Prüfungskammer" },
  { id:"flow",      name:"Flusszier",      en:"Flow",       kategorie:"Trial Chamber",   dim:"overworld", quelle:"Unheilvoller Tresor in der Prüfungskammer" },
  { id:"eye",       name:"Augenzier",      en:"Eye",        kategorie:"Stronghold",      dim:"overworld", quelle:"Truhe am Altar oder in der Bibliothek der Festung" },
  { id:"rib",       name:"Rippenzier",     en:"Rib",        kategorie:"Nether Fortress", dim:"nether",   quelle:"Truhe in der Netherfestung" },
  { id:"snout",     name:"Schnauzezier",   en:"Snout",      kategorie:"Bastion",         dim:"nether",   quelle:"Truhe in der Bastionsruine" },
  { id:"netherite", name:"Netheritaufwertung", en:"Netherite Upgrade", kategorie:"Bastion",         dim:"nether",   quelle:"Truhe in der Bastionsruine, in der Schatzkammer am häufigsten", aufwertung:true },
  { id:"spire",     name:"Turmzier",       en:"Spire",      kategorie:"End City",        dim:"end",      quelle:"Truhe in der Endsiedlung" },
]);

/* ---- Banner: Farben, Muster, Webstuhl ----------------------------------- */
const FARBEN = Object.freeze([
  { id:"white",      de:"Weiß",     wolle:"Weiße Wolle",     farbstoff:"Weißer Farbstoff",     hex:"#f9fffe" },
  { id:"light_gray", de:"Hellgrau", wolle:"Hellgraue Wolle", farbstoff:"Hellgrauer Farbstoff", hex:"#9d9d97" },
  { id:"gray",       de:"Grau",     wolle:"Graue Wolle",     farbstoff:"Grauer Farbstoff",     hex:"#474f52" },
  { id:"black",      de:"Schwarz",  wolle:"Schwarze Wolle",  farbstoff:"Schwarzer Farbstoff",  hex:"#1d1d21" },
  { id:"brown",      de:"Braun",    wolle:"Braune Wolle",    farbstoff:"Brauner Farbstoff",    hex:"#835432" },
  { id:"red",        de:"Rot",      wolle:"Rote Wolle",      farbstoff:"Roter Farbstoff",      hex:"#b02e26" },
  { id:"orange",     de:"Orange",   wolle:"Orange Wolle",    farbstoff:"Oranger Farbstoff",    hex:"#f9801d" },
  { id:"yellow",     de:"Gelb",     wolle:"Gelbe Wolle",     farbstoff:"Gelber Farbstoff",     hex:"#fed83d" },
  { id:"lime",       de:"Hellgrün", wolle:"Hellgrüne Wolle", farbstoff:"Hellgrüner Farbstoff", hex:"#80c71f" },
  { id:"green",      de:"Grün",     wolle:"Grüne Wolle",     farbstoff:"Grüner Farbstoff",     hex:"#5e7c16" },
  { id:"cyan",       de:"Türkis",   wolle:"Türkise Wolle",   farbstoff:"Türkiser Farbstoff",   hex:"#169c9c" },
  { id:"light_blue", de:"Hellblau", wolle:"Hellblaue Wolle", farbstoff:"Hellblauer Farbstoff", hex:"#3ab3da" },
  { id:"blue",       de:"Blau",     wolle:"Blaue Wolle",     farbstoff:"Blauer Farbstoff",     hex:"#3c44aa" },
  { id:"purple",     de:"Violett",  wolle:"Violette Wolle",  farbstoff:"Violetter Farbstoff",  hex:"#8932b8" },
  { id:"magenta",    de:"Magenta",  wolle:"Magenta Wolle",   farbstoff:"Magenta Farbstoff",    hex:"#c74ebd" },
  { id:"pink",       de:"Rosa",     wolle:"Rosa Wolle",      farbstoff:"Rosa Farbstoff",       hex:"#f38baa" },
]);
const farbe = (id) => FARBEN.find((f) => f.id === id) || FARBEN[0];
const HELLE_FARBEN = new Set(["white", "light_gray", "yellow", "lime", "pink", "light_blue", "orange"]);
const kontrast = (id) => HELLE_FARBEN.has(id) ? "black" : "white";

// Bannervorlagen – werden im Webstuhl nicht verbraucht (Java seit 1.21.2 wie Bedrock)
const BANNERVORLAGEN = Object.freeze({
  flower:       { de:"Blumen-Bannervorlage",      herkunft:"Werkbank: Papier + Margerite" },
  creeper:      { de:"Creeper-Bannervorlage",     herkunft:"Werkbank: Papier + Creeperkopf" },
  skull:        { de:"Schädel-Bannervorlage",     herkunft:"Werkbank: Papier + Witherskelettschädel" },
  mojang:       { de:"Mojang-Logo-Bannervorlage", herkunft:"Werkbank: Papier + Verzauberter Goldener Apfel" },
  curly_border: { de:"Spickelbord-Bannervorlage", herkunft:"Werkbank: Papier + Ranken" },
  bricks:       { de:"Mauerung-Bannervorlage",    herkunft:"Werkbank: Papier + Ziegelsteine" },
  globe:        { de:"Globus-Bannervorlage",      herkunft:"Handel: Kartograf (Meister)" },
  piglin:       { de:"Schnauzen-Bannervorlage",   herkunft:"Truhe in der Bastionsruine" },
  flow:         { de:"Fluss-Bannervorlage",       herkunft:"Unheilvoller Tresor (Prüfungskammer)" },
  guster:       { de:"Windstoßer-Bannervorlage",  herkunft:"Tresor (Prüfungskammer)" },
});

// Pixel-Motive der Figuren (1 Zelle = 2×2 Banner-Pixel) – bewusst vereinfacht
const MOTIVE = Object.freeze({
  creeper: { x:4, y:12, z:["##..##", "##..##", "..##..", ".####.", ".####.", ".#..#."] },
  skull:   { x:4, y:10, z:[".####.", "######", "#.##.#", "######", "..##..", "#....#", ".#..#.", "#....#"] },
  flower:  { x:3, y:12, z:["..###..", ".#...#.", "#.###.#", "#.#.#.#", "#.###.#", ".#...#.", "..###.."] },
  mojang:  { x:3, y:12, z:["..####.", ".#....#", "#.###..", "#.#..#.", "#.#.##.", ".#....#", "..####."] },
  globe:   { x:3, y:12, z:["..###..", ".#.##.#", "#.###.#", "#..#..#", "##...##", ".#.#.#.", "..###.."] },
  piglin:  { x:4, y:16, z:["######", "#.##.#", "#.##.#", "######"] },
  flow:    { x:3, y:12, z:["#######", "#.....#", "#.###.#", "#.#.#.#", "#.#...#", "#.#####", "#......"] },
  guster:  { x:3, y:12, z:[".#####.", "#.....#", "..###.#", ".#...#.", "#.##...", "#....#.", ".####.."] },
});
function motivMaske(m){
  return (x, y) => {
    const cx = Math.floor((x - m.x) / 2), cy = Math.floor((y - m.y) / 2);
    return m.z[cy]?.[cx] === "#" ? 1 : 0;
  };
}
const yn = (y) => y / 2;                               // Höhe auf Breitenmaß (40 → 20) für Diagonalen
const zahn = (x) => 2.5 - Math.abs((x % 5) - 2);       // Sägezahn für die gespickelten Muster

// Alle Muster: id (wie im Spiel intern), de (Spielname), en, m = Maske (x, y) → Deckkraft 0…1
const MUSTER = Object.freeze([
  { id:"stripe_bottom",          de:"Gefärbter Bannerfuß",               en:"Base",                       m:(x, y) => y >= 27 },
  { id:"stripe_top",             de:"Gefärbtes Bannerhaupt",             en:"Chief",                      m:(x, y) => y < 13 },
  { id:"stripe_left",            de:"Linke Flanke",                      en:"Pale Dexter",                m:(x) => x < 6 },
  { id:"stripe_right",           de:"Rechte Flanke",                     en:"Pale Sinister",              m:(x) => x >= 14 },
  { id:"stripe_center",          de:"Pfahl",                             en:"Pale",                       m:(x) => x >= 7 && x < 13 },
  { id:"stripe_middle",          de:"Balken",                            en:"Fess",                       m:(x, y) => y >= 15 && y < 25 },
  { id:"stripe_downright",       de:"Schrägbalken",                      en:"Bend",                       m:(x, y) => Math.abs(yn(y) - x) < 3.2 },
  { id:"stripe_downleft",        de:"Schräglinksbalken",                 en:"Bend Sinister",              m:(x, y) => Math.abs(yn(y) - (19 - x)) < 3.2 },
  { id:"small_stripes",          de:"Vier Pfähle",                       en:"Paly",                       m:(x) => x % 4 === 1 || x % 4 === 2 },
  { id:"cross",                  de:"Andreaskreuz",                      en:"Saltire",                    m:(x, y) => Math.abs(yn(y) - x) < 2 || Math.abs(yn(y) - (19 - x)) < 2 },
  { id:"straight_cross",         de:"Kreuz",                             en:"Cross",                      m:(x, y) => (x >= 8 && x < 12) || (y >= 18 && y < 22) },
  { id:"diagonal_left",          de:"Schräglinks geteilt",               en:"Per Bend Sinister",          m:(x, y) => x + yn(y) < 20 },
  { id:"diagonal_right",         de:"Schrägrechts geteilt",              en:"Per Bend",                   m:(x, y) => yn(y) < x },
  { id:"diagonal_up_left",       de:"Schrägrechts geteilt (invertiert)", en:"Per Bend Inverted",          m:(x, y) => yn(y) > x },
  { id:"diagonal_up_right",      de:"Schräglinks geteilt (invertiert)",  en:"Per Bend Sinister Inverted", m:(x, y) => x + yn(y) >= 20 },
  { id:"half_vertical",          de:"Rechts gespalten",                  en:"Per Pale",                   m:(x) => x < 10 },
  { id:"half_vertical_right",    de:"Links gespalten",                   en:"Per Pale Inverted",          m:(x) => x >= 10 },
  { id:"half_horizontal",        de:"Oben geteilt",                      en:"Per Fess",                   m:(x, y) => y < 20 },
  { id:"half_horizontal_bottom", de:"Unten geteilt",                     en:"Per Fess Inverted",          m:(x, y) => y >= 20 },
  { id:"square_bottom_left",     de:"Gefärbtes rechtes Untereck",        en:"Base Dexter Canton",         m:(x, y) => x < 10 && y >= 27 },
  { id:"square_bottom_right",    de:"Gefärbtes linkes Untereck",         en:"Base Sinister Canton",       m:(x, y) => x >= 10 && y >= 27 },
  { id:"square_top_left",        de:"Gefärbtes rechtes Obereck",         en:"Chief Dexter Canton",        m:(x, y) => x < 10 && y < 13 },
  { id:"square_top_right",       de:"Gefärbtes linkes Obereck",          en:"Chief Sinister Canton",      m:(x, y) => x >= 10 && y < 13 },
  { id:"triangle_bottom",        de:"Halbe Spitze",                      en:"Chevron",                    m:(x, y) => (39 - y) < 10 - Math.abs(x - 9.5) },
  { id:"triangle_top",           de:"Gestürzte halbe Spitze",            en:"Inverted Chevron",           m:(x, y) => y < 10 - Math.abs(x - 9.5) },
  { id:"triangles_bottom",       de:"Gespickelter Bannerfuß",            en:"Base Indented",              m:(x, y) => y >= 36 - zahn(x) },
  { id:"triangles_top",          de:"Gespickeltes Bannerhaupt",          en:"Chief Indented",             m:(x, y) => y < 3 + zahn(x) },
  { id:"circle",                 de:"Kugel",                             en:"Roundel",                    m:(x, y) => (x - 9.5) ** 2 + (y - 19.5) ** 2 < 25 },
  { id:"rhombus",                de:"Raute",                             en:"Lozenge",                    m:(x, y) => Math.abs(x - 9.5) / 6.5 + Math.abs(y - 19.5) / 13 < 1 },
  { id:"border",                 de:"Bord",                              en:"Bordure",                    m:(x, y) => x < 1 || x > 18 || y < 1 || y > 38 },
  { id:"gradient",               de:"Farbverlauf",                       en:"Gradient",                   m:(x, y) => 1 - y / 39 },
  { id:"gradient_up",            de:"Farbverlauf (invertiert)",          en:"Base Gradient",              m:(x, y) => y / 39 },
  { id:"curly_border",           de:"Spickelbord",                       en:"Bordure Indented",           m:(x, y) => { const d = Math.min(x, 19 - x, y, 39 - y); return d < 1 || (d < 3 && (x + y) % 3 === 0); } },
  { id:"bricks",                 de:"Feld gemauert",                     en:"Field Masoned",              m:(x, y) => y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0 },
  { id:"creeper",                de:"Creeper",                           en:"Creeper Charge",             m:motivMaske(MOTIVE.creeper) },
  { id:"skull",                  de:"Schädel",                           en:"Skull Charge",               m:motivMaske(MOTIVE.skull) },
  { id:"flower",                 de:"Blume",                             en:"Flower Charge",              m:motivMaske(MOTIVE.flower) },
  { id:"mojang",                 de:"Mojang-Logo",                       en:"Thing",                      m:motivMaske(MOTIVE.mojang) },
  { id:"globe",                  de:"Globus",                            en:"Globe",                      m:motivMaske(MOTIVE.globe) },
  { id:"piglin",                 de:"Schnauze",                          en:"Snout",                      m:motivMaske(MOTIVE.piglin) },
  { id:"flow",                   de:"Fluss",                             en:"Flow",                       m:motivMaske(MOTIVE.flow) },
  { id:"guster",                 de:"Windstoßer",                        en:"Guster",                     m:motivMaske(MOTIVE.guster) },
]);
const muster = (id) => MUSTER.find((m) => m.id === id) || MUSTER[0];
const MAX_EBENEN = 6;   // so viele Muster nimmt der Webstuhl

/** Regeln für einen Bauplan – identisch im Server umzusetzen. Gibt Fehlertext oder null zurück. */
function bannerPruefen(b){
  const name = String(b?.name ?? "").trim();
  if(!name) return "Bitte einen Namen eingeben";
  if(name.length > 60) return "Name ist zu lang (max. 60 Zeichen)";
  if(!FARBEN.some((f) => f.id === b.basis)) return "Unbekannte Grundfarbe";
  if(!Array.isArray(b.ebenen)) return "Ebenen fehlen";
  if(b.ebenen.length > MAX_EBENEN) return `Im Webstuhl passen höchstens ${MAX_EBENEN} Muster auf ein Banner`;
  for(const e of b.ebenen){
    if(!MUSTER.some((m) => m.id === e?.muster)) return "Unbekanntes Muster";
    if(!FARBEN.some((f) => f.id === e?.farbe)) return "Unbekannte Farbe";
  }
  return null;
}
const bannerSauber = (b) => ({ name:String(b.name).trim(), basis:b.basis, ebenen:b.ebenen.map(({ muster, farbe }) => ({ muster, farbe })) });

/* ---- Rüstung: Sets aus vier Teilen mit Besatz ---------------------------- */
/* Namen wie in Bedrock (texts/de_DE.lang). IDs wie im Rüstungs-Baukasten
   (ruestungs-baukasten/manifest.json) – ein Test prüft, dass beides zusammenpasst.
   Besatz-Muster = die Rüstungsbesätze aus SAMMELOBJEKTE (gleiche IDs). */
const RUESTUNGS_TEILE = Object.freeze([
  { id:"helmet",     name:"Helm" },
  { id:"chestplate", name:"Harnisch" },
  { id:"leggings",   name:"Beinschutz" },
  { id:"boots",      name:"Stiefel" },
]);
const RUESTUNGEN = Object.freeze([
  { id:"leather",   name:"Leder",       faerbbar:true, teile:{ helmet:"Lederkappe", chestplate:"Lederjacke", leggings:"Lederhose", boots:"Lederstiefel" } },
  { id:"chainmail", name:"Kette",       teile:{ helmet:"Kettenhemd-Helm", chestplate:"Kettenhemd-Harnisch", leggings:"Kettenhemd-Beinschutz", boots:"Kettenhemd-Stiefel" } },
  { id:"copper",    name:"Kupfer",      teile:{ helmet:"Kupferhelm", chestplate:"Kupferharnisch", leggings:"Kupferbeinschutz", boots:"Kupferstiefel" } },
  { id:"iron",      name:"Eisen",       teile:{ helmet:"Eisenhelm", chestplate:"Eisenharnisch", leggings:"Eisenbeinschutz", boots:"Eisenstiefel" } },
  { id:"gold",      name:"Gold",        teile:{ helmet:"Goldhelm", chestplate:"Goldharnisch", leggings:"Goldbeinschutz", boots:"Goldstiefel" } },
  { id:"diamond",   name:"Diamant",     teile:{ helmet:"Diamanthelm", chestplate:"Diamantharnisch", leggings:"Diamantbeinschutz", boots:"Diamantstiefel" } },
  { id:"netherite", name:"Netherit",    teile:{ helmet:"Netherithelm", chestplate:"Netheritharnisch", leggings:"Netheritbeinschutz", boots:"Netheritstiefel" } },
  { id:"turtle",    name:"Schildkröte", teile:{ helmet:"Schildkrötenpanzer" } },
]);
/* Besatz-Materialien: zutat = Item für den Schmiedetisch (Icon-Name im Baukasten), hex = Farbpunkt */
const BESATZ_MATERIALIEN = Object.freeze([
  { id:"amethyst",  name:"Amethyst",  zutat:"Amethystscherbe", icon:"amethyst_shard",  hex:"#9a5cc6" },
  { id:"copper",    name:"Kupfer",    zutat:"Kupferbarren",    icon:"copper_ingot",    hex:"#b4684d" },
  { id:"diamond",   name:"Diamant",   zutat:"Diamant",         icon:"diamond",         hex:"#6eecd2" },
  { id:"emerald",   name:"Smaragd",   zutat:"Smaragd",         icon:"emerald",         hex:"#11a036" },
  { id:"gold",      name:"Gold",      zutat:"Goldbarren",      icon:"gold_ingot",      hex:"#deb12d" },
  { id:"iron",      name:"Eisen",     zutat:"Eisenbarren",     icon:"iron_ingot",      hex:"#bfc9c8" },
  { id:"lapis",     name:"Lapis",     zutat:"Lapislazuli",     icon:"dye_powder_blue", hex:"#21497b" },
  { id:"netherite", name:"Netherit",  zutat:"Netheritbarren",  icon:"netherite_ingot", hex:"#443a3b" },
  { id:"quartz",    name:"Quarz",     zutat:"Netherquarz",     icon:"quartz",          hex:"#e3dbc4" },
  { id:"redstone",  name:"Redstone",  zutat:"Redstone-Staub",  icon:"redstone_dust",   hex:"#971607" },
  { id:"resin",     name:"Harz",      zutat:"Harzziegel",      icon:"resin_brick",     hex:"#f0852a" },
]);
const LEDER_STANDARD = "#a06540";   // ungefärbtes Leder
const ruestungsArt = (id) => RUESTUNGEN.find((r) => r.id === id) || null;
const besatzMaterial = (id) => BESATZ_MATERIALIEN.find((m) => m.id === id) || null;
const besatzMuster = (id) => SAMMELOBJEKTE.find((o) => o.id === id && !o.aufwertung) || null;

/** Regeln für ein Rüstungs-Set – identisch im Server umzusetzen. Gibt Fehlertext oder null zurück. */
function ruestungPruefen(s){
  const name = String(s?.name ?? "").trim();
  if(!name) return "Bitte einen Namen eingeben";
  if(name.length > 60) return "Name ist zu lang (max. 60 Zeichen)";
  if(!s.teile || typeof s.teile !== "object") return "Teile fehlen";
  let anzahl = 0;
  for(const { id, name:teilName } of RUESTUNGS_TEILE){
    const t = s.teile[id];
    if(t == null) continue;
    const r = ruestungsArt(t.ruestung);
    if(!r) return `${teilName}: Unbekannte Rüstung`;
    if(!r.teile[id]) return `${r.name} gibt es nur als ${Object.values(r.teile).join(", ")}`;
    if(t.muster != null && !besatzMuster(t.muster)) return `${teilName}: Unbekannter Rüstungsbesatz`;
    if(t.muster != null && !besatzMaterial(t.material)) return `${teilName}: Material für den Besatz fehlt`;
    if(t.farbe != null && r.faerbbar && !FARBEN.some((f) => f.id === t.farbe)) return `${teilName}: Unbekannte Farbe`;
    anzahl += 1;
  }
  if(!anzahl) return "Mindestens ein Rüstungsteil auswählen";
  return null;
}
/** Nur bekannte Felder; Material ohne Besatz und Farbe bei nicht färbbarer Rüstung fallen weg. */
const ruestungSauber = (s) => ({
  name:String(s.name).trim(),
  teile:Object.fromEntries(RUESTUNGS_TEILE.map(({ id }) => {
    const t = s.teile[id];
    if(t == null) return [id, null];
    const muster = t.muster ?? null;
    return [id, { ruestung:t.ruestung, muster, material:muster ? t.material : null,
                  farbe:ruestungsArt(t.ruestung).faerbbar ? t.farbe ?? null : null, verzaubert:Boolean(t.verzaubert) }];
  })),
});

/* ---- Regeln · Karte ----------------------------------------------------- */
/** Regeln für neue Instanzen – identisch im Server umzusetzen. Gibt Fehlertext oder null zurück. */
function instanzPruefen(e, dimType, typVorhanden){
  const ganz = (v) => Number.isInteger(v) && Math.abs(v) <= WELTGRENZE;
  if(!ganz(e.x) || !ganz(e.z) || (e.y != null && !ganz(e.y))) return "Ungültige Koordinaten";
  if(e.kategorie !== EIGENE_ORTE && !FEATURE_KATEGORIEN[dimType].includes(e.kategorie))
    return `„${e.kategorie}“ gibt es ${inDim(dimType)} nicht`;
  if(e.kategorie === BIOMES){
    if(e.quelle !== "screenshot") return "Biome können nur per Screenshot hinzugefügt werden";
    const b = biomFinden(e.variante);
    if(!b) return `„${e.variante}“ steht nicht in der Biom-Liste`;
    if(b.dimension !== dimType) return `${b.name} liegt ${inDim(b.dimension)}`;
  }
  if(e.kategorie === EIGENE_ORTE && !String(e.variante || "").trim()) return "Eigene Orte brauchen einen Namen";
  // Neue Varianten nur aus Screenshots – außer bei „Eigene Orte“
  if(!typVorhanden && e.variante && e.quelle !== "screenshot" && e.kategorie !== EIGENE_ORTE)
    return "Neue Varianten entstehen nur aus Screenshots";
  return null;
}

/* ---- Regeln · Portal-Verbindungen -------------------------------------- */
/** Regeln für eine Verbindung – identisch im Server umzusetzen. Gibt Fehlertext oder null zurück. */
function verbindungRegelPruefen(v){
  const name = String(v?.name ?? "").trim();
  if(!name) return "Bitte einen Namen eingeben";
  if(name.length > 60) return "Name ist zu lang (max. 60 Zeichen)";
  const seite = (s, dim) => {
    const grenze = dim === "overworld" ? WELTGRENZE : WELTGRENZE / 8;
    const [ymin, ymax] = dim === "overworld" ? [-64, 320] : [0, 256];
    if(!s || !Number.isInteger(s.x) || !Number.isInteger(s.z)) return `${dimLabel(dim)}: X und Z als ganze Zahlen eintragen`;
    if(Math.abs(s.x) > grenze || Math.abs(s.z) > grenze) return `${dimLabel(dim)}: Koordinaten liegen außerhalb der Welt`;
    if(s.y != null && (!Number.isInteger(s.y) || s.y < ymin || s.y > ymax)) return `${dimLabel(dim)}: Y muss zwischen ${ymin} und ${ymax} liegen`;
    return null;
  };
  return seite(v.oberwelt, "overworld") || seite(v.nether, "nether");
}
const verbindungSauber = (v) => ({
  name:String(v.name).trim(),
  oberwelt:{ x:v.oberwelt.x, y:v.oberwelt.y ?? null, z:v.oberwelt.z },
  nether:{ x:v.nether.x, y:v.nether.y ?? null, z:v.nether.z },
});
