// Efrâsiyâb'ın Hikâyeleri: Altına Çeviren Hortlak ve Keserli Kaynana — yumurta kafa stili (AÇIK GÜNDÜZ TEMASI, göz almayan mat ışık).
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler (x ekseninde ayrı; sert kesme yok, süzülme + whip pan):
//   tepe  (x=0)   Güneşli Anadolu kayalık tepesi ve antik mezar girişi
//   mezar (x=200) Aydınlık taş lahit odası (tavan açıklığından mat gün ışığı, Kral Bidaz, keser ve altın heykel dönüşümü)
//   tarla (x=300) Güneşli 77 dönüm altın buğday tarlası ve kırmızı 3B traktör
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'efrasiyab-kaynana';
export const FPS = 30;
export let DUR = 42;
export const CUES = [];
export const LOOK = {
  kaynana: {
    headW: 262, headH: 246,
    longHair: '#2b2430', hairLen: 260,
    blush: '#e89898',
    cloth: '#5e2c3e', clothDark: '#3c1a28',
    skirt: '#2a344c', boots: '#5a3a26',
    collar: false, bodyW: 196, drop: 45, height: 1.62
  },
  kaynanaAltin: {
    headW: 262, headH: 246, shade: '#d4a63a',
    longHair: '#c69224', hairLen: 260,
    cloth: '#d8a632', clothDark: '#9a6e16',
    skirt: '#c49022', boots: '#8c6214',
    collar: false, bodyW: 196, drop: 45, height: 1.62
  },
  damat: {
    headW: 264, headH: 248,
    hat: 'kulah', hatColor: '#6a5036',
    mustache: '#4a3224',
    cloth: '#9e7c3e', clothDark: '#6a5022',
    buttons: '#3a2816', pocket: true, collar: true,
    bodyW: 198, height: 1.70
  },
  ortak: {
    headW: 260, headH: 246,
    beard: '#5a4438', beardLen: .62,
    cloth: '#4f6a86', pattern: 'stripes',
    collar: true, bodyW: 194, height: 1.66
  },
  bidaz: {
    headW: 266, headH: 252, shade: '#e2d4a8',
    hat: 'sarik-big', hatColor: '#d4a02c',
    beard: '#b8a888', beardLen: .82,
    body: 'robe', cloth: '#c89228', clothDark: '#825814',
    trim: '#f2d068', collar: false,
    bodyW: 214, height: 1.92
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

function stoneTex(base = '#b8afa0', seed = 21, rep = [2, 2]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 520, 24, .18, seed, .2);
  const R = rng(seed + 1);
  g.strokeStyle = sh(base, .65); g.lineWidth = 3;
  for (let y = 0; y < 512; y += 64) {
    const off = (y / 64) % 2 ? 48 : 0;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
    for (let x = off; x < 512; x += 96) {
      g.beginPath(); g.moveTo(x + (R() - .5) * 6, y); g.lineTo(x + (R() - .5) * 6, y + 64); g.stroke();
    }
  }
  return tx(c, rep);
}

function earthTex(base = '#b69c6c', seed = 33, rep = [8, 8]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 600, 22, .25, seed, .22);
  const R = rng(seed + 2);
  g.strokeStyle = '#7c8a4a'; g.lineWidth = 2; g.globalAlpha = .45;
  for (let i = 0; i < 350; i++) {
    const x = R() * 512, y = R() * 512;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 8, y - 10 - R() * 10); g.stroke();
  }
  g.globalAlpha = 1;
  return tx(c, rep);
}

function wheatTex(rep = [10, 10]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#cfa84c'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#cfa84c', 650, 20, .24, 91, .24);
  const R = rng(92);
  for (let i = 0; i < 600; i++) {
    const x = R() * 512, y = R() * 512;
    g.strokeStyle = i % 2 ? '#e0bc60' : '#a47e2c'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 6, y - 14 - R() * 12); g.stroke();
  }
  return tx(c, rep);
}

