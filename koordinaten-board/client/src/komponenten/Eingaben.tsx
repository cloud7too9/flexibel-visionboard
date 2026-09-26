import { DIMENSIONEN, KATEGORIEN, type Dimension, type Kategorie } from '../lib/typen';
import { Icon } from './Icon';

/** Eingabe einer Koordinate. Die ±-Taste ersetzt das fehlende Minus der iOS-Zifferntastatur. */
export function KoordFeld({ achse, wert, setzen, optional }: {
  achse: 'X' | 'Y' | 'Z';
  wert: string;
  setzen: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div className="koord-feld">
      <label>{achse}</label>
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
    </div>
  );
}

export const alsZahl = (wert: string): number | null => {
  if (wert === '' || wert === '-') return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

export function DimensionWahl({ wert, setzen }: { wert: Dimension; setzen: (d: Dimension) => void }) {
  return (
    <div className="segmente" role="radiogroup" aria-label="Dimension">
      {DIMENSIONEN.map((d) => (
        <button
          key={d.wert}
          type="button"
          role="radio"
          aria-checked={wert === d.wert}
          className={`dim-${d.wert} ${wert === d.wert ? 'aktiv' : ''}`}
          onClick={() => setzen(d.wert)}
        >
          <span className="punkt" /> {d.label}
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
          className={wert === k.wert ? 'aktiv' : ''}
          onClick={() => setzen(k.wert)}
        >
          <Icon name={k.wert} groesse={22} />
          {k.label}
        </button>
      ))}
    </div>
  );
}
