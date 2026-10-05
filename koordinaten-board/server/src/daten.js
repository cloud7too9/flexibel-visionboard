// Gemeinsame Daten von Companion und Board in einer JSON-Datei (daten.json):
// Welten, Orte (Typen + Instanzen), Sammelobjekte, Banner, Rüstungs-Sets,
// Portal-Verbindungen und die Einstellungen der Anzeige. Die Abläufe entsprechen dem DEMO-Mock der
// Companion (mockApi in companion-prototyp.html), geprüft wird mit denselben
// Regeln (companion/regeln.js).
// Der Welt-Import (Biome) liegt je Welt in biome/<weltId>.json: Die Kacheln sind groß und sollen
// nicht bei jeder kleinen Änderung mit daten.json neu geschrieben werden.
import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { regeln } from './regeln.js';
import { layoutPruefen, reihenGueltig } from './layout.js';
import { WIDGETS } from './widgets.js';

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
  // Identität (Strang B): stabile Benutzer, Profile und Geräte. Gefüllt werden sie mit den Accounts (B2).
  benutzer: [],      // { id, anzeigename, pinHash, rolle:"Besitzer" }
  profile: [],       // { id, benutzerId, geteilt }
  geraete: [],       // { id, freigeschaltet, typ:"persoenlich"|"geteilt", profilId }
  welten: [],        // { id, seed }
  typen: [],         // { id, kategorie, variante|null }   – welt-übergreifend
  instanzen: [],     // { id, dimensionId, featureTypeId, x, y|null, z, quelle, angeheftet, von, am, geaendert? }
  sammel: {},        // { [weltId]: { [objektId]: { von, am } } }
  banner: [],        // { id, name, basis, ebenen, von, am }
  ruestung: [],      // { id, name, teile:{ helmet|chestplate|leggings|boots: { ruestung, muster, material, farbe }|null }, von, am }
  portale: [],       // { id, weltId, name, oberwelt, nether, von, am }
  anzeigen: [],      // { id, name, schluessel, am, reihen?, layout? } – Geräte, die als Anzeige laufen dürfen (Anzeige-Link), mit ihrem Widget-Layout
  einstellungen: { ...STANDARD_EINSTELLUNGEN },
});
/** Urheber eines Eintrags als stabile Benutzer-ID; `von` (Name) bleibt nur zur Anzeige.
    Einträge von vor den Accounts (B2) haben „unbekannt“. */
const ERSTELLER_UNBEKANNT = 'unbekannt';
/** Wer legt an: der angemeldete Nutzer ({ id, name } aus identitaet.js) oder – in Tests – nur ein Name */
const urheber = (nutzer) => (typeof nutzer === 'string'
  ? { von: nutzer, erstellerId: ERSTELLER_UNBEKANNT }
  : { von: nutzer?.name ?? '', erstellerId: nutzer?.id ?? ERSTELLER_UNBEKANNT });
/** Sammlungen mit Einträgen, die einen Ersteller haben */
const MIT_ERSTELLER = ['instanzen', 'banner', 'ruestung', 'portale'];

/** Zufälliger Anzeige-Schlüssel für den Link (URL-tauglich) */
const neuerSchluessel = () => randomBytes(18).toString('base64url');

const tag = () => new Date().toISOString().slice(0, 10);
function anzeigeName(body) {
  const name = String(body?.name ?? '').trim().slice(0, 40);
  if (!name) fehler(400, 'Bitte einen Namen für die Anzeige eingeben');
  return name;
}
const kopie = (x) => structuredClone(x);
const dimensionenVon = (welt) => DIM_ORDER.map((type) => ({ id: `d_${welt.id}_${type}`, worldId: welt.id, type }));
const ganz = (v) => Number.isInteger(v) && Math.abs(v) <= WELTGRENZE;

