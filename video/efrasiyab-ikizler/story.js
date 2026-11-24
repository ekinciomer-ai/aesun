// Efrâsiyâb'ın Hikâyeleri: Biri Sofu, Biri Keyifçi Yapışık İkizler (Abuzer & Alemdar)
// Açık gündüz & sıcak aydınlık akşam teması, göz almayan mat ışık (bloom 0.16-0.17).
// Setler (x ekseninde ayrı; sert kesme yok, süzülme + whip pan):
//   sofra   (x=0)   Aydınlık mahalle avlusu & iftar sofrası (iftara 5 dk duvar saati, sıcak susamlı simit!)
//   meyhane (x=200) Sıcak aydınlık ahşap meyhane/lokanta (tezgâh, şişeler, kadeh, şaşkın usta!)
//   meydan  (x=300) Güneşli açık taş meydan (ortak tek gövde & iç çatışma finali)
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'efrasiyab-ikizler';
export const FPS = 30;
export let DUR = 48;
export const CUES = [];
export const LOOK = {
  abuzer: {
    headW: 256, headH: 244,
    hat: 'kulah', hatColor: '#dcd2be',
    beard: '#3a2c24', beardLen: .52,
    cloth: '#3e624c', clothDark: '#264232',
    trim: '#c9a65a', buttons: '#dfd0a0', collar: true,
    bodyW: 194, height: 1.74
  },
  alemdar: {
    headW: 258, headH: 246,
    hat: 'cap', hatColor: '#9c2d3a',
    mustache: '#2c1e1a',
    blush: '#eb9496',
    cloth: '#c47b2c', clothDark: '#8a5218',
    trim: '#e6c464', buttons: '#f2d888',
    scarf: '#344c68', scarfY: 6, collar: true,
    bodyW: 194, height: 1.74
  },
  usta: {
    headW: 262, headH: 248,
    hat: 'cap', hatColor: '#4a5a6e',
    mustache: '#52443c',
    cloth: '#7c563a', clothDark: '#523622',
    trim: '#d2be9c', buttons: '#e0cfa8', pocket: true, collar: true,
    bodyW: 206, height: 1.70
  }
};

const S = smoother;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ramp = (t, a, b) => S(clamp((t - a) / Math.max(1e-4, b - a), 0, 1));
const V = (...a) => new THREE.Vector3(...a);
let C, PT = {}, cast = {}, sets = {}, fx = {}, dyn = {};

const P = (k, f = 0) => {
  const p = PT['P' + String(k).padStart(2, '0')] || { s: (k - 1) * 4.5, e: k * 4.5 };
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
function dab(g, w, h, base, n, r, amt, seed, a0 = .16) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .18;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

function plasterTex(base = '#e4dcc8', seed = 31) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 420, 28, .12, seed, .15);
  return tx(c, [2, 1]);
}

function stoneTex(base = '#c4bba8', seed = 51, rep = [4, 4]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 420, 24, .14, seed, .16);
  const R = rng(seed + 1);
  g.strokeStyle = sh(base, .70); g.lineWidth = 3;
  for (let y = 0; y < 512; y += 64) {
    const off = (y / 64) % 2 ? 48 : 0;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
    for (let x = off; x < 512; x += 96) {
      g.beginPath(); g.moveTo(x + (R() - .5) * 5, y); g.lineTo(x + (R() - .5) * 5, y + 64); g.stroke();
    }
  }
  return tx(c, rep);
}

// Ortak yapışık kuşak / geniş gövde bağı (iki kardeşi tek bedende birleştiren dokuma kuşak!)
function sashTex() {
  const [c, g] = cnv(512, 256);
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#3a5d48'); grad.addColorStop(.48, '#5a6346'); grad.addColorStop(.52, '#8b6836'); grad.addColorStop(1, '#bd782c');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  // ortada dokuma altın-bordo kuşak şeridi
  g.fillStyle = '#8b2f34'; g.fillRect(0, 96, 512, 64);
  g.fillStyle = '#e0be62'; g.fillRect(0, 92, 512, 10); g.fillRect(0, 154, 512, 10);
  for (let x = 24; x < 512; x += 48) {
    g.fillStyle = '#e4c468';
    g.beginPath(); g.moveTo(x, 110); g.lineTo(x + 14, 128); g.lineTo(x, 146); g.lineTo(x - 14, 128); g.closePath(); g.fill();
  }
  return tx(c);
}

