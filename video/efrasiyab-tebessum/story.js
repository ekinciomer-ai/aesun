// Efrâsiyâb'ın Hikâyeleri: Ölüm'ün Bin Yıllık Mührünün Kırılması ve İlk Tebessümü — yumurta kafa stili (AÇIK TEMA, göz almayan mat ışık).
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler (x ekseninde ayrı; sert kesme yok, süzülme + whip pan):
//   oda    (x=0)   Aydınlık ahşap ev odası (Anadolu kilimi, sedir, geniş ikindi penceresi, şakalar ve taş gibi Azrail)
//   antre  (x=200) Güneşli ev girişi ve pabuçluk (torunun Azrail'in siyah pabuçlarını kaçırdığı sahne)
//   damla  (x=300) İkindi penceresi önü, düşen berrak gözyaşı, çocukluk cenneti madalyonu ve Azrail'in ilk tebessümü!
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'efrasiyab-tebessum';
export const FPS = 30;
export let DUR = 44;
export const CUES = [];
export const LOOK = {
  azrail: {
    headW: 256, headH: 248, shade: '#c8c6e0',
    body: 'robe', cloth: '#202634', clothDark: '#10141e',
    trim: '#5b6a84', collar: false,
    hat: 'kulah', hatColor: '#161a24',
    bodyW: 204, height: 1.96
  },
  dede: {
    headW: 262, headH: 246,
    hat: 'kulah', hatColor: '#7a5842',
    beard: '#e4dfd6', beardLen: .78,
    cloth: '#6c6848', clothDark: '#46442c',
    buttons: '#3a3624', pocket: true, collar: true,
    bodyW: 204, height: 1.68
  },
  kiz: {
    headW: 262, headH: 244,
    longHair: '#684030', hairLen: 220,
    blush: '#f09c9c',
    cloth: '#c65c44', pattern: 'hstripes', stripe: '#823426',
    skirt: '#527eb0', boots: '#7c4c2c',
    collar: false, bodyW: 172, drop: 120, height: 1.08
  },
  cocuk: {
    headW: 262, headH: 244,
    blush: '#ef9e9e',
    cloth: '#588254', pattern: 'hstripes', stripe: '#345432',
    scarf: '#c87e32', scarfY: 6,
    boots: '#5a3c28', collar: false,
    bodyW: 176, drop: 110, height: 1.16
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

function plasterTex(base = '#d4cab8', seed = 41) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 480, 28, .13, seed, .16);
  return tx(c, [2, 1]);
}

// sıcak Anadolu kilimi dokusu
function kilimTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#a84438'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#dfd2b8'; g.lineWidth = 18; g.strokeRect(24, 24, 464, 464);
  g.strokeStyle = '#38587a'; g.lineWidth = 10; g.strokeRect(52, 52, 408, 408);
  // geometrik baklava desenleri
  for (const [cx, cy] of [[256, 150], [256, 256], [256, 362]]) {
    g.fillStyle = '#d4a444'; g.beginPath();
    g.moveTo(cx, cy - 42); g.lineTo(cx + 68, cy); g.lineTo(cx, cy + 42); g.lineTo(cx - 68, cy); g.closePath(); g.fill();
    g.fillStyle = '#2e5874'; g.beginPath();
    g.moveTo(cx, cy - 22); g.lineTo(cx + 34, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 34, cy); g.closePath(); g.fill();
  }
  return tx(c);
}

// aydınlık ikindi / gün batımı başlangıcı pencere manzarası (yumuşak pastel, göz almaz)
function afternoonSkyTex(warm = false) {
  const w = 1024, h = 640, [c, g] = cnv(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h * .75);
  if (warm) {
    sky.addColorStop(0, D('#6c92c8')); sky.addColorStop(.52, D('#c4a4b8')); sky.addColorStop(1, D('#e6bd88'));
  } else {
    sky.addColorStop(0, D('#68a0d6')); sky.addColorStop(.55, D('#9fc8e8')); sky.addColorStop(1, D('#d4e4f0'));
  }
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const R = rng(warm ? 82 : 81);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = D(warm ? '#f0d8be' : '#e8f0f8', .52);
    g.beginPath(); g.ellipse(R() * w, h * (.16 + R() * .26), 75 + R() * 110, 18 + R() * 14, 0, 0, 6.29); g.fill();
  }
  // uzak Anadolu evleri ve serviler
  const y0 = h * .72;
  g.fillStyle = D(warm ? '#6c6480' : '#6c84a4');
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, y0);
  for (let x = 0; x <= w; x += 48) {
    const bh = 18 + R() * 44;
    g.lineTo(x, y0 - bh); g.lineTo(x + 40, y0 - bh);
  }
  g.lineTo(w, h); g.closePath(); g.fill();
  // servi ağaçları
  g.fillStyle = D(warm ? '#4a5a52' : '#4a7256');
  for (const cx of [140, 210, 760, 840]) {
    g.beginPath(); g.ellipse(cx, y0 - 44, 15, 52, 0, 0, 6.29); g.fill();
  }
  return tx(c);
}

