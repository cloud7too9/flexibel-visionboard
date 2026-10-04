/* ============================================================================
   Companion · ANZEIGESCHEMAS (gemeinsam mit dem Board-Server)
   ----------------------------------------------------------------------------
   Daten → Karte im allgemeinen Kartenformat des Boards: Titel + Blöcke
   koordinaten/zeilen/text/bild, geprüft in koordinaten-board/server/src/zeigen.js
   (höchstens 6 Blöcke, 8 Zeilen je Block, Text 400 Zeichen).
   Die Companion nutzt die Karten für „Aufs Board“, der Board-Server für die
   Widgets des Dashboards (GET /api/widgets/:typ). Dazu die reinen Hilfen, die
   beide brauchen (Zahlen, Umrechnung, Strukturen, Portal-Prüfung, Banner-Pixel).

   Klassisches Script wie regeln.js und nach regeln.js geladen (nutzt dessen
   Stammdaten). Kein DOM, kein fetch: Was nur im Browser geht (PNG erzeugen,
   3D-Figur, Biom an einer Stelle), reicht der Aufrufer über den Kontext herein.

   ctx = {
     welt:{ id, seed } | null,
     dimensionen, typen, instanzen,          // Orte der Welt (Datenmodell der Karte)
     sammelStatus:{ [objektId]:{ von, am } }, // Sammelobjekte der Welt
     verbindungen,                            // Portal-Verbindungen der Welt
     banner, ruestung,                        // für alle Welten
     standort:{ x, y, z, dim } | null,        // nur am Handy
     pngDaten?(breite, hoehe, rgba) → "data:image/png;base64,…",
     ruestungFoto?(set) → Promise<{ daten, pixelig }>,
     biomName?(dim, x, z) → Name | null,
   }
   ========================================================================== */
"use strict";

