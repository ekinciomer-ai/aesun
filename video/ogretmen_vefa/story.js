// Öğretmenler Günü: Vefa — yumurta kafa stili. Tek set: sınıf. Zamanlar ses PARÇASINA bağlı (P01..P10).
// Işık: sağdaki iki pencereden alçak, sıcak sabah güneşi (görüntüde, gölgeli, huzmeli) — lavanta gök dolgusu.
// Sert kesme 1 tane: "Tıpkı" kelimesinde, el öpme → yıllar önce karne günü aynı el öpme (eşleşen kadraj, beyaz flaş).
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'ogretmen-vefa';
export const FPS = 30;
export let DUR = 34;
export const CUES = [];
const UNI = '#2e3f72';
export const LOOK = {
  ogretmen:  { longHair: '#c4762e', hairLen: 250, cloth: '#f3f0ea', buttons: '#c8c0d0', pocket: true, collar: true, blush: '#f2a0a0', height: 1.62 },
  ogretmen2: { longHair: '#d6ccc2', hairLen: 250, cloth: '#f3f0ea', buttons: '#c8c0d0', pocket: true, collar: true, blush: '#f2a0a0', height: 1.6 },
  c_hem: { longHair: '#3a2620', hairLen: 170, cloth: UNI, skirt: UNI, boots: '#2a2228', blush: '#f2a0a0', drop: 120, height: 1.0 },
  c_muh: { shortHair: '#8a5a32', cloth: UNI, collar: true, drop: 120, height: 1.0, blush: '#f2a0a0' },
  c_mez: { longHair: '#7a4a2a', hairLen: 200, cloth: UNI, skirt: UNI, boots: '#2a2228', blush: '#f2a0a0', drop: 120, height: 1.0 },
  c_sub: { shortHair: '#c69a4a', cloth: UNI, collar: true, drop: 120, height: 1.0, blush: '#f2a0a0' },
  c_bab: { shortHair: '#2a1e1c', cloth: UNI, collar: true, drop: 120, height: 1.0, blush: '#f2a0a0' },
  hemsire: { longHair: '#3a2620', hairLen: 170, cloth: '#8fb6de', collar: false, pocket: true, height: 1.6 },
  muhendis:{ shortHair: '#8a5a32', hat: 'helmet', cloth: '#ee7a2a', trim: '#f2e04a', height: 1.74 },
  mezun:   { longHair: '#7a4a2a', hairLen: 200, hat: 'mortar', cloth: '#26262e', sash: '#c8323a', collar: false, height: 1.62 },
  subay:   { shortHair: '#c69a4a', hat: 'peak', cloth: '#5a6a3e', buttons: '#d8b04a', collar: true, height: 1.76 },
  baba:    { shortHair: '#2a1e1c', beard: '#2a1e1c', beardLen: .35, cloth: '#2e3a5e', buttons: '#1e2440', collar: true, height: 1.78 },
  kiz:     { longHair: '#2a1e1c', hairLen: 170, cloth: UNI, skirt: UNI, boots: '#2a2228', blush: '#f2a0a0', drop: 120, height: 1.0 },
};
const KIDS = ['c_hem', 'c_muh', 'c_mez', 'c_sub', 'c_bab'], ADULTS = ['hemsire', 'muhendis', 'mezun', 'subay', 'baba'];

const S = smoother, V = (...a) => new THREE.Vector3(...a);
let C, PT = {}, cast = {}, dyn = {}, fx = {};
const P = (k, f = 0) => { const p = PT['P' + String(k).padStart(2, '0')]; return p.s + (p.e - p.s) * f; };
const PS = k => P(k, 0), PE = k => P(k, 1);

