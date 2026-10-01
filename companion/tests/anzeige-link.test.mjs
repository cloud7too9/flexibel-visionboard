// Anzeige-Link: Im Board-Sheet der Companion stehen die Anzeigen mit Link und QR-Code. Ein anderes Gerät
// (hier: dieselbe Maschine über ihre Netzwerkadresse, also nicht localhost) wird mit dem Link zur Anzeige,
// merkt sich den Schlüssel und fliegt raus, wenn jemand einen neuen Schlüssel erzeugt.
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
if (!existsSync(path.join(HIER, "../../koordinaten-board/client/dist/index.html"))) {
  console.log("FEHL Board-Client nicht gebaut: npm --prefix ../../koordinaten-board run build");
  process.exit(1);
}
const AUSSEN = Object.values(networkInterfaces()).flat().find((n) => n && n.family === "IPv4" && !n.internal)?.address;
if (!AUSSEN) { console.log("OK   übersprungen: keine Netzwerkadresse für den Zugriff „von außen“"); process.exit(0); }

const TMP = mkdtempSync(path.join(tmpdir(), "anzeige-link-"));
const PORT = 3189, PIN = "4711", BOARD = `http://127.0.0.1:${PORT}`;
const board = spawn(process.execPath, ["src/server.js"], {
  cwd: path.join(HIER, "../../koordinaten-board/server"),
  env: { ...process.env, PORT: String(PORT), RAUM_PIN: PIN, DATEN_ORDNER: path.join(TMP, "daten"), OEFFENTLICHE_URL: `http://${AUSSEN}:${PORT}` },
  stdio: ["ignore", "pipe", "ignore"],
});
let konsole = "";
board.stdout.on("data", (d) => { konsole += d; });

