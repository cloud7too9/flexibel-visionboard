import { useEffect, useRef, useState } from 'react';
import { Sheet } from '../komponenten/Sheet';
import { Icon } from '../komponenten/Icon';
import { alsZahl, DimensionWahl, KoordFeld, Option } from '../komponenten/Eingaben';
import { bildHochladen, bildVorbereiten, kartenausschnitt, screenshotAuslesen } from '../lib/upload';
import { KATEGORIEN, dimensionLabel, thema, type Dimension, type Erkannt, type Kategorie } from '../lib/typen';
import { duplikatFinden, type Werkzeuge } from './werkzeuge';

type Status = 'wartet' | 'lese' | 'fertig' | 'nicht-erkannt' | 'fehler' | 'gespeichert';

interface Eintrag {
  id: string;
  datei: File;
  vorschau: string;
  status: Status;
  meldung?: string;
  canvas?: HTMLCanvasElement;
  box?: Erkannt['box'];
  name: string;
  typ: string;
  x: string;
  y: string;
  z: string;
  dimension: Dimension;
  kategorie: Kategorie;
  uebernehmen: boolean;
  ausschnitt: boolean;
}

let zaehler = 0;
const neuerEintrag = (datei: File): Eintrag => ({
  id: `e${++zaehler}`,
  datei,
  vorschau: URL.createObjectURL(datei),
  status: 'wartet',
  name: '', typ: '', x: '', y: '', z: '',
  dimension: 'oberwelt', kategorie: 'sonstiges',
  uebernehmen: false, ausschnitt: true,
});

interface Props extends Werkzeuge {
  dateien: File[];
  schliessen: () => void;
  /** Nach dem Speichern auf die Dimension der neuen Orte umschalten */
  dimensionWechseln: (d: Dimension) => void;
}