// ---------------------------------------------------------------- dokular
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tx(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; }
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function dab(g, w, h, base, n, r, amt, seed, a0 = .2) { const R = rng(seed); for (let i = 0; i < n; i++) { g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .25; g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.3 + R() * .4), R() * 3.14, 0, 6.29); g.fill(); } g.globalAlpha = 1; }
function wallTex2(base, rep) { const [c, g] = cnv(512, 512); g.fillStyle = base; g.fillRect(0, 0, 512, 512); dab(g, 512, 512, base, 260, 26, .12, 3); return tx(c, rep); }
// tahta: yeşil, tebeşir yazısı + silinmiş tebeşir izleri
function boardTex(lines) {
  const [c, g] = cnv(1400, 640); g.fillStyle = '#4f8a68'; g.fillRect(0, 0, 1400, 640); dab(g, 1400, 640, '#4f8a68', 160, 60, .15, 7, .25);
  g.globalAlpha = .12; g.fillStyle = '#ffffff'; const R = rng(8); for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(R() * 1400, R() * 640, 120 + R() * 120, 18 + R() * 20, R() - .5, 0, 6.29); g.fill(); }
  g.globalAlpha = .92; g.fillStyle = '#f4f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([txt, size, y]) => { g.font = `italic 700 ${size}px "Comic Sans MS", "DejaVu Sans", sans-serif`; g.fillText(txt, 700, y); });
  g.globalAlpha = 1; return tx(c);
}
function drawingTex(seed) {
  const [c, g] = cnv(256, 320); g.fillStyle = '#fbf7ec'; g.fillRect(0, 0, 256, 320); const R = rng(seed);
  g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = '#f6c43a'; g.beginPath(); g.arc(210, 50, 26, 0, 6.29); g.fill();                         // güneş
  g.strokeStyle = '#f6c43a'; for (let a = 0; a < 6.28; a += .8) { g.beginPath(); g.moveTo(210 + Math.cos(a) * 34, 50 + Math.sin(a) * 34); g.lineTo(210 + Math.cos(a) * 46, 50 + Math.sin(a) * 46); g.stroke(); }
  g.fillStyle = '#6ab04a'; g.fillRect(0, 262, 256, 58);
  const n = 2 + Math.floor(R() * 2);
  for (let k = 0; k < n; k++) { const x = 50 + k * 70, col = ['#d8402e', '#3a6ad8', '#9a4ac8'][k % 3]; g.strokeStyle = col;
    g.beginPath(); g.arc(x, 150, 18, 0, 6.29); g.stroke(); g.beginPath(); g.moveTo(x, 168); g.lineTo(x, 225); g.moveTo(x - 24, 190); g.lineTo(x + 24, 190); g.moveTo(x, 225); g.lineTo(x - 16, 258); g.moveTo(x, 225); g.lineTo(x + 16, 258); g.stroke(); }
  if (R() > .5) { g.strokeStyle = '#c8402e'; g.beginPath(); g.moveTo(150, 260); g.lineTo(150, 200); g.lineTo(190, 168); g.lineTo(230, 200); g.lineTo(230, 260); g.stroke(); }
  return tx(c);
}
function outsideTex() {   // pencere dışı: sonbahar ağaçları, açık gök
  const [c, g] = cnv(2048, 1024); const sky = g.createLinearGradient(0, 0, 0, 1024); sky.addColorStop(0, D('#9ac8f0')); sky.addColorStop(1, D('#f4e2c0'));
  g.fillStyle = sky; g.fillRect(0, 0, 2048, 1024); const R = rng(31);
  for (let i = 0; i < 40; i++) { const x = R() * 2048, y = 560 + R() * 200; g.fillStyle = D(['#e0902e', '#d8602e', '#e8b83a', '#a8b84a'][i % 4]); g.beginPath(); g.ellipse(x, y, 90 + R() * 80, 110 + R() * 60, 0, 0, 6.29); g.fill(); g.fillStyle = D('#6a4a3a'); g.fillRect(x - 8, y + 60, 16, 260); }
  g.fillStyle = D('#8ab86a'); g.fillRect(0, 860, 2048, 164);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- SINIF
function box(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; }
function desk(g, x, z, top, leg) {
  box(g, 1.1, .05, .55, top, x, .72, z);
  for (const sx of [-.5, .5]) for (const sz of [-.22, .22]) box(g, .04, .72, .04, leg, x + sx, .36, z + sz);
  box(g, .45, .04, .4, top, x - .25, .44, z + .55); box(g, .45, .5, .04, top, x - .25, .7, z + .76);       // sandalye
  for (const sx of [-.2, .2]) for (const sz of [.38, .72]) box(g, .03, .44, .03, leg, x - .25 + sx, .22, z + sz);
}
function buildRoom(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), painted(woodTex({ base: '#dcae78', plank: 64, rep: [3, 3] }))); floor.rotation.x = -Math.PI / 2; g.add(floor);
  const wall = painted(wallTex2('#fdf8ef', [3, 2])), wall2 = painted(wallTex2('#f9f2e8', [3, 2]));
  box(g, 10, 3.6, .1, wall, 0, 1.8, -4);                                   // arka duvar (tahta)
  box(g, .1, 3.6, 10, wall2, -4.2, 1.8, 0);                                // sol duvar (resimler, kapı)
  const ceil = box(g, 10, .1, 10, flat('#f4ece0'), 0, 3.6, 0); ceil.userData.noShadow = true;
  // sağ duvar: iki uzun pencere (duvar parçaları + çerçeve + dışarı)
  const R0 = 4.2, wz = [-2.4, .6], wwid = 1.5, wy0 = 1.0, wy1 = 3.1;
  const segs = [[-5, wz[0] - wwid / 2], [wz[0] + wwid / 2, wz[1] - wwid / 2], [wz[1] + wwid / 2, 5]];
  for (const [a, b] of segs) box(g, .1, 3.6, b - a, wall2, R0, 1.8, (a + b) / 2);
  for (const z of wz) { box(g, .1, wy0, wwid, wall2, R0, wy0 / 2, z); box(g, .1, 3.6 - wy1, wwid, wall2, R0, (wy1 + 3.6) / 2, z);
    const fr = flat('#8a5634');
    for (const zz of [-wwid / 2, 0, wwid / 2]) box(g, .14, wy1 - wy0, .07, fr, R0 - .02, (wy0 + wy1) / 2, z + zz);
    for (const yy of [wy0, (wy0 + wy1) / 2 + .2, wy1]) box(g, .14, .07, wwid, fr, R0 - .02, yy, z); }
  const out = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: outsideTex(), toneMapped: false })); out.position.set(R0 + 3, 2, -.9); out.rotation.y = -Math.PI / 2; g.add(out);
  // tahta: iki doku (önce / yıllar sonra)
  dyn.boardA = painted(boardTex([['Büyüyünce ne olacaksın?', 92, 250], ['Doktor   Mühendis   Asker', 64, 420]]));
  dyn.boardB = painted(boardTex([['Öğretmenim,', 96, 230], ['iyi ki varsınız!', 96, 380]]));
  const frame = box(g, 3.3, 1.6, .08, flat('#7a4a2e'), -.3, 1.85, -3.93);
  dyn.board = box(g, 3.1, 1.42, .04, dyn.boardA, -.3, 1.85, -3.88);
  box(g, 3.1, .05, .12, flat('#7a4a2e'), -.3, 1.12, -3.85);                 // tebeşirlik
  // sol duvar: çocuk resimleri, kapı
  [[-3.2, 2.1, 1], [-1.9, 2.3, 2], [-.6, 2.0, 3]].forEach(([z, y, s]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.55, .7), painted(drawingTex(s))); m.position.set(-4.14, y, z); m.rotation.y = Math.PI / 2; g.add(m); });
  [[2.2, 2.3, 4], [3.0, 2.2, 5]].forEach(([x, y, s]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.5, .64), painted(drawingTex(s))); m.position.set(x, y, -3.94); g.add(m); });
  box(g, .08, 2.2, 1.0, painted(woodTex({ base: '#8a5634', plank: 24 })), -4.14, 1.1, 1.6);   // kapı
  // dolap + küre
  box(g, .5, 1.0, 1.2, painted(woodTex({ base: '#9a6a40', plank: 24 })), -3.85, .5, -2.9);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 16), flat('#4a8ad8')); globe.position.set(-3.85, 1.32, -2.9); g.add(globe);
  const land = new THREE.Mesh(new THREE.SphereGeometry(.222, 12, 8, 0, 2.2, .6, 1.4), flat('#6ab04a')); land.position.copy(globe.position); g.add(land);
  // öğretmen masası: hediye paketi, çerçeveli eski fotoğraf
  const top = painted(woodTex({ base: '#c8925a', plank: 32 })), leg = flat('#3a3040');
  box(g, 1.6, .06, .75, top, 1.6, .76, -2.9); box(g, 1.6, .7, .04, top, 1.6, .4, -2.55);
  for (const sx of [-.75, .75]) box(g, .05, .76, .7, top, 1.6 + sx, .38, -2.9);
  dyn.gift = new THREE.Group(); g.add(dyn.gift); box(dyn.gift, .28, .2, .22, flat('#c89a5e'), 1.25, .89, -2.8); box(dyn.gift, .05, .21, .23, flat('#c8323a'), 1.25, .89, -2.8); box(dyn.gift, .29, .21, .05, flat('#c8323a'), 1.25, .89, -2.8);
  // öğrenci sıraları
  for (const [x, z] of [[-1.9, -.7]]) desk(g, x, z, top, leg);
  // ışık: pencerelerden güneş (sağdan, aşağı, hafif arkaya) + lavanta dolgu
  g.add(new THREE.HemisphereLight('#f2f0ff', '#c8b8a8', 3.1));
  const dir = V(-.78, -.42, -.22).normalize(); dyn.sunDir = dir;
  const s = new THREE.DirectionalLight('#ffe6c0', 2.7); s.position.copy(V(0, 1.4, -1).addScaledVector(dir, -14)); s.target.position.set(0, 1, -1);
  s.castShadow = true; s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 }); s.shadow.bias = -.0006; s.shadow.normalBias = .03; s.shadow.radius = 3;
  g.add(s); g.add(s.target);
  g.traverse(o => { if (!o.isMesh) return; if (o.material.isMeshLambertMaterial) o.receiveShadow = true; if (/Box|Sphere|Cylinder/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true; });
  ceil.castShadow = false;
  fx.beams = wz.map(z => beam(scene, [R0 - .1, 2.2, z], [R0 - .1 + dir.x * 4.4, 2.2 + dir.y * 4.4, z + dir.z * 4.4], { r0: .5, r1: 1.0, color: '#ffe2a8', strength: .16 }));
  // takvim yaprakları ("Ve yıllar geçti...")
  const [pc, pg] = cnv(256, 320); pg.fillStyle = '#fbf8f0'; pg.fillRect(0, 0, 256, 320); pg.fillStyle = '#c8323a'; pg.fillRect(0, 0, 256, 70);
  pg.fillStyle = '#2a2430'; pg.font = 'bold 150px sans-serif'; pg.textAlign = 'center'; pg.fillText('24', 128, 240);
  const pm = new THREE.MeshLambertMaterial({ map: tx(pc), side: THREE.DoubleSide });
  dyn.pages = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.26, .32), pm); m.userData.noShadow = true; scene.add(m); return m; });
  // karne (sert kesmedeki eski an) ve karanfil buketi
  return g;
}

