import { useState } from 'react';
import { Sheet } from '../komponenten/Sheet';
import { alsZahl, DimensionWahl, Gruppe, KoordFeld, Option } from '../komponenten/Eingaben';
import { koordinatenErkennen, type Position } from '../lib/koordinaten';
import { thema, type BoardZustand, type Dimension } from '../lib/typen';
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
      sub="Nur auf diesem Handy – zeigt Entfernung und Richtung zu jedem Ort"
      thema={thema(dimension)}
      schliessen={schliessen}
      fuss={
        <>
          {standort && <button className="btn-secondary" onClick={() => { setzen(null); schliessen(); }}>Entfernen</button>}
          <button
            className="btn-primary breit"
            disabled={!gueltig}
            onClick={() => { setzen({ x: alsZahl(x)!, y: alsZahl(y), z: alsZahl(z)!, dimension }); schliessen(); }}
          >
            Übernehmen
          </button>
        </>
      }
    >
      <Gruppe label="Dimension">
        <DimensionWahl wert={dimension} setzen={setDimension} />
      </Gruppe>
      <Gruppe label="Position">
        <div className="koord-reihe">
          <KoordFeld achse="X" wert={x} setzen={setX} />
          <KoordFeld achse="Y" wert={y} setzen={setY} optional />
          <KoordFeld achse="Z" wert={z} setzen={setZ} />
        </div>
      </Gruppe>
      <Gruppe label="Text einfügen (optional)">
        <input className="eingabe mono" placeholder="F3+C, /tp oder „X: … Z: …“" onChange={(e) => eingefuegt(e.target.value)} />
      </Gruppe>
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
    <Sheet titel="Optionen" sub={`Angemeldet als ${name}`} schliessen={schliessen}>
      <Gruppe label="Name der Welt">
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="eingabe" value={titel} maxLength={60} onChange={(e) => setTitel(e.target.value)} />
          <button className="btn-primary" disabled={!titel.trim() || titel === zustand.einstellungen.titel} onClick={() => speichern({ titel })}>
            OK
          </button>
        </div>
      </Gruppe>
      <div>
        <Option
          name="QR-Code auf der Anzeige"
          beschreibung="Zeigt Adresse und PIN zum Beitreten"
          an={zustand.einstellungen.qrZeigen}
          setzen={(an) => speichern({ qrZeigen: an })}
        />
      </div>
      <Gruppe label="Daten">
        <button className="btn-secondary" onClick={exportieren}>Alle {zustand.orte.length} Orte als JSON exportieren</button>
      </Gruppe>
      <Gruppe label="Konto">
        <button className="btn-secondary" onClick={abmelden}>Name ändern / abmelden</button>
      </Gruppe>
    </Sheet>
  );
}