// Berrak Gözyaşı Damlası Madalyonu — içinde yemyeşil güneşli ÇOCUKLUK CENNETİ!
function teardropParadiseTex() {
  const [c, g] = cnv(512, 512);
  g.clearRect(0, 0, 512, 512);
  // Damla biçimi (clip)
  const dropPath = () => {
    g.beginPath();
    g.moveTo(256, 26);
    g.bezierCurveTo(368, 170, 444, 250, 444, 332);
    g.arc(256, 332, 188, 0, Math.PI, false);
    g.bezierCurveTo(68, 250, 144, 170, 256, 26);
    g.closePath();
  };
  g.save(); dropPath(); g.clip();
  // İçeride sıcak güneşli çocukluk bahçesi!
  const sky = g.createLinearGradient(0, 26, 0, 350);
  sky.addColorStop(0, '#78b8e6'); sky.addColorStop(.65, '#bfe2f5'); sky.addColorStop(1, '#f4e6c0');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 512);
  // yumuşak güneş
  g.fillStyle = '#f8df96'; g.beginPath(); g.arc(325, 195, 42, 0, 6.29); g.fill();
  // yeşil çimen tepesi
  g.fillStyle = '#6da658'; g.beginPath(); g.ellipse(256, 445, 250, 145, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#5a9248'; g.beginPath(); g.ellipse(160, 470, 200, 115, 0, Math.PI, 0); g.fill();
  // çocukluk ağacı ve salıncak
  g.fillStyle = '#785032'; g.fillRect(168, 235, 24, 125);
  g.fillStyle = '#4e8a4a';
  g.beginPath(); g.arc(180, 225, 58, 0, 6.29); g.arc(224, 240, 44, 0, 6.29); g.arc(138, 242, 42, 0, 6.29); g.fill();
  // salıncak ipleri & oturağı
  g.strokeStyle = '#5e3c22'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(212, 265); g.lineTo(212, 336); g.moveTo(238, 265); g.lineTo(238, 336); g.stroke();
  g.fillStyle = '#a46432'; g.fillRect(204, 334, 42, 10);
  // papatyalar & kelebekler
  for (const [fx, fy, col] of [[126, 395, '#f8f2dc'], [166, 412, '#f2c84a'], [270, 388, '#f8f2dc'], [325, 405, '#e8889a'], [365, 385, '#f2c84a'], [220, 425, '#f8f2dc']]) {
    g.fillStyle = col; g.beginPath(); g.arc(fx, fy, 9, 0, 6.29); g.fill();
    g.fillStyle = '#d89a24'; g.beginPath(); g.arc(fx, fy, 3.5, 0, 6.29); g.fill();
  }
  // damla cam parlaklığı
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.beginPath(); g.ellipse(175, 190, 26, 56, -.45, 0, 6.29); g.fill();
  g.restore();
  // berrak mavi dış hat
  g.strokeStyle = '#4c88bc'; g.lineWidth = 14; dropPath(); g.stroke();
  g.strokeStyle = PLUM; g.lineWidth = 5; dropPath(); g.stroke();
  return tx(c);
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

// ---------------------------------------------------------------- SET 1: AYDINLIK AHŞAP EV ODASI (x = 0)
function buildOda(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#9e724a', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const kilim = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), painted(kilimTex()));
  kilim.rotation.x = -Math.PI / 2; kilim.position.set(0, .012, -.6); g.add(kilim);

  const wallMat = painted(plasterTex('#d4cab8', 41));
  const lambriMat = painted(woodTex({ base: '#7c5234', plank: 34, rep: [4, 1] }));
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); backWall.position.set(0, 2.6, -3.2); g.add(backWall);
  const lambri = new THREE.Mesh(new THREE.BoxGeometry(12, 1.05, .08), lambriMat); lambri.position.set(0, .525, -3.14); g.add(lambri);
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideL.rotation.y = Math.PI / 2; sideL.position.set(-4.0, 2.6, 0); g.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideR.rotation.y = -Math.PI / 2; sideR.position.set(4.0, 2.6, 0); g.add(sideR);

  // geniş gündüz/ikindi penceresi
  const winDay = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.85), new THREE.MeshBasicMaterial({ map: afternoonSkyTex(false) }));
  winDay.position.set(0, 2.15, -3.12); winDay.userData.noShadow = true; g.add(winDay);
  const frameMat = flat('#5c3c24');
  for (const [fx, fy, fw, fh] of [[0, 3.09, 2.98, .1], [0, 1.21, 2.98, .12], [-1.44, 2.15, .1, 1.98], [1.44, 2.15, .1, 1.98], [0, 2.15, .07, 1.85], [0, 2.15, 2.8, .07]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, .1), frameMat); b.position.set(fx, fy, -3.07); g.add(b);
  }
  // arka-solda ahşap sedir ve kırmızı minderler
  const sedir = new THREE.Mesh(new THREE.BoxGeometry(2.0, .44, .75), painted(woodTex({ base: '#784c2c' }))); sedir.position.set(-1.35, .22, -2.55); g.add(sedir);
  const minder = new THREE.Mesh(new THREE.BoxGeometry(1.92, .12, .68), flat('#b4483c')); minder.position.set(-1.35, .50, -2.55); g.add(minder);

  const L = new THREE.Group();
  const hemi = new THREE.HemisphereLight('#c4def5', '#96826c', 1.78); L.add(hemi);
  const dir = [.35, -.72, -.58]; dyn.oSun = V(...dir).normalize();
  const s = sun('#ffe0b2', 2.05, dir, [0, 1, -.7], { ext: 6 }); L.add(s); L.add(s.target);
  dyn.oHemi = hemi; dyn.oKey = s;
  scene.add(L); sets.oda = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: EV GİRİŞİ / PABUÇLUK (x = 200)
