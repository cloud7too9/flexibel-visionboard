// Widget-Dashboard (companion/widgets): Raster mit 32 Spalten und quadratischen Zellen auf 16:9 und 4:3,
// Größenstufen am Griff, Zusatzinhalte je Stufe, Galerie nach Bereich, Vollbild als eigene Route. Liefert den gebauten Stand (dist) unter /dashboard/ aus.
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
    pruefe(aufZellen && r.panels.length === 4, `${name}: 4 Widgets auf ganzen Zellen`);
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
  // Sammel-Fortschritt am Kopf nach rechts unten ziehen – dann ist Platz für Portale „groß“
  const zelle = await p.$eval('[data-testid="raster-flaeche"]', (f) => f.getBoundingClientRect().width / 32);
  const kopf = await p.locator('[data-panel-id="w-sammelstatus"] .long-press-target').boundingBox();
  await p.mouse.move(kopf.x + 20, kopf.y + 10);
  await p.mouse.down();
  await p.mouse.move(kopf.x + 20 + 6 * zelle, kopf.y + 10 + 15 * zelle, { steps: 8 });
  await p.mouse.up();
  const lage = await p.evaluate(() => JSON.parse(localStorage.getItem("mainhub.workspace.v1")).layers[0].instanzen.find((i) => i.id === "w-sammelstatus"));
  pruefe(lage.x === 28 && lage.y === 15, `Kopfzeile ziehen verschiebt zellweise (jetzt ${lage.x}, ${lage.y})`);

  const zusatz = () => p.locator('[data-panel-id="w-portale"] [data-testid="zusatzinhalt"]').count();
  pruefe((await stufe("w-portale")) === "standard · 10×6" && (await zusatz()) === 0, "Portalverbindungen in „standard“, ohne Tipps");
  await griff("w-portale").click();
  pruefe((await stufe("w-portale")) === "groß · 12×9", "Griff antippen → nächste Stufe „groß“");
  pruefe((await zusatz()) === 1, "Ab „groß“: Tipps als Zusatzinhalt");
  await p.screenshot({ path: `${DIR}/w2-stufen.png` });
  await griff("w-portale").click();
  pruefe((await stufe("w-portale")) === "standard · 10×6" && (await zusatz()) === 0, "nochmal → wieder „standard“ (keine freien Größen)");
  pruefe((await griff("w-sammelstatus").count()) === 1 && await (async () => { await griff("w-sammelstatus").click(); return (await stufe("w-sammelstatus")) === "standard · 4×3"; })(),
    "Typ mit nur einer Stufe bleibt in seiner Stufe");
  // Ziehen: Portale nach rechts unten → nächstgelegene Stufe „groß“
  const box = await griff("w-portale").boundingBox();
  await p.mouse.move(box.x + 4, box.y + 4);
  await p.mouse.down();
  await p.mouse.move(box.x + 4 + 2 * zelle, box.y + 4 + 3 * zelle, { steps: 6 });
  await p.mouse.up();
  pruefe((await stufe("w-portale")) === "groß · 12×9", "Griff ziehen → nächstgelegene Stufe „groß“");
  pruefe(await p.evaluate(() => JSON.parse(localStorage.getItem("mainhub.workspace.v1")).layers[0].instanzen
    .find((i) => i.id === "w-portale").stufe) === "groß", "Stufe wird gespeichert");

  // ---- Galerie: nach Bereich gruppiert, Suche, Vorschau in der kleinsten Stufe ----
  await p.getByRole("button", { name: "Widget hinzufügen" }).first().click();
  await p.waitForSelector("[data-widget-typ]");
  const gruppen = await p.$$eval("section[data-bereich]", (l) => l.map((s) => [s.dataset.bereich, s.querySelectorAll("[data-widget-typ]").length]));
  pruefe(JSON.stringify(gruppen) === JSON.stringify([["karte", 1], ["sammelobjekte", 2], ["portale", 1]]), `Galerie nach Bereich: ${JSON.stringify(gruppen)}`);
  const vorschau = await p.$eval('[data-widget-typ="portale.verbindungen"] [data-testid="vorschau"]', (e) => [e.offsetWidth, e.offsetHeight]);
  pruefe(vorschau[0] === 90 && vorschau[1] === 54, `Vorschau in der kleinsten Stufe (10×6 Zellen → ${vorschau.join("×")} px)`);
  await p.screenshot({ path: `${DIR}/w4-galerie.png` });
  await p.fill('input[aria-label="Widgets suchen"]', "fortschritt");
  pruefe(JSON.stringify(await p.$$eval("[data-widget-typ]", (l) => l.map((e) => e.dataset.widgetTyp))) === '["sammelobjekte.status"]', "Suche „fortschritt“");
  await p.click('[data-widget-typ="sammelobjekte.status"]');
  pruefe(await p.locator('[data-typ="sammelobjekte.status"]').count() === 2, "Hinzugefügt an der ersten freien Stelle, Galerie zu");

  // Vollbild nur bei Typen mit vollbild: true
  pruefe(await p.locator('[data-panel-id="w-sammelobjekte"] [aria-label="Vollbild"]').count() === 0, "Alle Sammelobjekte: kein Vollbild (optional je Typ)");
  await p.locator('[data-panel-id="w-portale"] [aria-label="Vollbild"]').click();
  await p.waitForSelector('[data-testid="vollbild"]');
  pruefe(new URL(p.url()).pathname === "/dashboard/vollbild/w-portale", "Vollbild als eigene Route /dashboard/vollbild/:instanzId");
  pruefe((await p.textContent('[data-testid="vollbild"] h1')) === "Portalverbindungen"
    && await p.locator('[data-testid="vollbild"] [data-testid="zusatzinhalt"]').count() === 1, "Vollbild zeigt das Widget allein, mit allen Zusatzinhalten");
  await p.screenshot({ path: `${DIR}/w3-vollbild.png` });
  await p.getByRole("button", { name: "Zurück" }).click();
  await p.waitForSelector('[data-testid="raster-flaeche"]');
  pruefe((await stufe("w-portale")) === "groß · 12×9", "Zurück: Raster mit unveränderter Position und Stufe");
  // Direkt aufgerufen (z. B. später vom Handy ausgelöst) und mit unbekannter Instanz
  await p.goto(`${ADRESSE}vollbild/w-gesamtkarte`);
  pruefe((await p.textContent('[data-testid="vollbild"] h1')) === "Gesamtkarte", "Vollbild direkt aufrufbar");
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
