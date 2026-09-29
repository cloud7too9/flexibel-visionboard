// Rüstungs-Baukasten – setzt Minecraft-Bedrock-Rüstung aus Ebenen zusammen.
// Keine Abhängigkeiten. Läuft im Browser (Canvas 2D).
//
//   import { erstelleBaukasten } from './baukasten.js';
//   const manifest = await (await fetch('ruestungs-baukasten/manifest.json')).json();
//   const bk = erstelleBaukasten({ manifest, basisPfad: 'ruestungs-baukasten/' });
//   const icon = await bk.itemIcon({ ruestung: 'diamond', teil: 'chestplate', material: 'gold' });
//   const figur = await bk.figur({ ausruestung: { helmet: { ruestung: 'iron', muster: 'coast', material: 'iron' } } });
//
// Alle Funktionen liefern ein <canvas>. Maße: Item-Icon 16×16, Figur 18×34 Einheiten × massstab.

const GLANZ_FARBE = [128, 64, 204]; // Annäherung an den violetten Verzauberungs-Schimmer

// Flächen im 64×32-Rüstungslayout: [u, v, breite, hoehe] für Vorder- und Rückseite
const RUESTUNG_UV = {
  kopf:    { vorn: [8, 8, 8, 8],   hinten: [24, 8, 8, 8] },
  koerper: { vorn: [20, 20, 8, 12], hinten: [32, 20, 8, 12] },
  armR:    { vorn: [44, 20, 4, 12], hinten: [52, 20, 4, 12] },
  armL:    { vorn: [44, 20, 4, 12], hinten: [52, 20, 4, 12], spiegeln: true },
  beinR:   { vorn: [4, 20, 4, 12],  hinten: [12, 20, 4, 12] },
  beinL:   { vorn: [4, 20, 4, 12],  hinten: [12, 20, 4, 12], spiegeln: true },
};

// Flächen im 64×64-Skin-Layout (Steve, breite Arme)
const SKIN_UV = {
  kopf:    { vorn: [8, 8, 8, 8],    hinten: [24, 8, 8, 8],   ueber: { vorn: [40, 8, 8, 8],   hinten: [56, 8, 8, 8],   d: 0.5 } },
  koerper: { vorn: [20, 20, 8, 12], hinten: [32, 20, 8, 12], ueber: { vorn: [20, 36, 8, 12], hinten: [32, 36, 8, 12], d: 0.25 } },
  armR:    { vorn: [44, 20, 4, 12], hinten: [52, 20, 4, 12], ueber: { vorn: [44, 36, 4, 12], hinten: [52, 36, 4, 12], d: 0.25 } },
  armL:    { vorn: [36, 52, 4, 12], hinten: [44, 52, 4, 12], ueber: { vorn: [52, 52, 4, 12], hinten: [60, 52, 4, 12], d: 0.25 } },
  beinR:   { vorn: [4, 20, 4, 12],  hinten: [12, 20, 4, 12], ueber: { vorn: [4, 36, 4, 12],  hinten: [12, 36, 4, 12], d: 0.25 } },
  beinL:   { vorn: [20, 52, 4, 12], hinten: [28, 52, 4, 12], ueber: { vorn: [4, 52, 4, 12],  hinten: [12, 52, 4, 12], d: 0.25 } },
};

// Position der Körperteile in der Figur (Einheiten = Pixel des Modells), Ansicht von vorn.
// Von hinten tauschen rechte und linke Gliedmaßen die Seite.
const LAGE = {
  vorn:   { kopf: [4, 0, 8, 8], koerper: [4, 8, 8, 12], armR: [0, 8, 4, 12], armL: [12, 8, 4, 12], beinR: [4, 20, 4, 12], beinL: [8, 20, 4, 12] },
  hinten: { kopf: [4, 0, 8, 8], koerper: [4, 8, 8, 12], armR: [12, 8, 4, 12], armL: [0, 8, 4, 12], beinR: [8, 20, 4, 12], beinL: [4, 20, 4, 12] },
};
const ZEICHENFOLGE_SKIN = ['beinR', 'beinL', 'koerper', 'armR', 'armL', 'kopf'];
const ZEICHENFOLGE_RUESTUNG = ['leggings', 'boots', 'chestplate', 'helmet'];

