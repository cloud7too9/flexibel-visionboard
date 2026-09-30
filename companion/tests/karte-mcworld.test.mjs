// Biome aus .mcworld in der Karte (Bauplan „Biome aus .mcworld“): Datenmodell, Regeln und DEMO-Mock
// (Phase 3), Import-Sheet mit Prüfliste (Phase 4). Die Beispielwelt w_1 trägt die Biome der Fixture-Welt
// von Max – die Kacheln im Mock müssen genau dem Node-Ergebnis (biom-welt.js) entsprechen.
// Über http (Module-Worker laufen nicht unter file://); ohne Board antwortet der DEMO-Mock.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, openAsBlob } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CHROMIUM_OPTIONEN, companionAusliefern } from "./hilfen.mjs";
import { testweltBauen, ballastWeltBauen, zipBauen } from "./welt-bauen.mjs";
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

// Testdateien: andere Seed (neue Welt, unbekannte ID 192), groß (Abbrechen), Java (Fehler)
const TMP = mkdtempSync(path.join(tmpdir(), "karte-mcworld-"));
const fremd = path.join(TMP, "Fremde Welt.mcworld");
writeFileSync(fremd, testweltBauen({ seed: "123456789" }).zip);
const gross = path.join(TMP, "gross.mcworld");
writeFileSync(gross, ballastWeltBauen({ breite: 60 }));
const java = path.join(TMP, "java.zip");
writeFileSync(java, zipBauen([["Welt/level.dat", new Uint8Array(8)], ["Welt/region/r.0.0.mca", new Uint8Array(8)]]));

