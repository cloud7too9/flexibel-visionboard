/* ============================================================================
   9d · BANNER  ·  Baupläne für Banner (Grundfarbe + bis zu 6 Muster-Ebenen)
   ----------------------------------------------------------------------------
   Musternamen wie im Spiel/Editor (englisch), Farben deutsch. Vorschau ist eine
   vereinfachte Pixel-Darstellung auf dem 20×40-Raster des Banners.
   API:  GET /banner → { banner }   POST /banner   PUT /banner/:id   DELETE /banner/:id
         banner = { id, name, basis, ebenen:[{ muster, farbe }], von }
   ========================================================================== */
const FARBEN = Object.freeze([
  { id:"white",      de:"Weiß",      en:"White",      hex:"#f9fffe" },
  { id:"light_gray", de:"Hellgrau",  en:"Light Gray", hex:"#9d9d97" },
  { id:"gray",       de:"Grau",      en:"Gray",       hex:"#474f52" },
  { id:"black",      de:"Schwarz",   en:"Black",      hex:"#1d1d21" },
  { id:"brown",      de:"Braun",     en:"Brown",      hex:"#835432" },
  { id:"red",        de:"Rot",       en:"Red",        hex:"#b02e26" },
  { id:"orange",     de:"Orange",    en:"Orange",     hex:"#f9801d" },
  { id:"yellow",     de:"Gelb",      en:"Yellow",     hex:"#fed83d" },
  { id:"lime",       de:"Hellgrün",  en:"Lime",       hex:"#80c71f" },
  { id:"green",      de:"Grün",      en:"Green",      hex:"#5e7c16" },
  { id:"cyan",       de:"Türkis",    en:"Cyan",       hex:"#169c9c" },
  { id:"light_blue", de:"Hellblau",  en:"Light Blue", hex:"#3ab3da" },
  { id:"blue",       de:"Blau",      en:"Blue",       hex:"#3c44aa" },
  { id:"purple",     de:"Violett",   en:"Purple",     hex:"#8932b8" },
  { id:"magenta",    de:"Magenta",   en:"Magenta",    hex:"#c74ebd" },
  { id:"pink",       de:"Rosa",      en:"Pink",       hex:"#f38baa" },
]);
const farbe = (id) => FARBEN.find((f) => f.id === id) || FARBEN[0];

// Bannervorlagen – werden im Webstuhl nicht verbraucht
const BANNERVORLAGEN = Object.freeze({
  flower:       { de:"Blumen-Bannervorlage",      herkunft:"Papier + Margerite" },
  creeper:      { de:"Creeper-Bannervorlage",     herkunft:"Papier + Creeperkopf" },
  skull:        { de:"Schädel-Bannervorlage",     herkunft:"Papier + Witherskelettschädel" },
  mojang:       { de:"Mojang-Logo-Bannervorlage", herkunft:"Papier + Verzauberter Goldener Apfel" },
  globe:        { de:"Globus-Bannervorlage",      herkunft:"Handel beim Kartografen (Meister)" },
  piglin:       { de:"Schnauzen-Bannervorlage",   herkunft:"Truhe in der Bastionsruine" },
  flow:         { de:"Fluss-Bannervorlage",       herkunft:"Unheilvoller Tresor (Prüfungskammer)" },
  guster:       { de:"Windstoßer-Bannervorlage",  herkunft:"Tresor (Prüfungskammer)" },
  curly_border: { de:"Spickelbord-Bannervorlage", herkunft:"Papier + Ranken", nurBedrock:true },
  bricks:       { de:"Mauerung-Bannervorlage",    herkunft:"Papier + Ziegelsteine", nurBedrock:true },
});

// Pixel-Motive der „Charges“ (1 Zelle = 2×2 Banner-Pixel) – bewusst vereinfacht
const MOTIVE = Object.freeze({
  creeper: { x:4, y:12, z:["##..##", "##..##", "..##..", ".####.", ".####.", ".#..#."] },
  skull:   { x:4, y:10, z:[".####.", "######", "#.##.#", "######", "..##..", "#....#", ".#..#.", "#....#"] },
  flower:  { x:3, y:12, z:["..###..", ".#...#.", "#.###.#", "#.#.#.#", "#.###.#", ".#...#.", "..###.."] },
  mojang:  { x:3, y:12, z:["..####.", ".#....#", "#.###..", "#.#..#.", "#.#.##.", ".#....#", "..####."] },
  globe:   { x:3, y:12, z:["..###..", ".#.##.#", "#.###.#", "#..#..#", "##...##", ".#.#.#.", "..###.."] },
  piglin:  { x:4, y:16, z:["######", "#.##.#", "#.##.#", "######"] },
  flow:    { x:3, y:12, z:["#######", "#.....#", "#.###.#", "#.#.#.#", "#.#...#", "#.#####", "#......"] },
  guster:  { x:3, y:12, z:[".#####.", "#.....#", "..###.#", ".#...#.", "#.##...", "#....#.", ".####.."] },
});
function motivMaske(m){
  return (x, y) => {
    const cx = Math.floor((x - m.x) / 2), cy = Math.floor((y - m.y) / 2);
    return m.z[cy]?.[cx] === "#" ? 1 : 0;
  };
}
const yn = (y) => y / 2;   // Höhe auf Breitenmaß (40 → 20) für Diagonalen
const zahn = (x) => 2.5 - Math.abs((x % 5) - 2);   // Sägezahn für „Indented“

