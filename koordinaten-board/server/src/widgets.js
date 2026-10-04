// Widgets des Dashboards (companion/widgets): Widget-Typ + Quelle → fertige Karte.
// Gebaut mit denselben Anzeigeschemas wie „Aufs Board“ in der Companion
// (companion/board-karten.js), geprüft mit zeigen.js. Das Dashboard rendert nur
// die Karte und kennt die Bereiche nicht.
import { PNG } from 'pngjs';
import { regeln, karten } from './regeln.js';
import { kartePruefen } from './zeigen.js';

const DIM_NAMEN = { overworld: 'Oberwelt', nether: 'Nether', end: 'End' };

/**
 * Widget-Typ (IDs wie im Register des Dashboards) → Anzeigeschema aus BOARD_KARTEN.
 * quelle: Art der Quelle, die eine Instanz beim Hinzufügen wählt.
 * hinweis: Typ ohne Inhalt (Bereich geplant oder noch nicht festgelegt).
 */
export const WIDGETS = Object.freeze({
  'karte.gesamtkarte': { art: 'welt' },
  'karte.einzelkoordinate': { art: 'ort', quelle: 'ort' },
  'karte.koordinatensammlung': { hinweis: 'Koordinatensammlungen sind noch nicht festgelegt' },
  'sammelobjekte.gesamtauflistung': { art: 'sammelliste' },
  'sammelobjekte.eigeneliste': { hinweis: 'Eigene Listen sind noch nicht festgelegt' },
  'sammelobjekte.einzelobjekt': { art: 'sammel', quelle: 'sammel' },
  'sammelobjekte.status': { art: 'sammelstand' },
  'portale.verbindungen': { art: 'portalliste' },
  'handbuch.eintrag': { hinweis: 'Bereich geplant' },
  'handbuch.materialliste': { hinweis: 'Bereich geplant' },
  'bauplaene.bauplan': { hinweis: 'Bereich geplant' },
  'banner.banner': { art: 'banner', quelle: 'banner' },
  'ruestung.set': { art: 'ruestung', quelle: 'ruestung' },
});

/** RGBA → PNG als Data-URL (für die Banner-Vorschau; in der Companion malt das ein Canvas) */
export function pngDaten(breite, hoehe, rgba) {
  const png = new PNG({ width: breite, height: hoehe });
  png.data = Buffer.from(rgba);
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

/** Daten der aktiven Welt im Kontext der Anzeigeschemas (siehe board-karten.js) */
function kontext(daten) {
  const welt = daten.aktiveWelt();
  const w = welt ? daten.weltLesen(welt.id) : null;
  return {
    welt: w?.welt ?? null,
    dimensionen: w?.dimensionen ?? [],
    typen: w?.typen ?? [],
    instanzen: w?.instanzen ?? [],
    sammelStatus: welt ? daten.sammelLesen(welt.id).status : {},
    verbindungen: welt ? daten.portaleListe(welt.id) : [],
    banner: daten.bannerListe(),
    ruestung: daten.ruestungListe(),
    standort: null,
    pngDaten,
  };
}

/** Was eine Instanz als Quelle wählen kann – [{ id, name, unter? }] */
function quellenVon(art, ctx) {
  switch (art) {
    case 'ort':
      return ctx.instanzen.map((i) => {
        const t = ctx.typen.find((x) => x.id === i.featureTypeId);
        const dim = ctx.dimensionen.find((d) => d.id === i.dimensionId)?.type;
        const eigen = t?.kategorie === regeln.EIGENE_ORTE;
        return {
          id: i.id,
          name: (eigen ? t.variante : t?.variante ? `${t.kategorie} (${t.variante})` : t?.kategorie) ?? 'Ort',
          unter: `${DIM_NAMEN[dim] ?? ''} · X ${karten.zahl(i.x)} · Z ${karten.zahl(i.z)}`,
        };
      });
    case 'sammel':
      return regeln.SAMMELOBJEKTE.map((o) => ({
        id: o.id, name: o.name,
        unter: `${karten.strukturName(o.kategorie)} · ${ctx.sammelStatus[o.id] ? 'gefunden' : 'offen'}`,
      }));
    case 'banner':
      return ctx.banner.map((b) => ({ id: b.id, name: b.name }));
    case 'ruestung':
      return ctx.ruestung.map((s) => ({ id: s.id, name: s.name }));
    default:
      return [];
  }
}

/**
 * Karte für ein Widget: { karte } oder { karte: null, hinweis } (geplant, keine Welt, Quelle gelöscht).
 * null, wenn es den Typ nicht gibt.
 */
export async function widgetKarte(daten, typ, quelle) {
  const w = WIDGETS[typ];
  if (!w) return null;
  if (w.hinweis) return { karte: null, hinweis: w.hinweis };
  if (w.quelle && !quelle) return { karte: null, hinweis: 'Keine Quelle gewählt' };
  const ctx = kontext(daten);
  if (!ctx.welt && !['banner', 'ruestung'].includes(w.art)) return { karte: null, hinweis: 'Noch keine Welt auf dem Board' };
  const roh = await karten.BOARD_KARTEN[w.art].karte(ctx, w.quelle ? quelle : '');
  if (!roh) return { karte: null, hinweis: 'Die Quelle gibt es nicht mehr' };
  const { karte, fehler } = kartePruefen(roh);
  if (fehler) throw new Error(`Karte für ${typ} ungültig: ${fehler}`);
  return { karte };
}

/** Quellen für einen Typ: { quelle: Art | null, quellen } – null, wenn es den Typ nicht gibt */
export function widgetQuellen(daten, typ) {
  const w = WIDGETS[typ];
  if (!w) return null;
  return { quelle: w.quelle ?? null, quellen: w.quelle ? quellenVon(w.quelle, kontext(daten)) : [] };
}