function anatoliaSkyTex(seed = 55) {
  const w = 2048, h = 1024, [c, g] = cnv(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h * .66);
  sky.addColorStop(0, D('#5e9ad4')); sky.addColorStop(.55, D('#95c4e8')); sky.addColorStop(1, D('#cfe2f0'));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const R = rng(seed);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = D('#e8f1f8', .55);
    g.beginPath(); g.ellipse(R() * w, h * (.14 + R() * .26), 80 + R() * 150, 20 + R() * 18, 0, 0, 6.29); g.fill();
  }
  // uzak Anadolu tepeleri (mavi-yeşil ve sıcak toprak katmanları)
  for (const [y0, amp, col] of [[h * .64, 58, '#6e8ea8'], [h * .70, 44, '#7d9874'], [h * .76, 30, '#a89462']]) {
    g.fillStyle = D(col); g.beginPath(); g.moveTo(0, h); g.lineTo(0, y0);
    for (let x = 0; x <= w; x += 64) {
      g.lineTo(x, y0 - Math.sin(x * .004 + y0) * amp - Math.cos(x * .011) * amp * .4);
    }
    g.lineTo(w, h); g.closePath(); g.fill();
  }
  return tx(c);
}

function shadows(g) {
  g.traverse(o => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
}

function sun(color, intensity, dir, target, { size = 2048, ext = 8, far = 45 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.copy(V(...target).addScaledVector(V(...dir).normalize(), -20));
  l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(size, size);
  Object.assign(l.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far });
  l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3;
  return l;
}

// 3B Keser (tahta sap + çelik/altın baş)
function buildKeser({ gold = false } = {}) {
  const grp = new THREE.Group();
  const handleMat = gold ? flat('#d8a632') : painted(woodTex({ base: '#8c5a32', plank: 18 }));
  const headMat = gold ? flat('#e2b642') : flat('#566070');
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.022, .026, .62, 10), handleMat);
  handle.position.y = .31; grp.add(handle);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(.26, .065, .05), headMat);
  blade.position.set(.03, .60, 0); grp.add(blade);
  const curved = new THREE.Mesh(new THREE.BoxGeometry(.11, .035, .048), headMat);
  curved.position.set(.14, .56, 0); curved.rotation.z = -.55; grp.add(curved);
  return grp;
}

