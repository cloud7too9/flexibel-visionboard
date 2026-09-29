// Board-Verbindung: startet ein echtes Koordinaten-Board und verbindet die Companion
// per Kamera (Fake-Kamera zeigt den QR-Code), per Foto und von Hand.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import QRCode from "qrcode";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const TMP = mkdtempSync(path.join(tmpdir(), "board-test-"));
const BOARD_PORT = 3198, SEITE_PORT = 3196, PIN = "4711";
const BOARD = `http://127.0.0.1:${BOARD_PORT}`;
const QR_TEXT = `${BOARD}/?pin=${PIN}`;
const JSQR = path.join(HIER, "node_modules/jsqr/dist/jsQR.js");

const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Koordinaten-Board starten ------------------------------------------------
let board = null;
async function boardStarten() {
  board = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(HIER, "../../koordinaten-board/server"),
    env: { ...process.env, PORT: String(BOARD_PORT), RAUM_PIN: PIN, DATEN_ORDNER: path.join(TMP, "daten") },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    // Beendet sich sofort, wenn der Port noch belegt ist (z. B. altes Board aus einem abgebrochenen Lauf)
    if (board.exitCode !== null) throw new Error(`Board beendet sich sofort – Port ${BOARD_PORT} belegt?`);
    try { if ((await fetch(`${BOARD}/api/typen`)).ok) return; } catch {}
    await schlafen(200);
  }
  throw new Error("Board startet nicht (npm --prefix koordinaten-board/server install?)");
}
async function boardStoppen() {
  if (!board) return;
  const b = board; board = null;
  if (b.exitCode !== null || b.signalCode !== null) return;
  b.kill("SIGTERM");
  await new Promise((r) => b.once("exit", r));
}
/** Teilnehmer aus Sicht der Anzeige (nur vom Board-Gerät selbst erlaubt) */
function teilnehmerImRaum() {
  return new Promise((ok, fehler) => {
    const ws = new WebSocket(`ws://127.0.0.1:${BOARD_PORT}/ws?rolle=anzeige`);
    ws.onmessage = (e) => { const n = JSON.parse(e.data); if (n.art === "teilnehmer") { ws.close(); ok(n.namen); } };
    ws.onerror = () => fehler(new Error("Anzeige-WS"));
  });
}

// --- Companion über http://localhost ausliefern (sicherer Kontext → Kamera erlaubt) ---
const seite = createServer((req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(readFileSync(path.join(HIER, "../companion-prototyp.html")));
}).listen(SEITE_PORT);
const URL_SEITE = `http://localhost:${SEITE_PORT}/`;

// --- QR-Code als Foto (PNG) und als Kamerabild (Y4M für Chromiums Fake-Kamera) ---
const QR_PNG = path.join(TMP, "qr.png");
await QRCode.toFile(QR_PNG, QR_TEXT, { margin: 4, scale: 8 });
const Y4M = path.join(TMP, "qr.y4m");
{
  const W = 640, H = 480, qr = QRCode.create(QR_TEXT, { errorCorrectionLevel: "M" }).modules;
  const zelle = Math.floor(300 / (qr.size + 8)), breite = zelle * (qr.size + 8);
  const x0 = (W - breite) / 2 | 0, y0 = (H - breite) / 2 | 0;
  const y = Buffer.alloc(W * H, 90); // graue Umgebung wie ein Zimmer
  for (let py = 0; py < breite; py++) for (let px = 0; px < breite; px++) {
    const r = Math.floor(py / zelle) - 4, c = Math.floor(px / zelle) - 4;
    const dunkel = r >= 0 && c >= 0 && r < qr.size && c < qr.size && qr.get(r, c);
    y[(y0 + py) * W + x0 + px] = dunkel ? 20 : 235;
  }
  const uv = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const bild = Buffer.concat([Buffer.from("FRAME\n"), y, uv]);
  writeFileSync(Y4M, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), bild, bild]));
}

