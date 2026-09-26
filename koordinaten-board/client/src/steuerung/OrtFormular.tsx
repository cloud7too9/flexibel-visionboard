import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '../komponenten/Sheet';
import { Icon } from '../komponenten/Icon';
import { alsZahl, DimensionWahl, Gruppe, KategorieWahl, KoordFeld, Option } from '../komponenten/Eingaben';
import { koordinatenErkennen } from '../lib/koordinaten';
import { bildHochladen, fotoVerkleinern } from '../lib/upload';
import { thema, type Dimension, type Kategorie, type Ort } from '../lib/typen';
import { duplikatFinden, type Werkzeuge } from './werkzeuge';

interface Props extends Werkzeuge {
  ort?: Ort;
  startDimension?: Dimension;
  schliessen: () => void;
}

export function OrtFormular({ ort, startDimension, schliessen, token, orte, typen, senden, meldung }: Props) {
  const [name, setName] = useState(ort?.name ?? '');
  const [typ, setTyp] = useState(ort?.typ ?? '');
  const [x, setX] = useState(ort ? String(ort.x) : '');
  const [y, setY] = useState(ort?.y != null ? String(ort.y) : '');
  const [z, setZ] = useState(ort ? String(ort.z) : '');
  const [dimension, setDimension] = useState<Dimension>(ort?.dimension ?? startDimension ?? 'oberwelt');
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
      sub={ort ? `Eingetragen von ${ort.erstelltVon}` : 'Von Hand oder per eingefügtem Text'}
      thema={thema(dimension)}
      schliessen={schliessen}
      fuss={
        <>
          <button className="btn-secondary" onClick={schliessen}>Abbrechen</button>
          <button className="btn-primary breit" disabled={!gueltig || speichert} onClick={speichern}>
            {speichert ? (fortschritt !== null ? `Lade Bild … ${Math.round(fortschritt * 100)} %` : 'Speichere …') : 'Speichern'}
          </button>
        </>
      }
    >
      {!ort && (
        <Gruppe label="Text einfügen (optional)">
          <input
            className="eingabe mono"
            placeholder="F3+C, /tp oder „X: … Z: …“"
            value={einfuegen}
            onChange={(e) => eingefuegt(e.target.value)}
          />
        </Gruppe>
      )}

      <Gruppe label="Dimension">
        <DimensionWahl wert={dimension} setzen={setDimension} />
      </Gruppe>

      <Gruppe label="Koordinaten">
        <div className="koord-reihe">
          <KoordFeld achse="X" wert={x} setzen={setX} />
          <KoordFeld achse="Y" wert={y} setzen={setY} optional />
          <KoordFeld achse="Z" wert={z} setzen={setZ} />
        </div>
        {doppelt && <div className="banner warn">Hier gibt es schon „{doppelt.name}“.</div>}
      </Gruppe>

      <Gruppe label="Name">
        <input className="eingabe" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="z. B. Hauptbasis" />
      </Gruppe>

      <Gruppe label="Typ aus der Seed Map">
        <select className="eingabe" value={typ} onChange={(e) => typWaehlen(e.target.value)}>
          <option value="">— eigener Ort —</option>
          {typen.map((t) => <option key={t.typ} value={t.typ}>{t.typ}</option>)}
        </select>
      </Gruppe>

      <Gruppe label="Kategorie">
        <KategorieWahl wert={kategorie} setzen={setKategorie} />
      </Gruppe>

      <Gruppe label="Notiz">
        <textarea className="eingabe" value={notiz} maxLength={1000} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. Portal steht am Fluss" />
      </Gruppe>

      <Gruppe label="Bild">
        {(neuesBild || datei) && <img className="bild" src={vorschau || `/medien/${datei}`} alt="" />}
        <div className="knopf-raster">
          <label className="btn-secondary">
            <Icon name="bild" /> {datei || neuesBild ? 'Ersetzen' : 'Bild wählen'}
            <input type="file" accept="image/*" hidden onChange={(e) => setNeuesBild(e.target.files?.[0] ?? null)} />
          </label>
          {(datei || neuesBild) && (
            <button className="btn-secondary" onClick={() => { setDatei(''); setNeuesBild(null); }}>Entfernen</button>
          )}
        </div>
      </Gruppe>

      <Option
        name="Auf der Anzeige anheften"
        beschreibung="Erscheint groß oben auf dem Bildschirm im Raum"
        an={angeheftet}
        setzen={setAngeheftet}
      />
    </Sheet>
  );
}
