// Efrâsiyâb'ın Hikâyeleri: Simyacı Feyyuz ve Aynadaki Azazil — yumurta kafa stili (AÇIK GÜNDÜZ TEMASI, göz almayan mat ışık).
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler (x ekseninde ayrı; sert kesme yok, süzülme + whip pan):
//   oda    (x=0)   Aydınlık simyacı odası (kitaplar, simya şişeleri, büyük altın çerçeveli ayna içinde şık Azazil!)
//   avlu   (x=200) Güneşli eski taş avlu / virane (ayna, yere serili Anadolu kilimi, taş saklanma duvarı, rulo kilim tuzağı!)
//   meyve  (x=300) Yakın plan: rulo kilimdeki paniklemiş Azazil, altın Bilgelik Meyvesi ve kibir dersi finali
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'efrasiyab-feyyuz';
export const FPS = 30;
export let DUR = 45;
export const CUES = [];
export const LOOK = {
  feyyuz: {
    headW: 262, headH: 246,
    hat: 'kulah', hatColor: '#4c3456',
    beard: '#3a2c26', beardLen: .54,
    cloth: '#34586a', clothDark: '#1e3644',
    trim: '#c89b44', buttons: '#dfc074', pocket: true, collar: true,
    bodyW: 200, height: 1.70
  },
  azazil: {
    headW: 258, headH: 248, shade: '#dfd0e4',
    hat: 'kulah', hatColor: '#241822',
    mustache: '#1a121c',
    cloth: '#8a2232', clothDark: '#52101c',
    trim: '#e4b848', buttons: '#f0c858',
    scarf: '#2c3448', scarfY: 6, collar: true,
    bodyW: 204, height: 1.88
  },
  gelin: {
    headW: 256, headH: 244,
    longHair: '#2e2228', hairLen: 260,
    blush: '#ef9ca4',
    cloth: '#d8b4a8', clothDark: '#a68276',
    skirt: '#9a4654', boots: '#5c382a',
    collar: false, bodyW: 186, drop: 40, height: 1.62
  }
};

const S = smoother;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ramp = (t, a, b) => S(clamp((t - a) / Math.max(1e-4, b - a), 0, 1));
const V = (...a) => new THREE.Vector3(...a);
let C, PT = {}, cast = {}, sets = {}, fx = {}, dyn = {};

const P = (k, f = 0) => {
  const p = PT['P' + String(k).padStart(2, '0')] || { s: (k - 1) * 4.0, e: k * 4.0 };
  return p.s + (p.e - p.s) * f;
};
const PS = k => P(k, 0), PE = k => P(k, 1);

// ---------------------------------------------------------------- boyalı mat açık tema dokular
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tx(c, rep = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
  return t;
}
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function dab(g, w, h, base, n, r, amt, seed, a0 = .18) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .2;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

function plasterTex(base = '#d4cab6', seed = 41) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 460, 28, .13, seed, .16);
  return tx(c, [2, 1]);
}

function stoneTex(base = '#bdb4a4', seed = 21, rep = [2, 2]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 480, 24, .16, seed, .18);
  const R = rng(seed + 1);
  g.strokeStyle = sh(base, .68); g.lineWidth = 3;
  for (let y = 0; y < 512; y += 64) {
    const off = (y / 64) % 2 ? 48 : 0;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
    for (let x = off; x < 512; x += 96) {
      g.beginPath(); g.moveTo(x + (R() - .5) * 6, y); g.lineTo(x + (R() - .5) * 6, y + 64); g.stroke();
    }
  }
  return tx(c, rep);
}

// canlı Anadolu kilimi dokusu (yerde serili + rulo sarılmış!)
function kilimTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#a83c32'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#e2d4b8'; g.lineWidth = 18; g.strokeRect(22, 22, 468, 468);
  g.strokeStyle = '#2e5474'; g.lineWidth = 12; g.strokeRect(52, 52, 408, 408);
  for (const cy of [145, 256, 367]) {
    g.fillStyle = '#d6a43e'; g.beginPath();
    g.moveTo(256, cy - 42); g.lineTo(335, cy); g.lineTo(256, cy + 42); g.lineTo(177, cy); g.closePath(); g.fill();
    g.fillStyle = '#2c5872'; g.beginPath();
    g.moveTo(256, cy - 22); g.lineTo(298, cy); g.lineTo(256, cy + 22); g.lineTo(214, cy); g.closePath(); g.fill();
  }
  return tx(c);
}

