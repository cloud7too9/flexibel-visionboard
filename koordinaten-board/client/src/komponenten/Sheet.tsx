import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  titel: string;
  sub?: ReactNode;
  /** Bild links vom Titel, z. B. der Kennblock eines Orts */
  bild?: ReactNode;
  /** Dimensions-Theme für das Sheet, z. B. „thema-nether“ – sonst erbt es das App-Theme */
  thema?: string;
  schliessen: () => void;
  children: ReactNode;
  fuss?: ReactNode;
}

/** Bottom-Sheet mit Griff, wie „Spieler“/„Optionen“ in der Live-Karte. */
export function Sheet({ titel, sub, bild, thema, schliessen, children, fuss }: Props) {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => e.key === 'Escape' && schliessen();
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [schliessen]);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && schliessen()}>
      <div className={`sheet ${thema ?? ''}`} role="dialog" aria-modal="true" aria-label={titel}>
        <div className="grabber" />
        <div className="sheet-kopf">
          {bild && <span className="sheet-kopf-bild">{bild}</span>}
          <div className="titel">
            <h2>{titel}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={schliessen} aria-label="Schließen">
            <Icon name="schliessen" />
          </button>
        </div>
        <div className="sheet-inhalt">{children}</div>
        {fuss && <div className="sheet-fuss">{fuss}</div>}
      </div>
    </div>
  );
}
