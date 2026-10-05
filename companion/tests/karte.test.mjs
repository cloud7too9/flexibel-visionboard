// Karte (Überarbeitung mit Max, 05.10.2026): Karte oben, Liste darunter, Namensschilder, deutsche Namen,
// Bottom-Bar nur Status + Eintragen (Screenshot steckt in Eintragen), Welt + Welt-Import in der Sidebar,
// Detail mit Koordinaten, Umrechnung, „Als erledigt markieren“ und Löschen nur mit Bestätigung.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const DIR = fileURLToPath(new URL("./bilder", import.meta.url));
mkdirSync(DIR, { recursive: true });
const DATEI = new URL("../companion-prototyp.html", import.meta.url).href;
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const fehler = [];
p.on("pageerror", (e) => fehler.push(e.message));
p.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
const warte = (ms = 350) => p.waitForTimeout(ms);
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const text = (sel) => p.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim());
const ENGLISCH = /\b(Village|Stronghold|Ancient City|Ruined Portal|Trial Chamber|Nether Fortress|Bastion|End City|Plains|Forest|Ocean)\b/;

await p.goto(DATEI + "?modul=karte");
await p.waitForFunction(() => typeof st !== "undefined" && st.welt && bm.kacheln?.size > 0);
await warte(600);

// ---- Aufbau: kein Umschalter, Karte oben, Liste darunter ------------------------------------
pruefe(await p.$("#orteAnsicht") === null && await p.evaluate(() => typeof ansichtWechseln === "undefined"), "kein Umschalter Karte | Liste mehr");
const lage = await p.evaluate(() => {
  const r = (id) => document.getElementById(id).getBoundingClientRect();
  return { karte: r("karteStage"), liste: r("orteStage") };
});
pruefe(lage.karte.height > 200 && lage.liste.top >= lage.karte.bottom - 1 && lage.liste.height > 120,
  `Karte oben (${Math.round(lage.karte.height)} px), Liste darunter (${Math.round(lage.liste.height)} px sichtbar)`);
const bb = await p.$$eval("#moduleKarte .bottombar .bb-item", (l) => l.map((x) => x.querySelector(".lab").textContent));
pruefe(JSON.stringify(bb) === '["Demo","Eintragen"]', `Bottom-Bar: ${bb.join(", ")}`);

// ---- Namensschilder: jeder Ort, deutsch -----------------------------------------------------
const schilder = await p.evaluate(() => {
  const texte = []; const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { texte.push(t); return orig.call(this, t, ...r); };
  karte.zeichnen(); CanvasRenderingContext2D.prototype.fillText = orig;
  return { texte, orte:sichtbareInstanzen().length };
});
const namen = schilder.texte.filter((t) => t.length > 2);
console.log("     Schilder:", namen.join(" | "));
pruefe(namen.includes("Hauptbasis") && namen.includes("Festung") && namen.includes("Dorf") && namen.includes("Antike Stätte"), "Schilder auch für Strukturen, nicht nur eigene Orte");
pruefe(!namen.some((t) => ENGLISCH.test(t)), "Schilder auf Deutsch");
pruefe(namen.length >= schilder.orte - 1, `fast alle Orte beschriftet (${namen.length} von ${schilder.orte}, Rest nur bei Platzmangel)`);
pruefe(!ENGLISCH.test(await text("#karteLegende")), `Legende deutsch: ${await text("#karteLegende")}`);
await p.screenshot({ path: `${DIR}/c1-karte-liste.png` });

// ---- Liste: eine Zeile je Ort, deutsche Namen ----------------------------------------------
const reihen = await p.$$eval(".ort-reihe", (l) => l.map((r) => r.querySelector(".ort-reihe-text b").textContent));
console.log("     Liste:", reihen.join(" | "));
pruefe(reihen.length === await p.evaluate(() => sichtbareInstanzen().length), `eine Zeile je Ort (${reihen.length})`);
pruefe(reihen.some((r) => r.startsWith("Festung")) && reihen.includes("Zerstörtes Portal") && !reihen.some((r) => ENGLISCH.test(r)), "Liste auf Deutsch");
pruefe(await p.$(".ort-kat-head, .ort-kat-chevron") === null, "keine aufklappbaren Kategorie-Karten mehr");
const filter = await p.$$eval("#orteFilter .seg-btn", (l) => l.map((x) => x.firstChild.textContent));
pruefe(filter.includes("Dorf") && filter.includes("Eigene Orte") && !filter.some((f) => ENGLISCH.test(f)), `Filter deutsch: ${filter.join(", ")}`);
await p.fill("#orteSuche", "festung"); await warte(150);
pruefe((await p.$$(".ort-reihe")).length === 1, "Suche findet auch deutsche Namen („festung“)");
await p.fill("#orteSuche", ""); await p.dispatchEvent("#orteSuche", "input"); await warte(150);

// ---- Detail: Koordinaten, Umrechnung, erledigt, Löschen mit Bestätigung --------------------
const festung = await p.evaluate(() => st.instanzen.find((i) => typVon(i).kategorie === "Stronghold").id);
await p.click(`.ort-reihe[data-id="${festung}"]`); await warte();
const det = await text("#orteSheetInhalt");
pruefe(det.includes("Koordinaten") && det.includes("Nether") && /Festung · Oberwelt/.test(await text(".sheet-kopf .sub")), `Detail: Koordinaten + Umrechnung, Unterzeile ${await text(".sheet-kopf .sub")}`);
const aktionen = await p.$$eval("#orteSheetInhalt [data-aktion]", (l) => l.map((x) => x.dataset.aktion));
pruefe(!aktionen.includes("kopieren") && !aktionen.includes("bearbeiten") && aktionen.includes("erledigt") && aktionen.includes("loeschen-fragen"),
  `Detail-Knöpfe: ${aktionen.join(", ")} (kein Kopieren, /tp, Bearbeiten)`);
