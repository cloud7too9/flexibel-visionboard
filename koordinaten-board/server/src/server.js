// Koordinaten-Board – der eine Server für Companion (Handys im WLAN) und Anzeige (im Raum):
// liefert die Companion aus, hält die gemeinsamen Daten (daten.json) und synchronisiert live.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyWebsocket from '@fastify/websocket';
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Daten } from './daten.js';
import { companionApi } from './companion-api.js';
import { anzeigeSicht } from './sicht.js';
import { COMPANION_ORDNER } from './regeln.js';
import { besteAdresse } from './netzwerk.js';
import { fehlversuchSperre } from './sperre.js';
import { kartePruefen } from './zeigen.js';
import { erkennungBeenden } from './erkennung.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const DATEN = path.resolve(process.env.DATEN_ORDNER ?? path.join(HIER, '..', 'daten'));
const CLIENT_DIST = path.resolve(HIER, '..', '..', 'client', 'dist');
// Seite der Companion, die unter / ausgeliefert wird (später z. B. modul-a-live-karte.html)
const COMPANION_DATEI = process.env.COMPANION_DATEI ?? 'companion-prototyp.html';
// Anzeige darf standardmäßig nur vom Gerät selbst geöffnet werden (localhost).
// Läuft die Anzeige auf einem anderen Gerät (z. B. Smart-TV-Browser): ANZEIGE_OFFEN=1
const ANZEIGE_OFFEN = process.env.ANZEIGE_OFFEN === '1';
const FARBEN = ['#00e5ff', '#7cff6b', '#ffd23f', '#b98cff', '#ff9f43', '#4dabff'];

// ---------- PIN + Sitzungs-Signatur (bleiben über Neustarts erhalten) ----------

async function dauerwertLaden(datei, erzeugen) {
  const pfad = path.join(DATEN, datei);
  try {
    return (await readFile(pfad, 'utf8')).trim();
  } catch {
    const wert = erzeugen();
    await writeFile(pfad, wert);
    return wert;
  }
}

await mkdir(DATEN, { recursive: true });
const PIN = process.env.RAUM_PIN ?? (await dauerwertLaden('pin.txt', () => String(randomInt(1000, 10000))));
const GEHEIM = await dauerwertLaden('geheim.txt', () => randomBytes(32).toString('hex'));

const signieren = (daten) => createHmac('sha256', GEHEIM).update(daten).digest('base64url');

function tokenErstellen(name) {
  const inhalt = Buffer.from(JSON.stringify({ name, farbe: FARBEN[randomInt(FARBEN.length)] })).toString('base64url');
  return `${inhalt}.${signieren(inhalt)}`;
}