export class Daten {
  constructor(ordner) {
    this.datei = path.join(ordner, 'daten.json');
    this.biomeOrdner = path.join(ordner, 'biome');
    this.inhalt = leer();
    this.version = 0;
    this.timer = null;
    this.biomeReihe = Promise.resolve();   // Biom-Dateien nacheinander schreiben
  }

  async laden() {
    await mkdir(path.dirname(this.datei), { recursive: true });
    let text;
    try {
      text = await readFile(this.datei, 'utf8');
      const roh = JSON.parse(text);
      this.inhalt = { ...leer(), ...roh, einstellungen: { ...STANDARD_EINSTELLUNGEN, ...roh.einstellungen } };
    } catch (f) {
      if (f.code !== 'ENOENT') console.warn('daten.json unlesbar, starte leer:', f.message);
      text = null;
    }
    if (text) await this.biomPunkteEntfernen(text);
    this.erstellerNachtragen();
    this.anzeigenSicherstellen();
  }

  /** Alte Einträge ohne erstellerId (vor Strang B) bekommen „unbekannt“ */
  erstellerNachtragen() {
    let geaendert = false;
    const nachtragen = (e) => { if (e && !e.erstellerId) { e.erstellerId = ERSTELLER_UNBEKANNT; geaendert = true; } };
    for (const name of MIT_ERSTELLER) this.inhalt[name].forEach(nachtragen);
    for (const status of Object.values(this.inhalt.sammel)) Object.values(status).forEach(nachtragen);
    if (geaendert) this.speichernVerzoegert();
  }

