import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Daten } from '../src/daten.js';
import { identitaet, pinHashen, pinPasst, AnmeldeFehler } from '../src/identitaet.js';

const neu = () => {
  const daten = new Daten(mkdtempSync(path.join(tmpdir(), 'kb-ident-')));
  return { daten, ident: identitaet({ daten, geheim: 'test-geheim', boardPin: '4711' }) };
};
const lehntAb = async (fn, status, text) => assert.rejects(fn, (f) => f instanceof AnmeldeFehler && f.status === status && (!text || f.message === text));
const anfrage = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });

test('PIN nur gehasht (scrypt mit Salz), Prüfung in konstanter Zeit', async () => {
  const h = await pinHashen('2468');
  assert.match(h, /^scrypt:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  assert.notEqual(h, await pinHashen('2468'), 'eigenes Salz je Hash');
  assert.equal(await pinPasst('2468', h), true);
  assert.equal(await pinPasst('2469', h), false);
  assert.equal(await pinPasst('2468', 'kaputt'), false);
});

test('Beitreten: Account anlegen, mit eigener PIN wieder anmelden, Gerät trägt das Vertrauen', async () => {
  const { daten, ident } = neu();
  await lehntAb(() => ident.anmelden({ pin: '0000', name: 'Max', kontoPin: '2468', ip: 'a' }), 401, 'Falsche PIN');
  await lehntAb(() => ident.anmelden({ pin: '4711', name: ' ', kontoPin: '2468', ip: 'a' }), 400, 'Name fehlt');
  await lehntAb(() => ident.anmelden({ pin: '4711', name: 'Max', kontoPin: '12', ip: 'a' }), 400, 'Deine PIN hat 4 bis 8 Ziffern');

  const erst = await ident.anmelden({ pin: '4711', name: ' Max ', kontoPin: '2468', ip: 'a' });
  assert.equal(erst.neu, true);
  assert.equal(erst.name, 'Max');
  const ich = ident.werBistDu(anfrage(erst.token));
  assert.deepEqual([ich.id, ich.name], [erst.id, 'Max']);
  assert.equal(daten.inhalt.benutzer[0].pinHash.startsWith('scrypt:'), true, 'gespeichert wird nur der Hash');
  assert.deepEqual(daten.benutzerListe(), [{ id: erst.id, name: 'Max' }], 'Liste ohne Hash');

  await lehntAb(() => ident.anmelden({ pin: '4711', name: 'max', kontoPin: '1111', ip: 'b' }), 401, 'Falsche PIN für Max');
  const zweit = await ident.anmelden({ pin: '4711', name: 'max', kontoPin: '2468', ip: 'b' });
  assert.deepEqual([zweit.neu, zweit.id, zweit.name], [false, erst.id, 'Max'], 'gleicher Account, zweites Gerät');
  assert.notEqual(zweit.token, erst.token);
  assert.equal(daten.inhalt.geraete.length, 2);
  assert.equal(daten.inhalt.profile.length, 1, 'ein persönliches Profil je Account');
  assert.deepEqual(daten.inhalt.geraete.map((g) => [g.typ, g.freigeschaltet]), [['persoenlich', true], ['persoenlich', true]]);

  // Gerät gesperrt → sein Token gilt nicht mehr, das andere schon
  daten.inhalt.geraete[0].freigeschaltet = false;
  assert.equal(ident.werBistDu(anfrage(erst.token)), null);
  assert.equal(ident.werBistDu(anfrage(zweit.token)).id, erst.id);
  // fremde oder alte Tokens (vor den Accounts: nur Name) gelten nicht
  assert.equal(ident.ausToken('abc.def'), null);
  assert.equal(ident.werBistDu(anfrage(null)), null);
});

test('Sperre gegen Durchprobieren: Board-PIN je Gerät, Account-PIN je Gerät und Account', async () => {
  const { ident } = neu();
  await ident.anmelden({ pin: '4711', name: 'Lena', kontoPin: '1357', ip: 'x' });
  for (let i = 0; i < 5; i++) await lehntAb(() => ident.anmelden({ pin: '4711', name: 'Lena', kontoPin: '0000', ip: 'y' }), 401);
  await lehntAb(() => ident.anmelden({ pin: '4711', name: 'Lena', kontoPin: '1357', ip: 'y' }), 429);
  assert.equal((await ident.anmelden({ pin: '4711', name: 'Lena', kontoPin: '1357', ip: 'z' })).neu, false, 'anderes Gerät nicht gesperrt');
  for (let i = 0; i < 5; i++) assert.throws(() => ident.konten('9999', 'q'), (f) => f.status === 401);
  assert.throws(() => ident.konten('4711', 'q'), (f) => f.status === 429);
  assert.deepEqual(ident.konten('4711', 'r').map((k) => k.name), ['Lena']);
});
