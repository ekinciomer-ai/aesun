// En Garip Hastalıklar #06: Su Alerjisi (Akuajenik Ürtiker) — yumurta kafa stili.
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler: 1964 YAĞMURLU KLİNİK (x≈0), HİSTAMİN & YANGIN DEDEKTÖRÜ ODASI (x≈200), YAĞMUR SONRASI TERAS (x≈300).
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'su-alerjisi';
export const FPS = 30;
export let DUR = 39;
export const CUES = [];
export const LOOK = {
  elena: {
    headW: 256, headH: 244,
    longHair: '#5a3026', hairLen: 240,
    cloth: '#d8a634', clothDark: '#9e741e',
    skirt: '#3d5875', boots: '#2e3846',
    collar: true, buttons: '#4a3818',
    bodyW: 192, height: 1.62,
  },
  arkadas: {
    headW: 260, headH: 246,
    cloth: '#c45b44', clothDark: '#823426',
    pattern: 'hstripes', stripe: '#823426',
    scarf: '#3b6e5c', scarfY: 6,
    collar: false, bodyW: 198, height: 1.66,
  },
  shelley: {
    headW: 270, headH: 250,
    mustache: '#4a4648',
    cloth: '#e6e4dc', clothDark: '#b8b6ac',
    trim: '#356a88', buttons: '#284c64',
    pocket: true, collar: true,
    bodyW: 214, height: 1.76,
  },
};

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const V = (...a) => new THREE.Vector3(...a);
let C, PT = {}, cast = {}, sets = {}, fx = {}, dyn = {};
const P = (k, f = 0) => { const p = PT['P' + String(k).padStart(2, '0')]; return p.s + (p.e - p.s) * f; };
const PS = k => P(k, 0), PE = k => P(k, 1);

// ---------------------------------------------------------------- boyalı dokular
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tx(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; }
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function dab(g, w, h, base, n, r, amt, seed, a0 = .25) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .24;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

// 1964 yağmurlu klinik duvarı (açık gri-mavi duvar + ahşap lambri)
function clinicWallTex(rep = [3, 1]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#c8d6e2'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#c8d6e2', 240, 22, .14, 61, .2);
  g.fillStyle = '#625042'; g.fillRect(0, 385, 512, 127);
  g.fillStyle = '#7e6856'; g.fillRect(0, 376, 512, 12);
  return tx(c, rep);
}

// Yağmurlu pencere camı (dışarıda yağan diyagonal yağmur damlaları!)
function rainWindowTex() {
  const [c, g] = cnv(512, 640);
  const gr = g.createLinearGradient(0, 0, 0, 640);
  gr.addColorStop(0, '#466a94'); gr.addColorStop(.55, '#6a94be'); gr.addColorStop(1, '#3c5a7e');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  const R = rng(62);
  g.strokeStyle = 'rgba(220,242,255,0.68)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 85; i++) {
    const x = R() * 512, y = R() * 640, len = 24 + R() * 44;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * .28, y + len); g.stroke();
  }
  // camda biriken damlacıklar
  g.fillStyle = 'rgba(235,248,255,0.55)';
  for (let i = 0; i < 45; i++) {
    g.beginPath(); g.ellipse(R() * 512, R() * 640, 5 + R() * 6, 8 + R() * 10, 0, 0, 6.29); g.fill();
  }
  return tx(c);
}

// Klinik Test Panosu (mod 0: H2O testi, mod 1: Kırmızı REAKSİYON · <100 VAKA · 1964)
function testBoardTex(react = false) {
  const [c, g] = cnv(600, 440);
  g.fillStyle = react ? '#261018' : '#102436'; g.fillRect(0, 0, 600, 440);
  g.strokeStyle = react ? '#ff584a' : '#5ec8ff'; g.lineWidth = 10; g.strokeRect(12, 12, 576, 416);
  // ortada büyük su damlası simgesi
  g.fillStyle = react ? '#ff5c4d' : '#5ec8ff';
  g.beginPath(); g.moveTo(300, 95); g.quadraticCurveTo(375, 200, 355, 250);
  g.arc(300, 245, 56, 0, Math.PI); g.quadraticCurveTo(225, 200, 300, 95); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 44px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('H₂O', 300, 260);
  g.fillStyle = react ? '#ff7466' : '#8edcff'; g.font = '900 40px system-ui, sans-serif';
  g.fillText(react ? 'SAF SU: REAKSİYON!' : 'SU TEMASI TESTİ', 300, 352);
  g.fillStyle = '#e8eef4'; g.font = '700 28px system-ui, sans-serif';
  g.fillText(react ? '1964 · DR. SHELLEY · < 100 VAKA' : 'KLİNİK GÖZLEM', 300, 400);
  return tx(c);
}

