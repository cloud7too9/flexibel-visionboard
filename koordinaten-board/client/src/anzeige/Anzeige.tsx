import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useBoard } from '../lib/verbindung';
import { DIMENSIONEN, KATEGORIEN, type Ort } from '../lib/typen';
import { umrechnen, zahl } from '../lib/koordinaten';
import { Icon } from '../komponenten/Icon';

const MAX_ANGEHEFTET = 6;
const NEU_DAUER_MS = 90_000;

interface Beitritt {
  beitrittsUrl: string;
  adresse: string;
  pin: string;
}

function useJetzt(intervall = 1000) {
  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setJetzt(Date.now()), intervall);
    return () => clearInterval(t);
  }, [intervall]);
  return jetzt;
}

const vorZeit = (iso: string, jetzt: number) => {
  const s = Math.max(0, Math.round((jetzt - Date.parse(iso)) / 1000));
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
  return new Date(iso).toLocaleDateString('de-DE');
};

/** Scrollt einen überlaufenden Bereich langsam durch – die Anzeige hat keine Maus. */
function AutoScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rahmen = 0;
    let letzte = performance.now();
    let pauseBis = letzte + 4000;
    let position = 0;
    const schritt = (t: number) => {
      const dt = t - letzte;
      letzte = t;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 2) {
        position = 0;
        el.scrollTop = 0;
      } else if (t > pauseBis) {
        position += dt * 0.025; // ca. 25 px pro Sekunde
        if (position >= max) {
          position = max;
          pauseBis = t + 4000;
          window.setTimeout(() => { position = 0; pauseBis = performance.now() + 4000; }, 4000);
        }
        el.scrollTop = position;
      }
      rahmen = requestAnimationFrame(schritt);
    };
    rahmen = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(rahmen);
  }, []);
  return <div className="spalte-inhalt" ref={ref}>{children}</div>;
}

function Koords({ ort }: { ort: Ort }) {
  return (
    <span className="mono">
      {zahl(ort.x)}
      {ort.y !== null && <span style={{ color: 'var(--text-3)' }}> / {zahl(ort.y)}</span>} / {zahl(ort.z)}
    </span>
  );
}

function Umrechnung({ ort }: { ort: Ort }) {
  const u = umrechnen(ort);
  if (!u) return null;
  return (
    <span>
      {u.dimension === 'nether' ? 'Nether' : 'Oberwelt'}: <span className="mono">{zahl(u.x)} / {zahl(u.z)}</span>
    </span>
  );
}

const kategorieIndex = (k: Ort['kategorie']) => KATEGORIEN.findIndex((x) => x.wert === k);
const sortieren = (a: Ort, b: Ort) =>
  kategorieIndex(a.kategorie) - kategorieIndex(b.kategorie) || a.name.localeCompare(b.name, 'de');

