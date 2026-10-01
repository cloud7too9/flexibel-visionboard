// Live-Betrieb: Das Koordinaten-Board liefert die Companion aus und hält alle Daten.
// Zwei Handys (Max, Lena) arbeiten gleichzeitig; Neuladen und Server-Neustart verlieren nichts.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { threeUmleiten, CHROMIUM_OPTIONEN } from "./hilfen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const TMP = mkdtempSync(path.join(tmpdir(), "live-test-"));
const PORT = 3195, PIN = "4711";
const BOARD = `http://127.0.0.1:${PORT}`;
if (!existsSync(path.join(HIER, "../../koordinaten-board/client/dist/index.html"))) {
  console.log("FEHL Board-Client nicht gebaut: npm --prefix ../../koordinaten-board run build");
  process.exit(1);
}
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));

let board = null;
async function boardStarten() {
  board = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(HIER, "../../koordinaten-board/server"),
    env: { ...process.env, PORT: String(PORT), RAUM_PIN: PIN, DATEN_ORDNER: path.join(TMP, "daten") },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    if (board.exitCode !== null) throw new Error(`Board beendet sich sofort – Port ${PORT} belegt?`);
    try { if ((await fetch(`${BOARD}/api/server`)).ok) return; } catch {}
    await schlafen(200);
  }
  throw new Error("Board startet nicht");
}
async function boardStoppen() {
  if (!board) return;
  const b = board; board = null;
  if (b.exitCode !== null || b.signalCode !== null) return;
  b.kill("SIGTERM");
  await new Promise((r) => b.once("exit", r));
}

