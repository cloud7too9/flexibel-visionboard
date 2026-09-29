/**
 * Kennblock je Feature-Typ der Seed Map: der typische Block einer Struktur, z. B. Netherziegel
 * für die Netherfestung. Bilder in public/icons/struktur_kennbloecke (Quelle: minecraft.wiki),
 * dieselben wie in der Companion (companion/icons, dort `STRUKTUREN`).
 * Pfadruinen (Trail Ruins) fehlt noch ein Bild – dort bleibt das Linien-Icon der Kategorie.
 */
const KENNBLOECKE: Record<string, string> = {
  'Outpost': 'pillager_outpost',
  'Desert Temple': 'desert_pyramid',
  'Jungle Temple': 'jungle_pyramid',
  'Shipwreck': 'shipwreck',
  'Mansion': 'mansion',
  'Monument': 'monument',
  'Ancient City': 'ancient_city',
  'Trial Chamber': 'trial_chambers',
  'Stronghold': 'stronghold',
  'Nether Fortress': 'fortress',
  'Bastion': 'bastion_remnant',
  'End City': 'end_city',
};

/** Pfad zum Kennblock eines Feature-Typs oder null */
export const kennblockDatei = (typ: string | undefined | null) =>
  typ && Object.hasOwn(KENNBLOECKE, typ) ? `/icons/struktur_kennbloecke/${KENNBLOECKE[typ]}.png` : null;