function tokenPruefen(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [inhalt, signatur] = token.split('.');
  const erwartet = Buffer.from(signieren(inhalt));
  const erhalten = Buffer.from(signatur ?? '');
  if (erwartet.length !== erhalten.length || !timingSafeEqual(erwartet, erhalten)) return null;
  try {
    return JSON.parse(Buffer.from(inhalt, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const istLokal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

// Netzwerkadresse für QR-Code und Konsole – regelmäßig neu bestimmen (WLAN-Wechsel)
let netz = await besteAdresse();
setInterval(async () => { netz = await besteAdresse(); }, 60_000).unref();

// Bewährte Adresse: die IP, über die zuletzt ein Handy wirklich hereingekommen ist.
// Die ist nachweislich erreichbar und schlägt jede Vermutung.
const ADRESS_DATEI = path.join(DATEN, 'adresse.txt');
let bewaehrt = (await readFile(ADRESS_DATEI, 'utf8').catch(() => '')).trim() || null;

/** Adresse für QR-Code: bewährt (falls das Gerät sie noch hat), sonst beste Vermutung */
function qrIp() {
  if (bewaehrt && netz.kandidaten.some((k) => k.adresse === bewaehrt)) return bewaehrt;
  return netz.beste;
}

function lanAdresse(ip = qrIp()) {
  if (process.env.OEFFENTLICHE_URL) return process.env.OEFFENTLICHE_URL.replace(/\/$/, '');
  return `http://${ip}:${PORT}`;
}

/** Merkt sich die IP, die ein anderes Gerät in der Adresszeile benutzt hat. */
function adresseLernen(req) {
  if (istLokal(req)) return;
  const host = (req.headers.host ?? '').replace(/:\d+$/, '');
  if (!host || host === bewaehrt || !netz.kandidaten.some((k) => k.adresse === host)) return;
  bewaehrt = host;
  writeFile(ADRESS_DATEI, host).catch(() => {});
  console.log(`  QR-Code nutzt jetzt ${lanAdresse()} – darüber hat sich gerade ein Gerät verbunden.`);
}

// ---------- Daten ----------

// Die alte zustand.json (Orte der früheren Board-Steuerung) bleibt als Sicherung liegen.
const daten = new Daten(DATEN);
await daten.laden();

// ---------- Server ----------

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'warn' } });
app.addHook('onRequest', async (req) => adresseLernen(req));

// Die Companion-PWA läuft auf einem anderen Ursprung und tritt von dort bei.
// Freigegeben sind nur die Pfade, die sie braucht – /api/anzeige (PIN!) bleibt zu.
// Anmeldung per Bearer-Token, nicht per Cookie, deshalb reicht „*“.
const FUER_COMPANION = ['/api/beitreten', '/api/ich'];
app.addHook('onRequest', async (req, reply) => {
  if (!FUER_COMPANION.includes(req.url.split('?')[0])) return;
  reply.header('Access-Control-Allow-Origin', '*');
  // Chrome fragt vor Anfragen ins Heimnetz zusätzlich nach (Private Network Access)
  if (req.headers['access-control-request-private-network'] === 'true') {
    reply.header('Access-Control-Allow-Private-Network', 'true');
  }
});
for (const pfad of FUER_COMPANION) {
  app.options(pfad, async (req, reply) =>
    reply
      .header('Access-Control-Allow-Methods', 'GET, POST')
      .header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .header('Access-Control-Max-Age', '600')
      .code(204)
      .send());
}
await app.register(fastifyMultipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
await app.register(fastifyWebsocket);
// Leerer Rumpf bei „Content-Type: application/json“ (z. B. DELETE) ist kein Fehler
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, rumpf, fertig) => {
  if (!rumpf) return fertig(null, {});
  try {
    fertig(null, JSON.parse(rumpf));
  } catch (f) {
    f.statusCode = 400;
    fertig(f);
  }
});

function nutzerAusAnfrage(req) {
  const kopf = req.headers.authorization ?? '';
  return tokenPruefen(kopf.startsWith('Bearer ') ? kopf.slice(7) : null);
}

const pinSperre = fehlversuchSperre();

app.post('/api/beitreten', async (req, reply) => {
  const { pin, name } = req.body ?? {};
  const sauberName = typeof name === 'string' ? name.trim().slice(0, 24) : '';
  const ip = req.socket.remoteAddress;
  const sperre = pinSperre.gesperrt(ip);
  if (sperre) return reply.code(429).send({ fehler: `Zu viele falsche PINs – bitte ${sperre} s warten` });
  if (String(pin ?? '') !== PIN) {
    pinSperre.fehlschlag(ip);
    return reply.code(401).send({ fehler: 'Falsche PIN' });
  }
  pinSperre.erfolg(ip);
  if (!sauberName) return reply.code(400).send({ fehler: 'Name fehlt' });
  return { token: tokenErstellen(sauberName), name: sauberName };
});

app.get('/api/ich', async (req, reply) => {
  const nutzer = nutzerAusAnfrage(req);
  if (!nutzer) return reply.code(401).send({ fehler: 'Nicht angemeldet' });
  return nutzer;
});

