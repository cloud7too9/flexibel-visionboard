// Gegenprobe des Biom-Dekoders mit einer fremden Umsetzung: prismarine-chunk (bedrock 1.18) liest
// Data3D-Biome von der Platte mit BiomeSection.read(LocalPersistence) + PalettedStorage – so liest
// bedrock-provider echte Mojang-Welten. Die Testwelt-Sektionen (tests/welt-bauen.mjs) müssen dort
// an jeder Stelle dasselbe Biom ergeben wie in biom-dekoder.js. Lauf: cd companion/tools && npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { data3dLesen, biomAn } from "../biom-dekoder.js";
import { data3dBauen } from "../tests/welt-bauen.mjs";

const require = createRequire(import.meta.url);
const registry = require("prismarine-registry")("bedrock_1.20.0");
const Chunk = require("prismarine-chunk")(registry);
const PERSISTENT = 0;   // StorageType.LocalPersistence

const MUSTER = {
  "ein Biom je Sektion (bits 0)": (x, y) => (y < 0 ? 190 : 1),
  "zwei Biome (bits 1)": (x, y, z) => ((x ^ z) & 1 ? 4 : 7),
  "3 bis 8 Biome (bits 2, 3)": (x, y, z) => [0, 1, 2, 3, 4, 5][(x + z * 3 + y) % 6 < 0 ? 0 : (x + z * 3 + y) % 6],
  "12 Biome (bits 4)": (x, y, z) => [0, 1, 2, 3, 4, 5, 6, 7, 12, 14, 21, 24][(x * 5 + z + Math.abs(y)) % 12],
  "40 Biome (bits 6)": (x, y, z) => (x * 7 + z * 3 + Math.abs(y)) % 40,
  "100 Biome (bits 8)": (x, y, z) => (x * 16 + z + Math.abs(y) * 3) % 100,
  "300 Biome (bits 16)": (x, y, z) => ((x * 256 + z * 16 + Math.abs(y)) % 300) * 3,
};

for (const [name, biom] of Object.entries(MUSTER)) {
  test(`prismarine-chunk liest dasselbe: ${name}`, () => {
    const wert = data3dBauen({ biom, sektionen: 6 });
    const kopien = [...wert.subarray(512)].filter((b) => b === 0xff).length;
    const eigen = data3dLesen(wert);
    const fremd = new Chunk({ x: 0, z: 0 });
    fremd.loadBiomes(Buffer.from(wert.subarray(512)), PERSISTENT);
    let geprueft = 0;
    for (let y = -64; y < 32; y += 1) {
      for (let x = 0; x < 16; x += 3) {
        for (let z = 0; z < 16; z += 5) {
          const rel = y + 64;
          const erwartet = biom(x, y, z);
          // „0xFF“-Sektionen: prismarine-chunk 1.41.0 reicht in ProxyBiomeSection.getBiomeId(pos) nur x an
          // die Zielsektion weiter (ChunkColumn ruft getBiomeId(x, y, z)) – deshalb direkt die Zielsektion fragen
          const sek = fremd.biomes[rel >> 4];
          assert.equal((sek.target ?? sek).getBiomeId(x, rel & 15, z), erwartet, `prismarine (${x},${y},${z})`);
          assert.equal(biomAn(eigen.sektionen[rel >> 4], x, rel & 15, z), erwartet, `eigen (${x},${y},${z})`);
          geprueft += 1;
        }
      }
    }
    assert.ok(geprueft > 1000);
    if (name.startsWith("zwei")) assert.ok(kopien >= 5, "Muster ohne y: Sektionen 1–5 sind 0xFF-Kopien");
  });
}
