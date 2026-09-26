import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  titel: string;
  schliessen: () => void;
  children: ReactNode;
  fuss?: ReactNode;
}

export function Sheet({ titel, schliessen, children, fuss }: Props) {
  useEffect(() => {
    const vorher = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const taste = (e: KeyboardEvent) => e.key === 'Escape' && schliessen();
    window.addEventListener('keydown', taste);
    return () => {
      document.body.style.overflow = vorher;
      window.removeEventListener('keydown', taste);
    };
  }, [schliessen]);

  return (
    <div className="sheet-hintergrund" onClick={(e) => e.target === e.currentTarget && schliessen()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titel}>
        <div className="sheet-kopf">
          <h2>{titel}</h2>
          <button className="knopf-icon" onClick={schliessen} aria-label="Schließen">
            <Icon name="schliessen" />
          </button>
        </div>
        <div className="sheet-inhalt">{children}</div>
        {fuss && <div className="sheet-fuss">{fuss}</div>}
      </div>
    </div>
  );
}