// Aynanın cam yüzü (içinde fiyakalı gülümseyen janti Azazil yansıması!)
function mirrorAzazilTex({ showDev = true } = {}) {
  const [c, g] = cnv(512, 768);
  const bg = g.createLinearGradient(0, 0, 0, 768);
  bg.addColorStop(0, '#a8c6de'); bg.addColorStop(1, '#789eb8');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 768);
  // yumuşak diyagonal cam parıltısı
  g.fillStyle = 'rgba(240,248,255,0.22)';
  g.beginPath(); g.moveTo(40, 0); g.lineTo(185, 0); g.lineTo(60, 768); g.lineTo(0, 768); g.closePath(); g.fill();
  if (showDev) {
    g.save(); g.translate(256, 360);
    // Bordo ceket + altın şerit + lacivert fular
    g.fillStyle = '#8a2232'; g.strokeStyle = PLUM; g.lineWidth = 11;
    g.beginPath(); g.roundRect(-95, 55, 190, 290, 55); g.fill(); g.stroke();
    g.fillStyle = '#e4b848'; g.fillRect(-10, 55, 20, 285);
    g.fillStyle = '#2c3448'; g.beginPath(); g.roundRect(-62, 42, 124, 34, 14); g.fill(); g.stroke();
    // Beyaz yumurta kafa
    g.fillStyle = '#f2eef4'; g.beginPath(); g.ellipse(0, -52, 86, 82, 0, 0, 6.29); g.fill(); g.stroke();
    // Şık siyah şapka
    g.fillStyle = '#241822';
    g.beginPath(); g.moveTo(-78, -96); g.quadraticCurveTo(-70, -182, 0, -186); g.quadraticCurveTo(70, -182, 78, -96); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(-92, -104, 184, 22, 10); g.fill(); g.stroke();
    // Kibirli süzgün gözler, kalkık tek kaş, fiyakalı kıvrık bıyık & sırıtan gülüş
    g.strokeStyle = PLUM; g.fillStyle = PLUM; g.lineWidth = 9; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 14, -58); g.lineTo(s * 44, -58); g.stroke();
      g.beginPath(); g.arc(s * 29, -58, 10, 0, Math.PI); g.fill();
      g.beginPath(); g.moveTo(s * 14, -84 - (s > 0 ? 10 : 0)); g.quadraticCurveTo(s * 29, -94 - (s > 0 ? 8 : 0), s * 46, -80); g.stroke();
    }
    // Kıvrık pala bıyık
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(0, -28); g.quadraticCurveTo(s * 26, -38, s * 46, -34); g.quadraticCurveTo(s * 28, -18, 0, -22); g.fill();
    }
    // Kibirli gülümseme
    g.beginPath(); g.moveTo(-18, -12); g.quadraticCurveTo(8, 6, 30, -16); g.stroke();
    g.restore();
  }
  return tx(c);
}

function daySkyTex(seed = 66) {
  const w = 2048, h = 1024, [c, g] = cnv(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h * .66);
  sky.addColorStop(0, D('#609cd4')); sky.addColorStop(.55, D('#99c6e8')); sky.addColorStop(1, D('#d2e4f0'));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const R = rng(seed);
  for (let i = 0; i < 12; i++) {
    g.fillStyle = D('#e8f1f8', .54);
    g.beginPath(); g.ellipse(R() * w, h * (.14 + R() * .26), 85 + R() * 140, 20 + R() * 16, 0, 0, 6.29); g.fill();
  }
  for (const [y0, amp, col] of [[h * .64, 60, '#6e8ea8'], [h * .72, 42, '#829a76'], [h * .79, 26, '#ae9b74']]) {
    g.fillStyle = D(col); g.beginPath(); g.moveTo(0, h); g.lineTo(0, y0);
    for (let x = 0; x <= w; x += 64) g.lineTo(x, y0 - Math.sin(x * .004 + y0) * amp - Math.cos(x * .01) * amp * .35);
    g.lineTo(w, h); g.closePath(); g.fill();
  }
  return tx(c);
}

