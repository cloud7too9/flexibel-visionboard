// Koordinaten-Board – der eine Server für Companion (Handys im WLAN) und Anzeige (im Raum):
// liefert die Companion aus, hält die gemeinsamen Daten (daten.json) und synchronisiert live.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyWebsocket from '@fastify/websocket';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Daten, DatenFehler } from './daten.js';
import { identitaet, AnmeldeFehler } from './identitaet.js';
import { companionApi } from './companion-api.js';
import { anzeigeSicht } from './sicht.js';
import { COMPANION_ORDNER } from './regeln.js';
import { besteAdresse } from './netzwerk.js';
import { kartePruefen } from './zeigen.js';
import { widgetKarte, widgetQuellen } from './widgets.js';
import { erkennungBeenden } from './erkennung.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const DATEN = path.resolve(process.env.DATEN_ORDNER ?? path.join(HIER, '..', 'daten'));
const CLIENT_DIST = path.resolve(HIER, '..', '..', 'client', 'dist');
// Widget-Dashboard (companion/widgets, `npm run build` → dist/), ausgeliefert unter /dashboard
const DASHBOARD_DIST = path.join(COMPANION_ORDNER, 'widgets', 'dist');
// Seite der Companion, die unter / ausgeliefert wird (später z. B. modul-a-live-karte.html)
const COMPANION_DATEI = process.env.COMPANION_DATEI ?? 'companion-prototyp.html';
// Anzeige darf vom Gerät selbst (localhost) oder mit Anzeige-Link (Anzeige + Schlüssel) geöffnet werden.
// Notschalter für alles im Netz ohne Schutz: ANZEIGE_OFFEN=1
const ANZEIGE_OFFEN = process.env.ANZEIGE_OFFEN === '1';

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

const istLokal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
/** Darf diese Anfrage Anzeige sein? localhost, Notschalter oder gültiger Anzeige-Link (?anzeige=…&schluessel=…) */
const anzeigeZugang = (req) => {
  const { anzeige, schluessel } = req.query ?? {};
  const mitLink = anzeige ? daten.anzeigeMitSchluessel(String(anzeige), String(schluessel ?? '')) : null;
  return { erlaubt: Boolean(mitLink) || istLokal(req) || ANZEIGE_OFFEN, anzeige: mitLink };
};

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

/** Anzeige-Link für ein anderes Gerät im Netz – dieselbe Adresse wie im QR-Code der Handys */
const anzeigeLink = (a) => `${lanAdresse()}/anzeige?anzeige=${encodeURIComponent(a.id)}&schluessel=${encodeURIComponent(a.schluessel)}`;

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
// Accounts mit eigener PIN, Geräteschlüssel, „Wer bist du?“ (Strang B, identitaet.js)
const ident = identitaet({ daten, geheim: GEHEIM, boardPin: PIN });

// ---------- Server ----------

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'warn' } });
app.addHook('onRequest', async (req) => adresseLernen(req));

// Die Companion-PWA läuft auf einem anderen Ursprung und tritt von dort bei.
// Freigegeben sind nur die Pfade, die sie braucht – /api/anzeige (PIN!) bleibt zu.
// Anmeldung per Bearer-Token, nicht per Cookie, deshalb reicht „*“.
const FUER_COMPANION = ['/api/beitreten', '/api/beitreten/konten', '/api/ich'];
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

/** Antwort bei abgelehnter Anmeldung (falsche PIN, Sperre, Name doppelt …) */
function anmeldeFehler(reply, f) {
  if (f instanceof AnmeldeFehler || f instanceof DatenFehler) return reply.code(f.status).send({ fehler: f.message });
  throw f;
}

// Beitreten (B2): Board-PIN aus dem QR-Code, dann Account wählen oder anlegen – Name + eigene PIN
app.post('/api/beitreten/konten', async (req, reply) => {
  try {
    return { konten: ident.konten(req.body?.pin, req.socket.remoteAddress) };
  } catch (f) {
    return anmeldeFehler(reply, f);
  }
});

app.post('/api/beitreten', async (req, reply) => {
  const { pin, name, kontoPin } = req.body ?? {};
  try {
    return await ident.anmelden({ pin, name, kontoPin, ip: req.socket.remoteAddress });
  } catch (f) {
    return anmeldeFehler(reply, f);
  }
});

app.get('/api/ich', async (req, reply) => {
  const nutzer = ident.werBistDu(req);
  if (!nutzer) return reply.code(401).send({ fehler: 'Nicht angemeldet' });
  return { id: nutzer.id, name: nutzer.name, farbe: nutzer.farbe };
});

