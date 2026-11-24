// Pumpkin 2: İstanbul'da Kaybolan Aslan — yumurta kafa stili.
// Senaryo: aesun icerik/senaryolar/pumpkin_2_kaybolan_aslan.md (8 sahne), yumurta stiline uyarlandı.
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an. Böylece aynı dosya
// Türkçe ve İngilizce seste çalışır (İngilizce klasör bu dosyayı yeniden dışa aktarır, yalnız words.json farklı).
// Setler: ORMAN (x≈0), İSKELE (x≈200), TEPE / gün batımı (x≈300). Sert kesme yok: süzülme + whip.
// Işık (stilin kuralı: kaynak görüntüde, sıcak karşısında soğuk, gerçek gölge):
//   orman  alçak sabah güneşi ağaçların arasından (sıcak, gölgeli, huzmeler) — mavi-yeşil sis ve gökyüzü dolgusu
//   iskele sabah güneşi (sıcak) — mavi deniz ve gök
//   tepe   batan güneş karakterlerin ARKASINDA (sıcak kenar ışığı) — mor dolgu, koyu mavi deniz
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'pumpkin-aslan';
export const FPS = 30;
export let DUR = 40;
export const CUES = [];
export const LOOK = {
  pumpkin: { headW: 262, headH: 244, longHair: '#e2b13c', hairLen: 300, cloth: '#c4552a', pattern: 'hstripes', stripe: '#6a2a1c',
             skirt: '#4f7fb8', boots: '#9a5a2e', blush: '#f2a0a0', collar: false, bodyW: 170, drop: 120, height: 1.05 },
  limon:   { headW: 276, headH: 254, mane: '#e0a03a', ears: true, nose: '#6a3a2a', cloth: '#e2b45a', collar: false,
             scarf: '#c8323a', scarfY: 150, tail: '#d08a2a', tailSide: -1, bodyW: 230, drop: 150, height: 1.45 },
  yolcu1:  { hat: 'kulah', hatColor: '#3d5a8a', cloth: '#5a6e8e', buttons: '#2a3040', mustache: true, hair: '#3a2a24', height: 1.7 },
  yolcu2:  { longHair: '#4a3026', hairLen: 200, cloth: '#b8463e', skirt: '#3a4a6a', boots: '#3a2a2a', blush: '#f2a0a0', collar: false, height: 1.6, drop: 40 },
  simitci: { hat: 'cook', cloth: '#e8e2d4', apron: true, mustache: true, hair: '#4a3020', height: 1.68 },
};

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
let C, PT = {}, cast = {}, sets = {}, fx = {}, dyn = {};
// k. parçanın f oranındaki an (f < 0 ya da > 1 olabilir: parçadan önce / sonra)
const P = (k, f = 0) => { const p = PT['P' + String(k).padStart(2, '0')]; return p.s + (p.e - p.s) * f; };
const PS = k => P(k, 0), PE = k => P(k, 1);

// ---------------------------------------------------------------- boyalı dokular
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tx(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; }
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function dab(g, w, h, base, n, r, amt, seed, a0 = .25) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) { g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .3; g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill(); }
  g.globalAlpha = 1;
}
// orman zemini: yosun yeşili, dökülmüş yapraklar (turuncu-kızıl), ince çimen çizgileri
function groundTex(rep) {
  const [c, g] = cnv(1024, 1024); g.fillStyle = '#5c8a46'; g.fillRect(0, 0, 1024, 1024); dab(g, 1024, 1024, '#5c8a46', 900, 26, .35, 3);
  const R = rng(5);
  for (let i = 0; i < 520; i++) { g.fillStyle = ['#d0782e', '#b8483a', '#e0a83a', '#8a5a2e'][i % 4]; g.globalAlpha = .75; g.save(); g.translate(R() * 1024, R() * 1024); g.rotate(R() * 6.3);
    g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, 6.29); g.fill(); g.strokeStyle = sh('#5a3020', 1); g.globalAlpha = .4; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore(); }
  g.globalAlpha = .45; g.strokeStyle = '#3e6a34'; g.lineWidth = 2; for (let i = 0; i < 700; i++) { const x = R() * 1024, y = R() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 6, y - 8 - R() * 8); g.stroke(); }
  g.globalAlpha = 1; return tx(c, rep);
}
function pathTex(rep) {
  const [c, g] = cnv(512, 512); g.fillStyle = '#b8905c'; g.fillRect(0, 0, 512, 512); dab(g, 512, 512, '#b8905c', 500, 18, .3, 7);
  const R = rng(8); g.fillStyle = '#8a6a48'; for (let i = 0; i < 90; i++) { g.globalAlpha = .6; g.beginPath(); g.ellipse(R() * 512, R() * 512, 4 + R() * 6, 3 + R() * 4, R() * 3, 0, 6.29); g.fill(); }
  g.globalAlpha = 1; return tx(c, rep);
}
// ağaç kabuğu: dikey fırça izleri, kabuğun koyu tonu (asla siyah değil)
function barkTex(base = '#7a5a4e') {
  const [c, g] = cnv(256, 512); g.fillStyle = base; g.fillRect(0, 0, 256, 512); dab(g, 256, 512, base, 160, 14, .3, 11);
  const R = rng(12); g.strokeStyle = sh(base, .62); g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { const x = R() * 256; g.lineWidth = 2 + R() * 2.5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 512; y += 64) g.lineTo(x + Math.sin(y * .02 + i) * 6, y); g.stroke(); }
  return tx(c, [2, 3]);
}
function leafTex(base) {
  const [c, g] = cnv(512, 512); g.fillStyle = base; g.fillRect(0, 0, 512, 512); dab(g, 512, 512, base, 420, 22, .45, 13, .35);
  const R = rng(14); g.strokeStyle = sh(base, .66); g.lineWidth = 2.4; g.globalAlpha = .55;
  for (let i = 0; i < 120; i++) { const x = R() * 512, y = R() * 512; g.beginPath(); g.arc(x, y, 9 + R() * 8, Math.PI * .1, Math.PI * .9); g.stroke(); }
  g.globalAlpha = 1; return tx(c, [2, 2]);
}
function seaTex(base = '#2f6fb0', rep = [8, 8]) {
  const [c, g] = cnv(512, 512); g.fillStyle = base; g.fillRect(0, 0, 512, 512); dab(g, 512, 512, base, 300, 30, .2, 21);
  const R = rng(22); g.strokeStyle = sh(base, 1.45); g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 60; i++) { const x = R() * 512, y = R() * 512, l = 14 + R() * 26; g.globalAlpha = .7; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 5, x + l, y); g.stroke(); }
  g.globalAlpha = 1; return tx(c, rep);
}

