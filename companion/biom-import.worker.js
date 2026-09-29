/* ============================================================================
   biom-import.worker.js  ·  Web Worker (type: "module") für den Welt-Import
   ----------------------------------------------------------------------------
   Liest eine .mcworld im Hintergrund (biom-welt.js), damit die Seite bedienbar
   bleibt. Nachrichten (Bauplan 6.2):
     → { typ:"start", datei: File, biomIds: number[], hoehen?: { netherBiomY, endBiomY } }
     ← { typ:"fortschritt", phase:"oeffnen"|"lesen"|"berechnen", aktuell, gesamt }
     ← { typ:"fertig", meta:{ weltname, seed, spielversion, chunks, unbekannt },
                       kacheln:[{ dim, kx, kz, daten: ArrayBuffer }] }   // Transferables
     ← { typ:"fehler", text }
   Abbrechen: worker.terminate() auf der Seite. Module-Worker gibt es nur über
   http(s), nicht unter file://.
   ========================================================================== */
import { weltLesen, WeltFehler, FEHLER } from "./biom-welt.js";

self.onmessage = async ({ data }) => {
  if (data?.typ !== "start") return;
  try {
    const { meta, kacheln } = await weltLesen(data.datei, {
      biomIds: data.biomIds ?? null,
      ...(data.hoehen ? { hoehen: data.hoehen } : {}),
      fortschritt: (f) => self.postMessage({ typ: "fortschritt", ...f }),
    });
    const liste = kacheln.map(({ dim, kx, kz, daten }) => ({ dim, kx, kz, daten: daten.buffer }));
    self.postMessage({ typ: "fertig", meta, kacheln: liste }, liste.map((k) => k.daten));
  } catch (f) {
    // Details in die Konsole, auf der Seite nur der kurze deutsche Text.
    // WeltFehler sind erwartbar (falsche Datei) → Warnung; alles andere ist ein Programmfehler.
    if (f instanceof WeltFehler) console.warn("Welt-Import:", f.message, f.cause ?? "");
    else console.error("Welt-Import:", f);
    self.postMessage({ typ: "fehler", text: f instanceof WeltFehler ? f.message : FEHLER.LESEN });
  }
};
