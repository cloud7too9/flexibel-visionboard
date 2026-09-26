import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBoard } from '../lib/verbindung';
import { DIMENSIONEN, KATEGORIEN, dimensionLabel, inDimension, thema, type Dimension, type FeatureTyp, type Kategorie, type Ort } from '../lib/typen';
import { entfernung, entfernungText, umrechnen, zahl, type Position } from '../lib/koordinaten';
import { Icon } from '../komponenten/Icon';
import { KoordChip } from '../komponenten/Eingaben';
import { Sheet } from '../komponenten/Sheet';
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
  | { art: 'spieler' }
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
      <div className="app thema-oberwelt">
        <Beitreten
          fertig={(token, name) => {
            localStorage.setItem('kb-name', name);
            setSitzung({ token, name });
          }}
        />
      </div>
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
  const [dim, setDim] = useGespeichert<Dimension>('kb-dimension', 'oberwelt');
  const [suche, setSuche] = useState('');
  const [katFilter, setKatFilter] = useState<Kategorie | null>(null);
  const [standort, setStandort] = useGespeichert<Position | null>('kb-standort', null);
  const [toast, setToast] = useState<{ text: string; fehler: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const dateiWahl = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/typen').then((r) => r.json()).then(setTypen).catch(() => {});
  }, []);

  // Statusleiste/Browser-Rahmen passend zur Dimension färben
  useEffect(() => {
    const farbe = getComputedStyle(document.querySelector('.app')!).getPropertyValue('--bg').trim();
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', farbe);
    document.body.style.background = farbe;
  }, [dim]);

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
      o.dimension === dim
      && (!katFilter || o.kategorie === katFilter)
      && (!begriff || `${o.name} ${o.typ} ${o.notiz} ${o.erstelltVon}`.toLowerCase().includes(begriff)));
    const mitWeg = gefiltert.map((o) => ({ ort: o, weg: standort ? entfernung(standort, o) : null }));
    return mitWeg.sort((a, b) => {
      if (a.weg && b.weg) return a.weg.meter - b.weg.meter;
      if (a.weg) return -1;
      if (b.weg) return 1;
      if (a.ort.angeheftet !== b.ort.angeheftet) return a.ort.angeheftet ? -1 : 1;
      return b.ort.erstelltAm.localeCompare(a.ort.erstelltAm); // neueste zuerst
    });
  }, [orte, suche, dim, katFilter, standort]);

  const anzahl = (d: Dimension) => orte.filter((o) => o.dimension === d).length;
  const aktiv = ansicht && 'id' in ansicht ? orte.find((o) => o.id === ansicht.id) : undefined;
  const standortPortal = standort ? umrechnen(standort) : null;

  return (
    <div className={`app ${thema(dim)}`}>
      <header className="header">
        <div className="title-block">
          <div className="title-row">
            <span className="compass"><Icon name="kompass" /></span>
            <h1>Koordinaten</h1>
          </div>
          <div className="subtitle">
            Welt „{zustand?.einstellungen.titel ?? '…'}“ · <b>{dimensionLabel(dim)}</b>
          </div>
        </div>
      </header>

      <div className="tabs-wrap">
        <div className="tabs" role="tablist">
          {DIMENSIONEN.map((d) => (
            <button
              key={d.wert}
              role="tab"
              aria-selected={dim === d.wert}
              className={`tab ${dim === d.wert ? 'active' : ''}`}
              onClick={() => setDim(d.wert)}
            >
              {d.label} <span className="zahl">{anzahl(d.wert)}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="buehne">
        <div className="hud-zeile" onClick={() => setAnsicht({ art: 'standort' })} role="button" aria-label="Standort bearbeiten">
          {standort ? (
            <>
              <KoordChip x={standort.x} y={standort.y} z={standort.z} />
              {standortPortal && (
                <span className="chip portal-chip mono">
                  <span className="pico">⟷</span> {dimensionLabel(standortPortal.dimension)} <b>{zahl(standortPortal.x)} / {zahl(standortPortal.z)}</b>
                </span>
              )}
              {standort.dimension !== dim && <span className="chip portal-chip">Du bist {inDimension(standort.dimension)}</span>}
            </>
          ) : (
            <span className="chip leer"><Icon name="ziel" groesse={16} /> Standort setzen – sortiert nach Entfernung</span>
          )}
        </div>

        <div className="suche">
          <Icon name="suche" groesse={17} />
          <input className="eingabe" type="search" placeholder={`${inDimension(dim).replace(/^i/, 'I')} suchen …`} value={suche} onChange={(e) => setSuche(e.target.value)} />
        </div>

        <div className="filter" role="radiogroup" aria-label="Kategorie">
          <button className={`seg-btn ${katFilter === null ? 'active' : ''}`} onClick={() => setKatFilter(null)}>Alle</button>
          {KATEGORIEN.map((k) => (
            <button key={k.wert} className={`seg-btn ${katFilter === k.wert ? 'active' : ''}`} onClick={() => setKatFilter(katFilter === k.wert ? null : k.wert)}>
              <Icon name={k.wert} groesse={15} /> {k.label}
            </button>
          ))}
        </div>

        <div className="liste">
          {liste.map(({ ort, weg }) => (
            <OrtZeile key={ort.id} ort={ort} weg={weg} oeffnen={() => setAnsicht({ art: 'detail', id: ort.id })} />
          ))}
          {zustand && liste.length === 0 && (
            <div className="leer-liste">
              {orte.length === 0
                ? <>Noch nichts gespeichert.<br />Mach einen Screenshot vom Seed-Map-Popup und tippe unten auf „Screenshot“.</>
                : anzahl(dim) === 0 ? `${inDimension(dim).replace(/^i/, 'I')} ist noch nichts gespeichert.` : 'Nichts gefunden – Filter oder Suche anpassen.'}
            </div>
          )}
        </div>
      </main>

      <nav className="bottombar">
        <button className="bb-item" onClick={() => setAnsicht({ art: 'spieler' })}>
          <span className="ico"><span className={`status-dot ${verbunden ? '' : 'off'}`} /></span>
          <span className="lab">{verbunden ? `${teilnehmer.length} online` : 'Getrennt'}</span>
        </button>
        <button className="bb-item haupt" onClick={() => dateiWahl.current?.click()}>
          <span className="ico"><Icon name="kamera" groesse={22} /></span>
          <span className="lab">Screenshot</span>
        </button>
        <button className="bb-item" onClick={() => setAnsicht({ art: 'neu' })}>
          <span className="ico"><Icon name="plus" groesse={22} /></span>
          <span className="lab">Eintragen</span>
        </button>
        <button className="bb-item" onClick={() => setAnsicht({ art: 'einstellungen' })}>
          <span className="ico"><Icon name="optionen" groesse={22} /></span>
          <span className="lab">Optionen</span>
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
      </nav>

      {ansicht?.art === 'neu' && <OrtFormular {...werkzeuge} startDimension={dim} schliessen={schliessen} />}
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
      {ansicht?.art === 'import' && (
        <ScreenshotImport {...werkzeuge} dateien={ansicht.dateien} schliessen={schliessen} dimensionWechseln={setDim} />
      )}
      {ansicht?.art === 'standort' && <StandortSheet standort={standort} setzen={setStandort} schliessen={schliessen} />}
      {ansicht?.art === 'einstellungen' && zustand && (
        <EinstellungenSheet zustand={zustand} name={name} abmelden={abmelden} senden={senden} meldung={meldung} schliessen={schliessen} />
      )}
      {ansicht?.art === 'spieler' && (
        <Sheet titel="Spieler" sub={verbunden ? 'Gerade mit dem Board verbunden' : 'Keine Verbindung zum Board'} schliessen={schliessen}>
          <div className="liste">
            {teilnehmer.map((n) => (
              <div key={n} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <span className="status-dot" />
                <b style={{ flex: 1 }}>{n}</b>
                {n === name && <span className="pill">Du</span>}
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{orte.filter((o) => o.erstelltVon === n).length} Orte</span>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {toast && <div className={`toast chip ${toast.fehler ? 'fehler' : ''}`} role="status">{toast.text}</div>}
    </div>
  );
}

function OrtZeile({ ort, weg, oeffnen }: { ort: Ort; weg: ReturnType<typeof entfernung>; oeffnen: () => void }) {
  return (
    <button className="ort" onClick={oeffnen}>
      <span className="ort-icon"><Icon name={ort.kategorie} groesse={20} /></span>
      <span style={{ minWidth: 0 }}>
        <span className="ort-name">
          {ort.angeheftet && <Icon name="pin" groesse={14} />}
          <span>{ort.name}</span>
        </span>
        <KoordChip x={ort.x} y={ort.y} z={ort.z} klein />
      </span>
      <span className="weg">
        {weg ? (
          <><b>{entfernungText(weg.meter)}</b><span>{weg.richtung}{weg.umgerechnet ? ' ⟷' : ''}</span></>
        ) : (
          <span>{ort.erstelltVon}</span>
        )}
      </span>
    </button>
  );
}
