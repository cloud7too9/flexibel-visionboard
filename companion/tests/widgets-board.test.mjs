// Widget-Dashboard am echten Board: Das Board liefert /dashboard aus, die Widgets zeigen die Karten
// aus den Daten der aktiven Welt (GET /api/widgets/:typ) und laden nach Änderungen live neu. Jede
// Anzeige zeigt ihr Layout vom Server (A6) ohne Bearbeiten und meldet ihre Reihen; ein neues Layout
// kommt live an. Eine gelöschte Quelle zeigt den leeren Zustand. Von außen nur mit Anzeige-Link.
// Vorher: npm --prefix ../widgets run build
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
  ({ token } = await api("POST", "/api/beitreten", { pin: PIN, name: "Max", kontoPin: "2468" }));
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

  // ---- Anzeige (A6): kein Bearbeiten, meldet ihre Reihen ----
  const warteBis = async (fn, ms = 8000) => { for (const ende = Date.now() + ms; Date.now() < ende; await schlafen(150)) if (await fn()) return true; return false; };
  pruefe(await p.textContent('[data-testid="anzeige-name"]') === "Anzeige Board" && await p.getByRole("button", { name: "Bearbeiten" }).count() === 0,
    "Am Board: Anzeige „Board“, kein Bearbeiten (angeordnet wird am Handy)");
  const reihen = await p.$eval('[data-testid="raster-flaeche"]', (f) => Number(f.dataset.grid.split("x")[1]));
  const [board1] = (await api("GET", "/api/anzeigen")).anzeigen;
  pruefe(await warteBis(async () => (await api("GET", "/api/anzeigen")).anzeigen[0].reihen === reihen), `Anzeige meldet ihre Reihen (${reihen})`);

  // ---- Layout am Server (wie es später das Handy speichert) → kommt live an ----
  const quellen = (await api("GET", "/api/widgets/karte.einzelkoordinate/quellen")).quellen;
  pruefe(quellen.length === 1 && quellen[0].name === "Hauptbasis", "Quellen für die Einzelkoordinate vom Board");
  const festung = (await api("POST", "/api/orte/instanzen",
    { dimensionId: `d_${welt.id}_nether`, kategorie: "Nether Fortress", variante: null, x: -200, y: 70, z: 96, quelle: "manuell" })).instanz;
  const layout = { aktiverLayer: "l1", layer: [{ id: "l1", name: "Start", instanzen: [
    { id: "w-gesamtkarte", typ: "karte.gesamtkarte", stufe: "standard", x: 0, y: 0 },
    { id: "w-portale", typ: "portale.verbindungen", stufe: "standard", x: 12, y: 0 },
    { id: "w-sammelstatus", typ: "sammelobjekte.status", stufe: "standard", x: 22, y: 0 },
    { id: "w-basis", typ: "karte.einzelkoordinate", stufe: "standard", x: 26, y: 0, quelle: basis.id },
    { id: "w-festung", typ: "karte.einzelkoordinate", stufe: "standard", x: 26, y: 4, quelle: festung.id },
    { id: "w-banner", typ: "banner.banner", stufe: "standard", x: 12, y: 6, quelle: banner.id },
    { id: "w-bauplan", typ: "bauplaene.bauplan", stufe: "standard", x: 20, y: 8 },
    { id: "w-sammelobjekte", typ: "sammelobjekte.gesamtauflistung", stufe: "standard", x: 0, y: 8 },
  ] }, { id: "l2", name: "Leer", instanzen: [] }] };
  await api("PUT", `/api/anzeigen/${board1.id}/layout`, layout);
  pruefe(await p.waitForSelector('[data-panel-id="w-bauplan"]', { timeout: 8000 }).then(() => true, () => false)
    && await p.$$eval("[data-panel-id]", (l) => l.length) === 8, "Layout vom Handy kommt live an (8 Widgets)");
  pruefe(await warteBis(async () => (await karteText('[data-panel-id="w-basis"]')).includes("X 260 · Y 80 · Z −420")), "Einzelkoordinate zeigt ihre Quelle");
  pruefe(await warteBis(async () => (await p.$$eval('[data-typ="karte.einzelkoordinate"] [data-testid="gehaeuse"]', (l) => l.map((g) => g.dataset.theme).join())) === "karte-oberwelt,karte-nether"),
    "Karte: Theme nach Dimension (Oberwelt, Nether)");
  pruefe(await p.waitForFunction(() => {
    const img = document.querySelector('[data-panel-id="w-banner"] [data-testid="karte"] img');
    return img && img.complete && img.naturalWidth === 20 && img.naturalHeight === 40 && img.style.imageRendering === "pixelated";
  }, null, { timeout: 8000 }).then(() => true, () => false), "Banner: Vorschau 20×40 vom Server, pixelgenau");
  pruefe(await p.textContent('[data-panel-id="w-bauplan"] [data-testid="widget-leer"]') === "Bereich geplant", "Bauplan ohne Quelle: „Bereich geplant“");
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${DIR}/w7-board-karten.png` });

  // Anderer Layer aktiv → die Anzeige wechselt
  await api("PUT", `/api/anzeigen/${board1.id}/layout`, { ...layout, aktiverLayer: "l2" });
  pruefe(await warteBis(async () => (await p.textContent('[data-testid="layer-name"]')) === "Leer" && (await p.$$eval("[data-panel-id]", (l) => l.length)) === 0),
    "Aktiver Layer „Leer“ → Anzeige zeigt ihn, mit Hinweis");
  await api("PUT", `/api/anzeigen/${board1.id}/layout`, layout);
  await p.waitForSelector('[data-panel-id="w-basis"]');

  // ---- Quelle gelöscht → leerer Zustand (live) ----
  await api("DELETE", `/api/orte/instanzen/${basis.id}`);
  pruefe(await p.waitForFunction(() => document.querySelector('[data-panel-id="w-basis"] [data-testid="widget-leer"]')?.textContent === "Die Quelle gibt es nicht mehr",
    null, { timeout: 8000 }).then(() => true, () => false), "Quelle gelöscht → Widget zeigt „Die Quelle gibt es nicht mehr“");

  // ---- Von außen: ohne Link kein Inhalt, mit Anzeige-Link das Layout genau dieser Anzeige ----
  if (AUSSEN) {
    const tablet = (await api("POST", "/api/anzeigen", { name: "Tablet" })).anzeige;
    const tv = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    tv.on("pageerror", (e) => fehler.push(e.message));
    await tv.goto(`http://${AUSSEN}:${PORT}/dashboard/`);
    pruefe(await tv.waitForFunction(() => document.querySelector('[data-panel-id="w-sammelstatus"] [data-testid="widget-leer"]')?.textContent
      === "Diese Anzeige braucht ihren Anzeige-Link", null, { timeout: 8000 }).then(() => true, () => false), "Anderes Gerät ohne Link: Hinweis auf den Anzeige-Link");
    const link = new URL(tablet.link);
    await tv.goto(`http://${AUSSEN}:${PORT}/dashboard${link.search}`);
    pruefe(await tv.waitForFunction(() => document.querySelector('[data-panel-id="w-sammelstatus"] [data-testid="karte"]')?.textContent.includes("2 von 18")
      && document.querySelector('[data-testid="anzeige-name"]')?.textContent === "Anzeige Tablet" && document.querySelectorAll("[data-panel-id]").length === 4,
      null, { timeout: 8000 }).then(() => true, () => false), "Mit Anzeige-Link: „Tablet“ mit eigenem Layout (noch das Start-Layout) und Karten vom Board");
    const tvReihen = await tv.$eval('[data-testid="raster-flaeche"]', (f) => Number(f.dataset.grid.split("x")[1]));
    pruefe(await warteBis(async () => (await api("GET", "/api/anzeigen")).anzeigen.find((a) => a.id === tablet.id).reihen === tvReihen)
      && (await api("GET", "/api/anzeigen")).anzeigen[0].reihen === reihen, `Jede Anzeige meldet ihre eigenen Reihen (Board ${reihen}, Tablet ${tvReihen})`);
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
