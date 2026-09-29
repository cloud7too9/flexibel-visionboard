import type { GezeigteKarte, KartenBlock } from '../lib/typen';
import { dimensionLabel, thema } from '../lib/typen';
import { zahl } from '../lib/koordinaten';
import { kennblockDatei } from '../lib/kennbloecke';
import { OrtIcon } from '../komponenten/OrtIcon';

/**
 * Karte, die ein Handy auf die Anzeige geworfen hat („Aufs Board“).
 * Liegt groß über dem Hauptbereich, bis die nächste kommt oder jemand sie wegnimmt.
 * Die Blöcke sind allgemein gehalten – das Board kennt keine Companion-Bereiche.
 */
export function Gezeigt({ karte, seit }: { karte: GezeigteKarte; seit: string }) {
  const kicker = [karte.bereich, karte.dimension && dimensionLabel(karte.dimension)].filter(Boolean).join(' · ');
  return (
    <section className="a-gezeigt" aria-live="polite">
      <article className={`g-karte ${karte.dimension ? thema(karte.dimension) : ''}`}>
        <div className="g-kopf">
          {kicker && <div className="kicker">{kicker}</div>}
          <span className="chip g-von">
            <span className="status-dot" style={{ background: karte.farbe, boxShadow: `0 0 8px ${karte.farbe}` }} />
            <b>{karte.von}</b> · {seit}
          </span>
        </div>
        <div className="g-titel">
          {kennblockDatei(karte.typ) && <span className="g-kennblock"><OrtIcon typ={karte.typ} groesse={0} /></span>}
          <div className="g-titel-text">
            <h2>{karte.titel}</h2>
            {karte.unter && <div className="g-unter">{karte.unter}</div>}
          </div>
        </div>
        <div className="g-bloecke">
          {karte.bloecke.map((b, i) => <Block key={i} block={b} />)}
        </div>
      </article>
    </section>
  );
}

function Block({ block }: { block: KartenBlock }) {
  switch (block.art) {
    case 'koordinaten': {
      const achsen: [string, number | null][] = [['X', block.x], ['Y', block.y], ['Z', block.z]];
      return (
        <div className={`g-koord ${block.dimension ? thema(block.dimension) : ''}`}>
          {block.label && <div className="kicker">{block.label}</div>}
          <div className="g-achsen mono">
            {achsen.filter(([, v]) => v !== null).map(([a, v]) => (
              <div key={a}><span className="lbl">{a}</span><b>{zahl(v as number)}</b></div>
            ))}
          </div>
        </div>
      );
    }
    case 'zeilen':
      return (
        <div className="g-zeilen">
          {block.zeilen.map((z, i) => (
            <div key={i} className="g-zeile"><span>{z.label}</span><b>{z.wert}</b></div>
          ))}
        </div>
      );
    case 'text':
      return <p className="g-text">{block.text}</p>;
    case 'bild':
      return (
        <figure className="g-bild">
          <img src={block.daten} alt={block.label ?? ''} className={block.pixelig ? 'pixelig' : undefined} />
          {block.label && <figcaption className="kicker">{block.label}</figcaption>}
        </figure>
      );
  }
}