// Alle 38 Muster: id (intern), en (Spielname), Maske (x, y) → Deckkraft 0…1
const MUSTER = Object.freeze([
  { id:"stripe_bottom",          en:"Base",                       m:(x, y) => y >= 27 },
  { id:"stripe_top",             en:"Chief",                      m:(x, y) => y < 13 },
  { id:"stripe_left",            en:"Pale Dexter",                m:(x) => x < 6 },
  { id:"stripe_right",           en:"Pale Sinister",              m:(x) => x >= 14 },
  { id:"stripe_center",          en:"Pale",                       m:(x) => x >= 7 && x < 13 },
  { id:"stripe_middle",          en:"Fess",                       m:(x, y) => y >= 15 && y < 25 },
  { id:"stripe_downright",       en:"Bend",                       m:(x, y) => Math.abs(yn(y) - x) < 3.2 },
  { id:"stripe_downleft",        en:"Bend Sinister",              m:(x, y) => Math.abs(yn(y) - (19 - x)) < 3.2 },
  { id:"small_stripes",          en:"Paly",                       m:(x) => x % 4 === 1 || x % 4 === 2 },
  { id:"cross",                  en:"Saltire",                    m:(x, y) => Math.abs(yn(y) - x) < 2 || Math.abs(yn(y) - (19 - x)) < 2 },
  { id:"straight_cross",         en:"Cross",                      m:(x, y) => (x >= 8 && x < 12) || (y >= 18 && y < 22) },
  { id:"diagonal_left",          en:"Per Bend Sinister",          m:(x, y) => x + yn(y) < 20 },
  { id:"diagonal_right",         en:"Per Bend",                   m:(x, y) => yn(y) < x },
  { id:"diagonal_up_left",       en:"Per Bend Inverted",          m:(x, y) => yn(y) > x },
  { id:"diagonal_up_right",      en:"Per Bend Sinister Inverted", m:(x, y) => x + yn(y) >= 20 },
  { id:"half_vertical",          en:"Per Pale",                   m:(x) => x < 10 },
  { id:"half_vertical_right",    en:"Per Pale Inverted",          m:(x) => x >= 10 },
  { id:"half_horizontal",        en:"Per Fess",                   m:(x, y) => y < 20 },
  { id:"half_horizontal_bottom", en:"Per Fess Inverted",          m:(x, y) => y >= 20 },
  { id:"square_bottom_left",     en:"Base Dexter Canton",         m:(x, y) => x < 10 && y >= 27 },
  { id:"square_bottom_right",    en:"Base Sinister Canton",       m:(x, y) => x >= 10 && y >= 27 },
  { id:"square_top_left",        en:"Chief Dexter Canton",        m:(x, y) => x < 10 && y < 13 },
  { id:"square_top_right",       en:"Chief Sinister Canton",      m:(x, y) => x >= 10 && y < 13 },
  { id:"triangle_bottom",        en:"Chevron",                    m:(x, y) => (39 - y) < 10 - Math.abs(x - 9.5) },
  { id:"triangle_top",           en:"Inverted Chevron",           m:(x, y) => y < 10 - Math.abs(x - 9.5) },
  { id:"triangles_bottom",       en:"Base Indented",              m:(x, y) => y >= 36 - zahn(x) },
  { id:"triangles_top",          en:"Chief Indented",             m:(x, y) => y < 3 + zahn(x) },
  { id:"circle",                 en:"Roundel",                    m:(x, y) => (x - 9.5) ** 2 + (y - 19.5) ** 2 < 25 },
  { id:"rhombus",                en:"Lozenge",                    m:(x, y) => Math.abs(x - 9.5) / 6.5 + Math.abs(y - 19.5) / 13 < 1 },
  { id:"border",                 en:"Bordure",                    m:(x, y) => x < 1 || x > 18 || y < 1 || y > 38 },
  { id:"curly_border",           en:"Bordure Indented",           m:(x, y) => { const d = Math.min(x, 19 - x, y, 39 - y); return d < 1 || (d < 3 && (x + y) % 3 === 0); } },
  { id:"bricks",                 en:"Field Masoned",              m:(x, y) => y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0 },
  { id:"gradient",               en:"Gradient",                   m:(x, y) => 1 - y / 39 },
  { id:"gradient_up",            en:"Base Gradient",              m:(x, y) => y / 39 },
  ...["creeper", "skull", "flower", "mojang", "globe", "piglin", "flow", "guster"].map((id) => ({
    id,
    en:{ creeper:"Creeper Charge", skull:"Skull Charge", flower:"Flower Charge", mojang:"Thing",
         globe:"Globe", piglin:"Snout", flow:"Flow", guster:"Guster" }[id],
    m:motivMaske(MOTIVE[id]),
  })),
]);
const muster = (id) => MUSTER.find((m) => m.id === id) || MUSTER[0];
const MAX_EBENEN = 6;   // Webstuhl im Überlebensmodus