app.get('/api/anzeige', async (req, reply) => {
  if (!istLokal(req) && !ANZEIGE_OFFEN) return reply.code(403).send({ fehler: 'Nur auf dem Anzeigegerät' });
  return {
    beitrittsUrl: `${lanAdresse()}/?pin=${PIN}`,
    adresse: lanAdresse(),
    pin: PIN,
    // Falls der QR-Code nicht klappt: andere Adressen dieses Geräts zum Ausprobieren
    weitere: netz.kandidaten.filter((k) => k.adresse !== qrIp()).map((k) => ({ name: k.name, url: lanAdresse(k.adresse) })),
  };
});

// Daran erkennt die Companion, dass sie vom Board ausgeliefert wird (Live-Betrieb statt DEMO)
app.get('/api/server', async () => ({ name: 'koordinaten-board' }));

await app.register(companionApi, {
  prefix: '/api',
  daten,
  nutzer: nutzerAusAnfrage,
  geaendert: (bereich, weltId = null) => {
    anAlle({ art: 'geaendert', bereich, weltId });
    if (['welten', 'orte', 'einstellungen'].includes(bereich)) anAlle({ art: 'zustand', zustand: anzeigeSicht(daten) });
  },
});

// ---------- Echtzeit-Sync ----------

const verbindungen = new Set(); // { socket, rolle, nutzer }

function senden(socket, nachricht) {
  if (socket.readyState === 1) socket.send(JSON.stringify(nachricht));
}

function anAlle(nachricht) {
  const text = JSON.stringify(nachricht);
  for (const v of verbindungen) if (v.socket.readyState === 1) v.socket.send(text);
}

// Karte, die gerade groß auf der Anzeige liegt („Auf die Anzeige werfen“).
// Nur im Speicher: Nach einem Neustart ist die Anzeige wieder frei.
let gezeigt = null;

/** Nachrichten zum Zeigen – true, wenn die Nachricht damit erledigt ist */
function zeigenBearbeiten(op, verbindung) {
  if (op.art === 'zeigen') {
    const { karte, fehler } = kartePruefen(op.karte);
    if (fehler) {
      senden(verbindung.socket, { art: 'fehler', text: fehler, anfrage: op.anfrage });
      return true;
    }
    gezeigt = { id: randomUUID(), ...karte, von: verbindung.nutzer.name, farbe: verbindung.nutzer.farbe, am: new Date().toISOString() };
  } else if (op.art === 'verbergen') {
    // Mit id nur genau diese Karte – sonst nähme ein spätes „Weg“ eine neuere Karte mit
    if (gezeigt && (!op.id || op.id === gezeigt.id)) gezeigt = null;
  } else {
    return false;
  }
  anAlle({ art: 'gezeigt', karte: gezeigt });
  senden(verbindung.socket, { art: 'ok', anfrage: op.anfrage });
  return true;
}

function teilnehmerMelden() {
  const namen = [...new Set([...verbindungen].filter((v) => v.nutzer).map((v) => v.nutzer.name))];
  anAlle({ art: 'teilnehmer', namen });
}

app.get('/ws', { websocket: true }, (socket, req) => {
  const { token, rolle } = req.query ?? {};
  let verbindung;
  if (rolle === 'anzeige') {
    if (!istLokal(req) && !ANZEIGE_OFFEN) return socket.close(4003, 'Nur auf dem Anzeigegerät');
    verbindung = { socket, rolle: 'anzeige', nutzer: null };
  } else {
    const nutzer = tokenPruefen(token);
    if (!nutzer) return socket.close(4001, 'Nicht angemeldet');
    verbindung = { socket, rolle: 'steuerung', nutzer };
  }

  verbindungen.add(verbindung);
  senden(socket, { art: 'zustand', zustand: anzeigeSicht(daten) });
  senden(socket, { art: 'gezeigt', karte: gezeigt });
  teilnehmerMelden();

  socket.on('message', (roh) => {
    if (verbindung.rolle !== 'steuerung') return; // Anzeige ist nur lesend
    let op;
    try {
      op = JSON.parse(roh.toString());
    } catch {
      return;
    }
    if (!op || typeof op !== 'object') return;
    // Daten ändern die Handys über die REST-API, hier bleibt nur „Aufs Board“
    if (!zeigenBearbeiten(op, verbindung)) senden(socket, { art: 'fehler', text: 'Unbekannte Operation', anfrage: op.anfrage });
  });

  socket.on('close', () => {
    verbindungen.delete(verbindung);
    teilnehmerMelden();
  });
});

