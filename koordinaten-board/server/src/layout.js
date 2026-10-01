// Layout einer Anzeige (Widget-Dashboard, Phase A6): Layer mit Widget-Instanzen
// in Zellen des Rasters mit 32 Spalten. Der Server prüft nur die Form; Größen und
// Kollisionen kennt das Register des Dashboards (companion/widgets), das beim
// Laden ohnehin normalisiert.
//
// layout = { layer: [{ id, name, instanzen: [{ id, typ, stufe, x, y, quelle? }] }], aktiverLayer }

const SPALTEN = 32;
const GRENZEN = { layer: 12, instanzen: 64, id: 60, name: 40, stufe: 30, quelle: 80, y: 200 };

class Ungueltig extends Error {}
const pruefen = (ok, text) => { if (!ok) throw new Ungueltig(text); };

const text = (wert, max, feld) => {
  pruefen(typeof wert === 'string' && wert.trim().length > 0, `${feld} fehlt`);
  const t = wert.trim();
  pruefen(t.length <= max, `${feld} ist zu lang (höchstens ${max} Zeichen)`);
  return t;
};

const ganz = (wert, min, max, feld) => {
  pruefen(Number.isInteger(wert) && wert >= min && wert <= max, `${feld} muss eine ganze Zahl von ${min} bis ${max} sein`);
  return wert;
};

function instanz(i, typen) {
  pruefen(i && typeof i === 'object', 'Widget fehlt');
  const typ = text(i.typ, GRENZEN.id, 'Widget-Typ');
  pruefen(typen.includes(typ), `Unbekannter Widget-Typ „${typ}“`);
  return {
    id: text(i.id, GRENZEN.id, 'Widget-ID'),
    typ,
    stufe: text(i.stufe, GRENZEN.stufe, 'Stufe'),
    x: ganz(i.x, 0, SPALTEN - 1, 'x'),
    y: ganz(i.y, 0, GRENZEN.y, 'y'),
    ...(i.quelle == null || i.quelle === '' ? {} : { quelle: text(i.quelle, GRENZEN.quelle, 'Quelle') }),
  };
}

/**
 * Prüft ein Layout und gibt es bereinigt zurück: { layout } oder { fehler }.
 * typen: die Widget-Typen, die es gibt (WIDGETS aus widgets.js).
 */
export function layoutPruefen(body, typen) {
  try {
    pruefen(body && Array.isArray(body.layer), 'Layer fehlen');
    pruefen(body.layer.length >= 1 && body.layer.length <= GRENZEN.layer, `1 bis ${GRENZEN.layer} Layer`);
    const layer = body.layer.map((l) => {
      pruefen(l && typeof l === 'object' && Array.isArray(l.instanzen), 'Layer ohne Widgets');
      pruefen(l.instanzen.length <= GRENZEN.instanzen, `Höchstens ${GRENZEN.instanzen} Widgets je Layer`);
      const instanzen = l.instanzen.map((i) => instanz(i, typen));
      pruefen(new Set(instanzen.map((i) => i.id)).size === instanzen.length, 'Widget-IDs doppelt');
      return { id: text(l.id, GRENZEN.id, 'Layer-ID'), name: text(l.name, GRENZEN.name, 'Layer-Name'), instanzen };
    });
    pruefen(new Set(layer.map((l) => l.id)).size === layer.length, 'Layer-IDs doppelt');
    const aktiverLayer = layer.some((l) => l.id === body.aktiverLayer) ? body.aktiverLayer : layer[0].id;
    return { layout: { layer, aktiverLayer } };
  } catch (f) {
    if (f instanceof Ungueltig) return { fehler: f.message };
    throw f;
  }
}

/** Reihen, die eine Anzeige aus ihrer Bildschirmgröße meldet */
export const reihenGueltig = (reihen) => Number.isInteger(reihen) && reihen >= 1 && reihen <= GRENZEN.y;