/** Zeichnet ein Banner auf 20×40 Pixel → Data-URL (mit Cache) */
const bannerCache = new Map();
function bannerBild(b){
  const schluessel = JSON.stringify([b.basis, b.ebenen]);
  if(bannerCache.has(schluessel)) return bannerCache.get(schluessel);
  const c = document.createElement("canvas");
  c.width = 20; c.height = 40;
  const g = c.getContext("2d");
  const bild = g.createImageData(20, 40);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const pix = new Array(800).fill(0).map(() => rgb(farbe(b.basis).hex));
  for(const e of b.ebenen){
    const m = muster(e.muster).m, f = rgb(farbe(e.farbe).hex);
    for(let y = 0; y < 40; y++) for(let x = 0; x < 20; x++){
      const a = Math.max(0, Math.min(1, Number(m(x, y))));
      if(!a) continue;
      const p = pix[y * 20 + x];
      pix[y * 20 + x] = p.map((v, i) => Math.round(v * (1 - a) + f[i] * a));
    }
  }
  pix.forEach((p, i) => { bild.data.set([...p, 255], i * 4); });
  g.putImageData(bild, 0, 0);
  const url = c.toDataURL();
  bannerCache.set(schluessel, url);
  return url;
}

/** Materialliste + Schritte für den Webstuhl */
function bannerAnleitung(b){
  const farbstoffe = new Map();
  for(const e of b.ebenen) farbstoffe.set(e.farbe, (farbstoffe.get(e.farbe) || 0) + 1);
  const vorlagen = [...new Set(b.ebenen.map((e) => e.muster).filter((m) => BANNERVORLAGEN[m]))];
  const schritte = [
    `Banner herstellen: 6 × ${farbe(b.basis).de}e Wolle + 1 Stock (Werkbank)`,
    ...b.ebenen.map((e) => {
      const v = BANNERVORLAGEN[e.muster];
      return `Webstuhl: ${farbe(e.farbe).de}er Farbstoff + „${muster(e.muster).en}“${v ? ` – mit ${v.de}` : ""}`;
    }),
  ];
  return { farbstoffe, vorlagen, schritte };
}

const bn = { liste:[], suche:"", entwurf:null };
const $bannerListe = document.getElementById("bannerListe");

async function bannerLaden(){
  const r = await api("/banner");
  if(!r.ok) return toast(meldungAus(r), true);
  bn.liste = r.data.banner;
  if(aktivesModul === "banner") render();
}

function renderBanner(){
  const q = bn.suche.trim().toLowerCase();
  const liste = bn.liste.filter((b) => !q || b.name.toLowerCase().includes(q));
  $bannerListe.innerHTML = liste.map((b) => {
    const vorlagen = [...new Set(b.ebenen.map((e) => e.muster).filter((m) => BANNERVORLAGEN[m]))];
    return `<button class="banner-karte" data-banner="${b.id}">
      <img class="banner-bild" src="${bannerBild(b)}" alt="">
      <span class="card-title">${esc(b.name)}</span>
      <span class="card-meta">${b.ebenen.length} Ebenen · ${farbe(b.basis).de}</span>
      ${vorlagen.length ? `<span class="card-meta vorlagen">${vorlagen.map((v) => esc(muster(v).en)).join(" · ")}</span>` : ""}
    </button>`;
  }).join("") || `<div class="empty-list" style="grid-column:1/-1">${bn.liste.length ? "Nichts gefunden." : "Noch keine Banner-Baupläne. Unten „Neuer Banner“ antippen."}</div>`;
}

function bannerFortschritt(id){ return new Set(lsLesen(`banner.schritte.${id}`) || []); }

