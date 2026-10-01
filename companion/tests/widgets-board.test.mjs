// Widget-Dashboard am echten Board: Das Board liefert /dashboard aus, die Widgets zeigen die Karten
// aus den Daten der aktiven Welt (GET /api/widgets/:typ), laden nach Änderungen live neu, die Quelle
// kommt beim Hinzufügen vom Board, eine gelöschte Quelle zeigt den leeren Zustand. Von außen nur
// mit Anzeige-Link. Vorher: npm --prefix ../widgets run build
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir, networkInterfaces } from "node:os";
import path from "node:path";
import { CHROMIUM_OPTIONEN } from "./hilfen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));
if (!existsSync(path.join(HIER, "../widgets/dist/index.html"))) {
  console.log("FEHL Widgets nicht gebaut: npm --prefix ../widgets install && npm --prefix ../widgets run build");
  process.exit(1);
}

const TMP = mkdtempSync(path.join(tmpdir(), "widgets-board-"));
const PORT = 3186, PIN = "4711", BOARD = `http://127.0.0.1:${PORT}`;
const AUSSEN = Object.values(networkInterfaces()).flat().find((n) => n && n.family === "IPv4" && !n.internal)?.address;
const board = spawn(process.execPath, ["src/server.js"], {
  cwd: path.join(HIER, "../../koordinaten-board/server"),
  env: { ...process.env, PORT: String(PORT), RAUM_PIN: PIN, DATEN_ORDNER: path.join(TMP, "daten"),
         ...(AUSSEN && { OEFFENTLICHE_URL: `http://${AUSSEN}:${PORT}` }) },
  stdio: "ignore",
});