const server = await companionAusliefern(3193);
const b = await chromium.launch(CHROMIUM_OPTIONEN);
try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  // favicon.ico: fragt Chromium beim kleinen Test-Server an, gehört nicht zur Seite
  p.on("console", (m) => { if (m.type() === "error" && !m.location()?.url?.endsWith("/favicon.ico")) fehler.push(`${m.text()} ${m.location()?.url ?? ""}`); });
  p.on("response", (r) => { if (r.status() >= 400) fehler.push(`${r.status()} ${r.url()}`); });
  await p.goto(`${server.adresse}/companion-prototyp.html?demo=1&modul=karte`);
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

  await p.click('[data-aktion="schliessen"]');
  await p.evaluate(() => { st.importe = []; });

  // =========================== Phase 4: Import-Sheet ==================================
  const wiStatus = (z) => p.waitForFunction((x) => wi.status === x, z, { timeout: 60_000 });
  const zeilen = () => p.$$eval("#orteSheetInhalt .result-row", (l) => Object.fromEntries(l.map((r) =>
    [r.querySelector(".rname").textContent.trim(), r.querySelector(".wi-wert").textContent.replace(/\s+/g, " ").trim()])));
  const sheetText = () => p.$eval("#orteSheetInhalt", (e) => e.textContent.replace(/\s+/g, " "));
  await p.evaluate(() => ansichtWechseln("karte"));

  // Start: Import der Beispielwelt, Anleitung, Auswahl
  await p.click("#orteImportBtn");
  await p.waitForSelector('[data-aktion="wi-waehlen"]');
  let z = await zeilen();
  pruefe(z.Chunks === "Oberwelt 30" && z.Datei === "Meine Welt.mcworld" && z["Importiert von"] === "Max" && /^\d+\.\d+\.\d{4}, \d\d:\d\d$/.test(z.Stand), `Start: Import der Welt – ${JSON.stringify(z)}`);
  pruefe(await p.isVisible('[data-aktion="wi-loeschen-fragen"]') && (await sheetText()).includes("Welt exportieren"), "Start: „Import löschen“ und Anleitung für die .mcworld");
  await p.screenshot({ path: path.join(DIR, "m4-start.png") });

  const z0Stand = z.Stand;
  // Fixture-Welt lesen → Prüfliste
  await p.setInputFiles("#weltImportDatei", FIXTURE);
  await wiStatus("fertig");
  await p.waitForTimeout(350);
  z = await zeilen();
  pruefe(z.Welt === "Meine Welt (1)" && z.Spielversion === "1.26.51" && z.Seed === "6889192652397090698 ✔", `Prüfliste: Name, Version, Seed ✔ – ${JSON.stringify(z)}`);
  const segmente = await p.$$eval("[data-wi-dim]", (l) => l.map((e) => e.textContent.trim()));
  pruefe(segmente.join("|") === "Oberwelt30|Nether0|End0", `Chunks je Dimension im Umschalter: ${segmente.join(" · ")}`);
  const biome = await p.$$eval(".wi-biom", (l) => l.map((e) => `${e.querySelector("span").textContent} ${e.querySelector("b").textContent}`));
  pruefe(biome.join(", ") === "Dappled Forest 24, Stony Shore 4, Snowy Slopes 1, Plains 1", `Häufigste Biome: ${biome.join(", ")}`);
  const leinwand = await p.$eval("#wiVorschau canvas", (c) => [c.width, c.height, Math.round(parseFloat(c.style.width))]);
  pruefe(leinwand[0] === 7 && leinwand[1] === 9 && leinwand[2] >= 7 * 20, `Vorschau: 7 × 9 Chunks, vergrößert (${leinwand[2]} px breit)`);
  pruefe((await sheetText()).includes(`Ersetzt den Import vom ${z0Stand}.`) && await p.isEnabled('[data-aktion="wi-uebernehmen"]'), "„Ersetzt den Import vom …“, Übernehmen frei");
  pruefe(await p.evaluate(() => !document.querySelector("#orteSheetInhalt .banner.warn")), "Keine unbekannten IDs gemeldet");
  await p.screenshot({ path: path.join(DIR, "m4-pruefliste.png") });
  await p.click('[data-wi-dim="nether"]');
  pruefe((await p.textContent("#wiVorschau")).includes("Keine erkundeten Chunks im Nether") && await p.evaluate(() => wi.dim === "nether"), "Nether gewählt: keine Chunks, Hinweis statt Bild");
  await p.click('[data-wi-dim="overworld"]');

  // Übernehmen
  await p.click('[data-aktion="wi-uebernehmen"]');
  await p.waitForFunction(() => st.sheet === null && st.biome.import?.dateiname === "fixture-seed.mcworld");
  const mock = await p.evaluate(() => ({ imp: MOCK.biome.w_1.import, anzahl: MOCK.biome.w_1.kacheln.length }));
  pruefe(mock.imp.von === "Max" && mock.anzahl === 4 && mock.imp.chunks.overworld === 30, "Übernommen: Import mit 4 Kacheln gespeichert (von Max)");
  pruefe(await p.evaluate(() => st.biome.kacheln.length === 4 && st.biome.kacheln.every((k) => k.daten instanceof Uint16Array)), "Kacheln stehen dekodiert im State");
  await p.waitForTimeout(300);
  const chip = await p.textContent("#karteHinweis");
  pruefe(/Biome: Stand \d+\.\d+\. · 30 Chunks/.test(chip), `Karte zeigt den Stand: „${chip.trim()}“`);
  await p.screenshot({ path: path.join(DIR, "m4-karte-stand.png") });

  // Löschen mit zweitem Tippen
  await p.click("#orteImportBtn");
  await p.click('[data-aktion="wi-loeschen-fragen"]');
  pruefe(await p.isVisible('[data-aktion="wi-loeschen"]') && (await p.evaluate(() => MOCK.biome.w_1 != null)), "Erstes Tippen fragt nur nach");
  await p.screenshot({ path: path.join(DIR, "m4-loeschen-fragen.png") });
  await p.click('[data-aktion="wi-loeschen"]');
  await p.waitForFunction(() => st.biome.import === null);
  pruefe(await p.evaluate(() => MOCK.biome.w_1 === undefined) && (await sheetText()).includes("Diese Welt hat noch keine Biome"), "„Wirklich löschen“: Import weg, Start zeigt „noch keine Biome“");
  await p.click('[data-aktion="schliessen"]');
  await p.waitForTimeout(200);
  pruefe((await p.textContent("#karteHinweis")).includes("keine Biome importiert"), "Karte: „keine Biome importiert“");

  // Seed passt nicht: Fixture-Welt in w_2 → sperren, Angebot „zur Welt mit diesem Seed“
  await p.evaluate(() => weltLaden("w_2"));
  await p.click("#orteImportBtn");
  await p.setInputFiles("#weltImportDatei", FIXTURE);
  await wiStatus("fertig");
  z = await zeilen();
  pruefe(z.Seed === "6889192652397090698 ✘" && (await sheetText()).includes("Diese Welt hat einen anderen Seed") && !(await p.isEnabled('[data-aktion="wi-uebernehmen"]')),
    "Anderer Seed: ✘, Banner, Übernehmen gesperrt");
  pruefe((await p.textContent('[data-aktion="wi-andere-welt"]')).trim() === "Zur Welt mit diesem Seed wechseln und übernehmen", "Welt mit dem Seed gibt es schon → Wechseln anbieten");
  await p.screenshot({ path: path.join(DIR, "m4-seed-falsch.png") });
  await p.click('[data-aktion="wi-andere-welt"]');
  await p.waitForFunction(() => st.weltId === "w_1" && st.biome.import?.weltId === "w_1" && st.sheet === null);
  pruefe(await p.evaluate(() => MOCK.biome.w_2 === undefined && MOCK.biome.w_1.kacheln.length === 4), "Gewechselt zu w_1 und dort übernommen, w_2 unverändert");

  // Seed ohne Welt: neue Welt anlegen und importieren; unbekannte ID 192 wird gemeldet
  await p.click("#orteImportBtn");
  await p.setInputFiles("#weltImportDatei", fremd);
  await wiStatus("fertig");
  const warn = await p.$eval("#orteSheetInhalt .banner.warn", (e) => e.textContent.replace(/\s+/g, " "));
  pruefe(/Unbekannte Biom-IDs.*192 · \d+ Chunks, z\. B\. Oberwelt X/.test(warn), `Unbekannte ID gemeldet: ${warn.slice(0, 90)}…`);
  pruefe((await p.textContent('[data-aktion="wi-andere-welt"]')).trim() === "Neue Welt mit diesem Seed anlegen", "Kein Welt mit dem Seed → „Neue Welt mit diesem Seed anlegen“");
  await p.screenshot({ path: path.join(DIR, "m4-unbekannt.png") });
  await p.click('[data-aktion="wi-andere-welt"]');
  await p.waitForFunction(() => st.welt?.seed === "123456789" && st.biome.import?.seed === "123456789" && st.sheet === null);
  pruefe(await p.evaluate(() => st.welten.length === 3 && MOCK.biome[st.weltId].import.unbekannt[0].bedrockId === 192), "Neue Welt angelegt, Import mit unbekannter ID gespeichert");
  await p.evaluate(() => weltLaden("w_1"));

  // Abbrechen während des Lesens, Fehlertext
  await p.click("#orteImportBtn");
  await p.setInputFiles("#weltImportDatei", gross);
  await p.waitForFunction(() => document.getElementById("wiPhase")?.textContent.startsWith("Weltdaten lesen"), null, { timeout: 30_000 });
  pruefe(await p.evaluate(() => JSON.parse(localStorage.getItem("orte.weltImportLauf"))?.name === "gross.mcworld"), "Während des Lesens steht der Absturz-Merker");
  await p.screenshot({ path: path.join(DIR, "m4-lauf.png") });
  await p.click('[data-aktion="wi-abbrechen"]');
  pruefe(await p.evaluate(() => wi.status === "bereit" && wi.worker === null && localStorage.getItem("orte.weltImportLauf") === null)
    && (await sheetText()).includes("Abgebrochen."), "Abbrechen beendet den Worker, Merker weg");
  await p.setInputFiles("#weltImportDatei", java);
  await p.waitForFunction(() => wi.status === "bereit" && wi.meldung?.[0] === "bad");
  pruefe((await p.textContent("#orteSheetInhalt .banner.bad")).trim() === "Java-Welten werden nicht unterstützt", "Java-Welt: Fehlertext im Sheet");

  // Absturz beim letzten Mal → Hinweis nach dem Neuladen
  await p.evaluate(() => localStorage.setItem("orte.weltImportLauf", JSON.stringify({ name: "Realm.mcworld", groesse: 312e6, start: Date.now() })));
  await p.reload();
  await p.waitForFunction(() => st.welt?.id);
  pruefe((await p.textContent("#orteToast")).trim() === "Letzter Welt-Import abgestürzt", "Nach Absturz: Hinweis beim Start");
  await p.click("#orteImportBtn");
  await p.waitForTimeout(450);   // Sheet fährt hoch
  const absturz = await p.$eval("#orteSheetInhalt .banner.warn", (e) => e.textContent);
  pruefe(absturz.includes("Realm.mcworld") && absturz.includes("am Laptop"), "Im Sheet: Datei, Größe und Tipp");
  await p.screenshot({ path: path.join(DIR, "m4-absturz.png") });

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);

  // Als Datei geöffnet: Hinweis statt Auswahl
  const d = await b.newPage({ viewport: { width: 390, height: 844 } });
  await d.goto(DATEI + "?modul=karte");
  await d.waitForFunction(() => st.welt?.id);
  await d.click("#orteImportBtn");
  pruefe((await d.textContent("#orteSheetInhalt")).includes("braucht http(s)") && !(await d.$('[data-aktion="wi-waehlen"]')), "file://: Hinweis „braucht http(s)“, keine Auswahl");
} finally {
  await b.close();
  await server.schliessen();
  rmSync(TMP, { recursive: true, force: true });
}
