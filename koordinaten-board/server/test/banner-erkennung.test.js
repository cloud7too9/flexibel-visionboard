import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bannerAuswerten, bannerAuslesen, schrittLesen } from '../src/banner-erkennung.js';
import { screenshotAuslesen, erkennungBeenden } from '../src/erkennung.js';

const zeilen = (...texte) => texte.map((text) => ({ text }));
const REZEPT = [
  { muster: 'border', farbe: 'cyan' },
  { muster: 'rhombus', farbe: 'light_blue' },
  { muster: 'border', farbe: 'black' },
  { muster: 'flower', farbe: 'black' },
  { muster: 'square_top_left', farbe: 'black' },
  { muster: 'square_bottom_right', farbe: 'black' },
];

test('Schritte mit englischen Namen, auch mit OCR-Störungen', () => {
  assert.deepEqual(schrittLesen('1 Black Base | i - |'), { farbe: 'black', muster: 'stripe_bottom' });
  assert.deepEqual(schrittLesen('3 Light Blue Lozenge Cl'), { farbe: 'light_blue', muster: 'rhombus' });
  assert.deepEqual(schrittLesen('5 Fs Black Flower Charge *'), { farbe: 'black', muster: 'flower' });
  assert.deepEqual(schrittLesen('7 F Black Base Sinister Canton'), { farbe: 'black', muster: 'square_bottom_right' });
  assert.deepEqual(schrittLesen('Light Grey Per Fess'), { farbe: 'light_gray', muster: 'half_horizontal' });
  assert.deepEqual(schrittLesen('Magenta Bordure lndented'), { farbe: 'magenta', muster: 'curly_border' });   // l statt I
  assert.equal(schrittLesen('Stronghold (Stairway)'), null);
  assert.equal(schrittLesen('X: -1,884 Z: -524'), null);
});

test('Anleitung → Grundfarbe und Ebenen (Text wie aus der OCR)', () => {
  const b = bannerAuswerten(zeilen(
    '1 Black Base | i - |', ': |', '2 | Cyan Bordure Cl', '|', '3 Light Blue Lozenge Cl', 'r BN', '. .',
    'A | Black Bordure 1 oo', '5 Fs Black Flower Charge *', '- |', '6 i Black Chief Dexter Canton |', '7 F Black Base Sinister Canton',
  ));
  assert.deepEqual(b, { basis: 'black', ebenen: REZEPT, unklar: [] });
});

test('Fehlende Grundfarbe, unklare Zeilen, keine Anleitung', () => {
  const ohne = bannerAuswerten(zeilen('2 Cyan Bordure', '3 Light Blue Lozenge', '4 Blak Bordur3xx'));
  assert.equal(ohne.basis, null);
  assert.equal(ohne.ebenen.length, 2);
  assert.deepEqual(ohne.unklar, ['4 Blak Bordur3xx']);
  assert.equal(bannerAuswerten(zeilen('1 Black Base')), null);   // nur das Banner, kein Muster
  assert.equal(bannerAuswerten(zeilen('Dimension: Overworld', 'Stronghold (Stairway)', 'X: -1,884 Z: -524')), null);
});

test('Echter Screenshot: Anleitung wird erkannt, Seed-Map bleibt ein Ort', { timeout: 60_000 }, async () => {
  const rezept = readFileSync(fileURLToPath(new URL('../../../referenz/banner/rezept-beispiel.jpg', import.meta.url)));
  assert.equal((await screenshotAuslesen(rezept)).erkannt, null);
  assert.deepEqual(await bannerAuslesen(rezept, 'image/jpeg'), { basis: 'black', ebenen: REZEPT, unklar: [] });
  const seedmap = readFileSync(fileURLToPath(new URL('../../../referenz/seedmap/stronghold-popup.png', import.meta.url)));
  assert.equal((await screenshotAuslesen(seedmap)).erkannt.name, 'Stronghold (Stairway)');
  assert.equal(await bannerAuslesen(Buffer.from('kein Bild'), 'image/webp'), null);   // WebP wird nicht vorbereitet
});

after(() => erkennungBeenden());
