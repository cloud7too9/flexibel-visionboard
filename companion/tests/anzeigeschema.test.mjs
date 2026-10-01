// Anzeigeschema: Jeder Inhalt der Companion lässt sich aufs Board werfen.
// Für alle DEMO-Inhalte wird die Karte gebaut und mit der Prüfung des Boards (zeigen.js)
// kontrolliert; je Schema landet eine Karte auf einer echten Anzeige (Screenshot).
// Die Companion läuft über http (DEMO-Mock), damit das Rüstungs-Set seine 3D-Figur mitschickt.
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { companionAusliefern, threeUmleiten, CHROMIUM_OPTIONEN } from "./hilfen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const BOARD_ORDNER = path.join(HIER, "../../koordinaten-board");
const { kartePruefen } = await import(pathToFileURL(path.join(BOARD_ORDNER, "server/src/zeigen.js")).href);
const TMP = mkdtempSync(path.join(tmpdir(), "schema-test-"));
const PORT = 3194, PIN = "4711", BOARD = `http://127.0.0.1:${PORT}`;
if (!existsSync(path.join(BOARD_ORDNER, "client/dist/index.html"))) {
  console.log("FEHL Board-Client nicht gebaut: npm --prefix ../../koordinaten-board run build");
  process.exit(1);
}
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));