function bannerDetailOeffnen(id){
  const b = bn.liste.find((x) => x.id === id); if(!b) return;
  const { farbstoffe, vorlagen, schritte } = bannerAnleitung(b);
  const erledigt = bannerFortschritt(id);
  const html = kopfHtml(esc(b.name), `${b.ebenen.length} Ebenen · Grundfarbe ${farbe(b.basis).de}${b.von ? ` · von ${esc(b.von)}` : ""}`) + `<div class="orte-inhalt">
    <div class="banner-gross"><img class="banner-bild" src="${bannerBild(b)}" alt="Vorschau"><span class="result-hint">Vorschau vereinfacht</span></div>
    <div class="result-card">
      <div class="result-label">Material</div>
      <div class="mat-liste">
        <span class="mat"><i style="background:${farbe(b.basis).hex}"></i>6 × ${farbe(b.basis).de}e Wolle, 1 Stock</span>
        ${[...farbstoffe].map(([f, n]) => `<span class="mat"><i style="background:${farbe(f).hex}"></i>${n} × ${farbe(f).de}er Farbstoff</span>`).join("")}
      </div>
      ${vorlagen.map((v) => `<div class="result-row"><span class="rname"><b style="color:var(--text)">${esc(BANNERVORLAGEN[v].de)}</b>${BANNERVORLAGEN[v].nurBedrock ? " (Bedrock)" : ""}</span><span class="runit">${esc(BANNERVORLAGEN[v].herkunft)}</span></div>`).join("")}
      ${vorlagen.length ? '<p class="result-hint">Bannervorlagen werden im Webstuhl nicht verbraucht.</p>' : ""}
    </div>
    <div class="field-group"><div class="field-group-label">Anleitung · ${erledigt.size}/${schritte.length} erledigt</div>
      <div class="list-stack">${schritte.map((s, n) => `<button class="card schritt ${erledigt.has(n) ? "erledigt" : ""}" data-aktion="banner-schritt" data-id="${b.id}" data-n="${n}">
        <span class="schritt-nr">${erledigt.has(n) ? "✓" : n + 1}</span><span>${esc(s)}</span></button>`).join("")}</div>
    </div>
    <div class="knopf-raster">
      <button class="btn-primary" data-aktion="banner-bearbeiten" data-id="${b.id}">Bearbeiten</button>
      <button class="btn-danger" data-aktion="banner-loeschen" data-id="${b.id}">Löschen</button>
    </div>
  </div>`;
  sheetOeffnen("banner", html, "overworld");
}

function bannerEditorOeffnen(id){
  const b = id ? bn.liste.find((x) => x.id === id) : null;
  bn.entwurf = b ? JSON.parse(JSON.stringify(b)) : { id:null, name:"", basis:"white", ebenen:[] };
  bannerEditorRendern();
}
function bannerEditorRendern(){
  const e = bn.entwurf;
  const scroll = st.sheet === "banner-editor" ? $sheet.scrollTop : 0;
  const farbOptionen = (wert) => FARBEN.map((f) => `<option value="${f.id}" ${f.id === wert ? "selected" : ""}>${f.de}</option>`).join("");
  const musterOptionen = (wert) => `<optgroup label="Grundformen">${MUSTER.filter((m) => !BANNERVORLAGEN[m.id] || BANNERVORLAGEN[m.id].nurBedrock).map((m) => `<option value="${m.id}" ${m.id === wert ? "selected" : ""}>${m.en}</option>`).join("")}</optgroup>
    <optgroup label="Mit Bannervorlage">${MUSTER.filter((m) => BANNERVORLAGEN[m.id] && !BANNERVORLAGEN[m.id].nurBedrock).map((m) => `<option value="${m.id}" ${m.id === wert ? "selected" : ""}>${m.en}</option>`).join("")}</optgroup>`;
  const html = kopfHtml(e.id ? "Banner bearbeiten" : "Neuer Banner", "Grundfarbe + bis zu 6 Muster-Ebenen") + `<div class="orte-inhalt">
    <div class="banner-gross"><img class="banner-bild" src="${bannerBild(e)}" alt="Vorschau"></div>
    <div class="field-group"><div class="field-group-label">Name</div>
      <input class="orte-eingabe" id="bannerName" maxlength="60" placeholder="z. B. Creeper-Schädel" value="${esc(e.name)}"></div>
    <div class="field-group"><div class="field-group-label">Grundfarbe · ${farbe(e.basis).de}</div>
      <div class="farbraster">${FARBEN.map((f) => `<button class="farbfeld ${f.id === e.basis ? "aktiv" : ""}" data-basis="${f.id}" style="background:${f.hex}" aria-label="${f.de}"></button>`).join("")}</div></div>
    <div class="field-group"><div class="field-group-label">Ebenen · ${e.ebenen.length}/${MAX_EBENEN}</div>
      <div class="list-stack">${e.ebenen.map((l, n) => `<div class="card ebene">
        <span class="schritt-nr">${n + 1}</span>
        <i class="farbpunkt" style="background:${farbe(l.farbe).hex}"></i>
        <select class="orte-eingabe" data-ebene-farbe="${n}" aria-label="Farbe">${farbOptionen(l.farbe)}</select>
        <select class="orte-eingabe" data-ebene-muster="${n}" aria-label="Muster">${musterOptionen(l.muster)}</select>
        <span class="ebene-knoepfe">
          <button class="icon-btn" data-aktion="ebene-hoch" data-n="${n}" aria-label="Nach oben" ${n ? "" : "disabled"}>↑</button>
          <button class="icon-btn" data-aktion="ebene-weg" data-n="${n}" aria-label="Entfernen">✕</button>
        </span>
      </div>`).join("")}</div>
      ${e.ebenen.length >= MAX_EBENEN
        ? '<div class="banner warn">Im Webstuhl passen maximal 6 Muster auf ein Banner.</div>'
        : '<button class="btn-secondary" data-aktion="ebene-neu">+ Ebene hinzufügen</button>'}
    </div>
    <div class="banner" id="bannerMeldung" hidden></div>
    <div class="sheet-fuss"><button class="btn-secondary" data-aktion="schliessen">Abbrechen</button>
      <button class="btn-primary" data-aktion="banner-speichern">Speichern</button></div>
  </div>`;
  sheetOeffnen("banner-editor", html, "overworld");
  $sheet.scrollTop = scroll;
}
async function bannerSpeichern(){
  const e = bn.entwurf;
  e.name = document.getElementById("bannerName").value.trim();
  if(!e.name) return banner(document.getElementById("bannerMeldung"), "bad", "Bitte einen Namen eingeben.");
  const body = JSON.stringify({ name:e.name, basis:e.basis, ebenen:e.ebenen });
  const r = e.id ? await api(`/banner/${e.id}`, { method:"PUT", body }) : await api("/banner", { method:"POST", body });
  if(!r.ok) return banner(document.getElementById("bannerMeldung"), "bad", meldungAus(r));
  const neu = r.data.banner;
  const i = bn.liste.findIndex((x) => x.id === neu.id);
  if(i >= 0) bn.liste[i] = neu; else bn.liste.unshift(neu);
  render(); bannerDetailOeffnen(neu.id); toast("Banner gespeichert");
}

