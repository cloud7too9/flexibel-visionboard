// Welt-Import im Web Worker (Phase 2 des Bauplans „Biome aus .mcworld“): die Prüfseite
// welt-pruefen.html über http, .mcworld per Datei-Auswahl → biom-import.worker.js.
// Das Ergebnis muss genau dem Node-Ergebnis aus Phase 1 (biom-welt.js) entsprechen.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, writeFileSync, openAsBlob, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { companionAusliefern, CHROMIUM_OPTIONEN } from "./hilfen.mjs";
import { weltLesen } from "../biom-welt.js";
import "../biom-ids.js";
import { testweltBauen, ballastWeltBauen, zipBauen } from "./welt-bauen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const TMP = mkdtempSync(path.join(tmpdir(), "welt-import-"));
const FIXTURE = path.join(HIER, "daten", "fixture-seed.mcworld");
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const BEKANNT = globalThis.BIOM_IDS.map((b) => b.id);

// Testdateien
const testwelt = path.join(TMP, "testwelt.mcworld");
writeFileSync(testwelt, testweltBauen({ ordner: "Meine Welt/" }).zip);
const gross = path.join(TMP, "gross.mcworld");
writeFileSync(gross, ballastWeltBauen({ breite: 60 }));
const java = path.join(TMP, "java.zip");
writeFileSync(java, zipBauen([["Welt/level.dat", new Uint8Array(8)], ["Welt/region/r.0.0.mca", new Uint8Array(8)]]));
const keinZip = path.join(TMP, "notiz.mcworld");
writeFileSync(keinZip, "das ist keine Welt");

/** Node-Ergebnis (Phase 1) als vergleichbare Form */
const vergleichbar = ({ meta, kacheln }) => JSON.stringify({ meta, kacheln: kacheln.map((k) => [k.dim, k.kx, k.kz, Array.from(k.daten)]) });
const nodeErgebnis = async (datei) => vergleichbar(await weltLesen(await openAsBlob(datei), { biomIds: BEKANNT }));