// İftara 5 dakika kala duvar saati (11:55 / 07:55!)
function clockTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#f2ead8'; g.beginPath(); g.arc(256, 256, 240, 0, 6.29); g.fill();
  g.strokeStyle = '#6c482a'; g.lineWidth = 22; g.stroke();
  g.strokeStyle = PLUM; g.fillStyle = PLUM;
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 - Math.PI / 2;
    g.lineWidth = i % 3 === 0 ? 11 : 6;
    g.beginPath(); g.moveTo(256 + Math.cos(a) * 185, 256 + Math.sin(a) * 185);
    g.lineTo(256 + Math.cos(a) * 215, 256 + Math.sin(a) * 215); g.stroke();
  }
  // Akrep 8'e yakın, yelkovan 11'de (iftara tam 5 dakika kala — kırmızı vurgu dilimi!)
  g.fillStyle = 'rgba(206, 62, 48, 0.28)';
  g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 175, -Math.PI * 2 / 3, -Math.PI / 2); g.closePath(); g.fill();
  // Akrep
  g.lineWidth = 14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.cos(2.6) * 112, 256 + Math.sin(2.6) * 112); g.stroke();
  // Yelkovan (11 yönünde = -120 deg)
  g.strokeStyle = '#b43028'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.cos(-Math.PI * 2 / 3) * 168, 256 + Math.sin(-Math.PI * 2 / 3) * 168); g.stroke();
  g.fillStyle = PLUM; g.beginPath(); g.arc(256, 256, 14, 0, 6.29); g.fill();
  return tx(c);
}

function daySkyTex(seed = 71) {
  const w = 2048, h = 1024, [c, g] = cnv(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h * .66);
  sky.addColorStop(0, D('#5e9ad2')); sky.addColorStop(.55, D('#98c4e8')); sky.addColorStop(1, D('#d4e6f2'));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const R = rng(seed);
  for (let i = 0; i < 12; i++) {
    g.fillStyle = D('#eaf2f8', .56);
    g.beginPath(); g.ellipse(R() * w, h * (.14 + R() * .26), 88 + R() * 140, 20 + R() * 16, 0, 0, 6.29); g.fill();
  }
  for (const [y0, amp, col] of [[h * .65, 55, '#7290aa'], [h * .73, 40, '#869c78'], [h * .80, 24, '#b29e76']]) {
    g.fillStyle = D(col); g.beginPath(); g.moveTo(0, h); g.lineTo(0, y0);
    for (let x = 0; x <= w; x += 64) g.lineTo(x, y0 - Math.sin(x * .004 + y0) * amp - Math.cos(x * .01) * amp * .35);
    g.lineTo(w, h); g.closePath(); g.fill();
  }
  return tx(c);
}

// 3B Ortak Yapışık Gövde Kuşağı (iki kardeşin belini tek bedende sarar!)
function buildSharedSash() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.32, .30, .44, 24), painted(sashTex()));
  body.scale.set(1.22, 1, .56);
  body.position.y = .76;
  grp.add(body);
  return grp;
}

// 3B Susamlı Çıtır Simit
function buildSimit() {
  const grp = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.11, .036, 12, 22), flat('#c88234'));
  grp.add(ring);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI * 2 / 12;
    const ses = new THREE.Mesh(new THREE.SphereGeometry(.009, 6, 6), flat('#f0e2be'));
    ses.position.set(Math.cos(a) * .11, Math.sin(a) * .11, .034);
    grp.add(ses);
  }
  return grp;
}

