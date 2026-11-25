// En Garip Hastalıklar #07 (YENİ ÖZGÜN TASARIM): Yabancı Aksan Sendromu (1941 Oslo — Astrid & Dr. Monrad-Krohn)
// ESKİ 3-SET ŞABLONU YOK! 3 Tamamen Özgün 3B Mekân + Hareketli Karakterler + Vinç & Takip Kameraları:
//   SET 1 (x = 0):   1941 KARLI OSLO SOKAĞI & SICAK FIRIN VİTRİNİ (Arnavut kaldırımı, renkli binalar, sokak lambaları, kar!)
//   SET 2 (x = 200): 1947 KONSER SALONU & DEV KUYRUKLU PİYANO SAHNESİ (kırmızı kadife perde, 14 tuşlu dev piyano, altın notalar!)
//   SET 3 (x = 300): 1947 OSLO ÜNİVERSİTESİ TARİHİ KÜTÜPHANE SALONU (meşe kitaplıklar, güneş huzmeleri, açık 1947 dergisi, gramofon!)
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'yabanci-aksan';
export const FPS = 30;
export let DUR = 41.5;
export const CUES = [];
export const LOOK = {
  astrid: {
    headW: 256, headH: 244,
    longHair: '#c89a48', hairLen: 235,
    cloth: '#3e6e8c', clothDark: '#26485e',
    skirt: '#7c3442', boots: '#3a2b22',
    collar: true, buttons: '#e4d8be',
    bodyW: 192, height: 1.63,
  },
  firinci: {
    headW: 264, headH: 248,
    mustache: '#5c3c28',
    cloth: '#a8643a', clothDark: '#6e3c1e',
    pattern: 'hstripes', stripe: '#6e3c1e',
    scarf: '#d8a63c', scarfY: 6,
    collar: false, bodyW: 204, height: 1.68,
  },
  krohn: {
    headW: 270, headH: 252,
    mustache: '#7a7e86',
    cloth: '#e4e0d4', clothDark: '#b4b0a4',
    trim: '#7e364c', buttons: '#482230',
    pocket: true, collar: true,
    bodyW: 214, height: 1.77,
  },
};

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
let C, PT = {}, cast = {}, sets = {}, fx = {}, dyn = {};
const P = (k, f = 0) => { const p = PT['P' + String(k).padStart(2, '0')]; return p.s + (p.e - p.s) * f; };
const PS = k => P(k, 0), PE = k => P(k, 1);

// ---------------------------------------------------------------- boyalı prosedürel dokular
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tx(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; }
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function dab(g, w, h, base, n, r, amt, seed, a0 = .24) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .22;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

// Karlı Arnavut kaldırımı (Set 1 Oslo caddesi)
function cobbleSnowTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#566476'; g.fillRect(0, 0, 512, 512);
  const R = rng(101);
  for (let y = 0; y < 512; y += 32) {
    const off = (y / 32) % 2 ? 22 : 0;
    for (let x = -32; x < 544; x += 48) {
      g.fillStyle = sh('#6d7c90', .84 + R() * .32);
      g.beginPath(); g.roundRect(x + off + 3, y + 3, 42, 26, 6); g.fill();
    }
  }
  // kenarlarda ve taş aralarında yumuşak beyaz kar lekeleri
  dab(g, 512, 512, '#dce8f6', 160, 26, .08, 102, .30);
  return tx(c, [5, 5]);
}

// 1941 Fırın tabelası: BAKERI · OSLO 1941
function bakerySignTex() {
  const [c, g] = cnv(640, 180);
  g.fillStyle = '#3c1e16'; g.fillRect(0, 0, 640, 180);
  g.strokeStyle = '#e8b658'; g.lineWidth = 10; g.strokeRect(12, 12, 616, 156);
  g.fillStyle = '#ffe6a8'; g.font = '900 58px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BAKERI · 1941', 320, 74);
  g.fillStyle = '#e8b658'; g.font = '700 28px system-ui, sans-serif';
  g.fillText('OSLO FIRINI', 320, 134);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Sıcak ışıklı fırın vitrini (ekmek rafları!)
function bakeryShopWindowTex() {
  const [c, g] = cnv(512, 384);
  const gr = g.createLinearGradient(0, 0, 0, 384);
  gr.addColorStop(0, '#ffdf9a'); gr.addColorStop(.65, '#e89d4e'); gr.addColorStop(1, '#9c5a2c');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  // ahşap raflar + altın ekmek somunları
  for (const ry of [140, 250, 340]) {
    g.fillStyle = '#5a321c'; g.fillRect(16, ry, 480, 16);
    for (let x = 60; x <= 440; x += 95) {
      g.fillStyle = '#c87630'; g.beginPath(); g.ellipse(x, ry - 20, 36, 22, 0, 0, 6.29); g.fill();
      g.strokeStyle = '#f2c478'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x - 14, ry - 28); g.lineTo(x - 4, ry - 14); g.moveTo(x + 6, ry - 28); g.lineTo(x + 16, ry - 14); g.stroke();
    }
  }
  // pencere çıtaları
  g.strokeStyle = '#4a2a18'; g.lineWidth = 14; g.strokeRect(7, 7, 498, 370);
  g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 384); g.stroke();
  return tx(c);
}