document.getElementById("bannerSuche").addEventListener("input", (e) => { bn.suche = e.target.value; renderBanner(); });
$bannerListe.addEventListener("click", (e) => { const k = e.target.closest("[data-banner]"); if(k) bannerDetailOeffnen(k.dataset.banner); });
document.getElementById("bannerNeuBtn").addEventListener("click", () => bannerEditorOeffnen(null));

/* ============================================================================
   9e · RÜSTUNG  ·  Sets aus 4 Teilen: Material + Rüstungsbesatz + Besatzmaterial
                    + Verzauberungs-Plan (Amboss-Reihenfolge mit wenig XP)
   ----------------------------------------------------------------------------
   API:  GET /ruestung → { sets }   POST /ruestung   PUT /ruestung/:id   DELETE /ruestung/:id
         set = { id, name, teile:{ helm|brust|hose|stiefel:{ material, besatz, besatzMaterial, verzaubern } }, von }
   ========================================================================== */
const TEILE = Object.freeze([
  { id:"helm", de:"Helm" }, { id:"brust", de:"Brustpanzer" }, { id:"hose", de:"Hose" }, { id:"stiefel", de:"Stiefel" },
]);
const RUESTUNGS_MATERIAL = Object.freeze([
  { id:"leder", de:"Leder", hex:"#a06540" }, { id:"kette", de:"Kette", hex:"#8a8f94" },
  { id:"kupfer", de:"Kupfer", hex:"#c8764f" }, { id:"eisen", de:"Eisen", hex:"#c9cdcf" },
  { id:"gold", de:"Gold", hex:"#e9c44d" }, { id:"diamant", de:"Diamant", hex:"#4aedd9" },
  { id:"netherit", de:"Netherit", hex:"#4c4447" }, { id:"schildkroete", de:"Schildkrötenpanzer", hex:"#47bf4a", nurHelm:true },
]);
const BESATZ_MATERIAL = Object.freeze([
  { id:"eisen", de:"Eisenbarren", hex:"#d7dada" }, { id:"kupfer", de:"Kupferbarren", hex:"#b4684d" },
  { id:"gold", de:"Goldbarren", hex:"#deb12d" }, { id:"lapis", de:"Lapislazuli", hex:"#416e97" },
  { id:"smaragd", de:"Smaragd", hex:"#11a036" }, { id:"diamant", de:"Diamant", hex:"#6eecd2" },
  { id:"netherit", de:"Netheritbarren", hex:"#625859" }, { id:"redstone", de:"Redstone", hex:"#971607" },
  { id:"amethyst", de:"Amethystscherbe", hex:"#9a5cc6" }, { id:"quarz", de:"Netherquarz", hex:"#e3d4c4" },
  { id:"harz", de:"Harzziegel", hex:"#fc7812" },
]);
const rMat = (id) => RUESTUNGS_MATERIAL.find((m) => m.id === id) || RUESTUNGS_MATERIAL[6];
const bMat = (id) => BESATZ_MATERIAL.find((m) => m.id === id) || null;
const trimVon = (id) => SAMMELOBJEKTE.find((o) => o.id === id && !o.aufwertung) || null;

/* Verzauberungs-Pläne je Teil – beste Verzauberung mit wenig XP (Vorlage: lighthousepng).
   XP-Werte gelten für die Java Edition; in Bedrock können sie leicht abweichen.
   Schritt = [links, rechts, xp]; links/rechts: { teil:true|false, v:[Verzauberungen] } */
