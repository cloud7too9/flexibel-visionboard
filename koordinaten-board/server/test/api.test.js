// Companion-API gegen einen echten Server-Prozess (leerer Datenordner, eigener Port)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3297;
const BASIS = `http://127.0.0.1:${PORT}`;
const ORDNER = mkdtempSync(path.join(tmpdir(), 'kb-api-'));
let server;

async function starten() {
  server = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
    env: { ...process.env, PORT: String(PORT), DATEN_ORDNER: ORDNER, RAUM_PIN: '4711' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i += 1) {
    try { if ((await fetch(`${BASIS}/api/server`)).ok) return; } catch { /* startet noch */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server startet nicht');
}
const beenden = () => new Promise((r) => { server.once('exit', r); server.kill('SIGTERM'); });

before(starten);
after(async () => { await beenden(); rmSync(ORDNER, { recursive: true, force: true }); });

const anfrage = async (methode, pfad, token, body) => {
  const res = await fetch(BASIS + pfad, {
    method: methode,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, daten: await res.json() };
};
const beitreten = async (name) => (await anfrage('POST', '/api/beitreten', null, { pin: '4711', name })).daten.token;

test('ohne Anmeldung kein Zugriff', async () => {
  assert.deepEqual((await anfrage('GET', '/api/server')).daten, { name: 'koordinaten-board' });
  const r = await anfrage('GET', '/api/orte/welten');
  assert.equal(r.status, 401);
  assert.equal(r.daten.message, 'Nicht angemeldet');
});

test('Companion-Vertrag: Welten, Orte, Sammelobjekte, Portale, Banner', async () => {
  const max = await beitreten('Max');
  let r = await anfrage('POST', '/api/orte/welten', max, { seed: '6889192652397090698' });
  assert.equal(r.status, 201);
  const welt = r.daten.welt;
  r = await anfrage('POST', '/api/orte/instanzen', max, { dimensionId: `d_${welt.id}_overworld`, kategorie: 'Village', variante: null, x: 1040, y: 64, z: 310, quelle: 'manuell' });
  assert.equal(r.status, 201);
  const id = r.daten.instanz.id;
  r = await anfrage('POST', '/api/orte/instanzen', max, { dimensionId: `d_${welt.id}_overworld`, kategorie: 'Bastion', x: 1, y: null, z: 1, quelle: 'manuell' });
  assert.deepEqual([r.status, r.daten.message], [422, '„Bastion“ gibt es in der Oberwelt nicht']);
  assert.equal((await anfrage('PATCH', `/api/orte/instanzen/${id}`, max, { x: 1, y: null, z: 2 })).daten.instanz.z, 2);
  assert.equal((await anfrage('GET', `/api/orte/welten/${welt.id}`, max)).daten.instanzen.length, 1);
  // DELETE mit Content-Type, aber ohne Rumpf – so schickt es die Companion
  assert.deepEqual((await anfrage('DELETE', `/api/orte/instanzen/${id}`, max)).daten, { ok: true });

  const lena = await beitreten('Lena');
  assert.equal((await anfrage('PUT', `/api/sammelobjekte/welten/${welt.id}/rib`, lena, { gefunden: true })).daten.status.rib.von, 'Lena');
  r = await anfrage('POST', `/api/portale/welten/${welt.id}`, lena, { name: 'Basis', oberwelt: { x: 212, y: 71, z: -388 }, nether: { x: 26, y: 71, z: -49 } });
  assert.equal(r.status, 201);
  assert.equal((await anfrage('GET', `/api/portale/welten/${welt.id}`, max)).daten.verbindungen[0].von, 'Lena');
  r = await anfrage('POST', '/api/banner', max, { name: 'Wappen', basis: 'white', ebenen: [{ muster: 'cross', farbe: 'red' }] });
  assert.equal(r.status, 201);
  assert.equal((await anfrage('GET', '/api/banner', lena)).daten.liste[0].name, 'Wappen');
  assert.equal((await anfrage('PUT', '/api/banner/b_99', max, { name: 'x', basis: 'white', ebenen: [] })).status, 404);
  assert.equal((await anfrage('PUT', '/api/board/einstellungen', max, { aktiveWelt: 'w_99' })).status, 404);
});

test('Screenshot auslesen: Banner-Anleitung liefert banner statt Ort', { timeout: 60_000 }, async () => {
  const max = await beitreten('Max');
  const form = new FormData();
  const bild = readFileSync(fileURLToPath(new URL('../../../referenz/banner/rezept-beispiel.jpg', import.meta.url)));
  form.append('datei', new Blob([bild], { type: 'image/jpeg' }), 'rezept.jpg');
  const res = await fetch(`${BASIS}/api/orte/auslesen`, { method: 'POST', headers: { authorization: `Bearer ${max}` }, body: form });
  const d = await res.json();
  assert.equal(res.status, 200);
  assert.equal(d.erkannt, null);
  assert.equal(d.banner.basis, 'black');
  assert.deepEqual(d.banner.ebenen.map((e) => e.muster), ['border', 'rhombus', 'border', 'flower', 'square_top_left', 'square_bottom_right']);
});

test('Änderungen gehen live an alle, Daten überstehen einen Neustart', async () => {
  const max = await beitreten('Max');
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?token=${encodeURIComponent(max)}`);
  const nachrichten = [];
  ws.onmessage = (e) => nachrichten.push(JSON.parse(e.data));
  await new Promise((r) => { ws.onopen = r; });
  const welt = (await anfrage('POST', '/api/orte/welten', max, { seed: '-42' })).daten.welt;
  await anfrage('PUT', '/api/board/einstellungen', max, { aktiveWelt: welt.id, titel: 'Neustart-Welt' });
  await anfrage('POST', '/api/orte/instanzen', max, { dimensionId: `d_${welt.id}_end`, kategorie: 'End City', x: 1300, y: 60, z: -820, quelle: 'manuell' });
  await new Promise((r) => setTimeout(r, 200));
  ws.close();
  assert.ok(nachrichten.some((n) => n.art === 'geaendert' && n.bereich === 'orte' && n.weltId === welt.id));
  const letzte = nachrichten.filter((n) => n.art === 'zustand').at(-1).zustand;
  assert.deepEqual(letzte.orte.map((o) => [o.name, o.dimension, o.typ]), [['End City', 'ende', 'End City']]);
  assert.equal(letzte.einstellungen.titel, 'Neustart-Welt');

  await beenden();
  await starten();
  const nachher = await anfrage('GET', `/api/orte/welten/${welt.id}`, max);
  assert.equal(nachher.daten.instanzen.length, 1);
  assert.equal((await anfrage('GET', '/api/board/einstellungen', max)).daten.aktiv, welt.id);
});
