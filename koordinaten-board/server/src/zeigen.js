// „Auf die Anzeige werfen“: Ein Handy (z. B. die Companion) schickt eine Karte,
// die Anzeige zeigt sie groß, bis die nächste kommt oder jemand sie wegnimmt.
// Das Board kennt keine Companion-Bereiche – die Karte besteht aus allgemeinen
// Blöcken, damit neue Inhalte ohne Änderung am Board dazukommen können.
//
// karte = {
//   titel, unter?, bereich?, quelle?, typ?, dimension: 'oberwelt'|'nether'|'ende'|null,
//   bloecke: [
//     { art:'koordinaten', label?, x, y|null, z, dimension? },
//     { art:'zeilen', zeilen:[{ label, wert }] },
//     { art:'text', text },
//   ]
// }
// quelle: frei wählbare Kennung des Absenders (z. B. „ort:<id>“), damit er
// erkennt, dass gerade sein Inhalt gezeigt wird.
// typ: Feature-Typ der Seed Map (z. B. „Nether Fortress“) – hat die Anzeige dafür
// einen Kennblock, zeigt sie ihn neben dem Titel.

const DIMENSIONEN = ['oberwelt', 'nether', 'ende'];
const WELTGRENZE = 30_000_000;
const GRENZEN = { titel: 80, unter: 120, bereich: 40, quelle: 80, typ: 40, label: 40, wert: 80, text: 400, bloecke: 6, zeilen: 8 };

class Ungueltig extends Error {}

function text(wert, max, feld, pflicht = false) {
  if (wert == null || wert === '') {
    if (pflicht) throw new Ungueltig(`${feld} fehlt`);
    return undefined;
  }
  if (typeof wert !== 'string') throw new Ungueltig(`${feld} muss Text sein`);
  const t = wert.trim();
  if (pflicht && !t) throw new Ungueltig(`${feld} fehlt`);
  if (t.length > max) throw new Ungueltig(`${feld} ist zu lang (höchstens ${max} Zeichen)`);
  return t || undefined;
}

function koordinate(wert, feld, optional = false) {
  if (optional && wert == null) return null;
  if (!Number.isInteger(wert) || Math.abs(wert) > WELTGRENZE) throw new Ungueltig(`${feld} muss eine ganze Zahl sein`);
  return wert;
}

function dimension(wert, optional = true) {
  if (wert == null && optional) return null;
  if (!DIMENSIONEN.includes(wert)) throw new Ungueltig('Unbekannte Dimension');
  return wert;
}

function block(b) {
  switch (b?.art) {
    case 'koordinaten':
      return {
        art: 'koordinaten',
        label: text(b.label, GRENZEN.label, 'Beschriftung'),
        x: koordinate(b.x, 'X'),
        y: koordinate(b.y, 'Y', true),
        z: koordinate(b.z, 'Z'),
        dimension: dimension(b.dimension),
      };
    case 'zeilen': {
      if (!Array.isArray(b.zeilen) || !b.zeilen.length) throw new Ungueltig('Zeilen fehlen');
      if (b.zeilen.length > GRENZEN.zeilen) throw new Ungueltig(`Höchstens ${GRENZEN.zeilen} Zeilen`);
      return {
        art: 'zeilen',
        zeilen: b.zeilen.map((z) => ({
          label: text(z?.label, GRENZEN.label, 'Beschriftung', true),
          wert: text(z?.wert, GRENZEN.wert, 'Wert', true),
        })),
      };
    }
    case 'text':
      return { art: 'text', text: text(b.text, GRENZEN.text, 'Text', true) };
    default:
      throw new Ungueltig('Unbekannter Block');
  }
}

/** Prüft eine Karte vom Handy. Gibt { karte } (bereinigt) oder { fehler } zurück. */
export function kartePruefen(roh) {
  try {
    if (!roh || typeof roh !== 'object') throw new Ungueltig('Karte fehlt');
    if (!Array.isArray(roh.bloecke)) throw new Ungueltig('Blöcke fehlen');
    if (roh.bloecke.length > GRENZEN.bloecke) throw new Ungueltig(`Höchstens ${GRENZEN.bloecke} Blöcke`);
    return {
      karte: {
        titel: text(roh.titel, GRENZEN.titel, 'Titel', true),
        unter: text(roh.unter, GRENZEN.unter, 'Untertitel'),
        bereich: text(roh.bereich, GRENZEN.bereich, 'Bereich'),
        quelle: text(roh.quelle, GRENZEN.quelle, 'Quelle'),
        typ: text(roh.typ, GRENZEN.typ, 'Typ'),
        dimension: dimension(roh.dimension),
        bloecke: roh.bloecke.map(block),
      },
    };
  } catch (fehler) {
    if (fehler instanceof Ungueltig) return { fehler: fehler.message };
    throw fehler;
  }
}