const browser = await chromium.launch(CHROMIUM_OPTIONEN);
const fehler = [], antworten = [];
let boardAus = false;   // absichtlicher Neustart: fehlgeschlagene Wiederverbindungen sind dann erwartet
async function handy() {
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await threeUmleiten(kontext);   // three.js für die 3D-Figur kommt sonst vom CDN
  const p = await kontext.newPage();
  p.on("pageerror", (e) => fehler.push(e.message));
  // Ladefehler prüft „antworten“ genau; die Konsole meldet sie nur ohne Adresse (auch /favicon.ico)
  p.on("console", (m) => {
    if (m.type() !== "error" || m.text().startsWith("Failed to load resource")) return;
    if (boardAus && m.text().startsWith("WebSocket connection to")) return;
    fehler.push(m.text());
  });
  p.on("response", (r) => { if (r.status() >= 400) antworten.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  return p;
}
const text = (p, sel) => p.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim());
const warteAuf = (p, fn, arg, ms = 6000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
/** Eigene PIN je Account (B2) */
const KONTO_PIN = { Max: "2468", Lena: "1357" };
/** Wie ein Handy nach dem QR-Scan: /?pin=… öffnen, Name und eigene PIN eingeben, beitreten */
async function beitreten(p, name) {
  await p.goto(`${BOARD}/?pin=${PIN}`);
  await p.waitForSelector("#boardName");
  await p.fill("#boardName", name);
  await p.fill("#boardKontoPin", KONTO_PIN[name]);
  await p.click('[data-aktion="board-beitreten"]');
  return warteAuf(p, () => !DEMO.enabled && st.sheet === null && bd.verbindung?.name);
}

try {
  await boardStarten();
  const max = await handy();

  // === Beitreten ================================================================
  await max.goto(`${BOARD}/?pin=${PIN}`);
  await max.waitForSelector("#boardName");
  pruefe(await max.evaluate(() => DEMO.enabled) === false, "Vom Board ausgeliefert → Live-Betrieb");
  pruefe(await text(max, ".sheet-kopf h2") === "Beitreten", "Startet mit „Beitreten“");
  pruefe(await max.$eval("#boardPin", (e) => e.value) === PIN, "PIN aus dem QR-Code vorbefüllt");
  pruefe(await max.$("#boardScanner") === null, "Kein Kamera-Scanner nötig");
  pruefe((await fetch(`${BOARD}/api/typen`)).status === 404, "Die alte Handy-Steuerung des Boards ist abgelöst");
  await max.screenshot({ path: `${DIR}/l1-beitreten.png` });
  await max.fill("#boardName", "Max");
  pruefe((await text(max, "#boardKontoHinweis")) === "Neuer Account „Max“ – wähl dir eine PIN", "Neuer Name → neuer Account");
  await max.fill("#boardKontoPin", KONTO_PIN.Max);
  await max.click('[data-aktion="board-beitreten"]');
  pruefe(await warteAuf(max, () => document.querySelector(".sheet-kopf h2")?.textContent === "Welt"), "Beigetreten → leeres Board: Welt anlegen");
  pruefe(await max.evaluate(() => bd.ich?.anzeigename === "Max" && /^[0-9a-f-]{36}$/.test(bd.ich.id)), "IDENTITAET.werBistDu(): Account Max mit stabiler ID");
  pruefe(!max.url().includes("pin="), "PIN steht nicht mehr in der Adresszeile");
  pruefe((await text(max, "#weltBanner")).includes("Noch keine Welt"), "Hinweis: noch keine Welt");
  await max.screenshot({ path: `${DIR}/l2-erste-welt.png` });
  await max.fill("#weltSeed", "6889192652397090698");
  await max.click('[data-aktion="welt-anlegen"]');
  pruefe(await warteAuf(max, () => st.weltId && st.welten.length === 1), "Welt angelegt");
  pruefe((await text(max, "#boardBtn")).includes("Verbunden"), "Sidebar: mit dem Board verbunden");

  // Ort von Hand eintragen
  await max.click("#orteEintragenBtn"); await max.waitForSelector("#formNeu");
  await max.fill("#formNeu", "Hauptbasis");
  for (const [a, v] of [["X", 212], ["Y", 71], ["Z", -388]]) await max.fill(`[data-koord="f${a}"]`, String(v));
  await max.click('[data-aktion="formular-speichern"]');
  pruefe(await warteAuf(max, () => st.instanzen.length === 1), "Ort „Hauptbasis“ gespeichert");
  const ortId = await max.evaluate(() => st.instanzen[0].id);
  pruefe(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ortId), `Ort-ID vom Handy (UUID ${ortId.slice(0, 8)}…)`);
  await max.evaluate(() => ansichtWechseln("liste"));

  // Screenshot aus der Seed Map: echte Texterkennung des Boards
  await max.setInputFiles("#orteDatei", path.join(HIER, "../../referenz/seedmap/stronghold-popup.png"));
  pruefe(await warteAuf(max, () => st.importe?.length === 1 && st.importe[0].status === "fertig", null, 60000), "Board liest den Screenshot aus");
  const erkannt = await max.evaluate(() => st.importe[0].erkannt);
  console.log("     Erkannt:", JSON.stringify(erkannt));
  pruefe(erkannt?.kategorie === "Stronghold" && erkannt?.variante === "Stairway" && erkannt?.dimension === "overworld", "Stronghold · Stairway in der Oberwelt");
  pruefe(erkannt?.x === -1884 && erkannt?.z === -524, "Koordinaten X −1884 · Z −524");
  await max.screenshot({ path: `${DIR}/l2b-screenshot-ocr.png` });
  await max.click('[data-aktion="import-speichern"]');
  pruefe(await warteAuf(max, () => st.instanzen.length === 2 && st.typen.some((t) => t.variante === "Stairway")), "Aus dem Screenshot gespeichert (neue Variante erlaubt)");

  // === Zweites Handy sieht alles, Änderungen kommen live ==========================
  const lena = await handy();
  pruefe(await beitreten(lena, "Lena"), "Lena tritt bei");
  pruefe(await warteAuf(lena, () => st.instanzen.length === 2 && st.welten.length === 1), "Lena sieht Welt und Orte von Max");
  await lena.evaluate(() => ansichtWechseln("liste"));
  await max.evaluate(() => api("/orte/instanzen", { method: "POST", body: JSON.stringify({
    dimensionId: `d_${st.weltId}_overworld`, kategorie: "Village", variante: null, x: 1040, y: 64, z: 310, quelle: "manuell" }) }));
  pruefe(await warteAuf(lena, () => st.instanzen.length === 3 && document.querySelector('.ort-kat[data-kat="Village"]')), "Neuer Ort von Max erscheint bei Lena ohne Neuladen");
  await lena.waitForTimeout(500);   // Sheet-Animation abwarten
  await lena.screenshot({ path: `${DIR}/l3-lena-live.png` });

  // Sammelobjekt: Lena hakt ab, Max sieht es
  await max.evaluate(() => modulWechseln("sammelobjekte"));
  await lena.evaluate(() => modulWechseln("sammelobjekte"));
  await lena.click('[data-sam-haken="rib"]');
  pruefe(await warteAuf(max, () => sam.status.rib?.von === "Lena"), "Max sieht: Rippenzier gefunden von Lena");
  pruefe(await warteAuf(max, () => document.querySelector('[data-sam="rib"]')?.classList.contains("earned")), "… auch in der Liste");
  await max.screenshot({ path: `${DIR}/l4-max-sammel.png` });

  // Banner + Portal
  await lena.evaluate(() => modulWechseln("banner"));
  await max.evaluate(() => api("/banner", { method: "POST", body: JSON.stringify({ name: "Wappen", basis: "white", ebenen: [{ muster: "cross", farbe: "red" }] }) }));
  pruefe(await warteAuf(lena, () => bn.liste.some((b) => b.name === "Wappen" && b.von === "Max")), "Banner von Max kommt bei Lena an");
  await lena.evaluate(() => modulWechseln("portale"));
  await max.evaluate(() => api(`/portale/welten/${st.weltId}`, { method: "POST", body: JSON.stringify({ name: "Hauptbasis",
    oberwelt: { x: 212, y: 71, z: -388 }, nether: { x: 26, y: 71, z: -49 } }) }));
  pruefe(await warteAuf(lena, () => pt.liste.length === 1 && document.querySelector(".verbindung")), "Portal-Verbindung erscheint bei Lena");
  const regel = await max.evaluate(() => api("/banner", { method: "POST", body: JSON.stringify({ name: "Zu viel", basis: "white", ebenen: Array(7).fill({ muster: "cross", farbe: "red" }) }) }));
  pruefe(regel.status === 422 && regel.data.message.includes("höchstens 6"), "Server prüft mit denselben Regeln (7 Muster abgelehnt)");

  // === Rüstung: Sets für alle Welten, Figur vom Board =============================
  await max.evaluate(() => modulWechseln("ruestung"));
  await lena.evaluate(() => modulWechseln("ruestung"));
  pruefe(await warteAuf(max, () => rs.geladen && document.querySelector("#ruestungListe .empty-list")), "Rüstung: noch keine Sets");
  await lena.evaluate(() => api("/ruestung", { method: "POST", body: JSON.stringify({ name: "Rippen-Set", teile: {
    helmet: { ruestung: "netherite", muster: "rib", material: "gold", verzaubert: true }, boots: { ruestung: "iron", muster: "eye", material: "amethyst" } } }) }));
  pruefe(await warteAuf(max, () => rs.sets[0]?.name === "Rippen-Set" && rs.sets[0].von === "Lena"), "Max sieht Lenas Rüstungs-Set live");
  pruefe(await warteAuf(max, () => document.querySelector(".ruestung-karte .pill")?.textContent.trim() === "1/2 gefunden"), "Rippenzier ist in dieser Welt gefunden → 1/2");
  await max.click(".ruestung-karte");
  pruefe(await warteAuf(max, () => fig.art === "3d", null, 15000), "Figur über das Board: 3D (Baukasten vom Board-Server)");
  await lena.evaluate(() => api(`/sammelobjekte/welten/${st.weltId}/eye`, { method: "PUT", body: JSON.stringify({ gefunden: true }) }));
  pruefe(await warteAuf(max, () => document.querySelector("#orteSheetInhalt .banner.ok")?.textContent.includes("Alle Rüstungsbesätze")),
    "Lena findet die Augenzier → Max' offenes Set zeigt: alle gefunden");
  await max.waitForTimeout(600);
  await max.screenshot({ path: `${DIR}/l3d-ruestung-live.png` });
  const falsch = await max.evaluate(() => api("/ruestung", { method: "POST", body: JSON.stringify({ name: "Panzer", teile: { boots: { ruestung: "turtle" } } }) }));
  pruefe(falsch.status === 422 && falsch.data.message === "Schildkröte gibt es nur als Schildkrötenpanzer", "Server prüft Rüstung mit denselben Regeln");
  await max.click('#orteSheetInhalt [data-aktion="schliessen"]');

  // === Banner aus einem Screenshot (Anleitung „Black Base“, „Cyan Bordure“ …) =======
  await max.evaluate(() => modulWechseln("banner"));
  await lena.evaluate(() => modulWechseln("banner"));
  const rezept = path.join(HIER, "../../referenz/banner/rezept-beispiel.jpg");
  const hochladen = async () => {
    const [waehler] = await Promise.all([max.waitForEvent("filechooser"), max.click("#bannerScreenshotBtn")]);
    await waehler.setFiles(rezept);
    return warteAuf(max, () => st.importe?.length && st.importe.at(-1).status === "fertig", null, 60000);
  };
  pruefe(await hochladen(), "Banner-Bereich: Screenshot → Board liest die Anleitung aus");
  const imp = await max.evaluate(() => st.importe.at(-1));
  pruefe(imp.banner?.basis === "black" && imp.banner.ebenen.length === 6 && imp.an, "Erkannt: schwarzes Banner mit 6 Mustern, zum Speichern vorgemerkt");
  pruefe((await text(max, "#orteSheetInhalt .imp-schritte")).includes("Raute (Hellblau)"), "Prüfliste zeigt die Schritte auf Deutsch");
  pruefe((await text(max, '[data-aktion="import-speichern"]')) === "1 Banner speichern", "Knopf „1 Banner speichern“");
  pruefe((await max.$eval(`[data-import-name="${imp.id}"]`, (e) => e.value)).startsWith("Banner vom "), "Name vorgeschlagen");
  await max.fill(`[data-import-name="${imp.id}"]`, "Enderauge");
  await max.screenshot({ path: `${DIR}/l3b-banner-screenshot.png` });
  await max.click('[data-aktion="import-speichern"]');
  pruefe(await warteAuf(max, () => bn.liste.some((b) => b.name === "Enderauge") && st.sheet === null), "Banner „Enderauge“ gespeichert");
  const gespeichert = await max.evaluate(() => bn.liste.find((b) => b.name === "Enderauge"));
  pruefe(JSON.stringify(gespeichert.ebenen.map((e) => `${e.farbe} ${e.muster}`)) === JSON.stringify(["cyan border", "light_blue rhombus", "black border",
    "black flower", "black square_top_left", "black square_bottom_right"]) && gespeichert.basis === "black", "Muster und Farben wie in der Anleitung");
  pruefe(await warteAuf(lena, () => bn.liste.some((b) => b.name === "Enderauge" && b.von === "Max")), "Lena sieht den Banner live");
  await max.evaluate((id) => bannerDetailOeffnen(id), gespeichert.id);
  await max.waitForTimeout(400);
  await max.screenshot({ path: `${DIR}/l3c-banner-detail.png` });
  await max.click('#orteSheetInhalt [data-aktion="schliessen"]');
  pruefe(await hochladen(), "Derselbe Screenshot noch einmal");
  const nochmal = await max.evaluate(() => st.importe.at(-1));
  pruefe(!nochmal.an && nochmal.meldungen.some(([, t]) => t === "Schon gespeichert als „Enderauge“"), "… wird als schon gespeichert erkannt und nicht vorgemerkt");
  await max.click('#orteSheetInhalt [data-aktion="schliessen"]');
  await max.evaluate(() => { st.importe = []; });

  // === Anzeige im Zimmer zeigt die aktive Welt ===================================
  const anzeige = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  anzeige.on("pageerror", (e) => fehler.push("Anzeige: " + e.message));
  await anzeige.goto(`${BOARD}/anzeige`);
  await anzeige.waitForSelector(".anzeige");
  const anzeigeOrte = () => anzeige.$$eval(".a-zeile", (l) => l.map((z) => {
    const img = z.querySelector("img.kennblock");
    return z.querySelector(".name > span").textContent.trim() + (img ? ` [${img.getAttribute("src").split("/").pop()}]` : "");
  }).sort().join(", "));
  pruefe(await warteAuf(anzeige, () => document.querySelectorAll(".a-zeile").length === 3), "Anzeige: Orte der ersten Welt");
  await anzeige.waitForFunction(() => [...document.querySelectorAll("img.kennblock")].every((i) => i.complete));
  const orteWelt1 = await anzeigeOrte();
  console.log("     Anzeige:", orteWelt1);
  pruefe(orteWelt1 === "Hauptbasis, Stronghold (Stairway) [stronghold.png], Village", "Anzeige: Hauptbasis, Stronghold (Stairway) mit Kennblock, Village");
  pruefe((await text(anzeige, ".subtitle")).includes("Welt 68891…0698"), "Anzeige nennt die Welt");
  await anzeige.screenshot({ path: `${DIR}/l6-anzeige-welt1.png` });

  // Anheften: Ort groß oben auf der Anzeige (früher in der Board-Steuerung)
  await max.evaluate(() => { modulWechseln("karte"); detailOeffnen(st.instanzen.find((i) => typVon(i).kategorie === "Stronghold").id); });
  await max.waitForSelector('[data-aktion="anheften"]');
  await max.click('[data-aktion="anheften"]');
  pruefe(await warteAuf(anzeige, () => document.querySelector(".a-gross .name")?.textContent === "Stronghold (Stairway)"), "Angeheftet → groß oben auf der Anzeige");
  pruefe(await warteAuf(max, () => document.querySelector('[data-aktion="anheften"]')?.classList.contains("aktiv")), "Knopf im Detail zeigt „Lösen“");
  await anzeige.waitForTimeout(500);
  await anzeige.screenshot({ path: `${DIR}/l6b-anzeige-angeheftet.png` });
  await max.screenshot({ path: `${DIR}/l6c-detail-angeheftet.png` });
  await max.click('#orteSheetInhalt [data-aktion="schliessen"]');

  // Zweite Welt mit End City – die Anzeige bleibt bei der ersten, bis jemand umstellt
  const welt2 = await max.evaluate(async () => {
    const w = (await api("/orte/welten", { method: "POST", body: JSON.stringify({ seed: "-4719278516927443210" }) })).data.welt;
    await api("/orte/instanzen", { method: "POST", body: JSON.stringify({ dimensionId: `d_${w.id}_end`, kategorie: "End City", variante: null, x: 1300, y: 60, z: -820, quelle: "manuell" }) });
    return w.id;
  });
  await schlafen(400);
  pruefe((await anzeigeOrte()).startsWith("Hauptbasis"), "Neue Welt ändert die Anzeige nicht");
  await max.evaluate(() => boardOeffnen());
  pruefe(await warteAuf(max, () => document.getElementById("boardWelt")?.options.length === 2), "Board-Sheet: Auswahl mit beiden Welten");
  await max.screenshot({ path: `${DIR}/l7-board-einstellungen.png` });
  await max.selectOption("#boardWelt", welt2);
  pruefe(await warteAuf(anzeige, () => document.querySelectorAll(".a-zeile").length === 1 && document.querySelector(".a-zeile .name > span").textContent === "End City"), "Aktive Welt umgestellt → Anzeige zeigt End City");
  pruefe((await text(anzeige, ".subtitle")).includes("Welt -4719…3210"), "Anzeige nennt die neue Welt");
  await max.fill("#boardTitel", "Server-Welt"); await max.press("#boardTitel", "Enter"); await max.$eval("#boardTitel", (e) => e.blur());
  pruefe(await warteAuf(anzeige, () => document.querySelector("h1")?.textContent === "Server-Welt"), "Titel der Anzeige geändert");
  pruefe(await anzeige.$(".qr") !== null, "QR-Code sichtbar");
  await max.click('[data-aktion="board-qr"]');
  pruefe(await warteAuf(anzeige, () => !document.querySelector(".qr")), "QR-Code ausgeblendet");
  pruefe(await warteAuf(max, () => bd.einstellungen?.qrZeigen === false && document.querySelector('[data-aktion="board-qr"]')?.getAttribute("aria-checked") === "false"), "Schalter zeigt „aus“");
  await max.click('[data-aktion="board-qr"]');
  await anzeige.waitForTimeout(600);
  await anzeige.screenshot({ path: `${DIR}/l8-anzeige-welt2.png` });
  await max.click('#orteSheetInhalt [data-aktion="schliessen"]');

  // === Neuladen und Server-Neustart =============================================
  await max.reload();
  pruefe(await warteAuf(max, () => !DEMO.enabled && st.instanzen?.length === 3 && bd.status === "verbunden"), "Neuladen: angemeldet, Daten da, live verbunden");
  boardAus = true;
  await boardStoppen();
  pruefe(await warteAuf(max, () => bd.status === "getrennt"), "Board aus → getrennt");
  await boardStarten();
  pruefe(await warteAuf(max, () => bd.status === "verbunden", null, 12000), "Board wieder da → verbindet neu");
  pruefe(await warteAuf(lena, () => bd.status === "verbunden", null, 12000), "… auch Lena");
  boardAus = false;
  await max.reload();
  await max.evaluate(() => modulWechseln("sammelobjekte"));
  pruefe(await warteAuf(max, () => st.instanzen?.length === 3 && sam.status.rib && pt.liste.length === 1), "Nach dem Neustart: Orte, Sammelobjekt, Portal noch da");
  pruefe((await max.evaluate(() => api("/ruestung"))).data.sets[0]?.name === "Rippen-Set", "… und das Rüstungs-Set");
  pruefe(await warteAuf(anzeige, () => document.querySelector("h1")?.textContent === "Server-Welt" && document.querySelector(".a-zeile .name > span")?.textContent === "End City", null, 12000),
    "Anzeige nach dem Neustart: weiter Welt 2 mit Titel");

  // === Abmelden, abgelaufene Anmeldung ==========================================
  await lena.evaluate(() => { bd.verbindung.token = "kaputt.token"; lsSchreiben("board.verbindung", bd.verbindung); });
  await lena.reload();
  pruefe(await warteAuf(lena, () => document.querySelector(".sheet-kopf h2")?.textContent === "Beitreten"), "Ungültiges Token → wieder „Beitreten“");
  await lena.fill("#boardPin", PIN);   // nach dem Beitreten steht die Board-PIN nicht mehr in der Adresse
  pruefe(await warteAuf(lena, () => [...document.querySelectorAll("#boardKonten .konto")].map((k) => k.textContent).join() === "Max,Lena"),
    "Beitreten zeigt die Accounts zum Auswählen");
  await lena.screenshot({ path: `${DIR}/l4b-konten.png` });
  await lena.click('#boardKonten .konto:has-text("Lena")');
  pruefe(await lena.$eval("#boardName", (e) => e.value) === "Lena" && (await text(lena, "#boardKontoHinweis")) === "Anmelden als Lena – mit deiner PIN", "Account antippen → „Anmelden als Lena“");
  await lena.fill("#boardKontoPin", "9999");
  await lena.click('[data-aktion="board-beitreten"]');
  pruefe(await warteAuf(lena, () => document.getElementById("boardBanner")?.textContent.includes("Falsche PIN für Lena")), "Falsche eigene PIN wird gemeldet");
  await lena.fill("#boardPin", "0000"); await lena.fill("#boardKontoPin", KONTO_PIN.Lena);
  await lena.click('[data-aktion="board-beitreten"]');
  pruefe(await warteAuf(lena, () => document.getElementById("boardBanner")?.textContent.includes("Falsche PIN") && !document.getElementById("boardBanner")?.textContent.includes("für")), "Falsche Board-PIN wird gemeldet");
  await lena.fill("#boardPin", PIN);
  await lena.click('[data-aktion="board-beitreten"]');
  pruefe(await warteAuf(lena, () => st.sheet === null && bd.verbindung?.name === "Lena" && bd.ich?.anzeigename === "Lena"), "Mit der richtigen PIN wieder angemeldet – derselbe Account");
  await max.evaluate(() => boardOeffnen());
  pruefe((await text(max, "#orteSheetInhalt")).includes("Abmelden"), "Board-Sheet: „Abmelden“ statt „Trennen“");
  await max.screenshot({ path: `${DIR}/l5-board-sheet.png` });
  await max.click('[data-aktion="board-trennen"]');
  pruefe(await warteAuf(max, () => document.querySelector(".sheet-kopf h2")?.textContent === "Beitreten" && !bd.verbindung), "Abmelden → „Beitreten“");

  pruefe(fehler.length === 0, `keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);
  // erwartet: 7 Muster abgelehnt, Schildkröten-Stiefel abgelehnt, ungültiges Token (Prüfung mit werBistDu),
  // falsche eigene PIN, Accounts mit falscher Board-PIN abgefragt, falsche Board-PIN
  const erwartet = ["422 /api/banner", "422 /api/ruestung", "401 /api/ich", "401 /api/beitreten", "401 /api/beitreten/konten", "401 /api/beitreten"];
  pruefe(JSON.stringify(antworten) === JSON.stringify(erwartet), `nur erwartete HTTP-Fehler: ${antworten.join(", ")}`);
} catch (e) {
  pruefe(false, "Abbruch: " + e.message);
} finally {
  await browser.close();
  await boardStoppen();
  rmSync(TMP, { recursive: true, force: true });
}