const browser = await chromium.launch(CHROMIUM_OPTIONEN);
const fehler = [];
async function seite(viewport = { width: 390, height: 844 }) {
  const k = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const p = await k.newPage();
  p.on("pageerror", (e) => fehler.push(e.message));
  return p;
}
const text = (p, sel) => p.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
const warteAuf = (p, fn, arg, ms = 8000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BOARD}/api/server`)).ok) break; } catch {} await schlafen(200); }
  await schlafen(300);
  pruefe(new RegExp(`Anzeige auf anderem Gerät: http://${AUSSEN.replace(/\./g, "\\.")}:${PORT}/anzeige\\?anzeige=a_\\d+&schluessel=[\\w-]+`).test(konsole),
    "Konsole nennt den Anzeige-Link beim Start");

  // ---- Max tritt bei, öffnet das Board-Sheet ----
  const max = await seite();
  await max.goto(`${BOARD}/?pin=${PIN}`);
  await max.waitForSelector("#boardName"); await max.fill("#boardName", "Max");
  await max.click('[data-aktion="board-beitreten"]');
  await warteAuf(max, () => !DEMO.enabled && bd.verbindung?.name);
  await max.evaluate(() => alleSchliessen());   // „Noch keine Welt“ zu
  await max.click("#burgerBtn"); await schlafen(300);   // Board-Knopf unten in der Sidebar
  await max.click("#boardBtn");
  pruefe(await warteAuf(max, () => bd.anzeigen?.length === 1 && document.querySelector(".anzeige-karte")), "Board-Sheet: Abschnitt „Anzeigen“");
  const board1 = await max.evaluate(() => bd.anzeigen[0]);
  pruefe(board1.name === "Board" && board1.link.startsWith(`http://${AUSSEN}:${PORT}/anzeige?anzeige=`), `Anzeige „Board“ mit Link (${board1.link.split("&")[0]}…)`);
  await max.click('.anzeige-karte [data-aktion="anzeige-qr"]');
  pruefe(await warteAuf(max, () => document.querySelector(".anzeige-qr svg")), "QR-Code zum Abscannen");
  await max.evaluate(() => document.querySelector(".anzeige-qr").scrollIntoView({ block: "center" }));
  await max.screenshot({ path: `${DIR}/z1-anzeigen.png` });

  // ---- Anzeige „von außen“: ohne Link gesperrt, mit Link erlaubt, merkt sich den Schlüssel ----
  const tv = await seite({ width: 1280, height: 720 });
  await tv.goto(`http://${AUSSEN}:${PORT}/anzeige`);
  pruefe(await warteAuf(tv, () => document.querySelector(".a-fehler")?.textContent.includes("braucht die Anzeige ihren Anzeige-Link")),
    "Anderes Gerät ohne Link: Hinweis auf den Anzeige-Link");
  await tv.goto(board1.link);
  pruefe(await warteAuf(tv, () => document.querySelector(".a-kopf") && !document.querySelector(".a-fehler")), "Mit Anzeige-Link läuft die Anzeige");
  await tv.goto(`http://${AUSSEN}:${PORT}/anzeige`);
  pruefe(await warteAuf(tv, () => document.querySelector(".a-kopf") && !document.querySelector(".a-fehler")), "Neustart ohne Link: Schlüssel aus dem Browser");
  await tv.screenshot({ path: `${DIR}/z2-anzeige-tv.png` });

  // ---- Neue Anzeige, umbenennen ----
  await max.fill("#anzeigeNeu", "Tablet");
  await max.click('[data-aktion="anzeige-anlegen"]');
  pruefe(await warteAuf(max, () => bd.anzeigen.length === 2 && document.querySelectorAll(".anzeige-karte").length === 2), "Neue Anzeige „Tablet“");
  await max.click('.anzeige-karte:nth-child(2) [data-aktion="anzeige-umbenennen"]');
  await max.fill("#anzeigeName", "Wohnzimmer-TV");
  await max.click('[data-aktion="anzeige-name-speichern"]');
  pruefe(await warteAuf(max, () => bd.anzeigen[1].name === "Wohnzimmer-TV" && document.querySelectorAll(".anzeige-karte .card-title")[1]?.textContent === "Wohnzimmer-TV"),
    "Umbenannt in „Wohnzimmer-TV“");

  // ---- Neuer Schlüssel (zweimal tippen): verbundene Anzeige fliegt raus ----
  const knopf = '.anzeige-karte:nth-child(1) [data-aktion="anzeige-schluessel"]';
  await max.click(knopf);
  pruefe((await text(max, knopf)) === "Alte Links ungültig?" && (await max.evaluate((l) => bd.anzeigen[0].link === l, board1.link)), "Erstes Tippen fragt nach");
  await max.click(knopf);
  pruefe(await warteAuf(max, (l) => bd.anzeigen[0].link !== l, board1.link), "Neuer Schlüssel erzeugt");
  pruefe(await warteAuf(tv, () => document.querySelector(".a-fehler")?.textContent.includes("gilt nicht mehr"), null, 15000),
    "Anzeige mit altem Schlüssel: „Dieser Anzeige-Link gilt nicht mehr.“");
  await tv.screenshot({ path: `${DIR}/z3-anzeige-ungueltig.png` });
  await tv.goto(await max.evaluate(() => bd.anzeigen[0].link));
  pruefe(await warteAuf(tv, () => document.querySelector(".a-kopf") && !document.querySelector(".a-fehler")), "Mit dem neuen Link läuft sie wieder");
  await max.screenshot({ path: `${DIR}/z4-anzeigen-zwei.png` });

  // Board-Gerät selbst (localhost) braucht keinen Link
  const lokal = await seite({ width: 1280, height: 720 });
  await lokal.goto(`${BOARD}/anzeige`);
  pruefe(await warteAuf(lokal, () => document.querySelector(".a-kopf") && !document.querySelector(".a-fehler")), "localhost: Anzeige ohne Link");
} catch (f) {
  pruefe(false, `Abbruch: ${f.stack || f}`);
} finally {
  pruefe(fehler.length === 0, `keine Fehler in der Seite${fehler.length ? `: ${fehler.join(" | ")}` : ""}`);
  await browser.close();
  board.kill("SIGTERM"); await new Promise((r) => board.once("exit", r));
  rmSync(TMP, { recursive: true, force: true });
}
