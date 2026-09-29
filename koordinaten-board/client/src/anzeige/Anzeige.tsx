import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useBoard } from '../lib/verbindung';
import { DIMENSIONEN, KATEGORIEN, dimensionLabel, kategorieLabel, thema, type Ort } from '../lib/typen';
import { umrechnen, zahl } from '../lib/koordinaten';
import { Icon } from '../komponenten/Icon';
import { KoordChip } from '../komponenten/Eingaben';
import { Gezeigt } from './Gezeigt';

const MAX_ANGEHEFTET = 6;
const NEU_DAUER_MS = 90_000;

interface Beitritt {
  beitrittsUrl: string;
  adresse: string;
  pin: string;
  weitere: { name: string; url: string }[];
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
  return <div className="a-spalte-inhalt" ref={ref}><div className="stapel">{children}</div></div>;
}

/** „⟷ Nether 26 / −49“ */
function PortalChip({ ort, klein }: { ort: Ort; klein?: boolean }) {
  const u = umrechnen(ort);
  if (!u) return null;
  const inhalt = <><span className="pico">⟷</span> {dimensionLabel(u.dimension)} <b>{zahl(u.x)} / {zahl(u.z)}</b></>;
  return klein ? <span className="mono">{inhalt}</span> : <span className="chip portal-chip mono">{inhalt}</span>;
}

const kategorieIndex = (k: Ort['kategorie']) => KATEGORIEN.findIndex((x) => x.wert === k);
const sortieren = (a: Ort, b: Ort) =>
  kategorieIndex(a.kategorie) - kategorieIndex(b.kategorie) || a.name.localeCompare(b.name, 'de');