function buildAntre(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#a67b52', plank: 38, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), painted(plasterTex('#cfc4b2', 52)));
  wall.position.set(0, 2.6, -2.6); g.add(wall);
  // ahşap sokak kapısı
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.45, .14), painted(woodTex({ base: '#6a4226' })));
  door.position.set(0, 1.225, -2.50); g.add(door);
  // ahşap pabuçluk rafı
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.15, .52, .38), painted(woodTex({ base: '#845432' })));
  rack.position.set(1.25, .26, -2.25); g.add(rack);

  // Azrail'in kapıdaki iki siyah büyük pabucu (torun bunları kapıp saklar!)
  const shoes = new THREE.Group(); shoes.position.set(.25, .08, -.75); g.add(shoes);
  const shMat = flat('#1e222c');
  for (const sx of [-.14, .14]) {
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(.16, .12, .34), shMat); s1.position.set(sx, 0, 0); shoes.add(s1);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), shMat); toe.position.set(sx, -.01, .16); shoes.add(toe);
  }
  dyn.shoes = shoes;

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c4def5', '#96826c', 1.78));
  const dir = [-.34, -.72, -.60]; dyn.aSun = V(...dir).normalize();
  const s = sun('#ffe2b4', 2.05, dir, [200, 1, -.8], { ext: 6 }); L.add(s); L.add(s.target);
  scene.add(L); sets.antre = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: İKİNDİ PENCERESİ & GÖZYAŞI DAMLASI (x = 300)