  /** Biome kommen nur noch aus dem Welt-Import (regeln.js): alte Biom-Punkte aus Screenshots
      entfernen, vorher den alten Stand einmal als daten.vor-welt-import.json sichern. */
  async biomPunkteEntfernen(alterText) {
    const biomTypen = new Set(this.inhalt.typen.filter((t) => t.kategorie === BIOMES).map((t) => t.id));
    const weg = this.inhalt.instanzen.filter((i) => biomTypen.has(i.featureTypeId));
    if (!biomTypen.size) return;
    await writeFile(path.join(path.dirname(this.datei), 'daten.vor-welt-import.json'), alterText);
    this.inhalt.instanzen = this.inhalt.instanzen.filter((i) => !biomTypen.has(i.featureTypeId));
    this.inhalt.typen = this.inhalt.typen.filter((t) => !biomTypen.has(t.id));
    await this.speichern();
    console.log(`  ${weg.length} Biom-Punkte aus Screenshots entfernt – Biome kommen jetzt aus dem Welt-Import (Sicherung: daten.vor-welt-import.json).`);
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

  /** ID eines neuen Eintrags: vom Handy (UUID, regeln.js) – geprüft und nicht doppelt – oder ohne vom Server */
  eintragId(body, praefix, liste) {
    if (body?.id == null) return this.neueId(praefix);
    if (!regeln.idGueltig(body.id)) fehler(400, 'Ungültige ID');
    if (liste.some((x) => x.id === body.id)) fehler(409, 'Diesen Eintrag gibt es schon');
    return body.id;
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
    const id = this.eintragId(body, 'i', this.inhalt.instanzen);
    let typ = vorhanden;
    if (!typ) {
      typ = { id: this.neueId('t'), kategorie: body.kategorie, variante };
      this.inhalt.typen.push(typ);
    }
    const instanz = {
      id, dimensionId: d.id, featureTypeId: typ.id,
      x: body.x, y: body.y ?? null, z: body.z, quelle, angeheftet: false, ...urheber(von), am: new Date().toISOString(),
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
    if (!ganz(body?.x) || !ganz(body?.z) || (body.y != null && !ganz(body.y))) fehler(400, 'Ungültige Koordinaten');
    Object.assign(i, { x: body.x, y: body.y ?? null, z: body.z, geaendert: new Date().toISOString() });
    this.speichernVerzoegert();
    return { instanz: kopie(i), weltId: this.dimension(i.dimensionId)?.worldId };
  }

  /** Für die großen Karten der Anzeige */
  instanzAnheften(id, body) {
    const i = this.instanz(id);
    Object.assign(i, { angeheftet: Boolean(body?.angeheftet), geaendert: new Date().toISOString() });
    this.speichernVerzoegert();
    return { instanz: kopie(i), weltId: this.dimension(i.dimensionId)?.worldId };
  }

  instanzLoeschen(id) {
    const i = this.instanz(id);
    this.inhalt.instanzen.splice(this.inhalt.instanzen.indexOf(i), 1);
    this.speichernVerzoegert();
    return { weltId: this.dimension(i.dimensionId)?.worldId };
  }

  // ---------- Welt-Import: Biome je Welt ----------

  biomDatei(weltId) {
    this.welt(weltId);
    return path.join(this.biomeOrdner, `${weltId.replace(/[^\w-]/g, '_')}.json`);
  }

  /** → { import: WeltImport | null, kacheln: [{ dim, kx, kz, daten }] } */
  async biomeLesen(weltId) {
    try {
      return JSON.parse(await readFile(this.biomDatei(weltId), 'utf8'));
    } catch (f) {
      if (f instanceof DatenFehler) throw f;
      if (f.code !== 'ENOENT') console.warn(`Biome von ${weltId} unlesbar:`, f.message);
      return { import: null, kacheln: [] };
    }
  }

  /** Ersetzt Import und alle Kacheln der Welt in einem Schritt → { import } */
  async biomeSetzen(weltId, body, von) {
    const datei = this.biomDatei(weltId);
    const problem = regeln.biomImportPruefen(body, this.welt(weltId));
    if (problem) fehler(422, problem);
    const sauber = regeln.biomImportSauber(body);
    const imp = { id: this.neueId('bi'), weltId, ...kopie(sauber.import), von: urheber(von).von, importiertAm: new Date().toISOString() };
    this.speichernVerzoegert();   // Zähler der IDs
    await this.biomeSchreiben(datei, JSON.stringify({ import: imp, kacheln: sauber.kacheln }));
    return { import: imp };
  }

  async biomeLoeschen(weltId) {
    const datei = this.biomDatei(weltId);
    await this.biomeSchreiben(datei, null);
  }

  /** Atomar schreiben (oder löschen, inhalt null) – eins nach dem anderen */
  biomeSchreiben(datei, inhalt) {
    const lauf = this.biomeReihe.then(async () => {
      if (inhalt === null) return rm(datei, { force: true });
      await mkdir(this.biomeOrdner, { recursive: true });
      await writeFile(`${datei}.tmp`, inhalt);
      await rename(`${datei}.tmp`, datei);
    });
    this.biomeReihe = lauf.catch(() => {});
    return lauf;
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
    if (body?.gefunden) status[objektId] = { ...urheber(von), am: tag() };
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
    const v = { id: this.eintragId(body, 'p', this.inhalt.portale), weltId, ...kopie(regeln.verbindungSauber(body)), ...urheber(von), am: tag() };
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
    const b = { id: this.eintragId(body, 'b', this.inhalt.banner), ...kopie(regeln.bannerSauber(body)), ...urheber(von), am: tag() };
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

  // ---------- Rüstungs-Sets (für alle Welten) ----------

  ruestungListe() {
    return kopie(this.inhalt.ruestung);
  }

  ruestungSet(id) {
    return this.inhalt.ruestung.find((x) => x.id === id) ?? fehler(404, 'Rüstungs-Set nicht gefunden');
  }

  ruestungAnlegen(body, von) {
    const problem = regeln.ruestungPruefen(body);
    if (problem) fehler(422, problem);
    const s = { id: this.eintragId(body, 'r', this.inhalt.ruestung), ...kopie(regeln.ruestungSauber(body)), ...urheber(von), am: tag() };
    this.inhalt.ruestung.unshift(s);
    this.speichernVerzoegert();
    return kopie(s);
  }

  ruestungAendern(id, body) {
    const s = this.ruestungSet(id);
    const problem = regeln.ruestungPruefen(body);
    if (problem) fehler(422, problem);
    Object.assign(s, kopie(regeln.ruestungSauber(body)));
    this.speichernVerzoegert();
    return kopie(s);
  }

  ruestungLoeschen(id) {
    const s = this.ruestungSet(id);
    this.inhalt.ruestung.splice(this.inhalt.ruestung.indexOf(s), 1);
    this.speichernVerzoegert();
  }

  // ---------- Anzeigen: Geräte mit Anzeige-Link ----------

  /** Beim ersten Start gibt es eine Anzeige „Board“ (läuft meist auf dem Server selbst, localhost) */
  anzeigenSicherstellen() {
    if (this.inhalt.anzeigen.length) return;
    this.inhalt.anzeigen.push({ id: this.neueId('a'), name: 'Board', schluessel: neuerSchluessel(), am: new Date().toISOString() });
    this.speichernVerzoegert();
  }

  /** Anzeigen ohne Layout (das holt man einzeln), reihen: null, solange sie sich nicht gemeldet hat */
  anzeigenListe() {
    return this.inhalt.anzeigen.map(({ layout: _l, vollbild: _v, ...a }) => ({ ...kopie(a), reihen: a.reihen ?? null }));
  }

  anzeige(id) {
    return this.inhalt.anzeigen.find((a) => a.id === id) ?? fehler(404, 'Anzeige nicht gefunden');
  }

  anzeigeAnlegen(body) {
    const a = { id: this.neueId('a'), name: anzeigeName(body), schluessel: neuerSchluessel(), am: new Date().toISOString() };
    this.inhalt.anzeigen.push(a);
    this.speichernVerzoegert();
    return kopie(a);
  }

  anzeigeUmbenennen(id, body) {
    const a = this.anzeige(id);
    a.name = anzeigeName(body);
    this.speichernVerzoegert();
    return kopie(a);
  }

  /** Neuer Schlüssel – alte Links gelten danach nicht mehr */
  anzeigeSchluesselNeu(id) {
    const a = this.anzeige(id);
    a.schluessel = neuerSchluessel();
    this.speichernVerzoegert();
    return kopie(a);
  }

  /** Die Anzeige des Board-Geräts selbst (localhost ohne Link): die erste, beim ersten Start „Board“ */
  anzeigeLokal() {
    this.anzeigenSicherstellen();
    return kopie(this.inhalt.anzeigen[0]);
  }

  /** Layout einer Anzeige: { anzeige, reihen, layout, vollbild } – layout null, solange keins gespeichert ist;
      vollbild: ID des Widgets, das die Anzeige gerade allein zeigt (vom Handy gestartet), sonst null */
  anzeigeLayout(id) {
    const a = this.anzeige(id);
    return { anzeige: { id: a.id, name: a.name }, reihen: a.reihen ?? null, layout: kopie(a.layout ?? null), vollbild: a.vollbild ?? null };
  }

  anzeigeLayoutSetzen(id, body) {
    const a = this.anzeige(id);
    const { layout, fehler: problem } = layoutPruefen(body, Object.keys(WIDGETS));
    if (problem) fehler(422, problem);
    a.layout = layout;
    // Ein Vollbild endet, wenn sein Widget nicht mehr im aktiven Layer liegt
    if (a.vollbild && !this.imAktivenLayer(a, a.vollbild)) a.vollbild = null;
    this.speichernVerzoegert();
    return this.anzeigeLayout(id);
  }

  imAktivenLayer(a, instanzId) {
    const layer = a.layout?.layer.find((l) => l.id === a.layout.aktiverLayer);
    return Boolean(layer?.instanzen.some((i) => i.id === instanzId));
  }

  /** Vollbild an der Anzeige starten (ID eines Widgets im aktiven Layer) oder beenden (null) */
  anzeigeVollbildSetzen(id, instanzId) {
    const a = this.anzeige(id);
    if (instanzId != null && (typeof instanzId !== 'string' || !this.imAktivenLayer(a, instanzId))) {
      fehler(422, 'Dieses Widget liegt nicht im aktiven Layer der Anzeige');
    }
    a.vollbild = instanzId ?? null;
    this.speichernVerzoegert();
    return this.anzeigeLayout(id);
  }

  /** Eine Anzeige meldet, wie viele Reihen auf ihren Bildschirm passen – true, wenn sich etwas geändert hat */
  anzeigeReihenSetzen(id, reihen) {
    const a = this.anzeige(id);
    if (!reihenGueltig(reihen)) fehler(400, 'Reihen müssen eine ganze Zahl von 1 bis 200 sein');
    if (a.reihen === reihen) return false;
    a.reihen = reihen;
    this.speichernVerzoegert();
    return true;
  }

  /** Anzeige zu id + Schlüssel aus dem Link, sonst null (Vergleich in konstanter Zeit) */
  anzeigeMitSchluessel(id, schluessel) {
    const a = this.inhalt.anzeigen.find((x) => x.id === id);
    if (!a || typeof schluessel !== 'string') return null;
    const soll = Buffer.from(a.schluessel), ist = Buffer.from(schluessel);
    return soll.length === ist.length && timingSafeEqual(soll, ist) ? kopie(a) : null;
  }

  // ---------- Identität: Benutzer, Profile, Geräte (B2, Abläufe in identitaet.js) ----------

  /** Accounts zum Auswählen beim Beitreten – ohne PIN-Hash */
  benutzerListe() {
    return this.inhalt.benutzer.map((b) => ({ id: b.id, name: b.anzeigename }));
  }

  benutzer(id) {
    return this.inhalt.benutzer.find((b) => b.id === id) ?? null;
  }

  /** Account zu einem Namen, ohne Groß-/Kleinschreibung (der Name ist nur Anzeige, aber eindeutig) */
  benutzerMitName(name) {
    const gesucht = String(name).trim().toLocaleLowerCase('de');
    return this.inhalt.benutzer.find((b) => b.anzeigename.toLocaleLowerCase('de') === gesucht) ?? null;
  }

  benutzerAnlegen({ anzeigename, pinHash }) {
    if (this.benutzerMitName(anzeigename)) fehler(409, `Den Namen „${anzeigename}“ gibt es schon`);
    const b = { id: randomUUID(), anzeigename, pinHash, rolle: 'Besitzer', am: new Date().toISOString() };
    this.inhalt.benutzer.push(b);
    this.speichernVerzoegert();
    return kopie(b);
  }

  /** Neues freigeschaltetes Gerät für einen Account; ein persönliches Profil entsteht beim ersten Gerät */
  geraetAnlegen(benutzerId, typ = 'persoenlich') {
    let profil = this.inhalt.profile.find((p) => p.benutzerId === benutzerId && !p.geteilt);
    if (!profil) {
      profil = { id: randomUUID(), benutzerId, geteilt: false };
      this.inhalt.profile.push(profil);
    }
    const g = { id: randomUUID(), freigeschaltet: true, typ, profilId: profil.id, am: new Date().toISOString() };
    this.inhalt.geraete.push(g);
    this.speichernVerzoegert();
    return kopie(g);
  }

  /** Account hinter einem freigeschalteten Gerät, sonst null */
  benutzerVonGeraet(geraetId) {
    const g = this.inhalt.geraete.find((x) => x.id === geraetId);
    if (!g?.freigeschaltet) return null;
    const profil = this.inhalt.profile.find((p) => p.id === g.profilId);
    return profil ? this.benutzer(profil.benutzerId) : null;
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
