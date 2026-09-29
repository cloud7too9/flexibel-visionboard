import { useState } from 'react';
import { Sheet } from '../komponenten/Sheet';
import { Icon } from '../komponenten/Icon';
import { OrtIcon } from '../komponenten/OrtIcon';
import { entfernung, entfernungText, tpBefehl, umrechnen, zahl, type Position } from '../lib/koordinaten';
import { kopieren } from '../lib/upload';
import { dimensionLabel, kategorieLabel, thema, type Ort } from '../lib/typen';
import type { Werkzeuge } from './werkzeuge';

interface Props extends Pick<Werkzeuge, 'senden' | 'meldung'> {
  ort: Ort;
  standort: Position | null;
  bearbeiten: () => void;
  schliessen: () => void;
}

export function OrtDetail({ ort, standort, bearbeiten, schliessen, senden, meldung }: Props) {
  const [loeschenBestaetigen, setLoeschenBestaetigen] = useState(false);
  const u = umrechnen(ort);
  const weg = standort ? entfernung(standort, ort) : null;

  const kopiere = async (text: string, was: string) => {
    try {
      await kopieren(text);
      meldung(`${was} kopiert`);
    } catch {
      meldung('Kopieren nicht möglich', true);
    }
  };

  const loeschen = async () => {
    try {
      await senden({ art: 'entfernen', id: ort.id });
      meldung(`„${ort.name}“ gelöscht`);
      schliessen();
    } catch (err) {
      meldung(String(err), true);
    }
  };

  const anheften = () =>
    senden({ art: 'aendern', id: ort.id, felder: { angeheftet: !ort.angeheftet } })
      .then(() => meldung(ort.angeheftet ? 'Nicht mehr angeheftet' : 'Auf der Anzeige angeheftet'))
      .catch((err) => meldung(String(err), true));

  return (
    <Sheet
      titel={ort.name}
      sub={<>{dimensionLabel(ort.dimension)} · {ort.typ || kategorieLabel(ort.kategorie)}</>}
      bild={<OrtIcon typ={ort.typ} kategorie={ort.kategorie} groesse={22} />}
      thema={thema(ort.dimension)}
      schliessen={schliessen}
    >
      <div className="result-coords">
        <div><span className="lbl">X</span><b>{zahl(ort.x)}</b></div>
        <div><span className="lbl">Y</span><b>{ort.y !== null ? zahl(ort.y) : '—'}</b></div>
        <div><span className="lbl">Z</span><b>{zahl(ort.z)}</b></div>
      </div>

      <div className="hud-zeile">
        {u && (
          <span className="chip portal-chip mono">
            <span className="pico">⟷</span> {dimensionLabel(u.dimension)} <b>{zahl(u.x)} / {zahl(u.z)}</b>
          </span>
        )}
        {weg && (
          <span className="chip portal-chip mono">
            <span className="pico">➤</span> <b>{entfernungText(weg.meter)}</b> {weg.richtung}{weg.umgerechnet ? ' (umgerechnet)' : ''}
          </span>
        )}
      </div>

      {ort.notiz && <div className="card" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14 }}>{ort.notiz}</div>}
      {ort.datei && <img className="bild" src={`/medien/${ort.datei}`} alt={`Bild zu ${ort.name}`} />}

      <div className="knopf-raster">
        <button className="btn-secondary" onClick={() => kopiere(`${ort.x} ${ort.y ?? '~'} ${ort.z}`, 'Koordinaten')}>
          <Icon name="kopieren" groesse={18} /> Koordinaten
        </button>
        <button className="btn-secondary" onClick={() => kopiere(tpBefehl(ort), 'Teleport-Befehl')}>
          <Icon name="kopieren" groesse={18} /> /tp-Befehl
        </button>
        <button className="btn-secondary" onClick={anheften}>
          <Icon name="pin" groesse={18} /> {ort.angeheftet ? 'Lösen' : 'Anheften'}
        </button>
        <button className="btn-primary" onClick={bearbeiten}>
          <Icon name="stift" groesse={18} /> Bearbeiten
        </button>
      </div>

      {loeschenBestaetigen ? (
        <div className="knopf-raster">
          <button className="btn-secondary" onClick={() => setLoeschenBestaetigen(false)}>Abbrechen</button>
          <button className="btn-danger" onClick={loeschen}>Wirklich löschen</button>
        </div>
      ) : (
        <button className="btn-danger" onClick={() => setLoeschenBestaetigen(true)}>
          <Icon name="muell" groesse={18} /> Löschen
        </button>
      )}

      <div className="kicker" style={{ textAlign: 'center' }}>
        Eingetragen von {ort.erstelltVon} · {new Date(ort.erstelltAm).toLocaleDateString('de-DE')}
      </div>
    </Sheet>
  );
}