function buildMirror(parent, x, z, { showDev = true, rotY = 0 } = {}) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY; parent.add(grp);
  const gold = flat('#c89c3c'), wood = painted(woodTex({ base: '#6e4426' }));
  // ayaklı çerçeve
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.12, .12, .45), wood); stand.position.y = .06; grp.add(stand);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.88, .10), gold); frame.position.y = 1.06; grp.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.86, 1.66), new THREE.MeshBasicMaterial({ map: mirrorAzazilTex({ showDev }) }));
  glass.position.set(0, 1.06, .062); glass.userData.noShadow = true; grp.add(glass);
  return grp;
}

// 3B Altın Bilgelik Meyvesi (elma/nar biçimi + yeşil yaprak)
function buildFruit() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(.125, 18, 14), flat('#e6b638'));
  body.scale.set(1.05, .96, 1.05); grp.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, .08, 8), flat('#5e3c20'));
  stem.position.y = .14; grp.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), flat('#4d8e46'));
  leaf.scale.set(1.4, .35, .75); leaf.position.set(.06, .16, 0); leaf.rotation.z = .35; grp.add(leaf);
  return grp;
}

// 3B Rulo Sarılmış Anadolu Kilimi (Azazil'in gövdesini sarar!)
function buildRugRoll() {
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, 1.12, 22), painted(kilimTex()));
  cyl.position.y = .68;
  return cyl;
}

