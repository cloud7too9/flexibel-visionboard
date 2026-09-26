import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alleAdressen } from '../src/netzwerk.js';

const ip = (address) => [{ family: 'IPv4', internal: false, address }];

test('Windows mit WSL, Hyper-V und VirtualBox: WLAN gewinnt', () => {
  const liste = alleAdressen({
    'vEthernet (WSL (Hyper-V firewall))': ip('172.25.160.1'),
    'VirtualBox Host-Only Network': ip('192.168.56.1'),
    'vEthernet (Default Switch)': ip('172.30.48.1'),
    WLAN: ip('192.168.178.23'),
    'Loopback Pseudo-Interface 1': [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
  });
  assert.equal(liste[0].adresse, '192.168.178.23');
  assert.ok(!liste.some((k) => k.adresse === '127.0.0.1'));
});

test('Raspberry Pi mit Docker: eth0/wlan0 vor docker0', () => {
  const liste = alleAdressen({ docker0: ip('172.17.0.1'), wlan0: ip('10.0.0.42') });
  assert.equal(liste[0].adresse, '10.0.0.42');
});

test('Selbst zugewiesene Adresse (kein Router) landet hinten', () => {
  const liste = alleAdressen({ Ethernet: ip('169.254.12.3'), WLAN: ip('192.168.1.5') });
  assert.equal(liste[0].adresse, '192.168.1.5');
});
