// Anordnen am Handy (A6, Weg 1): Max tritt in der Companion bei, öffnet Board → Anzeigen →
// „Anzeige anordnen“ und landet auf /dashboard/anordnen. Dort sieht er die Fläche der Anzeige
// (32 × ihre Reihen) mit leeren Widgets und ordnet an: Widget mit Quelle hinzufügen, verschieben,
// Stufe wechseln, Layer anlegen und wechseln, Vollbild starten und beenden, entfernen. Jede Änderung
// kommt live auf der Anzeige (Fernseher, /dashboard) an. Vorher: npm --prefix ../widgets run build
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { CHROMIUM_OPTIONEN } from "./hilfen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [datei, bauen] of [["../widgets/dist/index.html", "npm --prefix ../widgets run build"],
  ["../../koordinaten-board/client/dist/index.html", "npm --prefix ../../koordinaten-board run build"]]) {
  if (!existsSync(path.join(HIER, datei))) { console.log(`FEHL nicht gebaut: ${bauen}`); process.exit(1); }
}

const TMP = mkdtempSync(path.join(tmpdir(), "widgets-anordnen-"));
const PORT = 3185, PIN = "4711", BOARD = `http://127.0.0.1:${PORT}`;
const board = spawn(process.execPath, ["src/server.js"], {
  cwd: path.join(HIER, "../../koordinaten-board/server"),
  env: { ...process.env, PORT: String(PORT), RAUM_PIN: PIN, DATEN_ORDNER: path.join(TMP, "daten") },
  stdio: "ignore",
});

let token = "";
const api = async (methode, pfad, body) => (await fetch(BOARD + pfad, { method: methode,
  headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  body: body === undefined ? undefined : JSON.stringify(body) })).json();
const warteBis = async (fn, ms = 8000) => { for (const ende = Date.now() + ms; Date.now() < ende; await schlafen(150)) if (await fn()) return true; return false; };