function buildDamla(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#9e724a', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const kilim = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), painted(kilimTex()));
  kilim.rotation.x = -Math.PI / 2; kilim.position.set(0, .012, -.6); g.add(kilim);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), painted(plasterTex('#d4c8b4', 71)));
  wall.position.set(0, 2.6, -3.1); g.add(wall);
  const lambri = new THREE.Mesh(new THREE.BoxGeometry(12, 1.05, .08), painted(woodTex({ base: '#7c5234', plank: 34, rep: [4, 1] })));
  lambri.position.set(0, .525, -3.04); g.add(lambri);

  // sıcak ikindi/gün batımı penceresi (pastel mor-altın gök, göz almaz!)
  const winWarm = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.95), new THREE.MeshBasicMaterial({ map: afternoonSkyTex(true) }));
  winWarm.position.set(0, 2.15, -3.02); winWarm.userData.noShadow = true; g.add(winWarm);
  const frameMat = flat('#5c3c24');
  for (const [fx, fy, fw, fh] of [[0, 3.14, 3.18, .1], [0, 1.16, 3.18, .12], [-1.54, 2.15, .1, 2.08], [1.54, 2.15, .1, 2.08], [0, 2.15, .07, 1.95], [0, 2.15, 3.0, .07]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, .1), frameMat); b.position.set(fx, fy, -2.97); g.add(b);
  }

  // P06'da kızın yanağından düşen berrak 3B damla
  const tear = new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 12), flat('#7cc2ee'));
  tear.scale.set(.85, 1.35, .85); tear.visible = false; g.add(tear);
  dyn.tear = tear;

  // P07-P08'de yükselen büyük Gözyaşı Damlası Madalyonu (içinde güneşli çocukluk cenneti!)
  const paradise = new THREE.Mesh(new THREE.PlaneGeometry(.84, .84), new THREE.MeshBasicMaterial({ map: teardropParadiseTex(), transparent: true, alphaTest: .05, depthWrite: false }));
  paradise.position.set(-.32, 1.48, -.42); paradise.visible = false; paradise.userData.noShadow = true; g.add(paradise);
  dyn.paradise = paradise;

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#d6ccf0', '#967c68', 1.72));
  const dir = [.34, -.68, -.64]; dyn.wSun = V(...dir).normalize();
  const s = sun('#ffd6a0', 2.1, dir, [300, 1, -.7], { ext: 6 }); L.add(s); L.add(s.target);
  scene.add(L); sets.damla = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU
