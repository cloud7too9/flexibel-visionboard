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

await p.goto(DATEI + "?modul=banner");
await warte(900);
pruefe(await p.$eval("#kopfTitel", (e) => e.textContent) === "Banner", "startet im Bereich Banner");
pruefe(await p.$$eval("#bannerListe .banner-karte", (l) => l.length) === 4, "4 Beispiel-Banner in der Liste");
console.log("     Kopf:", await p.$eval("#orteSub", (e) => e.textContent));
await p.screenshot({ path: `${DIR}/b1-liste.png` });

// Suche nach Musternamen
await p.fill("#bannerSuche", "creeper");
await warte(100);
pruefe(await p.$$eval("#bannerListe .banner-karte", (l) => l.length) === 1, "Suche „creeper“ findet 1");
await p.fill("#bannerSuche", "bord");
await warte(100);
console.log("     Suche „bord“:", await p.$$eval("#bannerListe .card-title", (l) => l.map((e) => e.textContent).join(", ")));
await p.fill("#bannerSuche", "");
await p.dispatchEvent("#bannerSuche", "input");

// Detail
await p.click('[data-banner="b_4"]');
await warte();
const detail = await p.$eval("#orteSheetInhalt", (e) => e.innerText);
pruefe(detail.includes("Türkise Wolle") && detail.includes("Fluss-Bannervorlage") && detail.includes("Mauerung-Bannervorlage"), "Detail: Material + Vorlagen");
pruefe(await p.$$eval(".schritt", (l) => l.length) === 4, "Detail: 4 Schritte (Banner + 3 Ebenen)");
await p.screenshot({ path: `${DIR}/b2-detail.png` });
await p.click('.schritt[data-n="0"]'); await warte(150);
await p.click('.schritt[data-n="1"]'); await warte(150);
console.log("     Stand:", await p.$eval("#orteSheetInhalt .field-group-label", (e) => e.textContent), await p.evaluate(() => localStorage.getItem("banner.schritte.b_4")));
pruefe((await p.$eval("#orteSheetInhalt", (e) => e.textContent)).includes("2/4 erledigt"), "Schritte abhaken → 2/4");
await p.evaluate(() => document.getElementById("orteSheet").scrollTo(0, 9999)); await warte(150);
await p.screenshot({ path: `${DIR}/b3-detail-unten.png` });

// Bearbeiten: Ebene ändern → Haken werden zurückgesetzt
await p.click('[data-aktion="banner-bearbeiten"]'); await warte();
pruefe(await p.$eval("#bannerName", (e) => e.value) === "Prüfungskammer", "Editor mit Namen gefüllt");
await p.click('[data-aktion="ebene-auf"][data-n="1"]'); await warte();
await p.screenshot({ path: `${DIR}/b4-editor-offen.png` });
await p.click('.ebene-wahl [data-farbe="red"]'); await warte(150);
await p.click('.ebene-wahl [data-muster="skull"]'); await warte(150);
const ebene1 = await p.$eval('.ebene.offen .ebene-text', (e) => e.innerText);
pruefe(ebene1.includes("Schädel") && ebene1.includes("Rot"), "Ebene 2 → Schädel in Rot");
await p.click('[data-aktion="ebene-hoch"][data-n="1"]'); await warte(150);
pruefe((await p.$eval('.ebene:first-child .ebene-text b', (e) => e.textContent)) === "Schädel", "Ebene nach oben verschoben");
await p.click('[data-aktion="banner-speichern"]'); await warte(500);
pruefe(await p.evaluate(() => st.sheet) === "banner", "Nach Speichern: Detail offen");
pruefe((await p.$eval("#orteSheetInhalt", (e) => e.textContent)).includes("0/4 erledigt"), "Muster geändert → Haken zurückgesetzt");
pruefe((await p.$eval("#orteSheetInhalt", (e) => e.innerText)).includes("Schädel-Bannervorlage"), "Neue Vorlage im Detail");

// Neuer Banner: Name fehlt → Fehler, dann 7 Ebenen versuchen
await p.click('[data-aktion="schliessen"]'); await warte();
await p.click("#bannerNeuBtn"); await warte();
await p.click('[data-aktion="banner-speichern"]'); await warte(200);
pruefe((await p.$eval("#bannerMeldung", (e) => e.textContent)).includes("Namen"), "Ohne Namen → Fehlermeldung");
await p.click('[data-basis="black"]'); await warte(150);
await p.fill("#bannerName", "Test-Banner");
for (let i = 0; i < 6; i++) { await p.click('[data-aktion="ebene-neu"]'); await warte(80); }
pruefe(await p.$('[data-aktion="ebene-neu"]') === null, "Nach 6 Ebenen kein „+ Ebene“ mehr");
pruefe(await p.$eval("#bannerName", (e) => e.value) === "Test-Banner", "Name bleibt beim Neuzeichnen erhalten");
const farbeNeu = await p.$eval('.ebene.offen .ebene-text small', (e) => e.innerText);
pruefe(farbeNeu.includes("Weiß"), "Neue Ebene auf Schwarz bekommt Kontrastfarbe Weiß");
await p.click('[data-aktion="ebene-weg"][data-n="5"]'); await warte(100);
await p.screenshot({ path: `${DIR}/b5-editor-neu.png` });
await p.click('[data-aktion="banner-speichern"]'); await warte(500);
pruefe(await p.$$eval("#bannerListe .banner-karte", (l) => l.length) === 5, "Neuer Banner in der Liste (5)");

// Löschen mit Bestätigung
const knopf = '[data-aktion="banner-loeschen"]';
await p.click(knopf); await warte(150);
pruefe((await p.$eval(knopf, (e) => e.textContent)) === "Wirklich löschen?", "Löschen fragt nach");
await p.click(knopf); await warte(500);
pruefe(await p.$$eval("#bannerListe .banner-karte", (l) => l.length) === 4, "Gelöscht → 4");

// Validierung im Mock direkt
const r = await p.evaluate(() => mockApi("/banner", { method: "POST", body: JSON.stringify({ name: "x", basis: "white", ebenen: Array(7).fill({ muster: "border", farbe: "red" }) }) }));
pruefe(r.status === 422, `Mock lehnt 7 Ebenen ab (${r.data.message})`);

// Andere Bereiche laufen noch
await p.evaluate(() => modulWechseln("sammelobjekte")); await warte(400);
pruefe(await p.$eval("#kopfTitel", (e) => e.textContent) === "Sammelobjekte", "Wechsel zu Sammelobjekte");
await p.evaluate(() => modulWechseln("karte")); await warte(400);
pruefe(await p.$eval("#kopfTitel", (e) => e.textContent) === "Karte", "Wechsel zur Karte");
await p.evaluate(() => modulWechseln("banner")); await warte(400);

// Sidebar
await p.click("#burgerBtn"); await warte(400);
console.log("     Sidebar:", await p.$$eval("#sbNav .nav-item", (l) => l.map((e) => e.textContent.replace(/\s+/g, " ").trim()).join(" | ")));
await p.screenshot({ path: `${DIR}/b6-sidebar.png` });

pruefe(fehler.length === 0, "Keine JS-Fehler " + (fehler.length ? JSON.stringify(fehler) : ""));
await b.close();
