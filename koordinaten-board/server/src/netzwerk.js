// Ermittelt die LAN-Adresse, unter der Handys das Board erreichen.
//
// Problem auf Entwickler-Rechnern: WSL, Hyper-V, Docker, VirtualBox, VMware und
// VPNs bringen eigene virtuelle Netzwerkadapter mit privaten IPs mit. Nimmt man
// einfach die erste private IP, landet im QR-Code oft eine Adresse, die das Handy
// nie erreichen kann.
import dgram from 'node:dgram';
import { networkInterfaces } from 'node:os';

// Adapter, die fast nie das echte WLAN/LAN sind
const VIRTUELL = /vethernet|wsl|hyper-?v|docker|virtualbox|vbox|vmware|vmnet|zerotier|tailscale|wireguard|openvpn|tap-|tun|utun|bridge|br-|veth|loopback|npcap|hamachi|radmin/i;

function istPrivat(ip) {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
}

/** Alle IPv4-Adressen mit Bewertung, beste zuerst. */
export function alleAdressen(schnittstellen = networkInterfaces()) {
  const liste = [];
  for (const [name, eintraege] of Object.entries(schnittstellen)) {
    for (const n of eintraege ?? []) {
      if (n.family !== 'IPv4' || n.internal) continue;
      let punkte = 0;
      if (istPrivat(n.address)) punkte += 10;
      if (/^192\.168\./.test(n.address)) punkte += 3;
      if (/^192\.168\.56\./.test(n.address)) punkte -= 20; // VirtualBox Host-Only
      if (/^172\.(1[6-9]|2\d|3[01])\./.test(n.address)) punkte -= 2; // häufig Docker/WSL
      if (/^169\.254\./.test(n.address)) punkte -= 30; // keine Adresse vom Router bekommen
      if (VIRTUELL.test(name)) punkte -= 15;
      if (/wi-?fi|wlan|wireless|ethernet|^en\d|^eth\d|^wl/i.test(name)) punkte += 4;
      liste.push({ name, adresse: n.address, punkte });
    }
  }
  return liste.sort((a, b) => b.punkte - a.punkte);
}

/**
 * Fragt das Betriebssystem, über welche Adresse es ins Netz routen würde.
 * Ein UDP-„connect“ verschickt dabei kein einziges Paket – es wird nur die Route bestimmt.
 */
function routenAdresse(ziel = '192.168.0.1') {
  return new Promise((ok) => {
    const socket = dgram.createSocket('udp4');
    const fertig = (wert) => {
      try { socket.close(); } catch { /* egal */ }
      ok(wert);
    };
    socket.on('error', () => fertig(null));
    try {
      socket.connect(53, ziel, () => {
        try {
          fertig(socket.address().address);
        } catch {
          fertig(null);
        }
      });
    } catch {
      fertig(null);
    }
    setTimeout(() => fertig(null), 500).unref();
  });
}

/** Beste Adresse fürs Handy: erst die Standardroute, sonst die best bewertete. */
export async function besteAdresse() {
  const kandidaten = alleAdressen();
  // Standardroute (Internet) – funktioniert, sobald ein Router mit Gateway da ist
  for (const ziel of ['1.1.1.1', '192.168.0.1', '10.0.0.1']) {
    const ip = await routenAdresse(ziel);
    const treffer = ip && kandidaten.find((k) => k.adresse === ip);
    if (treffer && treffer.punkte > -10) return { beste: treffer.adresse, kandidaten };
  }
  return { beste: kandidaten[0]?.adresse ?? 'localhost', kandidaten };
}