// ---------------------------------------------------------------- SET 1: GÜNEŞLİ ANADOLU TEPESİ & MEZAR GİRİŞİ (x = 0)
function buildTepe(scene) {
  const g = new THREE.Group(); scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), painted(earthTex('#b89f6e', 33, [12, 12])));
  ground.rotation.x = -Math.PI / 2; g.add(ground);

  const rockMat = painted(stoneTex('#a89e8c', 25, [2, 2]));
  // antik kaya mezar girişi (z = -2.2)
  const mound = new THREE.Mesh(new THREE.SphereGeometry(3.6, 22, 14), rockMat);
  mound.scale.set(1.5, .85, .8); mound.position.set(0, 1.4, -3.5); g.add(mound);
  const archL = new THREE.Mesh(new THREE.BoxGeometry(.48, 2.2, .65), rockMat); archL.position.set(-.86, 1.1, -1.9); g.add(archL);
  const archR = new THREE.Mesh(new THREE.BoxGeometry(.48, 2.2, .65), rockMat); archR.position.set(.86, 1.1, -1.9); g.add(archR);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.35, .42, .75), rockMat); lintel.position.set(0, 2.35, -1.9); g.add(lintel);
  const opening = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 2.15), flat('#2e2a34'));
  opening.position.set(0, 1.08, -2.05); g.add(opening);

  // sağda kaynananın saklanabileceği kaya + solda çalı/ağaç
  const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(.58, 1), rockMat);
  boulder.position.set(1.55, .42, -.35); boulder.scale.set(1.1, .85, .8); g.add(boulder);
  const bushMat = flat('#5e8248');
  for (const [bx, bz, bs] of [[-2.0, -.8, .55], [2.4, -1.1, .6], [-1.7, 1.1, .45]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(bs, 14, 10), bushMat);
    b.position.set(bx, bs * .6, bz); g.add(b);
  }
  // kazma/kürek sapı yerde
  const shovel = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, 1.1, 8), painted(woodTex({ base: '#8c5a32' })));
  shovel.position.set(-.95, .42, -.95); shovel.rotation.z = .35; g.add(shovel);

  const far = new THREE.Mesh(new THREE.CylinderGeometry(45, 45, 38, 40, 1, true), vistaMat(anatoliaSkyTex(55), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#b8d8f6', '#9a8a6c', 1.75));
  const dir = [.38, -.70, -.60]; dyn.tSun = V(...dir).normalize();
  const s = sun('#ffdfb2', 2.15, dir, [0, 1, -1], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.tepe = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: AYDINLIK ANTİK LAHİT ODASI (x = 200)
function buildMezar(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const stFloor = painted(stoneTex('#b4aa9a', 61, [4, 4]));
  const stWall = painted(stoneTex('#c4bab0', 62, [4, 2]));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), stFloor); floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), stWall); backWall.position.set(0, 2.6, -3.2); g.add(backWall);
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), stWall); sideL.rotation.y = Math.PI / 2; sideL.position.set(-4.0, 2.6, 0); g.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), stWall); sideR.rotation.y = -Math.PI / 2; sideR.position.set(4.0, 2.6, 0); g.add(sideR);

  // antik taş sütunlar (kenarlarda, kamerayı kapatmaz)
  for (const px of [-2.4, 2.4]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.24, .28, 4.2, 16), stWall);
    col.position.set(px, 2.1, -2.5); g.add(col);
  }
  // arkada tavandan gün ışığı sızan taş pencere açıklığı (göz almayan pastel gök)
  const skyShaft = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), flat('#9ac4e6'));
  skyShaft.position.set(0, 3.35, -3.14); skyShaft.userData.noShadow = true; g.add(skyShaft);
  dyn.tombBeam = beam(scene, [200, 3.4, -2.2], [200, .8, -.7], { r0: .45, r1: 1.5, color: '#f5e2ba', strength: .07 });

  // merkezdeki antik Kral Bidaz taş lahdi (z = -.85)
  const lahitMat = painted(stoneTex('#c8beaa', 71, [2, 1]));
  const lahit = new THREE.Mesh(new THREE.BoxGeometry(1.75, .74, .92), lahitMat);
  lahit.position.set(0, .37, -.95); g.add(lahit);
  // altın rölyef şeridi (lahit üzerinde, .02 m dışarıda — flicker yok)
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.78, .12, .95), flat('#cfa036'));
  band.position.set(0, .54, -.95); g.add(band);
  // kayarak açılan taş kapak
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.82, .16, .98), lahitMat);
  lid.position.set(0, .82, -.95); g.add(lid);
  dyn.lid = lid;

  // lahit yanında mat altın antik küpler
  for (const [ux, uz, uh] of [[-1.35, -1.25, .42], [1.45, -1.35, .36]]) {
    const urn = new THREE.Mesh(new THREE.CylinderGeometry(.14, .18, uh, 14), flat('#cca038'));
    urn.position.set(ux, uh / 2, uz); g.add(urn);
  }

  // kaynananın salladığı keser (P06-P07) & heykelin elindeki altın keser (P07-P08)
  const keser = buildKeser({ gold: false }); keser.visible = false; g.add(keser);
  const keserGold = buildKeser({ gold: true }); keserGold.visible = false; g.add(keserGold);
  dyn.keser = keser;
  dyn.keserGold = keserGold;

  // açık, okunaklı taş oda ışığı (göz almayan yumuşak tavan gün ışığı)
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#bcd6f0', '#968670', 1.75));
  const dir = [.30, -.75, -.58]; dyn.mSun = V(...dir).normalize();
  const s = sun('#ffe2b4', 2.05, dir, [200, .9, -.8], { ext: 6 }); L.add(s); L.add(s.target);
  scene.add(L); sets.mezar = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: GÜNEŞLİ 77 DÖNÜM TARLA & KIRMIZI TRAKTÖR (x = 300)
