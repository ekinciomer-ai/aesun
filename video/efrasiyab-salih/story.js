// Efrâsiyâb'ın Hikâyeleri: "Meğer Salih Ben İmişim" — yumurta kafa stili (AÇIK GÜNDÜZ TEMASI, göz almayan mat ışık).
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler (x ekseninde ayrı; sert kesme yok, süzülme + whip pan):
//   carsi (x=0)   Güneşli Anadolu avlusu/çarşısı (altın sandık, rüya balonu, serveti dağıtma, gülen komşu)
//   dag   (x=200) Acıpayam Dağı güneşli-karlı zirve patikası (yıllar süren tırmanış, tüccar -> ak sakallı Salih dönüşümü)
//   kuyu  (x=300) Zirvedeki aydınlık taş kulübe/avlu, değirmen taşlı kuyu ve berrak suda kendi yansıması!
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'efrasiyab-salih';
export const FPS = 30;
export let DUR = 40;
export const CUES = [];
export const LOOK = {
  tuccar: {
    headW: 264, headH: 248,
    hat: 'sarik', hatColor: '#e4dac4',
    mustache: '#2c1e18',
    cloth: '#782e3c', clothDark: '#4a1a24',
    trim: '#d8ab4c', buttons: '#e2b852', sash: '#c48a34', collar: true,
    bodyW: 212, height: 1.74
  },
  salih: {
    headW: 264, headH: 248, shade: '#dcd8ea',
    beard: '#e6e2da', beardLen: .86,
    body: 'robe', cloth: '#9a8c76', clothDark: '#685c4a',
    trim: '#cbbca4', collar: false,
    bodyW: 204, height: 1.74
  },
  komsu: {
    headW: 260, headH: 246,
    hat: 'kulah', hatColor: '#6d503a',
    mustache: '#4a3628',
    cloth: '#506d8c', pattern: 'stripes',
    buttons: '#2c3a4c', collar: true,
    bodyW: 196, height: 1.68
  },
  fakir: {
    headW: 256, headH: 244,
    blush: '#e69a9a',
    cloth: '#7c7648', clothDark: '#524e2c',
    scarf: '#9c5a3c', scarfY: 6, collar: true,
    bodyW: 190, height: 1.64
  }
};

const S = smoother;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ramp = (t, a, b) => S(clamp((t - a) / Math.max(1e-4, b - a), 0, 1));
const V = (...a) => new THREE.Vector3(...a);
let C, PT = {}, cast = {}, sets = {}, fx = {}, dyn = {};