const T = (...v) => ({ teil:true, v }), B = (...v) => ({ teil:false, v });
const VERZAUBERUNG = Object.freeze({
  helm:    { ziel:["Schutz IV", "Haltbarkeit III", "Atmung III", "Wasseraffinität", "Reparatur"], schritte:[
    [T(), B("Atmung III"), 6], [B("Schutz IV"), B("Reparatur"), 2], [T("Atmung III"), B("Schutz IV", "Reparatur"), 8],
    [B("Haltbarkeit III"), B("Wasseraffinität"), 2], [T("Atmung III", "Schutz IV", "Reparatur"), B("Haltbarkeit III", "Wasseraffinität"), 9]] },
  brust:   { ziel:["Schutz IV", "Haltbarkeit III", "Reparatur"], schritte:[
    [T(), B("Schutz IV"), 4], [B("Haltbarkeit III"), B("Reparatur"), 4], [T("Schutz IV"), B("Haltbarkeit III", "Reparatur"), 5]] },
  hose:    { ziel:["Schutz IV", "Haltbarkeit III", "Reparatur", "Huschen III"], schritte:[
    [T(), B("Huschen III"), 12], [B("Haltbarkeit III"), B("Reparatur"), 2], [T("Huschen III"), B("Haltbarkeit III", "Reparatur"), 7],
    [T("Huschen III", "Haltbarkeit III", "Reparatur"), B("Schutz IV"), 7]] },
  stiefel: { ziel:["Schutz IV", "Haltbarkeit III", "Reparatur", "Wasserläufer III", "Seelenläufer III", "Federfall IV"], schritte:[
    [T(), B("Seelenläufer III"), 12], [B("Wasserläufer III"), B("Federfall IV"), 3], [T("Seelenläufer III"), B("Wasserläufer III", "Federfall IV"), 11],
    [B("Schutz IV"), B("Haltbarkeit III"), 2], [B("Schutz IV", "Haltbarkeit III"), B("Reparatur"), 10],
    [T("Seelenläufer III", "Wasserläufer III", "Federfall IV"), B("Schutz IV", "Haltbarkeit III", "Reparatur"), 11]] },
});
const xpSumme = (teil) => VERZAUBERUNG[teil].schritte.reduce((n, s) => n + s[2], 0);

const rs = { sets:[], entwurf:null, offen:null };
const $ruestungListe = document.getElementById("ruestungListe");

async function ruestungLaden(){
  const r = await api("/ruestung");
  if(!r.ok) return toast(meldungAus(r), true);
  rs.sets = r.data.sets;
  if(aktivesModul === "ruestung") render();
}

/** Vereinfachte Rüstungsständer-Grafik: Teile in Materialfarbe, Besatz als Bänder */
function ruestungSvg(set, gross){
  const form = {
    helm:    [[20, 4, 20, 16]],
    brust:   [[14, 22, 32, 26], [5, 22, 8, 22], [47, 22, 8, 22]],
    hose:    [[17, 49, 12, 22], [31, 49, 12, 22]],
    stiefel: [[16, 73, 13, 10], [31, 73, 13, 10]],
  };
  const teile = TEILE.map(({ id }) => {
    const t = set.teile[id]; if(!t?.material) return "";
    const m = rMat(t.material), b = t.besatz && bMat(t.besatzMaterial);
    return form[id].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${m.hex}" stroke="rgba(0,0,0,.45)" stroke-width="1"/>`
      + (b ? `<rect x="${x + 2}" y="${y + h * 0.3}" width="${w - 4}" height="2" fill="${b.hex}"/><rect x="${x + 2}" y="${y + h * 0.65}" width="${w - 4}" height="2" fill="${b.hex}"/>` : "")).join("");
  }).join("");
  return `<svg class="ruestung-svg ${gross ? "gross" : ""}" viewBox="0 0 60 92" aria-hidden="true">
    <rect x="28" y="20" width="4" height="72" fill="rgba(255,255,255,.08)"/><rect x="12" y="86" width="36" height="5" rx="1" fill="rgba(255,255,255,.12)"/>${teile}</svg>`;
}

/** Wie viele der benötigten Rüstungsbesätze hat die Welt schon (laut Sammelobjekte)? */
function besatzStand(set){
  const benoetigt = TEILE.map(({ id }) => set.teile[id]?.besatz).filter(Boolean);
  return { benoetigt, vorhanden:benoetigt.filter((b) => sam.status[b]).length };
}

function renderRuestung(){
  $ruestungListe.innerHTML = rs.sets.map((s) => {
    const { benoetigt, vorhanden } = besatzStand(s);
    return `<button class="card ruestung-karte" data-set="${s.id}">
      ${ruestungSvg(s)}
      <span class="ruestung-text">
        <span class="card-title">${esc(s.name)}</span>
        ${TEILE.map(({ id, de }) => {
          const t = s.teile[id]; if(!t) return "";
          const tr = trimVon(t.besatz), bm = bMat(t.besatzMaterial);
          return `<span class="card-meta teil-zeile"><b>${de}</b> ${rMat(t.material).de}${tr ? ` · ${esc(tr.name)}${bm ? ` <i class="farbpunkt klein" style="background:${bm.hex}"></i>` : ""}` : ""}</span>`;
        }).join("")}
        ${benoetigt.length ? `<span class="pill ${vorhanden === benoetigt.length ? "" : "offen"}">Besätze ${vorhanden}/${benoetigt.length} vorhanden</span>` : ""}
      </span>
    </button>`;
  }).join("") || '<div class="empty-list">Noch keine Rüstungs-Sets. Unten „Neues Set“ antippen.</div>';
}

