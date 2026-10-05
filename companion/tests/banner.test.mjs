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

// Editor in 7 Schritten: 1 = Banner (Grundfarbe), 2–7 = Muster; freie Schritte nur am Ende
const leiste = () => p.$$eval(".bschritt", (l) => l.map((b) => ({ n: Number(b.dataset.n), voll: b.classList.contains("voll"), aktiv: b.classList.contains("aktiv"), aus: b.disabled, label: b.getAttribute("aria-label") })));
const schrittTitel = () => p.$eval(".schritt-wahl .field-group-label, .orte-inhalt > .field-group .field-group-label", (e) => e.textContent.replace(/\s+/g, " ").trim());
await p.click('[data-aktion="banner-bearbeiten"]'); await warte();
pruefe(await p.$eval("#bannerName", (e) => e.value) === "Prüfungskammer", "Editor mit Namen gefüllt");
let ls = await leiste();
pruefe(ls.length === 7, `7 Schritte in der Leiste (${ls.length})`);
pruefe(ls[0].aktiv && ls[0].label.includes("Banner, Türkis"), "Start bei Schritt 1: Banner in Türkis");
pruefe(ls.slice(0, 4).every((x) => x.voll) && !ls[4].voll && !ls[4].aus && ls[5].aus && ls[6].aus, "Schritte 1–4 belegt, 5 frei und wählbar, 6–7 gesperrt");
pruefe(await p.$$eval(".bschritt.voll .banner-bild", (l) => l.length) === 4, "belegte Schritte zeigen ihren Zwischenstand");
pruefe((await schrittTitel()).startsWith("Schritt 1 · Banner"), "Schritt 1: Grundfarbe wählen");
await p.click('.bschritt[data-n="3"]'); await warte();
pruefe((await schrittTitel()).startsWith("Schritt 3 · Fluss"), `Schritt 3 zeigt Fluss (${await schrittTitel()})`);
await p.click('.schritt-wahl [data-farbe="red"]'); await warte(150);
await p.click('.schritt-wahl [data-muster="skull"]'); await warte(150);
pruefe((await leiste())[2].label.includes("Schädel, Rot"), "Schritt 3 → Schädel in Rot");
await p.screenshot({ path: `${DIR}/b4-editor-offen.png` });
await p.click('.bschritt[data-n="2"]'); await warte();
pruefe((await p.$eval('[data-aktion="bschritt-leeren"]', (e) => e.textContent)).includes("rücken nach"), "Leeren-Knopf sagt, dass spätere nachrücken");
await p.click('[data-aktion="bschritt-leeren"]'); await warte(150);
ls = await leiste();
pruefe(ls[1].label.includes("Schädel") && ls[2].label.includes("Bord") && !ls[3].voll && ls[4].aus, "Schritt 2 geleert → Schädel und Bord rücken nach, Schritt 4 frei");
await p.click('[data-aktion="banner-speichern"]'); await warte(500);
pruefe(await p.evaluate(() => st.sheet) === "banner", "Nach Speichern: Detail offen");
let txt = await p.$eval("#orteSheetInhalt", (e) => e.innerText);
pruefe((await p.$eval("#orteSheetInhalt", (e) => e.textContent)).includes("0/3 erledigt"), "Muster geändert → Haken zurückgesetzt, 3 Schritte");
pruefe(txt.includes("Schädel-Bannervorlage") && !txt.includes("Mauerung-Bannervorlage"), "Detail: Schädel-Vorlage neu, Mauerung weg");

// Neuer Banner: Name fehlt → Fehler; Schritte nacheinander, gesperrt bis der davor belegt ist
await p.click('[data-aktion="schliessen"]'); await warte();
await p.click("#bannerNeuBtn"); await warte();
ls = await leiste();
pruefe(ls[0].aktiv && !ls[1].voll && !ls[1].aus && ls.slice(2).every((x) => x.aus), "Neu: Schritt 2 frei, 3–7 gesperrt");
await p.click('[data-aktion="banner-speichern"]'); await warte(200);
pruefe((await p.$eval("#bannerMeldung", (e) => e.textContent)).includes("Namen"), "Ohne Namen → Fehlermeldung");
await p.click('[data-basis="black"]'); await warte(150);
await p.fill("#bannerName", "Test-Banner");
await p.click('[data-aktion="bschritt-weiter"]'); await warte();
pruefe((await schrittTitel()).startsWith("Schritt 2 · frei"), "Weiter → Schritt 2 ist frei");
pruefe(await p.$('[data-aktion="bschritt-weiter"]') === null, "Freier Schritt: kein „Weiter“, bis ein Muster gewählt ist");
await p.click('.schritt-wahl [data-muster="cross"]'); await warte(150);
pruefe((await leiste())[1].label.includes("Weiß"), "Muster auf Schwarz bekommt Kontrastfarbe Weiß");
const reihe = ["border", "stripe_top", "stripe_bottom", "creeper", "skull"];
for (const m of reihe) {
  await p.click('[data-aktion="bschritt-weiter"]'); await warte(120);
  if (m === "creeper") { await p.click('.schritt-wahl [data-farbe="lime"]'); await warte(80); }
  await p.click(`.schritt-wahl [data-muster="${m}"]`); await warte(120);
}
ls = await leiste();
pruefe(ls.every((x) => x.voll) && ls[6].aktiv, "Alle 7 Schritte belegt, Schritt 7 aktiv");
pruefe(ls[5].label.includes("Hellgrün"), "Freier Schritt: zuerst Farbe gewählt, dann Muster → Hellgrün");
pruefe(await p.$('[data-aktion="bschritt-weiter"]') === null, "Nach Schritt 7 geht es nicht weiter (höchstens 6 Muster)");
pruefe(await p.$eval("#bannerName", (e) => e.value) === "Test-Banner", "Name bleibt beim Neuzeichnen erhalten");
await p.click('[data-aktion="bschritt-leeren"]'); await warte(150);
ls = await leiste();
pruefe(!ls[6].voll && ls[5].voll, "Schritt 7 geleert → bleibt am Ende frei");
await p.evaluate(() => { $sheet.scrollTop = 0; }); await warte(100);
await p.screenshot({ path: `${DIR}/b5-editor-neu.png` });
await p.click('[data-aktion="banner-speichern"]'); await warte(500);
pruefe(await p.$$eval("#bannerListe .banner-karte", (l) => l.length) === 5, "Neuer Banner in der Liste (5)");
pruefe((await p.$eval("#orteSheetInhalt", (e) => e.textContent)).includes("0/6 erledigt"), "Gespeichert mit 5 Mustern → Anleitung mit 6 Schritten");

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
