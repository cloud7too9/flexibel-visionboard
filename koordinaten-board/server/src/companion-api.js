// REST-API der Companion (Vertrag: companion-prototyp.html, Abschnitt 4), unter /api.
// Anmeldung per Bearer-Token wie beim Beitreten. Nach jeder Änderung meldet
// `geaendert` den Bereich, damit Handys und Anzeige neu laden bzw. neu zeichnen.
import { DatenFehler } from './daten.js';
import { screenshotAuslesen, fuerCompanion } from './erkennung.js';

const BILDER = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ daten: import('./daten.js').Daten, nutzer: (req) => ({ name: string } | null),
 *           geaendert: (bereich: string, weltId?: string | null) => void }} optionen
 */
export async function companionApi(app, { daten, nutzer, geaendert }) {
  app.addHook('onRequest', async (req, reply) => {
    const n = nutzer(req);
    if (!n) return reply.code(401).send({ error: 'anmeldung', message: 'Nicht angemeldet' });
    req.nutzer = n;
  });
  app.setErrorHandler((f, req, reply) => {
    if (f instanceof DatenFehler) return reply.code(f.status).send({ error: 'fehler', message: f.message });
    if (f.statusCode && f.statusCode < 500) return reply.code(f.statusCode).send({ error: 'fehler', message: f.message });
    req.log.error(f);
    return reply.code(500).send({ error: 'fehler', message: 'Serverfehler' });
  });

  // ---- Welten + Orte ----
  app.get('/orte/welten', async () => ({ welten: daten.weltenListe() }));
  app.post('/orte/welten', async (req, reply) => {
    const welt = daten.weltAnlegen(req.body);
    geaendert('welten', welt.id);
    return reply.code(201).send({ welt });
  });
  app.get('/orte/welten/:id', async (req) => daten.weltLesen(req.params.id));
  app.post('/orte/instanzen', async (req, reply) => {
    const { instanz, typ, weltId } = daten.instanzAnlegen(req.body, req.nutzer.name);
    geaendert('orte', weltId);
    return reply.code(201).send({ instanz, typ });
  });
  app.patch('/orte/instanzen/:id', async (req) => {
    const { instanz, weltId } = daten.instanzAendern(req.params.id, req.body);
    geaendert('orte', weltId);
    return { instanz };
  });
  app.delete('/orte/instanzen/:id', async (req) => {
    const { weltId } = daten.instanzLoeschen(req.params.id);
    geaendert('orte', weltId);
    return { ok: true };
  });
  // Seed-Map-Screenshot auslesen (lokale OCR des Boards) – das Bild wird nicht gespeichert
  app.post('/orte/auslesen', async (req) => {
    const teil = await req.file();
    if (!teil) throw new DatenFehler(400, 'Keine Datei');
    if (!BILDER.includes(teil.mimetype)) {
      teil.file.resume();
      throw new DatenFehler(415, 'Nur Bilder (JPG, PNG, WebP)');
    }
    const { erkannt } = await screenshotAuslesen(await teil.toBuffer());
    return { erkannt: fuerCompanion(erkannt) };
  });

  // ---- Sammelobjekte ----
  app.get('/sammelobjekte/welten/:id', async (req) => daten.sammelLesen(req.params.id));
  app.put('/sammelobjekte/welten/:id/:objektId', async (req) => {
    const antwort = daten.sammelSetzen(req.params.id, req.params.objektId, req.body, req.nutzer.name);
    geaendert('sammelobjekte', req.params.id);
    return antwort;
  });

  // ---- Portal-Verbindungen ----
  app.get('/portale/welten/:id', async (req) => ({ verbindungen: daten.portaleListe(req.params.id) }));
  app.post('/portale/welten/:id', async (req, reply) => {
    const verbindung = daten.portalAnlegen(req.params.id, req.body, req.nutzer.name);
    geaendert('portale', req.params.id);
    return reply.code(201).send({ verbindung });
  });
  app.put('/portale/:id', async (req) => {
    const { verbindung, weltId } = daten.portalAendern(req.params.id, req.body);
    geaendert('portale', weltId);
    return { verbindung };
  });
  app.delete('/portale/:id', async (req) => {
    const { weltId } = daten.portalLoeschen(req.params.id);
    geaendert('portale', weltId);
    return { ok: true };
  });

  // ---- Banner (für alle Welten) ----
  app.get('/banner', async () => ({ liste: daten.bannerListe() }));
  app.post('/banner', async (req, reply) => {
    const banner = daten.bannerAnlegen(req.body, req.nutzer.name);
    geaendert('banner');
    return reply.code(201).send({ banner });
  });
  app.put('/banner/:id', async (req) => {
    const banner = daten.bannerAendern(req.params.id, req.body);
    geaendert('banner');
    return { banner };
  });
  app.delete('/banner/:id', async (req) => {
    daten.bannerLoeschen(req.params.id);
    geaendert('banner');
    return { ok: true };
  });

  // ---- Einstellungen der Anzeige (Titel, QR-Code, aktive Welt) ----
  app.get('/board/einstellungen', async () => daten.einstellungenLesen());
  app.put('/board/einstellungen', async (req) => {
    const e = daten.einstellungenAendern(req.body ?? {});
    geaendert('einstellungen');
    return e;
  });
}
