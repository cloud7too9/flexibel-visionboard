/**
 * Bereichs-Themes (planung/bauplaene/Bauplan-Bereichs-Themes.md): Am Gehäuse
 * erkennt man, aus welchem Bereich ein Widget stammt. Ein Theme ist ein Satz
 * CSS-Variablen (shared/styles/themes.css, `[data-theme="…"]`), der die
 * Farb-Tokens überschreibt – Inhalte nutzen nur diese Tokens, nie feste Farben,
 * und bekommen das Theme so von selbst.
 */
import type { BereichId } from "./widget-struktur";

export type ThemeId =
  | "standard"
  | "karte-oberwelt" | "karte-nether" | "karte-end"
  | "handbuch" | "bauplaene" | "portale"
  | "sammelobjekte" | "banner" | "ruestung";

/** Was ein dynamisches Theme vom Widget weiß, z. B. die angezeigte Dimension */
export interface WidgetZustand {
  dimension?: "oberwelt" | "nether" | "ende" | null;
}

export type ThemeQuelle =
  | { art: "fest"; theme: ThemeId }
  | { art: "dynamisch"; waehle: (zustand: WidgetZustand) => ThemeId };

const fest = (theme: ThemeId): ThemeQuelle => ({ art: "fest", theme });

/**
 * Theme je Bereich. Sammelobjekte, Banner und Rüstung sind noch nicht
 * festgelegt (E8): Sie tragen eigene Theme-IDs mit dem Standard-Theme
 * (Oberwelt-Grün wie in der Companion), damit sie später ohne Widget-Code
 * ersetzt werden können.
 */
export const BEREICH_THEMES: Readonly<Record<BereichId, ThemeQuelle>> = {
  // Die angezeigte Dimension bestimmt das Theme; ohne Dimension Oberwelt
  karte: { art: "dynamisch", waehle: ({ dimension }) =>
    dimension === "nether" ? "karte-nether" : dimension === "ende" ? "karte-end" : "karte-oberwelt" },
  sammelobjekte: fest("sammelobjekte"),
  portale: fest("portale"),
  handbuch: fest("handbuch"),
  bauplaene: fest("bauplaene"),
  banner: fest("banner"),
  ruestung: fest("ruestung"),
};

export function themeFuer(bereich: BereichId | undefined, zustand: WidgetZustand = {}): ThemeId {
  const quelle = bereich && BEREICH_THEMES[bereich];
  if (!quelle) return "standard";
  return quelle.art === "fest" ? quelle.theme : quelle.waehle(zustand);
}
