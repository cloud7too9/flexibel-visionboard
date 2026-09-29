import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kartePruefen } from '../src/zeigen.js';

const ort = {
  titel: ' Stronghold (Stairway) ',
  unter: 'Stronghold · Oberwelt',
  bereich: 'Karte',
  quelle: 'ort:i_3',
  typ: 'Stronghold',
  dimension: 'oberwelt',
  bloecke: [
    { art: 'koordinaten', x: -1884, y: 40, z: -524 },
    { art: 'koordinaten', label: 'Im Nether', x: -236, y: null, z: -66, dimension: 'nether' },
  ],
};

test('Ort-Karte wird angenommen und bereinigt', () => {
  const { karte, fehler } = kartePruefen(ort);
  assert.equal(fehler, undefined);
  assert.equal(karte.titel, 'Stronghold (Stairway)');
  assert.equal(karte.typ, 'Stronghold');
  assert.equal(karte.bloecke.length, 2);
  assert.deepEqual(karte.bloecke[1], { art: 'koordinaten', label: 'Im Nether', x: -236, y: null, z: -66, dimension: 'nether' });
  assert.equal(karte.bloecke[0].dimension, null);
});

test('Zeilen und Text', () => {
  const { karte } = kartePruefen({
    titel: 'Hauptbasis', dimension: null,
    bloecke: [{ art: 'zeilen', zeilen: [{ label: 'Status', wert: 'Verbunden' }] }, { art: 'text', text: 'Hinweis' }],
  });
  assert.deepEqual(karte.bloecke, [
    { art: 'zeilen', zeilen: [{ label: 'Status', wert: 'Verbunden' }] },
    { art: 'text', text: 'Hinweis' },
  ]);
});

test('Bild-Block: PNG als Data-URL, kein SVG, nicht zu groß', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const { karte } = kartePruefen({ titel: 'Wappen', dimension: null, bloecke: [{ art: 'bild', daten: png, label: 'Vorschau', pixelig: 1 }] });
  assert.deepEqual(karte.bloecke[0], { art: 'bild', daten: png, label: 'Vorschau', pixelig: true });
  const mit = (daten) => kartePruefen({ titel: 'x', dimension: null, bloecke: [{ art: 'bild', daten }] }).fehler;
  assert.equal(mit('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), 'Bild muss PNG, JPEG oder WebP als Data-URL sein');
  assert.equal(mit('https://example.org/bild.png'), 'Bild muss PNG, JPEG oder WebP als Data-URL sein');
  assert.equal(mit(`data:image/png;base64,${'A'.repeat(300_000)}`), 'Bild ist zu groß (höchstens 200 KB)');
});

test('Ungültige Karten werden mit Grund abgelehnt', () => {
  const mit = (aenderung) => kartePruefen({ ...ort, ...aenderung }).fehler;
  assert.equal(kartePruefen(null).fehler, 'Karte fehlt');
  assert.equal(mit({ titel: '  ' }), 'Titel fehlt');
  assert.equal(mit({ titel: 'x'.repeat(81) }), 'Titel ist zu lang (höchstens 80 Zeichen)');
  assert.equal(mit({ dimension: 'overworld' }), 'Unbekannte Dimension');
  assert.equal(mit({ typ: 42 }), 'Typ muss Text sein');
  assert.equal(mit({ typ: 'x'.repeat(41) }), 'Typ ist zu lang (höchstens 40 Zeichen)');
  assert.equal(mit({ bloecke: [{ art: 'koordinaten', x: 1.5, y: null, z: 0 }] }), 'X muss eine ganze Zahl sein');
  assert.equal(mit({ bloecke: [{ art: 'koordinaten', x: 1, y: null, z: 40_000_000 }] }), 'Z muss eine ganze Zahl sein');
  assert.equal(mit({ bloecke: [{ art: 'html', inhalt: '<script>' }] }), 'Unbekannter Block');
  assert.equal(mit({ bloecke: Array(7).fill({ art: 'text', text: 'a' }) }), 'Höchstens 6 Blöcke');
  assert.equal(mit({ bloecke: [{ art: 'zeilen', zeilen: [{ label: 'a', wert: 5 }] }] }), 'Wert muss Text sein');
});