// ---------------------------------------------------------------- kamera
function cameraPath() {
  const k = [
    // KANCA: geniş sınıf (çocuklar) → öğretmen yakın → parmak kaldıran çocuklar → whip: aynı sınıf, yetişkinler (ileri atlama)
    { t: 0, pos: [.9, 1.5, 5.4], look: [-.2, 1.0, -1.4], fov: 54, creep: .28, drift: .05 },
    { t: P(1, .36), dur: .5, pos: [.2, 1.35, -.4], look: [-.2, 1.25, -2.7], fov: 44, creep: .3 },
    { t: P(1, .6), dur: .3, move: 'whip', pos: [1.5, .95, 3.9], look: [-.4, .8, 1.3], fov: 48, creep: .3 },
    { t: P(1, .82), dur: .3, move: 'whip', pos: [.6, 1.4, 3.2], look: [-.1, 1.2, -2.4], fov: 54, creep: .25 },
    // "Bakın,": öğretmen tahtanın önünde soruyor
    { t: PS(2) + .15, dur: .3, move: 'whip', pos: [.4, 1.3, .9], look: [-.25, 1.2, -2.6], fov: 48, creep: .26 },
    // üç çocuk sırayla parmak kaldırır: sıraların üstünden kayan kamera
    { t: PS(3) + .2, dur: .6, pos: [.2, 1.0, 3.5], look: [-1.5, .75, 1.3], fov: 46, creep: .2 },
    { t: PE(3), dur: PE(3) - PS(3) - .3, pos: [.4, 1.0, 3.5], look: [.7, .75, 1.4], fov: 46, creep: .2 },
    // "Öğretmen güldü": öğretmen yakın
    { t: PS(4) + .2, dur: .5, pos: [.1, 1.3, -.6], look: [-.2, 1.22, -2.6], fov: 42, creep: .3 },
    // "Ve yıllar geçti...": takvim yaprakları, geniş plan, ortasında whip ile yetişkinlere geçiş
    { t: P(5, .3), dur: .8, pos: [1.2, 1.7, 4.6], look: [0, 1.3, -1.6], fov: 56, creep: .2 },
    { t: P(5, .75), dur: .32, move: 'whip', pos: [-.4, 1.6, 3.7], look: [.2, 1.3, -2.2], fov: 56, creep: .2 },
    // kapı çalar: yaşlı öğretmen masasında, kapıya döner; kapıda yetişkinler
    { t: PS(6) + .2, dur: .6, pos: [2.9, 1.3, .9], look: [1.3, 1.1, -2.7], fov: 46, creep: .25 },
    { t: P(6, .85), dur: .6, pos: [.6, 1.3, 2.6], look: [-3.0, 1.1, 1.2], fov: 48, creep: .25 },
    // hemşire / mühendis / subay: geniş grubu tarayan kamera
    { t: P(7, .05), dur: .5, pos: [.2, 1.3, 1.6], look: [-1.25, 1.2, -1.9], fov: 44, creep: .2 },
    { t: P(7, .36), dur: .5, pos: [.4, 1.32, 1.5], look: [-.55, 1.25, -2.05], fov: 44, creep: .2 },
    { t: P(7, .68), dur: .5, pos: [1.0, 1.35, 1.5], look: [.95, 1.3, -2.05], fov: 44, creep: .2 },
    // el öpme (iki kişilik yakın) — "Tıpkı"da sert kesme: aynı kadraj, karne günü
    { t: PS(8) + .3, dur: .6, pos: [1.0, 1.25, .9], look: [.5, 1.0, -2.05], fov: 46, creep: .3 },
    // küçük kız: alçak açı, öğretmen eğilir
    { t: PS(9) + .15, dur: .32, move: 'whip', pos: [1.3, .95, .6], look: [.65, .85, -1.8], fov: 46, creep: .3 },
    // kapanış: herkes; sonra eski fotoğraf (siyah-beyaz)
    { t: PS(10) + .2, dur: .7, pos: [.2, 1.4, 3.0], look: [0, 1.15, -2.0], fov: 54, creep: .18 },
    { t: DUR, dur: DUR - PS(10) - .9, pos: [.1, 1.4, 2.6], look: [0, 1.15, -2.0], fov: 52, creep: .12 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(PS(6) + .05, .35);
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) { const p = PT[w.part] ||= { s: w.start, e: w.end }; p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end); }
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + 1.8) * FPS) / FPS;
  ctx.scene.background = new THREE.Color('#fbf4ea');
  dyn.room = buildRoom(ctx.scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], ctx.scene);
  fx.motes = new Smoke(ctx.scene, { color: '#fff0d0', maxPoints: 400, H: ctx.H, additive: true, near: 1.6 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({ n: 260, size: .008, alpha: .55, speed: .03, path: (u, t, i) => [2.4 + (hash(i, 1) - .5) * 3.4 + Math.sin(t * .4 + i) * .05, .9 + hash(i, 2) * 2 + (u - .5) * .3, -1 + (hash(i, 3) - .5) * 4.5] });
  dyn.cam = cameraPath();
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  // bölümler (mix.py): 1. whoosh = yıllar geçti, 2. whoosh = karne anısı (kesme), 3. whoosh = kapanış
  cue(P(5, .75) - .2, 'whoosh'); cue(P(8, .27) - .05, 'whoosh', { quiet: 1 }); cue(PS(10) - .1, 'whoosh', { quiet: 1 });
  cue(P(1, .6) - .15, 'rise', { dur: .3 }); cue(P(1, .82) - .15, 'rise', { dur: .3 }); cue(PS(2) - .1, 'rise', { dur: .3 });
  cue(0, 'birds', { dur: DUR }); cue(PS(5), 'pages', { dur: PE(5) - PS(5) + .6 });
  cue(PS(6) + .05, 'knock'); cue(P(3, .05), 'chair'); cue(P(3, .38), 'chair'); cue(P(3, .7), 'chair');
  cue(PS(4), 'laughk', { dur: .9 }); cue(P(8, .27), 'flash'); cue(PE(9) + .1, 'shimmer'); cue(P(10, .5), 'camera');
}

// ---------------------------------------------------------------- KARE KARE
const KID_POS = { c_hem: [-1.7, 1.3], c_muh: [-.9, 1.45], c_mez: [-.1, 1.3], c_sub: [.7, 1.45], c_bab: [1.45, 1.3] };
const PHOTO_POS = { c_hem: [-1.3, -1.75], c_muh: [-.75, -1.65], c_mez: [.3, -1.7], c_sub: [.85, -1.65], c_bab: [1.35, -1.75] };
const AD_POS = { hemsire: [-1.25, -1.95], muhendis: [-.6, -2.1], mezun: [.0, -2.25], subay: [.95, -2.1], baba: [1.55, -1.85] };
export function frame(t, ctx) {
  const { cam } = ctx, st = dyn.cam.apply(cam, t), env = ctx.env;
  for (const c of Object.values(cast)) c.hide();
  const talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0, bl = (seed, ...sw) => blinkAt(t, seed, sw), tint = [1, 1, 1];
  const SUN = dyn.sunDir, base = { lit: 1, shade: '#d8d0f0', rim: { color: '#ffcf8a', a: .35 } };
  const show = (n, x, z, pose, y = 0) => { const c = cast[n]; c.show(); c.place(x, y, z, cam, tint); c.draw({ ...base, ...pose }); c.castFrom(SUN, true); };
  // zaman bölümleri
  const hookFwd = t >= P(1, .72) && t < PS(2) - .05;                        // kancadaki ileri atlama (yetişkinler)
  const past = t < P(5, .75) && !hookFwd;                                    // çocukluk
  const flashBack = t >= P(8, .27) && t < PS(9);                             // karne anısı (sert kesmeden sonra)
  const photo = t >= P(10, .5);                                              // son: siyah-beyaz eski sınıf fotoğrafı
  dyn.board.material = past || flashBack || photo ? dyn.boardA : dyn.boardB;
  dyn.gift.visible = !(past || flashBack || photo);
  if (past || photo) {
    // ---- çocukluk sınıfı: öğretmen tahtanın önünde, çocuklar sıraların yanında
    const asking = t >= P(2, .45) && t < PE(2) + .3, laughing = t >= PS(4) && t < P(4, .4);
    show('ogretmen', -.25, -2.6, { expr: laughing ? 'laugh' : 'smile', look: photo ? 0 : .3, lookY: .2,
      mouth: photo ? 0 : Math.max(talk(P(2, .45), PE(2)), talk(P(4, .45), PE(4)), laughing ? .7 : 0), laughMarks: laughing ? .9 : 0,
      armR: asking ? [120, 40] : [24, 26], armL: [24, 26], blink: bl(1, PS(2), PS(4)), bob: laughing ? -Math.abs(Math.sin(t * 13)) * 8 : 0 });
    KIDS.forEach((n, i) => {
      const [x, z] = photo ? PHOTO_POS[n] : KID_POS[n];
      const turnIdx = n === 'c_hem' ? 0 : n === 'c_muh' ? 1 : n === 'c_sub' ? 2 : -1;
      const handUp = !photo && ((turnIdx >= 0 && t >= P(3, turnIdx / 3) && t < PE(4)) || (t >= P(1, .58) && t < P(1, .72) && i < 4));
      const speaking = turnIdx >= 0 ? talk(P(3, turnIdx / 3), P(3, (turnIdx + .7) / 3)) : 0;
      show(n, x, z, { expr: photo ? 'smile' : t >= PS(4) ? 'grin' : handUp ? 'proud' : 'smile', look: photo ? 0 : x < 0 ? .5 : -.5, lookY: .3, mouth: speaking,
        armR: handUp ? [172, 10] : [18, 14], armL: [18, 14], blink: bl(10 + i, PS(3), PS(4)), bob: handUp ? -Math.abs(Math.sin(t * 8 + i)) * 6 : 0 });
    });
  } else if (flashBack) {
    // ---- karne günü: küçük çocuk (babanın çocukluğu) öğretmenin elini öper; eşleşen kadraj
    show('ogretmen', .1, -2.15, { expr: 'smile', look: .7, lookY: .3, armR: [92, 10], armL: [70, 40], propL: 'karne', blink: bl(3, P(8, .27)) });
    show('c_bab', .58, -1.9, { expr: 'proud', look: -.9, lookY: .4, lid: .5, lean: 14, armL: [92, 10], blink: bl(4, P(8, .27)) });
  } else {
    // ---- yıllar sonra: kır saçlı öğretmen; yetişkinler; küçük kız
    const knock = t >= PS(6) && t < P(6, .8), atDesk = t >= P(5, .75) && t < PS(7) && !hookFwd;
    const kiss = t >= PS(8) && t < P(8, .27), girl = t >= PS(9) && t < PS(10);
    const tX = atDesk ? 1.6 : .2, tZ = atDesk ? -3.2 : -2.15;
    show('ogretmen2', tX, tZ, { expr: girl && t > P(9, .6) ? 'surprised' : kiss ? 'smile' : knock ? 'surprised' : 'smile', look: atDesk ? -.9 : kiss ? .7 : girl ? .5 : 0, lookY: girl ? .6 : .1,
      armR: kiss ? [92, 10] : girl && t > P(9, .7) ? [60, 110] : [22, 24], armL: girl && t > P(9, .7) ? [40, 30] : [22, 24], blink: bl(5, PS(6), PS(8), P(9, .6)),
      lean: girl ? 6 : 0, sweat: 0, propR: atDesk ? 'pen' : null });
    if (!atDesk || hookFwd || t >= P(6, .7)) ADULTS.forEach((n, i) => {
      let [x, z] = AD_POS[n];
      if (t >= P(6, .7) && t < PS(7)) { x = -3.2 + i * .3; z = 1.0 + i * .28; }                   // kapıda
      if (n === 'baba' && kiss) { x = .78; z = -1.95; }
      if (n === 'baba' && girl) { x = 1.55; z = -1.95; }
      const kissing = n === 'baba' && kiss;
      show(n, x, z, { expr: kissing ? 'proud' : 'smile', look: x > .2 ? -.6 : .6, lookY: .2, lid: kissing ? .5 : 0, lean: kissing ? 14 : 0,
        armL: kissing ? [92, 10] : [20, 18], armR: n === 'hemsire' ? [70, 50] : n === 'muhendis' ? [60, 60] : [20, 18], propR: n === 'hemsire' ? 'karanfil' : null,
        blink: bl(20 + i, PS(7), PS(8)) });
    });
    if (girl || hookFwd || t >= PS(10)) {
      const gx = girl ? .95 : 1.95, gz = girl ? -1.55 : -1.45;
      show('kiz', gx, gz, { expr: girl && t > P(9, .55) ? 'grin' : 'smile', look: -.8, lookY: .5, mouth: girl ? talk(P(9, .55), PE(9)) : 0, armL: girl ? [60, 50] : [18, 14], blink: bl(30, P(9, .55)) });
    }
  }
  // takvim yaprakları
  const pa = PS(5) - .1, pb = PE(5) + .7;
  dyn.pages.forEach((m, i) => {
    const u = (t - pa) / (pb - pa); m.visible = u > 0 && u < 1;
    if (!m.visible) return;
    const ph = i * 1.7, r = 1.2 + (i % 4) * .35;
    m.position.set(Math.cos(u * 5 + ph) * r * .8, 3.4 - u * 3.2 + Math.sin(u * 9 + ph) * .2 - (i % 3) * .15, -1.2 + Math.sin(u * 4 + ph) * r * .6);
    m.rotation.set(u * 6 + ph, u * 4 + i, u * 3);
  });
  fx.motes.update(t); for (const b of fx.beams) b.material.uniforms.uT.value = t;
  // lens ve renk
  const subj = flashBack || (t >= PS(8) && t < PS(9)) ? V(.5, 1.05, -2.05) : t >= PS(9) && t < PS(10) ? V(.95, .7, -1.55) : V(-.2, 1.1, -2.2);
  const look = { focus: cam.position.distanceTo(subj), coc: t >= PS(8) && t < PS(10) ? 7 : 4, range: 3, sat: 1.12, lift: [.17, .16, .19], bloom: .75, vignette: .1, tint: [1.01, 1.0, .98] };
  if (flashBack) { look.sat = .85; look.tint = [1.06, 1.0, .9]; look.vignette = .32; }                 // anı: soluk, sıcak
  if (photo) { const k = Math.min(1, (t - P(10, .5)) / .5); look.sat = 1.12 * (1 - k); look.tint = [1.02 + .06 * k, 1.0, .97 - .1 * k]; look.vignette = .1 + .3 * k; look.coc = 2; }
  // flaş: kesmede 2 kare beyaz
  const fl = t - P(8, .27); look.flash = fl >= 0 && fl < 2 / FPS ? .35 : 0;
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
