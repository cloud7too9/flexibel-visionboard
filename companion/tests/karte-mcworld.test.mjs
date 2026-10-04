// Welt-Import (Biome aus .zip/.mcworld) in der Karte: Anleitung, Aufbauprüfung, Bestätigung mit
// Weltname und Seed, Lesen im Worker, Prüfliste, Übernehmen, Biom-Ebene, Löschen – im DEMO über http,
// als Datei und live gegen ein echtes Board. Die Welten baut welt-bauen.mjs (synthetisch); eine echte
// Welt von Max (tests/daten/fixture-seed.mcworld) gibt es noch nicht.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { companionAusliefern, CHROMIUM_OPTIONEN } from "./hilfen.mjs";
import { SEITE_URL } from "../companion-ordner.mjs";
import { testweltBauen, zipBauen, levelDatBauen, SEED } from "./welt-bauen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));

// Test-ZIPs je Fall (planung/PLAN.md, Strang C): korrekt, mit Unterordner, ohne db/, keine ZIP
const ZIP = { mimeType: "application/zip" };
const DATEIEN = {
  korrekt: { name: "Archiv.zip", ...ZIP, buffer: Buffer.from(testweltBauen({ levelname: "Unsere Welt" }).zip) },
  unterordner: { name: "Archiv.zip", ...ZIP, buffer: Buffer.from(testweltBauen({ levelname: "Unsere Welt", ordner: "Unsere Welt/" }).zip) },
  ohneDb: { name: "Archiv.zip", ...ZIP, buffer: Buffer.from(testweltBauen({ ohne: ["db/"] }).zip) },
  keinZip: { name: "Notizen.txt", mimeType: "text/plain", buffer: Buffer.from("Das ist keine Welt") },
  mcworld: { name: "Realm.mcworld", mimeType: "application/octet-stream", buffer: Buffer.from(testweltBauen({ levelname: "Realm" }).zip) },
  andererSeed: { name: "Archiv.zip", ...ZIP, buffer: Buffer.from(testweltBauen({ levelname: "Kreativ", seed: "-123456789" }).zip) },
  leer: { name: "Archiv.zip", ...ZIP, buffer: Buffer.from(zipBauen([["level.dat", levelDatBauen({ seed: SEED })],
    ["db/CURRENT", new TextEncoder().encode("MANIFEST-000001\n")]])) },
};