await p.click('#orteSheetInhalt [data-aktion="erledigt"]'); await warte();
pruefe((await text("#orteSheetInhalt")).includes("Erledigt von Max") && await p.evaluate((id) => Boolean(st.instanzen.find((i) => i.id === id).erledigt), festung),
  "Als erledigt markiert: von Max, mit Datum");
await p.screenshot({ path: `${DIR}/c2-detail-erledigt.png` });
pruefe(await p.$eval(`.ort-reihe[data-id="${festung}"]`, (e) => e.classList.contains("erledigt") && Boolean(e.querySelector(".ort-erledigt"))), "Liste: erledigter Ort blass mit Haken");
const erledigtSchild = await p.evaluate(() => {
  const texte = []; const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { texte.push(t); return orig.call(this, t, ...r); };
  karte.zeichnen(); CanvasRenderingContext2D.prototype.fillText = orig; return texte;
});
pruefe(erledigtSchild.includes("✓ Festung"), "Karte: Schild „✓ Festung“");
await p.click('#orteSheetInhalt [data-aktion="erledigt"]'); await warte();
pruefe(!(await text("#orteSheetInhalt")).includes("Erledigt von"), "Zurückgenommen: nicht mehr erledigt");
const vorher = await p.evaluate(() => st.instanzen.length);
await p.click('#orteSheetInhalt [data-aktion="loeschen-fragen"]'); await warte(200);
pruefe(await p.evaluate(() => st.instanzen.length) === vorher && (await text("#orteSheetInhalt")).includes("Wirklich löschen"), "Löschen fragt erst nach");
await p.click('#orteSheetInhalt [data-aktion="detail"]'); await warte(200);
pruefe(await p.evaluate(() => st.instanzen.length) === vorher, "Abbrechen löscht nichts");
await p.click('#orteSheetInhalt [data-aktion="loeschen-fragen"]'); await warte(200);
await p.click('#orteSheetInhalt [data-aktion="loeschen"]'); await warte();
pruefe(await p.evaluate(() => st.instanzen.length) === vorher - 1, "Bestätigt → gelöscht");

// ---- Eintragen: Screenshot oder von Hand ----------------------------------------------------
await p.click("#orteEintragenBtn"); await warte();
const wahl = await p.$$eval("#orteSheetInhalt .eintragen-wahl", (l) => l.map((x) => x.dataset.aktion));
pruefe(JSON.stringify(wahl) === '["eintragen-screenshot","eintragen-hand"]', "Eintragen: Screenshot und Von Hand");
await p.screenshot({ path: `${DIR}/c3-eintragen.png` });
const [auswahl] = await Promise.all([p.waitForEvent("filechooser"), p.click('[data-aktion="eintragen-screenshot"]')]);
pruefe(auswahl.isMultiple(), "Screenshot öffnet die Dateiauswahl (mehrere möglich)");
await p.click("#orteEintragenBtn"); await warte();
await p.click('[data-aktion="eintragen-hand"]'); await warte();
pruefe(await p.evaluate(() => st.sheet) === "formular" && !ENGLISCH.test(await text("#formKategorie")), "Von Hand: Formular, Kategorien deutsch");
await p.click('#orteSheetInhalt [data-aktion="schliessen"]'); await warte();

// ---- Sidebar: Welt mit Welt-Import ----------------------------------------------------------
await p.click("#burgerBtn"); await warte();
pruefe((await text("#weltKnopf")).includes("Welt") && (await text("#weltKnopf")).includes("Biome importiert"), `Sidebar: ${await text("#weltKnopf")}`);
await p.screenshot({ path: `${DIR}/c4-sidebar-welt.png` });
await p.click("#weltKnopf"); await warte();
pruefe(await p.evaluate(() => st.sheet) === "welt" && (await text("#orteSheetInhalt")).includes("Biome dieser Welt"), "Welt-Sheet mit Biomen dieser Welt");
await p.click('#orteSheetInhalt [data-aktion="welt-import"]'); await warte();
pruefe((await text("#orteSheetInhalt")).includes("Weltordner"), "„Welt-Import …“ öffnet den Welt-Import");
await p.click('#orteSheetInhalt [data-aktion="schliessen"]'); await warte();

// ---- Nether: deutsche Biome im Detail -------------------------------------------------------
await p.evaluate(() => dimWechseln("nether")); await warte(500);
const bastion = await p.evaluate(() => st.instanzen.find((i) => typVon(i).kategorie === "Bastion").id);
await p.click(`.ort-reihe[data-id="${bastion}"]`); await warte();
const sub = await text(".sheet-kopf .sub");
pruefe(!ENGLISCH.test(sub) && !/Crimson|Warped|Wastes|Basalt|Soul/.test(sub), `Detail Nether deutsch: ${sub}`);
await p.screenshot({ path: `${DIR}/c5-nether.png` });

pruefe(fehler.length === 0, `keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);
await b.close();
