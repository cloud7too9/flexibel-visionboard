import type { Dimension } from './typen';

export interface Position {
  x: number;
  y: number | null;
  z: number;
  dimension: Dimension;
}

/**
 * Zahl mit schmalem Leerzeichen als Tausendertrenner („−1 884“).
 * Kein Punkt/Komma – das würde bei Koordinaten wie eine Kommazahl aussehen.
 */
export const zahl = (n: number) =>
  `${n < 0 ? '−' : ''}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F')}`;

/** Oberwelt ↔ Nether (Faktor 8). Ende hat kein Gegenstück. */
export function umrechnen(p: Pick<Position, 'x' | 'z' | 'dimension'>): { x: number; z: number; dimension: Dimension } | null {
  if (p.dimension === 'oberwelt') return { x: Math.floor(p.x / 8), z: Math.floor(p.z / 8), dimension: 'nether' };
  if (p.dimension === 'nether') return { x: p.x * 8, z: p.z * 8, dimension: 'oberwelt' };
  return null;
}