app.get('/api/anzeige', async (req, reply) => {
  const zugang = anzeigeZugang(req);
  if (!zugang.erlaubt) return reply.code(403).send({ fehler: 'Anzeige nur mit Anzeige-Link oder auf dem Board-Gerät' });
  return {
    anzeige: zugang.anzeige && { id: zugang.anzeige.id, name: zugang.anzeige.name },
    beitrittsUrl: `${lanAdresse()}/?pin=${PIN}`,
    adresse: lanAdresse(),
    pin: PIN,
    // Falls der QR-Code nicht klappt: andere Adressen dieses Geräts zum Ausprobieren
    weitere: netz.kandidaten.filter((k) => k.adresse !== qrIp()).map((k) => ({ name: k.name, url: lanAdresse(k.adresse) })),
  };
});

// Widget-Dashboard (A6): Die Anzeige liest ihr Layout und meldet ihre Reihen. Welche Anzeige sie ist,
// sagt der Anzeige-Link; das Board-Gerät selbst (localhost) ohne Link ist die erste Anzeige („Board“).
function anzeigeVonAnfrage(req, reply) {
  const zugang = anzeigeZugang(req);
  if (!zugang.erlaubt) {
    reply.code(403).send({ fehler: 'Anzeige nur mit Anzeige-Link oder auf dem Board-Gerät' });
    return null;
  }
  return zugang.anzeige ?? daten.anzeigeLokal();
}
app.get('/api/anzeige/layout', async (req, reply) => {
  const a = anzeigeVonAnfrage(req, reply);
  return a && daten.anzeigeLayout(a.id);
});
app.put('/api/anzeige/reihen', async (req, reply) => {
  const a = anzeigeVonAnfrage(req, reply);
  if (!a) return reply;
  const reihen = req.body?.reihen;
  if (!Number.isInteger(reihen) || reihen < 1 || reihen > 200) return reply.code(400).send({ fehler: 'Reihen müssen eine ganze Zahl von 1 bis 200 sein' });
  if (daten.anzeigeReihenSetzen(a.id, reihen)) anAlle({ art: 'geaendert', bereich: 'anzeigen', weltId: null });
  return { reihen };
});

// Daran erkennt die Companion, dass sie vom Board ausgeliefert wird (Live-Betrieb statt DEMO)
app.get('/api/server', async () => ({ name: 'koordinaten-board' }));

await app.register(companionApi, {
  prefix: '/api',
  daten,
  nutzer: (req) => ident.werBistDu(req),
  geaendert: (bereich, weltId = null) => {
    anAlle({ art: 'geaendert', bereich, weltId });
    if (['welten', 'orte', 'einstellungen'].includes(bereich)) anAlle({ art: 'zustand', zustand: anzeigeSicht(daten) });
    if (bereich === 'anzeigen') veralteteAnzeigenTrennen();
  },
  anzeigeLink,
});

// Widgets des Dashboards: fertige Karte je Widget-Typ (und Quelle) aus den Daten der aktiven Welt.
// Lesen darf die Anzeige (localhost oder Anzeige-Link) und jedes angemeldete Handy.
await app.register(async (widgets) => {
  widgets.addHook('onRequest', async (req, reply) => {
    if (!anzeigeZugang(req).erlaubt && !ident.werBistDu(req)) {
      return reply.code(403).send({ fehler: 'Widgets nur auf der Anzeige oder für angemeldete Handys' });
    }
  });
  widgets.get('/:typ', async (req, reply) => {
    const quelle = typeof req.query.quelle === 'string' ? req.query.quelle : '';
    return (await widgetKarte(daten, req.params.typ, quelle)) ?? reply.code(404).send({ fehler: 'Unbekannter Widget-Typ' });
  });
  widgets.get('/:typ/quellen', async (req, reply) =>
    widgetQuellen(daten, req.params.typ) ?? reply.code(404).send({ fehler: 'Unbekannter Widget-Typ' }));
}, { prefix: '/api/widgets' });

// ---------- Echtzeit-Sync ----------

const verbindungen = new Set(); // { socket, rolle, nutzer, zugang? }