// 3B Meyhane Kadehi / Maşrapa
function buildGoblet() {
  const grp = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.068, .052, .16, 16), flat('#d49e38'));
  cup.position.y = .09; grp.add(cup);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .024, 16), flat('#f4ebd6'));
  foam.position.y = .175; grp.add(foam);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.042, .011, 8, 14, Math.PI), flat('#b47e26'));
  handle.rotation.z = -Math.PI / 2; handle.position.set(.068, .09, 0); grp.add(handle);
  return grp;
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

// ---------------------------------------------------------------- SET 1: AYDINLIK İFTAR SOFRASI / AVLU (x = 0)
function buildSofra(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), painted(stoneTex('#c6bda8', 11, [6, 6])));
  floor.rotation.x = -Math.PI / 2; g.add(floor);

  const wallMat = painted(plasterTex('#e6decb', 12));
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.2, .36), wallMat); backWall.position.set(0, 1.6, -2.5); g.add(backWall);

  // Büyük duvar saati (iftara 5 dk kala!)
  const clock = new THREE.Mesh(new THREE.CircleGeometry(.42, 32), new THREE.MeshBasicMaterial({ map: clockTex() }));
  clock.position.set(.95, 2.02, -2.30); clock.userData.noShadow = true; g.add(clock);

  // Ön-sağda ahşap iftar sofrası + tabak + ekstra simit
  const wood = painted(woodTex({ base: '#9e6c42' }));
  const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.15, .07, .68), wood); tbl.position.set(.85, .64, -.55); g.add(tbl);
  for (const [lx, lz] of [[.36, -.28], [1.34, -.28], [.36, -.82], [1.34, -.82]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.07, .64, .07), wood); leg.position.set(lx, .32, lz); g.add(leg);
  }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.20, .16, .03, 20), flat('#ede6d6'));
  plate.position.set(.74, .69, -.55); g.add(plate);

  // Ortak kuşak (sofra seti) + hareketli simit
  dyn.sash1 = buildSharedSash(); dyn.sash1.position.set(-.18, 0, -.76); g.add(dyn.sash1);
  dyn.simit = buildSimit(); dyn.simit.position.set(.74, .75, -.55); g.add(dyn.simit);

  const far = new THREE.Mesh(new THREE.CylinderGeometry(48, 48, 40, 40, 1, true), vistaMat(daySkyTex(71), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#d4eafc', '#b4a48e', 2.05));
  const dir = [.32, -.70, -.62]; dyn.sSun = V(...dir).normalize();
  const s = sun('#ffead0', 2.25, dir, [0, 1.1, -.8], { ext: 7 }); L.add(s); L.add(s.target);
  scene.add(L); sets.sofra = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: SICAK AYDINLIK MEYHANE / LOKANTA (x = 200)
function buildMeyhane(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), painted(woodTex({ base: '#b0845a', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const wallMat = painted(plasterTex('#e4d6be', 22));
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); backWall.position.set(0, 2.6, -2.85); g.add(backWall);
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideL.rotation.y = Math.PI / 2; sideL.position.set(-4.2, 2.6, 0); g.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideR.rotation.y = -Math.PI / 2; sideR.position.set(4.2, 2.6, 0); g.add(sideR);

  // Arka raf + renkli şişeler
  const wood = painted(woodTex({ base: '#7e5232' }));
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.6, .10, .36), wood); shelf.position.set(0, 1.82, -2.65); g.add(shelf);
  for (const [bx, col] of [[-1.15, '#3b7c54'], [-.75, '#a84438'], [-.35, '#c48c32'], [.35, '#466c96'], [.75, '#8a3e54'], [1.15, '#4e7c44']]) {
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(.055, .062, .28, 12), flat(col));
    bot.position.set(bx, 2.01, -2.62); g.add(bot);
  }

  // Ahşap tezgâh (arka-sağda usta arkasında durur)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.55, .94, .58), wood); bar.position.set(.88, .47, -1.48); g.add(bar);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(1.64, .06, .66), painted(woodTex({ base: '#9c6a42' }))); barTop.position.set(.88, .96, -1.48); g.add(barTop);

  // Ortak kuşak (meyhane seti) + Alemdar'ın kaptığı büyük kadeh!
  dyn.sash2 = buildSharedSash(); dyn.sash2.position.set(-.22, 0, -.64); g.add(dyn.sash2);
  dyn.goblet = buildGoblet(); dyn.goblet.position.set(.42, 1.04, -.52); g.add(dyn.goblet);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#deebfa', '#b8a48c', 2.18));
  const dir = [.28, -.68, -.66]; dyn.mSun = V(...dir).normalize();
  const s = sun('#ffebd0', 2.30, dir, [200, 1.2, -.8], { ext: 7 }); L.add(s); L.add(s.target);
  scene.add(L); sets.meyhane = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: GÜNEŞLİ MEYDAN FİNALİ (x = 300)
function buildMeydan(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), painted(stoneTex('#c4bba8', 81, [8, 8])));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const stWall = painted(stoneTex('#cfc6b4', 82, [3, 2]));
  const lowWall = new THREE.Mesh(new THREE.BoxGeometry(5.6, .88, .42), stWall); lowWall.position.set(0, .44, -2.55); g.add(lowWall);
  for (const px of [-2.4, 2.4]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(.46, 2.6, .46), stWall); pil.position.set(px, 1.3, -2.55); g.add(pil);
  }
  dyn.sash3 = buildSharedSash(); dyn.sash3.position.set(0, 0, -.68); g.add(dyn.sash3);

  const far = new THREE.Mesh(new THREE.CylinderGeometry(48, 48, 40, 40, 1, true), vistaMat(daySkyTex(88), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c4e0f8', '#988c78', 1.88));
  const dir = [.34, -.70, -.62]; dyn.dSun = V(...dir).normalize();
  const s = sun('#ffe4bc', 2.15, dir, [300, 1.1, -.8], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.meydan = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU
function cameraPath() {
  const k = [
    // P01 KANCA (4 görüntü): yapışık ikizler -> iftara 5 dk saat & simit -> meyhanede kadeh -> başı dönen ikizler!
    { t: 0,           pos: [-.14, 1.40, 3.55], look: [-.10, 1.24, -.76], fov: 48, creep: .24, drift: .03 },
    { t: P(1, .28),   dur: .38, pos: [.78, 1.72, 1.65], look: [.90, 1.88, -2.25], fov: 44, creep: .26 },
    { t: P(1, .56),   dur: .30, move: 'whip', pos: [200.05, 1.38, 3.50], look: [200.08, 1.22, -.85], fov: 48, creep: .24 },
    { t: P(1, .82),   dur: .30, move: 'whip', pos: [199.82, 1.42, 3.15], look: [199.82, 1.24, -.64], fov: 47, creep: .24 },
    // P02 "Bakın," (sofra): Abuzer + Alemdar ortak gövdede tanıtılır
    { t: PS(2) + .16, dur: .30, move: 'whip', pos: [.05, 1.40, 3.95], look: [.05, 1.18, -.76], fov: 49, creep: .22 },
    { t: PE(2),       dur: Math.max(.4, PE(2) - PS(2) - .2), pos: [-.08, 1.42, 3.45], look: [-.05, 1.22, -.76], fov: 48, creep: .22 },
    // P03 Duvar saati iftara 5 dk -> Alemdar simidi ağzına atar!
    { t: PS(3) + .16, dur: .40, pos: [.35, 1.56, 3.65], look: [.38, 1.42, -1.25], fov: 48, creep: .24 },
    { t: PE(3),       dur: Math.max(.4, PE(3) - PS(3) - .2), pos: [.05, 1.38, 3.35], look: [.02, 1.22, -.72], fov: 47, creep: .22 },
    // P04 Abuzer öfkeden kıpkırmızı, Alemdar kahkahalarla güler
    { t: PS(4) + .16, dur: .38, pos: [-.16, 1.40, 3.15], look: [-.16, 1.28, -.76], fov: 46, creep: .22 },
    { t: PE(4),       dur: Math.max(.4, PE(4) - PS(4) - .2), pos: [-.14, 1.42, 3.35], look: [-.14, 1.26, -.76], fov: 47, creep: .20 },
    // P05 Whip ile meyhane: Abuzer ciddi öğüt verir, arkada şaşkın usta!
    { t: PS(5) + .16, dur: .30, move: 'whip', pos: [200.12, 1.40, 3.85], look: [200.12, 1.22, -.88], fov: 49, creep: .22 },
    { t: PE(5),       dur: Math.max(.4, PE(5) - PS(5) - .2), pos: [199.95, 1.40, 3.45], look: [200.02, 1.24, -.85], fov: 48, creep: .22 },
    // P06 Alemdar gizlice kadehi diker!
    { t: PS(6) + .16, dur: .38, pos: [200.02, 1.38, 3.25], look: [200.04, 1.24, -.75], fov: 47, creep: .22 },
    { t: PE(6),       dur: Math.max(.4, PE(6) - PS(6) - .2), pos: [200.08, 1.38, 3.35], look: [200.06, 1.24, -.75], fov: 47, creep: .20 },
    // P07 Kadehin etkisi ortak bedene yayılır — ikisi birden sallanır, usta şaşkın! (kick!)
    { t: PS(7) + .16, dur: .35, pos: [200.06, 1.42, 3.65], look: [200.10, 1.24, -.85], fov: 49, creep: .24 },
    { t: PE(7),       dur: Math.max(.4, PE(7) - PS(7) - .2), pos: [200.10, 1.42, 3.85], look: [200.12, 1.24, -.88], fov: 49, creep: .20 },
    // P08 Whip ile güneşli meydan: iki zıt irade tek gövdede
    { t: PS(8) + .14, dur: .30, move: 'whip', pos: [300.0, 1.40, 3.65], look: [300.0, 1.24, -.68], fov: 48, creep: .22 },
    { t: PS(9) + .18, dur: .45, pos: [299.96, 1.40, 3.35], look: [300.0, 1.26, -.68], fov: 47, creep: .20 },
    // P10 Geniş final: güneşli gök altında tek gövdede iki baş, kamera yavaşça geri çekilir
    { t: DUR,         dur: Math.max(.6, DUR - PS(10) + .1), pos: [300.0, 1.56, 4.55], look: [300.0, 1.24, -.75], fov: 51, creep: .16 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(7, .24), 1.15); // baş dönmesi / sendeleme anı!
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) {
    const p = PT[w.part] ||= { s: w.start, e: w.end };
    p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end);
  }
  const lastEnd = ctx.words.length ? ctx.words[ctx.words.length - 1].end : 45;
  DUR = Math.ceil((lastEnd + 1.5) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#9ec6e6');

  buildSofra(scene);
  buildMeyhane(scene);
  buildMeydan(scene);

  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Baş dönmesi / meyhanede neşeli parıltı baloncukları (P07)
  fx.dizzy = new Smoke(scene, { color: '#f2d270', maxPoints: 90, H: ctx.H, near: 1.2 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.dizzy.wisps.push({
    n: 45, size: .042, alpha: .55, speed: .36,
    on: t => where(t) === 'meyhane' && (t < PS(2) || t >= PS(7)),
    path: (u, t, i) => [
      199.78 + Math.cos(t * 2.6 + i) * .48,
      1.68 + u * .55,
      -.64 + Math.sin(t * 2.6 + i) * .35
    ]
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(P(1, .56) - .04, 'whoosh');
  cue(P(1, .82) - .04, 'whoosh');
  cue(PS(2) + .12, 'whoosh');
  cue(PS(5) + .12, 'whoosh');
  cue(PS(8) + .10, 'whoosh');

  cue(P(3, .22), 'tick');
  cue(P(3, .62), 'crunch');
  cue(P(6, .42), 'clink');
  cue(P(7, .22), 'boom');
  cue(PE(10) - .25, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) {
  if (t < P(1, .54)) return 'sofra';
  if (t < PS(2) + .14) return 'meyhane';
  if (t < PS(5) + .14) return 'sofra';
  if (t < PS(8) + .12) return 'meyhane';
  return 'meydan';
}
function camSet(cam) { return cam.position.x > 250 ? 'meydan' : cam.position.x > 100 ? 'meyhane' : 'sofra'; }

const WARM = '#f2cc92', COOL = '#cfd6ec';

// İki yapışık ikizi tek gövdede (ortak kuşakla!) yerleştiren yardımcı
function placeTwins(cx, cz, cam, tint, sunDir, { sway = 0, abOpts = {}, alOpts = {} }) {
  const ab = cast.abuzer, al = cast.alemdar;
  const swX = Math.sin(sway) * .06;
  ab.show(); ab.place(cx - .21 + swX, 0, cz, cam, tint);
  ab.draw({
    lean: -7 + Math.sin(sway) * 11,
    lit: -1, shade: COOL, rim: { color: WARM, a: .20 },
    ...abOpts
  });
  ab.castFrom(sunDir, true);

  al.show(); al.place(cx + .21 + swX, 0, cz + .01, cam, tint);
  al.draw({
    lean: 7 + Math.sin(sway) * 11,
    lit: 1, shade: '#e2d2cc', rim: { color: WARM, a: .20 },
    ...alOpts
  });
  al.castFrom(sunDir, true);
}

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['sofra', 'meyhane', 'meydan']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();

  const env = ctx.env, talk = (a, b) => (t >= a && t <= b ? flap(env, t) : 0);
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const us = cast.usta;
  const tint = [.91, .91, .91];

  if (here === 'sofra') {
    const isHook = t < PS(2);
    const eatU = isHook ? .85 : ramp(t, P(3, .45), P(3, .85));
    const angry = !isHook && t >= P(3, .78);

    // Simit masadan Alemdar'ın ağzına kalkar!
    const sx = .74 * (1 - eatU) + .16 * eatU;
    const sy = .75 * (1 - eatU) + 1.24 * eatU;
    const sz = -.55 * (1 - eatU) + -.54 * eatU;
    dyn.simit.position.set(sx, sy, sz);
    dyn.simit.rotation.y = eatU * .4;

    placeTwins(-.18, -.76, cam, tint, dyn.sSun, {
      sway: 0,
      abOpts: {
        expr: angry ? 'angry' : isHook ? 'angry' : 'focused',
        look: angry || isHook ? .75 : .45,
        sweat: angry ? .95 : 0,
        blink: bl(1, P(2, .5), PS(4)),
        armL: angry ? [102, 26] : [26, 16],
        armR: [12, 8],
      },
      alOpts: {
        expr: angry ? 'laugh' : eatU > .4 ? 'grin' : 'smug',
        look: angry ? -.45 : .25,
        mouth: eatU > .5 && !angry ? Math.abs(Math.sin(t * 14)) * .7 : 0,
        laughMarks: angry ? 1 : 0,
        blink: bl(2, P(2, .6), P(3, .8)),
        armL: [12, 8],
        armR: eatU > .25 ? [96, 42] : [28, 16],
      }
    });
  } else if (here === 'meyhane') {
    const isHook = t < PS(2);
    const drinkU = isHook ? .95 : ramp(t, P(6, .18), P(6, .75));
    const dizzy = (isHook && t >= P(1, .80)) || (!isHook && t >= PS(7));
    const swayPhase = dizzy ? t * 4.2 : 0;

    dyn.sash2.position.x = -.22 + (dizzy ? Math.sin(swayPhase) * .06 : 0);
    dyn.sash2.rotation.z = dizzy ? -Math.sin(swayPhase) * .12 : 0;

    // Kadeh tezgâhtan Alemdar'ın eline ve ağzına kalkar!
    const gx = .42 * (1 - drinkU) + .16 * drinkU + (dizzy ? Math.sin(swayPhase) * .06 : 0);
    const gy = 1.04 * (1 - drinkU) + 1.24 * drinkU;
    const gz = -.52 * (1 - drinkU) + -.48 * drinkU;
    dyn.goblet.position.set(gx, gy, gz);
    dyn.goblet.rotation.z = drinkU > .55 ? .45 : 0;

    placeTwins(199.78, -.64, cam, tint, dyn.mSun, {
      sway: swayPhase,
      abOpts: {
        expr: dizzy ? 'surprised' : 'focused',
        look: dizzy ? Math.sin(t * 5) * .65 : -.55,
        sweat: dizzy ? 1 : 0,
        mouth: !dizzy && t >= PS(5) && t <= PE(5) ? talk(PS(5), PE(5)) : dizzy ? .45 : 0,
        blink: bl(3, PS(6), PS(7)),
        armL: dizzy ? [74, 34] : [108, 26],
        armR: [12, 8],
      },
      alOpts: {
        expr: dizzy ? 'laugh' : drinkU > .35 ? 'grin' : 'smug',
        look: dizzy ? -.35 : .40,
        laughMarks: dizzy ? 1 : 0,
        blink: bl(4, P(5, .5), PS(7)),
        armL: [12, 8],
        armR: drinkU > .2 ? [102, 46] : [32, 18],
      }
    });

    // Sağ arkada tezgâhın ardında şaşkın Meyhane Ustası!
    us.show(); us.place(200.84, 0, -1.78, cam, tint);
    us.draw({
      expr: dizzy ? 'surprised' : 'worried',
      look: -.68,
      sweat: dizzy ? .85 : 0,
      blink: bl(5, PS(5) + .6, PS(7)),
      armL: dizzy ? [96, 30] : [26, 16], armR: [24, 16],
      lit: 1, shade: COOL, rim: { color: WARM, a: .18 }
    });
    us.castFrom(dyn.mSun, true);
  } else {
    // ---- SET 3: GÜNEŞLİ MEYDAN FİNALİ (P08-P10)
    const swayEnd = Math.sin(t * 1.4) * .12;
    dyn.sash3.rotation.z = -swayEnd * .05;
    placeTwins(300.0, -.68, cam, tint, dyn.dSun, {
      sway: swayEnd,
      abOpts: {
        expr: t >= PS(9) ? 'proud' : 'worried',
        look: t >= PS(9) ? .10 : .55,
        blink: bl(6, PS(8) + .4, PS(10)),
        armL: [26, 16], armR: [12, 8],
      },
      alOpts: {
        expr: t >= PS(9) ? 'smile' : 'smug',
        look: t >= PS(9) ? -.10 : -.55,
        blink: bl(7, PS(8) + .7, PS(10)),
        armL: [12, 8], armR: [30, 18],
      }
    });
  }

  for (const s of [fx.dizzy]) s.update(t);

  // Göz almayan açık tema renk düzeltmesi (bloom: 0.16-0.17)
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'sofra') {
    look = { ...focusOn(V(0, 1.24, -.76), 3.5, 4.8), sat: 1.13, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c6d9ea', .010);
  } else if (here === 'meyhane') {
    look = { ...focusOn(V(200.05, 1.24, -.85), 3.5, 4.8), sat: 1.12, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#d4c8b6', .010);
  } else {
    look = { ...focusOn(V(300.0, 1.24, -.68), 3.5, 4.8), sat: 1.14, lift: [.05, .055, .065], bloom: .17, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c2d8ea', .010);
  }
  look.tint = [.96, .96, .97];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