// Ping gegen eingeschlafene Handy-Verbindungen
setInterval(() => {
  for (const v of verbindungen) if (v.socket.readyState === 1) v.socket.ping();
}, 25_000).unref();

// ---------- Ausliefern: Companion unter /, Anzeige unter /anzeige ----------

const OHNE_CACHE = { 'cache-control': 'no-cache' };
app.get('/', (req, reply) => reply.headers(OHNE_CACHE).sendFile(COMPANION_DATEI, COMPANION_ORDNER));
app.get('/regeln.js', (req, reply) => reply.headers(OHNE_CACHE).sendFile('regeln.js', COMPANION_ORDNER));
await app.register(fastifyStatic, { root: path.join(COMPANION_ORDNER, 'icons'), prefix: '/icons/', maxAge: '7d' });
// Rüstungs-Baukasten: Texturen, fertige Item-Icons, baukasten.js/figur3d.js (ES-Module) und manifest.json
await app.register(fastifyStatic, {
  root: path.join(COMPANION_ORDNER, 'ruestungs-baukasten'), prefix: '/ruestungs-baukasten/', maxAge: '7d', decorateReply: false,
});
// Welt-Import (Biome aus .mcworld): Prüfseite, Web Worker und seine ES-Module, Bundle der LevelDB-Bibliothek
for (const datei of ['welt-pruefen.html', 'biom-import.worker.js', 'biom-welt.js', 'biom-dekoder.js', 'biom-ids.js']) {
  app.get(`/${datei}`, (req, reply) => reply.headers(OHNE_CACHE).sendFile(datei, COMPANION_ORDNER));
}
await app.register(fastifyStatic, { root: path.join(COMPANION_ORDNER, 'vendor'), prefix: '/vendor/', maxAge: '7d', decorateReply: false });

if (existsSync(CLIENT_DIST)) {
  // Baut nur noch die Anzeige; ihre Dateien liegen unter /assets/
  await app.register(fastifyStatic, { root: CLIENT_DIST, prefix: '/', index: false, wildcard: false, decorateReply: false });
}
app.setNotFoundHandler((req, reply) => {
  if (req.method === 'GET' && /^\/anzeige(\/|$)/.test(req.url.split('?')[0]) && existsSync(CLIENT_DIST)) {
    return reply.sendFile('index.html', CLIENT_DIST);
  }
  return reply.code(404).send({ fehler: 'Nicht gefunden' });
});

// Sauber speichern beim Beenden
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await daten.speichern().catch(() => {});
    await erkennungBeenden().catch(() => {});
    process.exit(0);
  });
}

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log('\n  Koordinaten-Board läuft');
console.log(`  Anzeige (dieses Gerät):  http://localhost:${PORT}/anzeige`);
console.log(`  Companion (Handys):      ${lanAdresse()}   PIN ${PIN}`);
if (netz.kandidaten.length > 1) {
  console.log('\n  Weitere Adressen dieses Geräts (falls die obere vom Handy nicht erreichbar ist):');
  for (const k of netz.kandidaten) if (k.adresse !== qrIp()) console.log(`    ${lanAdresse(k.adresse).padEnd(28)} ${k.name}`);
}
console.log('');
