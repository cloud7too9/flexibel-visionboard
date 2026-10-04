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
const pills = () => p.$$eval(".verbindung", (l) => l.map((e) => e.querySelector(".card-title").textContent + "=" + e.querySelector(".pill").textContent).join(", "));
const tippe = async (achse, wert) => { await p.fill(`[data-rkoord="${achse}"]`, String(wert)); await p.dispatchEvent(`[data-rkoord="${achse}"]`, "input"); };

await p.goto(DATEI + "?modul=portale");
await warte(900);
pruefe(await text("#kopfTitel") === "Portal-Verwaltung", "startet in Portal-Verwaltung");
console.log("     Kopf:", await text("#orteSub"));
const bedrockPills = await pills();
console.log("     Bedrock:", bedrockPills);
pruefe(bedrockPills === "Dorf=Neues Portal, Eisenfarm=Einseitig, Hauptbasis=Verbunden", "Bedrock-Prüfung: Dorf neu, Eisenfarm einseitig, Hauptbasis ok");
console.log("     Meta:", await p.$$eval(".verbindung .card-meta", (l) => l.map((e) => e.textContent).join(" | ")));
await p.screenshot({ path: `${DIR}/p1-start.png` });

// Umrechner Oberwelt → Nether
await tippe("x", 212); await tippe("y", 71); await tippe("z", -388);
let erg = await text("#rechnerErgebnis");
pruefe(erg.includes("X26") && erg.includes("Y71") && erg.includes("Z−49"), "212/71/−388 → Nether 26/71/−49");
pruefe(erg.includes("„Hauptbasis“"), "Ankunft bei Hauptbasis");
// negative Zahl korrekt abrunden: −1 → −1 (nicht 0)
await tippe("x", -1); await tippe("z", -9);
erg = await text("#rechnerErgebnis");
pruefe(erg.includes("X−1") && erg.includes("Z−2"), "−1/−9 → −1/−2 (abgerundet)");
// weit weg → neues Portal
await tippe("x", 50000); await tippe("z", 50000);
erg = await text("#rechnerErgebnis");
pruefe(erg.includes("Kein erfasstes Portal"), "Weit weg: kein erfasstes Portal");
// Richtung wechseln
await tippe("x", 26); await tippe("z", -49);
await p.click('[data-rvon="nether"]'); await warte(150);
erg = await text("#rechnerErgebnis");
pruefe(erg.includes("X208") && erg.includes("Z−392") && erg.includes("208 bis 215"), "Nether 26/−49 → Oberwelt 208/−392, Bereich 208 bis 215");
pruefe(erg.includes("„Hauptbasis“"), "Rückweg landet bei Hauptbasis");
// ±-Taste
await p.click('[data-rvz="x"]'); await warte(100);
pruefe(await p.$eval('[data-rkoord="x"]', (e) => e.value) === "-26", "±-Taste setzt Minus");
await p.click('[data-rvz="x"]'); await warte(100);
await p.screenshot({ path: `${DIR}/p2-rechner.png` });

// Infokarte: nur Bedrock, kein Umschalter
await p.click("#portalInfoBtn"); await warte(300);
pruefe(await p.$(".info-karte") !== null, "Infokarte eingeblendet");
pruefe((await text(".info-karte")).includes("Bedrock-Falle"), "Infokarte zeigt Bedrock-Hinweis");
pruefe(await p.$("[data-edition]") === null && !/java/i.test(await text(".info-karte")), "Kein Umschalter, kein Java");
await p.screenshot({ path: `${DIR}/p3-info.png` });
await p.click('[data-raktion="info-zu"]'); await warte(200);
pruefe(await p.$(".info-karte") === null, "Infokarte ausgeblendet");

// Detail Eisenfarm
await p.click('[data-verbindung="p_2"]'); await warte();
const det = await text("#orteSheetInhalt");
pruefe(det.includes("landet bei „Hauptbasis“"), "Detail Eisenfarm: Rückweg landet bei Hauptbasis");
pruefe(det.includes("X 37 · Y 80 · Z −53"), "Empfehlung: Idealpunkt 37/80/−53");
await p.screenshot({ path: `${DIR}/p5-detail.png` });