/** Nach „Neuer Schlüssel“: Anzeigen trennen, die nur über den alten Link verbunden waren */
function veralteteAnzeigenTrennen() {
  for (const v of verbindungen) {
    if (v.rolle !== 'anzeige' || !v.zugang) continue;
    if (!daten.anzeigeMitSchluessel(v.zugang.id, v.zugang.schluessel)) v.socket.close(4003, 'Anzeige-Link nicht mehr gültig');
  }
}

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
    const zugang = anzeigeZugang(req);
    if (!zugang.erlaubt) return socket.close(4003, 'Anzeige nur mit Anzeige-Link oder auf dem Board-Gerät');
    // Nur wer allein über den Link hereinkam, fliegt raus, wenn der Schlüssel neu erzeugt wird
    const nurLink = zugang.anzeige && !istLokal(req) && !ANZEIGE_OFFEN;
    verbindung = { socket, rolle: 'anzeige', nutzer: null, zugang: nurLink ? { id: zugang.anzeige.id, schluessel: zugang.anzeige.schluessel } : null };
  } else {
    const nutzer = ident.ausToken(token);
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
// sendFile übernimmt sonst maxAge des ersten statischen Ordners (icons/, 7 Tage) und überschreibt no-cache
const frisch = (reply, datei) => reply.headers(OHNE_CACHE).sendFile(datei, COMPANION_ORDNER, { cacheControl: false });
app.get('/', (req, reply) => frisch(reply, COMPANION_DATEI));
for (const datei of ['regeln.js', 'board-karten.js']) {
  app.get(`/${datei}`, (req, reply) => frisch(reply, datei));
}
await app.register(fastifyStatic, { root: path.join(COMPANION_ORDNER, 'icons'), prefix: '/icons/', maxAge: '7d' });
// Welt-Import: Worker und Dekoder (ES-Module) liest das Handy selbst; die Bibliothek liegt in vendor/
for (const datei of ['biom-ids.js', 'biom-dekoder.js', 'biom-welt.js', 'biom-import.worker.js']) {
  app.get(`/${datei}`, (req, reply) => frisch(reply, datei));
}
await app.register(fastifyStatic, { root: path.join(COMPANION_ORDNER, 'vendor'), prefix: '/vendor/', maxAge: '7d', decorateReply: false });
// Rüstungs-Baukasten: Texturen, fertige Item-Icons, baukasten.js/figur3d.js (ES-Module) und manifest.json
await app.register(fastifyStatic, {
  root: path.join(COMPANION_ORDNER, 'ruestungs-baukasten'), prefix: '/ruestungs-baukasten/', maxAge: '7d', decorateReply: false,
});
// PWA (Home-Bildschirm): Manifest, Service Worker und App-Icons – nur, wenn die Companion sie mitbringt.
// Der Service Worker läuft im Browser erst über https (B3); Manifest und Icons wirken auch über http.
for (const datei of ['manifest.webmanifest', 'sw.js']) {
  app.get(`/${datei}`, (req, reply) => frisch(reply, datei));
}
if (existsSync(path.join(COMPANION_ORDNER, 'app-icons'))) {
  await app.register(fastifyStatic, { root: path.join(COMPANION_ORDNER, 'app-icons'), prefix: '/app-icons/', maxAge: '7d', decorateReply: false });
}

if (existsSync(CLIENT_DIST)) {
  // Baut nur noch die Anzeige; ihre Dateien liegen unter /assets/
  await app.register(fastifyStatic, { root: CLIENT_DIST, prefix: '/', index: false, wildcard: false, decorateReply: false });
}
function dashboardSeite(reply) {
  if (!existsSync(path.join(DASHBOARD_DIST, 'index.html'))) {
    return reply.code(404).type('text/plain; charset=utf-8')
      .send('Dashboard nicht gebaut: npm --prefix companion/widgets install && npm --prefix companion/widgets run build');
  }
  return reply.headers(OHNE_CACHE).sendFile('index.html', DASHBOARD_DIST, { cacheControl: false });   // neuer Build → neue Assets
}
// Widget-Dashboard: Dateien mit Hash im Namen unter /dashboard/assets/, eigene Routen (z. B. /dashboard/vollbild/:id) → index.html
await app.register(fastifyStatic, { root: DASHBOARD_DIST, prefix: '/dashboard/', index: false, maxAge: '7d', decorateReply: false });
app.get('/dashboard', (req, reply) => {
  const query = req.url.indexOf('?');
  return reply.redirect(`/dashboard/${query === -1 ? '' : req.url.slice(query)}`);   // Anzeige-Link behält ?anzeige=…&schluessel=…
});
app.get('/dashboard/', (req, reply) => dashboardSeite(reply));

app.setNotFoundHandler((req, reply) => {
  const pfad = req.url.split('?')[0];
  if (req.method === 'GET' && /^\/anzeige(\/|$)/.test(pfad) && existsSync(CLIENT_DIST)) {
    return reply.sendFile('index.html', CLIENT_DIST);
  }
  if (req.method === 'GET' && pfad.startsWith('/dashboard/') && !pfad.startsWith('/dashboard/assets/')) return dashboardSeite(reply);
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
if (existsSync(DASHBOARD_DIST)) console.log(`  Widget-Dashboard:        http://localhost:${PORT}/dashboard`);
console.log(`  Companion (Handys):      ${lanAdresse()}   PIN ${PIN}`);
for (const a of daten.anzeigenListe()) {
  console.log(`  Anzeige auf anderem Gerät${daten.anzeigenListe().length > 1 ? ` („${a.name}“)` : ''}: ${anzeigeLink(a)}`);
}
if (netz.kandidaten.length > 1) {
  console.log('\n  Weitere Adressen dieses Geräts (falls die obere vom Handy nicht erreichbar ist):');
  for (const k of netz.kandidaten) if (k.adresse !== qrIp()) console.log(`    ${lanAdresse(k.adresse).padEnd(28)} ${k.name}`);
}
console.log('');
