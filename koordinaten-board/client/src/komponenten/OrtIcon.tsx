import { useState } from 'react';
import { kennblockDatei } from '../lib/kennbloecke';
import type { Kategorie } from '../lib/typen';
import { Icon } from './Icon';

/**
 * Symbol eines Orts: der Kennblock der Struktur (PNG), sonst das Linien-Icon der Kategorie.
 * Lädt das Bild nicht, fällt es ebenfalls auf das Linien-Icon zurück (ohne Kategorie: nichts).
 */
export function OrtIcon({ typ, kategorie, groesse }: { typ?: string; kategorie?: Kategorie; groesse: number }) {
  const datei = kennblockDatei(typ);
  const [kaputt, setKaputt] = useState<string | null>(null);
  if (datei && kaputt !== datei) return <img className="kennblock" src={datei} alt="" onError={() => setKaputt(datei)} />;
  return kategorie ? <Icon name={kategorie} groesse={groesse} /> : null;
}