// ---------------------------------------------------------------- panoramalar (boyalı uzak manzara)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
// uzak İstanbul silueti: kubbe + minareler (gerçek bir yapının kopyası değil), kuleli tepe, evler
function skyline(Pn, y0, col, ink, seed, { scale = 1 } = {}) {
  const { g } = Pn, R = rng(seed);
  g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 3; g.lineJoin = 'round';
  // tepe / ev sırası
  g.beginPath(); g.moveTo(0, Pn.h); g.lineTo(0, y0);
  for (let x = 0; x <= Pn.w; x += 28) { const hh = (8 + R() * 22) * scale; g.lineTo(x, y0 - hh); g.lineTo(x + 24, y0 - hh); }
  g.lineTo(Pn.w, Pn.h); g.closePath(); g.fill();
  const dome = (x, r) => { g.beginPath(); g.moveTo(x - r * 1.5, y0 - r * .9); g.lineTo(x - r * 1.5, y0 - r * 1.6); g.arc(x, y0 - r * 1.6, r, Math.PI, 0); g.lineTo(x + r * 1.5, y0 - r * 1.6); g.lineTo(x + r * 1.5, y0 - r * .9); g.closePath(); g.fill(); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * r * 1.2, y0 - r * 1.45, r * .45, Math.PI, 0); g.fill(); g.stroke(); } };
  const minaret = (x, hgt) => { g.beginPath(); g.rect(x - 5 * scale, y0 - hgt, 10 * scale, hgt); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - 6 * scale, y0 - hgt); g.lineTo(x, y0 - hgt - 26 * scale); g.lineTo(x + 6 * scale, y0 - hgt); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.rect(x - 9 * scale, y0 - hgt * .72, 18 * scale, 5 * scale); g.fill(); };
  return { dome, minaret };
}
// Gün batımı: turuncu-pembe gök, ufukta büyük güneş (beyazdan parlak → hale), koyu mavi deniz üstünde güneş yolu,
// karşı kıyıda mor siluet, uzakta asma köprü silueti. Genişlik 100°, el = [-14°, 30°].
function sunsetTex() {
  const Pn = pano(4096, 1800, 100, -14, 30), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#5a5ab8')); sky.addColorStop(.45, D('#c86a9a')); sky.addColorStop(.8, D('#f29a5a')); sky.addColorStop(1, D('#ffd08a'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(41);
  for (let i = 0; i < 9; i++) { g.fillStyle = D(i % 2 ? '#f6a878' : '#e07a8a', .55); const y = Pn.Y(8 + R() * 16), x = R() * Pn.w; g.beginPath(); g.ellipse(x, y, 180 + R() * 260, 16 + R() * 14, 0, 0, 6.29); g.fill(); }
  // güneş: diskin içi beyazdan parlak (kazanç 1,4 ile çarpılınca hale yapar)
  const sx = Pn.X(4), sy = Pn.Y(3.2), sr = Pn.s * 3.4;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.33, 'rgba(255,220,150,.9)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr * 3, 0, 6.29); g.fill();
  g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.29); g.fill();
  // deniz
  const sea = g.createLinearGradient(0, Pn.Y(0), 0, Pn.h); sea.addColorStop(0, D('#3a4aa0')); sea.addColorStop(1, D('#1e2a6a'));
  g.fillStyle = sea; g.fillRect(0, Pn.Y(0), Pn.w, Pn.h - Pn.Y(0));
  for (let i = 0; i < 160; i++) { const y = Pn.Y(-.4 - R() * 12), spread = (Pn.Y(0) - y) * -.9 + 30; g.fillStyle = D('#ffd890', .5 + R() * .4); g.fillRect(sx + (R() - .5) * spread * 1.2 - 30, y, 30 + R() * 50, 4); }
  // karşı kıyı: kubbeler, minareler, kule
  const y0 = Pn.Y(1.1), { dome, minaret } = skyline(Pn, y0, D('#4a3a78'), D('#2a2050', .9), 43, { scale: 1.3 });
  g.fillStyle = D('#4a3a78'); g.strokeStyle = D('#2a2050', .9);
  for (const [r, rad, ms] of [[-30, 50, [130, 150]], [-12, 64, [170, 190, 170, 150]], [22, 44, [120, 140]]]) {
    const x = Pn.X(r); dome(x, rad); ms.forEach((m, k) => minaret(x + (k - (ms.length - 1) / 2) * rad * 1.3 * (k % 2 ? 1 : 1.15), m));
  }
  const tx0 = Pn.X(38); g.beginPath(); g.rect(tx0 - 20, y0 - 150, 40, 150); g.fill(); g.stroke(); g.beginPath(); g.moveTo(tx0 - 26, y0 - 150); g.lineTo(tx0, y0 - 210); g.lineTo(tx0 + 26, y0 - 150); g.closePath(); g.fill(); g.stroke();
  // asma köprü (genel bir köprü silueti)
  const b0 = Pn.X(-48), b1 = Pn.X(-14), by = Pn.Y(.9); g.strokeStyle = D('#3a2e66'); g.lineWidth = 6;
  for (const x of [b0 + 150, b1 - 150]) { g.beginPath(); g.moveTo(x, by); g.lineTo(x, by - 160); g.stroke(); }
  g.lineWidth = 4; g.beginPath(); g.moveTo(b0, by - 30); g.lineTo(b1, by - 30); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.moveTo(b0, by - 40); g.lineTo(b0 + 150, by - 160); g.quadraticCurveTo((b0 + b1) / 2, by - 50, b1 - 150, by - 160); g.lineTo(b1, by - 40); g.stroke();
  const t = new THREE.CanvasTexture(Pn.c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// İskelenin karşısı: sabah, açık mavi gök, karşı kıyıda kubbeler ve evler. Genişlik 110°, el = [-12°, 30°].
function harbourTex() {
  const Pn = pano(4096, 1600, 110, -12, 30), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0)); sky.addColorStop(0, D('#6aa6e8')); sky.addColorStop(1, D('#cfe6f6'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(51); g.fillStyle = D('#ffffff', .85);
  for (let i = 0; i < 12; i++) { const x = R() * Pn.w, y = Pn.Y(10 + R() * 16); for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 46, y - (k % 2) * 16, 60, 26, 0, 0, 6.29); g.fill(); } }
  g.fillStyle = D('#3f86c8'); g.fillRect(0, Pn.Y(0), Pn.w, Pn.h);
  const y0 = Pn.Y(1.2), { dome, minaret } = skyline(Pn, y0, D('#8e9ec8'), D('#4a5a8a', .8), 53);
  g.fillStyle = D('#8e9ec8'); g.strokeStyle = D('#4a5a8a', .8);
  for (const [r, rad, ms] of [[-34, 40, [110, 120]], [-4, 52, [140, 150, 140]], [30, 36, [100]]]) { const x = Pn.X(r); dome(x, rad); ms.forEach((m, k) => minaret(x + (k - (ms.length - 1) / 2) * rad * 1.4, m)); }
  for (let i = 0; i < 70; i++) { g.fillStyle = D('#ffffff', .7); g.fillRect(Pn.X(-55 + R() * 110), Pn.Y(-.5 - R() * 10), 20 + R() * 40, 3); }
  const t = new THREE.CanvasTexture(Pn.c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// orman arka planı: uzak gövdeler ve taç lekeleri, açık mavi-yeşil puslu tonlarla (sis rengine erir)
function forestFarTex() {
  const Pn = pano(4096, 1600, 360, -20, 45), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.h); sky.addColorStop(0, D('#bfe0e6')); sky.addColorStop(.6, D('#d6ead8')); sky.addColorStop(1, D('#a8c8a8'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.h);
  const R = rng(61);
  for (const [n, col, a] of [[90, '#a6c8b4', .9], [70, '#8ab49a', .9]]) for (let i = 0; i < n; i++) {
    const x = R() * Pn.w, w = 10 + R() * 16; g.fillStyle = D(col, a); g.fillRect(x, Pn.Y(30), w, Pn.h);
    g.beginPath(); g.ellipse(x + w / 2, Pn.Y(24 + R() * 14), 60 + R() * 60, 70 + R() * 50, 0, 0, 6.29); g.fill();
  }
  const t = new THREE.CanvasTexture(Pn.c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function shadows(g) {
  g.traverse(o => {
    if (!o.isMesh) return;
    if (o.material.isMeshLambertMaterial) o.receiveShadow = true;
    if (/Box|Cylinder|Sphere|Lathe|Torus|Cone/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
function sun(color, intensity, dir, target, { size = 2048, ext = 9, far = 60 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity); l.position.copy(V(...target).addScaledVector(V(...dir).normalize(), -30)); l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(size, size); Object.assign(l.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far });
  l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3; return l;
}

// ---------------------------------------------------------------- ORMAN (x = 0)
function tree(g, x, z, { h = 10, r = .32, lean = 0, canopy = true, seed = 1, bark, leaf } = {}) {
  const R = rng(seed);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r * .78, r * 1.08, h, 14), bark); t.position.set(x, h / 2, z); t.rotation.z = lean; g.add(t);
  for (const s of [-1, 1]) { const root = new THREE.Mesh(new THREE.ConeGeometry(r * .55, .6, 8), bark); root.position.set(x + s * r * .9, .22, z + (R() - .5) * .3); root.rotation.z = -s * .9; g.add(root); }
  if (canopy) for (let k = 0; k < 4; k++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.4 + R() * 1.2, 20, 14), leaf); c.position.set(x + (R() - .5) * 2.4, h - .6 + R() * 1.6, z + (R() - .5) * 2.4); c.scale.y = .8; c.userData.noShadow = false; g.add(c);
  }
  return t;
}
function bush(g, x, z, s, mat, seed) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); g.add(grp); const R = rng(seed);
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(s * (.42 + R() * .25), 18, 12), mat); b.position.set((R() - .5) * s * 1.3, s * (.3 + R() * .35), (R() - .5) * s * .7); grp.add(b); }
  return grp;
}
function mushroom(g, x, z, s = 1) {
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.03 * s, .04 * s, .12 * s, 10), flat('#f2ead8')); st.position.set(x, .06 * s, z); g.add(st);
  const [c, cg] = cnv(256, 128); cg.fillStyle = '#d8402e'; cg.fillRect(0, 0, 256, 128); cg.fillStyle = '#fbf1dc'; const R = rng(Math.round(x * 100 + z * 7));
  for (let i = 0; i < 14; i++) { cg.beginPath(); cg.arc(R() * 256, R() * 70, 6 + R() * 6, 0, 6.29); cg.fill(); }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.09 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), painted(tx(c))); cap.position.set(x, .11 * s, z); cap.scale.y = .75; g.add(cap);
}
function buildForest(scene) {
  const g = new THREE.Group(); scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), painted(groundTex([18, 18]))); ground.rotation.x = -Math.PI / 2; g.add(ground);
  // patika: kameraya doğru kıvrılan toprak yol
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 16, 1, 16), painted(pathTex([1, 8])));
  const pp = path.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); pp.setX(i, pp.getX(i) + Math.sin(y * .25) * .8); } pp.needsUpdate = true;
  path.rotation.x = -Math.PI / 2; path.position.set(-.4, .006, 2); g.add(path);
  const bark = painted(barkTex('#a88270')), bark2 = painted(barkTex('#98889e'));
  const leafA = painted(leafTex('#5aa04e')), leafB = painted(leafTex('#6ab04a')), leafC = painted(leafTex('#86a03e'));
  // ön ve orta plan ağaçları (karakterlerin çevresi açık kalır)
  dyn.hideTree = tree(g, 3.3, -1.2, { h: 11, r: .42, seed: 2, bark, leaf: leafA });
  const R = rng(71);
  const spots = [[-3.6, 1.2], [-4.2, -3.8], [-2.4, -6.5], [1.2, -5.8], [4.8, -5.2], [6.4, 1.6], [-6.5, 4.6], [5.6, 6.2], [7.6, -2.2], [-7.4, -1.2], [2.4, 11.5], [-5.2, 12.5], [9.5, 4.5], [-9.5, 8.2], [0.6, -9.5], [-4.8, -10.5], [6.2, -10.2]];
  spots.forEach(([x, z], i) => tree(g, x, z, { h: 9 + R() * 4, r: .26 + R() * .2, seed: 10 + i, bark: i % 3 ? bark : bark2, leaf: [leafA, leafB, leafC][i % 3], lean: (R() - .5) * .06 }));
  for (let i = 0; i < 46; i++) { const a = R() * 6.28, d = 13 + R() * 16; tree(g, Math.cos(a) * d, Math.sin(a) * d - 2, { h: 11 + R() * 5, r: .3 + R() * .2, seed: 40 + i, bark: bark2, leaf: [leafA, leafB, leafC][i % 3] }); }
  // hışırdayan çalı (aslan arkasında saklanır) ve diğer çalılar
  const bushM = painted(leafTex('#5aae52')), bushM2 = painted(leafTex('#6e9e46'));
  dyn.bush = bush(g, 1.6, -.6, .78, bushM, 5);
  for (const [x, z, s, m] of [[-2.6, -.4, .8, 1], [4.6, -2.4, .9, 0], [-3.3, -2.9, .7, 1], [2.6, 2.6, .55, 0], [-1.2, 5.6, .6, 1], [5.2, 3.4, .7, 1], [-.2, -4.6, .9, 0]]) bush(g, x, z, s, m ? bushM2 : bushM, Math.round(x * 13 + z));
  for (const [x, z, s] of [[.9, .5, 1], [1.05, .62, .7], [-2.0, 1.9, 1.2], [3.9, -.4, .9], [-2.6, -2.1, 1.1], [-.4, -2.6, .8], [2.1, 3.8, 1]]) mushroom(g, x, z, s);
  // çiçekler: küçük sarı ve beyaz noktalar
  for (let i = 0; i < 90; i++) { const x = (R() - .5) * 14, z = (R() - .5) * 14; if (Math.abs(x + .4 - Math.sin((z - 2) * .25) * .8) < .9) continue;
    const f = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), flat(['#f6d64a', '#f4efe2', '#e88aa8'][i % 3])); f.position.set(x, .05, z); f.userData.noShadow = true; g.add(f); }
  // kütük (ikisi arkasında oturur)
  const logM = painted(barkTex('#8a6248'));
  const log = new THREE.Mesh(new THREE.CylinderGeometry(.26, .28, 2.6, 18), logM); log.rotation.z = Math.PI / 2; log.position.set(-1.5, .27, -2.55); g.add(log);
  const ringM = flat('#e2c08a'); for (const s of [-1, 1]) { const rr = new THREE.Mesh(new THREE.CircleGeometry(.25, 18), ringM); rr.position.set(-1.5 + s * 1.302, .27, -2.55); rr.rotation.y = s * Math.PI / 2; g.add(rr); }
  // uzak orman: sisin içinde boyalı panorama (bakış yönüne göre kayar)
  const far = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 40, 48, 1, true), vistaMat(forestFarTex(), { yaw: 0, az: Math.PI * 2, el: [-20 * Math.PI / 180, 45 * Math.PI / 180], gain: 1 }));
  far.material.side = THREE.BackSide; far.position.set(0, 12, 0); g.add(far);
  // ışık: alçak sabah güneşi (arka soldan, sıcak, gölgeli) + soğuk gök dolgusu
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#b4d2f4', '#6a8a5a', 2.3));
  const SUN = [.62, -.5, -.6]; dyn.fSun = V(...SUN).normalize();
  const s = sun('#ffd08a', 3.6, SUN, [0, 0, 0], { ext: 11 }); L.add(s); L.add(s.target);
  scene.add(L); sets.forest = { g, L }; shadows(g);
  // ağaçların arasından süzülen huzmeler (güneş yönüne paralel)
  fx.fBeams = [[-5.5, 7, 3.5], [-6.5, 7.5, 0], [-4.5, 7.2, -3.5], [-7, 6.5, 6]].map(p => beam(scene, p, V(...p).addScaledVector(dyn.fSun, 10).toArray(), { r0: .45, r1: 1.3, color: '#ffe2a8', strength: .14 }));
}