/* ---- Zahlen, Koordinaten, Datum ----------------------------------------- */
/** −1 884 – schmales Leerzeichen statt Punkt/Komma (sähe nach Kommazahl aus) */
function zahl(n){
  return `${n < 0 ? "−" : ""}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}
/** Oberwelt ↔ Nether (÷ 8 / × 8). Für das End gibt es keine Umrechnung. */
function umrechnen(x, z, dim){
  if(dim === "overworld") return { x:Math.floor(x/8), z:Math.floor(z/8), dim:"nether" };
  if(dim === "nether")    return { x:x*8, z:z*8, dim:"overworld" };
  return null;
}
const RICHTUNGEN = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
/** Entfernung + Himmelsrichtung (Norden = −Z). Oberwelt/Nether werden umgerechnet. */
function entfernung(von, x, z, dim){
  if(!von) return null;
  let zx = x, zz = z;
  if(von.dim !== dim){
    const u = umrechnen(x, z, dim);
    if(!u || u.dim !== von.dim) return null;
    zx = u.x; zz = u.z;
  }
  const dx = zx - von.x, dz = zz - von.z;
  const winkel = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  return { meter:Math.round(Math.hypot(dx, dz)), richtung:RICHTUNGEN[Math.round(winkel/45) % 8], umgerechnet:von.dim !== dim };
}
const kurzSeed = (s) => s.length > 12 ? `${s.slice(0, 5)}…${s.slice(-4)}` : s;
const kurzKoord = (p) => `X ${zahl(p.x)}${p.y != null ? ` · Y ${zahl(p.y)}` : ""} · Z ${zahl(p.z)}`;
const datumKurz = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("de-DE", { day:"numeric", month:"numeric" }); };

/* ---- Fundort-Strukturen --------------------------------------------------- */
/* Fundort-Strukturen der Sammelobjekte: FeatureCategory der Karte → Struktur mit deutschem Namen
   und Kennblock-Bild (icons/manifest.json, Bilder von minecraft.wiki). bild:false = noch keine Datei,
   dann steht in der Companion das Symbol. */
const STRUKTUREN = Object.freeze({
  "Outpost":         { id:"pillager_outpost", name:"Plünderer-Außenposten" },
  "Desert Temple":   { id:"desert_pyramid",   name:"Wüstentempel" },
  "Jungle Temple":   { id:"jungle_pyramid",   name:"Dschungeltempel" },
  "Shipwreck":       { id:"shipwreck",        name:"Schiffswrack" },
  "Trail Ruins":     { id:"trail_ruins",      name:"Pfadruinen", bild:false },
  "Mansion":         { id:"mansion",          name:"Waldanwesen" },
  "Monument":        { id:"monument",         name:"Ozeanmonument" },
  "Ancient City":    { id:"ancient_city",     name:"Antike Stätte" },
  "Trial Chamber":   { id:"trial_chambers",   name:"Prüfungskammern" },
  "Stronghold":      { id:"stronghold",       name:"Festung" },
  "Nether Fortress": { id:"fortress",         name:"Netherfestung" },
  "Bastion":         { id:"bastion_remnant",  name:"Bastionsruine" },
  "End City":        { id:"end_city",         name:"Endsiedlung" },
});
const strukturName = (kat) => STRUKTUREN[kat]?.name || kat;

/* ---- Portale: Prüfung wie im Spiel ---------------------------------------- */
/*   1. Position umrechnen: Oberwelt → Nether ÷ 8 (abgerundet), zurück × 8, Y bleibt
     2. Im Suchbereich (Quadrat) um diesen Zielpunkt nach Portalen suchen:
        ±128 in beiden Dimensionen (Bedrock)
     3. Das nächste gewinnt – 3D-Abstand, Y zählt mit. Keins gefunden → neues Portal.
   Quelle: minecraft.wiki/w/Nether_portal („Portal search“). */
const PORTAL_SUCHRADIUS = 128;

/** Beide Portale jeder Verbindung als flache Liste */
function portaleAlle(liste){
  return liste.flatMap((v) => [
    { vid:v.id, name:v.name, dim:"overworld", ...v.oberwelt },
    { vid:v.id, name:v.name, dim:"nether", ...v.nether },
  ]);
}

/** Was passiert, wenn man an Punkt p (Dimension „von“) durchs Portal geht? */
function zielSuchen(von, p, portale){
  const u = umrechnen(p.x, p.z, von);
  const ziel = { x:u.x, y:p.y ?? null, z:u.z, dim:u.dim };
  const radius = PORTAL_SUCHRADIUS;
  let treffer = null;
  for(const q of portale){
    if(q.dim !== u.dim || Math.abs(q.x - ziel.x) > radius || Math.abs(q.z - ziel.z) > radius) continue;
    const dy = q.y != null && ziel.y != null ? q.y - ziel.y : 0;
    const abstand = Math.hypot(q.x - ziel.x, dy, q.z - ziel.z);
    if(!treffer || abstand < treffer.abstand) treffer = { portal:q, abstand };
  }
  return { ziel, radius, treffer };
}

/** Prüft beide Richtungen einer Verbindung gegen alle erfassten Portale der Welt */
function verbindungPruefen(v, liste){
  const portale = portaleAlle([...liste.filter((x) => x.id !== v.id), v]);
  const hin = zielSuchen("overworld", v.oberwelt, portale);
  const rueck = zielSuchen("nether", v.nether, portale);
  const art = (s) => !s.treffer ? "neu" : s.treffer.portal.vid === v.id ? "ok" : "anders";
  const artHin = art(hin), artRueck = art(rueck);
  const ideal = { x:hin.ziel.x, y:v.oberwelt.y ?? v.nether.y ?? null, z:hin.ziel.z };
  let gesamt = "ok", label = "Verbunden";
  if(artHin === "neu" || artRueck === "neu"){ gesamt = "bad"; label = "Neues Portal"; }
  else if(artHin === "anders" && artRueck === "anders"){ gesamt = "warn"; label = "Falsch verknüpft"; }
  else if(artHin === "anders" || artRueck === "anders"){ gesamt = "warn"; label = "Einseitig"; }
  return { hin, rueck, artHin, artRueck, gesamt, label, ideal,
    abweichung:Math.round(Math.hypot(v.nether.x - ideal.x, v.nether.z - ideal.z)) };
}

/** Konkreter Vorschlag, wenn eine Verbindung nicht passt */
function portalEmpfehlung(v, p, liste){
  if(p.gesamt === "ok") return null;
  const versetzt = { ...v, nether:{ ...p.ideal } };
  const schonIdeal = p.abweichung === 0 && (v.nether.y ?? null) === p.ideal.y;
  if(!schonIdeal && verbindungPruefen(versetzt, liste).gesamt === "ok")
    return { art:"info", text:`Nether-Portal genau bei ${kurzKoord(p.ideal)} bauen – dann passt es in beide Richtungen. Das alte Nether-Portal danach ausschalten.` };
  return { art:"warn", text:"Auch am Idealpunkt klappt es nicht: Ein anderes Portal liegt zu nah. Die Portale weiter auseinander bauen oder das störende entfernen." };
}

/* ---- Banner: Material, Schritte, Pixel ------------------------------------ */
const vorlagenVon = (b) => [...new Set(b.ebenen.map((e) => e.muster).filter((m) => BANNERVORLAGEN[m]))];

/** Material + Schritte für Werkbank und Webstuhl */
function bannerAnleitung(b){
  const farbstoffe = new Map();
  for(const e of b.ebenen) farbstoffe.set(e.farbe, (farbstoffe.get(e.farbe) || 0) + 1);
  const schritte = [
    { titel:"Banner herstellen", info:`6 × ${farbe(b.basis).wolle} + 1 Stock · Werkbank`, bild:{ basis:b.basis, ebenen:[] } },
    ...b.ebenen.map((e, n) => {
      const v = BANNERVORLAGEN[e.muster];
      return { titel:muster(e.muster).de, en:muster(e.muster).en,
        info:`${farbe(e.farbe).farbstoff}${v ? ` + ${v.de}` : ""} · Webstuhl`,
        bild:{ basis:b.basis, ebenen:b.ebenen.slice(0, n + 1) } };
    }),
  ];
  return { farbstoffe, vorlagen:vorlagenVon(b), schritte };
}

/** Banner als Pixel: 20 × 40, RGBA (Uint8ClampedArray) – die Seite malt daraus ein Canvas, der Server ein PNG */
function bannerPixel(b){
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const pix = Array.from({ length:800 }, () => rgb(farbe(b.basis).hex));
  for(const e of b.ebenen){
    const m = muster(e.muster).m, f = rgb(farbe(e.farbe).hex);
    for(let y = 0; y < 40; y++) for(let x = 0; x < 20; x++){
      const a = Math.max(0, Math.min(1, Number(m(x, y))));
      if(!a) continue;
      const p = pix[y * 20 + x];
      pix[y * 20 + x] = p.map((v, i) => Math.round(v * (1 - a) + f[i] * a));
    }
  }
  const rgba = new Uint8ClampedArray(800 * 4);
  pix.forEach((p, i) => { rgba.set([...p, 255], i * 4); });
  return rgba;
}

/* ---- Rüstung -------------------------------------------------------------- */
const teilName = (teilId) => RUESTUNGS_TEILE.find((t) => t.id === teilId)?.name || teilId;
const itemName = (teilId, t) => ruestungsArt(t?.ruestung)?.teile[teilId] || teilName(teilId);
/** Welche Besätze das Set braucht und welche davon in der Welt schon gefunden sind */
function besatzStandVon(s, status){
  const muster = RUESTUNGS_TEILE.map(({ id }) => s.teile[id]?.muster).filter(Boolean);
  const verschieden = [...new Set(muster)];
  return {
    muster, verschieden,
    gefunden: verschieden.filter((m) => status?.[m]),
    netherit: RUESTUNGS_TEILE.filter(({ id }) => s.teile[id]?.ruestung === "netherite").length,
  };
}

/* ---- Karten ----------------------------------------------------------------- */
const KARTEN_DIM = Object.freeze({ overworld:"oberwelt", nether:"nether", end:"ende" });
const koordBlock = (label, p, dim) => ({ art:"koordinaten", label, x:p.x, y:p.y ?? null, z:p.z, dimension:KARTEN_DIM[dim] });
const dimensionVon = (ctx, dimensionId) => ctx.dimensionen.find((d) => d.id === dimensionId)?.type;
const typVonIn = (ctx, i) => ctx.typen.find((t) => t.id === i.featureTypeId);

/** Bekannte Orte einer Fundort-Kategorie in der Welt – nächste zuerst, wenn der Standort bekannt ist */
function fundorteIn(ctx, kategorie, dim){
  return ctx.instanzen
    .filter((i) => dimensionVon(ctx, i.dimensionId) === dim && typVonIn(ctx, i)?.kategorie === kategorie)
    .map((i) => ({ i, w:entfernung(ctx.standort, i.x, i.z, dim) }))
    .sort((a, b) => (a.w && b.w) ? a.w.meter - b.w.meter : 0);
}
const samZaehlt = () => SAMMELOBJEKTE.filter((o) => !o.aufwertung);
const fundorteAlle = () => SAMMELOBJEKTE.reduce((liste, o) => {
  if(!liste.some((f) => f.kategorie === o.kategorie && f.dim === o.dim)) liste.push({ kategorie:o.kategorie, dim:o.dim });
  return liste;
}, []);

function ortKarte(ctx, id){
  const i = ctx.instanzen.find((x) => x.id === id); if(!i) return null;
  const t = typVonIn(ctx, i), dim = dimensionVon(ctx, i.dimensionId);
  if(!t || !dim) return null;
  const biom = ctx.biomName?.(dim, i.x, i.z) || null;   // aus dem Welt-Import
  const bloecke = [{ art:"koordinaten", x:i.x, y:i.y ?? null, z:i.z }];
  const u = umrechnen(i.x, i.z, dim);
  if(u) bloecke.push({ art:"koordinaten", label:u.dim === "nether" ? "Im Nether" : "In der Oberwelt",
                       x:u.x, y:null, z:u.z, dimension:KARTEN_DIM[u.dim] });
  const unter = [t.variante ? t.kategorie : null, biom].filter(Boolean).join(" · ");
  // typ = Feature-Typ der Seed Map → die Anzeige zeigt dazu den Kennblock (eigene Orte: keiner)
  const typ = t.kategorie === EIGENE_ORTE ? undefined : t.kategorie;
  return { titel:t.variante || t.kategorie, unter:unter || undefined, bereich:"Karte",
           quelle:`ort:${i.id}`, typ, dimension:KARTEN_DIM[dim], bloecke };
}

function sammelKarte(ctx, id){
  const o = SAMMELOBJEKTE.find((x) => x.id === id); if(!o) return null;
  const s = ctx.sammelStatus?.[id], naechster = fundorteIn(ctx, o.kategorie, o.dim)[0];
  const bloecke = [{ art:"zeilen", zeilen:[
    { label:"Fundort", wert:`${strukturName(o.kategorie)} · ${dimLabel(o.dim)}` },
    { label:"Status", wert:s ? `gefunden von ${s.von}${datumKurz(s.am) ? ` am ${datumKurz(s.am)}` : ""}` : "noch offen" },
  ] }];
  if(naechster) bloecke.push(koordBlock("Nächster bekannter Fundort", naechster.i, o.dim));
  bloecke.push({ art:"text", text:o.quelle });
  return { titel:o.name, unter:`${o.en} · ${o.aufwertung ? "Schmiedevorlage" : "Rüstungsbesatz"}`, bereich:"Sammelobjekte",
           quelle:`sammel:${id}`, typ:o.kategorie, dimension:KARTEN_DIM[o.dim], bloecke };
}

function sammelStandKarte(ctx){
  if(!ctx.welt) return null;
  const zaehlt = samZaehlt(), fundorte = fundorteAlle();
  const gefunden = zaehlt.filter((o) => ctx.sammelStatus?.[o.id]).length, gesamt = zaehlt.length;
  const bekannt = fundorte.filter((f) => fundorteIn(ctx, f.kategorie, f.dim).length).length;
  const offen = zaehlt.filter((o) => !ctx.sammelStatus?.[o.id]).map((o) => o.name);
  const bloecke = [{ art:"zeilen", zeilen:[
    { label:"Gefunden", wert:`${gefunden} von ${gesamt}` },
    { label:"Fortschritt", wert:`${Math.round(gefunden / gesamt * 100)} %` },
    { label:"Fundorte auf der Karte", wert:`${bekannt} von ${fundorte.length}` },
  ] }];
  bloecke.push({ art:"text", text:offen.length ? `Noch offen: ${offen.join(", ")}`.slice(0, 400) : "Alle Rüstungsbesätze gefunden!" });
  return { titel:"Rüstungsbesätze", unter:`Sammelobjekte der Welt ${kurzSeed(ctx.welt.seed)}`, bereich:"Sammelobjekte",
           quelle:"sammelstand", dimension:null, bloecke };
}

/** Alle Sammelobjekte mit Stand – je Dimension ein Zeilen-Block (höchstens 8 Zeilen je Block) */
function sammelListeKarte(ctx){
  if(!ctx.welt) return null;
  const zeile = (o) => {
    const s = ctx.sammelStatus?.[o.id];
    return { label:o.name, wert:s ? `✓ ${s.von}` : `offen · ${strukturName(o.kategorie)}`.slice(0, 80) };
  };
  const bloecke = [];
  for(const dim of DIM_ORDER){
    const liste = SAMMELOBJEKTE.filter((o) => o.dim === dim);
    for(let n = 0; n < liste.length; n += 8) bloecke.push({ art:"zeilen", zeilen:liste.slice(n, n + 8).map(zeile) });
  }
  const zaehlt = samZaehlt(), gefunden = zaehlt.filter((o) => ctx.sammelStatus?.[o.id]).length;
  return { titel:"Sammelobjekte", unter:`${gefunden} von ${zaehlt.length} Rüstungsbesätzen gefunden`, bereich:"Sammelobjekte",
           quelle:"sammelliste", dimension:null, bloecke:bloecke.slice(0, 6) };
}

function portalKarte(ctx, id){
  const v = ctx.verbindungen.find((x) => x.id === id); if(!v) return null;
  const p = verbindungPruefen(v, ctx.verbindungen), e = portalEmpfehlung(v, p, ctx.verbindungen);
  const zeilen = [{ label:"Status", wert:p.label }];
  if(p.abweichung) zeilen.push({ label:"Abstand zum Idealpunkt", wert:`${p.abweichung} ${p.abweichung === 1 ? "Block" : "Blöcke"}` });
  const bloecke = [koordBlock("Oberwelt-Portal", v.oberwelt, "overworld"), koordBlock("Nether-Portal", v.nether, "nether"), { art:"zeilen", zeilen }];
  if(e) bloecke.push({ art:"text", text:e.text });
  return { titel:v.name, unter:"Portal-Verbindung · Regeln Bedrock", bereich:"Portal-Verwaltung",
           quelle:`portal:${id}`, dimension:"nether", bloecke };
}

/** Alle Portal-Verbindungen der Welt mit Status und beiden Koordinaten */
function portalListeKarte(ctx){
  if(!ctx.welt) return null;
  const kurz = (p) => `${zahl(p.x)} / ${zahl(p.z)}`;
  const zeilen = ctx.verbindungen.slice(0, 16).map((v) => ({ label:v.name.slice(0, 40),
    wert:`${verbindungPruefen(v, ctx.verbindungen).label} · O ${kurz(v.oberwelt)} ↔ N ${kurz(v.nether)}`.slice(0, 80) }));
  const bloecke = [];
  for(let n = 0; n < zeilen.length; n += 8) bloecke.push({ art:"zeilen", zeilen:zeilen.slice(n, n + 8) });
  if(!bloecke.length) bloecke.push({ art:"text", text:"Noch keine Portal-Verbindung erfasst." });
  if(ctx.verbindungen.length > 16) bloecke.push({ art:"text", text:`… und ${ctx.verbindungen.length - 16} weitere` });
  return { titel:"Portalverbindungen", unter:"Oberwelt ↔ Nether · Regeln Bedrock", bereich:"Portal-Verwaltung",
           quelle:"portalliste", dimension:"nether", bloecke };
}

function bannerKarte(ctx, id){
  const b = ctx.banner.find((x) => x.id === id); if(!b) return null;
  const { farbstoffe, vorlagen } = bannerAnleitung(b);
  const zeilen = [{ label:farbe(b.basis).wolle, wert:"6 ×" }, { label:"Stock", wert:"1 ×" },
    ...[...farbstoffe].map(([f, n]) => ({ label:farbe(f).farbstoff, wert:`${n} ×` }))].slice(0, 8);
  const bild = ctx.pngDaten?.(20, 40, bannerPixel(b));
  const bloecke = [...(bild ? [{ art:"bild", daten:bild, label:"Vorschau", pixelig:true }] : []), { art:"zeilen", zeilen }];
  if(vorlagen.length) bloecke.push({ art:"text", text:`Bannervorlagen (werden nicht verbraucht): ${vorlagen.map((v) => BANNERVORLAGEN[v].de).join(", ")}` });
  return { titel:b.name, unter:`Banner-Bauplan · ${b.ebenen.length} Muster · Grundfarbe ${farbe(b.basis).de}`,
           bereich:"Banner", quelle:`banner:${id}`, dimension:null, bloecke };
}

async function ruestungKarte(ctx, id){
  const s = ctx.ruestung.find((x) => x.id === id); if(!s) return null;
  const b = besatzStandVon(s, ctx.sammelStatus);
  const bloecke = [];
  const foto = ctx.ruestungFoto ? await ctx.ruestungFoto(s).catch(() => null) : null;
  if(foto) bloecke.push({ art:"bild", daten:foto.daten, label:"Auf dem Rüstungsständer", pixelig:foto.pixelig });
  bloecke.push({ art:"zeilen", zeilen:RUESTUNGS_TEILE.filter(({ id:t }) => s.teile[t]).map(({ id:t }) => {
    const x = s.teile[t], o = besatzMuster(x.muster);
    const teile = [o ? `${o.name} · ${besatzMaterial(x.material).name}` : "ohne Besatz",
      ruestungsArt(x.ruestung).faerbbar && (x.farbe ? farbe(x.farbe).de : "ungefärbt"), x.verzaubert && "verzaubert"];
    return { label:itemName(t, x), wert:teile.filter(Boolean).join(" · ").slice(0, 80) };
  }) });
  if(b.verschieden.length){
    const fehlt = b.verschieden.filter((m) => !ctx.sammelStatus?.[m]).map((m) => { const o = besatzMuster(m); return `${o.name} (${strukturName(o.kategorie)})`; });
    bloecke.push({ art:"text", text:(`Rüstungsbesätze in dieser Welt: ${b.gefunden.length} von ${b.verschieden.length} gefunden.`
      + (fehlt.length ? ` Fehlt noch: ${fehlt.join(", ")}.` : "")).slice(0, 400) });
  }
  return { titel:s.name, unter:`Rüstungs-Set · ${RUESTUNGS_TEILE.filter(({ id:t }) => s.teile[t]).length} Teile`, bereich:"Rüstung",
           quelle:`ruestung:${id}`, dimension:null, bloecke };
}

/** Überblick der Welt, solange die Gesamtkarte noch keinen eigenen Karten-Block hat:
    Orte je Dimension und die angehefteten Orte */
function weltKarte(ctx){
  if(!ctx.welt) return null;
  const zeilen = DIM_ORDER.map((d) => ({ label:dimLabel(d),
    wert:`${ctx.instanzen.filter((i) => dimensionVon(ctx, i.dimensionId) === d).length} Orte` }));
  const bloecke = [{ art:"zeilen", zeilen }];
  const angeheftet = ctx.instanzen.filter((i) => i.angeheftet).slice(0, 8).map((i) => {
    const t = typVonIn(ctx, i), d = dimensionVon(ctx, i.dimensionId);
    return { label:(t?.variante || t?.kategorie || "Ort").slice(0, 40), wert:`${dimLabel(d)} · ${zahl(i.x)} / ${zahl(i.z)}` };
  });
  if(angeheftet.length) bloecke.push({ art:"zeilen", zeilen:angeheftet });
  return { titel:"Gesamtkarte", unter:`Welt ${kurzSeed(ctx.welt.seed)}`, bereich:"Karte", quelle:"welt", dimension:"oberwelt", bloecke };
}

/** Anzeigeschema je Inhalt: quelle „<art>:<id>“ → Karte. karte(ctx, id) darf async sein (Rüstung rendert die Figur). */
const BOARD_KARTEN = Object.freeze({
  ort:         { titel:"Ort",                karte:ortKarte },          // Karte: ein Ort der Sammlung
  sammel:      { titel:"Sammelobjekt",       karte:sammelKarte },       // ein Rüstungsbesatz mit Fundort
  sammelstand: { titel:"Sammel-Fortschritt", karte:sammelStandKarte },  // Stand der Welt (ohne id)
  portal:      { titel:"Portal-Verbindung",  karte:portalKarte },       // beide Portale + Prüfung
  banner:      { titel:"Banner-Bauplan",     karte:bannerKarte },       // Vorschau + Material
  ruestung:    { titel:"Rüstungs-Set",       karte:ruestungKarte },     // Figur + Teile + Besätze der Welt (async)
  // für die Widgets des Dashboards (ohne id)
  sammelliste: { titel:"Alle Sammelobjekte", karte:sammelListeKarte },
  portalliste: { titel:"Portalverbindungen", karte:portalListeKarte },
  welt:        { titel:"Gesamtkarte",        karte:weltKarte },
});
