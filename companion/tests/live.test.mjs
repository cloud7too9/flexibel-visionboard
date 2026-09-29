// Live-Betrieb: Das Koordinaten-Board liefert die Companion aus und hält alle Daten.
// Zwei Handys (Max, Lena) arbeiten gleichzeitig; Neuladen und Server-Neustart verlieren nichts.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

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

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const fehler = [], antworten = [];
async function handy() {
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await kontext.newPage();
  p.on("pageerror", (e) => fehler.push(e.message));
  // Ladefehler prüft „antworten“ genau; die Konsole meldet sie nur ohne Adresse (auch /favicon.ico)
  p.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) fehler.push(m.text()); });
  p.on("response", (r) => { if (r.status() >= 400) antworten.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  return p;
}
const text = (p, sel) => p.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim());
const warteAuf = (p, fn, arg, ms = 6000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
/** Wie ein Handy nach dem QR-Scan: /?pin=… öffnen, Name eingeben, beitreten */
async function beitreten(p, name) {
  await p.goto(`${BOARD}/?pin=${PIN}`);
  await p.waitForSelector("#boardName");
  await p.fill("#boardName", name);
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
  await max.screenshot({ path: `${DIR}/l1-beitreten.png` });
  await max.fill("#boardName", "Max");
  await max.click('[data-aktion="board-beitreten"]');
  pruefe(await warteAuf(max, () => document.querySelector(".sheet-kopf h2")?.textContent === "Welt"), "Beigetreten → leeres Board: Welt anlegen");
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
  await max.evaluate(() => ansichtWechseln("liste"));

  // === Zweites Handy sieht alles, Änderungen kommen live ==========================
  const lena = await handy();
  pruefe(await beitreten(lena, "Lena"), "Lena tritt bei");
  pruefe(await warteAuf(lena, () => st.instanzen.length === 1 && st.welten.length === 1), "Lena sieht Welt und Ort von Max");
  await lena.evaluate(() => ansichtWechseln("liste"));
  await max.evaluate(() => api("/orte/instanzen", { method: "POST", body: JSON.stringify({
    dimensionId: `d_${st.weltId}_overworld`, kategorie: "Village", variante: null, x: 1040, y: 64, z: 310, quelle: "manuell" }) }));
  pruefe(await warteAuf(lena, () => st.instanzen.length === 2 && document.querySelector('.ort-kat[data-kat="Village"]')), "Neuer Ort von Max erscheint bei Lena ohne Neuladen");
  await lena.waitForTimeout(500);   // Sheet-Animation abwarten
  await lena.screenshot({ path: `${DIR}/l3-lena-live.png` });

  // Sammelobjekt: Lena hakt ab, Max sieht es
  await max.evaluate(() => modulWechseln("sammelobjekte"));
  await lena.evaluate(() => modulWechseln("sammelobjekte"));
  await lena.click('[data-sam-haken="rib"]');
  pruefe(await warteAuf(max, () => sam.status.rib?.von === "Lena"), "Max sieht: Rippen gefunden von Lena");
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

  // === Neuladen und Server-Neustart =============================================
  await max.reload();
  pruefe(await warteAuf(max, () => !DEMO.enabled && st.instanzen?.length === 2 && bd.status === "verbunden"), "Neuladen: angemeldet, Daten da, live verbunden");
  await boardStoppen();
  pruefe(await warteAuf(max, () => bd.status === "getrennt"), "Board aus → getrennt");
  await boardStarten();
  pruefe(await warteAuf(max, () => bd.status === "verbunden", null, 12000), "Board wieder da → verbindet neu");
  await max.reload();
  await max.evaluate(() => modulWechseln("sammelobjekte"));
  pruefe(await warteAuf(max, () => st.instanzen?.length === 2 && sam.status.rib && pt.liste.length === 1), "Nach dem Neustart: Orte, Sammelobjekt, Portal noch da");

  // === Abmelden, abgelaufene Anmeldung ==========================================
  await lena.evaluate(() => { bd.verbindung.token = "kaputt.token"; lsSchreiben("board.verbindung", bd.verbindung); });
  await lena.reload();
  pruefe(await warteAuf(lena, () => document.querySelector(".sheet-kopf h2")?.textContent === "Beitreten"), "Ungültiges Token → wieder „Beitreten“");
  await lena.fill("#boardPin", "0000"); await lena.fill("#boardName", "Lena");
  await lena.click('[data-aktion="board-beitreten"]');
  pruefe(await warteAuf(lena, () => document.getElementById("boardBanner")?.textContent.includes("Falsche PIN")), "Falsche PIN wird gemeldet");
  await max.evaluate(() => boardOeffnen());
  pruefe((await text(max, "#orteSheetInhalt")).includes("Abmelden"), "Board-Sheet: „Abmelden“ statt „Trennen“");
  await max.screenshot({ path: `${DIR}/l5-board-sheet.png` });
  await max.click('[data-aktion="board-trennen"]');
  pruefe(await warteAuf(max, () => document.querySelector(".sheet-kopf h2")?.textContent === "Beitreten" && !bd.verbindung), "Abmelden → „Beitreten“");

  pruefe(fehler.length === 0, `keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);
  // erwartet: 7 Muster abgelehnt, ungültiges Token, falsche PIN
  const erwartet = ["422 /api/banner", "401 /api/orte/welten", "401 /api/beitreten"];
  pruefe(JSON.stringify(antworten) === JSON.stringify(erwartet), `nur erwartete HTTP-Fehler: ${antworten.join(", ")}`);
} catch (e) {
  pruefe(false, "Abbruch: " + e.message);
} finally {
  await browser.close();
  await boardStoppen();
  rmSync(TMP, { recursive: true, force: true });
}