// Etiket tabelası (46px font — asla kutudan taşmaz!)
function badgeTex(title, sub, bg, fg, accent) {
  const [c, g] = cnv(560, 200);
  g.fillStyle = bg; g.beginPath(); g.roundRect(12, 12, 536, 176, 32); g.fill();
  g.strokeStyle = accent; g.lineWidth = 10; g.stroke();
  g.fillStyle = fg; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(title, 280, 78);
  g.fillStyle = accent; g.font = '800 32px system-ui, sans-serif';
  g.fillText(sub, 280, 142);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Yağmur sonrası akşam gün batımı panoraması (bulutların arasından sızan sıcak güneş!)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function afterRainSunsetTex() {
  const Pn = pano(4096, 1800, 105, -14, 32), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#2c4476')); sky.addColorStop(.45, D('#785e8c')); sky.addColorStop(.8, D('#e69458')); sky.addColorStop(1, D('#ffd890'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  // yağmur sonrası soluk gökkuşağı yayı
  const rbx = Pn.X(-20), rby = Pn.Y(0);
  for (const [rad, col] of [[680, 'rgba(255,140,120,0.16)'], [645, 'rgba(255,215,120,0.16)'], [610, 'rgba(130,225,255,0.16)']]) {
    g.strokeStyle = col; g.lineWidth = 28; g.beginPath(); g.arc(rbx, rby, rad, Math.PI, 0); g.stroke();
  }
  const R = rng(66);
  for (let i = 0; i < 10; i++) {
    g.fillStyle = D(i % 2 ? '#f4b078' : '#7a7ca8', .48);
    g.beginPath(); g.ellipse(R() * Pn.w, Pn.Y(9 + R() * 16), 210 + R() * 240, 20 + R() * 14, 0, 0, 6.29); g.fill();
  }
  const sx = Pn.X(5), sy = Pn.Y(4.2), sr = Pn.s * 3.4;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.1);
  gr.addColorStop(0, 'rgba(255,246,216,1)'); gr.addColorStop(.35, 'rgba(255,214,150,.88)'); gr.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr * 3.1, 0, 6.29); g.fill();
  g.fillStyle = '#fff9e6'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.29); g.fill();
  g.fillStyle = D('#283056'); g.fillRect(0, Pn.Y(0), Pn.w, Pn.h - Pn.Y(0));
  const y0 = Pn.Y(1.0);
  g.fillStyle = D('#36385c');
  g.beginPath(); g.moveTo(0, Pn.h); g.lineTo(0, y0);
  for (let x = 0; x <= Pn.w; x += 62) { const hh = 42 + R() * 78; g.lineTo(x, y0 - hh); g.lineTo(x + 54, y0 - hh); }
  g.lineTo(Pn.w, Pn.h); g.closePath(); g.fill();
  g.fillStyle = '#ffd27a';
  for (let i = 0; i < 95; i++) g.fillRect(R() * Pn.w, y0 - 16 - R() * 68, 7, 11);
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
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.copy(V(...target).addScaledVector(V(...dir).normalize(), -24));
  l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(size, size);
  Object.assign(l.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far });
  l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3; return l;
}