function cameraPath() {
  const k = [
    // P01 KANCA (4 görüntü): odaya giren taş yüzlü Azrail -> pabuç kaçıran torun -> kahkahalı çocuklar -> gözyaşı damlası & tebessüm
    { t: 0,           pos: [0, 1.44, 3.25],     look: [0, 1.38, -.8],     fov: 47, creep: .24, drift: .03 },
    { t: P(1, .28),   dur: .30, move: 'whip', pos: [200.05, 1.28, 3.45], look: [200.05, 1.10, -.75], fov: 48, creep: .24 },
    { t: P(1, .56),   dur: .30, move: 'whip', pos: [-.05, 1.25, 3.15], look: [-.05, 1.05, -.65], fov: 48, creep: .26 },
    { t: P(1, .82),   dur: .30, move: 'whip', pos: [300.05, 1.48, 3.15], look: [300.05, 1.40, -.58], fov: 47, creep: .24 },
    // P02 "Bakın," (antre): Cezzar Dede + Azrail + pabuçları kaçıran yaramaz torun
    { t: PS(2) + .16, dur: .30, move: 'whip', pos: [200.0, 1.34, 3.45], look: [200.0, 1.18, -.75], fov: 48, creep: .24 },
    { t: PE(2),       dur: Math.max(.4, PE(2) - PS(2) - .2), pos: [200.22, 1.22, 2.85], look: [200.25, 1.02, -.75], fov: 47, creep: .24 },
    // P03 Whip ile aydınlık oda: torunlar zıplayıp şaka yapar, kahkahalar!
    { t: PS(3) + .16, dur: .30, move: 'whip', pos: [-.05, 1.34, 3.45], look: [-.05, 1.12, -.65], fov: 49, creep: .25 },
    { t: PE(3),       dur: Math.max(.4, PE(3) - PS(3) - .2), pos: [-.18, 1.28, 2.85], look: [-.15, 1.08, -.65], fov: 47, creep: .24 },
    // P04 Azrail taş gibi kıpırtısız (yakın plan)
    { t: PS(4) + .16, dur: .42, pos: [.45, 1.56, 2.35], look: [.52, 1.52, -.85], fov: 44, creep: .22 },
    { t: PE(4),       dur: Math.max(.4, PE(4) - PS(4) - .2), pos: [.48, 1.62, 1.95], look: [.52, 1.58, -.85], fov: 42, creep: .20 },
    // P05 Whip ile ikindi penceresi (set 3): şakalar tükenir, çocuklar dedeye sarılır
    { t: PS(5) + .16, dur: .30, move: 'whip', pos: [299.95, 1.32, 3.35], look: [299.95, 1.14, -.65], fov: 48, creep: .22 },
    { t: PE(5),       dur: Math.max(.4, PE(5) - PS(5) - .2), pos: [299.78, 1.18, 2.75], look: [299.78, 1.06, -.65], fov: 46, creep: .20 },
    // P06 En küçük kız torundan düşen tek bir gözyaşı (yakın plan)
    { t: PS(6) + .18, dur: .42, pos: [299.72, 1.02, 1.95], look: [299.72, .92, -.55], fov: 43, creep: .22 },
    // P07 Azrail eğilir -> Gözyaşı Damlası Madalyonunda çocukluk cenneti parlar!
    { t: PS(7) + .16, dur: .40, pos: [300.06, 1.48, 3.25], look: [300.06, 1.38, -.60], fov: 48, creep: .22 },
    { t: PE(7),       dur: Math.max(.4, PE(7) - PS(7) - .2), pos: [300.06, 1.50, 3.05], look: [300.06, 1.40, -.60], fov: 47, creep: .20 },
    // P08 Bin yıllık taş mühür çatlar... ve Azrail ilk kez gülümser!
    { t: PS(8) + .16, dur: .38, pos: [300.28, 1.58, 2.25], look: [300.38, 1.54, -.72], fov: 44, creep: .22 },
    { t: PE(8),       dur: Math.max(.4, PE(8) - PS(8) - .2), pos: [300.34, 1.60, 1.95], look: [300.42, 1.56, -.72], fov: 42, creep: .18 },
    // P09 Dede ve torunlar hayret ve sevinçle gülümseyen Azrail'e bakar
    { t: PS(9) + .18, dur: .45, pos: [300.0, 1.38, 3.35], look: [300.0, 1.24, -.68], fov: 48, creep: .20 },
    // P10 Geniş sıcak ikindi finali: yavaşça geri çekilme
    { t: DUR,         dur: Math.max(.6, DUR - PS(10) + .1), pos: [300.0, 1.52, 4.35], look: [300.0, 1.26, -.9], fov: 51, creep: .16 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(8, .28), .65);  // taş mührün yumuşak çatlama darbesi
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
  scene.background = new THREE.Color('#a4c8e6');

  buildOda(scene);
  buildAntre(scene);
  buildDamla(scene);

  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // P08 mühür kırılırken & tebessümde süzülen sıcak altın ışık zerreleri
  fx.spark = new Smoke(scene, { color: '#f4d680', maxPoints: 140, H: ctx.H, near: 1.3 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.spark.wisps.push({
    n: 75, size: .042, alpha: .50, speed: .24,
    on: t => where(t) === 'damla' && t >= P(7, .35),
    path: (u, t, i) => [
      300.1 + (hash(i, 1) - .5) * 2.1,
      .85 + u * 1.75,
      -.6 + (hash(i, 3) - .5) * 1.2
    ]
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(P(1, .28) - .04, 'whoosh');
  cue(PS(3) + .12, 'whoosh');
  cue(PS(5) + .12, 'whoosh');
  cue(P(1, .56) - .04, 'whoosh');
  cue(P(1, .82) - .04, 'whoosh');
  cue(PS(2) + .12, 'whoosh');

  cue(P(2, .62), 'steps', { dur: .9 });
  cue(P(6, .45), 'water');
  cue(P(7, .25), 'chime');
  cue(P(8, .26), 'shimmer');
  cue(PE(10) - .25, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) {
  if (t < P(1, .26)) return 'oda';
  if (t < P(1, .54)) return 'antre';
  if (t < P(1, .80)) return 'oda';
  if (t < PS(2) + .14) return 'damla';
  if (t < PS(3) + .14) return 'antre';
  if (t < PS(5) + .14) return 'oda';
  return 'damla';
}
function camSet(cam) { return cam.position.x > 250 ? 'damla' : cam.position.x > 100 ? 'antre' : 'oda'; }

const WARM = '#f2cc92', COOL = '#cfd6ec';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['oda', 'antre', 'damla']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  dyn.tear.visible = false;
  dyn.paradise.visible = false;

  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const az = cast.azrail, dd = cast.dede, kz = cast.kiz, cc = cast.cocuk;
  const tint = [.91, .91, .91];

  if (here === 'antre') {
    const isHook = t < PS(2);
    const grabU = isHook ? .75 : ramp(t, P(2, .45), PE(2));
    // Cezzar Dede sol, Azrail orta-arka, yaramaz erkek torun sağdan pabuçları kapıp kaçar!
    dd.show(); dd.place(199.48, 0, -.75, cam, tint);
    dd.draw({
      expr: 'smile', look: .45, blink: bl(1, PS(2) + .3),
      armR: [32, 22], armL: [18, 12],
      lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    dd.castFrom(dyn.aSun, true);

    az.show(); az.place(200.0, 0, -1.25, cam, tint);
    az.draw({
      expr: 'neutral', look: .25, blink: 0,
      armL: [14, 8], armR: [14, 8],
      lit: 1, shade: '#c2c8e2', rim: { color: WARM, a: .18 }
    });
    az.castFrom(dyn.aSun, true);

    const cx = 200.44 + grabU * .55;
    cc.show(); cc.place(cx, 0, -.58, cam, tint);
    cc.draw({
      expr: 'grin', look: -.55, blink: bl(2, P(2, .5)),
      armL: [65, 35], armR: [65, 35],
      bob: -Math.abs(Math.sin(t * 14)) * 10,
      lean: grabU * 10,
      lit: 1, shade: COOL, rim: { color: WARM, a: .2 }
    });
    cc.castFrom(dyn.aSun, true);

    // Pabuçlar çocuğun elinde uçar!
    dyn.shoes.position.set(cx - 200 - .18, .08 + grabU * .52, -.52);
    dyn.shoes.rotation.z = grabU * .35;
  } else if (here === 'oda') {
    const isHookA = t < P(1, .28);
    const joking = (t >= P(1, .52) && t < P(1, .82)) || (t >= PS(3) && t < PS(4));

    // Azrail (sağda kıpırtısız taş gibi!)
    az.show(); az.place(isHookA ? 0 : .52, 0, -.85, cam, tint);
    az.draw({
      expr: 'neutral', look: isHookA ? 0 : -.45, blink: 0,
      armL: [14, 8], armR: [14, 8],
      lit: 1, shade: '#c2c8e2', rim: { color: WARM, a: .18 }
    });
    az.castFrom(dyn.oSun, true);

    if (!isHookA) {
      // Cezzar Dede solda-arkada
      dd.show(); dd.place(-.68, 0, -1.05, cam, tint);
      dd.draw({
        expr: 'smile', look: .45, blink: bl(3, PS(3)),
        armR: [24, 16], armL: [18, 12],
        lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      dd.castFrom(dyn.oSun, true);

      // Zıplayıp şaka yapan iki torun!
      cc.show(); cc.place(-.34, joking ? Math.abs(Math.sin(t * 9.5)) * .22 : 0, -.52, cam, tint);
      cc.draw({
        expr: joking ? 'laugh' : 'worried', look: .6,
        laughMarks: joking ? .95 : 0, mouth: joking ? .75 : 0,
        blink: bl(4, PS(3) + .4),
        armL: joking ? [135, 25] : [22, 16], armR: joking ? [135, 25] : [22, 16],
        lean: joking ? Math.sin(t * 10) * 14 : 0,
        lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      cc.castFrom(dyn.oSun, true);

      kz.show(); kz.place(.02, joking ? Math.abs(Math.sin(t * 9.5 + 1.4)) * .18 : 0, -.48, cam, tint);
      kz.draw({
        expr: joking ? 'laugh' : 'worried', look: .5,
        laughMarks: joking ? .9 : 0, mouth: joking ? .7 : 0,
        blink: bl(5, PS(3) + .8),
        armL: joking ? [125, 30] : [20, 14], armR: joking ? [125, 30] : [20, 14],
        lean: joking ? -Math.sin(t * 9) * 12 : 0,
        lit: -1, shade: COOL, rim: { color: WARM, a: .2 }
      });
      kz.castFrom(dyn.oSun, true);
    }
  } else {
    // ---- SET 3: İKİNDİ PENCERESİ, GÖZYAŞI DAMLASI & AZRAİL'İN İLK TEBESSÜMÜ!
    const isHookD = t < PS(2);
    const tearFall = !isHookD && t >= PS(6) && t < PS(7);
    const showPara = isHookD || (t >= P(7, .12) && t < P(8, .22));
    const smiled = isHookD || t >= P(8, .28);
    const happyEnd = !isHookD && t >= PS(9);

    // Cezzar Dede (sol-arka)
    if (!isHookD) {
      dd.show(); dd.place(299.38, 0, -.82, cam, tint);
      dd.draw({
        expr: happyEnd ? 'grin' : 'worried', look: .55,
        blink: bl(6, PS(5), PS(9)),
        armR: happyEnd ? [72, 30] : [35, 25], armL: [20, 14],
        lit: -1, shade: COOL, rim: { color: WARM, a: .24 }
      });
      dd.castFrom(dyn.wSun, true);

      // Erkek torun (dedenin yanında)
      cc.show(); cc.place(299.18, 0, -.52, cam, tint);
      cc.draw({
        expr: happyEnd ? 'laugh' : 'worried', look: .65,
        laughMarks: happyEnd ? .85 : 0,
        blink: bl(7, PS(9)),
        armR: happyEnd ? [125, 25] : [22, 16], armL: [20, 14],
        lit: -1, shade: COOL, rim: { color: WARM, a: .24 }
      });
      cc.castFrom(dyn.wSun, true);

      // En küçük kız torun (P06'da yanağından damla düşer -> P09'da sevinçle güler!)
      kz.show(); kz.place(299.72, 0, -.55, cam, tint);
      kz.draw({
        expr: happyEnd ? 'laugh' : 'worried', look: happyEnd ? .55 : .35,
        laughMarks: happyEnd ? .9 : 0,
        sweat: tearFall ? 1 : 0,
        blink: bl(8, PS(6), PS(9)),
        armR: happyEnd ? [120, 25] : [20, 16], armL: happyEnd ? [115, 25] : [20, 16],
        lit: -1, shade: COOL, rim: { color: WARM, a: .24 }
      });
      kz.castFrom(dyn.wSun, true);

      if (tearFall) {
        const tf = ramp(t, P(6, .35), PE(6));
        dyn.tear.visible = true;
        dyn.tear.position.set(-.20, .72 - tf * .64, -.44);
      }
    }

    // Azrail (sağda — P07'de eğilip damlaya bakar, P08'de BİN YIL SONRA İLK KEZ GÜLÜMSER!)
    const leanDrop = !isHookD && t >= PS(7) && t < P(8, .55) ? ramp(t, PS(7), P(7, .5)) : 0;
    az.show(); az.place(300.42, 0, -.72, cam, tint);
    az.draw({
      expr: smiled ? (t >= P(8, .75) || happyEnd ? 'proud' : 'smile') : 'neutral',
      look: smiled && t >= PS(10) ? -.2 : -.65,
      blink: smiled ? bl(9, P(8, .28), PS(10)) : 0,
      armL: smiled ? [42, 32] : [16, 10],
      armR: [16, 10],
      lean: -leanDrop * 10,
      lit: 1, shade: smiled ? '#d4d0ec' : '#c0c6e0', rim: { color: WARM, a: smiled ? .36 : .2 }
    });
    az.castFrom(dyn.wSun, true);

    // Gözyaşı Damlası Madalyonu (içinde güneşli çocukluk cenneti!)
    if (showPara) {
      const pSc = isHookD ? 1 : ramp(t, P(7, .12), P(7, .48)) * (1 - ramp(t, PS(8) - .12, P(8, .20)));
      dyn.paradise.visible = pSc > .01;
      dyn.paradise.scale.setScalar(Math.max(.001, pSc));
      dyn.paradise.position.set(-.34, 1.48 + Math.sin(t * 2.6) * .03, -.46);
      dyn.paradise.lookAt(cam.position);
    }
  }

  for (const s of [fx.spark]) s.update(t);

  // Göz almayan, yumuşak açık ikindi renk düzeltmesi (bloom: 0.16-0.18!)
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'oda') {
    look = { ...focusOn(V(0, 1.2, -.7), 3.5, 4.5), sat: 1.12, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#ccc6ba', .010);
  } else if (here === 'antre') {
    look = { ...focusOn(V(200.1, 1.1, -.75), 3.5, 4.5), sat: 1.12, lift: [.05, .055, .065], bloom: .16, vignette: .10 };
    C.scene.fog = new THREE.FogExp2('#ccc4b8', .010);
  } else {
    look = { ...focusOn(V(300.1, 1.35, -.65), 3.5, 4.6), sat: 1.14, lift: [.055, .055, .07], bloom: .18, vignette: .11 };
    C.scene.fog = new THREE.FogExp2('#d0c6c2', .010);
  }
  look.tint = [.96, .96, .97];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
