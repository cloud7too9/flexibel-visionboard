// Banner-Anleitungen aus Screenshots auslesen (Wunsch von Max: Banner automatisch speichern).
//
// Solche Anleitungen listen die Schritte als „<Farbe> <Muster>“ mit den englischen Namen:
//   1  Black Base                 ← Schritt 1 ist das Banner selbst (Grundfarbe)
//   2  Cyan Bordure
//   3  Light Blue Lozenge
//   …  Black Base Sinister Canton
// Die Namen stehen in companion/regeln.js (FARBEN-IDs, MUSTER[].en) – hier wird nur
// unscharf zugeordnet, weil die Texterkennung Buchstaben verwechselt.
import { regeln } from './regeln.js';
import { abstand, texterkennung } from './erkennung.js';
import { dekodieren, fuerTexterkennung } from './bildvorbereitung.js';

// „light_blue“ → „light blue“; Grau auch britisch
const FARBEN = regeln.FARBEN.flatMap((f) => {
  const name = f.id.replace('_', ' ');
  return [name, ...(name.includes('gray') ? [name.replace('gray', 'grey')] : [])].map((n) => ({ id: f.id, name: n, woerter: n.split(' ').length }));
}).sort((a, b) => b.woerter - a.woerter);
const MUSTER = regeln.MUSTER.map((m) => ({ id: m.id, name: m.en.toLowerCase() }));
const GRUND = 'stripe_bottom';   // „Base“ – in Schritt 1 das Banner selbst

/** erlaubte Tippfehler je nach Länge */
const toleranz = (text) => (text.length <= 4 ? 0 : text.length <= 8 ? 1 : 2);

function farbeFinden(woerter) {
  for (const f of FARBEN) {
    if (woerter.length < f.woerter) continue;
    const kandidat = woerter.slice(0, f.woerter).join(' ');
    if (abstand(kandidat, f.name) <= toleranz(f.name)) return { id: f.id, woerter: f.woerter };
  }
  return null;
}

/** Längster Anfang der Wörter, der ein Muster ist („Base Sinister Canton“ vor „Base“) */
function musterFinden(woerter) {
  for (let n = Math.min(woerter.length, 4); n >= 1; n -= 1) {
    const kandidat = woerter.slice(0, n).join(' ');
    let bestes = null;
    for (const m of MUSTER) {
      const d = abstand(kandidat, m.name);
      if (d <= toleranz(m.name) && (!bestes || d < bestes.d)) bestes = { id: m.id, d };
    }
    if (bestes) return bestes.id;
  }
  return null;
}

/** Eine OCR-Zeile → { farbe, muster } oder null. Bis zu zwei Störwörter vorn werden übersprungen. */
export function schrittLesen(text) {
  const woerter = String(text).split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z-]/g, '').toLowerCase())
    .filter((w) => w.length > 0);
  for (let start = 0; start <= Math.min(2, woerter.length - 2); start += 1) {
    const farbe = farbeFinden(woerter.slice(start));
    if (!farbe) continue;
    const muster = musterFinden(woerter.slice(start + farbe.woerter));
    if (muster) return { farbe: farbe.id, muster };
  }
  return null;
}

/**
 * OCR-Zeilen einer Banner-Anleitung → { basis, ebenen:[{ muster, farbe }], unklar:[text] } oder null.
 * basis ist null, wenn Schritt 1 („<Farbe> Base“) fehlt. unklar: nummerierte Zeilen,
 * die wie ein Schritt aussehen, aber nicht zugeordnet werden konnten.
 */
export function bannerAuswerten(zeilen) {
  const schritte = [], unklar = [];
  for (const { text } of zeilen) {
    const s = schrittLesen(text);
    if (s) schritte.push(s);
    else if (/^\s*[1-9]\s*\W*\s*[A-Za-z]{3,}/.test(text)) unklar.push(text.trim());
  }
  const mitGrund = schritte[0]?.muster === GRUND;
  const ebenen = (mitGrund ? schritte.slice(1) : schritte).map(({ muster, farbe }) => ({ muster, farbe }));
  if (ebenen.length < (mitGrund ? 1 : 2)) return null;   // zu wenig für eine Anleitung
  return { basis: mitGrund ? schritte[0].farbe : null, ebenen, unklar };
}

/**
 * Screenshot (Buffer) → Banner oder null. Erst helle Schrift auf dunklerem Grund versuchen
 * (typische Anleitungen), dann dunkle Schrift auf hellem Grund.
 */
export async function bannerAuslesen(bild, mimetype) {
  const roh = dekodieren(bild, mimetype);
  if (!roh) return null;
  let bestes = null;
  for (const schrift of ['hell', 'dunkel']) {
    const { zeilen } = await texterkennung(fuerTexterkennung(roh, { schrift }));
    const b = bannerAuswerten(zeilen);
    if (b && (!bestes || b.ebenen.length + (b.basis ? 1 : 0) > bestes.ebenen.length + (bestes.basis ? 1 : 0))) bestes = b;
    if (bestes?.basis) break;
  }
  return bestes;
}
