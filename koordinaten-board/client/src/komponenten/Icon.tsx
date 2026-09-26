import type { Kategorie } from '../lib/typen';

// Einfache Linien-Icons (24er Raster, stroke = currentColor)
const PFADE: Record<string, string> = {
  basis: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  farm: 'M12 21V11M12 11c0-4.4 3.1-7.5 7.5-7.5 0 4.4-3.1 7.5-7.5 7.5zM12 15c0-3.6-2.6-6.5-6.5-6.5 0 3.6 2.6 6.5 6.5 6.5z',
  portal: 'M5 21V6.5a7 7 0 0 1 14 0V21M9 21V8.5a3 3 0 0 1 6 0V21M3 21h18',
  dorf: 'M2 21v-9l5-4 5 4v9zM12 21v-6l5-4 5 4v6zM5.5 21v-4h3v4',
  struktur: 'M4 21V4h3v3h3V4h4v3h3V4h3v17zM10 21v-5h4v5',
  ressource: 'M6.5 3h11L22 9 12 21 2 9zM2 9h20M12 21 8.5 9l3.5-6 3.5 6z',
  sonstiges: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  plus: 'M12 5v14M5 12h14',
  zahnrad: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  suche: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  pin: 'M12 17v5M9 10.8V4h6v6.8l3 3.2v2H6v-2z',
  kompass: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z',
  kopieren: 'M9 9h11v11H9zM5 15H4V4h11v1',
  stift: 'M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z',
  muell: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  schliessen: 'M18 6 6 18M6 6l12 12',
  bild: 'M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  einfuegen: 'M9 2h6v4H9zM16 4h3v17H5V4h3',
};

export type IconName = keyof typeof PFADE | Kategorie;

export function Icon({ name, groesse = 20 }: { name: IconName; groesse?: number }) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PFADE[name]} />
    </svg>
  );
}