let token = "";
const api = async (methode, pfad, body) => {
  const res = await fetch(BOARD + pfad, { method: methode,
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return res.json();
};

const browser = await chromium.launch(CHROMIUM_OPTIONEN);
const fehler = [];
try {
  for (let i = 0; i < 60 && !(await fetch(`${BOARD}/api/server`).then((r) => r.ok, () => false)); i++) await schlafen(200);
  ({ token } = await api("POST", "/api/beitreten", { pin: PIN, name: "Max" }));
  const welt = (await api("POST", "/api/orte/welten", { seed: "6889192652397090698" })).welt;
  const basis = (await api("POST", "/api/orte/instanzen",
    { dimensionId: `d_${welt.id}_overworld`, kategorie: "Eigene Orte", variante: "Hauptbasis", x: 260, y: 80, z: -420, quelle: "manuell" })).instanz;
  await api("PUT", `/api/sammelobjekte/welten/${welt.id}/rib`, { gefunden: true });
  await api("POST", `/api/portale/welten/${welt.id}`, { name: "Eisenfarm", oberwelt: { x: 800, y: 64, z: 80 }, nether: { x: 100, y: 64, z: 10 } });
  const banner = (await api("POST", "/api/banner", { name: "Kreuz", basis: "white", ebenen: [{ muster: "cross", farbe: "red" }] })).banner;

  // ---- Dashboard vom Board (localhost = Anzeige des Board-Geräts) ----
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on("pageerror", (e) => fehler.push(e.message));
  await p.goto(`${BOARD}/dashboard`);
  await p.waitForSelector('[data-panel-id="w-sammelstatus"] [data-testid="karte"]');
  const karteText = (sel) => p.$eval(`${sel} [data-testid="karte"]`, (k) => k.textContent).catch(() => "");
  pruefe(new URL(p.url()).pathname === "/dashboard/" && !(await p.$('[data-testid="beispielkarten"]')), "Board liefert /dashboard aus, Karten vom Board (keine Beispielkarten)");
  pruefe((await karteText('[data-panel-id="w-sammelstatus"]')).includes("1 von 18"), "Sammel-Fortschritt: 1 von 18");
  pruefe((await karteText('[data-panel-id="w-portale"]')).includes("Eisenfarm"), "Portalverbindungen: Eisenfarm");
  pruefe((await karteText('[data-panel-id="w-gesamtkarte"]')).includes("Hauptbasis") === false
    && (await karteText('[data-panel-id="w-gesamtkarte"]')).includes("1 Orte"), "Gesamtkarte: Orte je Dimension");

  // ---- Live: Änderung am Handy → Widget lädt neu ----
  await api("PUT", `/api/sammelobjekte/welten/${welt.id}/eye`, { gefunden: true });
  pruefe(await p.waitForFunction(() => document.querySelector('[data-panel-id="w-sammelstatus"] [data-testid="karte"]')?.textContent.includes("2 von 18"),
    null, { timeout: 8000 }).then(() => true, () => false), "Live: Sammelobjekt abgehakt → 2 von 18 ohne Neuladen");

  // ---- Quelle beim Hinzufügen vom Board ----
  await p.getByRole("button", { name: "Bearbeiten" }).click();
  const hinzufuegen = async (typ, quelle) => {
    await p.getByRole("button", { name: "Widget hinzufügen" }).first().click();
    await p.click(`[data-widget-typ="${typ}"]`);
    if (quelle) { await p.waitForSelector(`[data-quelle="${quelle}"]`); await p.click(`[data-quelle="${quelle}"]`); }
    await p.waitForSelector(`[data-typ="${typ}"]`);
  };
  await p.getByRole("button", { name: "Widget hinzufügen" }).first().click();
  await p.click('[data-widget-typ="karte.einzelkoordinate"]');
  await p.waitForSelector("[data-quelle]");
  const quellen = await p.$$eval("[data-quelle]", (l) => l.map((e) => e.textContent));
  pruefe(quellen.length === 1 && quellen[0].startsWith("Hauptbasis") && quellen[0].includes("Oberwelt"), `Koordinate wählen: Orte der Welt vom Board (${quellen.join(" | ")})`);
  await p.click(`[data-quelle="${basis.id}"]`);
  await p.waitForSelector('[data-typ="karte.einzelkoordinate"] [data-testid="karte"]');
  pruefe((await karteText('[data-typ="karte.einzelkoordinate"]')).includes("X 260 · Y 80 · Z −420"), "Einzelkoordinate zeigt die gewählte Koordinate");
  // Theme der Karte nach angezeigter Dimension (A5)
  const festung = (await api("POST", "/api/orte/instanzen",
    { dimensionId: `d_${welt.id}_nether`, kategorie: "Nether Fortress", variante: null, x: -200, y: 70, z: 96, quelle: "manuell" })).instanz;
  await hinzufuegen("karte.einzelkoordinate", festung.id);
  const kartenThemes = () => p.$$eval('[data-typ="karte.einzelkoordinate"] [data-testid="gehaeuse"]', (l) => l.map((g) => g.dataset.theme).sort().join());
  pruefe(await p.waitForFunction(() => [...document.querySelectorAll('[data-typ="karte.einzelkoordinate"] [data-testid="gehaeuse"]')]
    .map((g) => g.dataset.theme).sort().join() === "karte-nether,karte-oberwelt", null, { timeout: 8000 }).then(() => true, () => false),
    `Karte: Theme nach Dimension (${await kartenThemes()})`);
  await hinzufuegen("banner.banner", banner.id);
  pruefe(await p.waitForFunction(() => {
    const img = document.querySelector('[data-typ="banner.banner"] [data-testid="karte"] img');
    return img && img.complete && img.naturalWidth === 20 && img.naturalHeight === 40 && img.style.imageRendering === "pixelated";
  }, null, { timeout: 8000 }).then(() => true, () => false), "Banner: Vorschau 20×40 vom Server, pixelgenau");
  await hinzufuegen("bauplaene.bauplan");
  pruefe(await p.textContent('[data-typ="bauplaene.bauplan"] [data-testid="widget-leer"]') === "Bereich geplant", "Bauplan ohne Quelle: „Bereich geplant“");
  await p.getByRole("button", { name: "Bearbeitung beenden" }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${DIR}/w7-board-karten.png` });

  // ---- Quelle gelöscht → leerer Zustand (live) ----
  await api("DELETE", `/api/orte/instanzen/${basis.id}`);
  pruefe(await p.waitForFunction(() => document.querySelector('[data-typ="karte.einzelkoordinate"] [data-testid="widget-leer"]')?.textContent === "Die Quelle gibt es nicht mehr",
    null, { timeout: 8000 }).then(() => true, () => false), "Quelle gelöscht → Widget zeigt „Die Quelle gibt es nicht mehr“");

  // ---- Von außen: ohne Link kein Inhalt, mit Anzeige-Link Karten ----
  if (AUSSEN) {
    const tv = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    tv.on("pageerror", (e) => fehler.push(e.message));
    await tv.goto(`http://${AUSSEN}:${PORT}/dashboard/`);
    pruefe(await tv.waitForFunction(() => document.querySelector('[data-panel-id="w-sammelstatus"] [data-testid="widget-leer"]')?.textContent
      === "Diese Anzeige braucht ihren Anzeige-Link", null, { timeout: 8000 }).then(() => true, () => false), "Anderes Gerät ohne Link: Hinweis auf den Anzeige-Link");
    const link = new URL((await api("GET", "/api/anzeigen")).anzeigen[0].link);
    await tv.goto(`http://${AUSSEN}:${PORT}/dashboard${link.search}`);
    pruefe(await tv.waitForFunction(() => document.querySelector('[data-panel-id="w-sammelstatus"] [data-testid="karte"]')?.textContent.includes("2 von 18"),
      null, { timeout: 8000 }).then(() => true, () => false), "Mit Anzeige-Link: Karten vom Board");
    await tv.goto(`http://${AUSSEN}:${PORT}/dashboard/`);
    pruefe(await tv.waitForFunction(() => document.querySelector('[data-panel-id="w-sammelstatus"] [data-testid="karte"]'),
      null, { timeout: 8000 }).then(() => true, () => false), "Neustart ohne Link: Schlüssel aus dem Browser");
  } else {
    console.log("OK   übersprungen: keine Netzwerkadresse für den Zugriff „von außen“");
  }
} catch (f) {
  pruefe(false, `Abbruch: ${f.stack || f}`);
} finally {
  pruefe(fehler.length === 0, `keine Fehler in der Seite${fehler.length ? `: ${fehler.join(" | ")}` : ""}`);
  await browser.close();
  board.kill("SIGTERM"); await new Promise((r) => board.once("exit", r));
  rmSync(TMP, { recursive: true, force: true });
}
