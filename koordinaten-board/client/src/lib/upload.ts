import type { Erkannt } from './typen';

const MAX_KANTE = 2400;

async function blobAusCanvas(canvas: HTMLCanvasElement, typ: string, qualitaet?: number) {
  return new Promise<Blob>((ok, fehler) =>
    canvas.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild konnte nicht erzeugt werden'))), typ, qualitaet),
  );
}

export interface VorbereitetesBild {
  canvas: HTMLCanvasElement;
  blob: Blob;
}

/**
 * Lädt ein Bild in ein Canvas (max. 2400 px Kante). Das Canvas wird später
 * für den Kartenausschnitt benutzt – deshalb passen die OCR-Koordinaten genau dazu.
 */
export async function bildVorbereiten(datei: File): Promise<VorbereitetesBild> {
  const bild = await createImageBitmap(datei);
  const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bild.width * faktor);
  canvas.height = Math.round(bild.height * faktor);
  canvas.getContext('2d')!.drawImage(bild, 0, 0, canvas.width, canvas.height);
  bild.close();
  // PNG hält Schrift scharf für die Texterkennung; große Bilder als JPEG für schnelleren Upload
  const blob = canvas.width * canvas.height > 3_000_000
    ? await blobAusCanvas(canvas, 'image/jpeg', 0.92)
    : await blobAusCanvas(canvas, 'image/png');
  return { canvas, blob };
}

/** Schneidet den Bereich um das Popup aus (Popup + Marker darunter, ohne Werbung am Rand). */
export async function kartenausschnitt(canvas: HTMLCanvasElement, box: NonNullable<Erkannt['box']>): Promise<Blob> {
  const W = canvas.width;
  const H = canvas.height;
  const boxB = box.x1 - box.x0;
  const boxH = box.y1 - box.y0;
  const breite = Math.min(W, Math.max(boxB * 1.9, W * 0.8));
  const hoehe = Math.min(H, breite * 0.62);
  const links = Math.min(Math.max(0, (box.x0 + box.x1) / 2 - breite / 2), W - breite);
  const oben = Math.min(Math.max(0, box.y0 - boxH * 0.5), H - hoehe);

  const ziel = document.createElement('canvas');
  const faktor = Math.min(1, 900 / breite);
  ziel.width = Math.round(breite * faktor);
  ziel.height = Math.round(hoehe * faktor);
  ziel.getContext('2d')!.drawImage(canvas, links, oben, breite, hoehe, 0, 0, ziel.width, ziel.height);
  return blobAusCanvas(ziel, 'image/jpeg', 0.85);
}

/** Verkleinert ein normales Foto vor dem Upload. */
export async function fotoVerkleinern(datei: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(datei.type)) return datei;
  try {
    const { canvas } = await bildVorbereiten(datei);
    return await blobAusCanvas(canvas, 'image/jpeg', 0.85);
  } catch {
    return datei;
  }
}

function senden<T>(url: string, token: string, blob: Blob, fortschritt?: (anteil: number) => void): Promise<T> {
  const daten = new FormData();
  const endung = blob.type === 'image/png' ? 'png' : 'jpg';
  daten.append('datei', blob, `bild.${endung}`);
  return new Promise((ok, fehler) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (fortschritt) xhr.upload.onprogress = (e) => e.lengthComputable && fortschritt(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const antwort = JSON.parse(xhr.responseText);
        if (xhr.status === 200) ok(antwort);
        else fehler(new Error(antwort.fehler ?? `Fehler ${xhr.status}`));
      } catch {
        fehler(new Error(`Fehler ${xhr.status}`));
      }
    };
    xhr.onerror = () => fehler(new Error('Keine Verbindung zum Board'));
    xhr.send(daten);
  });
}

/** Lädt ein Bild hoch und gibt den Dateinamen auf dem Server zurück. */
export async function bildHochladen(blob: Blob, token: string, fortschritt?: (anteil: number) => void) {
  const antwort = await senden<{ datei: string }>('/api/upload', token, blob, fortschritt);
  return antwort.datei;
}

/** Schickt einen Screenshot zur Texterkennung (wird auf dem Server nicht gespeichert). */
export async function screenshotAuslesen(blob: Blob, token: string) {
  return senden<{ erkannt: Erkannt | null; text: string }>('/api/auslesen', token, blob);
}

/** Kopieren funktioniert im LAN auch ohne HTTPS (Clipboard-API braucht sonst einen sicheren Kontext). */
export async function kopieren(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const feld = document.createElement('textarea');
  feld.value = text;
  feld.setAttribute('readonly', '');
  feld.style.position = 'fixed';
  feld.style.opacity = '0';
  document.body.appendChild(feld);
  feld.select();
  feld.setSelectionRange(0, text.length);
  const ok = document.execCommand('copy');
  feld.remove();
  if (!ok) throw new Error('Kopieren nicht möglich');
}
