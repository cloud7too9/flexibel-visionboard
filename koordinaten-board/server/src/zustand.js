// Board-Zustand: Minecraft-Orte + Einstellungen, Validierung und Speicherung als JSON.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export const DIMENSIONEN = ['oberwelt', 'nether', 'ende'];
export const KATEGORIEN = ['basis', 'farm', 'portal', 'dorf', 'struktur', 'ressource', 'sonstiges'];
export const DATEI_MUSTER = /^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|gif)$/;

// Minecraft-Weltgrenze liegt bei ±30.000.000, Höhe realistisch -64 … 320 (großzügig begrenzt)
const XZ_GRENZE = 30_000_000;
const Y_GRENZE = 4096;

const STANDARD_EINSTELLUNGEN = {
  titel: 'Unsere Welt',
  qrZeigen: true,
};

const ganzzahl = (wert, grenze) => {
  const zahl = Math.round(Number(wert));
  if (!Number.isFinite(zahl) || Math.abs(zahl) > grenze) return null;
  return zahl;
};

const text = (wert, max) => (typeof wert === 'string' ? wert.trim().slice(0, max) : '');

/** Übernimmt nur erlaubte Felder in einen Ort. Gibt null zurück, wenn ungültig. */
export function ortBereinigen(eingabe, basis = {}) {
  const o = { ...basis };
  if ('name' in eingabe) o.name = text(eingabe.name, 60);
  for (const achse of ['x', 'z']) {
    if (achse in eingabe) {
      const wert = ganzzahl(eingabe[achse], XZ_GRENZE);
      if (wert === null) return null;
      o[achse] = wert;
    }
  }
  if ('y' in eingabe) {
    // Y ist optional (leer = unbekannt)
    if (eingabe.y === null || eingabe.y === '') o.y = null;
    else {
      const wert = ganzzahl(eingabe.y, Y_GRENZE);
      if (wert === null) return null;
      o.y = wert;
    }
  }
  if ('dimension' in eingabe) {
    if (!DIMENSIONEN.includes(eingabe.dimension)) return null;
    o.dimension = eingabe.dimension;
  }
  if ('kategorie' in eingabe) {
    if (!KATEGORIEN.includes(eingabe.kategorie)) return null;
    o.kategorie = eingabe.kategorie;
  }
  if ('notiz' in eingabe) o.notiz = text(eingabe.notiz, 1000);
  if ('datei' in eingabe) {
    if (eingabe.datei && !DATEI_MUSTER.test(eingabe.datei)) return null;
    o.datei = eingabe.datei || '';
  }
  if ('angeheftet' in eingabe) o.angeheftet = Boolean(eingabe.angeheftet);

  if (!o.name || typeof o.x !== 'number' || typeof o.z !== 'number') return null;
  return o;
}

export function einstellungenBereinigen(eingabe, basis) {
  const e = { ...basis };
  if ('titel' in eingabe) e.titel = text(eingabe.titel, 60) || STANDARD_EINSTELLUNGEN.titel;
  if ('qrZeigen' in eingabe) e.qrZeigen = Boolean(eingabe.qrZeigen);
  return e;
}

export class Zustand {
  constructor(datenOrdner) {
    this.datei = path.join(datenOrdner, 'zustand.json');
    this.orte = [];
    this.einstellungen = { ...STANDARD_EINSTELLUNGEN };
    this.version = 0;
    this.speicherTimer = null;
  }

  async laden() {
    await mkdir(path.dirname(this.datei), { recursive: true });
    try {
      const roh = JSON.parse(await readFile(this.datei, 'utf8'));
      this.orte = Array.isArray(roh.orte) ? roh.orte : [];
      this.einstellungen = { ...STANDARD_EINSTELLUNGEN, ...roh.einstellungen };
      this.version = roh.version ?? 0;
    } catch (fehler) {
      if (fehler.code !== 'ENOENT') console.warn('zustand.json unlesbar, starte leer:', fehler.message);
    }
  }

  momentaufnahme() {
    return { orte: this.orte, einstellungen: this.einstellungen, version: this.version };
  }

  /** Wendet eine Operation an. Gibt { geaendert, entfernteDateien, fehler } zurück. */
  anwenden(op, autor) {
    const entfernteDateien = [];
    const index = op.id ? this.orte.findIndex((o) => o.id === op.id) : -1;
    const jetzt = new Date().toISOString();

    switch (op.art) {
      case 'hinzufuegen': {
        const ort = ortBereinigen(op.ort ?? {}, {
          y: null, dimension: 'oberwelt', kategorie: 'sonstiges',
          notiz: '', datei: '', angeheftet: false,
        });
        if (!ort) return { geaendert: false, entfernteDateien, fehler: 'Ungültiger Ort' };
        ort.id = randomUUID();
        ort.erstelltVon = autor;
        ort.erstelltAm = jetzt;
        ort.geaendertAm = jetzt;
        this.orte.push(ort);
        break;
      }
      case 'aendern': {
        if (index < 0) return { geaendert: false, entfernteDateien, fehler: 'Ort nicht gefunden' };
        const vorher = this.orte[index];
        const ort = ortBereinigen(op.felder ?? {}, vorher);
        if (!ort) return { geaendert: false, entfernteDateien, fehler: 'Ungültige Änderung' };
        if (vorher.datei && vorher.datei !== ort.datei) entfernteDateien.push(vorher.datei);
        ort.geaendertAm = jetzt;
        this.orte[index] = ort;
        break;
      }
      case 'entfernen': {
        if (index < 0) return { geaendert: false, entfernteDateien };
        const [weg] = this.orte.splice(index, 1);
        if (weg.datei) entfernteDateien.push(weg.datei);
        break;
      }
      case 'einstellungen': {
        this.einstellungen = einstellungenBereinigen(op.felder ?? {}, this.einstellungen);
        break;
      }
      default:
        return { geaendert: false, entfernteDateien, fehler: 'Unbekannte Operation' };
    }

    this.version += 1;
    this.speichernVerzoegert();
    return { geaendert: true, entfernteDateien };
  }

  speichernVerzoegert() {
    clearTimeout(this.speicherTimer);
    this.speicherTimer = setTimeout(() => this.speichern().catch(console.error), 300);
  }

  async speichern() {
    const tmp = `${this.datei}.tmp`;
    await writeFile(tmp, JSON.stringify(this.momentaufnahme(), null, 2));
    await rename(tmp, this.datei);
  }
}
