// PWA-Dateien der Companion: Manifest, Service Worker und App-Icons liefert das Board aus,
// wenn sie im Companion-Ordner liegen (COMPANION_ORDNER zeigt hier auf einen Testordner)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const COMPANION = path.join(HIER, '..', '..', '..', 'companion');
const PORT = 3298;
const BASIS = `http://127.0.0.1:${PORT}`;
const DATEN = mkdtempSync(path.join(tmpdir(), 'kb-pwa-daten-'));
const ORDNER = mkdtempSync(path.join(tmpdir(), 'kb-pwa-companion-'));
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
let server;

before(async () => {
  for (const datei of ['regeln.js', 'board-karten.js', 'companion-prototyp.html']) copyFileSync(path.join(COMPANION, datei), path.join(ORDNER, datei));
  for (const unter of ['icons', 'vendor', 'ruestungs-baukasten', 'app-icons']) mkdirSync(path.join(ORDNER, unter));
  writeFileSync(path.join(ORDNER, 'manifest.webmanifest'), JSON.stringify({ name: 'Companion', start_url: './' }));
  writeFileSync(path.join(ORDNER, 'sw.js'), 'self.addEventListener("fetch", () => {});');
  writeFileSync(path.join(ORDNER, 'app-icons', 'icon-192.png'), PNG);
  server = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(HIER, '..'),
    env: { ...process.env, PORT: String(PORT), DATEN_ORDNER: DATEN, COMPANION_ORDNER: ORDNER, RAUM_PIN: '4711' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i += 1) {
    try { if ((await fetch(`${BASIS}/api/server`)).ok) return; } catch { /* startet noch */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server startet nicht');
});
after(async () => {
  await new Promise((r) => { server.once('exit', r); server.kill('SIGTERM'); });
  rmSync(DATEN, { recursive: true, force: true });
  rmSync(ORDNER, { recursive: true, force: true });
});

test('Manifest, Service Worker und App-Icons kommen aus dem Companion-Ordner', async () => {
  let res = await fetch(`${BASIS}/manifest.webmanifest`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /manifest\+json/);
  assert.equal((await res.json()).name, 'Companion');

  res = await fetch(`${BASIS}/sw.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
  assert.equal(res.headers.get('cache-control'), 'no-cache');   // neue Versionen des Service Workers sofort

  res = await fetch(`${BASIS}/app-icons/icon-192.png`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
});

test('Seite und Skripte der Companion kommen ohne Cache (sonst bis zu 7 Tage alte Companion am Handy)', async () => {
  for (const pfad of ['/', '/regeln.js', '/board-karten.js']) {
    const res = await fetch(BASIS + pfad);
    assert.equal(res.status, 200, pfad);
    assert.equal(res.headers.get('cache-control'), 'no-cache', pfad);
  }
});

test('fehlende PWA-Dateien → 404, kein Absturz', async () => {
  assert.equal((await fetch(`${BASIS}/app-icons/gibt-es-nicht.png`)).status, 404);
  assert.equal((await fetch(`${BASIS}/api/server`)).status, 200);
});
