// Erzeugt companion/biom-ids.js aus minecraft-data, bedrock/1.20.0/biomes.json:
// die Biom-IDs, wie Bedrock sie in Data3D speichert (0–191), mit Name, Anzeigename und Farbe.
// NICHT bedrock/1.21.60 nehmen – dort sind die IDs alphabetisch durchnummeriert (plains 64)
// und passen nicht zu den gespeicherten Daten. Aufruf: cd companion/tools && npm run biom-ids
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { COMPANION } from "../companion-ordner.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const MCDATA = path.join(HIER, "node_modules", "minecraft-data");
const QUELLE = "bedrock/1.20.0";
const biome = JSON.parse(readFileSync(path.join(MCDATA, "minecraft-data", "data", QUELLE, "biomes.json"), "utf8"));
const mcdataVersion = JSON.parse(readFileSync(path.join(MCDATA, "package.json"), "utf8")).version;

// Neuere Biome, die in 1.20.0 fehlen. Erst eintragen, wenn die ID an einer echten Welt bestätigt ist
// (tools/welt-pruefen.mjs meldet sie als unbekannt, mit Beispielkoordinate zum Nachsehen).
// Noch vermutet: Cherry Grove 192, Pale Garden 193, Sulfur Caves unbekannt.
const NACHTRAG = [
  // Bestätigt 29.09.2026 an der Fixture-Welt von Max (1.26.51): Spawn X 0 / Z 0, Chunkbase „Dappled Forest“,
  // alle 8 Stichproben passen. Herbstwald mit roten und orangen Blättern; name ist aus dem Anzeigenamen abgeleitet.
  { id: 195, name: "dappled_forest", displayName: "Dappled Forest", color: 0xc96a2b },
];
// minecraft-data hat für diese Biome keine Farbe (0) – eigene, damit sie in Vorschaubildern sichtbar sind
const FARBE_ERSATZ = { deep_dark: 0x1d2b33, mangrove_swamp: 0x4f6b3a };

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;
const eintraege = [...biome, ...NACHTRAG]
  .map((b) => ({ id: b.id, name: b.name, displayName: b.displayName, color: hex(b.color || FARBE_ERSATZ[b.name] || 0x777777) }))
  .sort((a, b) => a.id - b.id);
const doppelt = eintraege.find((b, i) => eintraege.findIndex((x) => x.id === b.id) !== i);
if (doppelt) throw new Error(`Biom-ID ${doppelt.id} doppelt`);

const zeilen = eintraege.map((b) => `  { id:${b.id}, name:${JSON.stringify(b.name)}, displayName:${JSON.stringify(b.displayName)}, color:"${b.color}" },`);
writeFileSync(path.join(COMPANION, "biom-ids.js"), `/* biom-ids.js – erzeugt von companion/tools/biom-ids-bauen.mjs, nicht von Hand ändern.
   Biom-IDs, wie Bedrock sie in Data3D speichert. Quelle: minecraft-data ${mcdataVersion}, ${QUELLE}/biomes.json
   ${NACHTRAG.length ? `+ ${NACHTRAG.length} an echten Welten bestätigte Nachträge` : "(ohne Nachträge – neuere Biome meldet der Import als unbekannt)"}.
   displayName entspricht der Schreibweise von Chunkbase und der Biom-Liste in regeln.js.
   Klassisches Script: Seite (<script src>), Worker und Node (import "./biom-ids.js") lesen globalThis.BIOM_IDS. */
globalThis.BIOM_IDS = Object.freeze([
${zeilen.join("\n")}
].map(Object.freeze));
`);
console.log(`biom-ids.js: ${eintraege.length} Biome, IDs ${eintraege[0].id}–${eintraege.at(-1).id}`);