// Oslo karlı kış gökyüzü & binalar panoraması (Set 1 açık hava ufku)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function osloWinterSkyTex() {
  const Pn = pano(4096, 1800, 110, -10, 35), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#1b2d4e')); sky.addColorStop(.55, D('#385984')); sky.addColorStop(.88, D('#7ea2c6')); sky.addColorStop(1, D('#b8d0e4'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(105);
  for (let i = 0; i < 12; i++) {
    g.fillStyle = 'rgba(220,235,250,0.22)';
    g.beginPath(); g.ellipse(R() * Pn.w, Pn.Y(8 + R() * 18), 220 + R() * 260, 26 + R() * 18, 0, 0, 6.29); g.fill();
  }
  // karlı tepeler + Oslo çan kulesi silüeti
  const y0 = Pn.Y(0);
  g.fillStyle = D('#283c5c'); g.fillRect(0, y0, Pn.w, Pn.h - y0);
  g.fillStyle = D('#344c70');
  g.beginPath(); g.moveTo(0, y0);
  for (let x = 0; x <= Pn.w; x += 120) g.lineTo(x, y0 - 30 - Math.abs(Math.sin(x * .0025)) * 85 - R() * 25);
  g.lineTo(Pn.w, y0); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(Pn.c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Kırmızı kadife konser perdesi dokusu (Set 2)
function velvetCurtainTex() {
  const [c, g] = cnv(512, 512);
  for (let x = 0; x < 512; x += 4) {
    const shade = .62 + .38 * Math.sin((x / 512) * Math.PI * 14);
    g.fillStyle = sh('#8c1e2e', shade);
    g.fillRect(x, 0, 4, 512);
  }
  return tx(c, [3, 1]);
}

// Kütüphane kitap rafları dokusu (Set 3)
function bookshelfTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#3a2416'; g.fillRect(0, 0, 512, 512);
  const R = rng(303);
  const cols = ['#8c2e32', '#2f5848', '#304b72', '#a87c32', '#6a3854', '#5c4430', '#7e4a2c'];
  for (let row = 0; row < 5; row++) {
    const y0 = row * 102;
    g.fillStyle = '#5e3c24'; g.fillRect(0, y0 + 88, 512, 14);
    let x = 8;
    while (x < 496) {
      const bw = 18 + Math.floor(R() * 18);
      const bh = 64 + Math.floor(R() * 22);
      g.fillStyle = cols[Math.floor(R() * cols.length)];
      g.fillRect(x, y0 + 88 - bh, bw - 2, bh);
      g.fillStyle = 'rgba(255,220,140,0.45)';
      g.fillRect(x + 2, y0 + 88 - bh + 10, bw - 6, 4);
      x += bw;
    }
  }
  return tx(c, [2, 1]);
}