// ---------------------------------------------------------------- İSKELE (x = 200)
function buildPier(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), painted(seaTex('#2f6fb0', [30, 30]))); sea.rotation.x = -Math.PI / 2; sea.position.y = -.6; g.add(sea);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, .3, 6), painted(woodTex({ base: '#a87a4a', plank: 48, rep: [3, 1] }))); deck.position.set(0, -.15, 1); g.add(deck);
  for (let x = -6.5; x <= 6.5; x += 2.6) for (const z of [-1.9, 3.9]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.4, 10), flat('#6a4a36')); p.position.set(x, -.6, z); g.add(p); }
  for (const x of [-4.5, -1.5, 1.5, 4.5]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, .4, 12), flat('#3a3a4a')); b.position.set(x, .2, -1.7); g.add(b); }
  // korkuluk
  for (let x = -6.8; x <= 6.8; x += .7) { const p = new THREE.Mesh(new THREE.BoxGeometry(.06, .9, .06), flat('#e8e2d4')); p.position.set(x, .45, 3.85); g.add(p); }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(14, .08, .08), flat('#e8e2d4')); rail.position.set(0, .9, 3.85); g.add(rail);
  // vapur: genel bir yolcu vapuru (marka, ad, logo yok)
  const fer = new THREE.Group(); fer.position.set(.6, 0, -3.6); g.add(fer);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(13, 1.4, 3.2), flat('#f2eee4')); hull.position.y = -.2; fer.add(hull);
  const band = new THREE.Mesh(new THREE.BoxGeometry(13.05, .32, 3.25), flat('#2a4a8a')); band.position.y = -.75; fer.add(band);
  const [wc, wg] = cnv(1024, 128); wg.fillStyle = '#f2eee4'; wg.fillRect(0, 0, 1024, 128);
  for (let i = 0; i < 16; i++) { wg.fillStyle = '#3a5a8a'; wg.strokeStyle = '#2a2a3a'; wg.lineWidth = 5; wg.beginPath(); wg.roundRect(20 + i * 63, 34, 44, 60, 10); wg.fill(); wg.stroke(); }
  const cab = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.3, 2.7), [flat('#f2eee4'), flat('#f2eee4'), flat('#e2ddd0'), flat('#e2ddd0'), painted(tx(wc)), painted(tx(wc))]); cab.position.set(-.4, 1.15, 0); fer.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(10.2, .14, 3.1), flat('#d8d2c4')); roof.position.set(-.4, 1.88, 0); fer.add(roof);
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(.42, .48, 1.6, 18), flat('#e8e2d4')); chim.position.set(.8, 2.7, 0); fer.add(chim);
  const chimTop = new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .38, 18), flat('#2a2a34')); chimTop.position.set(.8, 3.42, 0); fer.add(chimTop);
  // iskele köprüsü (rampa): vapurdan iskeleye
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.4, .1, 2.2), painted(woodTex({ base: '#8a6a4a', plank: 32 }))); ramp.position.set(.5, .14, -1.2); ramp.rotation.x = .12; g.add(ramp);
  dyn.ferryChimney = V(200.8 + .6, 3.6, -3.6);
  // karşı kıyı panoraması (kameranın baktığı yön -z)
  const far = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 60, 48, 1, true), vistaMat(harbourTex(), { yaw: Math.PI, az: 110 * Math.PI / 180, el: [-12 * Math.PI / 180, 30 * Math.PI / 180], gain: 1.05 }));
  far.material.side = THREE.BackSide; far.position.set(0, 0, 0); g.add(far);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#b8d6ff', '#8a7a6a', 2.0));
  const s = sun('#ffe2b0', 3.0, [-.45, -.55, -.7], [200, 0, 0], { ext: 10 }); L.add(s); L.add(s.target);
  scene.add(L); sets.pier = { g, L }; shadows(g);
  // martılar: düz çizilmiş kartlar (V biçimi), havada süzülür
  const [mc, mg] = cnv(128, 64); mg.strokeStyle = '#f6f4ee'; mg.lineWidth = 12; mg.lineCap = 'round'; mg.lineJoin = 'round';
  mg.beginPath(); mg.moveTo(8, 26); mg.quadraticCurveTo(34, 6, 64, 34); mg.quadraticCurveTo(94, 6, 120, 26); mg.stroke(); mg.strokeStyle = PLUM; mg.lineWidth = 4; mg.stroke();
  const gm = new THREE.MeshBasicMaterial({ map: tx(mc), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  dyn.gulls = [0, 1, 2, 3, 4].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.55, .27), gm); m.layers.set(1); scene.add(m); return { m, i }; });
}

