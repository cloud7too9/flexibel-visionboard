import type { FeatureTyp, Operation, Ort } from '../lib/typen';

/** Was alle Sheets der Steuerung brauchen */
export interface Werkzeuge {
  token: string;
  orte: Ort[];
  typen: FeatureTyp[];
  senden: (op: Operation) => Promise<void>;
  meldung: (text: string, fehler?: boolean) => void;
}

/** Findet einen vorhandenen Ort an (fast) derselben Stelle – gegen doppelte Einträge. */
export function duplikatFinden(orte: Ort[], x: number, z: number, dimension: Ort['dimension'], ohneId?: string) {
  return orte.find((o) => o.id !== ohneId && o.dimension === dimension && Math.abs(o.x - x) <= 3 && Math.abs(o.z - z) <= 3);
}
