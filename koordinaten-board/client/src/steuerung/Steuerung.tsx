import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBoard } from '../lib/verbindung';
import { DIMENSIONEN, KATEGORIEN, type Dimension, type FeatureTyp, type Kategorie, type Ort } from '../lib/typen';
import { entfernung, entfernungText, zahl, type Position } from '../lib/koordinaten';
import { Icon } from '../komponenten/Icon';
import { Beitreten } from './Beitreten';
import { OrtFormular } from './OrtFormular';
import { OrtDetail } from './OrtDetail';
import { ScreenshotImport } from './ScreenshotImport';
import { EinstellungenSheet, StandortSheet } from './Einstellungen';
import type { Werkzeuge } from './werkzeuge';

type Ansicht =
  | { art: 'neu' }
  | { art: 'bearbeiten'; id: string }
  | { art: 'detail'; id: string }
  | { art: 'import'; dateien: File[] }
  | { art: 'einstellungen' }
  | { art: 'standort' }
  | null;

function useGespeichert<T>(schluessel: string, start: T): [T, (w: T) => void] {
  const [wert, setWert] = useState<T>(() => {
    try {
      const roh = localStorage.getItem(schluessel);
      return roh ? (JSON.parse(roh) as T) : start;
    } catch {
      return start;
    }
  });
  const setzen = useCallback((w: T) => {
    setWert(w);
    try {
      if (w === null) localStorage.removeItem(schluessel);
      else localStorage.setItem(schluessel, JSON.stringify(w));
    } catch { /* privater Modus */ }
  }, [schluessel]);
  return [wert, setzen];
}

export function Steuerung() {
  const [sitzung, setSitzung] = useGespeichert<{ token: string; name: string } | null>('kb-sitzung', null);
  if (!sitzung) {
    return (
      <Beitreten
        fertig={(token, name) => {
          localStorage.setItem('kb-name', name);
          setSitzung({ token, name });
        }}
      />
    );
  }
  return <Board token={sitzung.token} name={sitzung.name} abmelden={() => setSitzung(null)} />;
}

