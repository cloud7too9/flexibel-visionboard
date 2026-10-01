/* ============================================================================
   biom-import.worker.js  ·  Welt-Import im Hintergrund (Web Worker, type: "module")
   ----------------------------------------------------------------------------
   Liest eine hochgeladene Welt (.zip oder .mcworld) mit biom-welt.js, damit die
   Seite beim Entpacken und Dekodieren nicht hängt. Abbrechen: worker.terminate().

   → { typ:"pruefen", datei }                 schnelle Prüfung: Aufbau, Name, Seed
   ← { typ:"geprueft", welt:{ weltname, seed, spielversion } }
   → { typ:"start", datei, biomIds, hoehen }  ganze Welt lesen
   ← { typ:"fortschritt", phase:"oeffnen"|"lesen"|"berechnen", aktuell, gesamt }
   ← { typ:"fertig", meta:{ weltname, seed, spielversion, chunks, unbekannt },
                     kacheln:[{ dim, kx, kz, daten }] }   daten als Base64 (2048 Byte), wie die API sie will
   ← { typ:"fehler", text }                   Text für die Oberfläche, Einzelheiten in der Konsole
   ========================================================================== */
import { weltLesen, weltPruefen, WeltFehler, FEHLER } from "./biom-welt.js";
import { kachelZuBase64, STANDARD_OPTIONEN } from "./biom-dekoder.js";

/** Text für die Oberfläche; Einzelheiten nur dann in die Konsole, wenn die Weltdaten selbst kaputt sind
    (keine ZIP, kein Weltordner und Java-Welt erklärt der Text schon) */
const fehlerText = (f) => {
  const bekannt = f instanceof WeltFehler;
  if (!bekannt || f.message === FEHLER.LESEN) console.error("Welt-Import:", f.message, f.cause ?? f);
  return bekannt ? f.message : FEHLER.LESEN;
};

self.onmessage = async ({ data }) => {
  try {
    if (data?.typ === "pruefen") {
      self.postMessage({ typ: "geprueft", welt: await weltPruefen(data.datei) });
      return;
    }
    if (data?.typ === "start") {
      const { meta, kacheln } = await weltLesen(data.datei, {
        biomIds: data.biomIds ?? null,
        hoehen: data.hoehen ?? STANDARD_OPTIONEN,
        fortschritt: (f) => self.postMessage({ typ: "fortschritt", ...f }),
      });
      self.postMessage({
        typ: "fertig", meta,
        kacheln: kacheln.map(({ dim, kx, kz, daten }) => ({ dim, kx, kz, daten: kachelZuBase64(daten) })),
      });
    }
  } catch (f) {
    self.postMessage({ typ: "fehler", text: fehlerText(f) });
  }
};
