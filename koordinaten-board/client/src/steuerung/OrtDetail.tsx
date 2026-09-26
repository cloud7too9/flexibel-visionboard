import { useState } from 'react';
import { Sheet } from '../komponenten/Sheet';
import { Icon } from '../komponenten/Icon';
import { entfernung, entfernungText, tpBefehl, umrechnen, zahl, type Position } from '../lib/koordinaten';
import { kopieren } from '../lib/upload';
import { dimensionLabel, kategorieLabel, type Ort } from '../lib/typen';
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
    <Sheet titel={ort.name} schliessen={schliessen}>
      <div className="detail-koords">
        <div><small>X</small><strong>{zahl(ort.x)}</strong></div>
        <div><small>Y</small><strong>{ort.y !== null ? zahl(ort.y) : '—'}</strong></div>
        <div><small>Z</small><strong>{zahl(ort.z)}</strong></div>
      </div>

      <div className="detail-info">
        <div>{dimensionLabel(ort.dimension)} · {ort.typ || kategorieLabel(ort.kategorie)}</div>
        {u && (
          <div>
            Im {u.dimension === 'nether' ? 'Nether' : 'der Oberwelt'}: <span className="mono">X {zahl(u.x)} · Z {zahl(u.z)}</span>
          </div>
        )}
        {weg && (
          <div>
            Von deinem Standort: <span className="mono">{entfernungText(weg.meter)} Richtung {weg.richtung}</span>
            {weg.umgerechnet && ' (umgerechnet)'}
          </div>
        )}
        <div>Eingetragen von {ort.erstelltVon} am {new Date(ort.erstelltAm).toLocaleDateString('de-DE')}</div>
      </div>

      {ort.notiz && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{ort.notiz}</div>}
      {ort.datei && <img className="detail-bild" src={`/medien/${ort.datei}`} alt={`Bild zu ${ort.name}`} />}

      <div className="knopf-raster">
        <button className="knopf" onClick={() => kopiere(`${ort.x} ${ort.y ?? '~'} ${ort.z}`, 'Koordinaten')}>
          <Icon name="kopieren" /> Koordinaten
        </button>
        <button className="knopf" onClick={() => kopiere(tpBefehl(ort), 'Teleport-Befehl')}>
          <Icon name="kopieren" /> /tp-Befehl
        </button>
        <button className="knopf" onClick={anheften}>
          <Icon name="pin" /> {ort.angeheftet ? 'Lösen' : 'Anheften'}
        </button>
        <button className="knopf" onClick={bearbeiten}>
          <Icon name="stift" /> Bearbeiten
        </button>
      </div>

      {loeschenBestaetigen ? (
        <div className="knopf-raster">
          <button className="knopf" onClick={() => setLoeschenBestaetigen(false)}>Abbrechen</button>
          <button className="knopf gefahr" onClick={loeschen}>Wirklich löschen</button>
        </div>
      ) : (
        <button className="knopf gefahr" onClick={() => setLoeschenBestaetigen(true)}>
          <Icon name="muell" /> Löschen
        </button>
      )}
    </Sheet>
  );
}
