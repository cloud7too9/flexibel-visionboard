// 3D-Figur für den Rüstungs-Baukasten (three.js r128 oder neuer).
// Baut Träger (Rüstungsständer oder Steve), Rüstung und Steinsockel aus Quadern im Minecraft-UV-Layout.
//
//   import { erstelleFigur3D } from './figur3d.js';
//   const fig = erstelleFigur3D({ THREE, baukasten: bk, canvas: document.querySelector('canvas') });
//   await fig.setzen({ ausruestung: {...}, traeger: 'staender', sockel: manifest.dimensionen[0].sockel });
//   fig.drehen(-0.5);           // Blickwinkel in Radiant
//   fig.glanzTick(0.3);         // Glanz-Phase weiterschieben (nur für verzauberte Teile)
// Optional: abstand (Kamera-Abstand in Modellpixeln, Standard 104) – größer = mehr Rand um die Figur.
//
// Koordinaten: 1 Einheit = 1 Modellpixel, Füße bei y = 0, Figur blickt nach +z, rechte Körperseite liegt bei -x.

// Humanoides Rüstungsmodell (entspricht geometry.humanoid in Bedrock)
const HUMANOID = {
  kopf:    { ursprung: [-4, 24, -4],   groesse: [8, 8, 8] },
  koerper: { ursprung: [-4, 12, -2],   groesse: [8, 12, 4] },
  armR:    { ursprung: [-8, 12, -2],   groesse: [4, 12, 4] },
  armL:    { ursprung: [4, 12, -2],    groesse: [4, 12, 4] },
  beinR:   { ursprung: [-3.9, 0, -2],  groesse: [4, 12, 4] },
  beinL:   { ursprung: [-0.1, 0, -2],  groesse: [4, 12, 4] },
};
// UV im 64×32-Rüstungslayout; linke Gliedmaßen gespiegelt
const RUESTUNG_UV = { kopf: [0, 0], koerper: [16, 16], armR: [40, 16], armL: [40, 16, true], beinR: [0, 16], beinL: [0, 16, true] };
// UV im 64×64-Skin-Layout: [Grund, Überzug, Aufblähung Überzug]
const SKIN_UV = {
  kopf: [[0, 0], [32, 0], 0.5], koerper: [[16, 16], [16, 32], 0.25],
  armR: [[40, 16], [40, 32], 0.25], armL: [[32, 48], [48, 48], 0.25],
  beinR: [[0, 16], [0, 32], 0.25], beinL: [[16, 48], [0, 48], 0.25],
};

