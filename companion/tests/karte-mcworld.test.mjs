// Biome aus .mcworld in der Karte (Bauplan „Biome aus .mcworld“, ab Phase 3): Datenmodell, Regeln und
// DEMO-Mock in companion-prototyp.html. Die Beispielwelt w_1 trägt die Biome der Fixture-Welt von Max –
// die Kacheln im Mock müssen genau dem Node-Ergebnis (biom-welt.js) entsprechen.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, openAsBlob } from "node:fs";
import path from "node:path";
import { CHROMIUM_OPTIONEN } from "./hilfen.mjs";
import { weltLesen } from "../biom-welt.js";
import { kachelZuBase64, KACHEL_CHUNKS } from "../biom-dekoder.js";
import "../biom-ids.js";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const DATEI = new URL("../companion-prototyp.html", import.meta.url).href;
const FIXTURE = path.join(HIER, "daten", "fixture-seed.mcworld");
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };

const node = await weltLesen(await openAsBlob(FIXTURE), { biomIds: globalThis.BIOM_IDS.map((b) => b.id) });
const nodeKacheln = node.kacheln.map((k) => ({ dim: k.dim, kx: k.kx, kz: k.kz, daten: kachelZuBase64(k.daten) }));

const b = await chromium.launch(CHROMIUM_OPTIONEN);
try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await p.goto(DATEI + "?modul=karte");
  await p.waitForFunction(() => st.welt?.id === "w_1" && st.biome.import, null, { timeout: 10_000 });
  const api = (pfad, opts) => p.evaluate(([pf, o]) => api(pf, o ? { ...o, body: o.body && JSON.stringify(o.body) } : undefined), [pfad, opts]);

  // ---- Stammdaten: jede Bedrock-ID gehört zu einem Biom der Liste ------------------------
  const ohneBiom = await p.evaluate(() => [...BIOM_NACH_ID.values()].filter((e) => !e.biom).map((e) => e.bedrockId));
  pruefe(ohneBiom.length === 0 && await p.evaluate(() => BIOM_NACH_ID.get(195).biom.name === "Dappled Forest" && BIOM_NACH_ID.get(13).biom.name === "Snowy Plains"),
    `Jede Bedrock-ID aus biom-ids.js gehört zu einem Biom der Liste${ohneBiom.length ? `, fehlt: ${ohneBiom}` : ""}`);
  pruefe(await p.evaluate(() => KACHEL_CHUNKS) === KACHEL_CHUNKS, "Kachelgröße in regeln.js = biom-dekoder.js (32 Chunks)");
  pruefe(await p.evaluate(() => !FEATURE_KATEGORIEN.overworld.includes(BIOMES) && !kategorienManuell("nether").includes(BIOMES)),
    "Kategorie „Biomes“ gibt es bei den Orten nicht mehr");

  // ---- Beispielwelt: Biome der Fixture-Welt -----------------------------------------------
  const demo = await p.evaluate(() => ({
    import: st.biome.import,
    kacheln: st.biome.kacheln.map((k) => ({ dim: k.dim, kx: k.kx, kz: k.kz, daten: kachelZuBase64(k.daten) })),
  }));
  pruefe(JSON.stringify(demo.kacheln) === JSON.stringify(nodeKacheln), `Demo-Welt w_1: ${demo.kacheln.length} Kacheln = Node-Ergebnis der Fixture-Welt`);
  const { weltname, seed, spielversion, chunks, unbekannt } = demo.import;
  pruefe(JSON.stringify({ seed, weltname, spielversion, chunks, unbekannt }) === JSON.stringify(node.meta), "Demo-Import: Name, Seed, Version, Chunks wie in level.dat");
  // Kachel-Kodierung der Seite = biom-dekoder.js (auch umgekehrt)
  const zurueck = await p.evaluate((liste) => liste.map((k) => kachelZuBase64(kachelAusBase64(k.daten))), nodeKacheln);
  pruefe(zurueck.every((t, i) => t === nodeKacheln[i].daten) && await p.evaluate(() => kachelAusBase64("AAAA") === null && kachelAusBase64("§") === null),
    "kachelAusBase64 / kachelZuBase64 der Seite passen zu biom-dekoder.js");

  // ---- Mock-API nach Vertrag --------------------------------------------------------------
  let r = await api("/orte/welten/w_2/biome");
  pruefe(r.ok && r.data.import === null && r.data.kacheln.length === 0, "GET: Welt ohne Import → import null, keine Kacheln");
  const body = { import: { ...demo.import, dateiname: "Realm.mcworld", extra: 1 }, kacheln: nodeKacheln };
  r = await api("/orte/welten/w_2/biome", { method: "PUT", body });
  pruefe(r.status === 422 && r.data.message === "Diese Welt hat einen anderen Seed", "PUT in eine Welt mit anderem Seed: 422 „Diese Welt hat einen anderen Seed“");
  r = await api("/orte/welten/w_1/biome", { method: "PUT", body: { ...body, kacheln: [...nodeKacheln, nodeKacheln[0]] } });
  pruefe(r.status === 422 && r.data.message === "Kachel doppelt", "PUT mit doppelter Kachel: 422");
  r = await api("/orte/welten/w_1/biome", { method: "PUT", body: { ...body, kacheln: nodeKacheln.slice(0, 1) } });
  pruefe(r.ok && r.data.import.dateiname === "Realm.mcworld" && r.data.import.von === "Max" && !("extra" in r.data.import) && r.data.import.id !== demo.import.id,
    "PUT: neuer Import mit von/importiertAm, nur bekannte Felder");
  r = await api("/orte/welten/w_1/biome");
  pruefe(r.data.kacheln.length === 1 && r.data.import.dateiname === "Realm.mcworld", "Neuer Import ersetzt den alten samt allen Kacheln");
  r = await api("/orte/welten/w_1/biome", { method: "DELETE" });
  pruefe(r.ok && (await api("/orte/welten/w_1/biome")).data.import === null, "DELETE löscht Import und Kacheln");
  await api("/orte/welten/w_1/biome", { method: "PUT", body: { ...body, import: demo.import } });
  await p.evaluate(() => biomeLaden());
  pruefe(await p.evaluate(() => st.biome.kacheln.length) === nodeKacheln.length, "biomeLaden holt den Import der aktuellen Welt");
  await p.evaluate(() => weltLaden("w_2"));
  await p.waitForTimeout(400);
  pruefe(await p.evaluate(() => st.biome.import === null && st.biome.kacheln.length === 0), "Weltwechsel: Biome der neuen Welt (keine), nichts von der alten");
  await p.evaluate(() => weltLaden("w_1"));
  await p.waitForFunction(() => st.biome.import?.weltId === "w_1");

  r = await api("/orte/instanzen", { method: "POST", body: { dimensionId: "d_w_1_overworld", kategorie: "Biomes", variante: "Plains", x: 0, y: null, z: 0, quelle: "screenshot" } });
  pruefe(r.status === 422 && r.data.message === "Biome kommen nur aus dem Welt-Import", "Biom als Ort: 422 „Biome kommen nur aus dem Welt-Import“");
  pruefe(await p.evaluate(() => st.instanzen.every((i) => typVon(i).kategorie !== BIOMES)), "Beispielwelt hat keine Biom-Orte mehr");

  // ---- Screenshot-Prüfliste: erkanntes Biom ist ausgegraut --------------------------------
  const bild = path.join(HIER, "../../referenz/seedmap/stronghold-popup.png");
  await p.setInputFiles("#orteDatei", [bild, bild]);   // DEMO-Texterkennung: Stronghold, Cherry Grove
  await p.waitForFunction(() => st.importe.length === 2 && st.importe.every((e) => !["wartet", "lese"].includes(e.status)), null, { timeout: 15_000 });
  await p.waitForTimeout(300);
  const karte = await p.$eval('[data-import]:nth-child(2)', (c) => ({
    aus: c.classList.contains("aus"), schalter: Boolean(c.querySelector(".switch")), koord: Boolean(c.querySelector("[data-koord]")),
    banner: c.querySelector(".banner")?.textContent ?? "", titel: c.querySelector(".card-title").textContent,
  }));
  pruefe(karte.titel.includes("Cherry Grove") && karte.aus && !karte.schalter && !karte.koord && karte.banner.startsWith("Biome kommen aus dem Welt-Import"),
    "Prüfliste: Biom ausgegraut, ohne Schalter und Koordinaten, mit Hinweis");
  // Stronghold · Stairway steht schon in der Beispielwelt (Duplikat, aus) – das Biom zählt gar nicht erst mit
  pruefe((await p.textContent('[data-aktion="import-speichern"]')).trim() === "0 Orte speichern"
    && await p.evaluate(() => st.importe.filter((e) => e.an).length === 0), "Speichern zählt das Biom nicht mit");
  await p.screenshot({ path: path.join(DIR, "m3-pruefliste-biom.png") });

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);
} finally {
  await b.close();
}