// Bearbeiten: Nether aus Oberwelt berechnen → passt
await p.click('[data-aktion="portal-bearbeiten"]'); await warte();
await p.click('[data-aktion="portal-aus-oberwelt"]'); await warte(200);
const n = await p.$$eval('[data-koord^="n"]', (l) => l.map((e) => e.value).join("/"));
pruefe(n === "37/80/-53", `Aus Oberwelt berechnet: ${n}`);
pruefe((await text("#portalPruefung")).includes("Verbunden"), "Live-Prüfung zeigt Verbunden");
await p.screenshot({ path: `${DIR}/p6-editor.png` });
// Tippen ändert die Live-Prüfung
await p.fill('[data-koord="nX"]', "20"); await p.dispatchEvent('[data-koord="nX"]', "input"); await warte(100);
console.log("     Live nach X=20:", (await text("#portalPruefung")).slice(0, 90));
await p.click('[data-aktion="portal-aus-oberwelt"]'); await warte(100);
await p.click('[data-aktion="portal-speichern"]'); await warte(500);
pruefe(await p.evaluate(() => st.sheet) === "portal", "Nach Speichern: Detail offen");
await p.click('[data-aktion="schliessen"]'); await warte();
const nachher = await pills();
pruefe(nachher.includes("Eisenfarm=Verbunden") && nachher.includes("Hauptbasis=Verbunden"), "Eisenfarm jetzt verbunden, Hauptbasis weiter ok");

// Neue Verbindung aus dem Umrechner
await p.click('[data-rvon="overworld"]'); await warte(100);
await tippe("x", -1884); await tippe("y", 40); await tippe("z", -524);
await p.click('[data-raktion="verbindung"]'); await warte();
const vor = await p.$$eval('[data-koord]', (l) => l.map((e) => e.value).join("/"));
pruefe(vor === "-1884/40/-524/-236/40/-66", `Editor vorbefüllt: ${vor}`);
await p.click('[data-aktion="portal-speichern"]'); await warte(200);
pruefe((await text("#portalMeldung")).includes("Namen"), "Ohne Namen → Fehler");
await p.fill("#portalName", "Stronghold");
await p.click('[data-aktion="portal-speichern"]'); await warte(500);
await p.click('[data-aktion="schliessen"]'); await warte();
pruefe(await p.$$eval(".verbindung", (l) => l.length) === 4, "4 Verbindungen");

// Löschen mit Nachfrage
await p.click('.verbindung:has-text("Stronghold")'); await warte();
await p.click('[data-aktion="portal-loeschen"]'); await warte(150);
pruefe(await text('[data-aktion="portal-loeschen"]') === "Wirklich löschen?", "Löschen fragt nach");
await p.click('[data-aktion="portal-loeschen"]'); await warte(500);
pruefe(await p.$$eval(".verbindung", (l) => l.length) === 3, "Gelöscht → 3");

// Regeln im Mock
const r1 = await p.evaluate(() => mockApi("/portale/welten/w_1", { method: "POST", body: JSON.stringify({ name: "x", oberwelt: { x: 1, y: 70, z: 1 }, nether: { x: 0, y: 300, z: 0 } }) }));
pruefe(r1.status === 422, `Mock lehnt Nether-Y 300 ab (${r1.data.message})`);
const r2 = await p.evaluate(() => mockApi("/portale/welten/w_1", { method: "POST", body: JSON.stringify({ name: "x", oberwelt: { x: 1.5, y: null, z: 1 }, nether: { x: 0, y: null, z: 0 } }) }));
pruefe(r2.status === 422, `Mock lehnt Kommazahl ab (${r2.data.message})`);

// Welt wechseln → leere Liste
await p.click("#portalWeltBtn"); await warte();
await p.click('[data-aktion="welt-waehlen"][data-id="w_2"]'); await warte(700);
pruefe((await text("#portalStage")).includes("Noch keine Portal-Verbindungen"), "Welt 2: keine Verbindungen");
console.log("     Kopf:", await text("#orteSub"));

// Andere Bereiche
for (const m of ["karte", "sammelobjekte", "banner", "portale"]) { await p.evaluate((k) => modulWechseln(k), m); await warte(300); }
pruefe(await text("#kopfTitel") === "Portal-Verwaltung", "Bereichswechsel rundum ok");
await p.click("#burgerBtn"); await warte(400);
console.log("     Sidebar:", await p.$$eval("#sbNav .nav-item", (l) => l.map((e) => e.textContent.replace(/\s+/g, " ").trim()).join(" | ")));
pruefe(fehler.length === 0, "Keine JS-Fehler " + (fehler.length ? JSON.stringify(fehler) : ""));
await b.close();
