// Gemeinsame Test-Hilfen: Companion über http ausliefern (für Canvas-Pixel und ES-Module
// braucht der Rüstungs-Baukasten http statt file://) und three.js vom CDN lokal beantworten.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HIER = fileURLToPath(new URL(".", import.meta.url));
export { COMPANION } from "../companion-ordner.mjs";
import { COMPANION } from "../companion-ordner.mjs";
export const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const TYPEN = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg" };

/** Kleiner statischer Server für den Companion-Ordner → { adresse, schliessen() } */
export async function companionAusliefern(port) {
  const server = createServer(async (req, res) => {
    const pfad = path.normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
    const datei = path.join(COMPANION, pfad);
    if (path.relative(COMPANION, datei).startsWith("..")) { res.writeHead(403).end(); return; }
    try {
      const inhalt = await readFile(datei);
      res.writeHead(200, { "content-type": TYPEN[path.extname(datei)] ?? "application/octet-stream" }).end(inhalt);
    } catch {
      res.writeHead(404, { "content-type": "application/json" }).end('{"fehler":"Nicht gefunden"}');
    }
  });
  await new Promise((ok) => server.listen(port, "127.0.0.1", ok));
  return { adresse: `http://127.0.0.1:${port}`, schliessen: () => new Promise((ok) => server.close(ok)) };
}

/** three.js-Anfragen ans CDN (hier gesperrt) aus node_modules beantworten */
export async function threeUmleiten(ziel) {
  const code = await readFile(path.join(HIER, "node_modules/three/build/three.min.js"));
  await ziel.route(THREE_URL, (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: code,
    headers: { "access-control-allow-origin": "*" } }));
}

/** Chromium mit Software-WebGL (SwiftShader), damit die 3D-Figur auch ohne GPU läuft */
export const CHROMIUM_OPTIONEN = {
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
};