function leinwand(b, h) {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return c;
}
function hexZuRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Graustufen-Besatz (Schlüsselpalette) in eine Materialpalette umfärben
export function paletteTauschen(bild, schluessel, palette) {
  const c = leinwand(bild.width, bild.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(bild, 0, 0);
  const daten = ctx.getImageData(0, 0, c.width, c.height);
  const zuordnung = new Map(schluessel.map((hex, i) => [hexZuRgb(hex)[0], hexZuRgb(palette[i])]));
  const d = daten.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const ziel = zuordnung.get(d[i]);
    if (ziel) { d[i] = ziel[0]; d[i + 1] = ziel[1]; d[i + 2] = ziel[2]; }
  }
  ctx.putImageData(daten, 0, 0);
  return c;
}

// Graustufen-Leder mit einer Farbe multiplizieren (wie im Spiel), Details darüberlegen
export function lederFaerben(basis, overlay, hex) {
  const c = leinwand(basis.width, basis.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(basis, 0, 0);
  const daten = ctx.getImageData(0, 0, c.width, c.height);
  const [r, g, b] = hexZuRgb(hex);
  const d = daten.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    d[i] = Math.round(d[i] * r / 255); d[i + 1] = Math.round(d[i + 1] * g / 255); d[i + 2] = Math.round(d[i + 2] * b / 255);
  }
  ctx.putImageData(daten, 0, 0);
  if (overlay) ctx.drawImage(overlay, 0, 0);
  return c;
}