function shadows(g) {
  g.traverse(o => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
}

function sun(color, intensity, dir, target, { size = 2048, ext = 7, far = 40 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.copy(V(...target).addScaledVector(V(...dir).normalize(), -18));
  l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(size, size);
  Object.assign(l.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far });
  l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3;
  return l;
}

// ---------------------------------------------------------------- SET 1: AYDINLIK SİMYACI ODASI (x = 0)
function buildOda(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#9e7048', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const wallMat = painted(plasterTex('#d4cab6', 41));
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); backWall.position.set(0, 2.6, -3.0); g.add(backWall);
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideL.rotation.y = Math.PI / 2; sideL.position.set(-4.0, 2.6, 0); g.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideR.rotation.y = -Math.PI / 2; sideR.position.set(4.0, 2.6, 0); g.add(sideR);

  // solda simyacı kitaplığı ve renkli şişeler
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, .38), painted(woodTex({ base: '#72482c' })));
  shelf.position.set(-1.55, 1.05, -2.75); g.add(shelf);
  for (const [bx, by, col] of [[-1.95, 1.48, '#2d7c66'], [-1.62, 1.48, '#4668a8'], [-1.25, 1.48, '#c65c3e'], [-1.8, 1.92, '#b88c34']]) {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), flat(col)); fl.position.set(bx, by, -2.52); g.add(fl);
  }
  // sağda büyük altın çerçeveli ayna (içinde janti Azazil!)
  buildMirror(g, .56, -1.25, { showDev: true, rotY: -.24 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c4def5', '#96826c', 1.78));
  const dir = [.34, -.72, -.58]; dyn.oSun = V(...dir).normalize();
  const s = sun('#ffe0b2', 2.05, dir, [0, 1, -.8], { ext: 6 }); L.add(s); L.add(s.target);
  scene.add(L); sets.oda = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: GÜNEŞLİ TAŞ AVLU / KİLİM TUZAĞI (x = 200)
function buildAvlu(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const stFloor = painted(stoneTex('#bfb6a4', 61, [8, 8]));
  const stWall = painted(stoneTex('#c8bfb0', 62, [3, 2]));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), stFloor); floor.rotation.x = -Math.PI / 2; g.add(floor);

  // eski taş virane kemerleri (arkada açık gök görünür!)
  const backLow = new THREE.Mesh(new THREE.BoxGeometry(5.2, .95, .42), stWall); backLow.position.set(0, .475, -2.6); g.add(backLow);
  for (const px of [-2.2, 2.2]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(.48, 2.8, .48), stWall); pil.position.set(px, 1.4, -2.6); g.add(pil);
  }
  // solda Feyyuz'un saklandığı alçak taş duvar
  const hideWall = new THREE.Mesh(new THREE.BoxGeometry(.88, 1.02, .38), stWall); hideWall.position.set(-1.05, .51, -.95); g.add(hideWall);

  // merkez-sağda büyük tuzak aynası (P04-P06)
  dyn.trapMirror = buildMirror(g, .56, -1.25, { showDev: true, rotY: -.35 });
  // yere serili geniş Anadolu kilimi (P06'da rulo olur!)
  const flatRug = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.35), painted(kilimTex()));
  flatRug.rotation.x = -Math.PI / 2; flatRug.position.set(.15, .016, -.48); g.add(flatRug);
  dyn.flatRug = flatRug;

  // rulo sarılmış kilim (P06'da Azazil'in etrafında belirir!)
  const rugRoll = buildRugRoll(); rugRoll.position.set(.24, .68, -.48); rugRoll.visible = false; g.add(rugRoll);
  dyn.rugRoll = rugRoll;

  const far = new THREE.Mesh(new THREE.CylinderGeometry(48, 48, 40, 40, 1, true), vistaMat(daySkyTex(66), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c0def6', '#968a74', 1.8));
  const dir = [.36, -.70, -.60]; dyn.aSun = V(...dir).normalize();
  const s = sun('#ffe0b2', 2.1, dir, [200, 1, -.8], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.avlu = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: RULO KİLİM & BİLGELİK MEYVESİ FİNALİ (x = 300)
function buildMeyve(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const stFloor = painted(stoneTex('#bfb6a4', 81, [8, 8]));
  const stWall = painted(stoneTex('#c8bfb0', 82, [3, 2]));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), stFloor); floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backLow = new THREE.Mesh(new THREE.BoxGeometry(5.2, .95, .42), stWall); backLow.position.set(0, .475, -2.6); g.add(backLow);
  for (const px of [-2.2, 2.2]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(.48, 2.8, .48), stWall); pil.position.set(px, 1.4, -2.6); g.add(pil);
  }
  // devrilmiş ayna arka-sağda (kibrin yıkılışı!)
  const tipped = buildMirror(g, 1.15, -1.65, { showDev: false, rotY: -.55 });
  tipped.rotation.z = -.85; tipped.position.y = .35;

  // Rulo kilim (sağda Azazil'in gövdesinde!)
  const rugRoll3 = buildRugRoll(); rugRoll3.position.set(.44, .68, -.68); g.add(rugRoll3);
  dyn.rugRoll3 = rugRoll3;

  // Parlayan Altın Bilgelik Meyvesi!
  const fruit = buildFruit(); fruit.position.set(-.05, 1.12, -.38); g.add(fruit);
  dyn.fruit = fruit;

  const far = new THREE.Mesh(new THREE.CylinderGeometry(48, 48, 40, 40, 1, true), vistaMat(daySkyTex(77), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c0def6', '#968a74', 1.8));
  const dir = [.36, -.70, -.60]; dyn.fSun = V(...dir).normalize();
  const s = sun('#ffe0b2', 2.1, dir, [300, 1, -.8], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.meyve = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU
function cameraPath() {
  const k = [
    // P01 KANCA (4 görüntü): aynaya şaşkın bakan Feyyuz -> aynadaki şık Azazil -> serili kilim -> rulo sarılmış Azazil!
    { t: 0,           pos: [-.05, 1.38, 3.25],   look: [.05, 1.24, -.95],  fov: 48, creep: .24, drift: .03 },
    { t: P(1, .28),   dur: .42, pos: [.52, 1.38, 1.25], look: [.56, 1.30, -1.25], fov: 44, creep: .28 },
    { t: P(1, .56),   dur: .30, move: 'whip', pos: [200.1, 1.48, 2.85], look: [200.15, .75, -.55], fov: 48, creep: .26 },
    { t: P(1, .82),   dur: .30, move: 'whip', pos: [300.25, 1.38, 2.75], look: [300.38, 1.18, -.68], fov: 46, creep: .24 },
    // P02 "Bakın," (oda): Feyyuz + eşi + aynada şık Azazil
    { t: PS(2) + .16, dur: .30, move: 'whip', pos: [-.05, 1.36, 3.45], look: [-.02, 1.22, -.95], fov: 49, creep: .24 },
    { t: PE(2),       dur: Math.max(.4, PE(2) - PS(2) - .2), pos: [.22, 1.38, 2.55], look: [.35, 1.28, -1.1], fov: 46, creep: .22 },
    // P03 Aynadaki Azazil kibirle güler
    { t: PS(3) + .16, dur: .40, pos: [.50, 1.36, 1.35], look: [.55, 1.30, -1.22], fov: 44, creep: .24 },
    { t: PE(3),       dur: Math.max(.4, PE(3) - PS(3) - .2), pos: [.45, 1.38, 1.65], look: [.52, 1.28, -1.22], fov: 45, creep: .20 },
    // P04 Whip ile güneşli taş avlu: Feyyuz ayna + kilim tuzağını kurup duvar arkasına saklanır
    { t: PS(4) + .16, dur: .30, move: 'whip', pos: [200.0, 1.44, 3.55], look: [200.0, 1.12, -.85], fov: 49, creep: .24 },
    { t: PE(4),       dur: Math.max(.4, PE(4) - PS(4) - .2), pos: [199.85, 1.38, 3.15], look: [199.95, 1.10, -.85], fov: 48, creep: .22 },
    // P05 Azazil gelip aynada kendini seyreder
    { t: PS(5) + .16, dur: .42, pos: [200.15, 1.42, 3.15], look: [200.28, 1.22, -.85], fov: 47, creep: .24 },
    { t: PE(5),       dur: Math.max(.4, PE(5) - PS(5) - .2), pos: [200.25, 1.42, 2.75], look: [200.32, 1.24, -.85], fov: 46, creep: .22 },
    // P06 Feyyuz fırlayıp kilimi Azazil'e rulo sarar! (kick!)
    { t: PS(6) + .16, dur: .35, pos: [200.0, 1.42, 3.35], look: [200.05, 1.18, -.65], fov: 48, creep: .26 },
    { t: PE(6),       dur: Math.max(.4, PE(6) - PS(6) - .2), pos: [200.12, 1.40, 2.95], look: [200.12, 1.22, -.65], fov: 47, creep: .24 },
    // P07 Whip ile yakın plan (set 3): rulo kilimdeki Azazil altın Bilgelik Meyvesi'ni Feyyuz'a verir!
    { t: PS(7) + .14, dur: .30, move: 'whip', pos: [300.0, 1.38, 3.15], look: [300.05, 1.18, -.62], fov: 47, creep: .24 },
    { t: PE(7),       dur: Math.max(.4, PE(7) - PS(7) - .2), pos: [299.95, 1.36, 2.65], look: [300.0, 1.20, -.58], fov: 46, creep: .22 },
    // P08-P09 Feyyuz elinde parlayan meyve, arkada mahcup rulo Azazil
    { t: PS(8) + .18, dur: .45, pos: [299.88, 1.38, 2.85], look: [299.98, 1.22, -.62], fov: 47, creep: .22 },
    { t: PS(9) + .18, dur: .45, pos: [299.82, 1.36, 2.55], look: [299.85, 1.24, -.58], fov: 46, creep: .20 },
    // P10 Geniş final: güneşli gök altında meyveyi tutan Feyyuz & devrik ayna
    { t: DUR,         dur: Math.max(.6, DUR - PS(10) + .1), pos: [300.0, 1.56, 4.35], look: [300.05, 1.22, -.85], fov: 51, creep: .16 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .48), 1.2);  // kilim rulosu sarılma darbesi!
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) {
    const p = PT[w.part] ||= { s: w.start, e: w.end };
    p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end);
  }
  const lastEnd = ctx.words.length ? ctx.words[ctx.words.length - 1].end : 42;
  DUR = Math.ceil((lastEnd + 1.5) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#9ec6e6');

  buildOda(scene);
  buildAvlu(scene);
  buildMeyve(scene);

  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Altın Bilgelik Meyvesi çevresinde sıcak parıltı zerreleri (P07-P10)
  fx.spark = new Smoke(scene, { color: '#f4d470', maxPoints: 120, H: ctx.H, near: 1.2 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.spark.wisps.push({
    n: 65, size: .04, alpha: .52, speed: .28,
    on: t => where(t) === 'meyve' && t >= PS(7),
    path: (u, t, i) => [
      299.82 + (hash(i, 1) - .5) * .95,
      .85 + u * 1.15,
      -.48 + (hash(i, 3) - .5) * .7
    ]
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(P(1, .56) - .04, 'whoosh');
  cue(PS(4) + .12, 'whoosh');
  cue(PS(7) + .10, 'whoosh');
  cue(P(1, .82) - .04, 'whoosh');
  cue(PS(2) + .12, 'whoosh');

  cue(P(2, .55), 'chime');
  cue(P(6, .46), 'boom');
  cue(P(7, .35), 'shimmer');
  cue(PE(10) - .25, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) {
  if (t < P(1, .54)) return 'oda';
  if (t < P(1, .80)) return 'avlu';
  if (t < PS(2) + .14) return 'meyve';
  if (t < PS(4) + .14) return 'oda';
  if (t < PS(7) + .12) return 'avlu';
  return 'meyve';
}
function camSet(cam) { return cam.position.x > 250 ? 'meyve' : cam.position.x > 100 ? 'avlu' : 'oda'; }

const WARM = '#f2cc92', COOL = '#cfd6ec';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['oda', 'avlu', 'meyve']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();

  const env = ctx.env, talk = (a, b) => (t >= a && t <= b ? flap(env, t) : 0);
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const fy = cast.feyyuz, az = cast.azazil, gl = cast.gelin;
  const tint = [.91, .91, .91];

  if (here === 'oda') {
    const sawDev = t < P(1, .55) || t >= P(2, .45);
    fy.show(); fy.place(-.24, 0, -.78, cam, tint);
    fy.draw({
      expr: sawDev ? 'surprised' : 'focused',
      look: .65, sweat: sawDev ? .85 : 0,
      blink: bl(1, P(2, .5), PS(3)),
      armR: sawDev ? [105, 30] : [26, 18], armL: [20, 14],
      lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    fy.castFrom(dyn.oSun, true);

    if (t >= PS(2) && t < PS(3)) {
      gl.show(); gl.place(-.82, 0, -.95, cam, tint);
      gl.draw({
        expr: 'smile', look: .55, blink: bl(2, PS(2) + .4),
        armR: [24, 16], armL: [18, 12],
        lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      gl.castFrom(dyn.oSun, true);
    }
  } else if (here === 'avlu') {
    const isHook = t < PS(2);
    const hideU = isHook ? 1 : ramp(t, P(4, .35), PE(4));
    const leapU = isHook ? 0 : ramp(t, PS(6), P(6, .48));
    const rolled = !isHook && t >= P(6, .46);

    dyn.flatRug.visible = !rolled;
    dyn.rugRoll.visible = rolled;
    if (rolled) {
      dyn.rugRoll.rotation.z = Math.sin(t * 16) * .08;
    }

    if (!isHook) {
      // Feyyuz: P04'te saklanma duvarının arkasına geçer -> P06'da fırlayıp kilimi sarar!
      const fxPos = leapU > 0 ? 199.05 + leapU * .55 : 199.72 - hideU * .67;
      const fzPos = leapU > 0 ? -1.12 + leapU * .58 : -.65 - hideU * .48;
      fy.show(); fy.place(fxPos, 0, fzPos, cam, tint);
      fy.draw({
        expr: rolled ? 'grin' : leapU > .1 ? 'focused' : 'smug',
        look: .72, blink: bl(3, PS(5), P(6, .48)),
        armR: leapU > .1 ? [115, 25] : [36, 20], armL: leapU > .1 ? [95, 25] : [24, 16],
        bob: leapU > 0 && leapU < 1 ? -Math.abs(Math.sin(t * 14)) * 12 : 0,
        lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      fy.castFrom(dyn.aSun, true);

      // Azazil: P05'te aynaya poz verir -> P06'da kilim rulosunun içine hapsolur!
      if (t >= PS(5) - .1) {
        const arr = ramp(t, PS(5) - .1, P(5, .42));
        const ax = 200.24 + (1 - arr) * 1.1;
        az.show(); az.place(ax, 0, rolled ? -.56 : -.48, cam, tint);
        az.draw({
          expr: rolled ? 'surprised' : 'smug',
          look: rolled ? -.65 : .55,
          sweat: rolled ? 1 : 0,
          blink: bl(4, P(5, .5), P(6, .48)),
          armL: rolled ? [10, 6] : [55, 35], armR: rolled ? [10, 6] : [35, 25],
          lean: rolled ? Math.sin(t * 18) * 6 : 0,
          lit: 1, shade: '#d4c6e0', rim: { color: WARM, a: .22 }
        });
        az.castFrom(dyn.aSun, true);
      }
    }
  } else {
    // ---- SET 3: RULO KİLİM & ALTIN BİLGELİK MEYVESİ FİNALİ (P01 sonu + P07-P10)
    const isHook = t < PS(2);
    const giveU = isHook ? 0 : ramp(t, P(7, .25), P(7, .75));
    dyn.rugRoll3.rotation.z = Math.sin(t * 14) * .06;

    // Rulo kilimdeki mahcup/paniklemiş Azazil (sağda!)
    az.show(); az.place(300.44, 0, -.76, cam, tint);
    az.draw({
      expr: t >= PS(8) ? 'worried' : 'surprised',
      look: -.65, sweat: 1,
      blink: bl(5, PS(7), PS(8)),
      armL: [10, 6], armR: [10, 6],
      lean: Math.sin(t * 14) * 5,
      lit: 1, shade: '#d4c6e0', rim: { color: WARM, a: .22 }
    });
    az.castFrom(dyn.fSun, true);

    // Feyyuz solda Bilgelik Meyvesi'ni alır ve gururla gülümser!
    if (!isHook) {
      fy.show(); fy.place(299.56, 0, -.58, cam, tint);
      fy.draw({
        expr: t >= PS(9) ? 'proud' : t >= PS(8) ? 'smile' : 'grin',
        look: t >= PS(9) ? .15 : .55,
        blink: bl(6, P(7, .75), PS(9)),
        armR: [78, 35], armL: [24, 16],
        lit: -1, shade: COOL, rim: { color: WARM, a: .22 }
      });
      fy.castFrom(dyn.fSun, true);
    }

    // Altın Bilgelik Meyvesi: Azazil'den Feyyuz'un eline kayar ve hafifçe süzülür!
    dyn.fruit.visible = !isHook;
    if (!isHook) {
      const fx0 = .25 - giveU * .45;
      const fy0 = 1.02 + Math.sin(giveU * Math.PI) * .22 + Math.sin(t * 3.5) * .025;
      dyn.fruit.position.set(fx0, fy0, -.42);
      dyn.fruit.rotation.y = t * 1.4;
    }
  }

  for (const s of [fx.spark]) s.update(t);

  // Göz almayan, yumuşak açık gündüz renk düzeltmesi (bloom: 0.16-0.18!)
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'oda') {
    look = { ...focusOn(V(.1, 1.25, -1.0), 3.5, 4.5), sat: 1.12, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#ccc4b6', .010);
  } else if (here === 'avlu') {
    look = { ...focusOn(V(200.1, 1.15, -.75), 3.5, 4.5), sat: 1.13, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c2d8ea', .011);
  } else {
    look = { ...focusOn(V(300.0, 1.22, -.62), 3.5, 4.8), sat: 1.14, lift: [.05, .055, .065], bloom: .17, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c2d8ea', .010);
  }
  look.tint = [.96, .96, .97];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
