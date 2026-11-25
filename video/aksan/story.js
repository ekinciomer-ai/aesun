// En Garip Hastalıklar #07: Yabancı Aksan Sendromu (1941 Oslo — Astrid & Dr. Monrad-Krohn) — yumurta kafa stili.
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler: 1941 OSLO FIRIN & KLİNİK (x≈0), KONUŞMA RİTMİ & PİYANO ODASI (x≈200), OSLO LİMANI GÜN BATIMI İSKELESİ (x≈300).
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'yabanci-aksan';
export const FPS = 30;
export let DUR = 40;
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

// 1941 Oslo sıcak duvar + koyu ahşap lambri
function osloWallTex(rep = [3, 1]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#c6d2dc'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#c6d2dc', 240, 22, .14, 71, .2);
  g.fillStyle = '#5a4436'; g.fillRect(0, 385, 512, 127);
  g.fillStyle = '#7a5e4a'; g.fillRect(0, 376, 512, 12);
  return tx(c, rep);
}

// 1941 Oslo kuzey penceresi (dışarıda karlı kuzey gökyüzü ve siluet çatılar)
function osloWindowTex() {
  const [c, g] = cnv(512, 640);
  const gr = g.createLinearGradient(0, 0, 0, 640);
  gr.addColorStop(0, '#36567e'); gr.addColorStop(.55, '#688eb8'); gr.addColorStop(1, '#3e5c7c');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  // uzaktaki Oslo çatıları
  g.fillStyle = '#2a3d56';
  g.beginPath(); g.moveTo(0, 640); g.lineTo(0, 460); g.lineTo(90, 390); g.lineTo(185, 455);
  g.lineTo(270, 410); g.lineTo(360, 465); g.lineTo(445, 395); g.lineTo(512, 445); g.lineTo(512, 640); g.closePath(); g.fill();
  // yumuşak kar taneleri
  const R = rng(72);
  g.fillStyle = 'rgba(240,248,255,0.72)';
  for (let i = 0; i < 65; i++) {
    g.beginPath(); g.arc(R() * 512, R() * 560, 3 + R() * 5, 0, 6.29); g.fill();
  }
  return tx(c);
}

