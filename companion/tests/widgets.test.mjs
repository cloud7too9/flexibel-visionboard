// Widget-Dashboard (companion/widgets): Raster mit 32 Spalten und quadratischen Zellen auf 16:9 und 4:3,
// Größenstufen am Griff, Vollbild als eigene Route. Liefert den gebauten Stand (dist) unter /dashboard/ aus.
// Vorher: npm --prefix ../widgets install && npm --prefix ../widgets run build
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CHROMIUM_OPTIONEN } from "./hilfen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
const DIST = path.join(HIER, "../widgets/dist");
mkdirSync(DIR, { recursive: true });
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
if (!existsSync(path.join(DIST, "index.html"))) {
  console.log("FEHL Widgets nicht gebaut: npm --prefix ../widgets install && npm --prefix ../widgets run build");
  process.exit(1);
}

// /dashboard/… → dist/…, alles Unbekannte → index.html (eigene Routen wie /dashboard/vollbild/…)
const TYPEN = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  const pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!pfad.startsWith("/dashboard/")) { res.writeHead(404).end(); return; }
  const datei = path.join(DIST, path.normalize(pfad.slice("/dashboard/".length)).replace(/^([/\\])+/, ""));
  const ziel = !path.relative(DIST, datei).startsWith("..") && existsSync(datei) && path.extname(datei) ? datei : path.join(DIST, "index.html");
  res.writeHead(200, { "content-type": TYPEN[path.extname(ziel)] ?? "application/octet-stream" }).end(await readFile(ziel));
});
await new Promise((ok) => server.listen(3188, "127.0.0.1", ok));
const ADRESSE = "http://127.0.0.1:3188/dashboard/";

