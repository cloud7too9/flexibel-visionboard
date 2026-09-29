import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fehlversuchSperre } from '../src/sperre.js';

const uhr = () => {
  let t = 0;
  return { jetzt: () => t, weiter: (ms) => { t += ms; } };
};

test('Nach 5 falschen PINs ist die Adresse eine Minute gesperrt', () => {
  const u = uhr();
  const s = fehlversuchSperre({ jetzt: u.jetzt });
  for (let i = 0; i < 4; i++) s.fehlschlag('192.168.1.20');
  assert.equal(s.gesperrt('192.168.1.20'), 0);
  s.fehlschlag('192.168.1.20');
  assert.equal(s.gesperrt('192.168.1.20'), 60);
  assert.equal(s.gesperrt('192.168.1.21'), 0, 'andere Geräte bleiben frei');
  u.weiter(59_500);
  assert.equal(s.gesperrt('192.168.1.20'), 1);
  u.weiter(500);
  assert.equal(s.gesperrt('192.168.1.20'), 0);
});

test('Richtige PIN setzt die Fehlversuche zurück', () => {
  const s = fehlversuchSperre({ jetzt: uhr().jetzt });
  for (let i = 0; i < 4; i++) s.fehlschlag('10.0.0.5');
  s.erfolg('10.0.0.5');
  s.fehlschlag('10.0.0.5');
  assert.equal(s.gesperrt('10.0.0.5'), 0);
});