export function ScreenshotImport({ dateien, schliessen, dimensionWechseln, token, orte, typen, senden, meldung }: Props) {
  const [eintraege, setEintraege] = useState<Eintrag[]>(() => dateien.map(neuerEintrag));
  const [speichert, setSpeichert] = useState<string | null>(null);
  const laeuft = useRef(false);

  const aendern = (id: string, felder: Partial<Eintrag>) =>
    setEintraege((alle) => alle.map((e) => (e.id === id ? { ...e, ...felder } : e)));

  // Screenshots nacheinander auslesen (der Server arbeitet sie ohnehin der Reihe nach ab)
  useEffect(() => {
    if (laeuft.current) return;
    const naechster = eintraege.find((e) => e.status === 'wartet');
    if (!naechster) return;
    laeuft.current = true;
    aendern(naechster.id, { status: 'lese' });

    (async () => {
      try {
        const { canvas, blob } = await bildVorbereiten(naechster.datei);
        const { erkannt } = await screenshotAuslesen(blob, token);
        if (!erkannt) {
          aendern(naechster.id, {
            status: 'nicht-erkannt', canvas, uebernehmen: false, ausschnitt: false,
            meldung: 'Kein Popup gefunden – ist die Karte aufgeklappt? Du kannst die Werte auch selbst eintragen.',
          });
          return;
        }
        setEintraege((alle) => {
          const frueher = alle.filter((e) => e.id !== naechster.id && e.status !== 'wartet' && e.status !== 'lese');
          const imStapel = frueher.find((e) => e.dimension === erkannt.dimension
            && Math.abs(Number(e.x) - erkannt.x) <= 3 && Math.abs(Number(e.z) - erkannt.z) <= 3);
          const vorhanden = duplikatFinden(orte, erkannt.x, erkannt.z, erkannt.dimension);
          const meldungText = vorhanden
            ? `Schon gespeichert als „${vorhanden.name}“`
            : imStapel ? 'Doppelt in dieser Auswahl' : undefined;
          return alle.map((e) => e.id !== naechster.id ? e : {
            ...e,
            status: 'fertig',
            canvas,
            box: erkannt.box,
            name: erkannt.name,
            typ: erkannt.typ,
            x: String(erkannt.x),
            y: erkannt.y !== null ? String(erkannt.y) : '',
            z: String(erkannt.z),
            dimension: erkannt.dimension,
            kategorie: erkannt.kategorie,
            uebernehmen: !vorhanden && !imStapel,
            ausschnitt: Boolean(erkannt.box),
            meldung: meldungText,
          });
        });
      } catch (err) {
        aendern(naechster.id, { status: 'fehler', meldung: err instanceof Error ? err.message : String(err) });
      } finally {
        laeuft.current = false;
        setEintraege((alle) => [...alle]); // nächsten anstoßen
      }
    })();
  }, [eintraege, orte, token]);

  const gueltig = (e: Eintrag) => e.name.trim() && alsZahl(e.x) !== null && alsZahl(e.z) !== null;
  const auswahl = eintraege.filter((e) => e.uebernehmen && gueltig(e) && e.status !== 'gespeichert');
  const nochAmLesen = eintraege.some((e) => e.status === 'wartet' || e.status === 'lese');

  const alleSpeichern = async () => {
    let fertig = 0;
    for (const [i, e] of auswahl.entries()) {
      setSpeichert(`Speichere ${i + 1} von ${auswahl.length} …`);
      try {
        let datei = '';
        if (e.ausschnitt && e.canvas && e.box) {
          datei = await bildHochladen(await kartenausschnitt(e.canvas, e.box), token);
        }
        await senden({
          art: 'hinzufuegen',
          ort: {
            name: e.name.trim(), typ: e.typ, x: alsZahl(e.x)!, y: alsZahl(e.y), z: alsZahl(e.z)!,
            dimension: e.dimension, kategorie: e.kategorie, notiz: '', datei, angeheftet: false,
          },
        });
        aendern(e.id, { status: 'gespeichert', uebernehmen: false, meldung: 'Gespeichert' });
        fertig += 1;
      } catch (err) {
        aendern(e.id, { meldung: `Fehler: ${err instanceof Error ? err.message : err}` });
      }
    }
    setSpeichert(null);
    if (fertig === auswahl.length) {
      const dims = new Set(auswahl.map((e) => e.dimension));
      if (dims.size === 1) dimensionWechseln([...dims][0]);
      meldung(fertig === 1 ? '1 Ort gespeichert' : `${fertig} Orte gespeichert`);
      schliessen();
    } else {
      meldung(`${auswahl.length - fertig} konnten nicht gespeichert werden`, true);
    }
  };

  const hinzufuegen = (liste: FileList | null) => {
    if (liste?.length) setEintraege((alle) => [...alle, ...Array.from(liste).map(neuerEintrag)]);
  };

  const erkannt = eintraege.filter((e) => e.status === 'fertig' || e.status === 'gespeichert').length;

  return (
    <Sheet
      titel={eintraege.length === 1 ? 'Screenshot auslesen' : `${eintraege.length} Screenshots auslesen`}
      sub={nochAmLesen ? 'Texterkennung läuft auf dem Board …' : `${erkannt} von ${eintraege.length} erkannt`}
      schliessen={schliessen}
      fuss={
        <>
          <label className="btn-secondary" aria-label="Weitere Screenshots">
            <Icon name="plus" />
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { hinzufuegen(e.target.files); e.target.value = ''; }} />
          </label>
          <button className="btn-primary breit" disabled={auswahl.length === 0 || speichert !== null} onClick={alleSpeichern}>
            {speichert ?? (nochAmLesen && auswahl.length === 0
              ? 'Lese …'
              : auswahl.length === 1 ? '1 Ort speichern' : `${auswahl.length} Orte speichern`)}
          </button>
        </>
      }
    >
      {eintraege.map((e) => {
        const bearbeitbar = e.status === 'fertig' || e.status === 'nicht-erkannt';
        const bannerArt = e.status === 'fehler' ? 'bad' : e.status === 'gespeichert' ? 'ok' : 'warn';
        return (
          <div key={e.id} className={`card import-karte ${thema(e.dimension)} ${bearbeitbar && !e.uebernehmen ? 'aus' : ''}`}>
            <div className="import-kopf">
              <img className="vorschau" src={e.vorschau} alt="" />
              <div className="text">
                {e.status === 'wartet' && <div className="card-meta">Wartet …</div>}
                {e.status === 'lese' && <div className="card-meta"><span className="dreher" /> Lese Text …</div>}
                {(e.status === 'fertig' || e.status === 'gespeichert') && (
                  <>
                    <div className="card-title">{e.name}</div>
                    <div className="card-meta">
                      <span className="pill">{dimensionLabel(e.dimension)}</span>
                      <span className="coord mono">
                        <span className="lbl">X</span><span className="v">{e.x}</span>
                        {e.y && <><span className="lbl">Y</span><span className="v">{e.y}</span></>}
                        <span className="lbl">Z</span><span className="v">{e.z}</span>
                      </span>
                    </div>
                  </>
                )}
                {e.status === 'nicht-erkannt' && <div className="card-title">Nicht erkannt</div>}
                {e.status === 'fehler' && <div className="card-title">Fehler</div>}
              </div>
              {bearbeitbar && (
                <input
                  type="checkbox"
                  className="switch"
                  aria-label="Übernehmen"
                  checked={e.uebernehmen}
                  onChange={(ev) => aendern(e.id, { uebernehmen: ev.target.checked })}
                />
              )}
            </div>

            {e.meldung && <div className={`banner ${bannerArt}`}>{e.meldung}</div>}

            {bearbeitbar && e.uebernehmen && (
              <>
                <input className="eingabe" value={e.name} placeholder="Name" onChange={(ev) => aendern(e.id, { name: ev.target.value })} />
                <DimensionWahl wert={e.dimension} setzen={(d) => aendern(e.id, { dimension: d })} />
                <div className="koord-reihe">
                  <KoordFeld achse="X" wert={e.x} setzen={(v) => aendern(e.id, { x: v })} />
                  <KoordFeld achse="Y" wert={e.y} setzen={(v) => aendern(e.id, { y: v })} optional />
                  <KoordFeld achse="Z" wert={e.z} setzen={(v) => aendern(e.id, { z: v })} />
                </div>
                <div className="zwei-spalten">
                  <select
                    className="eingabe"
                    value={e.typ}
                    aria-label="Typ"
                    onChange={(ev) => {
                      const f = typen.find((t) => t.typ === ev.target.value);
                      aendern(e.id, { typ: ev.target.value, ...(f && { kategorie: f.kategorie }), ...(f?.dimension && { dimension: f.dimension }) });
                    }}
                  >
                    <option value="">— eigener Ort —</option>
                    {typen.map((t) => <option key={t.typ} value={t.typ}>{t.typ}</option>)}
                  </select>
                  <select className="eingabe" aria-label="Kategorie" value={e.kategorie} onChange={(ev) => aendern(e.id, { kategorie: ev.target.value as Kategorie })}>
                    {KATEGORIEN.map((k) => <option key={k.wert} value={k.wert}>{k.label}</option>)}
                  </select>
                </div>
                {e.box && (
                  <Option
                    name="Kartenausschnitt speichern"
                    beschreibung="Popup + Marker als Bild zum Ort"
                    an={e.ausschnitt}
                    setzen={(an) => aendern(e.id, { ausschnitt: an })}
                  />
                )}
              </>
            )}
          </div>
        );
      })}
    </Sheet>
  );
}
