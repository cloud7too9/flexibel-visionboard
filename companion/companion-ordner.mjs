// Wo die Companion-App liegt – für Tests und Werkzeuge in diesem Ordner.
// Die App hat ein eigenes Repo (Companion), ausgecheckt neben flexibel-visionboard:
//   …/flexibel-visionboard/companion/  ← Tests, Werkzeuge, Widgets, Doku (hier)
//   …/Companion/app/                   ← die App (Seite, regeln.js, board-karten.js, biom-*.js, icons/ …)
// Anders: COMPANION_ORDNER setzen (wie beim Board-Server).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const COMPANION = path.resolve(process.env.COMPANION_ORDNER ?? path.join(HIER, "..", "..", "Companion", "app"));
if (!existsSync(path.join(COMPANION, "index.html"))) {
  throw new Error(`Companion nicht gefunden: ${COMPANION} – Repo Companion neben flexibel-visionboard auschecken oder COMPANION_ORDNER setzen.`);
}
/** Die Seite als file://-URL (DEMO-Mock ohne Server) */
export const SEITE_URL = pathToFileURL(path.join(COMPANION, "index.html")).href;
/** Eine Datei der App als ES-Modul laden (biom-*.js) */
export const modulLaden = (datei) => import(pathToFileURL(path.join(COMPANION, datei)).href);