const browser = await chromium.launch(CHROMIUM_OPTIONEN);
const fehler = [];
async function handy() {
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await kontext.newPage();
  p.on("pageerror", (e) => fehler.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) fehler.push(m.text()); });
  return p;
}
const text = (p, sel) => p.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
const warteAuf = (p, fn, arg, ms = 8000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const sheet = (p) => text(p, "#orteSheetInhalt");
/** Datei wählen wie am Handy (die versteckte Eingabe hinter „Archiv.zip auswählen“) */
const hochladen = (p, datei) => p.setInputFiles("#weltDatei", datei);
/** Bildschirmposition einer Blockkoordinate auf der Karte */
const anStelle = (p, x, z) => p.evaluate(([x, z]) => {
  const c = document.getElementById("ortKarte").getBoundingClientRect();
  karte.zentrieren(x, z);
  return [c.left + c.width / 2, c.top + c.height / 2 - (c.height * 0.22)];
}, [x, z]);

let server = null, board = null, tmp = null;
try {
  // ======================================================================================
  // DEMO über http: Worker und Dekoder laufen als ES-Module
  // ======================================================================================
  server = await companionAusliefern(3191);
  const p = await handy();
  await p.goto(`${server.adresse}/index.html?demo=1&modul=karte`);
  await warteAuf(p, () => st.welt && bm.weltId === st.weltId && bm.import);
  await p.evaluate(() => { ansichtWechseln("karte"); dimWechseln("overworld"); });
  await schlafen(400);

  // ---- Demo-Biome auf der Karte ----
  const demo = await p.evaluate(() => ({ kacheln: bm.kacheln.size, chunks: bm.import.chunks,
    hinweis: document.getElementById("karteHinweis").textContent.replace(/\s+/g, " "), legende: document.getElementById("karteLegende").textContent,
    knopf: !document.getElementById("karteBiome").hidden }));
  pruefe(demo.kacheln > 4 && demo.chunks.overworld > 1000 && demo.chunks.nether > 0, `Demo-Welt hat Biome: ${demo.kacheln} Kacheln, ${JSON.stringify(demo.chunks)}`);
  pruefe(/^512 Blöcke · Biome 28\.9\. · [\d ]+ Chunks$/.test(demo.hinweis), `Hinweis: ${demo.hinweis}`);
  pruefe(/Plains|Forest|Ocean/.test(demo.legende) && demo.knopf, `Legende mit Biomen, Knopf sichtbar: ${demo.legende}`);
  // Kacheln werden wirklich gezeichnet (32 × 32-Bilder)
  const gezeichnet = () => p.evaluate(() => {
    let n = 0; const orig = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (b, ...r) { if (b instanceof HTMLCanvasElement && b.width === 32) n++; return orig.call(this, b, ...r); };
    karte.zeichnen(); CanvasRenderingContext2D.prototype.drawImage = orig; return n;
  });
  pruefe((await gezeichnet()) > 0, "Biom-Kacheln werden gezeichnet");
  await p.screenshot({ path: `${DIR}/m1-karte-demo.png` });

  // Antippen: Biom an der Stelle, außerhalb „unerkundet“
  const zahlLesen = (t) => Number(t.replace(/\s/g, "").replace("−", "-"));
  let [px, py] = await anStelle(p, 8, 8);
  await p.mouse.click(px, py); await schlafen(250);
  const tippSpawn = await text(p, ".karte-legende .tipp");
  const [, tx, tz, tname] = tippSpawn.match(/^X ([−\d ]+) · Z ([−\d ]+) · (.+)$/) || [];
  const sollSpawn = tx && await p.evaluate(([x, z]) => biomAnStelle("overworld", x, z)?.name, [zahlLesen(tx), zahlLesen(tz)]);
  pruefe(Boolean(sollSpawn) && tname === sollSpawn && Math.abs(zahlLesen(tx) - 8) <= 2 && Math.abs(zahlLesen(tz) - 8) <= 2,
    `Tippen am Spawn: „${tippSpawn}“`);
  await p.screenshot({ path: `${DIR}/m2-karte-tippen.png` });
  [px, py] = await anStelle(p, 20000, 20000);
  await p.mouse.click(px, py); await schlafen(250);
  const tippAussen = await text(p, ".karte-legende .tipp");
  pruefe(/^X (19 9|20 0)\d\d · Z (19 9|20 0)\d\d · unerkundet$/.test(tippAussen), `Tippen außerhalb: „${tippAussen}“`);
  // Ebene aus- und wieder einblenden (am Spawn, dort liegen Kacheln)
  await p.evaluate(() => karte.zentrieren(0, 0)); await schlafen(200);
  await p.click("#karteBiome"); await schlafen(200);
  pruefe((await p.getAttribute("#karteBiome", "aria-pressed")) === "false" && (await gezeichnet()) === 0
    && (await p.evaluate(() => lsLesen("orte.biome"))) === false, "Biome ausgeblendet (merkt sich das Gerät)");
  await p.click("#karteBiome"); await schlafen(200);
  pruefe((await gezeichnet()) > 0, "Biome wieder eingeblendet");
  // Nether: eigene Kacheln
  await p.evaluate(() => dimWechseln("nether")); await schlafen(300);
  pruefe(/Nether Wastes|Soul Sand|Crimson|Warped|Basalt/.test(await text(p, "#karteLegende")), "Nether zeigt Nether-Biome");
  await p.screenshot({ path: `${DIR}/m3-karte-nether.png` });
  await p.evaluate(() => dimWechseln("overworld")); await schlafen(200);

  // ---- Import-Sheet: Anleitung, Stand ----
  await p.click("#orteImportBtn"); await schlafen(300);
  let s = await sheet(p);
  pruefe(s.includes("Weltordner aus der Dateien-App hochladen") && s.includes("iPhone") && s.includes("minecraftWorlds")
    && (await p.$$eval(".wi-anleitung li", (l) => l.length)) === 3, "Anleitung: drei Schritte, nur iPhone");
  pruefe(s.includes("Stand28.9.2026") && s.includes("Import löschen") && s.includes("nur in Gebieten, die schon jemand besucht hat"),
    "Stand des Imports, Löschen, Hinweis auf besuchte Gebiete");
  await p.screenshot({ path: `${DIR}/m4-import-start.png` });

  // ---- Aufbauprüfung ----
  await hochladen(p, DATEIEN.keinZip);
  pruefe(await warteAuf(p, () => document.querySelector("#orteSheetInhalt .banner.bad")?.textContent === "Bitte die erzeugte Archiv.zip auswählen."),
    "Keine ZIP → „Bitte die erzeugte Archiv.zip auswählen.“");
  await hochladen(p, DATEIEN.ohneDb);
  pruefe(await warteAuf(p, () => document.querySelector("#orteSheetInhalt .banner.bad")?.textContent === "Das sieht nicht nach einem Minecraft-Weltordner aus."),
    "Ohne db/ → „Das sieht nicht nach einem Minecraft-Weltordner aus.“");
  await p.screenshot({ path: `${DIR}/m5-import-fehler.png` });

  // ---- Bestätigung: Weltname aus levelname.txt, Seed – mit Unterordner ohne Hinweis ----
  await hochladen(p, DATEIEN.unterordner);
  pruefe(await warteAuf(p, () => wi.schritt === "bestaetigen"), "Mit Unterordner angenommen");
  s = await sheet(p);
  pruefe(s.includes("Unsere Welt") && s.includes(`${SEED} ✔`) && s.includes("1.26.50") && !s.includes("Ordner")
    && !(await p.$("#orteSheetInhalt .banner")), `Bestätigung ohne Hinweis: ${s.slice(0, 140)}`);
  await p.screenshot({ path: `${DIR}/m6-bestaetigen.png` });

  // ---- Lesen im Worker → Prüfliste ----
  await p.click('[data-aktion="wi-lesen"]');
  pruefe(await warteAuf(p, () => wi.schritt === "pruefliste"), "Worker liest die Welt");
  s = await sheet(p);
  pruefe(s.includes("1 305 Chunks") && s.includes("Oberwelt1 279 Chunks") && s.includes("Nether24 Chunks") && s.includes("End2 Chunks"),
    "Prüfliste: Chunks je Dimension");
  pruefe(s.includes("Unbekannte Biom-IDs") && s.includes("192 · 3 Chunks, z. B. Oberwelt X 488 Z 8"), "Unbekannte ID mit Beispielkoordinate");
  pruefe(s.includes("Ersetzt den Import vom 28.9.2026"), "Hinweis: ersetzt den alten Import");
  const vorschau = await p.$eval(".wi-vorschau", (i) => [i.naturalWidth, i.naturalHeight]);
  pruefe(vorschau[0] === 80 && vorschau[1] === 16, `Vorschau 1 Pixel je erkundetem Chunk (${vorschau.join(" × ")}: cx −40…39, cz −8…7)`);
  pruefe(/Forest\d+ %/.test(s) && /Desert\d+ %/.test(s), "Häufigste Biome mit Anteil");
  await p.screenshot({ path: `${DIR}/m7-pruefliste.png`, fullPage: true });
  await p.click('[data-wi-dim="nether"]'); await schlafen(200);
  pruefe((await text(p, ".wi-biome")).startsWith("Nether Wastes100 %"), "Prüfliste Nether: Netherödnis (feste Höhe 64)");

  // ---- Übernehmen ----
  await p.click('[data-aktion="wi-uebernehmen"]');
  pruefe(await warteAuf(p, () => st.sheet === null && bm.import?.dateiname === "Archiv.zip"), "Übernommen, Sheet zu");
  const nachher = await p.evaluate(() => ({ toast: document.getElementById("orteToast").textContent.replace(/\s+/g, " "), ansicht: st.ansicht,
    pilz: biomAnStelle("overworld", 24, 24)?.name, fluss: biomAnStelle("overworld", 40, 40)?.name, alt: biomAnStelle("overworld", 2000, 2000),
    unbekannt: biomAnStelle("overworld", 488, 8), weltname: bm.import.weltname, von: bm.import.von, mock: MOCK.biome.w_1.kacheln.length }));
  pruefe(nachher.toast === "Biome übernommen · 1 305 Chunks" && nachher.ansicht === "karte", `Toast: ${nachher.toast}`);
  pruefe(nachher.pilz === "Mushroom Fields" && nachher.fluss === "River" && nachher.alt === null && nachher.unbekannt?.unbekannt === 192,
    "Neue Biome auf der Karte, alte ersetzt, unbekannte ID bleibt unbekannt");
  pruefe(nachher.weltname === "Unsere Welt" && nachher.von === "Max" && nachher.mock === 13, `Import im Mock gespeichert (${nachher.mock} Kacheln: 8 Oberwelt, 4 Nether, 1 End)`);
  await p.evaluate(() => karte.zentrieren(0, 0)); await schlafen(200);
  await p.screenshot({ path: `${DIR}/m8-karte-import.png` });

  // ---- Seed passt nicht: andere Welt gewählt ----
  await p.evaluate(() => weltLaden("w_2")); await schlafen(400);
  await p.click("#orteImportBtn"); await schlafen(200);
  pruefe(!(await sheet(p)).includes("Import löschen"), "Welt 2 hat keinen Import");
  await hochladen(p, DATEIEN.korrekt);
  await warteAuf(p, () => wi.schritt === "bestaetigen");
  s = await sheet(p);
  pruefe(s.includes(`${SEED} ✘`) && s.includes("anderen Seed") && await p.$eval('[data-aktion="wi-lesen"]', (b) => b.disabled),
    "Anderer Seed: ✘, „Biome lesen“ gesperrt");
  pruefe(s.includes("Zur Welt mit diesem Seed wechseln"), "Angebot: zur Welt mit diesem Seed wechseln");
  await p.screenshot({ path: `${DIR}/m9-seed-falsch.png` });
  await p.click('[data-aktion="wi-welt-wechseln"]');
  pruefe(await warteAuf(p, () => st.weltId === "w_1" && document.querySelector("#orteSheetInhalt")?.textContent.includes("✔")), "Gewechselt, Seed ✔");
  // Seed, den es noch nicht gibt → neue Welt anlegen und hinein importieren
  await hochladen(p, DATEIEN.andererSeed);
  await warteAuf(p, () => wi.schritt === "bestaetigen");
  pruefe((await sheet(p)).includes("Neue Welt mit diesem Seed anlegen"), "Angebot: neue Welt mit diesem Seed");
  await p.click('[data-aktion="wi-welt-anlegen"]');
  pruefe(await warteAuf(p, () => st.welt?.seed === "-123456789" && !document.querySelector('[data-aktion="wi-lesen"]').disabled), "Neue Welt angelegt, Lesen frei");
  await p.click('[data-aktion="wi-lesen"]');
  await warteAuf(p, () => wi.schritt === "pruefliste");
  await p.click('[data-aktion="wi-uebernehmen"]');
  pruefe(await warteAuf(p, () => bm.weltId === st.weltId && bm.import?.weltname === "Kreativ"), "Import in die neue Welt");

  // ---- .mcworld geht genauso, Verwerfen, leere Welt ----
  await p.evaluate(() => weltLaden("w_1")); await schlafen(300);
  await p.click("#orteImportBtn"); await schlafen(200);
  await hochladen(p, DATEIEN.mcworld);
  pruefe(await warteAuf(p, () => wi.schritt === "bestaetigen" && wi.welt.weltname === "Realm"), ".mcworld wird angenommen");
  await p.click('[data-aktion="wi-lesen"]'); await warteAuf(p, () => wi.schritt === "pruefliste");
  await p.click('[data-aktion="wi-verwerfen"]'); await schlafen(200);
  pruefe((await p.evaluate(() => [wi.schritt, bm.import.weltname])).join() === "start,Unsere Welt", "Verwerfen lässt den alten Import stehen");
  await hochladen(p, DATEIEN.leer);
  await warteAuf(p, () => wi.schritt === "bestaetigen"); await p.click('[data-aktion="wi-lesen"]');
  await warteAuf(p, () => wi.schritt === "pruefliste");
  pruefe((await sheet(p)).includes("noch nichts erkundet") && await p.$eval('[data-aktion="wi-uebernehmen"]', (b) => b.disabled),
    "Leere Welt: nichts zu übernehmen");
  await p.click('[data-aktion="wi-verwerfen"]'); await schlafen(200);

  // ---- Import löschen (zweimal tippen) ----
  await p.click('[data-aktion="wi-loeschen"]');
  pruefe((await text(p, '[data-aktion="wi-loeschen"]')) === "Wirklich löschen?" && (await p.evaluate(() => Boolean(bm.import))), "Erstes Tippen fragt nach");
  await p.click('[data-aktion="wi-loeschen"]');
  pruefe(await warteAuf(p, () => bm.import === null && bm.kacheln.size === 0 && !MOCK.biome.w_1), "Import gelöscht");
  await p.click('[data-aktion="schliessen"]'); await schlafen(200);
  pruefe((await text(p, "#karteHinweis")).includes("keine Biome – Welt-Import") && await p.$eval("#karteBiome", (b) => b.hidden),
    "Karte: keine Biome, Knopf weg");

  // ---- Screenshot mit Biom-Popup: ausgegraut, Biome kommen aus dem Welt-Import ----
  await p.evaluate(() => { MOCK.ocr = 1; });   // die simulierte Texterkennung liefert als Nächstes „Cherry Grove“
  await p.setInputFiles("#orteDatei", { name: "biom.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") });
  await warteAuf(p, () => st.importe.length && st.importe.every((e) => !["wartet", "lese"].includes(e.status)));
  const karteBiom = await p.$eval("[data-import]", (k) => ({ aus: k.classList.contains("aus"), text: k.textContent.replace(/\s+/g, " "),
    schalter: Boolean(k.querySelector(".switch")), felder: Boolean(k.querySelector("[data-koord]")) }));
  pruefe(karteBiom.aus && karteBiom.text.includes("Biome kommen aus dem Welt-Import") && !karteBiom.schalter && !karteBiom.felder,
    "Biom aus Screenshot: ausgegraut mit Hinweis");
  pruefe(await p.$eval('[data-aktion="import-speichern"]', (b) => b.disabled), "Nichts zu speichern");
  await p.screenshot({ path: `${DIR}/m10-screenshot-biom.png` });
  await p.evaluate(() => { st.importe = []; alleSchliessen(); });
  pruefe(!(await p.evaluate(() => kategorienManuell("overworld").includes(BIOMES))), "Von Hand: keine Biome");
  await p.close();

  // ======================================================================================
  // Als Datei geöffnet: Demo-Biome ja, Import nein (Worker braucht http)
  // ======================================================================================
  const d = await handy();
  await d.goto(SEITE_URL + "?modul=karte");
  await warteAuf(d, () => st.welt && bm.import);
  pruefe(await d.evaluate(() => bm.kacheln.size > 0), "Als Datei: Demo-Biome aus dem Mock");
  await d.click("#orteImportBtn"); await schlafen(200);
  await d.setInputFiles("#weltDatei", DATEIEN.korrekt);
  pruefe(await warteAuf(d, () => document.querySelector("#orteSheetInhalt .banner.bad")?.textContent.includes("vom Board kommt (http)")),
    "Als Datei: Hinweis, dass der Import http braucht");
  await d.close();

  // ======================================================================================
  // Live: Board liefert Worker, Dekoder und Bibliothek aus und speichert den Import
  // ======================================================================================
  tmp = mkdtempSync(path.join(tmpdir(), "mcworld-test-"));
  const PORT = 3190, BOARD = `http://127.0.0.1:${PORT}`;
  board = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(HIER, "../../koordinaten-board/server"),
    env: { ...process.env, PORT: String(PORT), RAUM_PIN: "4711", DATEN_ORDNER: path.join(tmp, "daten") }, stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BOARD}/api/server`)).ok) break; } catch {} await schlafen(200); }
  const token = (await (await fetch(`${BOARD}/api/beitreten`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin: "4711", name: "Tim", kontoPin: "9753" }) })).json()).token;
  const welt = (await (await fetch(`${BOARD}/api/orte/welten`, { method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ seed: SEED }) })).json()).welt;
  const beitreten = async (q, name) => {
    await q.goto(`${BOARD}/?pin=4711`);
    await q.waitForSelector("#boardName"); await q.fill("#boardName", name); await q.fill("#boardKontoPin", "2468");
    await q.click('[data-aktion="board-beitreten"]');
    return warteAuf(q, () => !DEMO.enabled && bd.verbindung?.name && st.welt && bm.weltId === st.weltId);
  };
  const max = await handy(), lena = await handy();
  pruefe(await beitreten(max, "Max") && await beitreten(lena, "Lena"), "Max und Lena treten bei");
  pruefe(await lena.evaluate(() => bm.import === null), "Live: noch keine Biome");
  await max.evaluate(() => ansichtWechseln("karte"));
  await max.click("#orteImportBtn"); await schlafen(200);
  await hochladen(max, DATEIEN.korrekt);
  await warteAuf(max, () => wi.schritt === "bestaetigen");
  await max.click('[data-aktion="wi-lesen"]');
  pruefe(await warteAuf(max, () => wi.schritt === "pruefliste"), "Live: Worker vom Board liest die Welt");
  await max.click('[data-aktion="wi-uebernehmen"]');
  pruefe(await warteAuf(max, () => bm.import?.von === "Max"), "Live: Import gespeichert");
  pruefe(await warteAuf(lena, () => bm.import?.weltname === "Unsere Welt" && bm.kacheln.size === 13), "Live: Lena bekommt die Biome sofort");
  const gespeichert = await (await fetch(`${BOARD}/api/welten/${welt.id}/biome`, { headers: { authorization: `Bearer ${token}` } })).json();
  pruefe(gespeichert.kacheln.length === 13 && gespeichert.import.chunks.overworld === 1279, "Live: Board liefert die Kacheln aus");
  await lena.evaluate(() => { ansichtWechseln("karte"); karte.zentrieren(0, 0); }); await schlafen(300);
  await lena.screenshot({ path: `${DIR}/m11-live-lena.png` });
  // Lena löscht, Max sieht es
  await lena.click("#orteImportBtn"); await schlafen(200);
  await lena.click('[data-aktion="wi-loeschen"]'); await lena.click('[data-aktion="wi-loeschen"]');
  pruefe(await warteAuf(max, () => bm.import === null && bm.kacheln.size === 0), "Live: Löschen kommt bei Max an");
} catch (f) {
  pruefe(false, `Abbruch: ${f.stack || f}`);
} finally {
  pruefe(fehler.length === 0, `keine Fehler in der Konsole${fehler.length ? `: ${fehler.join(" | ")}` : ""}`);
  await browser.close();
  await server?.schliessen();
  if (board) { board.kill("SIGTERM"); await new Promise((r) => board.once("exit", r)); }
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
