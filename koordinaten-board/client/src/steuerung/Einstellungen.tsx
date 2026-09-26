import { useState } from 'react';
import { Sheet } from '../komponenten/Sheet';
import { alsZahl, DimensionWahl, KoordFeld } from '../komponenten/Eingaben';
import { koordinatenErkennen, type Position } from '../lib/koordinaten';
import type { BoardZustand, Dimension } from '../lib/typen';
import type { Werkzeuge } from './werkzeuge';

/** Eigener Standort – bleibt nur auf diesem Handy, sortiert die Liste nach Entfernung. */
export function StandortSheet({ standort, setzen, schliessen }: {
  standort: Position | null;
  setzen: (p: Position | null) => void;
  schliessen: () => void;
}) {
  const [x, setX] = useState(standort ? String(standort.x) : '');
  const [y, setY] = useState(standort?.y != null ? String(standort.y) : '');
  const [z, setZ] = useState(standort ? String(standort.z) : '');
  const [dimension, setDimension] = useState<Dimension>(standort?.dimension ?? 'oberwelt');
  const gueltig = alsZahl(x) !== null && alsZahl(z) !== null;

  const eingefuegt = (text: string) => {
    const k = koordinatenErkennen(text);
    if (!k) return;
    if (k.x !== undefined) setX(String(k.x));
    if (k.z !== undefined) setZ(String(k.z));
    setY(k.y != null ? String(k.y) : '');
    if (k.dimension) setDimension(k.dimension);
  };

  return (
    <Sheet
      titel="Mein Standort"
      schliessen={schliessen}
      fuss={
        <>
          {standort && <button className="knopf" onClick={() => { setzen(null); schliessen(); }}>Entfernen</button>}
          <button
            className="knopf primaer breit"
            disabled={!gueltig}
            onClick={() => { setzen({ x: alsZahl(x)!, y: alsZahl(y), z: alsZahl(z)!, dimension }); schliessen(); }}
          >
            Übernehmen
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.5 }}>
        Trag ein, wo du gerade im Spiel stehst. Die Liste zeigt dann Entfernung und Richtung zu jedem Ort. Nur auf deinem Handy.
      </p>
      <input className="eingabe mono" placeholder="Koordinaten einfügen (optional)" onChange={(e) => eingefuegt(e.target.value)} />
      <div className="koord-reihe">
        <KoordFeld achse="X" wert={x} setzen={setX} />
        <KoordFeld achse="Y" wert={y} setzen={setY} optional />
        <KoordFeld achse="Z" wert={z} setzen={setZ} />
      </div>
      <DimensionWahl wert={dimension} setzen={setDimension} />
    </Sheet>
  );
}

export function EinstellungenSheet({ zustand, name, abmelden, schliessen, senden, meldung }: Pick<Werkzeuge, 'senden' | 'meldung'> & {
  zustand: BoardZustand;
  name: string;
  abmelden: () => void;
  schliessen: () => void;
}) {
  const [titel, setTitel] = useState(zustand.einstellungen.titel);

  const speichern = (felder: Partial<BoardZustand['einstellungen']>) =>
    senden({ art: 'einstellungen', felder }).then(() => meldung('Gespeichert')).catch((e) => meldung(String(e), true));

  const exportieren = () => {
    const blob = new Blob([JSON.stringify(zustand.orte, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `koordinaten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <Sheet titel="Einstellungen" schliessen={schliessen}>
      <label className="feld">
        <span>Name der Welt (steht oben auf der Anzeige)</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="eingabe" value={titel} maxLength={60} onChange={(e) => setTitel(e.target.value)} />
          <button className="knopf" disabled={!titel.trim() || titel === zustand.einstellungen.titel} onClick={() => speichern({ titel })}>
            OK
          </button>
        </div>
      </label>
      <label className="schalter">
        <span>QR-Code und PIN auf der Anzeige zeigen</span>
        <input type="checkbox" checked={zustand.einstellungen.qrZeigen} onChange={(e) => speichern({ qrZeigen: e.target.checked })} />
      </label>
      <button className="knopf" onClick={exportieren}>Alle Orte als JSON exportieren</button>
      <div className="detail-info">Angemeldet als <strong>{name}</strong></div>
      <button className="knopf" onClick={abmelden}>Name ändern / abmelden</button>
    </Sheet>
  );
}
