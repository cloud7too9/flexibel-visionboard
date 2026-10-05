import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const DATEI = new URL("../companion-prototyp.html", import.meta.url).href;
const ICONS = path.join(HIER, "../icons");
const MANIFEST = JSON.parse(readFileSync(path.join(ICONS, "manifest.json"), "utf8"));
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const fehler = [];
p.on("pageerror", (e) => fehler.push(e.message));
p.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
const warte = (ms = 350) => p.waitForTimeout(ms);
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const text = (sel) => p.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim());
const koepfe = () => p.$$eval(".ach-cat-head", (l) => l.map((k) => ({
  name: k.querySelector(".ach-cat-name").firstChild.textContent,
  en: k.querySelector(".ach-cat-name .en").textContent,
  bild: k.querySelector("img.kennblock")?.getAttribute("src") || null,
  geladen: Boolean(k.querySelector("img.kennblock")?.naturalWidth),
  symbol: k.querySelector("img.kennblock") ? null : k.querySelector(".ach-cat-icon").textContent,
})));

// ---- Stammdaten ↔ icons/manifest.json -----------------------------------------------------
await p.goto(DATEI + "?modul=sammelobjekte");
await warte(900);
const { strukturen, objekte } = await p.evaluate(() => ({ strukturen: STRUKTUREN, objekte: SAMMELOBJEKTE }));
const fundorte = Object.fromEntries(MANIFEST.fundorte.map((f) => [f.struktur, f]));
for (const [kategorie, s] of Object.entries(strukturen)) {
  const f = fundorte[s.id];
  pruefe(f && f.name === s.name, `${kategorie} → ${s.id} „${s.name}“ wie im Manifest`);
  const besaetze = objekte.filter((o) => o.kategorie === kategorie && !o.aufwertung).map((o) => `${o.id}_armor_trim_smithing_template`).sort();
  pruefe(JSON.stringify(besaetze) === JSON.stringify([...(f?.besaetze || [])].sort()), `${s.name}: Besätze wie im Manifest (${besaetze.length})`);
  const datei = existsSync(path.join(ICONS, "struktur_kennbloecke", `${s.id}.png`));
  pruefe(datei === (s.bild !== false), `${s.name}: ${datei ? "Bild vorhanden" : "kein Bild"}, bild:${s.bild !== false}`);
}
pruefe(Object.keys(strukturen).length === MANIFEST.fundorte.length, `alle ${MANIFEST.fundorte.length} Fundorte aus dem Manifest bekannt`);
pruefe(objekte.every((o) => strukturen[o.kategorie]), "jedes Sammelobjekt hat eine Fundort-Struktur");

