import type { Dimension, Ort } from './typen';

export interface Position {
  x: number;
  y: number | null;
  z: number;
  dimension: Dimension;
}

const formatierer = new Intl.NumberFormat('de-DE');
/** Zahl mit Tausenderpunkt, echtes Minuszeichen für bessere Lesbarkeit auf dem Bildschirm */
export const zahl = (n: number) => formatierer.format(n).replace('-', '−');

/** Oberwelt ↔ Nether (Faktor 8). Ende hat kein Gegenstück. */
export function umrechnen(p: Pick<Position, 'x' | 'z' | 'dimension'>): { x: number; z: number; dimension: Dimension } | null {
  if (p.dimension === 'oberwelt') return { x: Math.floor(p.x / 8), z: Math.floor(p.z / 8), dimension: 'nether' };
  if (p.dimension === 'nether') return { x: p.x * 8, z: p.z * 8, dimension: 'oberwelt' };
  return null;
}

export function tpBefehl(ort: Pick<Ort, 'x' | 'y' | 'z' | 'dimension'>): string {
  const y = ort.y ?? '~';
  const welt = { oberwelt: 'overworld', nether: 'the_nether', ende: 'the_end' }[ort.dimension];
  return `/execute in minecraft:${welt} run tp @s ${ort.x} ${y} ${ort.z}`;
}

const RICHTUNGEN = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];

/**
 * Entfernung + Himmelsrichtung von `von` zu `ziel`.
 * Oberwelt/Nether werden ineinander umgerechnet, Ende nur innerhalb des Endes.
 * Minecraft: Norden = −Z, Osten = +X.
 */
export function entfernung(von: Position, ziel: Pick<Ort, 'x' | 'z' | 'dimension'>) {
  let zx = ziel.x;
  let zz = ziel.z;
  if (ziel.dimension !== von.dimension) {
    const umgerechnet = umrechnen(ziel);
    if (!umgerechnet || umgerechnet.dimension !== von.dimension) return null;
    zx = umgerechnet.x;
    zz = umgerechnet.z;
  }
  const dx = zx - von.x;
  const dz = zz - von.z;
  const meter = Math.round(Math.hypot(dx, dz));
  const winkel = (Math.atan2(dx, -dz) * 180) / Math.PI; // 0° = Norden, im Uhrzeigersinn
  const richtung = RICHTUNGEN[Math.round(((winkel + 360) % 360) / 45) % 8];
  return { meter, richtung, umgerechnet: ziel.dimension !== von.dimension };
}

export const entfernungText = (meter: number) =>
  meter >= 1000 ? `${(meter / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km` : `${meter} m`;

/**
 * Erkennt Koordinaten in eingefügtem Text, z. B.
 *  - Java F3+C:  /execute in minecraft:the_nether run tp @s 123.45 64.00 -678.90 12.3 45.6
 *  - /tp @s 100 64 -200
 *  - Bedrock:    Position: 12, 64, -300
 *  - Seed Map:   X: -1,884 Z: -524   (Tausender-Komma, Y optional)
 *  - frei:       x 100 y 64 z -200   oder   100 -200 (nur X/Z)
 */
export function koordinatenErkennen(text: string): Partial<Position> | null {
  if (!text.trim()) return null;
  let dimension: Dimension | undefined;
  if (/the_nether|\bnether\b/i.test(text)) dimension = 'nether';
  else if (/the_end|\bende?\b/i.test(text)) dimension = 'ende';
  else if (/overworld|oberwelt/i.test(text)) dimension = 'oberwelt';

  // Beschriftete Form „X: … (Y: …) Z: …“ – hier sind Tausender-Trennzeichen erlaubt
  const normal = text.replace(/[—–−]/g, '-');
  const beschriftet = normal.match(
    /X\s*[:=]?\s*(-?\s?\d[\d,.' ]*)\s*(?:Y\s*[:=]?\s*(-?\s?\d[\d,.' ]*)\s*)?Z\s*[:=]?\s*(-?\s?\d[\d,.' ]*)/i,
  );
  if (beschriftet) {
    const lesen = (roh?: string) => {
      if (!roh || !/\d/.test(roh)) return null;
      const wert = Number(roh.replace(/\D/g, ''));
      return roh.trim().startsWith('-') ? -wert : wert;
    };
    return { x: lesen(beschriftet[1])!, y: lesen(beschriftet[2]), z: lesen(beschriftet[3])!, ...(dimension && { dimension }) };
  }

  // Bei tp-Befehlen nur den Teil danach auswerten (Rotation am Ende ignorieren)
  const tp = text.match(/tp\s+@\w+\s+(.*)$/i);
  const quelle = tp ? tp[1] : text;
  const zahlen = [...quelle.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Math.floor(Number(m[0])));

  if (zahlen.length >= 3) return { x: zahlen[0], y: zahlen[1], z: zahlen[2], ...(dimension && { dimension }) };
  if (zahlen.length === 2) return { x: zahlen[0], y: null, z: zahlen[1], ...(dimension && { dimension }) };
  return null;
}
