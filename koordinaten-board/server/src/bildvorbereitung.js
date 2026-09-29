// Bilder für die Texterkennung vorbereiten. Tesseract liest weiße Schrift auf grauem
// Grund (z. B. Banner-Anleitungen mit „Black Base“, „Cyan Bordure“ …) gar nicht.
// Vergrößern, Graustufen und ein harter Schwellwert machen daraus schwarze Schrift
// auf Weiß. Reines JavaScript (jpeg-js, pngjs), läuft auch auf dem Raspberry Pi.
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const MAX_PIXEL = 6_000_000;   // Zielgröße begrenzen – große Handy-Screenshots brauchen keine Vergrößerung

/** JPEG/PNG → { breite, hoehe, daten (RGBA) } – andere Formate (WebP) werden nicht vorbereitet */
export function dekodieren(buffer, mimetype) {
  if (mimetype === 'image/jpeg') {
    const b = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 256 });
    return { breite: b.width, hoehe: b.height, daten: b.data };
  }
  if (mimetype === 'image/png') {
    const b = PNG.sync.read(buffer);
    return { breite: b.width, hoehe: b.height, daten: b.data };
  }
  return null;
}

/**
 * Graustufen, bilinear vergrößert, dann Schwarz-Weiß:
 *   schrift 'hell'   – helle Schrift (Helligkeit > 185) wird schwarz, alles andere weiß
 *   schrift 'dunkel' – dunkle Schrift (Helligkeit < 70) wird schwarz
 * Gibt ein PNG (Buffer) zurück.
 */
export function fuerTexterkennung({ breite, hoehe, daten }, { schrift = 'hell', faktor = 3 } = {}) {
  const grau = new Float32Array(breite * hoehe);
  for (let i = 0; i < grau.length; i += 1) {
    grau[i] = 0.299 * daten[i * 4] + 0.587 * daten[i * 4 + 1] + 0.114 * daten[i * 4 + 2];
  }
  const f = Math.max(1, Math.min(faktor, Math.sqrt(MAX_PIXEL / (breite * hoehe))));
  const B = Math.round(breite * f), H = Math.round(hoehe * f);
  const ziel = new PNG({ width: B, height: H });
  const schwarz = schrift === 'hell' ? (v) => v > 185 : (v) => v < 70;
  for (let y = 0; y < H; y += 1) {
    const sy = Math.min(hoehe - 1, Math.max(0, (y + 0.5) / f - 0.5));
    const y0 = Math.floor(sy), y1 = Math.min(hoehe - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < B; x += 1) {
      const sx = Math.min(breite - 1, Math.max(0, (x + 0.5) / f - 0.5));
      const x0 = Math.floor(sx), x1 = Math.min(breite - 1, x0 + 1), fx = sx - x0;
      const oben = grau[y0 * breite + x0] * (1 - fx) + grau[y0 * breite + x1] * fx;
      const unten = grau[y1 * breite + x0] * (1 - fx) + grau[y1 * breite + x1] * fx;
      const wert = schwarz(oben * (1 - fy) + unten * fy) ? 0 : 255;
      const i = (y * B + x) * 4;
      ziel.data[i] = ziel.data[i + 1] = ziel.data[i + 2] = wert;
      ziel.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(ziel, { colorType: 0 });
}
