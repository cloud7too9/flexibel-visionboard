// Board-Verbindung: startet ein echtes Koordinaten-Board und verbindet die Companion
// per Kamera (Fake-Kamera zeigt den QR-Code), per Foto und von Hand.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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
// Die Anzeige braucht den gebauten Board-Client
if (!existsSync(path.join(HIER, "../../koordinaten-board/client/dist/index.html"))) {
  console.log("FEHL Board-Client nicht gebaut: npm --prefix ../../koordinaten-board run installieren && npm --prefix ../../koordinaten-board run build");
  process.exit(1);
}

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
// Ausgeliefert werden die Seite, regeln.js und icons/ – alles andere ist die Seite selbst
const COMPANION = path.join(HIER, "..");
const TYPEN = { ".js": "text/javascript; charset=utf-8", ".png": "image/png" };
const seite = createServer((req, res) => {
  const pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const datei = path.join(COMPANION, pfad);
  if (pfad !== "/" && datei.startsWith(COMPANION + path.sep) && existsSync(datei) && TYPEN[path.extname(datei)]) {
    res.setHeader("content-type", TYPEN[path.extname(datei)]);
    return res.end(readFileSync(datei));
  }
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(readFileSync(path.join(COMPANION, "companion-prototyp.html")));
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
    pruefe((await text(p, "#orteSheetInhalt")).includes("Gerade liegt nichts auf dem Board"), "Board-Sheet: nichts auf der Anzeige");

    // === Aufs Board: Ort auf die Anzeige werfen ===================================
    // Tim ist mit dem Handy am Board und hat schon Orte eingetragen
    const tim = await (await fetch(`${BOARD}/api/beitreten`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin: PIN, name: "Tim" }) })).json();
    const timWs = new WebSocket(`ws://127.0.0.1:${BOARD_PORT}/ws?token=${encodeURIComponent(tim.token)}`);
    const antworten = [];
    timWs.onmessage = (e) => { const n = JSON.parse(e.data); if (n.anfrage) antworten.push(n); };
    await new Promise((r) => { timWs.onopen = r; });
    for (const [name, x, y, z, dimension, kategorie, typ] of [["Hauptbasis", 212, 71, -388, "oberwelt", "basis"], ["Dorf am See", 1040, 64, 310, "oberwelt", "dorf", "Village"],
      ["Festung", 180, 70, -95, "nether", "struktur", "Nether Fortress"], ["End-Stadt", 1300, 60, -820, "ende", "struktur", "End City"]]) {
      timWs.send(JSON.stringify({ art: "hinzufuegen", ort: { name, x, y, z, dimension, kategorie, typ } }));
    }
    await schlafen(300);
    const anzeige = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await anzeige.goto(`${BOARD}/anzeige`);
    await anzeige.waitForSelector(".anzeige");
    pruefe(await anzeige.$(".a-gezeigt") === null, "Anzeige: noch keine Karte");

    // Kennblöcke: Strukturen mit Bild zeigen es, alle anderen das Linien-Icon der Kategorie
    const iconsLesen = (seite, sel) => seite.$$eval(sel, (l) => l.map((z) => {
      const img = z.querySelector(".ort-icon img.kennblock");
      return `${z.querySelector(".name > span, .ort-name > span").textContent.trim()}=${img ? (img.naturalWidth ? img.getAttribute("src").split("/").pop() : "lädt nicht") : "Linie"}`;
    }).sort().join(", "));
    await anzeige.waitForFunction(() => [...document.querySelectorAll("img.kennblock")].every((i) => i.complete));
    const anzeigeIcons = await iconsLesen(anzeige, ".a-zeile");
    console.log("     Anzeige-Icons:", anzeigeIcons);
    pruefe(anzeigeIcons === "Dorf am See=Linie, End-Stadt=end_city.png, Festung=fortress.png, Hauptbasis=Linie", "Anzeige: Kennblöcke bei Netherfestung und Endsiedlung, sonst Linien-Icon");
    await anzeige.screenshot({ path: `${DIR}/v7b-anzeige-kennbloecke.png` });

    // Handy-Steuerung des Boards (als Tim): Liste und Ort-Detail
    const handy = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await handy.addInitScript(([t]) => { localStorage.setItem("kb-sitzung", JSON.stringify({ token: t, name: "Tim" })); localStorage.setItem("kb-dimension", JSON.stringify("nether")); }, [tim.token]);
    await handy.goto(`${BOARD}/`);
    await handy.waitForSelector(".ort");
    await handy.waitForFunction(() => [...document.querySelectorAll("img.kennblock")].every((i) => i.complete));
    pruefe(await iconsLesen(handy, ".ort") === "Festung=fortress.png", "Steuerung Nether: Festung mit Kennblock");
    await handy.click(".ort"); await handy.waitForSelector(".sheet-kopf-bild img.kennblock");
    pruefe(await handy.$eval(".sheet-kopf-bild img.kennblock", (i) => i.complete && i.naturalWidth > 0), "Steuerung: Ort-Detail mit Kennblock im Kopf");
    await handy.screenshot({ path: `${DIR}/v7c-steuerung-detail.png` });
    await handy.close();

    await p.click('[data-aktion="schliessen"]'); await p.waitForTimeout(250);
    await p.click('#orteAnsicht [data-ansicht="liste"]'); await p.waitForTimeout(300);
    await p.click(".ort-zeile"); await p.waitForTimeout(350);
    const ortTitel = await text(p, ".sheet-kopf h2");
    const ortX = await p.$eval(".result-coords b", (e) => e.textContent);
    pruefe(await text(p, ".board-zeigen") === "Aufs Board", `Detail „${ortTitel}“: Knopf „Aufs Board“`);
    await p.click(".board-zeigen");
    pruefe(await warteAuf(anzeige, () => document.querySelector(".g-karte h2")), "Anzeige zeigt die Karte");
    await anzeige.waitForTimeout(600);  // Einblenden abwarten
    pruefe(await text(anzeige, ".g-karte h2") === ortTitel, `Anzeige: Titel „${ortTitel}“`);
    const achsen = await anzeige.$$eval(".g-koord", (l) => l.map((k) => k.textContent.replace(/\s+/g, " ").trim()));
    console.log("     Anzeige:", await text(anzeige, ".g-kopf"), "|", achsen.join(" | "));
    pruefe(achsen[0].includes("X" + ortX), "Anzeige: X-Koordinate wie in der Companion");
    pruefe(achsen.length === 2 && /^Im Nether|^In der Oberwelt/.test(achsen[1]), "Anzeige: umgerechnete Koordinaten");
    pruefe((await text(anzeige, ".g-von")).startsWith("Lena"), "Anzeige: von Lena");
    pruefe(await warteAuf(p, () => document.querySelector(".board-zeigen")?.classList.contains("aktiv")), "Detail: Knopf zeigt „Liegt auf dem Board“");
    const lage = await anzeige.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const karte = r(".g-karte"), seite = r(".a-seite"), gez = r(".a-gezeigt");
      return { seiteRechts: seite.left > gez.right - 1, karteGanz: karte.top >= gez.top && karte.bottom <= gez.bottom + 1 && karte.bottom <= innerHeight };
    });
    pruefe(lage.seiteRechts, "Anzeige: Seitenleiste mit QR-Code bleibt rechts frei");
    pruefe(lage.karteGanz, "Anzeige: Karte vollständig sichtbar");
    await anzeige.screenshot({ path: `${DIR}/v8-anzeige-ort.png` });
    await p.screenshot({ path: `${DIR}/v9-detail-aufs-board.png` });

    // Neu geladene Anzeige bekommt die Karte sofort
    await anzeige.reload();
    pruefe(await warteAuf(anzeige, () => document.querySelector(".g-karte h2")), "Anzeige nach Neuladen: Karte wieder da");

    // Tim wirft etwas Neues – Zeilen und Text, im Nether
    timWs.send(JSON.stringify({ art: "zeigen", anfrage: 1, karte: { titel: "<b>Eisenfarm</b>", unter: "Portal-Verbindung", bereich: "Portale", dimension: "nether",
      bloecke: [{ art: "zeilen", zeilen: [{ label: "Status", wert: "Einseitig" }, { label: "Abstand", wert: "34 Blöcke" }] }, { art: "text", text: "Nether-Portal genau bei X 37 · Y 80 · Z −53 bauen." }] } }));
    timWs.send(JSON.stringify({ art: "zeigen", anfrage: 2, karte: { titel: "Kaputt", bloecke: [{ art: "html", inhalt: "<script>" }] } }));
    await schlafen(500);
    pruefe(antworten.some((n) => n.anfrage === 1 && n.art === "ok"), "Tim: Karte angenommen");
    pruefe(antworten.some((n) => n.anfrage === 2 && n.art === "fehler" && n.text === "Unbekannter Block"), "Tim: ungültige Karte abgelehnt");
    pruefe(await warteAuf(anzeige, () => document.querySelector(".g-karte h2")?.textContent === "<b>Eisenfarm</b>"), "Anzeige: neue Karte ersetzt die alte, HTML bleibt Text");
    await anzeige.waitForTimeout(600);
    pruefe(await anzeige.$eval(".g-karte", (e) => e.classList.contains("thema-nether")), "Anzeige: Karte im Nether-Theme");
    pruefe((await anzeige.$$eval(".g-zeile", (l) => l.map((z) => z.textContent).join(" | "))) === "StatusEinseitig | Abstand34 Blöcke", "Anzeige: Zeilen");
    pruefe((await text(anzeige, ".g-text")).startsWith("Nether-Portal genau"), "Anzeige: Text");
    await anzeige.screenshot({ path: `${DIR}/v10-anzeige-zeilen.png` });
    pruefe(await warteAuf(p, () => !document.querySelector(".board-zeigen")?.classList.contains("aktiv")), "Detail: Knopf wieder „Aufs Board“");

    // Wegnehmen über das Board-Sheet
    await p.click('[data-aktion="schliessen"]'); await p.waitForTimeout(250);
    await boardAntippen(p); await p.waitForTimeout(300);
    const auf = await text(p, ".board-gezeigt");
    pruefe(auf.includes("<b>Eisenfarm</b>") && auf.includes("von Tim"), "Board-Sheet: zeigt Tims Karte");
    await p.screenshot({ path: `${DIR}/v11-sheet-gezeigt.png` });
    await p.click('[data-aktion="board-wegnehmen"]');
    pruefe(await warteAuf(anzeige, () => !document.querySelector(".a-gezeigt")), "Wegnehmen → Anzeige wieder frei");
    pruefe(await warteAuf(p, () => document.getElementById("orteSheetInhalt")?.textContent.includes("Gerade liegt nichts")), "Board-Sheet: wieder leer");

    // Struktur aufs Board → die Anzeige zeigt den Kennblock neben dem Titel
    await p.evaluate(() => detailOeffnen(st.instanzen.find((i) => typVon(i).kategorie === "Stronghold").id)); await p.waitForTimeout(350);
    await p.click(".board-zeigen");
    pruefe(await warteAuf(anzeige, () => document.querySelector(".g-kennblock img.kennblock")?.naturalWidth > 0), "Anzeige: Stronghold mit Kennblock neben dem Titel");
    await anzeige.waitForTimeout(600);
    pruefe(await anzeige.$eval(".g-kennblock img", (i) => i.getAttribute("src")) === "/icons/struktur_kennbloecke/stronghold.png", "Anzeige: Kennblock stronghold.png");
    pruefe(await anzeige.evaluate(() => { const k = document.querySelector(".g-karte").getBoundingClientRect(); return k.bottom <= innerHeight; }), "Anzeige: Karte mit Kennblock vollständig sichtbar");
    await anzeige.screenshot({ path: `${DIR}/v12-anzeige-kennblock.png` });
    await p.evaluate(() => boardWegnehmen());
    pruefe(await warteAuf(anzeige, () => !document.querySelector(".a-gezeigt")), "Stronghold wieder vom Board genommen");
    timWs.close();
    await anzeige.close();

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