const board = spawn(process.execPath, ["src/server.js"], {
  cwd: path.join(BOARD_ORDNER, "server"),
  env: { ...process.env, PORT: String(PORT), RAUM_PIN: PIN, DATEN_ORDNER: path.join(TMP, "daten") },
  stdio: "ignore",
});
const companion = await companionAusliefern(3193);
const browser = await chromium.launch(CHROMIUM_OPTIONEN);
try {
  for (let i = 0; i < 60 && !(await fetch(`${BOARD}/api/server`).then((r) => r.ok, () => false)); i++) await schlafen(200);
  const { token } = await (await fetch(`${BOARD}/api/beitreten`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin: PIN, name: "Max", kontoPin: "2468" }) })).json();

  // Companion im DEMO-Modus (über http), mit dem echten Board verbunden
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await threeUmleiten(p);
  await p.goto(`${companion.adresse}/companion-prototyp.html?demo=1`);
  await p.waitForFunction(() => typeof st !== "undefined" && st.weltId && pt.liste.length);
  await p.evaluate(() => Promise.all([bannerLaden(), ruestungLaden()]));
  await p.evaluate(([adresse, t]) => { bd.verbindung = { adresse, token: t, name: "Max" }; boardVerbinden(); }, [BOARD, token]);
  await p.waitForFunction(() => bd.status === "verbunden");

  // ---- Alle Inhalte → Karten → Prüfung des Boards -----------------------------------
  const karten = await p.evaluate(async () => {
    const ids = { ort: st.instanzen.map((i) => i.id), sammel: SAMMELOBJEKTE.map((o) => o.id), sammelstand: [""],
                  portal: pt.liste.map((v) => v.id), banner: bn.liste.map((b) => b.id), ruestung: rs.sets.map((x) => x.id),
                  sammelliste: [""], portalliste: [""], welt: [""] };
    const liste = [];   // karte() darf async sein – nacheinander bauen
    for (const [art, s] of Object.entries(BOARD_KARTEN)) {
      const k = [];
      for (const id of ids[art]) k.push(await s.karte(boardKontext(), id));
      liste.push([art, { titel: s.titel, karten: k }]);
    }
    return Object.fromEntries(liste);
  });
  pruefe(Object.keys(karten).join(",") === "ort,sammel,sammelstand,portal,banner,ruestung,sammelliste,portalliste,welt", `Anzeigeschemas: ${Object.values(karten).map((k) => k.titel).join(", ")}`);
  for (const [art, { karten: liste }] of Object.entries(karten)) {
    const fehlerhaft = liste.map((k) => [k, kartePruefen(k)]).filter(([k, r]) => !k || r.fehler);
    pruefe(liste.length > 0 && fehlerhaft.length === 0,
      `${art}: ${liste.length} Karten vom Board angenommen${fehlerhaft.length ? " – " + fehlerhaft.map(([k, r]) => `${k?.titel}: ${r.fehler}`).join("; ") : ""}`);
  }
  const rippen = karten.sammel.karten.find((k) => k.quelle === "sammel:rib");
  pruefe(rippen.typ === "Nether Fortress" && rippen.dimension === "nether" && rippen.bloecke.some((b) => b.art === "koordinaten"), "Sammelobjekt: Kennblock-Typ, Dimension, nächster Fundort");
  const banner = karten.banner.karten[0];
  pruefe(banner.bloecke[0].art === "bild" && banner.bloecke[0].daten.startsWith("data:image/png;base64,") && banner.bloecke[0].pixelig, "Banner: Vorschau als PNG-Bild (pixelig)");
  const portal = karten.portal.karten[0];
  pruefe(portal.bloecke.filter((b) => b.art === "koordinaten").map((b) => b.dimension).join() === "oberwelt,nether", "Portal: beide Portale mit Dimension");
  pruefe(karten.sammelstand.karten[0].bloecke[0].zeilen[0].wert === "5 von 18", "Sammel-Stand: 5 von 18 gefunden");
  pruefe(karten.ruestung.karten.every((k) => k.bloecke[0].art === "bild" && k.bloecke[1].zeilen.length >= 3), "Rüstung: jedes Set mit Figur-Bild und Zeilen je Teil");

  // ---- Knöpfe „Aufs Board“ in allen Details, echte Anzeige je Schema -----------------
  const anzeige = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await anzeige.goto(`${BOARD}/anzeige`);
  await anzeige.waitForSelector(".anzeige");
  const zeigen = async (oeffnen, name) => {
    await p.evaluate(oeffnen); await p.waitForTimeout(350);
    const knopf = await p.$("#orteSheetInhalt .board-zeigen");
    pruefe(knopf !== null && (await knopf.textContent()).includes("Aufs Board"), `${name}: Knopf „Aufs Board“`);
    await knopf.click();
    const titel = await p.evaluate(() => bd.offen.size === 0);   // gesendet
    await anzeige.waitForSelector(".g-karte h2"); await anzeige.waitForTimeout(700);
    return titel;
  };
  await p.evaluate(() => modulWechseln("sammelobjekte"));
  await zeigen(() => samDetailOeffnen("rib"), "Sammelobjekt");
  pruefe(await anzeige.$eval(".g-karte h2", (e) => e.textContent) === "Rippenzier", "Anzeige: Rippenzier");
  pruefe(await anzeige.$eval(".g-kennblock img", (i) => i.getAttribute("src").endsWith("fortress.png") && i.naturalWidth > 0), "Anzeige: Kennblock der Netherfestung");
  await anzeige.screenshot({ path: `${DIR}/a1-sammelobjekt.png` });

  await p.click('#orteSheetInhalt [data-aktion="schliessen"]'); await p.waitForTimeout(250);
  const fuss = await p.$("#samFuss .sam-board");
  pruefe(fuss !== null, "Sammelobjekte: Bottom-Bar „Aufs Board“ für den Fortschritt");
  await fuss.click();
  pruefe(await anzeige.waitForFunction(() => document.querySelector(".g-karte h2")?.textContent === "Rüstungsbesätze").then(() => true, () => false), "Anzeige: Sammel-Fortschritt");
  await anzeige.waitForTimeout(700);
  pruefe(await p.waitForFunction(() => document.querySelector("#samFuss .sam-board")?.classList.contains("aktiv")).then(() => true, () => false), "Bottom-Bar zeigt „Liegt auf dem Board“");
  await anzeige.screenshot({ path: `${DIR}/a2-sammelstand.png` });
  await p.screenshot({ path: `${DIR}/a2b-sammel-fuss.png` });

  await p.evaluate(() => modulWechseln("portale"));
  await zeigen(() => portalDetailOeffnen(pt.liste.find((v) => v.name === "Eisenfarm").id), "Portal-Verbindung");
  pruefe(await anzeige.$eval(".g-karte", (e) => e.classList.contains("thema-nether") && e.querySelectorAll(".g-koord").length === 2), "Anzeige: Portal mit zwei Koordinaten im Nether-Theme");
  await anzeige.screenshot({ path: `${DIR}/a3-portal.png` });

  await p.evaluate(() => modulWechseln("banner"));
  await zeigen(() => bannerDetailOeffnen(bn.liste[0].id), "Banner");
  pruefe(await anzeige.$eval(".g-bild img", (i) => i.naturalWidth === 20 && i.naturalHeight === 40 && getComputedStyle(i).imageRendering === "pixelated"), "Anzeige: Banner 20×40 pixelgenau vergrößert");
  const lage = await anzeige.evaluate(() => { const k = document.querySelector(".g-karte").getBoundingClientRect(); return k.bottom <= innerHeight; });
  pruefe(lage, "Anzeige: Banner-Karte vollständig sichtbar");
  await anzeige.screenshot({ path: `${DIR}/a4-banner.png` });

  await p.evaluate(() => modulWechseln("ruestung"));
  await zeigen(() => ruestungDetailOeffnen("r_2"), "Rüstungs-Set");
  pruefe(await anzeige.waitForFunction(() => document.querySelector(".g-karte h2")?.textContent === "Umbreon").then(() => true, () => false), "Anzeige: Rüstungs-Set Umbreon");
  pruefe(await anzeige.$eval(".g-bild img", (i) => i.naturalWidth >= 300 && i.complete), "Anzeige: 3D-Figur als Bild");
  pruefe(await anzeige.$eval(".g-karte", (e) => e.textContent.includes("Hüterzier (Pfadruinen)")), "Anzeige: fehlender Besatz mit Fundort");
  await anzeige.screenshot({ path: `${DIR}/a5-ruestung.png` });

  pruefe(fehler.length === 0, `keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);
} catch (e) {
  pruefe(false, "Abbruch: " + e.message);
} finally {
  await browser.close();
  await companion.schliessen();
  board.kill("SIGTERM");
  await new Promise((r) => board.once("exit", r));
  rmSync(TMP, { recursive: true, force: true });
}
