import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../../shared/ui/Modal";
import { WIDGET_TYPEN, schonDa } from "../model/widget-register";
import { BEREICHE, type WidgetTyp } from "../model/widget-struktur";
import type { Groessenstufe } from "../model/widget-vertrag";
import { selectActiveLayer, useWorkspaceStore } from "../model/workspace.store";

/** Kantenlänge einer Zelle in der Vorschau */
const VORSCHAU_ZELLE = 9;

const kleinsteStufe = (t: WidgetTyp): Groessenstufe =>
  t.vertrag.stufen.reduce((a, b) => (b.breite * b.hoehe < a.breite * a.hoehe ? b : a));

/** Gruppen der Galerie: Bereiche in der Reihenfolge der Companion, nur Treffer der Suche */
export function galerieGruppen(suche: string): { bereich: (typeof BEREICHE)[number]; typen: WidgetTyp[] }[] {
  const q = suche.trim().toLowerCase();
  return BEREICHE.map((bereich) => ({
    bereich,
    typen: WIDGET_TYPEN.filter((t) => t.bereich === bereich.id
      && (!q || `${t.name} ${bereich.name}`.toLowerCase().includes(q))),
  })).filter((g) => g.typen.length > 0);
}

/**
 * Galerie „Widget hinzufügen“ nach dem Vorbild des iOS-Kontrollzentrums:
 * gruppiert nach Bereich, mit Suche, je Widget-Typ eine Vorschau in seiner
 * kleinsten Stufe. Hinzufügen legt eine Instanz an der ersten freien Stelle an.
 * Typen, die nicht mehrfach sein dürfen, sind gesperrt, sobald sie auf dem Layer liegen.
 */
export function AddPanelModal() {
  const open = useWorkspaceStore((s) => s.addPanelOpen);
  const closeAddPanel = useWorkspaceStore((s) => s.closeAddPanel);
  const addItem = useWorkspaceStore((s) => s.addItem);
  const instanzen = useWorkspaceStore((s) => selectActiveLayer(s).instanzen);
  const [noSpace, setNoSpace] = useState(false);
  const [suche, setSuche] = useState("");
  const gruppen = useMemo(() => galerieGruppen(suche), [suche]);

  useEffect(() => {
    if (open) { setNoSpace(false); setSuche(""); }
  }, [open]);

  return (
    <Modal open={open} title="Widget hinzufügen" onClose={closeAddPanel}>
      <input
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder="Widgets suchen …"
        aria-label="Widgets suchen"
        className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {noSpace && (
        <p role="alert" className="mb-3 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm">
          Auf diesem Layer ist kein Platz mehr frei. Verkleinere oder entferne ein Widget, oder
          lege einen neuen Layer an.
        </p>
      )}
      {gruppen.length === 0 && <p className="py-6 text-center text-sm text-text-muted">Kein Widget gefunden.</p>}
      <div className="flex flex-col gap-4">
        {gruppen.map(({ bereich, typen }) => (
          <section key={bereich.id} data-bereich={bereich.id} aria-label={bereich.name}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{bereich.name}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {typen.map((t) => {
                const s = kleinsteStufe(t);
                const da = schonDa(instanzen, t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-widget-typ={t.id}
                    disabled={da}
                    onClick={() => setNoSpace(!addItem(t.id))}
                    className="flex min-h-[44px] items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left text-sm transition-colors hover:border-accent hover:bg-surface-raised disabled:cursor-default disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-surface"
                  >
                    {/* Vorschau in der kleinsten Stufe, maßstäblich in Zellen */}
                    <span
                      aria-hidden="true"
                      data-testid="vorschau"
                      className="shrink-0 rounded-[4px] border border-border-strong bg-surface-raised"
                      style={{ width: s.breite * VORSCHAU_ZELLE, height: s.hoehe * VORSCHAU_ZELLE }}
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-1.5 font-medium">
                        <span>{t.name}</span>
                        {t.optional && <span className="text-[10px] font-normal uppercase tracking-wide text-text-muted">optional</span>}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {da ? "liegt schon auf diesem Layer" : `${s.breite}×${s.hoehe} · ${s.informationsumfang}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