function schritteErledigt(setId, teil){ return new Set(lsLesen(`ruestung.schritte.${setId}.${teil}`) || []); }
const gegenstand = (seite, teilName) => seite.teil
  ? `<b>${esc(teilName)}</b>${seite.v.length ? `<br><small>${seite.v.map(esc).join(", ")}</small>` : ""}`
  : `<b>Buch</b><br><small>${seite.v.map(esc).join(", ")}</small>`;

function ruestungDetailOeffnen(id){
  const s = rs.sets.find((x) => x.id === id); if(!s) return;
  const teileHtml = TEILE.map(({ id:teil, de }) => {
    const t = s.teile[teil]; if(!t) return "";
    const tr = trimVon(t.besatz), bm = bMat(t.besatzMaterial), status = tr && sam.status[tr.id];
    const plan = VERZAUBERUNG[teil], erledigt = schritteErledigt(s.id, teil), offen = rs.offen === teil;
    return `<div class="card">
      <div class="result-row"><span class="card-title">${de}</span><span class="pill">${esc(rMat(t.material).de)}</span></div>
      ${tr ? `<div class="teil-besatz">
          <span>Rüstungsbesatz <b>${esc(tr.name)}</b> <small>${esc(tr.en)}</small>${bm ? ` · <i class="farbpunkt klein" style="background:${bm.hex}"></i> ${esc(bm.de)}` : ""}</span>
          ${status ? `<span class="banner ok kompakt">✓ vorhanden – ${esc(status.von)}</span>`
                   : `<button class="banner warn kompakt" data-aktion="zum-sammelobjekt" data-id="${tr.id}">Fehlt noch – Fundort: ${esc(tr.kategorie)} ›</button>`}
        </div>` : '<div class="card-meta">Ohne Rüstungsbesatz</div>'}
      ${t.verzaubern ? `<button class="verz-kopf" data-aktion="verz-auf" data-teil="${teil}">
          <span><span class="field-label">Verzauberung · ${erledigt.size}/${plan.schritte.length} · ${xpSumme(teil)} XP</span><br>${plan.ziel.map(esc).join(" · ")}</span>
          <span class="ach-cat-chevron" style="${offen ? "transform:rotate(180deg)" : ""}">${CHEVRON}</span>
        </button>
        ${offen ? `<div class="list-stack">${plan.schritte.map(([l, r, xp], n) => `<button class="card schritt amboss ${erledigt.has(n) ? "erledigt" : ""}" data-aktion="verz-schritt" data-id="${s.id}" data-teil="${teil}" data-n="${n}">
            <span class="schritt-nr">${erledigt.has(n) ? "✓" : n + 1}</span>
            <span class="amboss-seite">${gegenstand(l, de)}</span><span class="plus">+</span><span class="amboss-seite">${gegenstand(r, de)}</span>
            <span class="xp">${xp}<small>XP</small></span></button>`).join("")}
          <p class="result-hint">Reihenfolge mit wenig XP (Vorlage: lighthousepng) · XP-Werte aus der Java Edition, in Bedrock leicht abweichend.</p></div>` : ""}` : ""}
    </div>`;
  }).join("");
  const { benoetigt, vorhanden } = besatzStand(s);
  const zaehlen = (liste) => [...liste.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())];
  const besaetze = zaehlen(benoetigt), materialien = zaehlen(TEILE.map(({ id }) => s.teile[id]?.besatz && s.teile[id]?.besatzMaterial).filter(Boolean));
  const xp = TEILE.filter(({ id }) => s.teile[id]?.verzaubern).reduce((n, { id }) => n + xpSumme(id), 0);
  const html = kopfHtml(esc(s.name), `Rüstungs-Set${s.von ? ` · von ${esc(s.von)}` : ""}`) + `<div class="orte-inhalt">
    <div class="ruestung-kopf">${ruestungSvg(s, true)}
      <div class="result-card" style="flex:1">
        <div class="result-label">Benötigt</div>
        ${besaetze.map(([b, n]) => `<div class="card-meta">${n} × ${esc(trimVon(b)?.name)}-Rüstungsbesatz ${sam.status[b] ? "✓" : ""}</div>`).join("") || '<div class="card-meta">Keine Rüstungsbesätze</div>'}
        ${materialien.map(([m, n]) => `<div class="card-meta"><i class="farbpunkt klein" style="background:${bMat(m).hex}"></i> ${n} × ${esc(bMat(m).de)}</div>`).join("")}
        ${xp ? `<div class="card-meta">Verzaubern: ${xp} XP-Level</div>` : ""}
        ${benoetigt.length ? `<span class="pill ${vorhanden === benoetigt.length ? "" : "offen"}">${vorhanden}/${benoetigt.length} Besätze vorhanden</span>` : ""}
      </div>
    </div>
    ${besaetze.some(([, n]) => n > 1) ? '<div class="banner info">Ein Rüstungsbesatz wird beim Anbringen verbraucht. Mehrfach benötigte vorher vervielfältigen: Vorlage + 7 Diamanten + passender Block.</div>' : ""}
    ${teileHtml}
    <div class="knopf-raster">
      <button class="btn-primary" data-aktion="set-bearbeiten" data-id="${s.id}">Bearbeiten</button>
      <button class="btn-danger" data-aktion="set-loeschen" data-id="${s.id}">Löschen</button>
    </div>
  </div>`;
  const scroll = st.sheet === "ruestung" ? $sheet.scrollTop : 0;
  sheetOeffnen("ruestung", html, "overworld");
  $sheet.scrollTop = scroll;
}

