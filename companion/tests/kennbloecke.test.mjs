// Kennblöcke (icons/struktur_kennbloecke) in der Karte: Liste, Canvas-Marker, Detail, Screenshot-Prüfliste
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import path from "node:path";
const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
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

// Canvas: drawImage mitzählen, bevor die Seite zeichnet
await p.addInitScript(() => {
  window.__kennblockZeichnungen = [];
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (bild, ...rest) {
    if (bild instanceof HTMLImageElement && bild.src.includes("struktur_kennbloecke")) window.__kennblockZeichnungen.push(bild.src.split("/").pop());
    return orig.call(this, bild, ...rest);
  };
});
await p.goto(DATEI + "?modul=karte");
await warte(900);
await p.evaluate(() => { ansichtWechseln("karte"); dimWechseln("overworld"); });
await warte(600);

// Welche sichtbaren Marker haben laut Stammdaten einen Kennblock?
const erwartet = (dim) => p.evaluate((d) => [...new Set(st.instanzen
  .filter((i) => i.dimensionId === dimIdVon(d))
  .map((i) => kennblockDatei(typVon(i).kategorie)).filter(Boolean)
  .map((f) => f.split("/").pop()))].sort(), dim);
const gezeichnet = async () => {
  await p.evaluate(() => { window.__kennblockZeichnungen = []; karte.zeichnen(); });
  return p.evaluate(() => [...new Set(window.__kennblockZeichnungen)].sort());
};
for (const dim of ["overworld", "nether", "end"]) {
  await p.evaluate((d) => dimWechseln(d), dim); await warte(400);
  const soll = await erwartet(dim), ist = await gezeichnet();
  pruefe(soll.length > 0 && JSON.stringify(soll) === JSON.stringify(ist), `Canvas ${dim}: ${ist.join(", ") || "keine"} (erwartet ${soll.join(", ")})`);
  await p.screenshot({ path: `${DIR}/k1-karte-${dim}.png` });
}
// Ohne Bild (Dorf, eigene Orte) bleibt das Symbol: Marker ohne Kennblock werden weiter mit Text gezeichnet
await p.evaluate(() => dimWechseln("overworld")); await warte(300);
const symbole = await p.evaluate(() => {
  const texte = []; const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { texte.push(t); return orig.call(this, t, ...r); };
  karte.zeichnen(); CanvasRenderingContext2D.prototype.fillText = orig; return texte;
});
pruefe(symbole.includes("■") && symbole.includes("♜") && !symbole.includes("★"), "Canvas: Dorf ■ und eigene Orte ♜ als Symbol, Festung ★ als Bild");

// ---- Liste --------------------------------------------------------------------------------
await p.evaluate(() => ansichtWechseln("liste")); await warte(400);
const koepfe = () => p.$$eval(".ort-kat", (l) => l.map((k) => ({
  kat: k.dataset.kat,
  bild: Boolean(k.querySelector(".ort-kat-icon img.kennblock")?.naturalWidth),
  symbol: k.querySelector(".ort-kat-icon img") ? null : k.querySelector(".ort-kat-icon").textContent,
})));
const pruefeKoepfe = async (dim) => {
  const k = await koepfe();
  const mitBild = await p.evaluate(() => Object.keys(STRUKTUREN).filter((kat) => kennblockDatei(kat)));
  const falsch = k.filter((x) => x.bild !== mitBild.includes(x.kat));
  console.log(`     ${dim}:`, k.map((x) => `${x.kat}=${x.bild ? "Bild" : x.symbol}`).join(", "));
  pruefe(falsch.length === 0 && k.some((x) => x.bild), `Liste ${dim}: Kennblock genau bei den Strukturen mit Bild`);
};
await pruefeKoepfe("overworld");
await p.evaluate(() => {
  const stage = document.getElementById("orteStage"), s = document.querySelector('.ort-kat[data-kat="Stronghold"]');
  stage.scrollBy(0, s.getBoundingClientRect().top - stage.getBoundingClientRect().top - 12);
});
await warte(200);
await p.screenshot({ path: `${DIR}/k2-liste.png` });
await p.evaluate(() => dimWechseln("nether")); await warte(400);
await pruefeKoepfe("nether");
await p.screenshot({ path: `${DIR}/k3-liste-nether.png` });

// ---- Detail -------------------------------------------------------------------------------
const idVon = (kat) => p.evaluate((k) => st.instanzen.find((i) => typVon(i).kategorie === k)?.id, kat);
await p.evaluate((id) => detailOeffnen(id), await idVon("Bastion")); await warte();
pruefe(await p.$eval(".sheet-kopf-bild img.kennblock", (e) => e.naturalWidth > 0 && e.src.endsWith("bastion_remnant.png")), "Detail Bastion: Kennblock im Kopf");
await p.screenshot({ path: `${DIR}/k4-detail-bastion.png` });
await p.evaluate(() => dimWechseln("overworld")); await warte(300);
await p.evaluate((id) => detailOeffnen(id), await idVon("Eigene Orte")); await warte();
pruefe(await p.$eval(".sheet-kopf-bild", (e) => e.textContent) === "♜", "Detail eigener Ort: Symbol ♜");
await p.evaluate((id) => detailOeffnen(id), await idVon("Village")); await warte();
pruefe(await p.$eval(".sheet-kopf-bild", (e) => e.textContent) === "■", "Detail Dorf (kein Bild): Symbol ■");
await p.click('#orteSheetInhalt [data-aktion="schliessen"]'); await warte();

// ---- Screenshot-Prüfliste (DEMO-Texterkennung: Stronghold, Cherry Grove, nichts, …) ------
const bild = path.join(HIER, "../../referenz/seedmap/stronghold-popup.png");
await p.setInputFiles("#orteDatei", [bild, bild, bild]);
await p.waitForFunction(() => st.importe?.length === 3 && st.importe.every((e) => e.status !== "wartet" && e.status !== "lese"), null, { timeout: 15000 });
await warte(300);
const karten = await p.$$eval("[data-import]", (l) => l.map((c) => ({
  titel: c.querySelector(".card-title").textContent.trim(),
  bild: c.querySelector(".imp-kennblock img.kennblock")?.getAttribute("src") || null,
  symbol: c.querySelector(".imp-kennblock img") ? null : c.querySelector(".imp-kennblock")?.textContent ?? null,
  vorschau: c.querySelector(".imp-kopf > img")?.getBoundingClientRect().width,
})));
console.log("     Prüfliste:", karten.map((k) => `${k.titel} [${k.bild || k.symbol || "–"}]`).join(" | "));
pruefe(karten[0].bild === "icons/struktur_kennbloecke/stronghold.png", "Prüfliste: Stronghold mit Kennblock");
pruefe(karten[1].symbol === "◍", "Prüfliste: Biom mit Symbol ◍");
pruefe(karten[2].bild === null && karten[2].symbol === null, "Prüfliste: nicht erkannt ohne Kennblock");
pruefe(karten.every((k) => Math.round(k.vorschau) === 52), "Screenshot-Vorschau bleibt 52 px");
await p.screenshot({ path: `${DIR}/k5-pruefliste.png` });

pruefe(fehler.length === 0, `keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);
await b.close();