// ---------------------------------------------------------------- TEPE / gün batımı (x = 300)
function buildHill(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), painted(groundTex([4, 3]))); ground.rotation.x = -Math.PI / 2; ground.position.z = 2; g.add(ground);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.4, .6, 40, 1, false, Math.PI * .5, Math.PI), painted(groundTex([3, 1]))); edge.position.set(0, -.3, -2.8); edge.scale.z = .25; g.add(edge);
  const bark = painted(barkTex('#6a4a52')), leaf = painted(leafTex('#3a6a46'));
  tree(g, -3.1, -.6, { h: 7.5, r: .3, seed: 81, bark, leaf }); tree(g, 3.4, .4, { h: 8.5, r: .34, seed: 82, bark, leaf });
  bush(g, -2.2, .6, .6, leaf, 83); bush(g, 2.6, 1.4, .55, leaf, 84);
  for (const [x, z] of [[-1.4, 1.2], [1.6, .9], [-.6, 2.2]]) mushroom(g, x, z, .9);
  const far = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 80, 48, 1, true), vistaMat(sunsetTex(), { yaw: Math.PI, az: 100 * Math.PI / 180, el: [-14 * Math.PI / 180, 30 * Math.PI / 180], gain: 1.3 }));
  far.material.side = THREE.BackSide; far.position.set(0, 0, 0); g.add(far);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#9a8ae0', '#5a4a5a', 1.6));
  const SUN = [0, -.28, 1]; dyn.hSun = V(...SUN).normalize();
  const s = sun('#ffa860', 3.1, SUN, [300, 0, 0], { ext: 8 }); L.add(s); L.add(s.target);
  const fill = new THREE.DirectionalLight('#b8a8ff', .8); fill.position.set(303, 4, 8); fill.target.position.set(300, 1, 0); L.add(fill); L.add(fill.target);
  scene.add(L); sets.hill = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- kamera