function Board({ token, name, abmelden }: { token: string; name: string; abmelden: () => void }) {
  const { zustand, verbunden, teilnehmer, senden } = useBoard({
    query: `token=${encodeURIComponent(token)}`,
    beiAbgelehnt: abmelden,
  });
  const [typen, setTypen] = useState<FeatureTyp[]>([]);
  const [ansicht, setAnsicht] = useState<Ansicht>(null);
  const [suche, setSuche] = useState('');
  const [dimFilter, setDimFilter] = useState<Dimension | null>(null);
  const [katFilter, setKatFilter] = useState<Kategorie | null>(null);
  const [standort, setStandort] = useGespeichert<Position | null>('kb-standort', null);
  const [toast, setToast] = useState<{ text: string; fehler: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const dateiWahl = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/typen').then((r) => r.json()).then(setTypen).catch(() => {});
  }, []);

  const meldung = useCallback((text: string, fehler = false) => {
    clearTimeout(toastTimer.current);
    setToast({ text, fehler });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const orte = zustand?.orte ?? [];
  const werkzeuge: Werkzeuge = { token, orte, typen, senden, meldung };
  const schliessen = useCallback(() => setAnsicht(null), []);

  const liste = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    const gefiltert = orte.filter((o) =>
      (!dimFilter || o.dimension === dimFilter)
      && (!katFilter || o.kategorie === katFilter)
      && (!begriff || `${o.name} ${o.typ} ${o.notiz} ${o.erstelltVon}`.toLowerCase().includes(begriff)));
    const mitWeg = gefiltert.map((o) => ({ ort: o, weg: standort ? entfernung(standort, o) : null }));
    return mitWeg.sort((a, b) => {
      if (a.weg && b.weg) return a.weg.meter - b.weg.meter;
      if (a.weg) return -1;
      if (b.weg) return 1;
      return b.ort.erstelltAm.localeCompare(a.ort.erstelltAm); // neueste zuerst
    });
  }, [orte, suche, dimFilter, katFilter, standort]);

  const finden = (id: string): Ort | undefined => orte.find((o) => o.id === id);
  const aktiv = ansicht && 'id' in ansicht ? finden(ansicht.id) : undefined;

  return (
    <div className="steuerung">
      <header className="kopfleiste">
        <div className="zeile1">
          <span className={`status-punkt ${verbunden ? '' : 'weg'}`} title={verbunden ? 'Verbunden' : 'Getrennt'} />
          <h1>{zustand?.einstellungen.titel ?? 'Verbinde …'}</h1>
          <span className="mono" style={{ color: 'var(--text-3)', fontSize: 13 }}>
            {teilnehmer.length} online
          </span>
          <button className="knopf-icon" onClick={() => setAnsicht({ art: 'einstellungen' })} aria-label="Einstellungen">
            <Icon name="zahnrad" />
          </button>
        </div>
        <div className="suchfeld">
          <Icon name="suche" groesse={18} />
          <input className="eingabe" type="search" placeholder="Suchen …" value={suche} onChange={(e) => setSuche(e.target.value)} />
        </div>
      </header>

      <div className="filterleiste">
        {DIMENSIONEN.map((d) => (
          <button
            key={d.wert}
            className={`chip dim-${d.wert} ${dimFilter === d.wert ? 'aktiv' : ''}`}
            onClick={() => setDimFilter(dimFilter === d.wert ? null : d.wert)}
          >
            <span className="punkt" /> {d.label}
          </button>
        ))}
        {KATEGORIEN.map((k) => (
          <button key={k.wert} className={`chip ${katFilter === k.wert ? 'aktiv' : ''}`} onClick={() => setKatFilter(katFilter === k.wert ? null : k.wert)}>
            <Icon name={k.wert} groesse={16} /> {k.label}
          </button>
        ))}
      </div>

      <button className={`standort-leiste ${standort ? 'gesetzt' : ''}`} onClick={() => setAnsicht({ art: 'standort' })}>
        <Icon name="kompass" />
        {standort ? (
          <span>
            Standort <span className="mono">{zahl(standort.x)} / {zahl(standort.z)}</span> · {DIMENSIONEN.find((d) => d.wert === standort.dimension)?.label}
          </span>
        ) : (
          <span>Standort setzen – Liste nach Entfernung sortieren</span>
        )}
      </button>

      <main className="liste">
        {liste.map(({ ort, weg }) => (
          <button key={ort.id} className={`eintrag dim-${ort.dimension}`} onClick={() => setAnsicht({ art: 'detail', id: ort.id })}>
            <span className="icon-kreis"><Icon name={ort.kategorie} groesse={22} /></span>
            <span style={{ minWidth: 0 }}>
              <span className="name">
                {ort.angeheftet && <Icon name="pin" groesse={14} />}
                <span>{ort.name}</span>
              </span>
              <span className="koords mono">
                {zahl(ort.x)} / {ort.y !== null ? zahl(ort.y) : '—'} / {zahl(ort.z)}
              </span>
            </span>
            <span className="rechts">
              {weg ? (
                <><strong className="mono">{entfernungText(weg.meter)}</strong>{weg.richtung}</>
              ) : (
                ort.erstelltVon
              )}
            </span>
          </button>
        ))}
        {zustand && liste.length === 0 && (
          <div className="leer-hinweis">
            {orte.length === 0
              ? <>Noch nichts gespeichert.<br />Mach einen Screenshot vom Seed-Map-Popup und lies ihn unten ein.</>
              : 'Nichts gefunden – Filter oder Suche anpassen.'}
          </div>
        )}
      </main>

      <div className="aktionsleiste">
        <button className="knopf" onClick={() => setAnsicht({ art: 'neu' })} aria-label="Ort von Hand eintragen">
          <Icon name="plus" /> Manuell
        </button>
        <button className="knopf primaer breit" onClick={() => dateiWahl.current?.click()}>
          <Icon name="bild" /> Screenshot auslesen
        </button>
        <input
          ref={dateiWahl}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const dateien = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (dateien.length) setAnsicht({ art: 'import', dateien });
          }}
        />
      </div>

      {ansicht?.art === 'neu' && <OrtFormular {...werkzeuge} schliessen={schliessen} />}
      {ansicht?.art === 'bearbeiten' && aktiv && <OrtFormular {...werkzeuge} ort={aktiv} schliessen={schliessen} />}
      {ansicht?.art === 'detail' && aktiv && (
        <OrtDetail
          ort={aktiv}
          standort={standort}
          senden={senden}
          meldung={meldung}
          schliessen={schliessen}
          bearbeiten={() => setAnsicht({ art: 'bearbeiten', id: aktiv.id })}
        />
      )}
      {ansicht?.art === 'import' && <ScreenshotImport {...werkzeuge} dateien={ansicht.dateien} schliessen={schliessen} />}
      {ansicht?.art === 'standort' && <StandortSheet standort={standort} setzen={setStandort} schliessen={schliessen} />}
      {ansicht?.art === 'einstellungen' && zustand && (
        <EinstellungenSheet zustand={zustand} name={name} abmelden={abmelden} senden={senden} meldung={meldung} schliessen={schliessen} />
      )}

      {toast && <div className={`toast ${toast.fehler ? 'fehler' : ''}`} role="status">{toast.text}</div>}
    </div>
  );
}