// Ses Analizi & Klinik Pano (mod 0: düzenli mavi ses dalgası, mod 1: kırmızı-altın AKSAN KAYMASI · 1947 · DR. MONRAD-KROHN)
function waveBoardTex(shifted = false) {
  const [c, g] = cnv(600, 440);
  g.fillStyle = shifted ? '#26121c' : '#102236'; g.fillRect(0, 0, 600, 440);
  g.strokeStyle = shifted ? '#ff8c42' : '#5ec8ff'; g.lineWidth = 10; g.strokeRect(12, 12, 576, 416);
  // ızgara çizgileri
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2;
  for (let y = 90; y <= 270; y += 45) { g.beginPath(); g.moveTo(40, y); g.lineTo(560, y); g.stroke(); }
  // ses dalgası grafiği
  g.strokeStyle = shifted ? '#ff644a' : '#64d6ff'; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath();
  for (let x = 50; x <= 550; x += 8) {
    const u = (x - 50) / 500;
    const y = shifted
      ? 180 + Math.sin(u * Math.PI * 10 + 1.1) * 58 * Math.sin(u * Math.PI) + Math.cos(u * Math.PI * 23) * 26
      : 180 + Math.sin(u * Math.PI * 8) * 62 * Math.sin(u * Math.PI);
    x === 50 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  if (shifted) {
    // kayma oku / vurgusu
    g.strokeStyle = '#ffd15c'; g.lineWidth = 5; g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(285, 78); g.lineTo(285, 282); g.moveTo(335, 78); g.lineTo(335, 282); g.stroke();
    g.setLineDash([]);
  }
  g.fillStyle = shifted ? '#ff9454' : '#8edcff'; g.font = '900 40px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText(shifted ? 'AKSAN KAYMASI!' : 'SES ANALİZİ', 300, 344);
  g.fillStyle = '#eceef4'; g.font = '700 26px system-ui, sans-serif';
  g.fillText(shifted ? '1947 · DR. MONRAD-KROHN' : '1941 · OSLO KLİNİĞİ', 300, 392);
  return tx(c);
}

// Etiket tabelası (46px font — asla kutudan taşmaz!)
function badgeTex(title, sub, bg, fg, accent) {
  const [c, g] = cnv(560, 200);
  g.fillStyle = bg; g.beginPath(); g.roundRect(12, 12, 536, 176, 32); g.fill();
  g.strokeStyle = accent; g.lineWidth = 10; g.stroke();
  g.fillStyle = fg; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(title, 280, 78);
  g.fillStyle = accent; g.font = '800 30px system-ui, sans-serif';
  g.fillText(sub, 280, 142);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Oslo Limanı & Kuzey Fiyordu Gün Batımı Panoraması
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function osloFjordSunsetTex() {
  const Pn = pano(4096, 1800, 105, -14, 32), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#243866')); sky.addColorStop(.45, D('#6c5686')); sky.addColorStop(.78, D('#e28e54')); sky.addColorStop(1, D('#ffd488'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(76);
  for (let i = 0; i < 11; i++) {
    g.fillStyle = D(i % 2 ? '#f4b278' : '#7074a4', .46);
    g.beginPath(); g.ellipse(R() * Pn.w, Pn.Y(8 + R() * 16), 220 + R() * 250, 20 + R() * 14, 0, 0, 6.29); g.fill();
  }
  const sx = Pn.X(4), sy = Pn.Y(4.4), sr = Pn.s * 3.3;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.2);
  gr.addColorStop(0, 'rgba(255,248,220,1)'); gr.addColorStop(.35, 'rgba(255,214,148,.88)'); gr.addColorStop(1, 'rgba(255,175,105,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr * 3.2, 0, 6.29); g.fill();
  g.fillStyle = '#fff9e8'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.29); g.fill();
  // fiyort denizi + güneş yansıması
  const sea = g.createLinearGradient(0, Pn.Y(0), 0, Pn.h);
  sea.addColorStop(0, D('#38466e')); sea.addColorStop(1, D('#1e2644'));
  g.fillStyle = sea; g.fillRect(0, Pn.Y(0), Pn.w, Pn.h - Pn.Y(0));
  g.fillStyle = 'rgba(255,216,138,0.28)';
  for (let i = 0; i < 18; i++) g.fillRect(sx - 120 - i * 8, Pn.Y(0) + 12 + i * 16, 240 + i * 16, 6);
  // uzaktaki Norveç dağları & fiyort kıyısı
  const y0 = Pn.Y(0.6);
  g.fillStyle = D('#2e3456');
  g.beginPath(); g.moveTo(0, y0);
  for (let x = 0; x <= Pn.w; x += 140) g.lineTo(x, y0 - 45 - Math.abs(Math.sin(x * .003)) * 110 - R() * 35);
  g.lineTo(Pn.w, y0); g.closePath(); g.fill();
  // kıyı ışıkları
  g.fillStyle = '#ffd47e';
  for (let i = 0; i < 80; i++) g.fillRect(R() * Pn.w, y0 - 8 - R() * 24, 6, 8);
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

// ---------------------------------------------------------------- SET 1: 1941 OSLO FIRIN & KLİNİK KÖŞESİ (x = 0)
function buildOslo(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#8e6c4a', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.3), flat('#465a70'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, .006, -.4); g.add(rug);

  const backW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(osloWallTex([3, 1])));
  backW.position.set(0, 2.6, -3.2); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(osloWallTex([3, 1])));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.8, 2.6, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(osloWallTex([3, 1])));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.8, 2.6, 1.5); g.add(rightW);

  // Arka duvarda SOLDA 1941 OSLO PENCERESİ
  const winGrp = new THREE.Group(); winGrp.position.set(-1.12, 2.02, -3.12); g.add(winGrp);
  const winFrm = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.88, .12), flat('#46362c')); winGrp.add(winFrm);
  const winPane = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.72), new THREE.MeshBasicMaterial({ map: osloWindowTex() }));
  winPane.position.z = .07; winPane.userData.noShadow = true; winGrp.add(winPane);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(1.3, .06, .08), flat('#46362c')); barH.position.z = .08; winGrp.add(barH);
  const barV = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.76, .08), flat('#46362c')); barV.position.z = .08; winGrp.add(barV);

  // Arka duvarda SAĞDA SES ANALİZİ / AKSAN KAYMASI PANOSU
  const brdFrm = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.24, .12), flat('#2b3646'));
  brdFrm.position.set(.64, 2.02, -3.1); g.add(brdFrm);
  dyn.brdNorm = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 1.12), new THREE.MeshBasicMaterial({ map: waveBoardTex(false) }));
  dyn.brdNorm.position.set(.64, 2.02, -3.02); dyn.brdNorm.userData.noShadow = true; g.add(dyn.brdNorm);
  dyn.brdShift = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 1.12), new THREE.MeshBasicMaterial({ map: waveBoardTex(true) }));
  dyn.brdShift.position.set(.64, 2.02, -3.01); dyn.brdShift.userData.noShadow = true; dyn.brdShift.visible = false; g.add(dyn.brdShift);
  fx.brdGlow = glow(scene, [.64, 2.02, -2.9], { size: 2.0, color: '#5ec8ff', strength: .32 });

  // Sıcak ahşap tezgâh / masa + masa lambası + ekmek sepeti (1941 fırın/klinik havası)
  const tbl = new THREE.Group(); tbl.position.set(.86, 0, -.46); g.add(tbl);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.04, .08, .66), painted(woodTex({ base: '#7c5638', plank: 30 })));
  top.position.y = .74; tbl.add(top);
  for (const lx of [-.42, .42]) for (const lz of [-.24, .24]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .74, 10), flat('#523824'));
    leg.position.set(lx, .37, lz); tbl.add(leg);
  }
  const lampB = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, .18, 14), flat('#c89a48')); lampB.position.set(.32, .87, -.1); tbl.add(lampB);
  const lampS = new THREE.Mesh(new THREE.CylinderGeometry(.1, .18, .22, 16), new THREE.MeshBasicMaterial({ color: '#ffe28a' }));
  lampS.position.set(.32, 1.07, -.1); lampS.userData.noShadow = true; tbl.add(lampS);
  fx.lampGlow = glow(scene, [1.18, 1.1, -.56], { size: 1.5, color: '#ffd070', strength: .42 });
  // Sıcak fırın ekmeği (basit oval)
  const loaf = new THREE.Mesh(new THREE.SphereGeometry(.14, 14, 10), flat('#c48442'));
  loaf.scale.set(1.3, .65, .85); loaf.position.set(-.18, .86, .06); tbl.add(loaf);

  // P01 Kanca: Astrid'in YANINDA parlayan kırmızı-altın ses dalgası halkaları (yüzünü ASLA kapatmaz!)
  dyn.hookWave = new THREE.Group(); dyn.hookWave.position.set(-.16, 1.44, -.58); g.add(dyn.hookWave);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ff9648' });
  dyn.hookRings = [0.06, 0.11, 0.16].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, .016, 10, 24), ringMat);
    m.userData.noShadow = true; m.position.x = i * .03; dyn.hookWave.add(m); return m;
  });
  fx.sparkGlow = glow(scene, [-.46, 1.38, -1.08], { size: 1.3, color: '#ff8a42', strength: .26 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a8c8f0', '#6e5a48', 2.0));
  const SUN = [-.42, -.44, -.78]; dyn.cSun = V(...SUN).normalize();
  const key = sun('#ffd898', 2.8, SUN, [0, 1, -1], { ext: 8 }); L.add(key); L.add(key.target);
  const warmPt = new THREE.PointLight('#ffbe64', 2.3, 8); warmPt.position.set(1.18, 1.35, -.55); L.add(warmPt);
  scene.add(L); sets.oslo = { g, L }; shadows(g);
  fx.cBeams = [[-2.4, 3.0, -2.5], [-1.2, 2.9, -2.6]].map(p =>
    beam(scene, p, [p[0] + 1.8, p[1] - 2.2, p[2] + 2.4], { r0: .4, r1: 1.1, color: '#c4e0ff', strength: .12 })
  );
}

// ---------------------------------------------------------------- SET 2: KONUŞMA RİTMİ & DEV PİYANO ODASI (x = 200)
function buildRhythm(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), flat('#161e34'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), flat('#12192c'));
  backW.position.set(0, 6, -5.0); g.add(backW);

  // P06: 3B BEYİN KONUŞMA MERKEZİ + 7 SES DALGASI ÇUBUĞU (mavi düzenli → kırmızı-altın kaymış!)
  dyn.brainGrp = new THREE.Group(); dyn.brainGrp.position.set(0, 0, -1.2); g.add(dyn.brainGrp);
  const lobeL = new THREE.Mesh(new THREE.SphereGeometry(.52, 22, 16), flat('#8892b8'));
  lobeL.scale.set(.86, 1.0, 1.15); lobeL.position.set(-.34, 1.85, 0); dyn.brainGrp.add(lobeL);
  const lobeR = new THREE.Mesh(new THREE.SphereGeometry(.52, 22, 16), flat('#747ea4'));
  lobeR.scale.set(.86, 1.0, 1.15); lobeR.position.set(.34, 1.85, 0); dyn.brainGrp.add(lobeR);
  // Sol motor konuşma (Broca) bölgesi kıvılcım küresi
  dyn.broca = new THREE.Mesh(new THREE.SphereGeometry(.22, 18, 14), new THREE.MeshBasicMaterial({ color: '#ff6442' }));
  dyn.broca.position.set(-.44, 1.82, .42); dyn.broca.userData.noShadow = true; dyn.brainGrp.add(dyn.broca);
  // 7 ses dalgası çubuğu (altta)
  dyn.bars = Array.from({ length: 7 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.16, .6, .16), new THREE.MeshBasicMaterial({ color: '#5ec8ff' }));
    m.position.set((i - 3) * .26, .82, .15); m.userData.noShadow = true; dyn.brainGrp.add(m); return m;
  });
  dyn.rhythmLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.48, .52),
    new THREE.MeshBasicMaterial({ map: badgeTex('RİTİM KAYMASI', 'KONUŞMA MERKEZİ', '#1a182c', '#ffffff', '#ff8c42'), transparent: true })
  );
  dyn.rhythmLbl.position.set(0, 2.95, -1.2); dyn.rhythmLbl.userData.noShadow = true; g.add(dyn.rhythmLbl);
  fx.brocaGlow = glow(scene, [199.56, 1.82, -.7], { size: 1.9, color: '#ff6e42', strength: .48 });

  // P07 GÜNDELİK BENZETME: DEV 3B PİYANO KLAVYESİ + SALINAN METRONOM İBRESİ!
  dyn.pianoGrp = new THREE.Group(); dyn.pianoGrp.position.set(.24, 0, .2); g.add(dyn.pianoGrp);
  // Piyano gövdesi
  const pCase = new THREE.Mesh(new THREE.BoxGeometry(1.06, .18, .54), flat('#2c2420'));
  pCase.position.set(0, 1.15, -.04); dyn.pianoGrp.add(pCase);
  // 6 beyaz tuş
  dyn.wKeys = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.14, .10, .44), flat('#f4f0e8'));
    m.position.set((i - 2.5) * .165, 1.28, .02); dyn.pianoGrp.add(m); return m;
  });
  // 4 siyah tuş
  for (const bx of [-.33, -.165, .165, .33]) {
    const bk = new THREE.Mesh(new THREE.BoxGeometry(.085, .12, .26), flat('#1a181e'));
    bk.position.set(bx, 1.35, -.07); dyn.pianoGrp.add(bk);
  }
  // Üstte altın metronom gövdesi + salınan ibre
  const metBase = new THREE.Mesh(new THREE.ConeGeometry(.20, .48, 4), flat('#7a5234'));
  metBase.rotation.y = Math.PI / 4; metBase.position.set(0, 1.72, -.06); dyn.pianoGrp.add(metBase);
  dyn.metNeedle = new THREE.Mesh(new THREE.BoxGeometry(.03, .56, .03), new THREE.MeshBasicMaterial({ color: '#ffd15c' }));
  dyn.metNeedle.position.set(0, 1.88, .08); dyn.metNeedle.userData.noShadow = true; dyn.pianoGrp.add(dyn.metNeedle);
  const pianoLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, .38),
    new THREE.MeshBasicMaterial({ map: badgeTex('AYNI PİYANO!', 'FARKLI RİTİM', '#1e1624', '#ffd466', '#ff7b42'), transparent: true })
  );
  pianoLbl.position.set(0, .58, .05); pianoLbl.userData.noShadow = true; dyn.pianoGrp.add(pianoLbl);
  fx.pianoGlow = glow(scene, [200.24, 1.55, .3], { size: 2.2, color: '#ffaa48', strength: .44 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#92b6f2', '#3c3456', 1.95));
  const SUN = [-.32, -.45, -.84]; dyn.mSun = V(...SUN).normalize();
  const s = sun('#ffd694', 2.45, SUN, [200, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.rhythm = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: OSLO LİMANI GÜN BATIMI İSKELESİ (x = 300)
function buildHarbor(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), painted(woodTex({ base: '#725846', plank: 44, rep: [3, 3] })));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 1.6; g.add(floor);
  // iskele korkuluğu + ahşap babalar
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, .12, .22), flat('#8a7262'));
  railTop.position.set(0, .90, -1.65); g.add(railTop);
  for (let x = -3.6; x <= 3.6; x += .9) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .085, 1.02, 12), flat('#5a463a'));
    post.position.set(x, .51, -1.65); g.add(post);
  }
  const far = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(osloFjordSunsetTex(), { yaw: Math.PI, az: 105 * Math.PI / 180, el: [-14 * Math.PI / 180, 32 * Math.PI / 180], gain: 1.25 })
  );
  far.material.side = THREE.BackSide; g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a89ce8', '#5a4c64', 1.85));
  const SUN = [0, -.26, 1]; dyn.hSun = V(...SUN).normalize();
  const s = sun('#ffaa60', 3.0, SUN, [300, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  const fill = new THREE.DirectionalLight('#c4c0ff', 1.2); fill.position.set(302.5, 3.6, 7.5); fill.target.position.set(300, 1.1, 0);
  L.add(fill); L.add(fill.target);
  scene.add(L); sets.harbor = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU (Dikey 9:16 güvenli mesafeler!)
function cameraPath() {
  const k = [
    // P01 PARADOKS KANCA (4 hızlı plan): 1941 Oslo → yandan ses halkası → SES ANALİZİ panosu → Astrid yakın yüz
    { t: 0, pos: [-.35, 1.32, 3.85], look: [-.1, 1.2, -.85], fov: 50, creep: .26, drift: .03 },
    { t: P(1, .30), dur: .38, pos: [-.36, 1.50, 1.65], look: [-.36, 1.40, -.60], fov: 46, creep: .24 },
    { t: P(1, .60), dur: .28, move: 'whip', pos: [.62, 1.98, .15], look: [.64, 2.02, -3.05], fov: 46, creep: .28 },
    { t: P(1, .86), dur: .28, move: 'whip', pos: [-.46, 1.28, 1.55], look: [-.46, 1.24, -.75], fov: 44, creep: .26 },
    // P02 "Bakın, 1941'de Oslo'da Astrid...": Astrid + Fırıncı tam ikili plan!
    { t: PS(2) + .16, dur: .32, move: 'whip', pos: [-.02, 1.24, 3.85], look: [-.04, 1.18, -.80], fov: 50, creep: .22 },
    // P03 Fırıncı güler: "Astrid, bu Alman aksanı nereden çıktı, şaka mı?"
    { t: PS(3) + .14, dur: .30, move: 'whip', pos: [.48, 1.28, 2.25], look: [.44, 1.22, -.78], fov: 46, creep: .28 },
    // P04 Ama şaka değildi: Fırıncı kızgın uzaklaşır, pano KIRMIZI-ALTIN AKSAN KAYMASI'na döner!
    { t: PS(4) + .16, dur: .34, move: 'whip', pos: [.0, 1.38, 3.60], look: [.04, 1.34, -1.2], fov: 50, creep: .24 },
    // P05 Dr. Krohn inceler + 1947 DR. MONRAD-KROHN panosu tam kadraj!
    { t: PS(5) + .14, dur: .32, move: 'whip', pos: [.06, 1.44, 3.68], look: [.06, 1.44, -1.55], fov: 50, creep: .22 },
    // P06 WHIP PAN → SET 2: 3B Beyin Broca Alanı + Kayan Ses Dalgası Çubukları!
    { t: PS(6) + .14, dur: .32, move: 'whip', pos: [200.0, 1.68, 4.45], look: [200.0, 1.72, -1.2], fov: 50, creep: .24 },
    // P07 Gündelik benzetme: Dr. Krohn + Dev 3B Piyano Klavyesi & Metronom!
    { t: PS(7) + .16, dur: .36, move: 'whip', pos: [200.0, 1.26, 4.82], look: [199.96, 1.22, .2], fov: 50, creep: .18 },
    // P08 WHIP PAN → SET 1: Oslo penceresi önünde Astrid (şaşkın/düşünceli)
    { t: PS(8) + .14, dur: .32, move: 'whip', pos: [-.62, 1.48, 2.48], look: [-.78, 1.52, -2.0], fov: 48, creep: .24 },
    // P09 WHIP PAN → SET 3: Oslo Limanı gün batımı iskelesi (Astrid + Dr. Krohn tam kadraj!)
    { t: PS(9) + .14, dur: .32, move: 'whip', pos: [300.0, 1.22, 3.55], look: [300.0, 1.20, -.8], fov: 50, creep: .20 },
    // P10 Son vuruş: yavaşça geri çekilir (~4.45 m)
    { t: DUR, dur: Math.max(.5, DUR - PS(10) - .05), pos: [300.0, 1.32, 4.45], look: [300.0, 1.22, -3.8], fov: 52, creep: .15 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .38), 1.15); // konuşma ritmi hasar + dalga kayma anı!
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
  scene.background = new THREE.Color('#24344c');
  buildOslo(scene); buildRhythm(scene); buildHarbor(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  fx.motes = new Smoke(scene, { color: '#dcecff', maxPoints: 500, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 140, size: .012, alpha: .55, speed: .45, on: t => where(t) === 'oslo',
    path: (u, t, i) => [-1.1 + (hash(i, 1) - .5) * 2.2 - Math.sin(t + i) * .12, 3.0 - u * 2.4, -2.95 + (hash(i, 2) - .5) * .3],
  });
  fx.motes.wisps.push({
    n: 110, size: .014, alpha: .72, speed: .35, on: t => where(t) === 'rhythm',
    path: (u, t, i) => [200 + (hash(i, 4) - .5) * 3.2, 1.4 + (hash(i, 5) - .5) * 2.4 + Math.sin(t + i) * .08, -1.0 + (hash(i, 6) - .5) * 2.0],
  });
  fx.motes.wisps.push({
    n: 90, size: .011, alpha: .5, speed: .04, on: t => where(t) === 'harbor',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 5.0, 1.4 + (hash(i, 8) - .5) * 2.4 + (u - .5) * .3, (hash(i, 9) - .5) * 3.0],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(6) - .06, 'whoosh');
  cue(PS(7) - .06, 'whoosh');
  cue(PS(9) - .06, 'whoosh');
  cue(P(1, .28), 'spark');
  cue(P(1, .56), 'wave');
  cue(P(4, .28), 'wave');
  cue(P(6, .38), 'boom');
  cue(PS(7) + .12, 'piano_shift', { dur: PE(7) - PS(7) });
  cue(PS(9), 'harbor', { dur: DUR - PS(9) });
  cue(PE(10) - .2, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return (t < PS(6) || (t >= PS(8) && t < PS(9))) ? 'oslo' : t < PS(8) ? 'rhythm' : 'harbor'; }
function camSet(cam) { return cam.position.x > 250 ? 'harbor' : cam.position.x > 100 ? 'rhythm' : 'oslo'; }
const WARM = '#ffd690', COOL = '#cde2f6';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['oslo', 'rhythm', 'harbor']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tint = here === 'oslo' ? [1, 1, 1] : here === 'rhythm' ? [.98, .99, 1.03] : [1.03, .98, .96];

  for (const b of fx.cBeams) b.visible = here === 'oslo';
  fx.lampGlow.visible = here === 'oslo';
  fx.brdGlow.visible = here === 'oslo';
  fx.sparkGlow.visible = here === 'oslo' && t >= P(1, .25) && t < P(1, .60);
  fx.brocaGlow.visible = here === 'rhythm' && t < PS(7) - .1;
  fx.pianoGlow.visible = here === 'rhythm' && t >= PS(7) - .18;

  const ast = cast.astrid, fir = cast.firinci, kr = cast.krohn;

  if (here === 'oslo') {
    // P01 yanda titreşen ses halkaları (Astrid'in yüzünü asla kapatmaz, P01 ortasında kaybolur)
    dyn.hookWave.visible = t < P(1, .56);
    const pulse = 1 + .18 * Math.sin(t * 16);
    dyn.hookRings.forEach((m, i) => m.scale.setScalar(pulse + i * .08));

    // P04'ten itibaren pano KIRMIZI-ALTIN AKSAN KAYMASI moduna geçer!
    const shifted = t >= P(4, .28);
    dyn.brdNorm.visible = !shifted;
    dyn.brdShift.visible = shifted;
    fx.brdGlow.material.color.set(shifted ? '#ff8c42' : '#5ec8ff');

    // Astrid (solda; P08'de Oslo penceresinin önünde!)
    const atWin = t >= PS(8) - .1;
    ast.show(); ast.place(atWin ? -.74 : -.46, 0, atWin ? -1.45 : -.75, cam, tint);
    ast.draw({
      expr: atWin ? 'surprised' : (shifted || t >= P(1, .6) ? 'worried' : 'neutral'),
      look: atWin ? -.2 : t >= PS(2) && t < PS(5) ? .55 : .15,
      sweat: (t >= P(1, .7) && t < PS(2)) || (t >= PS(4) && t < PS(5)) ? 1 : 0,
      blink: bl(1, P(1, .5), PS(4), PS(8)),
      armL: [18, 16], armR: [18, 16],
      lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
    });
    ast.castFrom(dyn.cSun, true);

    // Fırıncı (P02-P04 arası sağda; P03'te kahkahayla güler, P04'te kaşlarını çatıp uzaklaşır!)
    if (t >= PS(2) - .15 && t < PS(5) - .12) {
      const angry = t >= PS(4);
      const stepOut = angry ? ramp(t, PS(4), PE(4)) * .16 : 0;
      fir.show(); fir.place(.44 + stepOut, 0, -.78, cam, tint);
      const laughing = t >= PS(3) && t <= PE(3) + .18;
      fir.draw({
        expr: angry ? 'angry' : (laughing ? 'laugh' : 'smile'),
        look: angry ? -.35 : -.6,
        mouth: Math.max(talk(PS(3), PE(3)), laughing ? .65 : 0),
        laughMarks: laughing ? .88 : 0,
        blink: bl(2, PS(3), PS(4)),
        armL: laughing ? [112, 34] : (angry ? [70, 28] : [22, 18]),
        armR: laughing ? [64, 38] : [22, 18],
        bob: laughing ? -Math.abs(Math.sin(t * 14)) * 9 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .35 },
      });
      fir.castFrom(dyn.cSun, true);
    }

    // Dr. Monrad-Krohn (P05 boyunca sağda defter ve kalemle Astrid'i inceler!)
    if (t >= PS(5) - .12 && t < PS(6)) {
      kr.show(); kr.place(.42, 0, -.82, cam, tint);
      kr.draw({
        expr: 'surprised',
        look: -.55,
        sweat: 1,
        blink: bl(3, PS(5)),
        propL: 'scroll', propR: 'pen',
        armL: [58, 36], armR: [62, 40],
        lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
      });
      kr.castFrom(dyn.cSun, true);
    }
  } else if (here === 'rhythm') {
    const showPiano = t >= PS(7) - .18;
    dyn.brainGrp.visible = !showPiano;
    dyn.rhythmLbl.visible = !showPiano;
    dyn.pianoGrp.visible = showPiano;

    if (!showPiano) {
      // P06: Broca noktası parlar, 7 ses dalgası çubuğu mavi düzenli ritimden kırmızı-altın kaymış ritme geçer!
      const shiftU = ramp(t, P(6, .35), P(6, .75));
      const pulse = 1 + .22 * Math.sin(t * 18) * (.4 + shiftU * .6);
      dyn.broca.scale.setScalar(pulse);
      fx.brocaGlow.scale.setScalar(.85 + shiftU * .55);
      dyn.bars.forEach((b, i) => {
        const regH = .45 + .35 * Math.abs(Math.sin(t * 6 + i * .7));
        const offH = .25 + .65 * Math.abs(Math.sin(t * 9.5 + i * 1.45 + 1.2));
        const h = regH * (1 - shiftU) + offH * shiftU;
        b.scale.y = h / .6;
        b.position.y = .52 + h * .5;
        b.position.x = (i - 3) * .26 + shiftU * Math.sin(i * 2.1) * .06;
        b.material.color.set(shiftU > .35 ? (i % 2 ? '#ff6a42' : '#ffbd4a') : '#5ec8ff');
      });
    } else {
      // P07: Dev piyano tuşları ritimle basılır, bir tuş gecikmeli parlar, metronom ibresi kayar!
      const swing = Math.sin(t * 5.2) * .48 + Math.sin(t * 11.4) * .08;
      dyn.metNeedle.rotation.z = swing;
      const activeIdx = Math.floor((t * 3.1) % 6);
      dyn.wKeys.forEach((k, i) => {
        const pressed = i === activeIdx;
        k.position.y = pressed ? 1.23 : 1.28;
        k.material.color.set(pressed ? (i === 3 ? '#ff7442' : '#ffd87a') : '#f4f0e8');
      });
      kr.show(); kr.place(199.46, 0, .22, cam, tint);
      kr.draw({
        expr: 'surprised', look: .65,
        blink: bl(4, PS(7)),
        armR: [95, 30], armL: [22, 18],
        lit: 1, shade: COOL, rim: { color: '#ff9648', a: .48 },
      });
      kr.castFrom(dyn.mSun, true);
    }
  } else {
    // SET 3: Oslo Limanı Gün Batımı İskelesi — Astrid + Dr. Krohn!
    ast.show(); ast.place(299.60, 0, -.22, cam, tint);
    ast.draw({
      expr: t > PS(10) ? 'neutral' : 'worried',
      look: .2, lookY: -.08,
      blink: bl(5, PS(9), PS(10)),
      armL: [18, 14], armR: [18, 14],
      lit: -1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .54 },
    });
    kr.show(); kr.place(300.40, 0, -.28, cam, tint);
    kr.draw({
      expr: 'focused', look: -.45,
      blink: bl(6, PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [56, 36], armR: [62, 40],
      lit: 1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .54 },
    });
    ast.castFrom(dyn.hSun, true); kr.castFrom(dyn.hSun, true);
  }

  fx.motes.update(t);
  for (const b of fx.cBeams) b.material.uniforms.uT.value = t;

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'oslo') {
    const subj = t >= PS(8) ? V(-.74, 1.4, -1.6) : V(0, 1.2, -.8);
    look = { ...focusOn(subj, 4.2, 4.5), sat: 1.18, lift: [.09, .1, .125], bloom: .78, vignette: .2 };
    C.scene.fog = null;
  } else if (here === 'rhythm') {
    const subj = t >= PS(7) - .15 ? V(200, 1.2, .2) : V(200, 1.5, -1.2);
    look = { ...focusOn(subj, 3.5, 5), sat: 1.24, lift: [.08, .09, .14], bloom: 1.0, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.2, -.3), 4, 5), sat: 1.2, lift: [.1, .09, .15], bloom: .95, vignette: .22 };
    C.scene.fog = null;
  }
  look.tint = here === 'oslo' ? [.99, 1.0, 1.02] : here === 'rhythm' ? [.98, 1.0, 1.04] : [1.04, .98, .96];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
