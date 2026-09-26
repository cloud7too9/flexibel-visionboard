import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '../komponenten/Sheet';
import { Icon } from '../komponenten/Icon';
import { alsZahl, DimensionWahl, KategorieWahl, KoordFeld } from '../komponenten/Eingaben';
import { koordinatenErkennen } from '../lib/koordinaten';
import { bildHochladen, fotoVerkleinern } from '../lib/upload';
import type { Dimension, Kategorie, Ort } from '../lib/typen';
import { duplikatFinden, type Werkzeuge } from './werkzeuge';

interface Props extends Werkzeuge {
  ort?: Ort;
  schliessen: () => void;
}

export function OrtFormular({ ort, schliessen, token, orte, typen, senden, meldung }: Props) {
  const [name, setName] = useState(ort?.name ?? '');
  const [typ, setTyp] = useState(ort?.typ ?? '');
  const [x, setX] = useState(ort ? String(ort.x) : '');
  const [y, setY] = useState(ort?.y != null ? String(ort.y) : '');
  const [z, setZ] = useState(ort ? String(ort.z) : '');
  const [dimension, setDimension] = useState<Dimension>(ort?.dimension ?? 'oberwelt');
  const [kategorie, setKategorie] = useState<Kategorie>(ort?.kategorie ?? 'basis');
  const [notiz, setNotiz] = useState(ort?.notiz ?? '');
  const [angeheftet, setAngeheftet] = useState(ort?.angeheftet ?? false);
  const [datei, setDatei] = useState(ort?.datei ?? '');
  const [neuesBild, setNeuesBild] = useState<File | null>(null);
  const [fortschritt, setFortschritt] = useState<number | null>(null);
  const [einfuegen, setEinfuegen] = useState('');
  const [speichert, setSpeichert] = useState(false);

  const vorschau = useMemo(() => (neuesBild ? URL.createObjectURL(neuesBild) : ''), [neuesBild]);
  useEffect(() => () => { if (vorschau) URL.revokeObjectURL(vorschau); }, [vorschau]);

  const xz = { x: alsZahl(x), z: alsZahl(z) };
  const gueltig = name.trim() && xz.x !== null && xz.z !== null;
  const doppelt = gueltig ? duplikatFinden(orte, xz.x!, xz.z!, dimension, ort?.id) : undefined;

  const typWaehlen = (neu: string) => {
    setTyp(neu);
    const f = typen.find((t) => t.typ === neu);
    if (!f) return;
    setKategorie(f.kategorie);
    if (f.dimension) setDimension(f.dimension);
    if (!name.trim()) setName(f.typ);
  };

  const eingefuegt = (text: string) => {
    setEinfuegen(text);
    const k = koordinatenErkennen(text);
    if (!k) return;
    if (k.x !== undefined) setX(String(k.x));
    if (k.z !== undefined) setZ(String(k.z));
    setY(k.y != null ? String(k.y) : '');
    if (k.dimension) setDimension(k.dimension);
  };

  const speichern = async () => {
    if (!gueltig) return;
    setSpeichert(true);
    try {
      let bild = datei;
      if (neuesBild) bild = await bildHochladen(await fotoVerkleinern(neuesBild), token, setFortschritt);
      const felder = {
        name: name.trim(), typ, x: xz.x!, y: alsZahl(y), z: xz.z!,
        dimension, kategorie, notiz: notiz.trim(), angeheftet, datei: bild,
      };
      await senden(ort ? { art: 'aendern', id: ort.id, felder } : { art: 'hinzufuegen', ort: felder });
      meldung(ort ? 'Änderung gespeichert' : `„${felder.name}“ gespeichert`);
      schliessen();
    } catch (err) {
      meldung(err instanceof Error ? err.message : String(err), true);
      setSpeichert(false);
      setFortschritt(null);
    }
  };

  return (
    <Sheet
      titel={ort ? 'Ort bearbeiten' : 'Ort eintragen'}
      schliessen={schliessen}
      fuss={
        <>
          <button className="knopf" onClick={schliessen}>Abbrechen</button>
          <button className="knopf primaer breit" disabled={!gueltig || speichert} onClick={speichern}>
            {speichert ? (fortschritt !== null ? `Lade Bild … ${Math.round(fortschritt * 100)} %` : 'Speichere …') : 'Speichern'}
          </button>
        </>
      }
    >
      {!ort && (
        <label className="feld">
          <span>Koordinaten einfügen (F3+C, /tp, „X: … Z: …“) – optional</span>
          <input
            className="eingabe mono"
            placeholder="Text hier einfügen"
            value={einfuegen}
            onChange={(e) => eingefuegt(e.target.value)}
          />
        </label>
      )}

      <label className="feld">
        <span>Name</span>
        <input className="eingabe" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="z. B. Hauptbasis" />
      </label>

      <div className="feld">
        <span>Koordinaten (Y optional)</span>
        <div className="koord-reihe">
          <KoordFeld achse="X" wert={x} setzen={setX} />
          <KoordFeld achse="Y" wert={y} setzen={setY} optional />
          <KoordFeld achse="Z" wert={z} setzen={setZ} />
        </div>
        {doppelt && <span className="fehlertext" style={{ color: '#ffd23f' }}>Hier gibt es schon „{doppelt.name}“.</span>}
      </div>

      <div className="feld">
        <span>Dimension</span>
        <DimensionWahl wert={dimension} setzen={setDimension} />
      </div>

      <label className="feld">
        <span>Typ aus der Seed Map</span>
        <select className="eingabe" value={typ} onChange={(e) => typWaehlen(e.target.value)}>
          <option value="">— eigener Ort —</option>
          {typen.map((t) => <option key={t.typ} value={t.typ}>{t.typ}</option>)}
        </select>
      </label>

      <div className="feld">
        <span>Kategorie</span>
        <KategorieWahl wert={kategorie} setzen={setKategorie} />
      </div>

      <label className="feld">
        <span>Notiz</span>
        <textarea className="eingabe" value={notiz} maxLength={1000} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. Portal steht am Fluss" />
      </label>

      <div className="feld">
        <span>Bild</span>
        {(neuesBild || datei) && (
          <img className="detail-bild" src={vorschau || `/medien/${datei}`} alt="" />
        )}
        <div className="knopf-raster">
          <label className="knopf">
            <Icon name="bild" /> {datei || neuesBild ? 'Ersetzen' : 'Bild wählen'}
            <input type="file" accept="image/*" hidden onChange={(e) => setNeuesBild(e.target.files?.[0] ?? null)} />
          </label>
          {(datei || neuesBild) && (
            <button className="knopf" onClick={() => { setDatei(''); setNeuesBild(null); }}>Entfernen</button>
          )}
        </div>
      </div>

      <label className="schalter">
        <span>Auf der Anzeige groß anheften</span>
        <input type="checkbox" checked={angeheftet} onChange={(e) => setAngeheftet(e.target.checked)} />
      </label>
    </Sheet>
  );
}
