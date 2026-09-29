// Gemeinsame Daten von Companion und Board in einer JSON-Datei (daten.json):
// Welten, Orte (Typen + Instanzen), Sammelobjekte, Banner, Portal-Verbindungen
// und die Einstellungen der Anzeige. Die Abläufe entsprechen dem DEMO-Mock der
// Companion (mockApi in companion-prototyp.html), geprüft wird mit denselben
// Regeln (companion/regeln.js).
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { regeln } from './regeln.js';

const { DIM_ORDER, BIOMES, SAMMELOBJEKTE, WELTGRENZE } = regeln;

/** Fehler mit HTTP-Status, den die API 1:1 weitergibt */
export class DatenFehler extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fehler = (status, message) => { throw new DatenFehler(status, message); };

const STANDARD_EINSTELLUNGEN = { titel: 'Unsere Welt', qrZeigen: true, aktiveWelt: null };
const leer = () => ({
  zaehler: 0,
  welten: [],        // { id, seed }
  typen: [],         // { id, kategorie, variante|null }   – welt-übergreifend
  instanzen: [],     // { id, dimensionId, featureTypeId, x, y|null, z, quelle, angeheftet, von, am, geaendert? }
  sammel: {},        // { [weltId]: { [objektId]: { von, am } } }
  banner: [],        // { id, name, basis, ebenen, von, am }
  portale: [],       // { id, weltId, name, oberwelt, nether, von, am }
  einstellungen: { ...STANDARD_EINSTELLUNGEN },
});

const tag = () => new Date().toISOString().slice(0, 10);
const kopie = (x) => structuredClone(x);
const dimensionenVon = (welt) => DIM_ORDER.map((type) => ({ id: `d_${welt.id}_${type}`, worldId: welt.id, type }));
const ganz = (v) => Number.isInteger(v) && Math.abs(v) <= WELTGRENZE;

export class Daten {
  constructor(ordner) {
    this.datei = path.join(ordner, 'daten.json');
    this.inhalt = leer();
    this.version = 0;
    this.timer = null;
  }

  async laden() {
    await mkdir(path.dirname(this.datei), { recursive: true });
    try {
      const roh = JSON.parse(await readFile(this.datei, 'utf8'));
      this.inhalt = { ...leer(), ...roh, einstellungen: { ...STANDARD_EINSTELLUNGEN, ...roh.einstellungen } };
    } catch (f) {
      if (f.code !== 'ENOENT') console.warn('daten.json unlesbar, starte leer:', f.message);
    }
  }