function buildTarla(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), painted(wheatTex([16, 16])));
  field.rotation.x = -Math.PI / 2; g.add(field);
  // toprak tarla yolu
  const track = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 26), painted(earthTex('#a88c5c', 82, [1, 8])));
  track.rotation.x = -Math.PI / 2; track.position.set(0, .01, 0); g.add(track);
  // ahşap çit direkleri
  const fenceWood = painted(woodTex({ base: '#7c5434' }));
  for (let x = -5.5; x <= 5.5; x += 1.8) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.09, .85, .09), fenceWood);
    post.position.set(x, .42, -3.2); g.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(11.4, .07, .05), fenceWood); rail.position.set(0, .68, -3.2); g.add(rail);

  // KIRMIZI 3B TRAKTÖR (x = 300.68, z = -1.05 — damadın yanında gururla durur!)
  const tr = new THREE.Group(); tr.position.set(.52, 0, -1.15); tr.rotation.y = -.35; g.add(tr);
  const red = flat('#c4322a'), darkMetal = flat('#2f3540'), tire = flat('#25272e'), rim = flat('#e2b644');
  // motor gövdesi & kaput
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, .68, .78), red); body.position.set(0, .82, 0); tr.add(body);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(.08, .58, .66), darkMetal); grille.position.set(-.79, .82, 0); tr.add(grille);
  // açık kabin çerçevesi & koltuk
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.38, .32, .44), darkMetal); seat.position.set(.55, 1.32, 0); tr.add(seat);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(.85, .07, .92), red); roof.position.set(.48, 2.02, 0); tr.add(roof);
  for (const [px, pz] of [[.12, -.4], [.12, .4], [.82, -.4], [.82, .4]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .86, 8), darkMetal); p.position.set(px, 1.58, pz); tr.add(p);
  }
  // dikey egzoz borusu
  const exh = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .68, 10), darkMetal); exh.position.set(-.45, 1.48, .28); tr.add(exh);
  // arka büyük tekerlekler + ön küçük tekerlekler
  for (const sz of [-.52, .52]) {
    const bigW = new THREE.Mesh(new THREE.CylinderGeometry(.56, .56, .28, 20), tire); bigW.rotation.x = Math.PI / 2; bigW.position.set(.46, .56, sz); tr.add(bigW);
    const bigR = new THREE.Mesh(new THREE.CylinderGeometry(.30, .30, .30, 16), rim); bigR.rotation.x = Math.PI / 2; bigR.position.set(.46, .56, sz); tr.add(bigR);
    const smW = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .20, 18), tire); smW.rotation.x = Math.PI / 2; smW.position.set(-.58, .32, sz * .88); tr.add(smW);
    const smR = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .22, 14), rim); smR.rotation.x = Math.PI / 2; smR.position.set(-.58, .32, sz * .88); tr.add(smR);
  }
  dyn.tractor = tr;

  // tarla kenarında altın kaynana heykeli (sadece keser sapı eksik!)
  const far = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 40, 40, 1, true), vistaMat(anatoliaSkyTex(77), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#b8daf6', '#a89660', 1.8));
  const dir = [.35, -.68, -.62]; dyn.fSun = V(...dir).normalize();
  const s = sun('#ffe0ad', 2.15, dir, [300, 1, -1], { ext: 9 }); L.add(s); L.add(s.target);
  scene.add(L); sets.tarla = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU
function cameraPath() {
  const k = [
    // P01 KANCA (4 görüntü): güneşli tepe -> taş lahit -> gözünü açan Kral Bidaz -> elinde keserle kaynana
    { t: 0,           pos: [-.4, 1.45, 3.6],     look: [0, 1.15, -1.6],     fov: 48, creep: .26, drift: .04 },
    { t: P(1, .28),   dur: .30, move: 'whip', pos: [199.5, 1.38, 2.75], look: [200.0, .88, -.95], fov: 46, creep: .28 },
    { t: P(1, .56),   dur: .32, pos: [200.15, 1.52, 2.05], look: [200.0, 1.42, -.95], fov: 44, creep: .28 },
    { t: P(1, .84),   dur: .30, move: 'whip', pos: [1.15, 1.28, 2.05], look: [1.35, 1.15, -.55], fov: 44, creep: .26 },
    // P02 "Bakın,": iki defineci güneşli tepede mezar kapısında
    { t: PS(2) + .16, dur: .30, move: 'whip', pos: [-.15, 1.38, 3.35], look: [0, 1.18, -.95], fov: 48, creep: .24 },
    { t: PE(2),       dur: Math.max(.4, PE(2) - PS(2) - .2), pos: [.05, 1.32, 2.75], look: [0, 1.16, -1.15], fov: 46, creep: .24 },
    // P03 Lahit odası: kapak kayar, ortak korkar, damat güler
    { t: PS(3) + .16, dur: .30, move: 'whip', pos: [200.0, 1.45, 3.35], look: [200.0, 1.12, -.85], fov: 48, creep: .24 },
    { t: PE(3),       dur: Math.max(.4, PE(3) - PS(3) - .2), pos: [199.85, 1.38, 2.85], look: [199.9, 1.16, -.85], fov: 47, creep: .22 },
    // P04 Altın Kral Bidaz lahitten doğrulur (kick!)
    { t: PS(4) + .18, dur: .42, pos: [200.0, 1.52, 3.15], look: [200.0, 1.32, -.95], fov: 48, creep: .28 },
    { t: PE(4),       dur: Math.max(.4, PE(4) - PS(4) - .22), pos: [200.0, 1.58, 2.65], look: [200.0, 1.44, -.95], fov: 46, creep: .26 },
    // P05 İki defineci panikle geri kaçar
    { t: PS(5) + .18, dur: .42, pos: [200.0, 1.42, 3.65], look: [200.0, 1.22, -.75], fov: 50, creep: .26 },
    { t: PE(5),       dur: Math.max(.4, PE(5) - PS(5) - .22), pos: [200.0, 1.38, 3.25], look: [200.0, 1.20, -.65], fov: 48, creep: .24 },
    // P06 Kaynana keserle içeri dalar!
    { t: PS(6) + .16, dur: .30, move: 'whip', pos: [200.35, 1.36, 2.75], look: [200.18, 1.24, -.45], fov: 46, creep: .28 },
    { t: PE(6),       dur: Math.max(.4, PE(6) - PS(6) - .2), pos: [200.12, 1.42, 2.95], look: [200.05, 1.28, -.75], fov: 47, creep: .28 },
    // P07 Kralı devirir -> kaynana som altına dönüşür! (kick!)
    { t: PS(7) + .18, dur: .35, pos: [200.0, 1.42, 3.15], look: [200.0, 1.24, -.72], fov: 48, creep: .26 },
    { t: PE(7),       dur: Math.max(.4, PE(7) - PS(7) - .22), pos: [200.18, 1.36, 2.55], look: [200.28, 1.22, -.62], fov: 45, creep: .24 },
    // P08 Damat şaşkın -> sonra kurnazca keser sapına bakar
    { t: PS(8) + .20, dur: .45, pos: [199.78, 1.36, 2.65], look: [199.95, 1.22, -.55], fov: 46, creep: .24 },
    { t: PE(8),       dur: Math.max(.4, PE(8) - PS(8) - .24), pos: [199.92, 1.34, 2.35], look: [200.05, 1.22, -.55], fov: 45, creep: .22 },
    // P09 Whip ile güneşli 77 dönüm tarla & kırmızı traktör!
    { t: PS(9) + .14, dur: .30, move: 'whip', pos: [299.85, 1.38, 2.95], look: [300.15, 1.15, -.95], fov: 48, creep: .24 },
    { t: PE(9),       dur: Math.max(.4, PE(9) - PS(9) - .2), pos: [299.95, 1.40, 3.35], look: [300.12, 1.15, -1.05], fov: 49, creep: .22 },
    // P10 Geniş final: damat kırmızı traktör + 77 dönüm güneşli tarla
    { t: DUR,         dur: Math.max(.6, DUR - PE(9) - .05), pos: [300.0, 1.65, 4.65], look: [300.15, 1.18, -1.2], fov: 52, creep: .18 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(4, .28), 1.1);   // Kral Bidaz uyanışı
  cp.kick(P(7, .22), 1.25);  // Keser darbesi
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) {
    const p = PT[w.part] ||= { s: w.start, e: w.end };
    p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end);
  }
  const lastEnd = ctx.words.length ? ctx.words[ctx.words.length - 1].end : 40;
  DUR = Math.ceil((lastEnd + 1.6) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#9ac4e6');

  buildTepe(scene);
  buildMezar(scene);
  buildTarla(scene);

  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Altın parıltı zerreleri (P07 dönüşüm anında kaynana çevresinde)
  fx.gold = new Smoke(scene, { color: '#f0c850', maxPoints: 180, H: ctx.H, near: 1.2 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.gold.wisps.push({
    n: 80, size: .05, alpha: .55, speed: .35,
    on: t => where(t) === 'mezar' && t >= P(7, .48),
    path: (u, t, i) => [
      200.32 + (hash(i, 1) - .5) * 1.1,
      .35 + u * 1.65,
      -.58 + (hash(i, 3) - .5) * .9
    ]
  });

  // Traktör egzozundan sevimli ince duman halkaları (P09-P10)
  fx.exh = new Smoke(scene, { color: '#e2e6ec', maxPoints: 90, H: ctx.H, near: 1.5 });
  fx.exh.wisps.push({
    n: 36, size: .16, alpha: .26, speed: .28,
    on: t => where(t) === 'tarla',
    path: (u, t, i) => [
      300.22 - u * .45 + Math.sin(u * 5 + t * 2) * .08,
      1.86 + u * 1.1,
      -.95 + Math.cos(u * 4 + t) * .08
    ]
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(P(1, .28) - .04, 'whoosh');
  cue(PS(3) + .12, 'whoosh');
  cue(PS(9) + .10, 'whoosh');
  cue(P(1, .84) - .04, 'whoosh');
  cue(PS(2) + .12, 'whoosh');
  cue(PS(6) + .12, 'whoosh');

  cue(PS(3) + .20, 'stone', { dur: 1.1 });
  cue(P(4, .24), 'boom');
  cue(P(7, .20), 'boom');
  cue(P(7, .52), 'gold');
  cue(PS(9) + .25, 'tractor', { dur: Math.max(1.0, DUR - PS(9) - .5) });
  cue(PE(10) - .25, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) {
  if (t < P(1, .26)) return 'tepe';
  if (t < P(1, .82)) return 'mezar';
  if (t < PS(3) + .14) return 'tepe';
  if (t < PS(9) + .12) return 'mezar';
  return 'tarla';
}
function camSet(cam) { return cam.position.x > 250 ? 'tarla' : cam.position.x > 100 ? 'mezar' : 'tepe'; }

const WARM = '#f2cc92', COOL = '#cfd6ec';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['tepe', 'mezar', 'tarla']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  dyn.tombBeam.visible = here === 'mezar';
  dyn.tombBeam.material.uniforms.uT.value = t;
  dyn.keser.visible = false;
  dyn.keserGold.visible = false;

  const env = ctx.env, talk = (a, b) => (t >= a && t <= b ? flap(env, t) : 0);
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const kn = cast.kaynana, ka = cast.kaynanaAltin, dm = cast.damat, ot = cast.ortak, bd = cast.bidaz;
  const tint = [.91, .91, .91];

  if (here === 'tepe') {
    const hookK = t >= P(1, .75) && t < PS(2);
    // Damat ve Ortak mezar girişinde
    dm.show(); dm.place(-.42, 0, -.95, cam, tint);
    dm.draw({
      expr: 'smug', look: .4, blink: bl(1, PS(2)),
      armR: [45, 25], armL: [18, 12],
      lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    dm.castFrom(dyn.tSun, true);

    ot.show(); ot.place(.42, 0, -1.02, cam, tint);
    ot.draw({
      expr: 'worried', look: -.45, sweat: .8, blink: bl(2, PS(2) + .5),
      armL: [35, 20], armR: [18, 12],
      lit: 1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    ot.castFrom(dyn.tSun, true);

    // Kaynana sağdaki kayanın arkasından öfkeyle gözetler!
    kn.show(); kn.place(1.38, 0, -.58, cam, tint);
    kn.draw({
      expr: 'angry', look: -.8, blink: bl(3, P(1, .84)),
      armL: [115, 25], armR: [25, 16],
      bob: hookK ? -Math.abs(Math.sin(t * 8)) * 6 : 0,
      lit: 1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    kn.castFrom(dyn.tSun, true);
  } else if (here === 'mezar') {
    const isHook = t < PS(2);
    const lidOpen = isHook ? .95 : ramp(t, PS(3) + .15, PS(3) + 1.2);
    dyn.lid.position.x = lidOpen * .95;
    dyn.lid.rotation.y = lidOpen * .18;

    const riseU = isHook ? ramp(t, P(1, .34), P(1, .68)) : ramp(t, PS(4) - .05, P(4, .58));
    const fallenU = isHook ? 0 : ramp(t, P(7, .18), P(7, .52));
    const turnedGold = !isHook && t >= P(7, .50);

    // Kral Bidaz (lahit arkasından yükselir, P07'de keserle yana devrilir!)
    if (riseU > .02) {
      bd.show();
      const bdY = -.95 + riseU * .95 - fallenU * .42;
      bd.place(200.0 - fallenU * .38, bdY, -1.22, cam, tint);
      bd.draw({
        expr: fallenU > .3 ? 'surprised' : 'angry',
        look: fallenU > .2 ? .6 : 0,
        blink: bl(4, P(4, .3), P(7, .22)),
        armL: fallenU > .2 ? [140, 20] : [88, 35],
        armR: fallenU > .2 ? [130, 15] : [88, 35],
        lean: -fallenU * 38,
        lit: 1, shade: '#dfd2aa', rim: { color: WARM, a: .24 }
      });
      bd.castFrom(dyn.mSun, true);
    }

    if (!isHook) {
      const laugh3 = t >= P(3, .52) && t < PS(4);
      const panic = t >= PS(4) && t < P(7, .45);
      const sly8 = t >= P(8, .48);

      // Damat (sol)
      dm.show(); dm.place(199.42 - (panic ? .18 : 0), 0, -.42, cam, tint);
      dm.draw({
        expr: sly8 ? 'smug' : t >= P(7, .5) ? 'surprised' : panic ? 'surprised' : laugh3 ? 'laugh' : 'smile',
        look: .72,
        mouth: Math.max(talk(P(3, .55), PE(3)), laugh3 ? .75 : 0),
        laughMarks: laugh3 ? .9 : 0,
        sweat: panic ? 1 : 0,
        blink: bl(5, PS(4), P(7, .52), P(8, .5)),
        armR: panic ? [125, 25] : laugh3 ? [75, 30] : [26, 18],
        armL: panic ? [120, 25] : [20, 14],
        bob: laugh3 ? -Math.abs(Math.sin(t * 13)) * 10 : 0,
        lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      dm.castFrom(dyn.mSun, true);

      // Ortak (P06'da kaynana gelince kenara çekilir)
      if (t < PS(6) + .2) {
        const leave = ramp(t, PS(6) - .1, PS(6) + .2);
        ot.show(); ot.place(200.56 + leave * 1.1, 0, -.48, cam, tint);
        ot.draw({
          expr: panic ? 'surprised' : 'worried', look: -.65, sweat: 1,
          mouth: talk(PS(3), P(3, .48)),
          blink: bl(6, PS(3), PS(4)),
          armL: panic ? [130, 25] : [45, 25], armR: panic ? [125, 25] : [25, 16],
          lit: 1, shade: COOL, rim: { color: WARM, a: .2 }
        });
        ot.castFrom(dyn.mSun, true);
      }

      // Kaynana (P06'da sağdan keserle dalar -> P07'de keseri indirir -> som altın heykele döner!)
      if (t >= PS(6) - .05) {
        const runIn = ramp(t, PS(6) - .05, PS(6) + .55);
        const swing = ramp(t, P(7, .05), P(7, .24));
        const kx = 200.38 + (1 - runIn) * 1.35;
        const kz = -.56;
        if (!turnedGold) {
          kn.show(); kn.place(kx, 0, kz, cam, tint);
          kn.draw({
            expr: 'angry', look: -.75, blink: bl(7, P(7, .1)),
            armL: [135 - swing * 85, 25], armR: [40, 20],
            bob: runIn < 1 ? -Math.abs(Math.sin(t * 14)) * 12 : 0,
            lean: -swing * 12,
            lit: 1, shade: COOL, rim: { color: WARM, a: .22 }
          });
          kn.castFrom(dyn.mSun, true);
          dyn.keser.visible = true;
          dyn.keser.position.set(kx - 200 - .22, 1.05 - swing * .15, kz + .12);
          dyn.keser.rotation.z = .65 + swing * 1.35;
        } else {
          // SOM ALTIN KAYNANA HEYKELİ (tamamen donmuş, parlayan mat altın!)
          ka.show(); ka.place(kx, 0, kz, cam, [.96, .84, .44]);
          ka.draw({
            expr: 'surprised', look: -.65, blink: 0,
            armL: [65, 25], armR: [35, 20],
            lit: 1, shade: '#c49022', rim: { color: '#f5d26a', a: .32 }
          });
          ka.castFrom(dyn.mSun, true);
          dyn.keserGold.visible = true;
          dyn.keserGold.position.set(kx - 200 - .22, .92, kz + .12);
          dyn.keserGold.rotation.z = 1.65;
        }
      }
    }
  } else {
    // ---- SET 3: GÜNEŞLİ 77 DÖNÜM TARLA & KIRMIZI TRAKTÖR (P09-P10)
    dyn.tractor.position.y = Math.sin(t * 24) * .008; // canlı motor titreşimi!
    const celebrate = t >= PS(10);
    dm.show(); dm.place(299.62, 0, -.52, cam, tint);
    dm.draw({
      expr: celebrate ? 'laugh' : 'proud',
      look: .32,
      laughMarks: celebrate ? .85 : 0,
      mouth: celebrate ? .65 : 0,
      blink: bl(8, PS(10)),
      armR: celebrate ? [125, 25] : [65, 30],
      armL: celebrate ? [115, 25] : [22, 14],
      bob: celebrate ? -Math.abs(Math.sin(t * 10)) * 9 : 0,
      lit: -1, shade: COOL, rim: { color: WARM, a: .22 }
    });
    dm.castFrom(dyn.fSun, true);
  }

  for (const s of [fx.gold, fx.exh]) s.update(t);

  // Göz almayan, yumuşak açık gündüz renk düzeltmesi (bloom düşük: 0.16-0.18!)
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'tepe') {
    look = { ...focusOn(V(0, 1.15, -.95), 3.5, 4.5), sat: 1.12, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c2d8ea', .012);
  } else if (here === 'mezar') {
    look = { ...focusOn(V(200.0, 1.2, -.75), 3.8, 4.2), sat: 1.12, lift: [.05, .05, .06], bloom: .18, vignette: .13 };
    C.scene.fog = new THREE.FogExp2('#c6bfb2', .012);
  } else {
    look = { ...focusOn(V(300.1, 1.15, -.9), 3.5, 5.0), sat: 1.14, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c4d8e8', .010);
  }
  look.tint = [.96, .96, .97];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