const browser = await chromium.launch(CHROMIUM_OPTIONEN);
const fehler = [];
try {
  // ---- Raster auf 16:9 und 4:3 ----
  for (const [name, breite, hoehe] of [["16x9", 1920, 1080], ["4x3", 1024, 768]]) {
    const p = await browser.newPage({ viewport: { width: breite, height: hoehe } });
    p.on("pageerror", (e) => fehler.push(e.message));
    await p.goto(ADRESSE);
    await p.waitForSelector('[data-panel-id]');
    const r = await p.evaluate(() => {
      const f = document.querySelector('[data-testid="raster-flaeche"]').getBoundingClientRect();
      const grid = document.querySelector('[data-testid="raster-flaeche"]').dataset.grid;
      const [spalten, reihen] = grid.split("x").map(Number);
      const zelle = f.width / spalten;
      const panels = [...document.querySelectorAll("[data-panel-id]")].map((el) => {
        const b = el.getBoundingClientRect();
        return { links: (b.left - f.left) / zelle, oben: (b.top - f.top) / zelle, breite: b.width / zelle, hoehe: b.height / zelle };
      });
      return { spalten, reihen, zelle, flaecheHoehe: f.height, panels, badge: document.querySelector('[data-testid="raster-badge"]').textContent };
    });
    pruefe(r.spalten === 32 && r.reihen > 0 && Math.abs(r.flaecheHoehe - r.reihen * r.zelle) < 1 && r.badge === `32×${r.reihen}`,
      `${name}: Fläche 32 × ${r.reihen} quadratische Zellen à ${r.zelle.toFixed(1)} px`);
    // Widgets liegen auf ganzen Zellen (Abstand innerhalb der Zelle abgezogen)
    const aufZellen = r.panels.every((x) => [x.links, x.oben, x.breite, x.hoehe].every((v) => Math.abs(v - Math.round(v)) < 0.3));
    pruefe(aufZellen && r.panels.length === 6, `${name}: 6 Widgets auf ganzen Zellen`);
    await p.getByRole("button", { name: "Bearbeiten" }).click();
    await p.waitForTimeout(200);
    pruefe((await p.$$eval('[data-testid="stufe"]', (l) => l.map((e) => e.textContent))).every((t) => /^\S+ · \d+×\d+$/.test(t)),
      `${name}: Bearbeiten zeigt Stufe und Größe je Widget`);
    await p.screenshot({ path: `${DIR}/w1-raster-${name}.png` });
    await p.close();
  }

  // ---- Größenstufen am Griff, Vollbild ----
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on("pageerror", (e) => fehler.push(e.message));
  await p.goto(ADRESSE);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.getByRole("button", { name: "Bearbeiten" }).click();
  const stufe = (id) => p.$eval(`[data-panel-id="${id}"] [data-testid="stufe"]`, (e) => e.textContent);
  const griff = (id) => p.locator(`[data-panel-id="${id}"] [aria-label="Größe ändern (nächste Stufe)"]`);
  pruefe((await stufe("panel-toolstart")) === "mittel · 6×6", "Tool-Start in „mittel“");
  await griff("panel-toolstart").click();
  pruefe((await stufe("panel-toolstart")) === "klein · 6×4", "Griff antippen → nächste Stufe „klein“");
  await griff("panel-toolstart").click();
  pruefe((await stufe("panel-toolstart")) === "mittel · 6×6", "nochmal → wieder „mittel“ (keine freien Größen)");
  // Ziehen: Letzte Inhalte „mittel“ 10×6 → nach rechts unten ziehen → „groß“ 12×9
  const box = await griff("panel-letzteInhalte").boundingBox();
  const zelle = await p.$eval('[data-testid="raster-flaeche"]', (f) => f.getBoundingClientRect().width / 32);
  await p.mouse.move(box.x + 4, box.y + 4);
  await p.mouse.down();
  await p.mouse.move(box.x + 4 + 2 * zelle, box.y + 4 + 3 * zelle, { steps: 6 });
  await p.mouse.up();
  pruefe((await stufe("panel-letzteInhalte")) === "groß · 12×9", "Griff ziehen → nächstgelegene Stufe „groß“");
  await p.screenshot({ path: `${DIR}/w2-stufen.png` });
  pruefe(await p.evaluate(() => JSON.parse(localStorage.getItem("mainhub.workspace.v1")).layers[0].items
    .find((i) => i.id === "panel-letzteInhalte").stufe) === "groß", "Stufe wird gespeichert");

  // Vollbild nur bei Typen mit vollbild: true
  pruefe(await p.locator('[data-panel-id="panel-aufgaben"] [aria-label="Vollbild"]').count() === 0, "Aufgaben: kein Vollbild (optional je Typ)");
  await p.locator('[data-panel-id="panel-projektstatus"] [aria-label="Vollbild"]').click();
  await p.waitForSelector('[data-testid="vollbild"]');
  pruefe(new URL(p.url()).pathname === "/dashboard/vollbild/panel-projektstatus", "Vollbild als eigene Route /dashboard/vollbild/:instanzId");
  pruefe((await p.textContent('[data-testid="vollbild"] h1')) === "Projektstatus", "Vollbild zeigt das Widget allein");
  await p.screenshot({ path: `${DIR}/w3-vollbild.png` });
  await p.getByRole("button", { name: "Zurück" }).click();
  await p.waitForSelector('[data-testid="raster-flaeche"]');
  pruefe((await stufe("panel-letzteInhalte")) === "groß · 12×9"
    && await p.$eval('[data-panel-id="panel-projektstatus"]', (e) => e.style.left) !== "", "Zurück: Raster mit unveränderter Position");
  // Direkt aufgerufen (z. B. später vom Handy ausgelöst) und mit unbekannter Instanz
  await p.goto(`${ADRESSE}vollbild/panel-letzteInhalte`);
  pruefe((await p.textContent('[data-testid="vollbild"] h1')) === "Letzte Inhalte", "Vollbild direkt aufrufbar");
  await p.goto(`${ADRESSE}vollbild/gibt-es-nicht`);
  pruefe((await p.textContent('[data-testid="vollbild"] [role="status"]')) === "Dieses Widget gibt es nicht (mehr).", "Unbekannte Instanz: Hinweis");
  await p.close();
} catch (f) {
  pruefe(false, `Abbruch: ${f.stack || f}`);
} finally {
  pruefe(fehler.length === 0, `keine Fehler in der Seite${fehler.length ? `: ${fehler.join(" | ")}` : ""}`);
  await browser.close();
  server.close();
}