// Açık tıp dergisi: BRAIN · 1947 · DR. MONRAD-KROHN (Set 3 masada!)
function openJournalTex() {
  const [c, g] = cnv(600, 380);
  g.fillStyle = '#f2e8d2'; g.fillRect(0, 0, 600, 380);
  g.strokeStyle = '#c2b08e'; g.lineWidth = 6; g.strokeRect(8, 8, 584, 364);
  g.fillStyle = '#d4c4a2'; g.fillRect(296, 0, 8, 380);
  // Sol sayfa: BRAIN 1947
  g.fillStyle = '#482428'; g.font = '900 42px Georgia, serif'; g.textAlign = 'center';
  g.fillText('BRAIN · 1947', 152, 84);
  g.fillStyle = '#6c3830'; g.font = '700 22px system-ui, sans-serif';
  g.fillText('DR. MONRAD-KROHN', 152, 128);
  g.fillStyle = '#7e6e58';
  for (let y = 170; y <= 310; y += 26) g.fillRect(36, y, 226, 8);
  // Sağ sayfa: ses dalgası kayması çizimi + YABANCI AKSAN
  g.fillStyle = '#283c54'; g.font = '900 26px system-ui, sans-serif';
  g.fillText('YABANCI AKSAN', 448, 84);
  g.strokeStyle = '#d44830'; g.lineWidth = 6; g.beginPath();
  for (let x = 336; x <= 560; x += 6) {
    const u = (x - 336) / 224;
    const y = 200 + Math.sin(u * Math.PI * 8 + .9) * 44 + Math.cos(u * Math.PI * 19) * 14;
    x === 336 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  g.fillStyle = '#38485a'; g.font = '800 24px system-ui, sans-serif';
  g.fillText('~100 VAKA · OSLO', 448, 315);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 3B Müzik notası sprite dokusu (P01 ve P07 havada uçan altın/kırmızı notalar!)
function noteTex(color = '#ffd45c') {
  const [c, g] = cnv(160, 160);
  g.fillStyle = color;
  g.beginPath(); g.ellipse(64, 118, 28, 20, -.35, 0, 6.29); g.fill();
  g.fillRect(84, 34, 12, 84);
  g.beginPath(); g.moveTo(84, 34); g.quadraticCurveTo(132, 46, 124, 82); g.quadraticCurveTo(114, 62, 96, 58); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function shadows(g) {
  g.traverse(o => {
    if (!o.isMesh) return;
    if (o.material.isMeshLambertMaterial) o.receiveShadow = true;
    if (/Box|Cylinder|Sphere|Lathe|Torus|Cone/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
function sun(color, intensity, dir, target, { size = 2048, ext = 11, far = 70 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.copy(V(...target).addScaledVector(V(...dir).normalize(), -26));
  l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(size, size);
  Object.assign(l.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far });
  l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3; return l;
}

// ---------------------------------------------------------------- SET 1: 1941 KARLI OSLO SOKAĞI & FIRIN VİTRİNİ (x = 0)
function buildOsloStreet(scene) {
  const g = new THREE.Group(); scene.add(g);

  // Karlı Arnavut kaldırımlı cadde + karlı kaldırım
  const street = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), painted(cobbleSnowTex()));
  street.rotation.x = -Math.PI / 2; g.add(street);
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(16, .14, 3.6), flat('#cfdbe8'));
  sidewalk.position.set(0, .07, -2.5); g.add(sidewalk);

  // Arka tarafta 3 adet 1940'lar İskandinav binası (ortadaki SICAK FIRIN: BAKERI · 1941!)
  // Sol bina (hardal-toprak Norveç ahşap cephe)
  const bLeft = new THREE.Mesh(new THREE.BoxGeometry(3.8, 5.2, 2.8), flat('#b4864c'));
  bLeft.position.set(-4.1, 2.6, -4.4); g.add(bLeft);
  const roofL = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.5, 4), flat('#dce8f4'));
  roofL.rotation.y = Math.PI / 4; roofL.position.set(-4.1, 5.9, -4.4); g.add(roofL);

  // Orta bina: BAKERI · OSLO 1941 (sıcak kiremit-bordo cephe + çizgili tente + ışıklı ekmek vitrini + ahşap kapı!)
  const bakery = new THREE.Group(); bakery.position.set(.2, 0, -4.2); g.add(bakery);
  const bMain = new THREE.Mesh(new THREE.BoxGeometry(4.6, 5.4, 2.8), flat('#8f4038'));
  bMain.position.set(0, 2.7, 0); bakery.add(bMain);
  // karlı çatı saçakları
  const bSnowRoof = new THREE.Mesh(new THREE.BoxGeometry(4.9, .32, 3.1), flat('#e6f0fa'));
  bSnowRoof.position.set(0, 5.48, 0); bakery.add(bSnowRoof);
  // BAKERI · 1941 tabelası
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .74), new THREE.MeshBasicMaterial({ map: bakerySignTex() }));
  sign.position.set(0, 3.35, 1.44); sign.userData.noShadow = true; bakery.add(sign);
  // Çizgili fırın tentesi
  const awning = new THREE.Mesh(new THREE.BoxGeometry(4.2, .16, 1.15), flat('#d8a63c'));
  awning.rotation.x = .32; awning.position.set(0, 2.68, 1.85); bakery.add(awning);
  const awnSnow = new THREE.Mesh(new THREE.BoxGeometry(4.22, .08, 1.12), flat('#eef5fc'));
  awnSnow.rotation.x = .32; awnSnow.position.set(0, 2.76, 1.85); bakery.add(awnSnow);
  // Işıklı ekmek vitrini (sol yarıda)
  const shopWin = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.42), new THREE.MeshBasicMaterial({ map: bakeryShopWindowTex() }));
  shopWin.position.set(-.88, 1.46, 1.43); shopWin.userData.noShadow = true; bakery.add(shopWin);
  // Fırın kapısı (sağ yarıda — P04'te kapanış hissi!)
  const doorFrm = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.15, .14), flat('#3d2218'));
  doorFrm.position.set(1.12, 1.15, 1.41); bakery.add(doorFrm);
  dyn.shopDoor = new THREE.Mesh(new THREE.BoxGeometry(.96, 1.98, .12), flat('#643924'));
  dyn.shopDoor.position.set(1.12, 1.12, 1.46); bakery.add(dyn.shopDoor);
  // Sıcak fırın vitrin parıltısı
  fx.bakeryGlow = glow(scene, [-.65, 1.55, -2.55], { size: 3.4, color: '#ffbd64', strength: .55 });

  // Sağ bina (kuzey yeşili)
  const bRight = new THREE.Mesh(new THREE.BoxGeometry(3.8, 5.0, 2.8), flat('#466862'));
  bRight.position.set(4.5, 2.5, -4.4); g.add(bRight);

  // 2 Dökme Demir Oslo Sokak Lambası (sol & sağ — sıcak fener ışıklı!)
  for (const [lx, lz] of [[-2.05, -1.35], [2.45, -1.25]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .07, 3.1, 10), flat('#262e38'));
    pole.position.set(lx, 1.55, lz); g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.17, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffe598' }));
    bulb.position.set(lx, 3.18, lz); bulb.userData.noShadow = true; g.add(bulb);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.24, .18, 8), flat('#202630'));
    cap.position.set(lx, 3.38, lz); g.add(cap);
  }
  fx.lampL = glow(scene, [-2.05, 3.18, -1.35], { size: 2.1, color: '#ffd478', strength: .5 });
  fx.lampR = glow(scene, [2.45, 3.18, -1.25], { size: 2.1, color: '#ffd478', strength: .5 });

  // Karlı çam ağacı (sol kenarda derinlik verir)
  const pine = new THREE.Group(); pine.position.set(-2.95, 0, -2.35); g.add(pine);
  const trk = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, .7, 8), flat('#4a3222')); trk.position.y = .35; pine.add(trk);
  for (const [y, r, h] of [[1.05, .82, 1.1], [1.75, .64, .95], [2.35, .44, .78]]) {
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), flat('#2f5246')); c1.position.y = y; pine.add(c1);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * .78, h * .42, 8), flat('#e4effa')); sn.position.y = y + h * .3; pine.add(sn);
  }

  // P01 Kanca: Astrid'in konuşurken havaya yükselen 3B altın-kırmızı notaları (yüzünü asla kapatmaz!)
  const nMatGold = new THREE.MeshBasicMaterial({ map: noteTex('#ffd45c'), transparent: true, side: THREE.DoubleSide });
  const nMatRed = new THREE.MeshBasicMaterial({ map: noteTex('#ff6a44'), transparent: true, side: THREE.DoubleSide });
  dyn.streetNotes = Array.from({ length: 5 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.24, .24), i % 2 ? nMatRed : nMatGold);
    m.userData.noShadow = true; m.visible = false; g.add(m); return m;
  });

  // Açık hava kış gökyüzü silindiri
  const sky = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(osloWinterSkyTex(), { yaw: Math.PI, az: 110 * Math.PI / 180, el: [-10 * Math.PI / 180, 35 * Math.PI / 180], gain: 1.15 })
  );
  sky.material.side = THREE.BackSide; g.add(sky);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#9ec0ea', '#4a5268', 1.85));
  const SUN = [-.38, -.52, -.76]; dyn.sSun = V(...SUN).normalize();
  const key = sun('#ffe0a6', 2.5, SUN, [0, 1, -1], { ext: 10 }); L.add(key); L.add(key.target);
  dyn.bakeryLight = new THREE.PointLight('#ffbd62', 3.2, 9); dyn.bakeryLight.position.set(-.4, 1.9, -2.0); L.add(dyn.bakeryLight);
  scene.add(L); sets.street = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: 1947 KONSER SALONU & DEV KUYRUKLU PİYANO SAHNESİ (x = 200)
