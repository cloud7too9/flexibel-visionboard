import { zahl } from '../lib/koordinaten';

/** HUD-Chip „X 40 Y 89 Z −19“ */
export function KoordChip({ x, y, z, klein }: { x: number; y: number | null; z: number; klein?: boolean }) {
  const inhalt = (
    <>
      <span className="lbl">X</span><span className="v">{zahl(x)}</span>
      {y !== null && <><span className="lbl">Y</span><span className="v">{zahl(y)}</span></>}
      <span className="lbl">Z</span><span className="v">{zahl(z)}</span>
    </>
  );
  return klein ? <span className="coord mono">{inhalt}</span> : <span className="chip coord mono">{inhalt}</span>;
}