export function erstelleFigur3D({ THREE, baukasten, canvas, breite = 360, hoehe = 480, abstand = 104 }) {
  const bk = baukasten; const M = bk.manifest;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(breite, hoehe, false);

  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(26, breite / hoehe, 1, 1000);
  szene.add(kamera);
  szene.add(new THREE.AmbientLight(0xffffff, 0.66));
  const licht = new THREE.DirectionalLight(0xffffff, 0.48);
  licht.position.set(-40, 80, 60);
  kamera.add(licht);

  const wurzel = new THREE.Group();
  szene.add(wurzel);
  let drehung = -0.55, neigung = 0.16;
  const ziel = new THREE.Vector3(0, 11, 0);
  let glanzTeile = [];

  function kameraSetzen() {
    kamera.position.set(
      ziel.x + abstand * Math.sin(drehung) * Math.cos(neigung),
      ziel.y + abstand * Math.sin(neigung),
      ziel.z + abstand * Math.cos(drehung) * Math.cos(neigung));
    kamera.lookAt(ziel);
  }

  function textur(quelle) {
    const t = new THREE.CanvasTexture(quelle);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  }
  function material(tex) {
    return new THREE.MeshLambertMaterial({ map: tex, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
  }

  // Minecraft-Quader-UV auf eine BoxGeometry legen (Reihenfolge der Flächen: +x, -x, +y, -y, +z, -z)
  function uvSetzen(geo, u, v, w, h, d, tw, th) {
    const f = (x1, y1, x2, y2) => [[x1 / tw, 1 - y2 / th], [x2 / tw, 1 - y2 / th], [x2 / tw, 1 - y1 / th], [x1 / tw, 1 - y1 / th]];
    const oben = f(u + d, v, u + d + w, v + d);
    const unten = f(u + d + w, v, u + d + 2 * w, v + d);
    const rechts = f(u, v + d, u + d, v + d + h);
    const vorn = f(u + d, v + d, u + d + w, v + d + h);
    const links = f(u + d + w, v + d, u + 2 * d + w, v + d + h);
    const hinten = f(u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h);
    const folge = (q) => [q[3], q[2], q[0], q[1]];
    const flaechen = [folge(links), folge(rechts), folge(oben), [unten[0], unten[1], unten[3], unten[2]], folge(vorn), folge(hinten)];
    const uv = geo.attributes.uv;
    uv.set(new Float32Array(flaechen.flat(2)));
    uv.needsUpdate = true;
  }

  function quader({ ursprung, groesse, uv: [u, v], aufblaehen = 0, spiegeln = false, mat, texGroesse }) {
    const [w, h, d] = groesse;
    const geo = new THREE.BoxGeometry(w + 2 * aufblaehen, h + 2 * aufblaehen, d + 2 * aufblaehen);
    uvSetzen(geo, u, v, w, h, d, texGroesse[0], texGroesse[1]);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(ursprung[0] + w / 2, ursprung[1] + h / 2, ursprung[2] + d / 2);
    if (spiegeln) mesh.scale.x = -1;
    wurzel.add(mesh);
    return mesh;
  }

  function leeren() {
    for (const kind of [...wurzel.children]) {
      wurzel.remove(kind);
      kind.geometry.dispose();
      const mats = Array.isArray(kind.material) ? kind.material : [kind.material];
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
    }
  }

  async function sockelBauen(pfade = M.sockel) {
    const [oben, seite] = await Promise.all([bk.bild(pfade.oben), bk.bild(pfade.seite)]);
    const tOben = textur(oben);
    const tSeite = textur(seite); tSeite.repeat.set(1, 0.5);
    const mSeite = material(tSeite); const mOben = material(tOben);
    const geo = new THREE.BoxGeometry(16, 8, 16);
    const mesh = new THREE.Mesh(geo, [mSeite, mSeite, mOben, mOben, mSeite, mSeite]);
    mesh.position.set(0, -4, 0);
    wurzel.add(mesh);
  }

  async function traegerBauen(art) {
    const t = M.traeger[art];
    const tex = textur(await bk.bild(t.textur));
    const mat = material(tex);
    if (art === 'staender') {
      for (const w of t.wuerfel) quader({ ursprung: w.ursprung, groesse: w.groesse, uv: w.uv, spiegeln: w.spiegeln, mat, texGroesse: t.texturGroesse });
    } else {
      for (const [bereich, [grund, ueber, d]] of Object.entries(SKIN_UV)) {
        const h = HUMANOID[bereich];
        quader({ ...h, uv: grund, mat, texGroesse: [64, 64] });
        quader({ ...h, uv: ueber, aufblaehen: d, mat, texGroesse: [64, 64] });
      }
    }
  }

  // sockel: { oben, seite } Texturpfade, z. B. aus manifest.dimensionen[i].sockel
  async function setzen({ ausruestung = {}, traeger = 'staender', sockel = M.sockel, glanzPhase = 0 } = {}) {
    leeren();
    glanzTeile = [];
    await sockelBauen(sockel);
    await traegerBauen(traeger);
    for (const teilId of ['leggings', 'boots', 'chestplate', 'helmet']) {
      const a = ausruestung[teilId];
      if (!a || !a.ruestung) continue;
      const r = M.ruestungen.find((x) => x.id === a.ruestung);
      if (!r || !r.teile[teilId]) continue;
      const teil = M.teile.find((x) => x.id === teilId);
      const ebene = await bk.ruestungsEbene({ ...a, teil: teilId, glanzPhase });
      const tex = textur(ebene);
      const mat = material(tex);
      for (const bereich of teil.bereiche) {
        const [u, v, spiegeln] = RUESTUNG_UV[bereich];
        quader({ ...HUMANOID[bereich], uv: [u, v], aufblaehen: teil.aufblaehen, spiegeln: !!spiegeln, mat, texGroesse: [64, 32] });
      }
      if (a.glanz) glanzTeile.push({ auswahl: { ...a, teil: teilId }, tex });
    }
    rendern();
  }

  async function glanzTick(phase) {
    if (!glanzTeile.length) return false;
    for (const g of glanzTeile) {
      g.tex.image = await bk.ruestungsEbene({ ...g.auswahl, glanzPhase: phase });
      g.tex.needsUpdate = true;
    }
    rendern();
    return true;
  }

  function rendern() { kameraSetzen(); renderer.render(szene, kamera); }
  function drehen(winkel, kippen) { drehung = winkel; if (kippen !== undefined) neigung = Math.max(-0.2, Math.min(0.9, kippen)); rendern(); }
  function groesseSetzen(b, h) { renderer.setSize(b, h, false); kamera.aspect = b / h; kamera.updateProjectionMatrix(); rendern(); }

  kameraSetzen();
  return {
    setzen, glanzTick, drehen, groesseSetzen, rendern,
    get drehung() { return drehung; }, get neigung() { return neigung; },
    hatGlanz: () => glanzTeile.length > 0,
    canvas: renderer.domElement,
  };
}