function buildConcertHall(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);

  // Sıcak cilalı sahne parkesi
  const stage = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), painted(woodTex({ base: '#8a5c36', plank: 36, rep: [5, 5] })));
  stage.rotation.x = -Math.PI / 2; g.add(stage);

  // Arkada görkemli KIRMIZI KADİFE KONSER PERDESİ + altın sahne sütunları!
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), painted(velvetCurtainTex()));
  curtain.position.set(0, 4.5, -4.6); g.add(curtain);
  for (const px of [-3.6, 3.6]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.26, .30, 8.5, 16), flat('#c89c4a'));
    col.position.set(px, 4.25, -4.2); g.add(col);
  }

  // DEV 3B SİYAH KUYRUKLU PİYANO (sahnenin merkezinde — 12 beyaz + 8 siyah tuşlu, açık kapaklı!)
  dyn.pianoStage = new THREE.Group(); dyn.pianoStage.position.set(.1, 0, -.95); g.add(dyn.pianoStage);
  // Piyano ayakları
  for (const [lx, lz] of [[-1.35, .55], [1.35, .55], [0, -1.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .055, .92, 12), flat('#18161c'));
    leg.position.set(lx, .46, lz); dyn.pianoStage.add(leg);
  }
  // Piyano gövdesi & açık kanat kapağı + parlayan altın teller!
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, .34, 2.0), flat('#1d1a22'));
  body.position.set(0, 1.08, -.25); dyn.pianoStage.add(body);
  const strings = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ color: '#d8a444' }));
  strings.rotation.x = -Math.PI / 2; strings.position.set(0, 1.26, -.45); dyn.pianoStage.add(strings);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(3.05, .07, 1.85), flat('#141218'));
  lid.position.set(-.15, 1.88, -.68); lid.rotation.z = .36; dyn.pianoStage.add(lid);
  const lidProp = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.15, 8), flat('#e0b254'));
  lidProp.position.set(1.1, 1.72, -.55); lidProp.rotation.z = -.24; dyn.pianoStage.add(lidProp);

  // Öne doğru hafif eğik 12 BEYAZ + 8 SİYAH DEV TUŞ (kamera tuşların üstünden kayacak!)
  const kb = new THREE.Group(); kb.position.set(0, 1.06, .88); kb.rotation.x = .28; dyn.pianoStage.add(kb);
  dyn.pWhite = Array.from({ length: 12 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.21, .11, .72), flat('#f6f2ea'));
    m.position.set((i - 5.5) * .235, 0, 0); kb.add(m); return m;
  });
  const blackIdx = [0, 1, 3, 4, 5, 7, 8, 10];
  blackIdx.forEach(i => {
    const bk = new THREE.Mesh(new THREE.BoxGeometry(.12, .13, .44), flat('#15131a'));
    bk.position.set((i - 5.0) * .235, .08, -.14); kb.add(bk);
  });

  // Piyanonun üstünde salınan BÜYÜK ALTIN METRONOM + havaya fırlayan 3B müzik notaları!
  const metBody = new THREE.Mesh(new THREE.ConeGeometry(.24, .58, 4), flat('#6e4024'));
  metBody.rotation.y = Math.PI / 4; metBody.position.set(-1.15, 1.54, .35); dyn.pianoStage.add(metBody);
  dyn.stageMet = new THREE.Mesh(new THREE.BoxGeometry(.035, .66, .035), new THREE.MeshBasicMaterial({ color: '#ffdb66' }));
  dyn.stageMet.position.set(-1.15, 1.74, .52); dyn.stageMet.userData.noShadow = true; dyn.pianoStage.add(dyn.stageMet);

  const nGold = new THREE.MeshBasicMaterial({ map: noteTex('#ffd862'), transparent: true, side: THREE.DoubleSide });
  const nRed = new THREE.MeshBasicMaterial({ map: noteTex('#ff5a3c'), transparent: true, side: THREE.DoubleSide });
  dyn.pianoNotes = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.34, .34), i === 3 || i === 6 ? nRed : nGold);
    m.userData.noShadow = true; m.position.set((i - 3.5) * .36, 1.75, .85); dyn.pianoStage.add(m); return m;
  });

  // P06 için piyanonun üstünde süzülen 9 ışıklı ses-ritim sütunu (mavi düzenli → kırmızı-altın kaymış!)
  dyn.ritimBars = Array.from({ length: 9 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.16, .65, .16), new THREE.MeshBasicMaterial({ color: '#64d4ff' }));
    m.position.set((i - 4) * .25, 2.35, .15); m.userData.noShadow = true; dyn.pianoStage.add(m); return m;
  });

  // Eski tip altın borulu gramofon (P05 Dr. Krohn kayıt sahnesi!)
  const phono = new THREE.Group(); phono.position.set(1.55, 0, .65); g.add(phono);
  const pTbl = new THREE.Mesh(new THREE.BoxGeometry(.7, .82, .7), flat('#583822')); pTbl.position.y = .41; phono.add(pTbl);
  const pBox = new THREE.Mesh(new THREE.BoxGeometry(.44, .22, .44), flat('#7e4e2a')); pBox.position.y = .93; phono.add(pBox);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(.32, .62, 16, 1, true), flat('#e0b44e'));
  horn.rotation.z = 1.12; horn.position.set(-.22, 1.24, 0); phono.add(horn);

  // Sahne spot ışık huzmeleri (tepeden sıcak altın spot!)
  fx.stageBeams = [[-.8, 5.2, -.5], [.8, 5.2, -.5]].map(p =>
    beam(scene, [200 + p[0], p[1], p[2]], [200 + p[0] * .2, .2, .4], { r0: .35, r1: 1.75, color: '#ffe0a2', strength: .16 })
  );
  fx.pianoKeyGlow = glow(scene, [200.1, 1.45, .15], { size: 2.6, color: '#ffae4c', strength: .42 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c4a8e4', '#4e3428', 1.65));
  const SUN = [-.25, -.62, -.74]; dyn.mSun = V(...SUN).normalize();
  const key = sun('#ffe0a4', 2.85, SUN, [200, 1.2, 0], { ext: 10 }); L.add(key); L.add(key.target);
  const redRim = new THREE.PointLight('#ff6452', 2.2, 10); redRim.position.set(200, 3.2, -3.5); L.add(redRim);
  scene.add(L); sets.concert = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: 1947 OSLO ÜNİVERSİTESİ TARİHİ KÜTÜPHANE SALONU (x = 300)
function buildLibrary(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);

  // Sıcak meşe parke + bordo klasik halı
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), painted(woodTex({ base: '#7d5636', plank: 40, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.2), flat('#742c34'));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, .008, -.2); g.add(carpet);

  // Arka duvarda devasa MEŞE KİTAPLIKLAR + ortada yüksek kemerli GÜNDÜZ PENCERESİ (gün batımı balkonu DEĞİL!)
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), flat('#463022'));
  wallBack.position.set(0, 3.5, -3.6); g.add(wallBack);
  for (const sx of [-2.8, 2.8]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.8, .48), painted(bookshelfTex()));
    shelf.position.set(sx, 2.4, -3.35); g.add(shelf);
  }
  // Ortada yüksek kemerli sıcak gündüz penceresi (mavi-altın öğleden sonra gökyüzü!)
  const archWin = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.6), new THREE.MeshBasicMaterial({ color: '#cbe6ff' }));
  archWin.position.set(0, 2.6, -3.52); archWin.userData.noShadow = true; g.add(archWin);
  for (const mx of [-.45, .45]) {
    const mull = new THREE.Mesh(new THREE.BoxGeometry(.07, 3.6, .1), flat('#4a3222'));
    mull.position.set(mx, 2.6, -3.46); g.add(mull);
  }
  for (const my of [1.6, 2.6, 3.6]) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.95, .07, .1), flat('#4a3222'));
    cross.position.set(0, my, -3.46); g.add(cross);
  }

  // Ön ortada antika meşe çalışma masası + AÇIK 'BRAIN · 1947' TIP DERGİSİ!
  const desk = new THREE.Group(); desk.position.set(0, 0, .55); g.add(desk);
  const dTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, .10, .92), painted(woodTex({ base: '#6a4428', plank: 26 })));
  dTop.position.y = .76; desk.add(dTop);
  for (const lx of [-.75, .75]) for (const lz of [-.36, .36]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.045, .04, .76, 10), flat('#4c301c'));
    leg.position.set(lx, .38, lz); desk.add(leg);
  }
  const journal = new THREE.Mesh(new THREE.PlaneGeometry(.86, .54), new THREE.MeshBasicMaterial({ map: openJournalTex() }));
  journal.rotation.x = -Math.PI / 2 + .24; journal.position.set(0, .86, .04); journal.userData.noShadow = true; desk.add(journal);

  // Kapanışta hafifçe yana kayıp parlayan tek bir büyük altın 3B nota!
  dyn.finalNote = new THREE.Mesh(
    new THREE.PlaneGeometry(.46, .46),
    new THREE.MeshBasicMaterial({ map: noteTex('#ffd862'), transparent: true, side: THREE.DoubleSide })
  );
  dyn.finalNote.position.set(0, 2.38, -.35); dyn.finalNote.userData.noShadow = true; g.add(dyn.finalNote);

  // Yüksek pencereden kütüphaneye süzülen sıcak gündüz güneş huzmeleri!
  fx.libBeams = [[-.4, 4.1, -3.3], [.4, 4.1, -3.3]].map(p =>
    beam(scene, [300 + p[0], p[1], p[2]], [300 + p[0] * 1.4, .1, 1.4], { r0: .45, r1: 1.45, color: '#fff0c4', strength: .18 })
  );
  fx.noteGlow = glow(scene, [300, 2.38, -.35], { size: 1.5, color: '#ffd468', strength: .45 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#dceaff', '#7a5638', 1.95));
  const SUN = [-.2, -.48, .85]; dyn.lSun = V(...SUN).normalize();
  const key = sun('#ffe6b0', 2.85, SUN, [300, 1.1, 0], { ext: 9 }); L.add(key); L.add(key.target);
  const frontFill = new THREE.DirectionalLight('#ffdca4', 1.45);
  frontFill.position.set(300.5, 3.2, 6.5); frontFill.target.position.set(300, 1.1, -.3);
  L.add(frontFill); L.add(frontFill.target);
  scene.add(L); sets.library = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA KOREOGRAFİSİ (VİNÇ + TAKİP + ÇAPRAZ AÇILAR!)
function cameraPath() {
  const k = [
    // P01 VİNÇ AÇILIŞI: Karlı Oslo sokağının üstünden aşağı süzülüp şaşkın Astrid'e iner!
    { t: 0, pos: [-.9, 3.65, 4.65], look: [-.3, 1.45, -1.6], fov: 50, creep: .12, drift: .03 },
    { t: P(1, .45), dur: .75, pos: [-.45, 1.48, 2.35], look: [-.25, 1.38, -.65], fov: 46, creep: .20 },
    { t: P(1, .82), dur: .35, pos: [-.45, 1.32, 1.55], look: [-.45, 1.26, -.65], fov: 44, creep: .22 },
    // P02 TAKİP PLANI: Astrid karlı sokakta yürüyerek BAKERI fırınının önüne gelir!
    { t: PS(2) + .16, dur: .42, move: 'whip', pos: [-.3, 1.42, 3.85], look: [.1, 1.38, -2.4], fov: 50, creep: .18 },
    // P03 ÇAPRAZ FIRIN ÖNÜ: Fırıncı BAKERI kapısında kahkahayla güler!
    { t: PS(3) + .14, dur: .32, move: 'whip', pos: [1.35, 1.35, 1.85], look: [.45, 1.32, -1.6], fov: 46, creep: .24 },
    // P04 DRAMATİK DİYAGONAL: Fırıncı kızgın uzaklaşır, Astrid karlı sokakta yalnız kalır!
    { t: PS(4) + .16, dur: .36, move: 'whip', pos: [-1.45, 1.46, 2.65], look: [.25, 1.25, -1.4], fov: 50, creep: .22 },
    // P05 WHIP PAN → SET 2 KONSER SALONU: Dr. Krohn altın gramofonla Astrid'i inceler!
    { t: PS(5) + .14, dur: .34, move: 'whip', pos: [200.25, 1.42, 4.45], look: [200.2, 1.35, -.3], fov: 50, creep: .18 },
    // P06 DOLLY-IN: Dev kuyruklu piyano üstündeki 9 ışıklı ritim çubuğuna zoom (kıvılcımla kayar!)
    { t: PS(6) + .16, dur: .36, move: 'whip', pos: [200.1, 2.15, 3.75], look: [200.1, 2.15, -.75], fov: 48, creep: .28 },
    // P07 PİYANO TUŞLARI ÜSTÜNDEN YANLAMASINA TAKİP KAMERASI (SOLA → SAĞA KAYAR!)
    { t: PS(7) + .12, dur: .32, move: 'whip', pos: [199.15, 2.15, 2.75], look: [199.75, 1.30, -.15], fov: 48, creep: .08 },
    { t: PE(7) - .10, dur: Math.max(.8, PE(7) - PS(7) - .3), pos: [200.85, 2.05, 2.75], look: [200.35, 1.30, -.15], fov: 48, creep: .08 },
    // P08 KONSER SALONU GENİŞ DRAMATİK SPOT: Astrid ortada, etrafında dönen ses halkaları!
    { t: PS(8) + .14, dur: .34, move: 'whip', pos: [200.0, 1.62, 4.35], look: [200.0, 1.35, -.6], fov: 50, creep: .22 },
    // P09 WHIP PAN → SET 3 TARİHİ KÜTÜPHANE: Açık BRAIN · 1947 dergisinden yükselip karakterleri gösterir!
    { t: PS(9) + .14, dur: .34, move: 'whip', pos: [300.0, 1.68, 2.75], look: [300.0, 1.05, .25], fov: 48, creep: .12 },
    // P10 VİNÇ ÇIKIŞI (CRANE-OUT): Kütüphane güneş huzmeleri ve yana kayan altın nota ile kapanış!
    { t: DUR, dur: Math.max(.8, DUR - PS(10) - .05), pos: [300.0, 2.18, 4.55], look: [300.0, 1.52, -1.2], fov: 52, creep: .12 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .38), 1.15); // ritim çubukları kayma anı!
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) {
    const p = PT[w.part] ||= { s: w.start, e: w.end };
    p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end);
  }
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + 1.2) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#20324e');
  buildOsloStreet(scene); buildConcertHall(scene); buildLibrary(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Set 1'de GERÇEK YAĞAN KAR, Set 2'de altın sahne tozu, Set 3'te kütüphane güneş tozları!
  fx.motes = new Smoke(scene, { color: '#eef6ff', maxPoints: 550, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 260, size: .018, alpha: .78, speed: .42, on: t => where(t) === 'street',
    path: (u, t, i) => [(hash(i, 1) - .5) * 9.0 + Math.sin(t * 1.4 + i) * .25, 4.6 - u * 4.5, -2.5 + (hash(i, 2) - .5) * 5.0],
  });
  fx.motes.wisps.push({
    n: 120, size: .013, alpha: .65, speed: .18, on: t => where(t) === 'concert',
    path: (u, t, i) => [200 + (hash(i, 4) - .5) * 5.0, 4.2 - u * 3.8, -.5 + (hash(i, 6) - .5) * 3.0],
  });
  fx.motes.wisps.push({
    n: 110, size: .012, alpha: .55, speed: .08, on: t => where(t) === 'library',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 4.2, 3.8 - u * 3.2, -1.5 + (hash(i, 9) - .5) * 3.6],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(5) - .06, 'whoosh');
  cue(PS(7) - .06, 'whoosh');
  cue(PS(9) - .06, 'whoosh');
  cue(P(1, .30), 'spark');
  cue(P(1, .62), 'wave');
  cue(P(4, .28), 'wave');
  cue(P(6, .38), 'boom');
  cue(PS(7) + .12, 'piano_shift', { dur: PE(7) - PS(7) });
  cue(PS(9), 'harbor', { dur: DUR - PS(9) });
  cue(PE(10) - .2, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return t < PS(5) ? 'street' : t < PS(9) ? 'concert' : 'library'; }
function camSet(cam) { return cam.position.x > 250 ? 'library' : cam.position.x > 100 ? 'concert' : 'street'; }
const WARM = '#ffd690', COOL = '#cde2f6';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['street', 'concert', 'library']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tint = here === 'street' ? [.98, 1.0, 1.04] : here === 'concert' ? [1.03, .99, .95] : [1.04, 1.01, .95];

  fx.bakeryGlow.visible = here === 'street';
  fx.lampL.visible = here === 'street';
  fx.lampR.visible = here === 'street';
  for (const b of fx.stageBeams) b.visible = here === 'concert';
  fx.pianoKeyGlow.visible = here === 'concert';
  for (const b of fx.libBeams) b.visible = here === 'library';
  fx.noteGlow.visible = here === 'library';

  const ast = cast.astrid, fir = cast.firinci, kr = cast.krohn;

  if (here === 'street') {
    // P02'de Astrid sokakta yürüyerek fırının önüne gelir!
    const walkU = ramp(t, PS(2), PE(2));
    const astX = -.48 - (1 - walkU) * .45;
    const astZ = -.65 - walkU * .85;
    const walking = t >= PS(2) && t <= PE(2);
    const walkBob = walking ? Math.abs(Math.sin(t * 11)) * 7 : 0;

    // P01-P03 Astrid'in sağından yükselen parlak müzik notaları (yüzünü asla kapatmaz!)
    const showNotes = t >= P(1, .28) && t < PS(4);
    dyn.streetNotes.forEach((m, i) => {
      m.visible = showNotes;
      if (showNotes) {
        const phase = ((t * .85 + i * .22) % 1);
        m.position.set(astX + .32 + phase * .48, 1.32 + phase * .78 + Math.sin(t * 6 + i) * .06, astZ + .1);
        m.lookAt(cam.position);
      }
    });

    // P04'te fırın ışığı soğur, kapı kapanır!
    const coldOut = t >= PS(4);
    dyn.bakeryLight.intensity = coldOut ? 1.4 : 3.4;

    ast.show(); ast.place(astX, 0, astZ, cam, tint);
    ast.draw({
      expr: coldOut ? 'worried' : (t >= P(1, .6) && t < PS(2) ? 'surprised' : 'neutral'),
      look: t >= PS(2) ? .55 : .1,
      sweat: (t >= P(1, .72) && t < PS(2)) || coldOut ? 1 : 0,
      blink: bl(1, P(1, .5), PS(3), PS(4)),
      bob: walkBob,
      armL: walking ? [36 * Math.sin(t * 11), 16] : [18, 16],
      armR: walking ? [-36 * Math.sin(t * 11), 16] : [18, 16],
      lit: 1, shade: COOL, rim: { color: WARM, a: .42 },
    });
    ast.castFrom(dyn.sSun, true);

    // Fırıncı (P02-P04 BAKERI kapısında: önce gülümser → P03 kahkaha atar → P04 kızıp geriye çekilir!)
    if (t >= PS(2) - .1) {
      const laughing = t >= PS(3) && t <= PE(3) + .18;
      const pullBack = coldOut ? ramp(t, PS(4), PE(4)) * .65 : 0;
      fir.show(); fir.place(.55 + pullBack * .35, 0, -1.65 - pullBack * .7, cam, tint);
      fir.draw({
        expr: coldOut ? 'angry' : (laughing ? 'laugh' : 'smile'),
        look: -.6,
        mouth: Math.max(talk(PS(3), PE(3)), laughing ? .65 : 0),
        laughMarks: laughing ? .9 : 0,
        blink: bl(2, PS(3), PS(4)),
        armL: laughing ? [112, 34] : (coldOut ? [76, 26] : [26, 18]),
        armR: laughing ? [64, 38] : [22, 18],
        bob: laughing ? -Math.abs(Math.sin(t * 14)) * 9 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .40 },
      });
      fir.castFrom(dyn.sSun, true);
    }
  } else if (here === 'concert') {
    const inP6 = t >= PS(6) - .15 && t < PS(7) - .12;
    const inP7 = t >= PS(7) - .12 && t < PS(8) - .12;
    const inP8 = t >= PS(8) - .12;

    // P06 ışıklı ritim çubukları (piyanonun üstünde süzülür, P(6, .38)'de kayar!)
    const shiftU = ramp(t, P(6, .36), P(6, .75));
    dyn.ritimBars.forEach((b, i) => {
      b.visible = inP6 || inP8;
      if (b.visible) {
        const regH = .42 + .36 * Math.abs(Math.sin(t * 6 + i * .65));
        const offH = .24 + .72 * Math.abs(Math.sin(t * 9.5 + i * 1.45 + 1.2));
        const u = inP8 ? 1 : shiftU;
        const h = regH * (1 - u) + offH * u;
        b.scale.y = h / .65;
        b.position.y = 2.15 + h * .5;
        b.position.x = (i - 4) * .25 + u * Math.sin(i * 2.1) * .06;
        b.material.color.set(u > .32 ? (i % 2 ? '#ff5e3e' : '#ffc24a') : '#64d4ff');
      }
    });

    // Dev 12 beyaz piyano tuşu ritimle basılır (P07'de 4. ve 8. tuş kırmızı-turuncu gecikmeli parlar!)
    const activeK = Math.floor((t * 3.4) % 12);
    dyn.pWhite.forEach((k, i) => {
      const pressed = i === activeK;
      k.position.y = pressed ? -.06 : 0;
      k.material.color.set(pressed ? (i === 3 || i === 7 ? '#ff5c3c' : '#ffd868') : '#f6f2ea');
    });
    dyn.stageMet.rotation.z = Math.sin(t * 5.2) * .52 + (inP7 ? Math.sin(t * 13) * .1 : 0);

    // Piyanodan havaya yükselen 3B müzik notaları!
    dyn.pianoNotes.forEach((n, i) => {
      n.visible = inP7 || inP8;
      if (n.visible) {
        const ph = (t * .7 + i * .17) % 1;
        n.position.set((i - 3.5) * .36 + (i === 3 ? .14 : 0), 1.45 + ph * 1.45, .88);
        n.lookAt(cam.position);
      }
    });

    // Karakter yerleşimi: P05'te Astrid + Dr. Krohn sahne önünde; P07'de Dr. Krohn piyano yanında; P08'de Astrid tek spot altında!
    if (t < PS(6) - .1) {
      ast.show(); ast.place(199.42, 0, .85, cam, tint);
      ast.draw({ expr: 'worried', look: .55, blink: bl(3, PS(5)), armL: [18, 16], armR: [18, 16], lit: 1, shade: COOL, rim: { color: WARM, a: .44 } });
      kr.show(); kr.place(200.55, 0, .82, cam, tint);
      kr.draw({ expr: 'surprised', look: -.55, sweat: 1, blink: bl(4, PS(5)), propL: 'scroll', propR: 'pen', armL: [58, 36], armR: [62, 40], lit: 1, shade: COOL, rim: { color: WARM, a: .44 } });
      ast.castFrom(dyn.mSun, true); kr.castFrom(dyn.mSun, true);
    } else if (inP7) {
      kr.show(); kr.place(199.95, 0, 1.38, cam, tint);
      kr.draw({ expr: 'surprised', look: .35, blink: bl(5, PS(7)), armR: [96, 30], armL: [24, 18], lit: 1, shade: COOL, rim: { color: '#ffae4c', a: .5 } });
      kr.castFrom(dyn.mSun, true);
    } else if (inP8) {
      ast.show(); ast.place(200.0, 0, 1.05, cam, tint);
      ast.draw({ expr: 'surprised', look: 0, blink: bl(6, PS(8)), armL: [42, 22], armR: [42, 22], lit: 1, shade: COOL, rim: { color: '#ffd478', a: .52 } });
      ast.castFrom(dyn.mSun, true);
    }
  } else {
    // SET 3: 1947 OSLO ÜNİVERSİTESİ TARİHİ KÜTÜPHANE SALONU!
    // Açık BRAIN 1947 dergisinin arkasında Astrid & Dr. Krohn + havada yana kayan tek altın nota!
    const shiftNote = ramp(t, PS(10), PE(10));
    dyn.finalNote.position.set(shiftNote * .42, 2.38 + Math.sin(t * 2.5) * .06, -.35);
    dyn.finalNote.lookAt(cam.position);
    fx.noteGlow.position.set(300 + shiftNote * .42, 2.38, -.35);

    ast.show(); ast.place(299.48, 0, -.68, cam, tint);
    ast.draw({
      expr: t > PS(10) ? 'smile' : 'neutral',
      look: .28, blink: bl(7, PS(9), PS(10)),
      armL: [18, 16], armR: [18, 16],
      lit: 1, shade: '#d4c6b8', rim: { color: '#ffe4a2', a: .48 },
    });
    kr.show(); kr.place(300.52, 0, -.72, cam, tint);
    kr.draw({
      expr: 'focused', look: -.45,
      blink: bl(8, PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [56, 36], armR: [62, 40],
      lit: 1, shade: '#d4c6b8', rim: { color: '#ffe4a2', a: .48 },
    });
    ast.castFrom(dyn.lSun, true); kr.castFrom(dyn.lSun, true);
  }

  fx.motes.update(t);
  for (const b of fx.stageBeams) b.material.uniforms.uT.value = t;
  for (const b of fx.libBeams) b.material.uniforms.uT.value = t;

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'street') {
    look = { ...focusOn(V(0, 1.3, -1.2), 4.0, 5.2), sat: 1.18, lift: [.09, .10, .13], bloom: .82, vignette: .20 };
    C.scene.fog = null;
  } else if (here === 'concert') {
    look = { ...focusOn(V(200, 1.5, 0), 3.6, 5.5), sat: 1.24, lift: [.09, .08, .11], bloom: .92, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.2, -.2), 3.8, 5.5), sat: 1.18, lift: [.11, .10, .11], bloom: .85, vignette: .18 };
    C.scene.fog = null;
  }
  look.tint = here === 'street' ? [.98, 1.0, 1.03] : here === 'concert' ? [1.03, .99, .96] : [1.03, 1.01, .97];
  look.blur = st.moving > .15 ? 15 : 0;
  return look;
}