async function browserOeffnen(mitKamera) {
  const args = mitKamera
    ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${Y4M}`]
    : [];
  const browser = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  // jsQR kommt sonst vom CDN – im Test aus node_modules
  await ctx.route("https://cdn.jsdelivr.net/npm/jsqr@*/**", (r) => r.fulfill({ path: JSQR, contentType: "application/javascript" }));
  // Wie auf dem iPhone: kein BarcodeDetector → jsQR-Weg
  await ctx.addInitScript(() => { delete window.BarcodeDetector; });
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  // Absichtlich nicht erreichbare Boards erzeugen Netzwerk-Meldungen – die zählen nicht
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_CONNECTION_REFUSED|WebSocket connection|401|Failed to load resource/.test(m.text())) fehler.push(m.text()); });
  return { browser, p, fehler };
}
const text = (p, sel) => p.$eval(sel, (e) => e.textContent.replace(/\s+/g, " ").trim());
const knopfText = (p) => text(p, "#boardBtn");
/** Wie am Handy: Sidebar auf, dann „Board“ antippen */
const boardAntippen = async (p) => { await p.click("#burgerBtn"); await p.waitForTimeout(350); await p.click("#boardBtn"); };
const zeilenLesen = (p) => p.$$eval(".board-zeile", (l) => l.map((z) => `${z.children[0].textContent}=${z.children[1].textContent}`).join(" | "));
const warteAuf = async (p, fn, arg, ms = 12000) => { try { await p.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; } };

try {
  await boardStarten();

  // === 1 · Kamera ================================================================
  {
    const { browser, p, fehler } = await browserOeffnen(true);
    await p.goto(URL_SEITE);
    await p.waitForTimeout(700);
    pruefe((await knopfText(p)).includes("Nicht verbunden"), "Sidebar: Board nicht verbunden");
    await p.click("#burgerBtn"); await p.waitForTimeout(400);
    await p.screenshot({ path: `${DIR}/v1-sidebar.png` });
    await p.click("#boardBtn");
    pruefe(await p.$("#boardScanner") !== null, "Sheet mit Scanner geöffnet");
    pruefe(await p.$eval("#boardName", (e) => e.value) === "Max", "Name im DEMO vorbelegt (Max)");
    // Name gesetzt → nach dem Erkennen tritt die Companion sofort bei
    const verbunden = await warteAuf(p, () => document.querySelector("#boardBtn")?.textContent.includes("Verbunden ·"));
    pruefe(verbunden, "QR-Code per Kamera erkannt und beigetreten");
    await p.waitForTimeout(500);
    console.log("     Knopf:", await knopfText(p));
    pruefe((await knopfText(p)).includes("127.0.0.1:3198"), "Sidebar zeigt die Board-Adresse");
    const zeilen = await zeilenLesen(p);
    console.log("     Sheet:", zeilen);
    pruefe(zeilen === "Angemeldet als=Max | Im Raum=Max | Orte auf dem Board=0", "Sheet: angemeldet als Max, im Raum, 0 Orte");
    pruefe((await teilnehmerImRaum()).includes("Max"), "Anzeige des Boards sieht Max im Raum");
    const ls = await p.evaluate(() => JSON.parse(localStorage.getItem("board.verbindung")));
    pruefe(ls?.adresse === BOARD && typeof ls?.token === "string", "Verbindung auf dem Gerät gemerkt");
    pruefe(await p.evaluate(() => typeof window.jsQR === "function"), "Erkennung lief über jsQR (wie am iPhone)");
    await p.screenshot({ path: `${DIR}/v2-verbunden.png` });

    // Neu laden → verbindet von selbst wieder
    await p.reload(); await p.waitForTimeout(300);
    pruefe(await warteAuf(p, () => document.querySelector("#boardBtn")?.textContent.includes("Verbunden ·")), "Nach Neuladen wieder verbunden");

    // Board neu starten → Companion verbindet neu (Token bleibt gültig)
    await boardStoppen();
    pruefe(await warteAuf(p, () => document.querySelector("#boardBtn")?.textContent.includes("Getrennt")), "Board aus → Getrennt");
    await p.screenshot({ path: `${DIR}/v3-getrennt.png` });
    await boardStarten();
    pruefe(await warteAuf(p, () => document.querySelector("#boardBtn")?.textContent.includes("Verbunden ·"), null, 15000), "Board wieder da → neu verbunden");

    // Trennen
    await boardAntippen(p); await p.waitForTimeout(300);
    await p.click('[data-aktion="board-trennen"]'); await p.waitForTimeout(400);
    pruefe((await knopfText(p)).includes("Nicht verbunden"), "Trennen → nicht verbunden");
    pruefe(await p.evaluate(() => localStorage.getItem("board.verbindung")) === null, "Verbindung auf dem Gerät vergessen");
    await p.waitForTimeout(600);
    pruefe(!(await teilnehmerImRaum()).includes("Max"), "Board: Max nicht mehr im Raum");

    // Beim Schließen des Sheets geht die Kamera aus
    await boardAntippen(p);
    await warteAuf(p, () => document.getElementById("boardVideo")?.srcObject, null, 5000);
    await p.waitForTimeout(150);
    await p.screenshot({ path: `${DIR}/v7-scanner.png` });
    await p.click('[data-aktion="schliessen"]'); await p.waitForTimeout(200);
    pruefe(await p.evaluate(() => (document.getElementById("boardVideo")?.srcObject?.getTracks() || []).every((t) => t.readyState === "ended")), "Sheet zu → Kamera aus");

    pruefe(fehler.length === 0, "Keine JS-Fehler (Kamera)" + (fehler.length ? ": " + fehler.join(" | ") : ""));
    await browser.close();
  }

  // === 2 · Ohne Kamera: Foto und von Hand =========================================
  {
    const { browser, p, fehler } = await browserOeffnen(false);
    await p.goto(URL_SEITE);
    await p.waitForTimeout(600);
    await boardAntippen(p);
    pruefe(await warteAuf(p, () => document.getElementById("boardScanner")?.classList.contains("aus"), null, 5000), "Ohne Kamera: Scanner zeigt Hinweis");
    console.log("     Hinweis:", await text(p, "#boardScanText"));
    await p.screenshot({ path: `${DIR}/v4-ohne-kamera.png` });

    // Foto – Name leer → Felder füllen, aber noch nicht beitreten
    await p.fill("#boardName", "");
    await p.setInputFiles("#boardFoto", QR_PNG);
    pruefe(await warteAuf(p, () => document.getElementById("boardPin")?.value === "4711"), "Foto: Adresse und PIN erkannt");
    pruefe(await p.$eval("#boardAdresse", (e) => e.value) === "127.0.0.1:3198", "Foto: Adresse eingetragen");
    pruefe((await knopfText(p)).includes("Nicht verbunden"), "Ohne Name noch nicht beigetreten");
    await p.click('[data-aktion="board-beitreten"]'); await p.waitForTimeout(200);
    pruefe((await text(p, "#boardBanner")).includes("Wie heißt du"), "Ohne Name → Hinweis");

    // Falsche PIN
    await p.fill("#boardName", "Lena");
    await p.fill("#boardPin", "1111");
    await p.click('[data-aktion="board-beitreten"]');
    pruefe(await warteAuf(p, () => document.getElementById("boardBanner")?.textContent.includes("Falsche PIN")), "Falsche PIN → Fehlermeldung vom Board");

    // Nicht erreichbar
    await p.fill("#boardAdresse", "127.0.0.1:3197");
    await p.fill("#boardPin", PIN);
    await p.click('[data-aktion="board-beitreten"]');
    pruefe(await warteAuf(p, () => document.getElementById("boardBanner")?.textContent.includes("nicht erreichbar")), "Falsche Adresse → nicht erreichbar");
    await p.screenshot({ path: `${DIR}/v5-fehler.png` });

    // Ganze Beitritts-Adresse einfügen → wird aufgeteilt, dann beitreten
    await p.fill("#boardPin", "");
    await p.fill("#boardAdresse", QR_TEXT);
    await p.waitForTimeout(100);
    pruefe(await p.$eval("#boardAdresse", (e) => e.value) === "127.0.0.1:3198" && await p.$eval("#boardPin", (e) => e.value) === PIN, "Eingefügte Adresse mit ?pin= aufgeteilt");
    await p.click('[data-aktion="board-beitreten"]');
    pruefe(await warteAuf(p, () => document.querySelector("#boardBtn")?.textContent.includes("Verbunden ·")), "Von Hand beigetreten");
    await p.waitForTimeout(400);
    pruefe((await zeilenLesen(p)).startsWith("Angemeldet als=Lena"), "Angemeldet als Lena");
    pruefe(await p.evaluate(() => JSON.parse(localStorage.getItem("board.name"))) === "Lena", "Name für nächstes Mal gemerkt");
    await p.screenshot({ path: `${DIR}/v6-von-hand.png` });

    // Die übrigen Bereiche laufen weiter
    await p.click('[data-aktion="schliessen"]');
    await p.click("#burgerBtn"); await p.waitForTimeout(300);
    await p.click('.nav-item[data-module="portale"]'); await p.waitForTimeout(400);
    pruefe(await text(p, "#kopfTitel") === "Portal-Verwaltung", "Bereichswechsel weiter ok");

    pruefe(fehler.length === 0, "Keine JS-Fehler (ohne Kamera)" + (fehler.length ? ": " + fehler.join(" | ") : ""));
    await browser.close();
  }
} catch (e) {
  pruefe(false, "Abbruch: " + e.message);
} finally {
  await boardStoppen();
  seite.close();
  rmSync(TMP, { recursive: true, force: true });
}
