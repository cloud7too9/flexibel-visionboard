// Rüstung: Sets am Schmiedetisch, 3D-Figur aus dem Rüstungs-Baukasten, Besätze der Welt.
// Über http (DEMO-Mock, ?demo=1), weil Umfärben und 3D Canvas-Pixel brauchen – als Datei
// zeigt die Companion nur die Icons. three.js kommt sonst vom CDN, hier aus node_modules.
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { companionAusliefern, threeUmleiten, CHROMIUM_OPTIONEN } from "./hilfen.mjs";

const HIER = fileURLToPath(new URL(".", import.meta.url));
const DIR = path.join(HIER, "bilder");
mkdirSync(DIR, { recursive: true });
const { kartePruefen } = await import(pathToFileURL(path.join(HIER, "../../koordinaten-board/server/src/zeigen.js")).href);
const pruefe = (ok, text) => { console.log((ok ? "OK   " : "FEHL ") + text); if (!ok) process.exitCode = 1; };

const server = await companionAusliefern(3192);
const browser = await chromium.launch(CHROMIUM_OPTIONEN);
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await threeUmleiten(p);
  await p.goto(`${server.adresse}/companion-prototyp.html?demo=1`);
  await p.waitForFunction(() => typeof st !== "undefined" && st.weltId && sam.weltId);
  const bild = (name) => p.screenshot({ path: path.join(DIR, `ruestung-${name}.png`) });
  const sheetScrollen = async (y) => { await p.evaluate((y) => { $sheet.scrollTop = y; }, y); await p.waitForTimeout(250); };
  const alleIconsGeladen = async (wurzel) => {
    await p.waitForFunction((w) => [...document.querySelectorAll(`${w} img.item-bild`)].every((i) => i.complete), wurzel, { timeout: 5000 }).catch(() => {});
    return p.$$eval(`${wurzel} img.item-bild`, (l) => l.length > 0 && l.every((i) => i.naturalWidth === 16));
  };

  // ---- Sammelobjekte: Bedrock-Namen und Schmiedevorlagen als Icons -----------------
  await p.evaluate(() => modulWechseln("sammelobjekte"));
  await p.waitForTimeout(400);
  const namen = await p.$$eval("#samListe .ach-name", (l) => l.map((e) => e.firstChild.textContent.trim()));
  pruefe(namen.includes("Wächterzier") && namen.includes("Mündelzier") && namen.includes("Wilde Zier") && !namen.includes("Wachen"), `Sammelobjekte mit Bedrock-Namen: ${namen.slice(0, 4).join(", ")} …`);
  pruefe(await p.$eval('[data-sam="sentry"] .ach-name .en', (e) => e.textContent) === "Sentry", "Englischer Name klein daneben");
  pruefe(await alleIconsGeladen("#samListe") && (await p.$$("#samListe img.item-bild")).length === 19, "19 Schmiedevorlagen als Icons geladen");
  pruefe((await p.getAttribute('[data-sam="netherite"] img.item-bild', "src")).endsWith("vorlagen/netherite_upgrade_smithing_template.png"), "Netheritaufwertung: eigene Vorlage");
  await bild("sammelobjekte");
  await p.evaluate(() => samDetailOeffnen("ward"));
  await p.waitForTimeout(400);
  pruefe(await p.$eval("#orteSheetInhalt .sheet-kopf-bild img", (i) => i.naturalWidth === 16 && i.src.endsWith("ward_armor_trim_smithing_template.png")), "Detail: Vorlage im Kopf");
  await bild("sammelobjekt-detail");
  await p.evaluate(() => alleSchliessen());

  // ---- Liste: Sets für alle Welten, Besätze der Welt -----------------------------
  await p.evaluate(() => modulWechseln("ruestung"));
  await p.waitForFunction(() => rs.geladen);
  const karten = await p.$$eval(".ruestung-karte", (l) => l.map((k) => [k.querySelector(".card-title").textContent, k.querySelector(".pill")?.textContent.trim()]));
  pruefe(JSON.stringify(karten) === JSON.stringify([["Amethyst-Netherit", "0/3 gefunden"], ["Umbreon", "2/3 gefunden"], ["Taucher", "0/2 gefunden"]]),
    `Liste: ${karten.map((k) => k.join(" ")).join(" | ")}`);
  pruefe(await alleIconsGeladen("#ruestungListe"), "Alle Rüstungs-Icons geladen (fertig/items)");
  const icons = await p.$$eval('[data-set="r_3"] .chip-ruestung img', (l) => l.map((i) => i.src.split("/").pop()));
  pruefe(icons.join() === "turtle_helmet.png,leather_chestplate_cyan.png,leather_leggings_blue.png,empty_armor_slot_boots.png",
    `Rüstungsteile als Grundform (ohne Besatz, Leder in seiner Farbe): ${icons.join(", ")}`);
  const umbreonTeile = await p.$$eval('[data-set="r_2"] .chip-ruestung img', (l) => l.map((i) => i.src.split("/").pop()));
  pruefe(umbreonTeile.join() === "netherite_helmet.png,netherite_chestplate.png,netherite_leggings.png,netherite_boots.png", "Umbreon: Netherit-Teile als Grundform");
  pruefe((await p.$$("#ruestungListe .glanz-schicht, #ruestungListe .glanz")).length === 0, "keine Verzauberung mehr: kein Schimmer in der Liste");

  // Karte: je Teil Rüstungsteil · Ziervorlage · Rohstoff
  const chips = (set) => p.$$eval(`[data-set="${set}"] .teil-chip`, (l) => l.map((c) => ({
    leer: c.classList.contains("leer"),
    vorlage: c.querySelector(".chip-vorlage img")?.src.split("/").pop().replace("_armor_trim_smithing_template.png", "") || null,
    status: ["gefunden", "fehlt", "frei"].find((k) => c.querySelector(".chip-vorlage").classList.contains(k)),
    rohstoff: c.querySelector(".chip-rohstoff img")?.src.split("/").pop() || null,
  })));
  const umbreon = await chips("r_2");
  pruefe(umbreon.length === 4 && umbreon.map((c) => c.vorlage).join() === "eye,ward,ward,host", `Umbreon: 4 Teile mit Vorlage ${umbreon.map((c) => c.vorlage).join(", ")}`);
  pruefe(umbreon.map((c) => c.rohstoff).join() === "redstone_dust.png,gold_ingot.png,gold_ingot.png,gold_ingot.png", "Umbreon: Rohstoff je Teil (Redstone, Gold, Gold, Gold)");
  pruefe(umbreon.map((c) => c.status).join() === "gefunden,gefunden,gefunden,fehlt", "Umbreon: gefundene Vorlagen hervorgehoben, Hüterzier fehlt");
  const taucher = await chips("r_3");
  pruefe(taucher[1].status === "frei" && !taucher[1].rohstoff && taucher[3].leer, "Taucher: Harnisch ohne Besatz → freie Slots, Stiefel leer");
  pruefe((await p.$$('[data-set="r_1"] .besatz-reihe, [data-set="r_1"] .vorlage-mini')).length === 0, "keine doppelte Vorlagen-Reihe mehr");

  // Karte: Set auf dem Ständer (3D-Aufnahme), Hintergrund der Dimension
  const fotos = await p.waitForFunction(() => [...document.querySelectorAll(".ruestung-karte")].every((k) => k.querySelector("img.staender-bild")?.naturalWidth > 0), null, { timeout: 30000 }).then(() => true, () => false);
  pruefe(fotos, "jede Karte zeigt ihr Set auf dem Ständer");
  const deckend = await p.$$eval("img.staender-bild", (l) => l.map((img) => {
    const g = document.createElement("canvas"); g.width = img.naturalWidth; g.height = img.naturalHeight;
    const ctx = g.getContext("2d"); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, g.width, g.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return Math.round(n / (d.length / 4) * 100);
  }));
  pruefe(deckend.every((x) => x > 5 && x < 70), `Ständer-Bilder zeigen eine Figur (${deckend.join(" / ")} % deckend)`);
  pruefe(await p.$eval('[data-staender="r_1"]', (e) => getComputedStyle(e).backgroundImage.includes(`${fig.dim === "nether" ? "netherrack" : fig.dim === "end" ? "obsidian" : "deepslate"}.png`)), "Hintergrund wie die Bühne (Block der Dimension)");
  pruefe(await p.$eval("#ruestungListe", (e) => e.scrollWidth <= e.clientWidth), "Karten passen ohne seitliches Scrollen in 390 px");
  const kartenHoehe = await p.$$eval(".ruestung-karte", (l) => l.map((k) => Math.round(k.getBoundingClientRect().height)));
  pruefe(kartenHoehe.every((h) => h < 200), `Karten bleiben kompakt (${kartenHoehe.join(" / ")} px hoch)`);
  await bild("liste");

  // ---- Detail: 3D-Figur, Schmiedetisch, Bedarf --------------------------------------
  await p.click('[data-set="r_2"]');
  await p.waitForFunction(() => fig.art !== null, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  const art = await p.evaluate(() => fig.art);
  pruefe(art === "3d", `Figur-Modus über http: ${art}`);
  const pixel = await p.evaluate(() => {
    const c = document.querySelector("#buehneFlaeche canvas.figur-3d");
    const g = document.createElement("canvas"); g.width = c.width; g.height = c.height;
    const ctx = g.getContext("2d"); ctx.drawImage(c, 0, 0);
    const d = ctx.getImageData(0, 0, g.width, g.height).data;
    let deckend = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) deckend++;
    return deckend / (d.length / 4);
  });
  pruefe(pixel > 0.05 && pixel < 0.6, `3D-Figur gezeichnet (${Math.round(pixel * 100)} % der Fläche)`);
  const detail = await p.textContent("#orteSheetInhalt");
  pruefe(detail.includes("2 von 3 Rüstungsbesätzen in dieser Welt gefunden"), "Detail: 2 von 3 Besätzen gefunden");
  pruefe(detail.includes("Netherithelm") && detail.includes("Augenzier") && detail.includes("Redstone"), "Rezept: Netherithelm · Augenzier · Redstone");
  pruefe(await p.$$eval(".rezept", (l) => l.length) === 4, "Vier Rezepte am Schmiedetisch");
  pruefe(await alleIconsGeladen(".rezept"), "Rezept-Slots: Vorlage, Rüstung, Material, Ergebnis geladen");
  pruefe(await p.$eval('.besatz-status.fehlt[data-id="host"]', (e) => e.textContent.includes("Pfadruinen")), "Hüterzier fehlt → Fundort Pfadruinen");
  pruefe(detail.includes("2 ×") && detail.includes("Mündelzier") && detail.includes("4 ×") && detail.includes("Netheritaufwertung"), "Bedarf: 2 × Mündelzier, 4 × Netheritaufwertung");
  pruefe(detail.includes("vervielfältigen") || detail.includes("Vervielfältigen"), "Hinweis: Vorlagen vervielfältigen");
  await bild("detail");

  // Drehen per Ziehen
  const box = await p.$eval("#buehneFlaeche canvas", (c) => { const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const vorher = await p.evaluate(() => fig.f3d.drehung);
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x - 90, box.y, { steps: 6 }); await p.mouse.up();
  pruefe(Math.abs((await p.evaluate(() => fig.f3d.drehung)) - vorher) > 0.5, "Ziehen dreht die Figur");
  // Nether-Sockel, Steve als Träger
  await p.click('[data-buehne-dim="nether"]');
  await p.click("[data-buehne-traeger]");
  await p.waitForTimeout(900);
  pruefe(await p.evaluate(() => fig.dim === "nether" && fig.traeger === "steve" && lsLesen("ruestung.buehne").dim === "nether"), "Nether + Steve, auf dem Gerät gemerkt");
  pruefe((await p.$eval(".buehne", (e) => e.style.getPropertyValue("--hintergrund"))).includes("netherrack"), "Hintergrund: Netherrack");
  await bild("detail-nether-steve");
  await p.click('[data-buehne-dim="oberwelt"]'); await p.click("[data-buehne-traeger]");

  await sheetScrollen(560);
  await bild("detail-rezepte");
  const zumSammel = await p.$('.besatz-status.fehlt[data-id="host"]');
  await p.evaluate(() => { $sheet.scrollTop = $sheet.scrollHeight; });
  await p.waitForTimeout(250);
  const detailText = await p.textContent("#orteSheetInhalt");
  pruefe(!/verzaub|Amboss/i.test(detailText) && (await p.$$(".amboss, .verz, [data-aktion^='verz']")).length === 0, "Detail: keine Verzauberung, kein Amboss mehr");
  await bild("detail-ende");
  pruefe(zumSammel !== null, "Knopf zum Sammelobjekt vorhanden");
  await p.evaluate(() => { $sheet.scrollTop = 0; });
  await p.click('.besatz-status.fehlt[data-id="host"]');
  await p.waitForTimeout(300);
  pruefe(await p.evaluate(() => st.sheet === "sam") && (await p.textContent("#orteSheetInhalt h2")) === "Hüterzier", "Fehlender Besatz öffnet das Sammelobjekt");

  // ---- Editor: Schmiedetisch --------------------------------------------------------
  await p.evaluate(() => alleSchliessen());
  await p.waitForTimeout(300);
  await p.click("#ruestungNeuBtn");
  await p.waitForTimeout(600);
  const slotIcon = () => p.$eval(".schmiedetisch .slot.ergebnis img", (i) => i.src.split("/").pop());
  pruefe(await slotIcon() === "netherite_helmet.png", "Neues Set: Netherithelm ohne Besatz");
  const vorlagen = await p.$$eval("[data-wahl-muster]", (l) => l.map((k) => k.dataset.wahlMuster));
  pruefe(vorlagen.length === 19 && vorlagen[0] === "", "Vorlagen-Auswahl: Ohne + 18 Besätze");
  pruefe(await p.$$eval("[data-wahl-muster] .haken", (l) => l.length) === 5, "✓ bei den 5 gefundenen Besätzen");
  await p.evaluate(() => { const w = document.querySelector(".wahl-bereich"); $sheet.scrollTop = w.offsetTop - 200; });
  await p.waitForTimeout(300);
  await bild("editor-vorlage");
  await p.click('[data-wahl-muster="sentry"]');
  pruefe(await p.evaluate(() => rs.slot) === "material", "Nach der Vorlage geht es zum Material");
  await p.click('[data-wahl-material="gold"]');
  pruefe(await slotIcon() === "netherite_helmet__gold.png", "Ergebnis: netherite_helmet__gold.png");
  await p.waitForTimeout(700);
  await bild("editor-material");
  await p.click('[data-teil-wahl="chestplate"]');
  await p.click('[data-slot="ruestung"]');
  const arten = await p.$$eval("[data-wahl-ruestung]", (l) => l.map((k) => k.dataset.wahlRuestung));
  pruefe(!arten.includes("turtle") && arten.length === 8, `Harnisch: keine Schildkröte (${arten.length - 1} Rüstungen + Ohne)`);
  await p.click('[data-wahl-ruestung="leather"]');
  await p.click('[data-wahl-farbe="red"]');
  pruefe(await slotIcon() === "leather_chestplate_red.png", "Lederjacke rot gefärbt");
  pruefe(await p.$("[data-wahl-verzaubert]") === null && !/verzaub/i.test(await p.textContent("#orteSheetInhalt")), "Editor: kein Schalter „Verzaubert“ mehr");
  pruefe(await p.evaluate(() => Object.values(rs.entwurf.teile).every((t) => !t || !("verzaubert" in t))), "Entwurf ohne Feld „verzaubert“");
  await p.waitForTimeout(700);
  await bild("editor-leder");
  await p.click('[data-teil-wahl="leggings"]');
  await p.click('[data-slot="ruestung"]');
  await p.click('[data-wahl-ruestung=""]');
  pruefe(await p.evaluate(() => rs.entwurf.teile.leggings === null), "Beinschutz entfernt");
  pruefe(await p.$eval('[data-slot="vorlage"]', (k) => k.disabled), "Ohne Teil: Vorlage gesperrt");
  await p.click('[data-aktion="set-speichern"]');
  pruefe((await p.textContent("#setMeldung")).includes("Bitte einen Namen eingeben"), "Ohne Namen: Meldung");
  await p.fill("#setName", "Wache");
  await p.click('[data-aktion="set-speichern"]');
  await p.waitForFunction(() => st.sheet === "ruestung");
  const neu = await p.evaluate(() => rs.sets[0]);
  pruefe(neu.name === "Wache" && neu.von === "Max" && neu.teile.leggings === null && neu.teile.helmet.muster === "sentry" && neu.teile.chestplate.farbe === "red",
    "Gespeichert: Wache (Wächterzier-Helm, rote Lederjacke, ohne Beinschutz)");
  pruefe(Object.values(neu.teile).every((t) => !t || !("verzaubert" in t)), "Gespeichertes Set ohne Feld „verzaubert“");
  pruefe((await p.textContent("#orteSheetInhalt")).includes("Alle Rüstungsbesätze sind in dieser Welt gefunden"), "Wächterzier ist gefunden → alle Besätze da");

  // Bearbeiten, Abbrechen, Löschen (zweimal tippen)
  await p.click('[data-aktion="set-bearbeiten"]');
  await p.fill("#setName", "Geändert");
  await p.click('[data-aktion="set-abbrechen"]');
  pruefe(await p.evaluate(() => st.sheet === "ruestung" && rs.sets[0].name === "Wache"), "Abbrechen verwirft Änderungen");
  await p.click('[data-aktion="set-loeschen"]');
  pruefe((await p.textContent('[data-aktion="set-loeschen"]')) === "Wirklich löschen?", "Löschen fragt nach");
  await p.click('[data-aktion="set-loeschen"]');
  await p.waitForTimeout(300);
  pruefe(await p.evaluate(() => rs.sets.length === 3 && st.sheet === null), "Set gelöscht");

  // ---- Anzeigeschema: Karte mit Figur-Aufnahme ------------------------------------
  const karte = await p.evaluate(() => BOARD_KARTEN.ruestung.karte(boardKontext(), "r_2"));
  const geprueft = kartePruefen(karte);
  pruefe(!geprueft.fehler, `Board nimmt die Karte an${geprueft.fehler ? ": " + geprueft.fehler : ""}`);
  pruefe(karte.bloecke[0].art === "bild" && /^data:image\/(png|webp);base64,/.test(karte.bloecke[0].daten) && karte.bloecke[0].pixelig === false,
    `Karte: 3D-Aufnahme als Bild (${Math.round(karte.bloecke[0].daten.length / 1024)} KB Base64)`);
  pruefe(karte.bloecke[1].zeilen.map((z) => z.label).join() === "Netherithelm,Netheritharnisch,Netheritbeinschutz,Netheritstiefel"
    && karte.bloecke[1].zeilen[0].wert === "Augenzier · Redstone", `Karte: Zeilen je Teil (${karte.bloecke[1].zeilen[0].label}: ${karte.bloecke[1].zeilen[0].wert})`);
  pruefe(karte.bloecke[2].text.includes("2 von 3") && karte.bloecke[2].text.includes("Hüterzier (Pfadruinen)"), "Karte: fehlende Besätze mit Fundort");

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? ": " + fehler.join(" | ") : ""}`);

  // ---- Als Datei: nur Icons, kein Canvas ------------------------------------------
  const d = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const dateiFehler = [];
  d.on("pageerror", (e) => dateiFehler.push(e.message));
  d.on("console", (m) => { if (m.type() === "error") dateiFehler.push(m.text()); });
  let cdn = 0;
  await d.route("https://cdnjs.cloudflare.com/**", (r) => { cdn++; return r.abort(); });
  await d.goto(new URL("../companion-prototyp.html", import.meta.url).href);
  await d.waitForFunction(() => typeof st !== "undefined" && st.weltId);
  await d.evaluate(() => { modulWechseln("ruestung"); });
  await d.waitForFunction(() => rs.geladen);
  await d.waitForFunction(() => document.querySelectorAll('[data-staender="r_1"] .staender-icons img').length === 4, null, { timeout: 5000 }).catch(() => {});
  pruefe(await d.$$eval('[data-staender="r_1"] .staender-icons img', (l) => l.length === 4 && l.every((i) => i.naturalWidth === 16)), "Als Datei: Karte zeigt statt des Ständers die vier Icons");
  await d.click('[data-set="r_1"]');
  await d.waitForFunction(() => fig.art !== null);
  await d.waitForTimeout(400);
  pruefe(await d.evaluate(() => fig.art) === "icons" && cdn === 0, "Als Datei: Icons statt Figur, three.js wird gar nicht geladen");
  pruefe((await d.textContent("#buehneHinweis")).includes("über das Board"), "Hinweis: 3D-Figur über das Board");
  pruefe(await d.$$eval(".buehne-icons img", (l) => l.length === 4 && l.every((i) => i.naturalWidth === 16)), "Bühne zeigt die vier Icons");
  const dateiKarte = await d.evaluate(() => BOARD_KARTEN.ruestung.karte(boardKontext(), "r_1"));
  pruefe(!kartePruefen(dateiKarte).fehler && dateiKarte.bloecke[0].art === "zeilen", "Als Datei: Board-Karte ohne Bild");
  await d.screenshot({ path: path.join(DIR, "ruestung-datei.png") });
  pruefe(dateiFehler.length === 0, `Als Datei keine Fehler${dateiFehler.length ? ": " + dateiFehler.join(" | ") : ""}`);
} finally {
  await browser.close();
  await server.schliessen();
}
