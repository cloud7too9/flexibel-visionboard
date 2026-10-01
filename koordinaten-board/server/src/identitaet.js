// Identität (Strang B, Phase B2): Accounts mit eigener PIN statt eines freien Namens.
// Ablauf: Der QR-Code der Anzeige führt zur Companion mit der Board-PIN (sie bleibt als Zugang
// zum Server, N4). Dort wählt man seinen Account oder legt einen neuen an: Name plus eigene PIN.
// Mit der richtigen PIN ist das Gerät freigeschaltet und bekommt ein Token als Geräteschlüssel –
// es fragt danach nicht erneut. Alle Einträge hängen an der Benutzer-ID (erstellerId), nie am
// Namen; deshalb kann hinter werBistDu() später ein richtiges Login stehen, ohne die Daten
// anzufassen. Das Modul kennt vom Board nur die Daten-Schnittstelle (benutzer…, geraet…).
import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fehlversuchSperre } from './sperre.js';

const scryptAsync = promisify(scrypt);
const FARBEN = ['#00e5ff', '#7cff6b', '#ffd23f', '#b98cff', '#ff9f43', '#4dabff'];
/** Eigene PIN eines Accounts: 4 bis 8 Ziffern */
export const KONTO_PIN = /^\d{4,8}$/;

export class AnmeldeFehler extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fehler = (status, text) => { throw new AnmeldeFehler(status, text); };

/** PIN nur gehasht speichern: scrypt mit eigenem Salz je Account */
export async function pinHashen(pin) {
  const salz = randomBytes(16);
  const hash = await scryptAsync(String(pin), salz, 32);
  return `scrypt:${salz.toString('base64')}:${hash.toString('base64')}`;
}

export async function pinPasst(pin, gespeichert) {
  const [art, salz, hash] = String(gespeichert ?? '').split(':');
  if (art !== 'scrypt' || !salz || !hash) return false;
  const ist = await scryptAsync(String(pin), Buffer.from(salz, 'base64'), 32);
  const soll = Buffer.from(hash, 'base64');
  return soll.length === ist.length && timingSafeEqual(soll, ist);
}

/**
 * @param {{ daten: import('./daten.js').Daten, geheim: string, boardPin: string }} optionen
 *   geheim: Schlüssel für die Signatur der Tokens (bleibt über Neustarts erhalten)
 */
export function identitaet({ daten, geheim, boardPin }) {
  const signieren = (x) => createHmac('sha256', geheim).update(x).digest('base64url');
  // Falsche Board-PIN je Gerät (IP), falsche Account-PIN je Gerät und Account
  const boardSperre = fehlversuchSperre();
  const kontoSperre = fehlversuchSperre();

  function tokenErstellen(inhalt) {
    const teil = Buffer.from(JSON.stringify(inhalt)).toString('base64url');
    return `${teil}.${signieren(teil)}`;
  }

  function tokenLesen(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [teil, signatur] = token.split('.');
    const erwartet = Buffer.from(signieren(teil));
    const erhalten = Buffer.from(signatur ?? '');
    if (erwartet.length !== erhalten.length || !timingSafeEqual(erwartet, erhalten)) return null;
    try {
      return JSON.parse(Buffer.from(teil, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  function boardPinPruefen(pin, ip) {
    const rest = boardSperre.gesperrt(ip);
    if (rest) fehler(429, `Zu viele falsche PINs – bitte ${rest} s warten`);
    if (String(pin ?? '') !== boardPin) {
      boardSperre.fehlschlag(ip);
      fehler(401, 'Falsche PIN');
    }
    boardSperre.erfolg(ip);
  }

  /** Wer steckt hinter einem Token? { id, name, farbe, geraetId } – null bei altem Token (vor B2) oder gesperrtem Gerät */
  function ausToken(token) {
    const t = tokenLesen(token);
    if (!t?.b || !t?.g) return null;
    const b = daten.benutzerVonGeraet(t.g);
    if (!b || b.id !== t.b) return null;
    return { id: b.id, name: b.anzeigename, farbe: t.f ?? FARBEN[0], geraetId: t.g };
  }

  return {
    ausToken,

    /** IdentitaetsAnbieter: Wer stellt diese Anfrage? (Bearer-Token) */
    werBistDu(req) {
      const kopf = req.headers.authorization ?? '';
      return kopf.startsWith('Bearer ') ? ausToken(kopf.slice(7)) : null;
    },

    /** Accounts zum Auswählen – nur mit der Board-PIN */
    konten(pin, ip) {
      boardPinPruefen(pin, ip);
      return daten.benutzerListe();
    },

    /**
     * Beitreten: Board-PIN, dann Account wählen (Name gibt es) oder anlegen (neuer Name), jeweils mit eigener PIN.
     * → { token, id, name, neu }
     */
    async anmelden({ pin, name, kontoPin, ip }) {
      boardPinPruefen(pin, ip);
      const anzeigename = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, 24) : '';
      if (!anzeigename) fehler(400, 'Name fehlt');
      if (!KONTO_PIN.test(String(kontoPin ?? ''))) fehler(400, 'Deine PIN hat 4 bis 8 Ziffern');
      let b = daten.benutzerMitName(anzeigename);
      let neu = false;
      if (b) {
        const schluessel = `${ip}|${b.id}`;
        const rest = kontoSperre.gesperrt(schluessel);
        if (rest) fehler(429, `Zu viele falsche PINs für ${b.anzeigename} – bitte ${rest} s warten`);
        if (!(await pinPasst(kontoPin, b.pinHash))) {
          kontoSperre.fehlschlag(schluessel);
          fehler(401, `Falsche PIN für ${b.anzeigename}`);
        }
        kontoSperre.erfolg(schluessel);
      } else {
        b = daten.benutzerAnlegen({ anzeigename, pinHash: await pinHashen(kontoPin) });
        neu = true;
      }
      const g = daten.geraetAnlegen(b.id);
      return { token: tokenErstellen({ b: b.id, g: g.id, f: FARBEN[randomInt(FARBEN.length)] }), id: b.id, name: b.anzeigename, neu };
    },
  };
}