const P = (k, f = 0) => {
  const p = PT['P' + String(k).padStart(2, '0')] || { s: (k - 1) * 3.8, e: k * 3.8 };
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

function stoneTex(base = '#c2b8a8', seed = 21, rep = [2, 2]) {
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

function mountainGroundTex(rep = [8, 8]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#9ea8b8'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#cfd8e4', 420, 32, .16, 44, .35);
  dab(g, 512, 512, '#8b8276', 320, 22, .22, 45, .28);
  return tx(c, rep);
}

// aydınlık pastel gökyüzü ve karlı Anadolu dağları panoraması
function skyPeaksTex(snowy = false, seed = 61) {
  const w = 2048, h = 1024, [c, g] = cnv(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h * .66);
  sky.addColorStop(0, D(snowy ? '#5c94d0' : '#649ed6'));
  sky.addColorStop(.55, D('#99c5e8'));
  sky.addColorStop(1, D('#d0e2f0'));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const R = rng(seed);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = D('#e8f1f8', .52);
    g.beginPath(); g.ellipse(R() * w, h * (.14 + R() * .26), 85 + R() * 150, 20 + R() * 18, 0, 0, 6.29); g.fill();
  }
  const layers = snowy
    ? [[h * .60, 115, '#728eb2'], [h * .68, 82, '#8ea4be'], [h * .76, 48, '#a69a88']]
    : [[h * .64, 62, '#6e8ca8'], [h * .71, 46, '#849a7c'], [h * .78, 30, '#ae9b74']];
  for (const [y0, amp, col] of layers) {
    g.fillStyle = D(col); g.beginPath(); g.moveTo(0, h); g.lineTo(0, y0);
    for (let x = 0; x <= w; x += 64) {
      g.lineTo(x, y0 - Math.abs(Math.sin(x * .0038 + y0)) * amp - Math.cos(x * .009) * amp * .28);
    }
    g.lineTo(w, h); g.closePath(); g.fill();
  }
  return tx(c);
}

// Rüya balonu ve kuyu suyu yansıması için boyalı ak sakallı Salih portresi!
function salihPortraitTex({ water = false } = {}) {
  const [c, g] = cnv(512, 512);
  if (water) {
    const gr = g.createRadialGradient(256, 256, 30, 256, 256, 250);
    gr.addColorStop(0, '#7eb4dc'); gr.addColorStop(.65, '#4c86b8'); gr.addColorStop(1, '#2c5882');
    g.fillStyle = gr; g.beginPath(); g.arc(256, 256, 246, 0, 6.29); g.fill();
    // yumuşak su halkaları
    g.strokeStyle = 'rgba(225,242,255,0.42)'; g.lineWidth = 6;
    for (const r of [140, 185, 222]) { g.beginPath(); g.arc(256, 256, r, 0, 6.29); g.stroke(); }
  } else {
    g.fillStyle = '#ece3d0'; g.beginPath(); g.arc(256, 256, 242, 0, 6.29); g.fill();
    g.strokeStyle = PLUM; g.lineWidth = 12; g.stroke();
  }
  // Ak sakallı ermiş Salih'in beyaz yumurta başı + uzun ak sakalı (birebir aynı karakter!)
  g.save(); g.translate(256, 240);
  // omuzlar (sade cübbe)
  g.fillStyle = '#9a8c76'; g.strokeStyle = PLUM; g.lineWidth = 10;
  g.beginPath(); g.ellipse(0, 145, 95, 70, 0, Math.PI, 0); g.fill(); g.stroke();
  // beyaz yumurta kafa
  g.fillStyle = '#f2f0ec'; g.strokeStyle = PLUM; g.lineWidth = 11;
  g.beginPath(); g.ellipse(0, -18, 92, 86, 0, 0, 6.29); g.fill(); g.stroke();
  // uzun ak sakal
  g.fillStyle = '#e6e2da'; g.strokeStyle = PLUM; g.lineWidth = 10;
  g.beginPath(); g.moveTo(-88, -12); g.quadraticCurveTo(-76, 86, 0, 128); g.quadraticCurveTo(76, 86, 88, -12);
  g.quadraticCurveTo(44, 46, 0, 50); g.quadraticCurveTo(-44, 46, -88, -12); g.closePath(); g.fill(); g.stroke();
  // kaşlar ve gözler (suda şaşkın/hayret, rüyada bilge huzurlu)
  g.strokeStyle = PLUM; g.fillStyle = PLUM; g.lineWidth = 9; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    if (water) {
      g.beginPath(); g.arc(s * 30, -24, 15, 0, 6.29); g.fill();
      g.beginPath(); g.moveTo(s * 14, -56); g.quadraticCurveTo(s * 30, -68, s * 48, -54); g.stroke();
    } else {
      g.beginPath(); g.moveTo(s * 14, -24); g.lineTo(s * 46, -24); g.stroke();
      g.beginPath(); g.arc(s * 30, -24, 11, 0, Math.PI); g.fill();
      g.beginPath(); g.moveTo(s * 14, -46); g.quadraticCurveTo(s * 30, -54, s * 46, -44); g.stroke();
    }
  }
  // ağız
  if (water) {
    g.fillStyle = '#5a1f2e'; g.beginPath(); g.ellipse(0, 14, 12, 16, 0, 0, 6.29); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.moveTo(-16, 12); g.quadraticCurveTo(0, 26, 16, 12); g.stroke();
  }
  g.restore();
  if (water) {
    g.strokeStyle = '#3a4c62'; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 244, 0, 6.29); g.stroke();
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

// ---------------------------------------------------------------- SET 1: GÜNEŞLİ ANADOLU ÇARŞISI / AVLU (x = 0)
function buildCarsi(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), painted(stoneTex('#c6baa6', 11, [8, 8])));
  floor.rotation.x = -Math.PI / 2; g.add(floor);

  // güneşli konak / çarşı cephesi (z = -2.6)
  const wallMat = painted(stoneTex('#d2c7b4', 12, [3, 2]));
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.6, .45), wallMat); wall.position.set(0, 1.8, -2.7); g.add(wall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.0, .28, 1.2), flat('#b45c3c')); roof.position.set(0, 3.72, -2.55); g.add(roof);
  // kemerli ahşap kapı
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.2, .12), painted(woodTex({ base: '#6e4528' }))); door.position.set(0, 1.1, -2.44); g.add(door);

  // açık altın sandık (z = -1.25, sol)
  const chest = new THREE.Group(); chest.position.set(-.95, 0, -1.15); chest.rotation.y = .32; g.add(chest);
  const chWood = painted(woodTex({ base: '#784828' }));
  const box = new THREE.Mesh(new THREE.BoxGeometry(.78, .46, .48), chWood); box.position.y = .23; chest.add(box);
  const goldPile = new THREE.Mesh(new THREE.SphereGeometry(.32, 16, 10), flat('#d8a832'));
  goldPile.scale.set(1.1, .45, .7); goldPile.position.y = .48; chest.add(goldPile);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(.80, .09, .48), chWood); lid.position.set(0, .64, -.26); lid.rotation.x = -.95; chest.add(lid);

  // Tüccarın başı üstünde beliren Rüya Balonu (Ak sakallı Salih portresi!)
  const dream = new THREE.Mesh(new THREE.CircleGeometry(.44, 32), new THREE.MeshBasicMaterial({ map: salihPortraitTex({ water: false }), transparent: true }));
  dream.position.set(.05, 2.18, -.58); dream.visible = false; dream.userData.noShadow = true; g.add(dream);
  dyn.dream = dream;

  // Elindeki altın kesesi (P03'te fakire verir)
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), flat('#d8a632'));
  pouch.position.set(0, .95, -.52); pouch.visible = false; g.add(pouch);
  dyn.pouch = pouch;

  const far = new THREE.Mesh(new THREE.CylinderGeometry(45, 45, 38, 40, 1, true), vistaMat(skyPeaksTex(false, 61), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#bcdcf6', '#9a8c76', 1.78));
  const dir = [.36, -.70, -.60]; dyn.cSun = V(...dir).normalize();
  const s = sun('#ffe0b2', 2.15, dir, [0, 1, -1], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.carsi = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: ACIPAYAM DAĞI PATİKASI (x = 200)
function buildDag(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), painted(mountainGroundTex([10, 10])));
  ground.rotation.x = -Math.PI / 2; g.add(ground);

  // yukarı çıkan taşlı dağ patikası
  const trail = new THREE.Mesh(new THREE.BoxGeometry(1.75, .08, 12), painted(stoneTex('#a89b86', 48, [1, 6])));
  trail.position.set(0, .04, -.5); g.add(trail);

  // kenarlarda karlı kayalar ve çam ağaçları (orta koridor %100 açık!)
  const rockMat = painted(stoneTex('#8c94a4', 49, [2, 2]));
  const snowMat = flat('#dde6f0');
  for (const [rx, rz, rs] of [[-1.95, -1.6, .85], [2.05, -1.2, .95], [-2.3, .5, .7], [2.2, 1.0, .75], [-1.7, -3.5, 1.15], [1.8, -3.2, 1.1]]) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 1), rockMat);
    r.position.set(rx, rs * .55, rz); g.add(r);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(rs * .62, 12, 8), snowMat);
    cap.scale.y = .35; cap.position.set(rx, rs * 1.05, rz); g.add(cap);
  }
  const pineMat = flat('#446a54'), trunkMat = flat('#644832');
  for (const [px, pz, ph] of [[-2.7, -2.5, 2.8], [2.8, -2.2, 3.1], [-2.5, -4.6, 3.2], [2.6, -4.5, 2.9]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.11, .14, .7, 8), trunkMat); tr.position.set(px, .35, pz); g.add(tr);
    const cn = new THREE.Mesh(new THREE.ConeGeometry(.75, ph, 12), pineMat); cn.position.set(px, .7 + ph / 2, pz); g.add(cn);
  }

  const far = new THREE.Mesh(new THREE.CylinderGeometry(48, 48, 40, 40, 1, true), vistaMat(skyPeaksTex(true, 73), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#bedcf6', '#8a92a4', 1.8));
  const dir = [-.38, -.68, -.62]; dyn.dSun = V(...dir).normalize();
  const s = sun('#ffebd0', 2.05, dir, [200, 1, -1], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.dag = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: ZİRVEDEKİ TAŞ KULÜBE VE BERRAK KUYU (x = 300)
function buildKuyu(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const stFloor = painted(stoneTex('#beb5a4', 81, [6, 6]));
  const stWall = painted(stoneTex('#c9c0b0', 82, [3, 2]));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), stFloor); floor.rotation.x = -Math.PI / 2; g.add(floor);

  // Aydınlık açık-kemerli zirve taş kulübesi (arkada masmavi Anadolu ufku görünür!)
  for (const px of [-1.75, 1.75]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(.42, 2.75, .42), stWall); pil.position.set(px, 1.375, -2.35); g.add(pil);
  }
  const lowWall = new THREE.Mesh(new THREE.BoxGeometry(3.8, .78, .36), stWall); lowWall.position.set(0, .39, -2.35); g.add(lowWall);
  const beamTop = new THREE.Mesh(new THREE.BoxGeometry(4.1, .28, .52), painted(woodTex({ base: '#785032' }))); beamTop.position.set(0, 2.86, -2.35); g.add(beamTop);

  // MERKEZDEKİ TAŞ KUYU (z = -.85)
  const well = new THREE.Group(); well.position.set(0, 0, -.85); g.add(well);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(.68, .74, .76, 24, 1, true), stWall);
  rim.material.side = THREE.DoubleSide; rim.position.y = .38; well.add(rim);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.68, .09, 12, 28), stWall);
  lip.rotation.x = Math.PI / 2; lip.position.y = .76; well.add(lip);

  // Berrak mavi su yüzeyi (içinde Salih'in yansıması!)
  const water = new THREE.Mesh(new THREE.CircleGeometry(.62, 28), new THREE.MeshBasicMaterial({ map: salihPortraitTex({ water: true }) }));
  water.rotation.x = -Math.PI / 2; water.position.y = .66; water.userData.noShadow = true; well.add(water);
  dyn.water = water;

  // Ağır değirmen taşı kapağı (P06'da yana itilir!)
  const mill = new THREE.Mesh(new THREE.CylinderGeometry(.74, .74, .14, 24), painted(stoneTex('#9c9488', 85, [1, 1])));
  mill.position.set(0, .86, 0); well.add(mill);
  dyn.mill = mill;

  // P07-P08'de kuyu üstünde beliren büyük "SUDAKİ YANSIMA" yuvarlak madalyonu (telefonda bile net okunur!)
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(.52, 32), new THREE.MeshBasicMaterial({ map: salihPortraitTex({ water: true }), transparent: true }));
  mirror.position.set(-.02, 1.55, -.42); mirror.visible = false; mirror.userData.noShadow = true; g.add(mirror);
  dyn.mirror = mirror;

  const far = new THREE.Mesh(new THREE.CylinderGeometry(52, 52, 42, 40, 1, true), vistaMat(skyPeaksTex(true, 91), { yaw: Math.PI, az: Math.PI * 2, el: [-14 * Math.PI / 180, 34 * Math.PI / 180], gain: .95 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c0def6', '#9a8e7a', 1.8));
  const dir = [.34, -.72, -.60]; dyn.kSun = V(...dir).normalize();
  const s = sun('#ffe4ba', 2.1, dir, [300, 1, -.8], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.kuyu = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU
function cameraPath() {
  const k = [
    // P01 KANCA (4 görüntü): altın sandıklı tüccar -> rüya balonu -> dağa tırmanış -> berrak kuyu yansıması
    { t: 0,           pos: [-.25, 1.38, 3.25],   look: [-.1, 1.25, -.9],   fov: 48, creep: .24, drift: .04 },
    { t: P(1, .28),   dur: .42, pos: [.0, 1.62, 2.35], look: [.02, 1.68, -.68], fov: 46, creep: .28 },
    { t: P(1, .56),   dur: .30, move: 'whip', pos: [200.1, 1.35, 3.1], look: [200.0, 1.2, -.8], fov: 48, creep: .28 },
    { t: P(1, .82),   dur: .30, move: 'whip', pos: [300.0, 1.52, 2.45], look: [300.0, 1.38, -.6], fov: 46, creep: .26 },
    // P02 "Bakın,": güneşli avlu, zengin tüccar + rüyasında Salih balonu
    { t: PS(2) + .16, dur: .30, move: 'whip', pos: [-.15, 1.44, 3.45], look: [-.15, 1.38, -.85], fov: 48, creep: .24 },
    { t: PE(2),       dur: Math.max(.4, PE(2) - PS(2) - .2), pos: [.02, 1.56, 2.95], look: [.02, 1.52, -.75], fov: 47, creep: .22 },
    // P03 Serveti fakire verir, komşu güler
    { t: PS(3) + .18, dur: .42, pos: [.05, 1.36, 3.55], look: [.05, 1.18, -.70], fov: 49, creep: .24 },
    { t: PE(3),       dur: Math.max(.4, PE(3) - PS(3) - .22), pos: [.35, 1.36, 2.95], look: [.32, 1.22, -.68], fov: 47, creep: .22 },
    // P04 Whip ile Acıpayam Dağı: sarp patikada tırmanış
    { t: PS(4) + .16, dur: .30, move: 'whip', pos: [199.85, 1.38, 3.45], look: [200.0, 1.22, -.6], fov: 48, creep: .26 },
    { t: PE(4),       dur: Math.max(.4, PE(4) - PS(4) - .2), pos: [200.15, 1.36, 2.75], look: [200.0, 1.24, -1.2], fov: 47, creep: .26 },
    // P05 Dönüşüm: tüccar -> ak sakallı Salih
    { t: PS(5) + .18, dur: .45, pos: [200.0, 1.38, 2.45], look: [200.0, 1.25, -1.0], fov: 46, creep: .25 },
    { t: PE(5),       dur: Math.max(.4, PE(5) - PS(5) - .22), pos: [200.0, 1.42, 2.85], look: [200.0, 1.28, -1.2], fov: 47, creep: .24 },
    // P06 Whip ile zirvedeki kulübe & kuyu: Salih ağır değirmen taşını yana iter! (kick!)
    { t: PS(6) + .16, dur: .30, move: 'whip', pos: [300.0, 1.48, 3.25], look: [300.0, 1.18, -.85], fov: 48, creep: .25 },
    { t: PE(6),       dur: Math.max(.4, PE(6) - PS(6) - .2), pos: [300.15, 1.46, 2.75], look: [300.0, 1.16, -.85], fov: 47, creep: .24 },
    // P07 Kuyunun berrak suyuna eğilip donakalır
    { t: PS(7) + .16, dur: .42, pos: [300.05, 1.56, 2.35], look: [300.0, 1.26, -.75], fov: 46, creep: .28 },
    // P08 Suda rüyasındaki Salih! "Meğer Salih ben imişim!" (yansıma madalyonu + Salih yan yana!)
    { t: PS(8) + .16, dur: .40, pos: [300.0, 1.52, 2.85], look: [300.0, 1.36, -.65], fov: 47, creep: .24 },
    { t: PE(8),       dur: Math.max(.4, PE(8) - PS(8) - .2), pos: [300.0, 1.54, 2.65], look: [300.0, 1.38, -.65], fov: 46, creep: .22 },
    // P09 Tebessüm (gözündeki gözlüğü aramak gibi)
    { t: PS(9) + .18, dur: .45, pos: [300.12, 1.44, 2.85], look: [300.15, 1.32, -.75], fov: 46, creep: .22 },
    // P10 Geniş zirve manzarası: güneşli Anadolu ufku, kamera yavaşça geri ve yukarı çekilir
    { t: DUR,         dur: Math.max(.6, DUR - PS(10) + .1), pos: [300.0, 1.78, 4.55], look: [300.0, 1.35, -1.6], fov: 52, creep: .18 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .66), 1.05);  // değirmen taşı yana kayar
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) {
    const p = PT[w.part] ||= { s: w.start, e: w.end };
    p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end);
  }
  const lastEnd = ctx.words.length ? ctx.words[ctx.words.length - 1].end : 38;
  DUR = Math.ceil((lastEnd + 1.4) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#9ac5e6');

  buildCarsi(scene);
  buildDag(scene);
  buildKuyu(scene);

  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Acıpayam Dağı'nda ince esen kar taneleri & dönüşüm pusu
  fx.snow = new Smoke(scene, { color: '#eef4fa', maxPoints: 180, H: ctx.H, near: 1.4 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.snow.wisps.push({
    n: 110, size: .028, alpha: .42, speed: .45,
    on: t => where(t) === 'dag',
    path: (u, t, i) => [
      200 + (hash(i, 1) - .5) * 6.0 - u * .9,
      3.4 - u * 3.5,
      (hash(i, 3) - .5) * 5.0
    ]
  });

  // Zirvedeki kuyu etrafında nazik huzur pırıltıları (P08-P10)
  fx.motes = new Smoke(scene, { color: '#f2e0a4', maxPoints: 90, H: ctx.H, near: 1.4 });
  fx.motes.wisps.push({
    n: 50, size: .035, alpha: .38, speed: .20,
    on: t => where(t) === 'kuyu' && t >= P(7, .6),
    path: (u, t, i) => [
      300 + (hash(i, 1) - .5) * 2.2,
      .8 + u * 1.8,
      -.7 + (hash(i, 3) - .5) * 1.4
    ]
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(P(1, .56) - .04, 'whoosh');
  cue(PS(4) + .12, 'whoosh');
  cue(PS(6) + .12, 'whoosh');
  cue(P(1, .82) - .04, 'whoosh');
  cue(PS(2) + .12, 'whoosh');

  cue(P(2, .52), 'chime');
  cue(P(5, .45), 'chime');
  cue(P(6, .48), 'stone', { dur: .9 });
  cue(P(6, .66), 'boom');
  cue(P(7, .65), 'water');
  cue(P(8, .25), 'shimmer');
  cue(PE(10) - .25, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) {
  if (t < P(1, .54)) return 'carsi';
  if (t < P(1, .80)) return 'dag';
  if (t < PS(2) + .14) return 'kuyu';
  if (t < PS(4) + .14) return 'carsi';
  if (t < PS(6) + .14) return 'dag';
  return 'kuyu';
}
function camSet(cam) { return cam.position.x > 250 ? 'kuyu' : cam.position.x > 100 ? 'dag' : 'carsi'; }

const WARM = '#f2cc92', COOL = '#cfd6ec';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['carsi', 'dag', 'kuyu']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  dyn.dream.visible = false;
  dyn.pouch.visible = false;
  dyn.mirror.visible = false;

  const env = ctx.env, talk = (a, b) => (t >= a && t <= b ? flap(env, t) : 0);
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tc = cast.tuccar, sl = cast.salih, km = cast.komsu, fk = cast.fakir;
  const tint = [.91, .91, .91];

  if (here === 'carsi') {
    const showDream = (t >= P(1, .20) && t < P(1, .55)) || (t >= P(2, .45) && t < PS(3));
    const giveGold = t >= PS(3);

    tc.show(); tc.place(giveGold ? -.46 : .0, 0, -.68, cam, tint);
    tc.draw({
      expr: showDream ? 'surprised' : giveGold ? 'smile' : 'proud',
      look: giveGold ? .65 : 0,
      blink: bl(1, P(2, .48), PS(3)),
      armR: giveGold ? [78, 35] : [24, 16],
      armL: [22, 16],
      lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    tc.castFrom(dyn.cSun, true);

    if (showDream) {
      const sc = t < PS(2) ? 1 : ramp(t, P(2, .45), P(2, .75));
      dyn.dream.visible = true;
      dyn.dream.scale.setScalar(Math.max(.001, sc));
      dyn.dream.position.y = 2.18 + Math.sin(t * 3.5) * .04;
      dyn.dream.lookAt(cam.position);
    }

    if (giveGold) {
      dyn.pouch.visible = true;
      dyn.pouch.position.set(-.18, .98 + Math.sin(t * 6) * .03, -.62);
      // Fakir sevinçle altını alır (orta)
      fk.show(); fk.place(.10, 0, -.68, cam, tint);
      fk.draw({
        expr: 'grin', look: -.55, blink: bl(2, PS(3) + .3),
        armL: [75, 35], armR: [25, 18],
        lit: 1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      fk.castFrom(dyn.cSun, true);

      // Komşu sağda kahkahayla güler!
      const laugh3 = t >= P(3, .38);
      km.show(); km.place(.68, 0, -.62, cam, tint);
      km.draw({
        expr: laugh3 ? 'laugh' : 'smug', look: -.65,
        mouth: Math.max(talk(P(3, .42), PE(3)), laugh3 ? .75 : 0),
        laughMarks: laugh3 ? .95 : 0,
        blink: bl(3, P(3, .4)),
        armL: laugh3 ? [95, 30] : [28, 18], armR: [24, 16],
        bob: laugh3 ? -Math.abs(Math.sin(t * 14)) * 11 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      km.castFrom(dyn.cSun, true);
    }
  } else if (here === 'dag') {
    const isHook = t < PS(2);
    const climbU = isHook ? .45 : ramp(t, PS(4), PE(5));
    const zPos = .4 - climbU * 2.2;
    const becomeSalih = !isHook && t >= P(5, .45);
    const walker = becomeSalih ? sl : tc;
    walker.show(); walker.place(200.0, 0, zPos, cam, tint);
    walker.draw({
      expr: becomeSalih ? 'focused' : 'worried',
      look: .15,
      sweat: !becomeSalih && !isHook ? .85 : 0,
      blink: bl(4, P(4, .5), P(5, .45)),
      bob: -Math.abs(Math.sin(t * 7.5)) * 10,
      lean: 6,
      armL: [24 + Math.sin(t * 7.5) * 18, 12],
      armR: [24 - Math.sin(t * 7.5) * 18, 12],
      lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    walker.castFrom(dyn.dSun, true);
  } else {
    // ---- SET 3: ZİRVEDEKİ KUYU & KENDİ YANSIMASI (P01 sonu + P06-P10)
    const isHook = t < PS(2);
    const pushU = isHook ? 1 : ramp(t, P(6, .42), P(6, .74));
    dyn.mill.position.x = pushU * 1.12;
    dyn.mill.rotation.y = pushU * .8;
    dyn.water.rotation.z = Math.sin(t * 1.6) * .04;

    const showMirror = isHook || (t >= P(7, .45) && t < PS(9) + .1);
    if (showMirror) {
      const mSc = isHook ? 1 : ramp(t, P(7, .45), P(7, .82)) * (1 - ramp(t, PS(9) - .15, PS(9) + .15));
      dyn.mirror.visible = mSc > .01;
      dyn.mirror.scale.setScalar(Math.max(.001, mSc));
      dyn.mirror.position.set(299.62 - 300, 1.56 + Math.sin(t * 2.8) * .025, -.42);
      dyn.mirror.lookAt(cam.position);
    }

    if (!isHook) {
      const pushing = t >= P(6, .32) && t < P(6, .80);
      const shocked = t >= P(7, .42) && t < P(8, .85);
      const smiling = t >= P(8, .85);
      // Salih kuyunun hemen sağ-önünde durur (P07-P08'de sol üstte büyük su yansımasıyla yan yana net görünür!)
      sl.show(); sl.place(300.56, 0, -.62, cam, tint);
      sl.draw({
        expr: smiling ? (t >= PS(10) ? 'proud' : 'smile') : shocked ? 'surprised' : pushing ? 'focused' : 'neutral',
        look: smiling && t >= PS(10) ? 0 : -.75,
        lookY: shocked ? .25 : 0,
        mouth: talk(P(8, .55), PE(8)),
        sweat: pushing ? .9 : 0,
        blink: bl(5, P(6, .75), P(7, .45), PS(9), PS(10)),
        armL: pushing ? [98, 25] : smiling ? [52, 42] : [26, 18],
        armR: pushing ? [85, 25] : [20, 14],
        lean: pushing ? -12 : shocked ? -6 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .22 }
      });
      sl.castFrom(dyn.kSun, true);
    } else {
      // Kanca 4. karede kuyu + büyük yansıma madalyonu tam merkezde!
      dyn.mirror.position.set(0, 1.48, -.52);
    }
  }

  for (const s of [fx.snow, fx.motes]) s.update(t);

  // Göz almayan, yumuşak açık gündüz renk düzeltmesi (bloom: 0.16-0.18!)
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'carsi') {
    look = { ...focusOn(V(0, 1.25, -.75), 3.5, 4.5), sat: 1.12, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c2d8ea', .012);
  } else if (here === 'dag') {
    look = { ...focusOn(V(200.0, 1.2, -.9), 3.5, 4.5), sat: 1.10, lift: [.05, .06, .075], bloom: .16, vignette: .11 };
    C.scene.fog = new THREE.FogExp2('#c6daf0', .014);
  } else {
    look = { ...focusOn(V(300.1, 1.3, -.7), 3.5, 4.8), sat: 1.13, lift: [.05, .055, .07], bloom: .17, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#c4d8ec', .011);
  }
  look.tint = [.96, .96, .97];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