const browser = await chromium.launch(CHROMIUM_OPTIONEN);
const fehler = [];
try {
  for (let i = 0; i < 60 && !(await fetch(`${BOARD}/api/server`).then((r) => r.ok, () => false)); i++) await schlafen(200);
  ({ token } = await api("POST", "/api/beitreten", { pin: PIN, name: "Lena" }));
  await api("POST", "/api/orte/welten", { seed: "6889192652397090698" });
  const banner = (await api("POST", "/api/banner", { name: "Kreuz", basis: "white", ebenen: [{ muster: "cross", farbe: "red" }] })).banner;

  // ---- Die Anzeige im Zimmer (Board-Gerät, localhost) meldet ihre Reihen ----
  const tv = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  tv.on("pageerror", (e) => fehler.push(`TV: ${e.message}`));
  await tv.goto(`${BOARD}/dashboard/`);
  await tv.waitForSelector('[data-panel-id="w-sammelstatus"] [data-testid="karte"]');
  const tvReihen = await tv.$eval('[data-testid="raster-flaeche"]', (f) => Number(f.dataset.grid.split("x")[1]));
  pruefe(await warteBis(async () => (await api("GET", "/api/anzeigen")).anzeigen[0].reihen === tvReihen), `Anzeige „Board“ meldet ${tvReihen} Reihen`);
  const anzeigeId = (await api("GET", "/api/anzeigen")).anzeigen[0].id;
  const layoutAmBoard = async () => (await api("GET", `/api/anzeigen/${anzeigeId}/layout`)).layout;

  // ---- Max in der Companion: Board → Anzeigen → „Anzeige anordnen“ ----
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const max = await kontext.newPage();
  max.on("pageerror", (e) => fehler.push(`Handy: ${e.message}`));
  await max.goto(`${BOARD}/?pin=${PIN}`);
  await max.waitForSelector("#boardName"); await max.fill("#boardName", "Max");
  await max.click('[data-aktion="board-beitreten"]');
  await max.waitForFunction(() => !DEMO.enabled && bd.verbindung?.name);
  await max.evaluate(() => alleSchliessen());
  await max.click("#burgerBtn"); await schlafen(300);
  await max.click("#boardBtn");
  await max.waitForFunction(() => bd.anzeigen?.length && document.querySelector('[data-aktion="anzeige-anordnen"]'));
  pruefe((await max.textContent(".anzeige-karte .card-meta")).includes(`Fläche 32 × ${tvReihen}`), "Board-Sheet nennt die Fläche der Anzeige");
  await max.evaluate(() => document.querySelector('[data-aktion="anzeige-anordnen"]').scrollIntoView({ block: "center" }));
  await max.screenshot({ path: `${DIR}/w9-companion-anordnen-knopf.png` });
  await max.click('[data-aktion="anzeige-anordnen"]');
  await max.waitForSelector('[data-testid="anordnen"] [data-panel-id]');
  pruefe(new URL(max.url()).pathname === "/dashboard/anordnen" && new URL(max.url()).searchParams.get("anzeige") === anzeigeId,
    "„Anzeige anordnen“ öffnet /dashboard/anordnen für diese Anzeige – ohne neue Anmeldung");
  pruefe(await max.isVisible('[data-testid="querformat-hinweis"]'), "Hochformat: „Querformat empfohlen“");
  await max.setViewportSize({ width: 844, height: 390 });
  await schlafen(300);
  pruefe(!(await max.isVisible('[data-testid="querformat-hinweis"]')), "Querformat: kein Hinweis");
  const flaeche = await max.$eval('[data-testid="raster-flaeche"]', (f) => ({ grid: f.dataset.grid, b: f.getBoundingClientRect().width, h: f.getBoundingClientRect().height }));
  pruefe(flaeche.grid === `32x${tvReihen}` && Math.abs(flaeche.b / flaeche.h - 32 / tvReihen) < 0.02,
    `Fläche der Anzeige im richtigen Seitenverhältnis (${flaeche.grid}, ${Math.round(flaeche.b)}×${Math.round(flaeche.h)} px)`);
  pruefe(await max.$$eval("[data-panel-id]", (l) => l.length) === 4 && await max.$$eval('[data-testid="karte"]', (l) => l.length) === 0
    && (await max.textContent('[data-panel-id="w-portale"] [data-testid="leer-titel"]')) === "Portalverbindungen"
    && (await max.$eval('[data-panel-id="w-portale"] [data-testid="gehaeuse"]', (g) => g.dataset.theme)) === "portale",
    "Leere Widgets: Rahmen, Titel und Theme, ohne Inhalt");
  pruefe((await max.textContent('[data-testid="anordnen-titel"]')) === "Anordnen · Board", "Titel nennt die Anzeige");

  // ---- Verschieben ----
  const zelle = await max.$eval('[data-testid="raster-flaeche"]', (f) => f.getBoundingClientRect().width / 32);
  const kopf = await max.locator('[data-panel-id="w-sammelstatus"] .long-press-target').boundingBox();
  await max.mouse.move(kopf.x + 6, kopf.y + 5);
  await max.mouse.down();
  await max.mouse.move(kopf.x + 6 + 4 * zelle, kopf.y + 5 + 10 * zelle, { steps: 8 });
  await max.mouse.up();
  pruefe(await warteBis(async () => { const i = (await layoutAmBoard())?.layer[0].instanzen.find((x) => x.id === "w-sammelstatus"); return i?.x === 26 && i?.y === 10; }),
    "Verschoben: Sammel-Fortschritt jetzt bei (26, 10) – am Board gespeichert");
  pruefe(await warteBis(async () => {
    const r = await tv.$eval('[data-panel-id="w-sammelstatus"]', (p) => { const f = document.querySelector('[data-testid="raster-flaeche"]').getBoundingClientRect(); const b = p.getBoundingClientRect(); const z = f.width / 32; return [Math.round((b.left - f.left) / z), Math.round((b.top - f.top) / z)]; });
    return r[0] === 26 && r[1] === 10;
  }), "Anzeige zeigt das Widget an der neuen Stelle");

  // ---- Stufe wechseln (Griff antippen) ----
  await max.click('[data-panel-id="w-portale"] [aria-label="Größe ändern (nächste Stufe)"]');
  pruefe(await warteBis(async () => (await layoutAmBoard())?.layer[0].instanzen.find((x) => x.id === "w-portale")?.stufe === "groß")
    && await warteBis(async () => (await tv.$eval('[data-panel-id="w-portale"]', (p) => p.querySelectorAll('[data-testid="zusatzinhalt"]').length)) === 1),
    "Stufe „groß“ → Anzeige zeigt Portalverbindungen groß mit Tipps");
  // ---- Widget mit Quelle hinzufügen → kommt live an der Anzeige an ----
  await max.getByRole("button", { name: "+ Widget" }).click();
  await max.fill('input[aria-label="Widgets suchen"]', "banner");
  await max.click('[data-widget-typ="banner.banner"]');
  await max.waitForSelector(`[data-quelle="${banner.id}"]`);
  await max.click(`[data-quelle="${banner.id}"]`);
  pruefe(await tv.waitForSelector('[data-typ="banner.banner"] [data-testid="karte"] img', { timeout: 8000 }).then(() => true, () => false),
    "Banner hinzugefügt → erscheint mit Karte auf der Anzeige");
  pruefe(await warteBis(async () => (await max.textContent('[data-testid="speichern"]')) === "Liegt auf der Anzeige"), "Status: „Liegt auf der Anzeige“");

  await max.screenshot({ path: `${DIR}/w9-anordnen-handy.png` });
  await tv.screenshot({ path: `${DIR}/w10-anzeige-nach-anordnen.png` });

  // ---- Vollbild an der Anzeige starten und beenden ----
  await max.click('[data-panel-id="w-portale"] [data-testid="leer-titel"]');   // antippen = auswählen
  pruefe((await max.textContent('[data-testid="auswahl"]')).includes("Portalverbindungen") && await max.textContent('[data-testid="auswahl"] [data-testid="stufe"]') === "groß · 12×9",
    "Antippen wählt aus: Leiste zeigt Name, Stufe und Werkzeuge");
  await max.screenshot({ path: `${DIR}/w9-anordnen-auswahl.png` });
  await max.click('[data-testid="auswahl"] [aria-label="Vollbild"]');
  pruefe(await tv.waitForFunction(() => location.pathname === "/dashboard/vollbild/w-portale" && document.querySelector('[data-testid="vollbild"] h1')?.textContent === "Portalverbindungen",
    null, { timeout: 8000 }).then(() => true, () => false), "Vollbild am Handy gestartet → Anzeige zeigt Portalverbindungen allein");
  pruefe(await tv.getByRole("button", { name: "Zurück" }).count() === 0, "Anzeige ohne Bedienelemente (kein „Zurück“)");
  pruefe(new URL(max.url()).pathname === "/dashboard/anordnen" && await max.isVisible('[data-testid="vollbild-aktiv"]'), "Handy bleibt beim Anordnen, zeigt „Vollbild an der Anzeige“");
  await tv.screenshot({ path: `${DIR}/w11-anzeige-vollbild.png` });
  await max.getByRole("button", { name: "Vollbild beenden" }).click();
  pruefe(await tv.waitForFunction(() => location.pathname === "/dashboard/" && document.querySelector('[data-panel-id="w-portale"]'),
    null, { timeout: 8000 }).then(() => true, () => false), "Vollbild beendet → Anzeige zeigt wieder das Raster");

  // ---- Layer anlegen (wird aktiv) und zurückwechseln ----
  await max.click('[aria-label^="Layer wechseln"]');
  await max.getByRole("button", { name: "Neuer Layer" }).click();
  await max.keyboard.press("Escape");   // Umbenennen auslassen, die Liste bleibt offen
  pruefe(await tv.waitForFunction(() => document.querySelector('[data-testid="layer-name"]')?.textContent === "Layer 2" && !document.querySelector("[data-panel-id]"),
    null, { timeout: 8000 }).then(() => true, () => false), "Neuer Layer am Handy → Anzeige wechselt auf den leeren „Layer 2“");
  if (!(await max.$('[aria-label="Layer"]'))) await max.click('[aria-label^="Layer wechseln"]');
  await max.click('[aria-label="Layer"] button:has-text("Start")');
  pruefe(await tv.waitForFunction(() => document.querySelector('[data-testid="layer-name"]')?.textContent === "Start" && document.querySelectorAll("[data-panel-id]").length === 5,
    null, { timeout: 8000 }).then(() => true, () => false), "Zurück auf „Start“ → Anzeige zeigt wieder alle 5 Widgets");

  // ---- Ein zweites Handy ändert gleichzeitig → kommt beim ersten an ----
  const layout = await layoutAmBoard();
  await api("PUT", `/api/anzeigen/${anzeigeId}/layout`, { ...layout, layer: layout.layer.map((l) => l.id === layout.aktiverLayer
    ? { ...l, instanzen: l.instanzen.filter((i) => i.id !== "w-gesamtkarte") } : l) });
  pruefe(await warteBis(async () => (await max.$$eval("[data-panel-id]", (l) => l.length)) === 4 && !(await max.$('[data-panel-id="w-gesamtkarte"]'))),
    "Änderung von einem anderen Handy (Gesamtkarte weg) kommt beim Anordnen an");

  // ---- Entfernen ----
  await max.click('[data-typ="banner.banner"] [data-testid="leer-titel"]');
  await max.click('[data-testid="auswahl"] [aria-label="Entfernen"]');
  pruefe(await tv.waitForFunction(() => !document.querySelector('[data-typ="banner.banner"]'), null, { timeout: 8000 }).then(() => true, () => false),
    "Banner am Handy entfernt → verschwindet von der Anzeige");

  // ---- Fertig → zurück in die Companion ----
  await max.click('a:has-text("Fertig")');
  pruefe(await max.waitForFunction(() => location.pathname === "/" && typeof bd !== "undefined" && bd.verbindung?.name === "Max", null, { timeout: 8000 }).then(() => true, () => false),
    "„Fertig“ führt zurück in die Companion, weiter angemeldet");

  // ---- Ohne Anmeldung ----
  const fremd = await browser.newPage();
  await fremd.goto(`${BOARD}/dashboard/anordnen?anzeige=${anzeigeId}`);
  pruefe((await fremd.textContent('[data-testid="anordnen-hinweis"] h1')) === "Erst beitreten", "Ohne Beitritt: „Erst beitreten“ mit Weg zur Companion");
  await fremd.close();
} catch (f) {
  pruefe(false, `Abbruch: ${f.stack || f}`);
} finally {
  pruefe(fehler.length === 0, `keine Fehler in der Seite${fehler.length ? `: ${fehler.join(" | ")}` : ""}`);
  await browser.close();
  board.kill("SIGTERM"); await new Promise((r) => board.once("exit", r));
  rmSync(TMP, { recursive: true, force: true });
}