// Verzauberungs-Schimmer auf alle deckenden Pixel legen (phase 0–1 verschiebt das Muster)
export function glanzAuftragen(ziel, glanzBild, phase = 0, staerke = 0.6) {
  const b = ziel.width, h = ziel.height;
  const schicht = leinwand(b, h);
  const ctx = schicht.getContext('2d');
  ctx.drawImage(ziel, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  const kachel = Math.max(b, h) * 2;
  const versatz = -phase * kachel;
  for (let x = versatz; x < b; x += kachel) for (let y = versatz; y < h; y += kachel) ctx.drawImage(glanzBild, x, y, kachel, kachel);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${GLANZ_FARBE.join(',')})`;
  ctx.fillRect(0, 0, b, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(ziel, 0, 0);
  const zctx = ziel.getContext('2d');
  zctx.save(); zctx.globalAlpha = staerke; zctx.globalCompositeOperation = 'lighter'; zctx.drawImage(schicht, 0, 0); zctx.restore();
  return ziel;
}

export function erstelleBaukasten({ manifest, basisPfad = '', ladeBild }) {
  const cache = new Map();
  const laden = ladeBild || ((pfad) => new Promise((ok, fehl) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fehl(new Error('Bild fehlt: ' + pfad));
    img.src = basisPfad + pfad;
  }));
  const bild = (pfad) => { if (!cache.has(pfad)) cache.set(pfad, laden(pfad)); return cache.get(pfad); };

  const ruestung = (id) => manifest.ruestungen.find((r) => r.id === id);
  const material = (id) => manifest.materialien.find((m) => m.id === id);
  const muster = (id) => manifest.muster.find((m) => m.id === id);
  const teil = (id) => manifest.teile.find((t) => t.id === id);

  // Gleiches Material wie die Rüstung → dunklere Palette (Eisen, Gold, Diamant, Netherit, Kupfer)
  function paletteFuer(ruestungId, materialId) {
    const m = material(materialId);
    const r = ruestung(ruestungId);
    if (r && r.dunkelBeiMaterial === materialId && m.paletteDunkel) return m.paletteDunkel;
    return m.palette;
  }

  async function itemIcon({ ruestung: rId, teil: tId, material: mId = null, farbe = null, glanz = false, glanzPhase = 0 }) {
    const r = ruestung(rId); const t = r.teile[tId];
    if (!t) throw new Error(`${r.name} hat kein Teil „${tId}“`);
    const c = leinwand(16, 16); const ctx = c.getContext('2d');
    if (r.faerbbar) {
      const [basis, ov] = await Promise.all([bild(t.item), t.itemOverlay ? bild(t.itemOverlay) : null]);
      ctx.drawImage(lederFaerben(basis, ov, farbe || manifest.lederStandard), 0, 0);
    } else {
      ctx.drawImage(await bild(t.item), 0, 0);
    }
    if (mId) {
      const overlay = await bild(teil(tId).besatzItem);
      ctx.drawImage(paletteTauschen(overlay, manifest.schluesselPalette, paletteFuer(rId, mId)), 0, 0);
    }
    if (glanz) glanzAuftragen(c, await bild(manifest.glanz.item), glanzPhase);
    return c;
  }

  // Eine 64×32-Rüstungsebene fertig zusammensetzen (Grundtextur + Färbung + Besatz + Glanz)
  async function ruestungsEbene({ ruestung: rId, teil: tId, muster: musterId = null, material: mId = null, farbe = null, glanz = false, glanzPhase = 0 }) {
    const r = ruestung(rId); const schicht = String(teil(tId).schicht);
    const c = leinwand(64, 32); const ctx = c.getContext('2d');
    const basis = await bild(r.modell[schicht]);
    if (r.faerbbar) {
      const ov = r.modell[schicht + '_overlay'] ? await bild(r.modell[schicht + '_overlay']) : null;
      ctx.drawImage(lederFaerben(basis, ov, farbe || manifest.lederStandard), 0, 0);
    } else ctx.drawImage(basis, 0, 0);
    if (musterId && mId) {
      const m = muster(musterId);
      const vorlage = await bild(schicht === '2' ? m.ebene2 : m.ebene1);
      ctx.drawImage(paletteTauschen(vorlage, manifest.schluesselPalette, paletteFuer(rId, mId)), 0, 0);
    }
    if (glanz) glanzAuftragen(c, await bild(manifest.glanz.modell), glanzPhase, 0.45);
    return c;
  }

  function flaecheZeichnen(ctx, quelle, uv, ziel, d, s, spiegeln) {
    const [u, v, w, h] = uv; const [x, y, zb, zh] = ziel;
    const dx = (x - d + 1) * s, dy = (y - d + 1) * s, db = (zb + 2 * d) * s, dh = (zh + 2 * d) * s;
    ctx.save();
    if (spiegeln) { ctx.translate(dx + db, dy); ctx.scale(-1, 1); ctx.drawImage(quelle, u, v, w, h, 0, 0, db, dh); }
    else ctx.drawImage(quelle, u, v, w, h, dx, dy, db, dh);
    ctx.restore();
  }

  // Ganze Figur von vorn oder hinten. ausruestung: { helmet|chestplate|leggings|boots: { ruestung, muster, material, farbe, glanz } }
  async function figur({ ausruestung = {}, ansicht = 'vorn', massstab = 8, skin = true, glanzPhase = 0 } = {}) {
    const s = massstab;
    const c = leinwand(18 * s, 34 * s); const ctx = c.getContext('2d');
    const lage = LAGE[ansicht];
    if (skin) {
      const sk = await bild(manifest.skin);
      for (const bereich of ZEICHENFOLGE_SKIN) flaecheZeichnen(ctx, sk, SKIN_UV[bereich][ansicht], lage[bereich], 0, s, false);
      for (const bereich of ZEICHENFOLGE_SKIN) { const u = SKIN_UV[bereich].ueber; flaecheZeichnen(ctx, sk, u[ansicht], lage[bereich], u.d, s, false); }
    }
    for (const tId of ZEICHENFOLGE_RUESTUNG) {
      const auswahl = ausruestung[tId];
      if (!auswahl || !auswahl.ruestung) continue;
      if (!ruestung(auswahl.ruestung).teile[tId]) continue;
      const ebene = await ruestungsEbene({ ...auswahl, teil: tId, glanzPhase });
      const t = teil(tId);
      for (const bereich of t.bereiche) {
        const uv = RUESTUNG_UV[bereich];
        flaecheZeichnen(ctx, ebene, uv[ansicht], lage[bereich], t.aufblaehen, s, !!uv.spiegeln);
      }
    }
    return c;
  }

  return { itemIcon, ruestungsEbene, figur, paletteFuer, bild, manifest };
}
