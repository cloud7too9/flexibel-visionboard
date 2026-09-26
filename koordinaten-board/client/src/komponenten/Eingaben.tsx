import type { ReactNode } from 'react';
import { DIMENSIONEN, KATEGORIEN, type Dimension, type Kategorie } from '../lib/typen';
import { zahl } from '../lib/koordinaten';
import { Icon } from './Icon';

/** Feldgruppe mit kleiner Großbuchstaben-Beschriftung */
export function Gruppe({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="feld-gruppe">
      <div className="feld-label">{label}</div>
      {children}
    </div>
  );
}

/** Eingabe einer Koordinate. Die ±-Taste ersetzt das fehlende Minus der iOS-Zifferntastatur. */
export function KoordFeld({ achse, wert, setzen, optional }: {
  achse: 'X' | 'Y' | 'Z';
  wert: string;
  setzen: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="koord-feld">
      <span className="feld-label">{achse}</span>
      <span className="rahmen">
        <input
          className="eingabe"
          inputMode="numeric"
          autoComplete="off"
          placeholder={optional ? '—' : '0'}
          value={wert}
          onChange={(e) => setzen(e.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, ''))}
          aria-label={`${achse}-Koordinate`}
        />
        <button
          type="button"
          className="vorzeichen"
          onClick={() => setzen(wert.startsWith('-') ? wert.slice(1) : `-${wert}`)}
          aria-label={`Vorzeichen von ${achse} umkehren`}
        >
          ±
        </button>
      </span>
    </label>
  );
}

export const alsZahl = (wert: string): number | null => {
  if (wert === '' || wert === '-') return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

/** HUD-Chip „X 40 Y 89 Z −19“ */
export function KoordChip({ x, y, z, klein }: { x: number; y: number | null; z: number; klein?: boolean }) {
  const inhalt = (
    <>
      <span className="lbl">X</span><span className="v">{zahl(x)}</span>
      {y !== null && <><span className="lbl">Y</span><span className="v">{zahl(y)}</span></>}
      <span className="lbl">Z</span><span className="v">{zahl(z)}</span>
    </>
  );
  return klein ? <span className="coord mono">{inhalt}</span> : <span className="chip coord mono">{inhalt}</span>;
}

export function DimensionWahl({ wert, setzen }: { wert: Dimension; setzen: (d: Dimension) => void }) {
  return (
    <div className="segmente" role="radiogroup" aria-label="Dimension">
      {DIMENSIONEN.map((d) => (
        <button
          key={d.wert}
          type="button"
          role="radio"
          aria-checked={wert === d.wert}
          className={`seg-btn ${wert === d.wert ? 'active' : ''}`}
          onClick={() => setzen(d.wert)}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

export function KategorieWahl({ wert, setzen }: { wert: Kategorie; setzen: (k: Kategorie) => void }) {
  return (
    <div className="kategorien" role="radiogroup" aria-label="Kategorie">
      {KATEGORIEN.map((k) => (
        <button
          key={k.wert}
          type="button"
          role="radio"
          aria-checked={wert === k.wert}
          className={wert === k.wert ? 'active' : ''}
          onClick={() => setzen(k.wert)}
        >
          <Icon name={k.wert} groesse={22} />
          {k.label}
        </button>
      ))}
    </div>
  );
}

/** Schalter-Zeile wie „Optionen“ in der Live-Karte */
export function Option({ name, beschreibung, an, setzen }: {
  name: string;
  beschreibung?: string;
  an: boolean;
  setzen: (an: boolean) => void;
}) {
  return (
    <label className="opt">
      <span className="otext">
        <span className="oname" style={{ display: 'block' }}>{name}</span>
        {beschreibung && <span className="odesc" style={{ display: 'block' }}>{beschreibung}</span>}
      </span>
      <input type="checkbox" className="switch" checked={an} onChange={(e) => setzen(e.target.checked)} />
    </label>
  );
}
