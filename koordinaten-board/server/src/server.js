// Koordinaten-Board – lokaler Server für Anzeige (im Raum) und Steuerung (Handys im WLAN).
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyWebsocket from '@fastify/websocket';
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Zustand } from './zustand.js';
import { besteAdresse } from './netzwerk.js';
import { FEATURES, screenshotAuslesen, erkennungBeenden } from './erkennung.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const DATEN = path.resolve(process.env.DATEN_ORDNER ?? path.join(HIER, '..', 'daten'));
const MEDIEN = path.join(DATEN, 'medien');
const CLIENT_DIST = path.resolve(HIER, '..', '..', 'client', 'dist');
// Anzeige darf standardmäßig nur vom Gerät selbst geöffnet werden (localhost).
// Läuft die Anzeige auf einem anderen Gerät (z. B. Smart-TV-Browser): ANZEIGE_OFFEN=1
const ANZEIGE_OFFEN = process.env.ANZEIGE_OFFEN === '1';
const ERLAUBTE_BILDER = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
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

await mkdir(MEDIEN, { recursive: true });
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

function lanAdresse(ip = netz.beste) {
  if (process.env.OEFFENTLICHE_URL) return process.env.OEFFENTLICHE_URL.replace(/\/$/, '');
  return `http://${ip}:${PORT}`;
}

// ---------- Zustand + aufräumen ----------

const zustand = new Zustand(DATEN);
await zustand.laden();

async function dateiLoeschen(name) {
  try {
    await unlink(path.join(MEDIEN, path.basename(name)));
  } catch { /* schon weg */ }
}

// Verwaiste Uploads entfernen (hochgeladen, aber nie gespeichert)
{
  const benutzt = new Set(zustand.orte.map((o) => o.datei).filter(Boolean));
  for (const datei of await readdir(MEDIEN)) if (!benutzt.has(datei)) await dateiLoeschen(datei);
}

// ---------- Server ----------

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'warn' } });
await app.register(fastifyMultipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
await app.register(fastifyWebsocket);
await app.register(fastifyStatic, { root: MEDIEN, prefix: '/medien/', decorateReply: false, maxAge: '7d' });

function nutzerAusAnfrage(req) {
  const kopf = req.headers.authorization ?? '';
  return tokenPruefen(kopf.startsWith('Bearer ') ? kopf.slice(7) : null);
}

app.post('/api/beitreten', async (req, reply) => {
  const { pin, name } = req.body ?? {};
  const sauberName = typeof name === 'string' ? name.trim().slice(0, 24) : '';
  if (String(pin ?? '') !== PIN) return reply.code(401).send({ fehler: 'Falsche PIN' });
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
    weitere: netz.kandidaten.filter((k) => k.adresse !== netz.beste).map((k) => ({ name: k.name, url: lanAdresse(k.adresse) })),
  };
});

app.post('/api/upload', async (req, reply) => {
  if (!nutzerAusAnfrage(req)) return reply.code(401).send({ fehler: 'Nicht angemeldet' });
  const teil = await req.file();
  if (!teil) return reply.code(400).send({ fehler: 'Keine Datei' });
  const endung = ERLAUBTE_BILDER[teil.mimetype];
  if (!endung) {
    teil.file.resume();
    return reply.code(415).send({ fehler: 'Nur Bilder (JPG, PNG, WebP, GIF)' });
  }
  const name = `${randomUUID()}.${endung}`;
  const ziel = path.join(MEDIEN, name);
  await pipeline(teil.file, createWriteStream(ziel));
  if (teil.file.truncated) {
    await dateiLoeschen(name);
    return reply.code(413).send({ fehler: 'Datei zu groß (max. 25 MB)' });
  }
  return { datei: name };
});

// Seed-Map-Screenshot auslesen – wird NICHT gespeichert, nur ausgewertet
app.post('/api/auslesen', async (req, reply) => {
  if (!nutzerAusAnfrage(req)) return reply.code(401).send({ fehler: 'Nicht angemeldet' });
  const teil = await req.file();
  if (!teil) return reply.code(400).send({ fehler: 'Keine Datei' });
  if (!ERLAUBTE_BILDER[teil.mimetype]) {
    teil.file.resume();
    return reply.code(415).send({ fehler: 'Nur Bilder (JPG, PNG, WebP)' });
  }
  const bild = await teil.toBuffer();
  try {
    return await screenshotAuslesen(bild);
  } catch (fehler) {
    req.log.error(fehler);
    return reply.code(500).send({ fehler: 'Texterkennung fehlgeschlagen' });
  }
});

// Feature-Typen der Seed Map (für Auswahl und Filter auf dem Handy)
const TYPEN = [...new Map(FEATURES.map((f) => [f.typ, { typ: f.typ, kategorie: f.kategorie, dimension: f.dimension }])).values()];
app.get('/api/typen', async () => TYPEN);

// ---------- Echtzeit-Sync ----------

const verbindungen = new Set(); // { socket, rolle, nutzer }

function senden(socket, nachricht) {
  if (socket.readyState === 1) socket.send(JSON.stringify(nachricht));
}

function anAlle(nachricht) {
  const text = JSON.stringify(nachricht);
  for (const v of verbindungen) if (v.socket.readyState === 1) v.socket.send(text);
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
  senden(socket, { art: 'zustand', zustand: zustand.momentaufnahme() });
  teilnehmerMelden();

  socket.on('message', async (roh) => {
    if (verbindung.rolle !== 'steuerung') return; // Anzeige ist nur lesend
    let op;
    try {
      op = JSON.parse(roh.toString());
    } catch {
      return;
    }
    const ergebnis = zustand.anwenden(op, verbindung.nutzer.name);
    if (ergebnis.fehler) senden(socket, { art: 'fehler', text: ergebnis.fehler, anfrage: op.anfrage });
    if (!ergebnis.geaendert) return;
    for (const datei of ergebnis.entfernteDateien) await dateiLoeschen(datei);
    anAlle({ art: 'zustand', zustand: zustand.momentaufnahme() });
    senden(socket, { art: 'ok', anfrage: op.anfrage });
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

// ---------- Client ausliefern (Produktion) ----------

if (existsSync(CLIENT_DIST)) {
  await app.register(fastifyStatic, { root: CLIENT_DIST, prefix: '/' });
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/medien')) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ fehler: 'Nicht gefunden' });
  });
}

// Sauber speichern beim Beenden
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await zustand.speichern().catch(() => {});
    await erkennungBeenden().catch(() => {});
    process.exit(0);
  });
}

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log('\n  Koordinaten-Board läuft');
console.log(`  Anzeige (dieses Gerät):  http://localhost:${PORT}/anzeige`);
console.log(`  Handys im WLAN:          ${lanAdresse()}   PIN ${PIN}`);
if (netz.kandidaten.length > 1) {
  console.log('\n  Weitere Adressen dieses Geräts (falls die obere vom Handy nicht erreichbar ist):');
  for (const k of netz.kandidaten) if (k.adresse !== netz.beste) console.log(`    ${lanAdresse(k.adresse).padEnd(28)} ${k.name}`);
}
console.log('');