// ---- Liste: Kennblöcke im Kopf ------------------------------------------------------------
let k = await koepfe();
console.log("     Köpfe:", k.map((x) => x.name).join(", "));
pruefe(k.length === 13, `13 Fundorte (${k.length})`);
pruefe(k[0].name === "Plünderer-Außenposten" && k[0].en === "Outpost", "deutscher Name, Seed-Map-Name klein darunter");
pruefe(k.filter((x) => x.geladen).length === 12, `12 Kennblöcke geladen (${k.filter((x) => x.geladen).length})`);
const pfad = k.find((x) => x.name === "Pfadruinen");
pruefe(pfad && pfad.symbol === "⌗" && !pfad.bild, "Pfadruinen ohne Bild: Symbol ⌗");
pruefe(k.find((x) => x.name === "Netherfestung").bild === "icons/struktur_kennbloecke/fortress.png", "Netherfestung → fortress.png");
pruefe((await text('[data-sam-kat="nether:Nether Fortress"] .ach-cat-name')).includes("Nether"), "Nether-Fundort trägt Dimensions-Hinweis");
const groesse = await p.$eval(".ach-cat-icon img.kennblock", (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
pruefe(groesse[0] > 24 && groesse[0] <= 38 && groesse[1] <= 38, `Kennblock passt in den Kasten (${groesse.join("×")})`);
const schmal = await p.$eval("#samListe", (e) => e.scrollWidth <= e.clientWidth);
pruefe(schmal, "kein waagrechtes Scrollen bei 390 px");
await p.screenshot({ path: `${DIR}/s1-liste.png` });
await p.evaluate(() => {
  const stage = document.getElementById("samStage"), el = document.querySelector('[data-sam-kat="overworld:Trail Ruins"]');
  stage.scrollTo(0, stage.scrollTop + el.getBoundingClientRect().top - stage.getBoundingClientRect().top - 14);
});
await warte(150);
await p.screenshot({ path: `${DIR}/s2-pfadruinen.png` });
await p.evaluate(() => document.getElementById("samStage").scrollTo(0, 99999));
await warte(150);
await p.screenshot({ path: `${DIR}/s3-nether-end.png` });

// ---- Zier-Übersicht im Kopf ----------------------------------------------------------------
await p.evaluate(() => document.getElementById("samStage").scrollTo(0, 0)); await warte(150);
const zier = () => p.$$eval("#samUebersicht .sam-zier", (l) => l.map((z) => {
  const r = z.getBoundingClientRect(), bild = z.querySelector("img.item-bild");
  return { id: z.dataset.samZier, gefunden: z.classList.contains("gefunden"), haken: Boolean(z.querySelector(".sam-zier-haken")),
    x: Math.round(r.left), y: Math.round(r.top), b: Math.round(r.width), geladen: Boolean(bild?.naturalWidth) };
}));
let zr = await zier();
const listenReihe = await p.$$eval("#samListe .sam-item", (l) => l.map((e) => e.dataset.sam));
const besatzReihe = listenReihe.filter((id) => !objekte.find((o) => o.id === id).aufwertung);
pruefe(zr.length === 18, `Übersicht zeigt alle 18 Besätze (${zr.length}), ohne Netheritaufwertung`);
pruefe(JSON.stringify(zr.map((z) => z.id)) === JSON.stringify(besatzReihe), "Übersicht in der Reihenfolge der Liste");
const zeilen = [...new Set(zr.map((z) => z.y))], spalten = [...new Set(zr.map((z) => z.x))];
pruefe(zeilen.length === 2 && spalten.length === 9, `2 untereinander, Rest in Reihe: ${zeilen.length} Zeilen × ${spalten.length} Spalten`);
pruefe(zr[0].x === zr[1].x && zr[1].y > zr[0].y && zr[2].x > zr[0].x, "je zwei untereinander, dann die nächste Spalte");
pruefe(zr.every((z) => z.geladen), "alle Vorlagen-Icons geladen");
pruefe(zr.every((z) => z.b >= 28), `Felder groß genug zum Tippen (min. ${Math.min(...zr.map((z) => z.b))} px)`);
pruefe(zr.filter((z) => z.gefunden).length === Number(await text("#samGefunden")), "Haken in der Übersicht = Zähler „gefunden“");
pruefe(zr.every((z) => z.gefunden === z.haken), "Haken nur bei gefundenen");
pruefe(await p.$eval("#samUebersicht", (e) => e.scrollWidth <= e.clientWidth), "Übersicht passt ohne Scrollen in 390 px");
await p.click('#samFilter [data-filter="gefunden"]'); await warte();
pruefe((await zier()).length === 18, "Filter ändert die Übersicht nicht");
await p.click('#samFilter [data-filter="alle"]'); await warte();
await p.screenshot({ path: `${DIR}/s0-uebersicht.png`, clip: await p.$eval(".ach-header", (e) => { const r = e.getBoundingClientRect(); return { x: r.x - 4, y: r.y - 8, width: r.width + 8, height: r.height + 12 }; }) });

// ---- Abhaken -----------------------------------------------------------------------------
const vorher = await text("#samGefunden");
await p.click('[data-sam-haken="wild"]'); await warte();
pruefe(Number(await text("#samGefunden")) === Number(vorher) + 1, `Wildnis abgehakt: ${vorher} → ${await text("#samGefunden")}`);
pruefe(await p.$eval('[data-sam="wild"]', (e) => e.classList.contains("earned")), "Wildnis als gefunden markiert");
pruefe((await zier()).find((z) => z.id === "wild").haken, "Übersicht: Wilde Zier bekommt den Haken");
pruefe(await p.$eval('[data-sam-kat="overworld:Jungle Temple"] img.kennblock', (e) => e.naturalWidth > 0), "Kennblock bleibt nach dem Neuzeichnen");
await p.click('[data-sam-haken="wild"]'); await warte();
pruefe(await text("#samGefunden") === vorher, "Wildnis zurückgesetzt");
pruefe(!(await zier()).find((z) => z.id === "wild").haken, "Übersicht: Haken wieder weg");

// Tippen in der Übersicht → Detail, Abhaken im Detail → Haken in der Übersicht
await p.click('#samUebersicht [data-sam-zier="spire"]'); await warte();
pruefe((await text("#orteSheetInhalt")).includes("Turmzier") && (await text("#orteSheetInhalt")).includes("Endsiedlung"), "Tippen auf Turmzier öffnet das Detail");
await p.click('#orteSheetInhalt [data-aktion="sam-umschalten"]'); await warte();
await p.click('#orteSheetInhalt [data-aktion="schliessen"]'); await warte();
pruefe((await zier()).find((z) => z.id === "spire").haken, "im Detail abgehakt → Haken in der Übersicht");
await p.screenshot({ path: `${DIR}/s0-uebersicht-end.png`, clip: await p.$eval(".ach-header", (e) => { const r = e.getBoundingClientRect(); return { x: r.x - 4, y: r.y - 8, width: r.width + 8, height: r.height + 12 }; }) });
await p.click('#samUebersicht [data-sam-zier="spire"]'); await warte();
await p.click('#orteSheetInhalt [data-aktion="sam-umschalten"]'); await warte();
await p.click('#orteSheetInhalt [data-aktion="schliessen"]'); await warte();

// ---- Detail ------------------------------------------------------------------------------
await p.click('[data-sam="rib"] .ach-body'); await warte();
let det = await text("#orteSheetInhalt");
pruefe(det.includes("Netherfestung") && det.includes("Nether Fortress in der Seed Map"), "Detail Rippen: Netherfestung, Seed-Map-Name");
pruefe(await p.$eval("#orteSheetInhalt .sam-fundort-bild img.kennblock", (e) => e.naturalWidth > 0), "Detail zeigt den Kennblock");
await p.screenshot({ path: `${DIR}/s4-detail-nether.png` });
await p.click('#orteSheetInhalt [data-aktion="schliessen"]'); await warte();

// Fundort mit bekannten Orten → „Karte“ springt hin
const bekannt = await p.evaluate(() => FUNDORTE.find((f) => bekannteFundorte(f.kategorie, f.dim).length));
const obj = objekte.find((o) => o.kategorie === bekannt.kategorie && o.dim === bekannt.dim);
await p.evaluate((id) => samDetailOeffnen(id), obj.id); await warte();
det = await text("#orteSheetInhalt");
pruefe(det.includes("Auf der Karte in dieser Welt") && await p.$('[data-aktion="sam-auf-karte"]') !== null, `Detail ${obj.name}: bekannte ${strukturen[bekannt.kategorie].name} mit Knopf „Karte“`);
await p.screenshot({ path: `${DIR}/s5-detail-bekannt.png` });
await p.click('[data-aktion="sam-auf-karte"]'); await warte(600);
pruefe(await text("#kopfTitel") === "Karte", "„Karte“ wechselt in die Karte");

// Fundort ohne bekannte Orte
await p.goto(DATEI + "?modul=sammelobjekte"); await warte(900);
await p.click('[data-sam="host"] .ach-body'); await warte();
det = await text("#orteSheetInhalt");
pruefe(det.includes("Pfadruinen") && det.includes("noch nicht auf der Karte"), "Detail Gastwirts: Pfadruinen, noch nicht auf der Karte");
pruefe(await p.$eval("#orteSheetInhalt .sam-fundort-bild", (e) => e.textContent) === "⌗", "Detail ohne Bild: Symbol");
await p.screenshot({ path: `${DIR}/s6-detail-ohne-bild.png` });
pruefe(fehler.length === 0, `keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);

// ---- Bilder fehlen (z. B. eingebaut ohne icons/) → Symbole -----------------------------------
const seite = createServer((req, res) => {
  const datei = path.join(HIER, "..", decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!datei.startsWith(path.join(HIER, "..")) || !existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": datei.endsWith(".png") ? "image/png" : "text/html; charset=utf-8" });
  res.end(readFileSync(datei));
});
await new Promise((ok) => seite.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${seite.address().port}/companion-prototyp.html?modul=sammelobjekte`;
fehler.length = 0;
await p.goto(url); await warte(900);
pruefe((await koepfe()).filter((x) => x.geladen).length === 12, "über http: 12 Kennblöcke geladen");
await p.route("**/icons/**", (r) => r.abort());
await p.goto(url); await warte(900);
k = await koepfe();
pruefe(k.every((x) => !x.bild && x.symbol), `ohne icons/: überall Symbole (${k.map((x) => x.symbol).join(" ")})`);
pruefe(k[0].symbol === "▲" && k.find((x) => x.name === "Netherfestung").symbol === "▮", "Außenposten ▲, Netherfestung ▮");
await p.screenshot({ path: `${DIR}/s7-ohne-bilder.png` });
pruefe(fehler.every((f) => f.includes("Failed to load resource")), "ohne Bilder nur Ladefehler, keine Skriptfehler");
seite.close();

await b.close();