// ---------------------------------------------------------------- SET 1: 1964 YAĞMURLU KLİNİK (x = 0)
function buildClinic(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#947452', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.3), flat('#4a667c'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, .006, -.4); g.add(rug);

  const backW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(clinicWallTex([3, 1])));
  backW.position.set(0, 2.6, -3.2); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(clinicWallTex([3, 1])));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.8, 2.6, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(clinicWallTex([3, 1])));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.8, 2.6, 1.5); g.add(rightW);

  // Arka duvarda SOLDA YAĞMURLU PENCERE (Elena P08'de cama bakar!)
  const winGrp = new THREE.Group(); winGrp.position.set(-1.12, 2.02, -3.12); g.add(winGrp);
  const winFrm = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.88, .12), flat('#46382e')); winGrp.add(winFrm);
  const winPane = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.72), new THREE.MeshBasicMaterial({ map: rainWindowTex() }));
  winPane.position.z = .07; winPane.userData.noShadow = true; winGrp.add(winPane);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(1.3, .06, .08), flat('#46382e')); barH.position.z = .08; winGrp.add(barH);
  const barV = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.76, .08), flat('#46382e')); barV.position.z = .08; winGrp.add(barV);

  // Arka duvarda SAĞDA KLİNİK TEST PANOSU (mavi → kırmızı REAKSİYON!)
  const brdFrm = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.24, .12), flat('#2b3846'));
  brdFrm.position.set(.64, 2.02, -3.1); g.add(brdFrm);
  dyn.brdNorm = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 1.12), new THREE.MeshBasicMaterial({ map: testBoardTex(false) }));
  dyn.brdNorm.position.set(.64, 2.02, -3.02); dyn.brdNorm.userData.noShadow = true; g.add(dyn.brdNorm);
  dyn.brdReact = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 1.12), new THREE.MeshBasicMaterial({ map: testBoardTex(true) }));
  dyn.brdReact.position.set(.64, 2.02, -3.01); dyn.brdReact.userData.noShadow = true; dyn.brdReact.visible = false; g.add(dyn.brdReact);
  fx.brdGlow = glow(scene, [.64, 2.02, -2.9], { size: 2.0, color: '#5ec8ff', strength: .32 });

  // Muayene masası + sıcak sarı masa lambası + mavi SAF SU şişesi
  const tbl = new THREE.Group(); tbl.position.set(.82, 0, -.46); g.add(tbl);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.02, .08, .66), painted(woodTex({ base: '#7c5638', plank: 30 })));
  top.position.y = .74; tbl.add(top);
  for (const lx of [-.42, .42]) for (const lz of [-.24, .24]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .74, 10), flat('#523824'));
    leg.position.set(lx, .37, lz); tbl.add(leg);
  }
  const lampB = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, .18, 14), flat('#c89a48')); lampB.position.set(.32, .87, -.1); tbl.add(lampB);
  const lampS = new THREE.Mesh(new THREE.CylinderGeometry(.1, .18, .22, 16), new THREE.MeshBasicMaterial({ color: '#ffe28a' }));
  lampS.position.set(.32, 1.07, -.1); lampS.userData.noShadow = true; tbl.add(lampS);
  fx.lampGlow = glow(scene, [1.14, 1.1, -.56], { size: 1.5, color: '#ffd070', strength: .42 });
  // Saf su şişesi
  const flask = new THREE.Mesh(new THREE.CylinderGeometry(.06, .1, .22, 14), new THREE.MeshBasicMaterial({ color: '#6ad2ff' }));
  flask.position.set(-.18, .89, .06); tbl.add(flask);

  // P01 Kanca için Elena'nın yanında düşen parlak mavi SU DAMLASI (yüzünü asla kapatmaz!)
  dyn.hookDrop = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), new THREE.MeshBasicMaterial({ color: '#6cd8ff' }));
  dyn.hookDrop.scale.set(.82, 1.32, .82); dyn.hookDrop.position.set(-.20, 2.15, -.58); dyn.hookDrop.userData.noShadow = true; g.add(dyn.hookDrop);
  fx.dropGlow = glow(scene, [-.48, 1.35, -1.08], { size: 1.3, color: '#ff5c4d', strength: .26 });

  // Işık: soğuk yağmur mavisi dolgu + sıcak masa lambası/anahtar ışık
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a4c8f2', '#6e5e50', 2.0));
  const SUN = [-.42, -.44, -.78]; dyn.cSun = V(...SUN).normalize();
  const key = sun('#ffd898', 2.8, SUN, [0, 1, -1], { ext: 8 }); L.add(key); L.add(key.target);
  const warmPt = new THREE.PointLight('#ffbe64', 2.3, 8); warmPt.position.set(1.14, 1.35, -.55); L.add(warmPt);
  scene.add(L); sets.clinic = { g, L }; shadows(g);
  fx.cBeams = [[-2.4, 3.0, -2.5], [-1.2, 2.9, -2.6]].map(p =>
    beam(scene, p, [p[0] + 1.8, p[1] - 2.2, p[2] + 2.4], { r0: .4, r1: 1.1, color: '#b8dcff', strength: .13 })
  );
}