const server = await companionAusliefern(3191);
const browser = await chromium.launch(CHROMIUM_OPTIONEN);
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await p.goto(`${server.adresse}/welt-pruefen.html`);
  const status = () => p.evaluate(() => window.welt.status);
  const warten = (ziel) => p.waitForFunction((z) => window.welt.status === z, ziel, { timeout: 60_000 });
  const importieren = async (datei, ziel = "fertig") => {
    await p.setInputFiles("#datei", datei);
    await warten(ziel);
  };
  const seitenErgebnis = () => p.evaluate(() => JSON.stringify({ meta: window.welt.ergebnis.meta,
    kacheln: window.welt.ergebnis.kacheln.map((k) => [k.dim, k.kx, k.kz, Array.from(k.daten)]) }));

  pruefe(await p.isVisible("#waehlen") && !(await p.isVisible("#nurHttp")), "Über http: Auswahl da, kein Hinweis auf http");
  pruefe(await p.getAttribute("#datei", "accept") === null, "Datei-Auswahl ohne strenges accept (iOS graut .mcworld sonst aus)");

  // ---- Fixture-Welt von Max ------------------------------------------------------
  await importieren(FIXTURE);
  pruefe(await seitenErgebnis() === await nodeErgebnis(FIXTURE), "Fixture-Welt: Worker liefert genau das Node-Ergebnis");
  const kopf = await p.textContent("#eKopf");
  pruefe(kopf.includes("Meine Welt (1)") && kopf.includes("6889192652397090698") && kopf.includes("1.26.51"), "Anzeige: Weltname, Seed, Version");
  const biome = await p.$$eval('[data-dim="overworld"] .biom span', (l) => l.map((e) => e.textContent));
  pruefe(biome.slice(0, 2).join() === "Dappled Forest,Stony Shore" && [...biome].sort().join() === "Dappled Forest,Plains,Snowy Slopes,Stony Shore",
    `Oberwelt: ${biome.join(", ")}`);
  pruefe(await p.$eval('[data-dim="overworld"] canvas', (c) => c.width === 7 && c.height === 9), "Vorschau: 1 Pixel je Chunk (7 × 9)");
  const dauerFixture = await p.evaluate(() => window.welt.dauer);
  console.log(`     Dauer Fixture-Welt im Worker: ${Math.round(dauerFixture)} ms`);
  await p.screenshot({ path: path.join(DIR, "welt-import-fixture.png"), fullPage: true });

  // ---- Synthetische Welt (iOS-Ordner, Level, Löschmarken, unbekannte ID) ------------
  await importieren(testwelt);
  pruefe(await seitenErgebnis() === await nodeErgebnis(testwelt), "Testwelt: Worker = Node (Level, gelöschte Datei, Log, Ordnerebene)");
  pruefe((await p.textContent("#eKopf")).includes("Unbekannte Biom-IDs: 192"), "Unbekannte ID 192 wird gemeldet");

  // ---- Größere Welt: Fortschritt, Dauer, dann Abbrechen -------------------------------
  const stufen = new Set();
  await p.exposeFunction("stufeMerken", (s) => stufen.add(s));
  await p.evaluate(() => new MutationObserver(() => window.stufeMerken(document.getElementById("lPhase").textContent.split(" ·")[0]))
    .observe(document.getElementById("lPhase"), { childList: true, characterData: true, subtree: true }));
  await importieren(gross);
  const dauerGross = await p.evaluate(() => window.welt.dauer);
  pruefe(await seitenErgebnis() === await nodeErgebnis(gross), `Große Welt (${Math.round((await openAsBlob(gross)).size / 1e6)} MB): Worker = Node, ${Math.round(dauerGross)} ms`);
  pruefe(stufen.has("Weltdaten lesen"), `Fortschritt sichtbar: ${[...stufen].join(" → ")}`);
  await p.screenshot({ path: path.join(DIR, "welt-import-gross.png"), fullPage: true });

  await p.setInputFiles("#datei", gross);
  await p.waitForFunction(() => document.getElementById("lPhase").textContent.startsWith("Weltdaten lesen"));
  await p.screenshot({ path: path.join(DIR, "welt-import-lauf.png") });
  await p.click("#abbrechen");
  pruefe(await status() === "abgebrochen" && (await p.textContent("#fehler")) === "Abgebrochen." && await p.isVisible("#waehlen"), "Abbrechen beendet den Worker, Auswahl wieder da");
  pruefe(await p.evaluate(() => localStorage.getItem("welt-pruefen.lauf")) === null, "Nach Abbrechen kein Absturz-Merker");

  // ---- Fehlertexte ------------------------------------------------------------------
  await importieren(java, "fehler");
  pruefe((await p.textContent("#fehler")) === "Java-Welten werden nicht unterstützt", "Java-Welt: Fehlertext");
  await importieren(keinZip, "fehler");
  pruefe((await p.textContent("#fehler")) === "Die Datei konnte nicht gelesen werden", "Keine ZIP-Datei: Fehlertext");
  await p.screenshot({ path: path.join(DIR, "welt-import-fehler.png") });

  // ---- Absturz-Erkennung: Merker bleibt stehen, wenn die Seite mitten im Lauf stirbt --
  await p.evaluate(() => localStorage.setItem("welt-pruefen.lauf", JSON.stringify({ name: "Realm.mcworld", groesse: 312e6, start: Date.now() })));
  await p.reload();
  const absturz = await p.textContent("#absturz");
  pruefe(await p.isVisible("#absturz") && absturz.includes("Realm.mcworld") && absturz.includes("abgestürzt"), "Nach Absturz: Hinweis mit Datei und Größe");
  await p.screenshot({ path: path.join(DIR, "welt-import-absturz.png") });
  await p.reload();
  pruefe(!(await p.isVisible("#absturz")), "Hinweis erscheint nur einmal");

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);

  // ---- Ohne Worker (gesperrt): derselbe Ablauf im Vordergrund ---------------------
  const ohne = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await ohne.addInitScript(() => { window.Worker = class { constructor() { throw new DOMException("gesperrt", "SecurityError"); } }; });
  await ohne.goto(`${server.adresse}/welt-pruefen.html`);
  await ohne.setInputFiles("#datei", FIXTURE);
  await ohne.waitForFunction(() => window.welt.status === "fertig", null, { timeout: 60_000 });
  const ergebnisOhne = await ohne.evaluate(() => JSON.stringify({ meta: window.welt.ergebnis.meta,
    kacheln: window.welt.ergebnis.kacheln.map((k) => [k.dim, k.kx, k.kz, Array.from(k.daten)]) }));
  pruefe(ergebnisOhne === await nodeErgebnis(FIXTURE) && (await ohne.textContent("#eKopf")).includes("Vordergrund"),
    "Worker gesperrt: Rückfall im Vordergrund, gleiches Ergebnis, als „Vordergrund“ gekennzeichnet");

  // ---- Kopieren verweigert (manche App-Ansichten): Text zum Markieren anzeigen ----------
  await ohne.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new DOMException("verweigert", "NotAllowedError")); });
  await ohne.click("#kopieren");
  const markiert = await ohne.evaluate(() => { const t = document.getElementById("berichtText");
    return !t.hidden && t.value.startsWith("Welt: Meine Welt (1)") && t.value.includes("Gerät:") && t.selectionEnd === t.value.length; });
  pruefe(markiert && (await ohne.textContent("#kopieren")).includes("markieren"), "Kopieren verweigert: Ergebnis erscheint markiert im Textfeld");

  // ---- Als Datei: Hinweis statt Auswahl -----------------------------------------------
  const d = await browser.newPage();
  await d.goto(new URL("../welt-pruefen.html", import.meta.url).href);
  pruefe(await d.isVisible("#nurHttp") && !(await d.isVisible("#waehlen")), "Als Datei: Hinweis „braucht http(s)“");
} finally {
  await browser.close();
  await server.schliessen();
  rmSync(TMP, { recursive: true, force: true });
}