  speichernVerzoegert() {
    this.version += 1;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.speichern().catch(console.error), 300);
  }

  async speichern() {
    clearTimeout(this.timer);
    const tmp = `${this.datei}.tmp`;
    await writeFile(tmp, JSON.stringify(this.inhalt, null, 2));
    await rename(tmp, this.datei);
  }

  neueId(praefix) {
    this.inhalt.zaehler += 1;
    return `${praefix}_${this.inhalt.zaehler}`;
  }

  // ---------- Welten + Orte ----------

  welt(id) {
    return this.inhalt.welten.find((w) => w.id === id) ?? fehler(404, 'Welt nicht gefunden');
  }

  /** Welt, deren Orte die Anzeige zeigt: die eingestellte, sonst die erste */
  aktiveWelt() {
    const { welten, einstellungen } = this.inhalt;
    return welten.find((w) => w.id === einstellungen.aktiveWelt) ?? welten[0] ?? null;
  }

  /** Dimension zu einer id – { id, worldId, type } oder null */
  dimension(id) {
    const m = /^d_(.+)_(overworld|nether|end)$/.exec(String(id ?? ''));
    if (!m || !this.inhalt.welten.some((w) => w.id === m[1])) return null;
    return { id: m[0], worldId: m[1], type: m[2] };
  }

  instanzenVon(weltId) {
    return this.inhalt.instanzen.filter((i) => this.dimension(i.dimensionId)?.worldId === weltId);
  }

  weltenListe() {
    return this.inhalt.welten.map((w) => ({ ...w, anzahl: this.instanzenVon(w.id).length }));
  }

  weltAnlegen(body) {
    const seed = String(body?.seed ?? '').trim();
    if (!/^-?\d{1,20}$/.test(seed)) fehler(400, 'Seed muss eine Zahl sein');
    if (this.inhalt.welten.some((w) => w.seed === seed)) fehler(409, 'Diese Welt gibt es schon');
    const welt = { id: this.neueId('w'), seed };
    this.inhalt.welten.push(welt);
    this.speichernVerzoegert();
    return kopie(welt);
  }

  weltLesen(id) {
    const welt = this.welt(id);
    return {
      welt: kopie(welt),
      dimensionen: dimensionenVon(welt),
      typen: kopie(this.inhalt.typen),   // alle Typen: Varianten sind welt-übergreifend
      instanzen: kopie(this.instanzenVon(id)),
    };
  }

  typFinden(kategorie, variante) {
    return this.inhalt.typen.find((t) => t.kategorie === kategorie && (t.variante || null) === (variante || null));
  }

  instanzAnlegen(body, von) {
    const d = this.dimension(body?.dimensionId);
    if (!d) fehler(400, 'Dimension unbekannt');
    const variante = body.variante ? String(body.variante).trim().slice(0, 60) : null;
    const quelle = body.quelle === 'screenshot' ? 'screenshot' : 'manuell';
    const vorhanden = this.typFinden(body.kategorie, variante);
    const problem = regeln.instanzPruefen({ ...body, variante, quelle }, d.type, Boolean(vorhanden));
    if (problem) fehler(422, problem);
    let typ = vorhanden;
    if (!typ) {
      typ = { id: this.neueId('t'), kategorie: body.kategorie, variante };
      this.inhalt.typen.push(typ);
    }
    const instanz = {
      id: this.neueId('i'), dimensionId: d.id, featureTypeId: typ.id,
      x: body.x, y: body.y ?? null, z: body.z, quelle, angeheftet: false, von, am: new Date().toISOString(),
    };
    this.inhalt.instanzen.push(instanz);
    this.speichernVerzoegert();
    return { instanz: kopie(instanz), typ: kopie(typ), weltId: d.worldId };
  }

  instanz(id) {
    return this.inhalt.instanzen.find((x) => x.id === id) ?? fehler(404, 'Ort nicht gefunden');
  }

  instanzAendern(id, body) {
    const i = this.instanz(id);
    const t = this.inhalt.typen.find((x) => x.id === i.featureTypeId);
    if (t?.kategorie === BIOMES) fehler(403, 'Biome stammen aus Screenshots und sind fest');
    if (!ganz(body?.x) || !ganz(body?.z) || (body.y != null && !ganz(body.y))) fehler(400, 'Ungültige Koordinaten');
    Object.assign(i, { x: body.x, y: body.y ?? null, z: body.z, geaendert: new Date().toISOString() });
    this.speichernVerzoegert();
    return { instanz: kopie(i), weltId: this.dimension(i.dimensionId)?.worldId };
  }

  instanzLoeschen(id) {
    const i = this.instanz(id);
    this.inhalt.instanzen.splice(this.inhalt.instanzen.indexOf(i), 1);
    this.speichernVerzoegert();
    return { weltId: this.dimension(i.dimensionId)?.worldId };
  }

  // ---------- Sammelobjekte ----------

  sammelLesen(weltId) {
    this.welt(weltId);
    return { status: kopie(this.inhalt.sammel[weltId] ?? {}) };
  }

  sammelSetzen(weltId, objektId, body, von) {
    this.welt(weltId);
    if (!SAMMELOBJEKTE.some((o) => o.id === objektId)) fehler(404, 'Unbekanntes Sammelobjekt');
    const status = (this.inhalt.sammel[weltId] ??= {});
    if (body?.gefunden) status[objektId] = { von, am: tag() };
    else delete status[objektId];
    this.speichernVerzoegert();
    return { status: kopie(status) };
  }

  // ---------- Portal-Verbindungen ----------

  portaleListe(weltId) {
    this.welt(weltId);
    return this.inhalt.portale.filter((v) => v.weltId === weltId).map(({ weltId: _w, ...v }) => kopie(v));
  }

  portal(id) {
    return this.inhalt.portale.find((x) => x.id === id) ?? fehler(404, 'Verbindung nicht gefunden');
  }

  portalAnlegen(weltId, body, von) {
    this.welt(weltId);
    const problem = regeln.verbindungRegelPruefen(body);
    if (problem) fehler(422, problem);
    const v = { id: this.neueId('p'), weltId, ...kopie(regeln.verbindungSauber(body)), von, am: tag() };
    this.inhalt.portale.push(v);
    this.speichernVerzoegert();
    const { weltId: _w, ...ohne } = v;
    return kopie(ohne);
  }

  portalAendern(id, body) {
    const v = this.portal(id);
    const problem = regeln.verbindungRegelPruefen(body);
    if (problem) fehler(422, problem);
    Object.assign(v, kopie(regeln.verbindungSauber(body)));
    this.speichernVerzoegert();
    const { weltId, ...ohne } = v;
    return { verbindung: kopie(ohne), weltId };
  }

  portalLoeschen(id) {
    const v = this.portal(id);
    this.inhalt.portale.splice(this.inhalt.portale.indexOf(v), 1);
    this.speichernVerzoegert();
    return { weltId: v.weltId };
  }

  // ---------- Banner (für alle Welten) ----------

  bannerListe() {
    return kopie(this.inhalt.banner);
  }

  bannerStueck(id) {
    return this.inhalt.banner.find((x) => x.id === id) ?? fehler(404, 'Banner nicht gefunden');
  }

  bannerAnlegen(body, von) {
    const problem = regeln.bannerPruefen(body);
    if (problem) fehler(422, problem);
    const b = { id: this.neueId('b'), ...kopie(regeln.bannerSauber(body)), von, am: tag() };
    this.inhalt.banner.unshift(b);
    this.speichernVerzoegert();
    return kopie(b);
  }

  bannerAendern(id, body) {
    const b = this.bannerStueck(id);
    const problem = regeln.bannerPruefen(body);
    if (problem) fehler(422, problem);
    Object.assign(b, kopie(regeln.bannerSauber(body)));
    this.speichernVerzoegert();
    return kopie(b);
  }

  bannerLoeschen(id) {
    const b = this.bannerStueck(id);
    this.inhalt.banner.splice(this.inhalt.banner.indexOf(b), 1);
    this.speichernVerzoegert();
  }

  // ---------- Einstellungen der Anzeige ----------

  einstellungenLesen() {
    return { ...kopie(this.inhalt.einstellungen), aktiv: this.aktiveWelt()?.id ?? null };
  }

  einstellungenAendern(felder = {}) {
    const e = this.inhalt.einstellungen;
    if ('titel' in felder) e.titel = String(felder.titel ?? '').trim().slice(0, 60) || STANDARD_EINSTELLUNGEN.titel;
    if ('qrZeigen' in felder) e.qrZeigen = Boolean(felder.qrZeigen);
    if ('aktiveWelt' in felder) {
      if (felder.aktiveWelt !== null) this.welt(felder.aktiveWelt);
      e.aktiveWelt = felder.aktiveWelt;
    }
    this.speichernVerzoegert();
    return this.einstellungenLesen();
  }
}