// ---------------------------------------------------------------- SET 2: HİSTAMİN & YANGIN DEDEKTÖRÜ ODASI (x = 200)
function buildHistamine(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), flat('#182038'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), flat('#141b30'));
  backW.position.set(0, 6, -5.0); g.add(backW);

  // P06: CİLT YÜZEYİ + DÜŞEN DEV H2O DAMLASI + PATLAYAN KIRMIZI HİSTAMİN TOPLARI!
  dyn.histGrp = new THREE.Group(); dyn.histGrp.position.set(0, 0, -1.2); g.add(dyn.histGrp);
  // Sıcak cilt yüzeyi tabakası
  const skinSlab = new THREE.Mesh(new THREE.BoxGeometry(2.6, .34, 1.1), flat('#e6b694'));
  skinSlab.position.set(0, .92, 0); dyn.histGrp.add(skinSlab);
  const mastCell = new THREE.Mesh(new THREE.SphereGeometry(.38, 22, 16), flat('#8a4aa8'));
  mastCell.position.set(0, .55, .15); dyn.histGrp.add(mastCell);
  // Tepeden düşen dev parlak mavi su damlası
  dyn.bigDrop = new THREE.Mesh(new THREE.SphereGeometry(.26, 20, 16), new THREE.MeshBasicMaterial({ color: '#62d4ff' }));
  dyn.bigDrop.scale.set(.82, 1.35, .82); dyn.bigDrop.position.set(0, 2.25, .1); dyn.bigDrop.userData.noShadow = true; dyn.histGrp.add(dyn.bigDrop);
  // Patlayan 10 kırmızı-turuncu histamin küresi
  const hMat1 = new THREE.MeshBasicMaterial({ color: '#ff5244' }), hMat2 = new THREE.MeshBasicMaterial({ color: '#ff9642' });
  dyn.histBalls = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), i % 2 ? hMat1 : hMat2);
    m.userData = { dx: Math.cos(a) * (.65 + (i % 3) * .18), dy: .45 + Math.abs(Math.sin(a)) * .75, dz: .25 + (i % 2) * .12, noShadow: true };
    m.position.set(0, .95, .15); dyn.histGrp.add(m); return m;
  });
  dyn.histLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, .54),
    new THREE.MeshBasicMaterial({ map: badgeTex('HİSTAMİN PANİĞİ', 'BAĞIŞIKLIK ALARMI!', '#1a182c', '#ffffff', '#ff5448'), transparent: true })
  );
  dyn.histLbl.position.set(0, 3.02, -1.2); dyn.histLbl.userData.noShadow = true; g.add(dyn.histLbl);
  fx.histGlow = glow(scene, [200, 1.25, -.9], { size: 2.2, color: '#ff5448', strength: .48 });

  // P07 GÜNDELİK BENZETME: YANGIN ALARMI DEDEKTÖRÜ (bir damla suya kırmızı siren çalıyor!)
  dyn.alarmGrp = new THREE.Group(); dyn.alarmGrp.position.set(.24, 0, .2); g.add(dyn.alarmGrp);
  // Tavan plakası + kırmızı siren kubbesi
  const detBase = new THREE.Mesh(new THREE.CylinderGeometry(.44, .38, .16, 24), flat('#e6e2d8'));
  detBase.position.set(0, 2.05, 0); dyn.alarmGrp.add(detBase);
  dyn.siren = new THREE.Mesh(new THREE.SphereGeometry(.26, 20, 14), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
  dyn.siren.position.set(0, 1.85, 0); dyn.siren.userData.noShadow = true; dyn.alarmGrp.add(dyn.siren);
  // Alarmın altına düşen tek bir mavi su damlası
  dyn.alarmDrop = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), new THREE.MeshBasicMaterial({ color: '#62d4ff' }));
  dyn.alarmDrop.scale.set(.8, 1.35, .8); dyn.alarmDrop.position.set(0, 1.15, .08); dyn.alarmDrop.userData.noShadow = true; dyn.alarmGrp.add(dyn.alarmDrop);
  const alarmLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, .38),
    new THREE.MeshBasicMaterial({ map: badgeTex('YANGIN ALARMI!', 'TEK DAMLA SU', '#22141e', '#ffcf5c', '#ff4b3e'), transparent: true })
  );
  alarmLbl.position.set(0, .52, .05); alarmLbl.userData.noShadow = true; dyn.alarmGrp.add(alarmLbl);
  fx.alarmGlow = glow(scene, [200.24, 1.85, .3], { size: 2.5, color: '#ff4238', strength: .52 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#92b6f2', '#3c3456', 1.95));
  const SUN = [-.32, -.45, -.84]; dyn.mSun = V(...SUN).normalize();
  const s = sun('#ffd694', 2.45, SUN, [200, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.hist = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: YAĞMUR SONRASI GÜN BATIMI TERASI (x = 300)
function buildTerrace(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), painted(woodTex({ base: '#785e4c', plank: 44, rep: [3, 3] })));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 1.6; g.add(floor);
  // taş korkuluk
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, .14, .28), flat('#b4a498'));
  railTop.position.set(0, .92, -1.65); g.add(railTop);
  for (let x = -3.8; x <= 3.8; x += .55) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.05, .065, .82, 10), flat('#a4948a'));
    col.position.set(x, .48, -1.65); g.add(col);
  }
  // üst yağmur saçağı (Elena ve Dr. Shelley kuru saçak altında!)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, .16, 2.4), flat('#463834'));
  roof.position.set(0, 2.95, -.2); g.add(roof);
  for (const px of [-2.4, 2.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.95, 10), flat('#58443c'));
    post.position.set(px, 1.48, -1.25); g.add(post);
  }

  const far = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(afterRainSunsetTex(), { yaw: Math.PI, az: 105 * Math.PI / 180, el: [-14 * Math.PI / 180, 32 * Math.PI / 180], gain: 1.25 })
  );
  far.material.side = THREE.BackSide; g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a89ce8', '#5a4c64', 1.85));
  const SUN = [0, -.26, 1]; dyn.hSun = V(...SUN).normalize();
  const s = sun('#ffaa60', 3.0, SUN, [300, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  const fill = new THREE.DirectionalLight('#c4c0ff', 1.2); fill.position.set(302.5, 3.6, 7.5); fill.target.position.set(300, 1.1, 0);
  L.add(fill); L.add(fill.target);
  scene.add(L); sets.terrace = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU (Dikey 9:16 güvenli mesafeler!)
function cameraPath() {
  const k = [
    // P01 PARADOKS KANCA (4 hızlı plan): yağmurlu klinik → düşen mavi damla → kırmızı uyarı → Elena yakın
    { t: 0, pos: [-.35, 1.32, 3.85], look: [-.1, 1.2, -.85], fov: 50, creep: .26, drift: .03 },
    { t: P(1, .30), dur: .38, pos: [-.36, 1.50, 1.65], look: [-.36, 1.40, -.60], fov: 46, creep: .24 },
    { t: P(1, .60), dur: .28, move: 'whip', pos: [.62, 1.98, .15], look: [.64, 2.02, -3.05], fov: 46, creep: .28 },
    { t: P(1, .86), dur: .28, move: 'whip', pos: [-.48, 1.28, 1.55], look: [-.48, 1.24, -.75], fov: 44, creep: .26 },
    // P02 "Bakın, 1964'te genç bir kız...": Elena + Arkadaşı tam ikili plan!
    { t: PS(2) + .16, dur: .32, move: 'whip', pos: [-.02, 1.24, 3.85], look: [-.04, 1.18, -.80], fov: 50, creep: .22 },
    // P03 Arkadaşı güler: "Sabundan alerjin vardır, suya alerji olmaz ki!"
    { t: PS(3) + .14, dur: .30, move: 'whip', pos: [.48, 1.28, 2.25], look: [.44, 1.22, -.78], fov: 46, creep: .28 },
    // P04 Dr. Shelley saf su damlatır: test panosu KIRMIZIYA döner!
    { t: PS(4) + .16, dur: .34, move: 'whip', pos: [.0, 1.38, 3.55], look: [.04, 1.34, -1.2], fov: 50, creep: .24 },
    // P05 Dr. Shelley vakayı kaydeder (< 100 VAKA · 1964) — Elena, Dr. Shelley ve pano tam kadraj!
    { t: PS(5) + .14, dur: .32, move: 'whip', pos: [.06, 1.44, 3.65], look: [.06, 1.44, -1.55], fov: 50, creep: .22 },
    // P06 WHIP PAN → SET 2: Dev H2O damlası + Histamin Patlaması!
    { t: PS(6) + .14, dur: .32, move: 'whip', pos: [200.0, 1.65, 4.45], look: [200.0, 1.72, -1.2], fov: 50, creep: .26 },
    // P07 Gündelik benzetme: Dr. Shelley + kırmızı yanıp sönen Yangın Alarmı dedektörü!
    { t: PS(7) + .16, dur: .36, move: 'whip', pos: [200.0, 1.26, 4.82], look: [199.96, 1.22, .2], fov: 50, creep: .18 },
    // P08 WHIP PAN → SET 1: Yağmurlu pencere önünde Elena (hüzünlü/endişeli)
    { t: PS(8) + .14, dur: .32, move: 'whip', pos: [-.62, 1.48, 2.45], look: [-.78, 1.52, -2.0], fov: 48, creep: .24 },
    // P09 WHIP PAN → SET 3: Yağmur sonrası gün batımı terası (Elena + Dr. Shelley tam kadraj!)
    { t: PS(9) + .14, dur: .32, move: 'whip', pos: [300.0, 1.22, 3.55], look: [300.0, 1.20, -.8], fov: 50, creep: .20 },
    // P10 Son vuruş: yavaşça geri çekilir (~4.45 m)
    { t: DUR, dur: Math.max(.5, DUR - PS(10) - .05), pos: [300.0, 1.32, 4.45], look: [300.0, 1.22, -3.8], fov: 52, creep: .15 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .42), 1.15); // su damlasının cilde çarpıp histamin patlatma anı!
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
  scene.background = new THREE.Color('#24364e');
  buildClinic(scene); buildHistamine(scene); buildTerrace(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Parlak düşen yağmur damlaları (Set 1) ve akşam parıltısı (Set 3)
  fx.motes = new Smoke(scene, { color: '#cfe8ff', maxPoints: 500, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 180, size: .012, alpha: .6, speed: .85, on: t => where(t) === 'clinic',
    path: (u, t, i) => [-1.1 + (hash(i, 1) - .5) * 2.2 - u * .4, 3.0 - u * 2.4, -2.95 + (hash(i, 2) - .5) * .3],
  });
  fx.motes.wisps.push({
    n: 110, size: .014, alpha: .75, speed: .35, on: t => where(t) === 'hist',
    path: (u, t, i) => [200 + (hash(i, 4) - .5) * 3.2, 1.4 + (hash(i, 5) - .5) * 2.4 + Math.sin(t + i) * .08, -1.0 + (hash(i, 6) - .5) * 2.0],
  });
  fx.motes.wisps.push({
    n: 90, size: .011, alpha: .5, speed: .04, on: t => where(t) === 'terrace',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 5.0, 1.4 + (hash(i, 8) - .5) * 2.4 + (u - .5) * .3, (hash(i, 9) - .5) * 3.0],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(6) - .06, 'whoosh');
  cue(PS(7) - .06, 'whoosh');
  cue(PS(9) - .06, 'whoosh');
  cue(0.05, 'rain', { dur: PE(1) + 1.5 });
  cue(P(1, .28), 'drop');
  cue(P(1, .55), 'sizzle', { dur: .7 });
  cue(PS(3) + .1, 'laugh', { dur: .65 });
  cue(P(4, .25), 'drop');
  cue(P(4, .45), 'sizzle', { dur: .6 });
  cue(P(6, .42), 'drop');
  cue(P(6, .42), 'boom');
  cue(PS(7) + .1, 'alarm', { dur: PE(7) - PS(7) });
  cue(PS(8), 'rain', { dur: PE(8) - PS(8) });
  cue(PS(9), 'evening', { dur: DUR - PS(9) });
  cue(PE(10) - .2, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return (t < PS(6) || (t >= PS(8) && t < PS(9))) ? 'clinic' : t < PS(8) ? 'hist' : 'terrace'; }
function camSet(cam) { return cam.position.x > 250 ? 'terrace' : cam.position.x > 100 ? 'hist' : 'clinic'; }
const WARM = '#ffd690', COOL = '#cde2f6';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['clinic', 'hist', 'terrace']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tint = here === 'clinic' ? [1, 1, 1] : here === 'hist' ? [.98, .99, 1.03] : [1.03, .98, .96];

  for (const b of fx.cBeams) b.visible = here === 'clinic';
  fx.lampGlow.visible = here === 'clinic';
  fx.brdGlow.visible = here === 'clinic';
  fx.dropGlow.visible = here === 'clinic' && t >= P(1, .45) && t < P(1, .60);
  fx.histGlow.visible = here === 'hist' && t < PS(7) - .1;
  fx.alarmGlow.visible = here === 'hist' && t >= PS(7) - .18;

  const el = cast.elena, ar = cast.arkadas, shl = cast.shelley;

  if (here === 'clinic') {
    // P01 düşen kanca su damlası (Elena'nın yüzünden uzakta, P01 ortasında kaybolur)
    const dFall = ramp(t, P(1, .12), P(1, .48));
    dyn.hookDrop.visible = t < P(1, .56);
    dyn.hookDrop.position.y = 2.15 - dFall * .80;

    // P04'ten itibaren test panosu KIRMIZI REAKSİYON moduna geçer!
    const react = t >= P(4, .30);
    dyn.brdNorm.visible = !react;
    dyn.brdReact.visible = react;
    fx.brdGlow.material.color.set(react ? '#ff584a' : '#5ec8ff');

    // Elena (solda; P08'de yağmurlu pencerenin hemen önünde!)
    const atWin = t >= PS(8) - .1;
    el.show(); el.place(atWin ? -.75 : -.48, 0, atWin ? -1.45 : -.75, cam, tint);
    el.draw({
      expr: atWin || react || t >= P(1, .6) ? 'worried' : 'neutral',
      look: atWin ? -.25 : t >= PS(2) && t < PS(4) ? .55 : .1,
      sweat: react || t >= P(1, .7) ? 1 : 0,
      blink: bl(1, P(1, .5), PS(4), PS(8)),
      armL: [18, 16], armR: [18, 16],
      lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
    });
    el.castFrom(dyn.cSun, true);

    // Arkadaş (P02-P03 arası sağda, P03'te güler!)
    if (t >= PS(2) - .15 && t < PS(4) - .1) {
      ar.show(); ar.place(.44, 0, -.78, cam, tint);
      const laughing = t >= PS(3) && t <= PE(3) + .2;
      ar.draw({
        expr: laughing ? 'laugh' : 'smile',
        look: -.6,
        mouth: Math.max(talk(PS(3), PE(3)), laughing ? .65 : 0),
        laughMarks: laughing ? .88 : 0,
        blink: bl(2, PS(3)),
        armL: laughing ? [112, 34] : [22, 18],
        armR: laughing ? [64, 38] : [22, 18],
        bob: laughing ? -Math.abs(Math.sin(t * 14)) * 9 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .35 },
      });
      ar.castFrom(dyn.cSun, true);
    }

    // Dr. Shelley (P04-P05 arası sağda saf su testi yapıp şaşkın not alır!)
    if (t >= PS(4) - .1 && t < PS(6)) {
      shl.show(); shl.place(.42, 0, -.82, cam, tint);
      shl.draw({
        expr: react ? 'surprised' : 'focused',
        look: -.55,
        sweat: react ? 1 : 0,
        blink: bl(3, PS(4), PS(5)),
        propL: 'scroll', propR: 'pen',
        armL: [58, 36], armR: [62, 40],
        lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
      });
      shl.castFrom(dyn.cSun, true);
    }
  } else if (here === 'hist') {
    const showAlarm = t >= PS(7) - .18;
    dyn.histGrp.visible = !showAlarm;
    dyn.histLbl.visible = !showAlarm;
    dyn.alarmGrp.visible = showAlarm;

    if (!showAlarm) {
      // Dev su damlası cilde düşer → histamin topları patlar!
      const dropU = ramp(t, P(6, .08), P(6, .42));
      dyn.bigDrop.position.y = 2.35 - dropU * 1.15;
      const burstU = ramp(t, P(6, .40), P(6, .85));
      dyn.histBalls.forEach(m => {
        m.visible = burstU > .02;
        m.position.set(m.userData.dx * burstU, .95 + m.userData.dy * burstU, .15 + m.userData.dz * burstU);
        m.scale.setScalar(.4 + burstU * .75);
      });
    } else {
      // Kırmızı yangın alarmı nabız gibi yanıp söner, altına tek damla su düşer!
      const flash = .55 + .45 * Math.sin(t * 20);
      fx.alarmGlow.scale.setScalar(.85 + flash * .4);
      dyn.alarmDrop.position.y = 1.65 - ((t * 1.2) % 1) * .78;
      shl.show(); shl.place(199.46, 0, .22, cam, tint);
      shl.draw({
        expr: 'surprised', look: .65,
        blink: bl(4, PS(7)),
        armR: [95, 30], armL: [22, 18],
        lit: 1, shade: COOL, rim: { color: '#ff5248', a: .48 },
      });
      shl.castFrom(dyn.mSun, true);
    }
  } else {
    // SET 3: Yağmur Sonrası Gün Batımı Terası — saçak altında Elena + Dr. Shelley!
    el.show(); el.place(299.60, 0, -.22, cam, tint);
    el.draw({
      expr: t > PS(10) ? 'neutral' : 'worried',
      look: .2, lookY: -.1,
      blink: bl(5, PS(9), PS(10)),
      armL: [18, 14], armR: [18, 14],
      lit: -1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .54 },
    });
    shl.show(); shl.place(300.40, 0, -.28, cam, tint);
    shl.draw({
      expr: 'focused', look: -.45,
      blink: bl(6, PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [56, 36], armR: [62, 40],
      lit: 1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .54 },
    });
    el.castFrom(dyn.hSun, true); shl.castFrom(dyn.hSun, true);
  }

  fx.motes.update(t);
  for (const b of fx.cBeams) b.material.uniforms.uT.value = t;

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'clinic') {
    const subj = t >= PS(8) ? V(-.75, 1.4, -1.6) : V(0, 1.2, -.8);
    look = { ...focusOn(subj, 4.2, 4.5), sat: 1.18, lift: [.09, .1, .125], bloom: .78, vignette: .2 };
    C.scene.fog = null;
  } else if (here === 'hist') {
    const subj = t >= PS(7) - .15 ? V(200, 1.2, .2) : V(200, 1.5, -1.2);
    look = { ...focusOn(subj, 3.5, 5), sat: 1.24, lift: [.08, .09, .14], bloom: 1.05, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.2, -.3), 4, 5), sat: 1.2, lift: [.1, .09, .15], bloom: .95, vignette: .22 };
    C.scene.fog = null;
  }
  look.tint = here === 'clinic' ? [.99, 1.0, 1.02] : here === 'hist' ? [.98, 1.0, 1.04] : [1.04, .98, .96];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