function cameraPath() {
  const k = [
    // KANCA: 4 görüntü — sisli orman, hışırdayan çalı, aslan başı, ağacın arkasında titreyen aslan
    { t: 0, pos: [-1.9, 1.5, 10.5], look: [.2, 1.1, 2.4], fov: 52, creep: .28, drift: .06 },
    { t: P(1, .27), dur: .55, pos: [.55, .72, 1.9], look: [1.6, .55, -.6], fov: 44, creep: .32 },
    { t: P(1, .52), dur: .3, move: 'whip', pos: [1.0, 1.05, 1.7], look: [1.8, 1.25, -1.2], fov: 42, creep: .3 },
    { t: P(1, .78), dur: .3, move: 'whip', pos: [2.95, 1.05, 1.5], look: [3.85, 1.1, -1.6], fov: 44, creep: .28 },
    // "Bakın,": patikada yürüyen Pumpkin, takip
    { t: PS(2) + .18, dur: .32, move: 'whip', pos: [-1.6, .95, 7.6], look: [-.3, .75, 4.0], fov: 48, creep: .22 },
    { t: PE(2), dur: PE(2) - PS(2) - .2, pos: [-1.3, .9, 4.9], look: [.1, .72, 1.4], fov: 47, creep: .25 },
    // çalı kıpırdar: omuz üstü, gerilim (hızlı itme)
    { t: PS(3) + .7, dur: .8, pos: [-1.95, .9, 4.0], look: [.5, .75, -.1], fov: 47, creep: .34 },
    // "Bir aslan." aslan çalıdan çıkar (alçak açı + darbe) → ikili plan → yukarı ve geri: ormanın ortasında
    { t: PS(4) + .1, dur: .28, move: 'whip', pos: [.95, .95, 1.55], look: [1.75, 1.2, -1.15], fov: 44, creep: .3 },
    { t: P(4, .42), dur: .55, pos: [.3, 1.0, 3.5], look: [.8, .9, -.4], fov: 50, creep: .26 },
    { t: P(4, .95), dur: 1.0, pos: [.1, 3.6, 8.4], look: [.9, 1.0, -.6], fov: 56, creep: .22 },
    // "Lütfen bağırma…": ağacın arkasında titreyen Limon, solda Pumpkin
    { t: PS(5) + .15, dur: .55, pos: [3.0, 1.05, 1.6], look: [4.0, 1.12, -1.6], fov: 47, creep: .3 },
    // "Adı Limon'muş." yakın → whip pan: iskele (geçmiş) → koşuyor → whip pan: orman, kütük
    { t: PS(6) + .12, dur: .5, pos: [3.85, 1.15, .75], look: [4.1, 1.2, -1.8], fov: 42, creep: .3 },
    { t: P(6, .2) + .15, dur: .32, move: 'whip', pos: [198.6, 1.35, 3.8], look: [200.5, 1.25, -1.0], fov: 50, creep: .25 },
    { t: P(6, .5), dur: .45, pos: [199.85, 1.25, 1.75], look: [200.45, 1.2, -.5], fov: 44, creep: .3 },
    { t: P(6, .7), dur: .45, pos: [199.6, 1.2, 2.4], look: [199.3, 1.05, -.5], fov: 50, creep: .1, drift: -.35 },
    { t: P(6, .9) + .15, dur: .32, move: 'whip', pos: [-1.45, 1.1, 1.3], look: [-1.45, .8, -2.2], fov: 50, creep: .24 },
    // kütük: simit
    { t: PS(7) + .3, dur: .7, pos: [-1.43, 1.05, 1.0], look: [-1.43, .8, -2.2], fov: 48, creep: .28 },
    { t: PS(8) + .25, dur: .55, pos: [-1.15, 1.05, -.2], look: [-1.05, 1.0, -2.25], fov: 44, creep: .3 },
    { t: PS(9) + .1, dur: .5, pos: [-1.85, .85, -.55], look: [-1.75, .75, -2.15], fov: 44, creep: .3 },
    { t: PE(9) + .45, dur: .45, pos: [-1.43, 1.05, .9], look: [-1.43, .8, -2.2], fov: 48, creep: .25 },
    // gün batımı: önden, arkalarında Boğaz; yavaşça geri ve yukarı
    { t: PS(10) - .05, dur: .32, move: 'whip', pos: [300.05, .72, 3.0], look: [300.0, 1.05, -2], fov: 48, creep: .2 },
    { t: DUR, dur: DUR - PS(10) - .1, pos: [300.0, 1.25, 4.5], look: [300.0, 1.25, -6], fov: 52, creep: .15 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(PS(4) + .03, 1.0);
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) { const p = PT[w.part] ||= { s: w.start, e: w.end }; p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end); }
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + 1.6) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#bcdbe2');
  buildForest(scene); buildPier(scene); buildHill(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);
  // toz zerreleri: güneş huzmelerinde
  fx.motes = new Smoke(scene, { color: '#fff0d0', maxPoints: 600, H: ctx.H, additive: true, near: 2.2 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const motes = (n, c, sz, on) => fx.motes.wisps.push({ n, size: .009, alpha: .55, speed: .04, on,
    path: (u, t, i) => [c[0] + (hash(i, 1) - .5) * sz[0] + Math.sin(t * .5 + i) * .06, c[1] + (hash(i, 2) - .5) * sz[1] + (u - .5) * .4, c[2] + (hash(i, 3) - .5) * sz[2] + Math.cos(t * .4 + i * 2) * .06] });
  motes(220, [0, 2, 0], [10, 4, 10], t => where(t) === 'forest');
  motes(90, [300, 1.4, 0], [6, 3, 4], t => where(t) === 'hill');
  // vapur bacasından ince duman
  fx.smoke = new Smoke(scene, { color: '#e8e4ec', maxPoints: 300, H: ctx.H });
  fx.smoke.wisps.push({ n: 70, size: .5, alpha: .28, speed: .12, on: t => where(t) === 'pier',
    path: (u, t) => { const a = dyn.ferryChimney; return [a.x - u * 2.2 + Math.sin(u * 6 + t) * .2, a.y + u * 3, a.z + Math.cos(u * 4 + t) * .2]; } });
  dyn.cam = cameraPath();
  // ses ipuçları (mix.py): ilk üç whoosh bölümleri belirler (iskele, orman dönüşü, tepe)
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(P(6, .2) - .05, 'whoosh'); cue(P(6, .9) - .05, 'whoosh'); cue(PS(10) - .3, 'whoosh');
  cue(P(1, .52) - .15, 'rise', { dur: .3 }); cue(P(1, .78) - .15, 'rise', { dur: .3 }); cue(PS(2) - .1, 'rise', { dur: .35 }); cue(PS(4) - .1, 'rise', { dur: .3 });
  cue(0, 'birds', { dur: P(6, .2) }); cue(P(6, .9), 'birds', { dur: PS(10) - P(6, .9) });
  cue(P(1, .27), 'rustle', { dur: .7 }); cue(PS(3), 'rustle', { dur: PE(3) - PS(3) }); cue(PS(4) - .08, 'rustle', { dur: .5 });
  cue(PS(4) + .03, 'boom');
  cue(PS(5), 'tremble', { dur: PE(5) - PS(5) });
  cue(P(6, .2) + .1, 'horn'); cue(P(6, .2), 'gulls', { dur: P(6, .9) - P(6, .2) }); cue(P(6, .2), 'crowd', { dur: P(6, .9) - P(6, .2) });
  cue(P(6, .62), 'steps', { dur: P(6, .9) - P(6, .62) }); cue(P(6, .9) + .2, 'steps', { dur: .6 });
  cue(P(7, .38), 'snap'); cue(PE(9) + .12, 'laugh', { dur: .9 }); cue(PE(10) - .2, 'shimmer');
  cue(PS(10), 'evening', { dur: DUR - PS(10) });
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return t < P(6, .2) || (t >= P(6, .9) && t < PS(10) - .2) ? 'forest' : t < P(6, .9) ? 'pier' : 'hill'; }
// kamera hangi setteyse o set (whip pan geçişinde kamera önce eski sette döner, sonra yenide)
function camSet(cam) { return cam.position.x > 250 ? 'hill' : cam.position.x > 100 ? 'pier' : 'forest'; }
const WARM = '#ffc67a', COOL = '#dfe6f4';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['forest', 'pier', 'hill']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tint = here === 'forest' ? [1, 1, .99] : here === 'pier' ? [1, 1, 1] : [1, .98, .97];
  for (const b of fx.fBeams) b.visible = here === 'forest';
  for (const gl of dyn.gulls) gl.m.visible = here === 'pier';
  const pk = cast.pumpkin, ln = cast.limon;

  if (here === 'forest') {
    if (t < PS(5) - .1) {
      // ---- Pumpkin patikada (kanca ve "Bakın" boyunca yürür, çalı hışırdayınca durur)
      const walkEnd = PS(3) + .1, u = Math.min(1, Math.max(0, t / walkEnd));
      const z = 5.4 - u * 3.8, x = -.4 + Math.sin((z - 2) * .25) * .8 * .6, walking = t < walkEnd;
      pk.show(); pk.place(x, 0, z, cam, tint);
      const scared = t >= PS(3) + .1, wow = t >= PS(4) - .07;
      pk.draw({ expr: wow ? 'surprised' : scared ? 'worried' : 'smile', look: scared ? .75 : .2, lookY: wow ? -.5 : scared ? 0 : -.6,
        gazeY: wow ? -1 : 0, blink: bl(1, PS(3) + .1, PS(4) - .07), sweat: wow ? 1 : 0, bob: walking ? -Math.abs(Math.sin(t * 9)) * 10 : 0, lean: walking ? Math.sin(t * 9) * 1.5 : 0,
        armL: walking ? [14 + Math.sin(t * 9) * 12, 8] : [24, 30], armR: walking ? [14 - Math.sin(t * 9) * 12, 8] : wow ? [120, 40] : [24, 30], lit: -1, shade: COOL, rim: { color: WARM, a: .35 } });
      pk.castFrom(dyn.fSun, true);
    } else if (t < P(6, .2)) {
      pk.show(); pk.place(1.95, 0, -.15, cam, tint);
      pk.draw({ expr: t < PS(6) ? 'worried' : 'smile', look: .8, blink: bl(1, PS(6)), armL: [20, 20], armR: [40, 50], lit: -1, shade: COOL, rim: { color: WARM, a: .35 } });
      pk.castFrom(dyn.fSun, true);
    }
    // ---- Limon: kancada çalıdan çıkar (C), ağacın arkasında titrer (D); sonra gerçek zamanda aynısı
    const hookC = t >= P(1, .45) && t < P(1, .66), hookD = t >= P(1, .66) && t < PS(2);
    const popUp = t >= PS(4) - .07 && t < PS(5) - .1, behindTree = hookD || (t >= PS(5) - .1 && t < P(6, .2));
    if (hookC || popUp) {
      const t0 = hookC ? P(1, .45) : PS(4) - .07, y = -.9 + .9 * Math.min(1, (t - t0) / .22);
      ln.show(); ln.place(1.75, y, -1.15, cam, tint);
      ln.draw({ expr: 'surprised', look: -.5, lookY: .2, blink: bl(2, t0), armL: [150, 20], armR: [150, 20], lit: -1, shade: COOL, rim: { color: WARM, a: .35 } });
      ln.castFrom(dyn.fSun, true);
    } else if (behindTree) {
      const shiver = Math.sin(t * 60) * .012;
      ln.show(); ln.place(4.05 + shiver, 0, -1.85, cam, tint);
      const shy = t >= PS(6);
      ln.draw({ expr: shy ? 'smile' : 'worried', look: -.85, lookY: shy ? .4 : 0, lid: shy ? .2 : 0, blink: bl(3, PS(6)), sweat: shy ? 0 : 1, mouth: talk(PS(5), PE(5)),
        armL: [110, 40], armR: [20, 20], lean: Math.sin(t * 40) * .6, lit: -1, shade: COOL, rim: { color: WARM, a: .35 } });
      ln.castFrom(dyn.fSun, true);
    }
    // çalı hışırtısı
    const rus = (t >= P(1, .27) && t < P(1, .52)) || (t >= PS(3) && t < PS(4) + .2);
    dyn.bush.rotation.z = rus ? Math.sin(t * 38) * .05 : 0; dyn.bush.scale.y = rus ? 1 + Math.sin(t * 29) * .04 : 1;
    // ---- kütük sahnesi (Limon koşarak gelir, sonra yan yana)
    if (t >= P(6, .9)) {
      const arrive = Math.min(1, (t - P(6, .9)) / .5), panting = t < PS(7);
      const breakT = P(7, .38), giveT = P(7, .62), laugh = t >= PE(9) + .1;
      pk.show(); pk.place(-1.75, 0, -2.15, cam, tint);
      pk.draw({ expr: laugh ? 'laugh' : t >= PS(9) ? (t > P(9, .45) ? 'grin' : 'smile') : t >= PS(8) ? 'smile' : panting ? 'surprised' : 'proud', look: .55, lookY: .1,
        mouth: Math.max(talk(PS(9), PE(9)), laugh ? .7 : 0), laughMarks: laugh ? .9 : 0, blink: bl(4, PS(7), PS(9), PE(9) + .1),
        propR: t < breakT ? 'simit' : t < giveT ? 'simitYarim' : null, propL: t >= breakT ? 'simitYarim' : null,
        armR: t < breakT ? [70, 40] : t < giveT ? [100, 10] : [24, 24], armL: t >= breakT ? [60, 40] : [20, 20],
        bob: laugh ? -Math.abs(Math.sin(t * 13)) * 10 : 0, lit: -1, shade: COOL, rim: { color: WARM, a: .4 } });
      pk.castFrom(dyn.fSun, true);
      ln.show(); ln.place(-1.12 + (1 - arrive) * 2.2, 0, -2.25, cam, tint);
      ln.draw({ expr: laugh ? 'laugh' : t >= PS(8) ? 'smile' : t >= giveT ? 'grin' : panting ? 'worried' : 'smile', look: -.6, lookY: .15, brow: t >= PS(8) && t < PE(8) ? 1 : 0,
        mouth: Math.max(talk(PS(8), PE(8)), laugh ? .7 : 0), laughMarks: laugh ? .9 : 0, sweat: panting ? 1 : 0, blink: bl(5, giveT, PS(8), PE(9) + .1),
        propL: t >= giveT ? 'simitYarim' : null, armL: t >= giveT ? [70, 40] : [20, 20], armR: [20, 20],
        bob: panting ? -Math.abs(Math.sin(t * 16)) * 14 : laugh ? -Math.abs(Math.sin(t * 13 + 1)) * 10 : 0, wag: Math.sin(t * 5), lit: -1, shade: COOL, rim: { color: WARM, a: .4 } });
      ln.castFrom(dyn.fSun, true);
    }
  } else if (here === 'pier') {
    // ---- geçmiş: Limon vapurdan iner; korna, kalabalık, martılar; korkup koşar
    const runT = P(6, .62), run = Math.max(0, t - runT);
    const x = run > 0 ? 200.45 - run * 2.2 : 200.45, scared = t >= P(6, .42);
    ln.show(); ln.place(x, 0, -.5, cam, tint);
    ln.draw({ expr: scared ? 'surprised' : 'neutral', look: run > 0 ? -1 : -.2, lookY: scared ? -.2 : 0, sweat: scared ? 1 : 0, blink: bl(6, P(6, .42)),
      armL: run > 0 ? [60 + Math.sin(t * 20) * 40, 30] : [16, 12], armR: run > 0 ? [60 - Math.sin(t * 20) * 40, 30] : [16, 12],
      bob: run > 0 ? -Math.abs(Math.sin(t * 20)) * 18 : 0, lean: run > 0 ? -8 : 0, flip: false, lit: 1, shade: COOL, rim: { color: '#ffe2b0', a: .35 } });
    ln.castFrom(V(-.45, -.55, -.7), true);
    const crowd = [['yolcu1', 201.0, 1.0, -.5], ['yolcu2', 201.7, .4, -.6], ['simitci', 202.6, 1.4, -.8]];
    for (const [n, cx, cz, lk] of crowd) {
      const c = cast[n]; c.show(); c.place(cx, 0, cz, cam, tint);
      const jump = t >= P(6, .45);
      c.draw({ expr: jump ? 'surprised' : n === 'simitci' ? 'smile' : 'neutral', look: jump ? (cx < 200.4 ? .9 : -.9) : lk, sweat: jump ? 1 : 0, blink: bl(7 + cx, P(6, .45)),
        armL: [16, 10], armR: n === 'simitci' ? [80, 60] : jump ? [130, 30] : [16, 10], propR: n === 'simitci' ? 'simit' : null, lit: 1, shade: COOL, rim: { color: '#ffe2b0', a: .3 } });
      c.castFrom(V(-.45, -.55, -.7), true);
    }
    for (const { m, i } of dyn.gulls) { const a = t * .6 + i * 1.3; m.position.set(199 + Math.sin(a) * 3 + i, 3.2 + i * .4 + Math.sin(t * 2 + i) * .2, -2.5 - i * .9); m.lookAt(cam.position); m.scale.y = .7 + .3 * Math.abs(Math.sin(t * 6 + i)); }
  } else {
    // ---- gün batımı: yan yana, Boğaz'a karşı; güneş arkada (sıcak kenar ışığı)
    const end = t > PE(10) - .1;
    pk.show(); pk.place(299.62, 0, -.05, cam, tint);
    pk.draw({ expr: end ? 'proud' : 'smile', look: .45, lookY: -.2, blink: bl(8, PE(10) - .1), armR: [40, 30], armL: [16, 10], lit: 1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .5 } });
    ln.show(); ln.place(300.42, 0, -.1, cam, tint);
    ln.draw({ expr: end ? 'smile' : 'proud', look: -.45, lookY: -.2, blink: bl(9, PE(10) - .1), armL: [40, 30], armR: [16, 10], wag: Math.sin(t * 3), lit: -1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .5 } });
    pk.castFrom(dyn.hSun, true); ln.castFrom(dyn.hSun, true);
  }
  for (const s of [fx.motes, fx.smoke]) s.update(t);
  for (const b of fx.fBeams) b.material.uniforms.uT.value = t;
  // ---- lens ve renk düzeltme
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'forest') {
    const subj = t < P(1, .27) ? V(-.2, .8, 4.6) : t < P(1, .52) ? V(1.6, .6, -.6) : t < P(1, .78) ? V(1.75, 1.1, -1.15) : t < PS(2) ? V(4.05, 1.1, -1.85)
      : t < PS(4) ? V(-.1, .7, 2.2) : t < P(4, .8) ? V(1.75, 1.1, -1.15) : t < PS(5) ? V(.8, .8, -.5) : t < P(6, .9) ? V(4.05, 1.1, -1.85) : V(-1.5, .7, -2.2);
    const wide = t >= P(4, .8) && t < PS(5);
    look = { ...focusOn(subj, wide ? 2 : 6, wide ? 8 : 3), sat: 1.22, lift: [.09, .1, .12], bloom: .8, vignette: .2 };
    C.scene.fog = new THREE.FogExp2('#c4dde0', .035);
  } else if (here === 'pier') { look = { ...focusOn(V(200.45, 1.1, -.5), 5, 4), sat: 1.3, lift: [.09, .095, .13], bloom: .7, vignette: .16 }; C.scene.fog = null; }
  else { look = { ...focusOn(V(300, 1, 0), 4, 5), sat: 1.18, lift: [.11, .09, .16], bloom: .95, vignette: .22 }; C.scene.fog = null; }
  look.tint = here === 'forest' ? [.99, 1.0, 1.0] : here === 'pier' ? [1.0, 1.0, 1.0] : [1.04, .98, .96];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
