import type { Block, Dimension, Karte } from "../karte.types";
import { zahl } from "../lib/zahl";

const DIM_NAME: Record<Dimension, string> = { oberwelt: "Oberwelt", nether: "Nether", ende: "End" };

function KoordinatenBlock({ b }: { b: Extract<Block, { art: "koordinaten" }> }) {
  return (
    <div className="karte-koord rounded-md border border-border bg-surface px-[0.6em] py-[0.35em]" data-dimension={b.dimension ?? undefined}>
      {(b.label || b.dimension) && (
        <p className="truncate text-[0.75em] text-text-muted">{b.label ?? DIM_NAME[b.dimension!]}</p>
      )}
      <p className="whitespace-nowrap font-semibold tabular-nums">
        X {zahl(b.x)}{b.y !== null && <> · Y {zahl(b.y)}</>} · Z {zahl(b.z)}
      </p>
    </div>
  );
}

function ZeilenBlock({ b }: { b: Extract<Block, { art: "zeilen" }> }) {
  return (
    <dl className="flex flex-col gap-y-[0.15em]">
      {b.zeilen.map((z, n) => (
        // Beide Seiten kürzen sich anteilig, damit ein langer Name den Wert nicht verdrängt
        <div key={n} className="flex items-baseline justify-between gap-x-[0.8em]">
          <dt className="min-w-0 truncate text-text-muted">{z.label}</dt>
          <dd className="min-w-0 truncate text-right">{z.wert}</dd>
        </div>
      ))}
    </dl>
  );
}

function BlockAnsicht({ b }: { b: Block }) {
  switch (b.art) {
    case "koordinaten": return <KoordinatenBlock b={b} />;
    case "zeilen": return <ZeilenBlock b={b} />;
    case "text": return <p className="text-[0.85em] leading-snug text-text-muted">{b.text}</p>;
    default: return null;
  }
}

/**
 * Rendert eine Karte vom Board: Titel, Untertitel und die Blöcke
 * koordinaten, zeilen, text, bild. Ein Bild steht links neben den übrigen
 * Blöcken (wie auf der Anzeige). Die Schrift wächst mit der Zelle des Rasters
 * (`--zelle`), was nicht passt, wird abgeschnitten – die Größen legt A7 fest.
 */
export function KarteAnsicht({ karte, gross = false, ohneTitel = false }: {
  karte: Karte;
  gross?: boolean;
  /** Titel steht schon im Gehäuse (z. B. „Portalverbindungen“) – nur den Untertitel zeigen */
  ohneTitel?: boolean;
}) {
  const bild = karte.bloecke.find((b): b is Extract<Block, { art: "bild" }> => b.art === "bild");
  const uebrige = karte.bloecke.filter((b) => b.art !== "bild");
  return (
    <article
      data-testid="karte"
      data-dimension={karte.dimension ?? undefined}
      className={["flex h-full min-h-0 flex-col gap-[0.5em] overflow-hidden", gross ? "text-base sm:text-lg" : "karte-schrift"].join(" ")}
    >
      <header className="min-w-0">
        <h3 className={ohneTitel ? "sr-only" : "truncate font-semibold leading-tight"}>{karte.titel}</h3>
        {karte.unter && <p className="truncate text-[0.8em] text-text-muted">{karte.unter}</p>}
      </header>
      <div className="flex min-h-0 flex-1 gap-[0.7em]">
        {bild && (
          // So hoch wie der Platz unter dem Titel, die Breite folgt dem Seitenverhältnis (Banner 1:2)
          <figure className="h-full max-w-[40%] shrink-0">
            <img
              src={bild.daten}
              alt={bild.label ?? karte.titel}
              className="h-full w-auto max-w-full object-contain object-top"
              style={{ imageRendering: bild.pixelig ? "pixelated" : undefined }}
            />
          </figure>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-[0.5em]">
          {uebrige.map((b, n) => <BlockAnsicht key={n} b={b} />)}
        </div>
      </div>
    </article>
  );
}
