const MAX_KANTE = 2400;

/** Verkleinert große Handy-Fotos vor dem Upload (spart WLAN und Speicher). */
async function verkleinern(datei: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(datei.type)) return datei;
  try {
    const bild = await createImageBitmap(datei);
    const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
    if (faktor === 1 && datei.size < 1.5 * 1024 * 1024) return datei;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bild.width * faktor);
    canvas.height = Math.round(bild.height * faktor);
    canvas.getContext('2d')!.drawImage(bild, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b ?? datei), 'image/jpeg', 0.85));
  } catch {
    return datei;
  }
}

/** Lädt ein Bild hoch und meldet den Fortschritt (0–1). Gibt den Dateinamen auf dem Server zurück. */
export async function bildHochladen(datei: File, token: string, fortschritt: (anteil: number) => void): Promise<string> {
  const blob = await verkleinern(datei);
  const daten = new FormData();
  daten.append('datei', blob, blob === datei ? datei.name : 'screenshot.jpg');

  return new Promise((ok, fehler) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && fortschritt(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const antwort = JSON.parse(xhr.responseText);
        if (xhr.status === 200) ok(antwort.datei);
        else fehler(new Error(antwort.fehler ?? 'Upload fehlgeschlagen'));
      } catch {
        fehler(new Error('Upload fehlgeschlagen'));
      }
    };
    xhr.onerror = () => fehler(new Error('Keine Verbindung zum Board'));
    xhr.send(daten);
  });
}