export function Anzeige() {
  const { zustand, verbunden, teilnehmer } = useBoard({ query: 'rolle=anzeige' });
  const [beitritt, setBeitritt] = useState<Beitritt | null>(null);
  const [qr, setQr] = useState('');
  const [gesperrt, setGesperrt] = useState(false);
  const jetzt = useJetzt();

  useEffect(() => {
    fetch('/api/anzeige')
      .then((r) => (r.status === 403 ? (setGesperrt(true), null) : r.json()))
      .then((d: Beitritt | null) => {
        if (!d) return;
        setBeitritt(d);
        QRCode.toString(d.beitrittsUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setQr);
      })
      .catch(() => {});
  }, []);

  const orte = zustand?.orte ?? [];
  const angeheftet = useMemo(
    () => orte.filter((o) => o.angeheftet).sort(sortieren).slice(0, MAX_ANGEHEFTET),
    [orte],
  );
  const angeheftetIds = new Set(angeheftet.map((o) => o.id));
  const neueste = [...orte].sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm)).slice(0, 8);
  const istNeu = (o: Ort) => jetzt - Date.parse(o.geaendertAm) < NEU_DAUER_MS;

  if (gesperrt) {
    return (
      <div className="anzeige-fehler">
        Die Anzeige läuft nur direkt auf dem Board-Gerät (localhost).<br />
        Zum Eintragen bitte die Startseite öffnen.
      </div>
    );
  }

  const titel = zustand?.einstellungen.titel ?? 'Koordinaten-Board';
  const qrZeigen = zustand?.einstellungen.qrZeigen ?? true;

  return (
    <div className="anzeige">
      <header className="anzeige-kopf">
        <h1>{titel}</h1>
        <div className="zaehler">
          {DIMENSIONEN.map((d) => (
            <span key={d.wert} className={`dim-${d.wert}`}>
              <span className="punkt" /> {orte.filter((o) => o.dimension === d.wert).length} {d.label}
            </span>
          ))}
        </div>
        {!verbunden && <span className="verbindung-weg">Verbindung zum Server unterbrochen …</span>}
        <span className="uhr mono">
          {new Date(jetzt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </header>

      {orte.length === 0 ? (
        <div className="anzeige-leer">
          <strong>Noch keine Orte gespeichert</strong>
          <span>QR-Code scannen, PIN eingeben und los geht's – oder direkt einen Seed-Map-Screenshot hochladen.</span>
        </div>
      ) : (
        <main className="anzeige-haupt">
          {angeheftet.length > 0 && (
            <section className="angeheftet">
              {angeheftet.map((o) => (
                <article key={o.id} className={`karte-gross dim-${o.dimension} ${istNeu(o) ? 'neu' : ''}`}>
                  {o.datei && <div className="bildgrund" style={{ backgroundImage: `url(/medien/${o.datei})` }} />}
                  <div className="titel">
                    <Icon name={o.kategorie} groesse={26} />
                    <span>{o.name}</span>
                  </div>
                  <div className="koords mono">
                    <span className="achse">X</span><span className="wert">{zahl(o.x)}</span>
                    {o.y !== null && <><span className="achse">Y</span><span className="wert">{zahl(o.y)}</span></>}
                    <span className="achse">Z</span><span className="wert">{zahl(o.z)}</span>
                  </div>
                  <div className="unterzeile"><Umrechnung ort={o} /></div>
                </article>
              ))}
            </section>
          )}

          <section className="spalten">
            {DIMENSIONEN.map((d) => {
              const liste = orte.filter((o) => o.dimension === d.wert && !angeheftetIds.has(o.id)).sort(sortieren);
              return (
                <div key={d.wert} className={`spalte dim-${d.wert}`}>
                  <div className="spalte-kopf">
                    {d.label}
                    <span className="anzahl">{liste.length}</span>
                  </div>
                  {liste.length === 0 ? (
                    <div className="spalte-leer">Keine weiteren Orte</div>
                  ) : (
                    <AutoScroll>
                      {liste.map((o) => (
                        <div key={o.id} className={`zeile ${istNeu(o) ? 'neu' : ''}`}>
                          <Icon name={o.kategorie} groesse={22} />
                          <span className="name">
                            {o.name}
                            {istNeu(o) && <span className="neu-marke">NEU</span>}
                          </span>
                          <span className="koords"><Koords ort={o} /></span>
                          <span className="neben">
                            <span>{o.typ || KATEGORIEN.find((k) => k.wert === o.kategorie)?.label}</span>
                            <Umrechnung ort={o} />
                          </span>
                        </div>
                      ))}
                    </AutoScroll>
                  )}
                </div>
              );
            })}
          </section>
        </main>
      )}

      <aside className="seitenleiste">
        {qrZeigen && beitritt && (
          <div className="beitritt">
            <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="hinweis">Mit dem Handy scannen</div>
            <div className="adresse mono">{beitritt.adresse}</div>
            <div className="pin mono">{beitritt.pin}</div>
          </div>
        )}
        <div className="verlauf">
          {teilnehmer.length > 0 && (
            <div className="teilnehmer">
              {teilnehmer.map((n) => <span key={n} className="chip-klein">{n}</span>)}
            </div>
          )}
          <h2>Zuletzt gespeichert</h2>
          <ul>
            {neueste.map((o) => (
              <li key={o.id}>
                {o.name} <span className="wer">· {o.erstelltVon} · {vorZeit(o.erstelltAm, jetzt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