export function Anzeige() {
  const { zustand, verbunden, teilnehmer, gezeigt } = useBoard({ query: 'rolle=anzeige' });
  const [beitritt, setBeitritt] = useState<Beitritt | null>(null);
  const [qr, setQr] = useState('');
  const [gesperrt, setGesperrt] = useState(false);
  const jetzt = useJetzt();

  useEffect(() => {
    let letzteUrl = '';
    const holen = () =>
      fetch('/api/anzeige')
        .then((r) => (r.status === 403 ? (setGesperrt(true), null) : r.json()))
        .then((d: Beitritt | null) => {
          if (!d) return;
          setBeitritt(d);
          if (d.beitrittsUrl === letzteUrl) return;
          letzteUrl = d.beitrittsUrl;
          QRCode.toString(d.beitrittsUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setQr);
        })
        .catch(() => {});
    holen();
    // QR-Code folgt der Adresse, über die sich zuletzt ein Handy verbunden hat
    const t = window.setInterval(holen, 10_000);
    return () => clearInterval(t);
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
      <div className="a-fehler">
        Die Anzeige läuft nur direkt auf dem Board-Gerät (localhost).<br />
        Zum Eintragen bitte die Startseite öffnen.
      </div>
    );
  }

  const titel = zustand?.einstellungen.titel ?? 'Koordinaten-Board';
  const qrZeigen = zustand?.einstellungen.qrZeigen ?? true;

  return (
    <div className="anzeige thema-oberwelt">
      <header className="a-kopf">
        <div>
          <div className="title-row">
            <span className="compass"><Icon name="kompass" /></span>
            <h1>{titel}</h1>
          </div>
          <div className="subtitle">Koordinaten-Board · <b>{orte.length} Orte</b></div>
        </div>

        <div className="tabs" aria-hidden="true">
          {DIMENSIONEN.map((d) => (
            <span key={d.wert} className={`tab active ${thema(d.wert)}`}>
              {d.label} <span className="zahl">{orte.filter((o) => o.dimension === d.wert).length}</span>
            </span>
          ))}
        </div>

        <span className="status">
          <span className={`status-dot ${verbunden ? '' : 'off'}`} />
          {verbunden ? 'Verbunden' : 'Getrennt'}
        </span>
        <span className="uhr mono">
          {new Date(jetzt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </header>

      {orte.length === 0 ? (
        <div className="a-leer-gross">
          <span className="me-ico"><Icon name="kompass" groesse={36} /></span>
          <strong>Noch keine Orte gespeichert</strong>
          <span>QR-Code scannen, PIN eingeben und einen Seed-Map-Screenshot hochladen.</span>
        </div>
      ) : (
        <main className="a-haupt">
          {angeheftet.length > 0 && (
            <section className="a-angeheftet">
              {angeheftet.map((o) => (
                <article key={o.id} className={`a-gross ${thema(o.dimension)} ${istNeu(o) ? 'neu' : ''}`}>
                  {o.datei && <div className="bildgrund" style={{ backgroundImage: `url(/medien/${o.datei})` }} />}
                  <div className="kopfzeile">
                    <span className="ort-icon"><Icon name={o.kategorie} groesse={24} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{o.name}</div>
                      <div className="meta">{dimensionLabel(o.dimension)} · {o.typ || kategorieLabel(o.kategorie)}</div>
                    </div>
                    {istNeu(o) && <span className="pill">Neu</span>}
                  </div>
                  <KoordChip x={o.x} y={o.y} z={o.z} klein />
                  <div className="chips">
                    <PortalChip ort={o} />
                  </div>
                </article>
              ))}
            </section>
          )}

          <section className="a-spalten">
            {DIMENSIONEN.map((d) => {
              const liste = orte.filter((o) => o.dimension === d.wert && !angeheftetIds.has(o.id)).sort(sortieren);
              return (
                <div key={d.wert} className={`a-spalte ${thema(d.wert)}`}>
                  <div className="a-spalte-kopf">
                    <span className="tab active">{d.label}</span>
                    <span className="anzahl">{liste.length}</span>
                  </div>
                  {liste.length === 0 ? (
                    <div className="a-leer">Keine weiteren Orte</div>
                  ) : (
                    <AutoScroll>
                      {liste.map((o) => (
                        <div key={o.id} className={`a-zeile ${istNeu(o) ? 'neu' : ''}`}>
                          <span className="ort-icon"><Icon name={o.kategorie} groesse={18} /></span>
                          <span className="name">
                            <span>{o.name}</span>
                            {istNeu(o) && <span className="pill">Neu</span>}
                          </span>
                          <KoordChip x={o.x} y={o.y} z={o.z} klein />
                          <span className="unten">
                            <span>{o.typ || kategorieLabel(o.kategorie)}</span>
                            <PortalChip ort={o} klein />
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

      {gezeigt && <Gezeigt key={gezeigt.id} karte={gezeigt} seit={vorZeit(gezeigt.am, jetzt)} />}

      <aside className="a-seite">
        {qrZeigen && beitritt && (
          <div className="a-karte a-beitritt">
            <div className="kicker">Mit dem Handy beitreten</div>
            <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="adresse mono">{beitritt.adresse}</div>
            <div className="kicker">PIN</div>
            <div className="pin">{beitritt.pin}</div>
            {beitritt.weitere.length > 0 && (
              <div className="a-weitere">
                <div className="kicker">Klappt nicht? Andere Adressen</div>
                {beitritt.weitere.slice(0, 3).map((w) => (
                  <div key={w.url} className="mono">{w.url.replace('http://', '')} <span>{w.name}</span></div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="a-karte a-verlauf">
          {teilnehmer.length > 0 && (
            <>
              <div className="kicker">Spieler · {teilnehmer.length}</div>
              <div className="a-spieler">
                {teilnehmer.map((n) => <span key={n} className="chip"><span className="status-dot" /> {n}</span>)}
              </div>
            </>
          )}
          <div className="kicker">Zuletzt gespeichert</div>
          <div className="a-log">
            {neueste.map((o) => (
              <div key={o.id} className={`a-log-item ${thema(o.dimension)}`}>
                <div className="wann">{vorZeit(o.erstelltAm, jetzt)}</div>
                <div className="was"><b>{o.erstelltVon}</b><span className="pfeil">→</span>{o.name}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