function ruestungEditorOeffnen(id){
  const s = id ? rs.sets.find((x) => x.id === id) : null;
  const leer = () => ({ material:"netherit", besatz:null, besatzMaterial:null, verzaubern:true });
  rs.entwurf = s ? JSON.parse(JSON.stringify(s)) : { id:null, name:"", teile:{ helm:leer(), brust:leer(), hose:leer(), stiefel:leer() } };
  ruestungEditorRendern();
}
function ruestungEditorRendern(){
  const e = rs.entwurf;
  const scroll = st.sheet === "ruestung-editor" ? $sheet.scrollTop : 0;
  const teile = TEILE.map(({ id, de }) => {
    const t = e.teile[id];
    return `<div class="card">
      <div class="card-title">${de}</div>
      <div class="zwei-spalten">
        <select class="orte-eingabe" data-teil="${id}" data-feld="material" aria-label="Material">${RUESTUNGS_MATERIAL.filter((m) => !m.nurHelm || id === "helm").map((m) => `<option value="${m.id}" ${m.id === t.material ? "selected" : ""}>${m.de}</option>`).join("")}</select>
        <select class="orte-eingabe" data-teil="${id}" data-feld="besatz" aria-label="Rüstungsbesatz">
          <option value="">Ohne Besatz</option>
          ${SAM_ZAEHLT.map((o) => `<option value="${o.id}" ${o.id === t.besatz ? "selected" : ""}>${o.name}${sam.status[o.id] ? " ✓" : ""}</option>`).join("")}
        </select>
      </div>
      ${t.besatz ? `<select class="orte-eingabe" data-teil="${id}" data-feld="besatzMaterial" aria-label="Besatzmaterial">
          <option value="">Besatzmaterial wählen …</option>
          ${BESATZ_MATERIAL.map((m) => `<option value="${m.id}" ${m.id === t.besatzMaterial ? "selected" : ""}>${m.de}</option>`).join("")}</select>` : ""}
      <label class="opt" style="padding:4px 2px"><span class="otext"><span class="oname" style="font-size:14px">Verzaubern</span><span class="odesc" style="display:block">${VERZAUBERUNG[id].ziel.join(" · ")}</span></span>
        <button class="switch ${t.verzaubern ? "on" : ""}" data-aktion="teil-verzaubern" data-teil="${id}" role="switch" aria-checked="${t.verzaubern}"></button></label>
    </div>`;
  }).join("");
  const html = kopfHtml(e.id ? "Set bearbeiten" : "Neues Rüstungs-Set", "✓ = Besatz ist in dieser Welt schon gefunden") + `<div class="orte-inhalt">
    <div class="ruestung-kopf">${ruestungSvg(e, true)}
      <div class="field-group" style="flex:1"><div class="field-group-label">Name</div>
        <input class="orte-eingabe" id="setName" maxlength="60" placeholder="z. B. Amethyst-Netherit" value="${esc(e.name)}"></div></div>
    ${teile}
    <div class="banner" id="setMeldung" hidden></div>
    <div class="sheet-fuss"><button class="btn-secondary" data-aktion="schliessen">Abbrechen</button>
      <button class="btn-primary" data-aktion="set-speichern">Speichern</button></div>
  </div>`;
  sheetOeffnen("ruestung-editor", html, "overworld");
  $sheet.scrollTop = scroll;
}
async function ruestungSpeichern(){
  const e = rs.entwurf;
  e.name = document.getElementById("setName").value.trim();
  const $m = document.getElementById("setMeldung");
  if(!e.name) return banner($m, "bad", "Bitte einen Namen eingeben.");
  const ohneMaterial = TEILE.find(({ id }) => e.teile[id].besatz && !e.teile[id].besatzMaterial);
  if(ohneMaterial) return banner($m, "bad", `${ohneMaterial.de}: Besatzmaterial fehlt.`);
  const body = JSON.stringify({ name:e.name, teile:e.teile });
  const r = e.id ? await api(`/ruestung/${e.id}`, { method:"PUT", body }) : await api("/ruestung", { method:"POST", body });
  if(!r.ok) return banner($m, "bad", meldungAus(r));
  const neu = r.data.set;
  const i = rs.sets.findIndex((x) => x.id === neu.id);
  if(i >= 0) rs.sets[i] = neu; else rs.sets.unshift(neu);
  render(); ruestungDetailOeffnen(neu.id); toast("Set gespeichert");
}

$ruestungListe.addEventListener("click", (e) => { const k = e.target.closest("[data-set]"); if(k){ rs.offen = null; ruestungDetailOeffnen(k.dataset.set); } });
document.getElementById("ruestungNeuBtn").addEventListener("click", () => ruestungEditorOeffnen(null));

