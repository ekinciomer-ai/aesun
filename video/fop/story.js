// En Garip Hastalıklar #04: Taş Adam Sendromu (FOP) — yumurta kafa stili.
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler: 1940'LAR KLİNİK & RÖNTGEN (x≈0), DNA & BETON ODASI (x≈200), BİLİM MÜZESİ AKŞAM (x≈300). Sert kesme yok.
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'fop-sendromu';
export const FPS = 30;
export let DUR = 38;
export const CUES = [];
export const LOOK = {
  harry: {
    headW: 260, headH: 244,
    cloth: '#c4583c', pattern: 'hstripes', stripe: '#7a2f20',
    scarf: '#3b5a82', scarfY: 8,
    boots: '#3d2c24', blush: '#f0a8a0',
    collar: false, bodyW: 178, drop: 105, height: 1.25,
  },
  cerrah: {
    headW: 270, headH: 250,
    mustache: '#3b2c24',
    cloth: '#b8d8cc', clothDark: '#82aa9c',
    apron: true, pocket: true, collar: true,
    bodyW: 214, height: 1.76,
  },
  bilimci: {
    headW: 258, headH: 244,
    longHair: '#4a3428', hairLen: 220,
    cloth: '#e8e4da', clothDark: '#c4beb0',
    trim: '#2f5d7c', buttons: '#24455c',
    pocket: true, collar: true,
    bodyW: 200, height: 1.66,
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
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .25;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

// 1940'lar hastane duvarı (açık nane-krem fayans + üst boya)
function clinicWallTex(rep = [3, 1]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#dce6e0'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#dce6e0', 220, 22, .12, 23, .2);
  // alt mint fayans kuşağı
  g.fillStyle = '#9ec4b8'; g.fillRect(0, 320, 512, 192);
  g.strokeStyle = '#7aa498'; g.lineWidth = 3;
  for (let x = 0; x <= 512; x += 64) { g.beginPath(); g.moveTo(x, 320); g.lineTo(x, 512); g.stroke(); }
  for (let y = 320; y <= 512; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.fillStyle = '#5c8478'; g.fillRect(0, 314, 512, 10);
  return tx(c, rep);
}

// Röntgen panosu (mod 0: normal+küçük ek kemik, mod 1: ameliyat sonrası dev kırmızı kemik ağacı!)
function xrayTex(severe = false) {
  const [c, g] = cnv(512, 640);
  const gr = g.createLinearGradient(0, 0, 0, 640);
  gr.addColorStop(0, severe ? '#2e1622' : '#0f2a3c');
  gr.addColorStop(1, severe ? '#1a0c14' : '#091a26');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  // ince ölçüm çizgileri
  g.strokeStyle = severe ? 'rgba(255,110,95,0.22)' : 'rgba(130,220,255,0.2)'; g.lineWidth = 2;
  for (let y = 60; y < 600; y += 50) { g.beginPath(); g.moveTo(28, y); g.lineTo(484, y); g.stroke(); }
  // ana bacak/kol kemiği (femur + tibia stilize)
  g.strokeStyle = '#dff4ff'; g.lineWidth = 34; g.lineCap = 'round';
  g.beginPath(); g.moveTo(256, 110); g.lineTo(256, 305); g.moveTo(256, 335); g.lineTo(256, 530); g.stroke();
  g.fillStyle = '#dff4ff';
  for (const [bx, by] of [[238, 110], [274, 110], [236, 305], [276, 305], [236, 335], [276, 335], [240, 530], [272, 530]]) {
    g.beginPath(); g.arc(bx, by, 20, 0, 6.29); g.fill();
  }
  // anormal ekstra kemik köprüsü (FOP!)
  g.strokeStyle = severe ? '#ff5c4d' : '#ffcf5c';
  g.lineWidth = severe ? 28 : 16;
  g.beginPath(); g.moveTo(256, 195); g.quadraticCurveTo(360, 290, 256, 430); g.stroke();
  if (severe) {
    g.lineWidth = 22;
    g.beginPath(); g.moveTo(256, 155); g.quadraticCurveTo(130, 295, 256, 470); g.stroke();
    g.beginPath(); g.moveTo(256, 250); g.lineTo(395, 210); g.moveTo(256, 380); g.lineTo(130, 420); g.stroke();
  }
  // başlık bandı
  g.fillStyle = severe ? '#ff5c4d' : '#5ac8fa';
  g.font = '900 38px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText(severe ? 'YENİ KEMİK ×2 !' : 'FOP · EK KEMİK', 256, 594);
  return tx(c);
}

// Etiket tabelası
function badgeTex(title, sub, bg, fg, accent) {
  const [c, g] = cnv(512, 200);
  g.fillStyle = bg; g.beginPath(); g.roundRect(12, 12, 488, 176, 32); g.fill();
  g.strokeStyle = accent; g.lineWidth = 10; g.stroke();
  g.fillStyle = fg; g.font = '900 66px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(title, 256, 78);
  g.fillStyle = accent; g.font = '800 38px system-ui, sans-serif';
  g.fillText(sub, 256, 144);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Tuğla duvar + çatlak dokusu (P07 beton ustası benzetmesi)
function brickCrackTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#a85a44'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#a85a44', 200, 18, .22, 41, .24);
  g.strokeStyle = '#d6c8b4'; g.lineWidth = 5;
  for (let y = 0; y <= 512; y += 42) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
    const off = (Math.floor(y / 42) % 2) * 48;
    for (let x = off; x <= 512; x += 96) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 42); g.stroke(); }
  }
  // ortada koyu ince çatlak
  g.strokeStyle = '#241a18'; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(256, 80); g.lineTo(234, 190); g.lineTo(276, 300); g.lineTo(248, 430); g.stroke();
  return tx(c);
}

// İkinci iskelet müze vitrini diyagramı (Set 3 cam vitrin içi)
function skeletonDiagramTex() {
  const [c, g] = cnv(512, 768);
  g.fillStyle = '#182438'; g.fillRect(0, 0, 512, 768);
  g.strokeStyle = 'rgba(255,215,140,0.22)'; g.lineWidth = 4; g.strokeRect(18, 18, 476, 732);
  // stilize beyaz ana iskelet (omurga, kaburga, omuz, kollar, bacaklar)
  g.strokeStyle = '#f2eee4'; g.fillStyle = '#f2eee4'; g.lineWidth = 14; g.lineCap = 'round';
  g.beginPath(); g.arc(256, 130, 48, 0, 6.29); g.stroke(); // kafatası halkası
  g.beginPath(); g.moveTo(256, 180); g.lineTo(256, 420); g.stroke(); // omurga
  for (const ry of [225, 260, 295, 330]) {
    g.beginPath(); g.ellipse(256, ry, 72 - (ry - 225) * .18, 12, 0, 0, 6.29); g.stroke();
  }
  // kollar & bacaklar
  g.beginPath(); g.moveTo(165, 210); g.lineTo(132, 405); g.moveTo(347, 210); g.lineTo(380, 405); g.stroke();
  g.beginPath(); g.moveTo(212, 425); g.lineTo(192, 620); g.moveTo(300, 425); g.lineTo(320, 620); g.stroke();
  // altın-kırmızı "İKİNCİ İSKELET" kemik köprüleri!
  g.strokeStyle = '#ffbf5e'; g.lineWidth = 10;
  g.beginPath();
  g.moveTo(175, 215); g.quadraticCurveTo(256, 280, 345, 225);
  g.moveTo(155, 290); g.quadraticCurveTo(240, 360, 330, 320);
  g.moveTo(210, 430); g.quadraticCurveTo(256, 510, 310, 455);
  g.stroke();
  g.fillStyle = '#ffcf70'; g.font = '900 36px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('FOP · TAŞ ADAM', 256, 688);
  g.fillStyle = '#b4c6dc'; g.font = '700 24px system-ui, sans-serif';
  g.fillText('HARRY EASTLACK (1933–1973)', 256, 728);
  return tx(c);
}

// Bilim Müzesi akşam penceresi gün batımı panoraması
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function museumSunsetTex() {
  const Pn = pano(4096, 1800, 105, -14, 32), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#2c3c6e')); sky.addColorStop(.48, D('#785284')); sky.addColorStop(.82, D('#e28e54')); sky.addColorStop(1, D('#ffd48c'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(73);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = D(i % 2 ? '#f4aa74' : '#c6748c', .46);
    g.beginPath(); g.ellipse(R() * Pn.w, Pn.Y(8 + R() * 16), 210 + R() * 220, 18 + R() * 12, 0, 0, 6.29); g.fill();
  }
  const sx = Pn.X(0), sy = Pn.Y(4.5), sr = Pn.s * 3.4;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.1);
  gr.addColorStop(0, 'rgba(255,244,212,1)'); gr.addColorStop(.35, 'rgba(255,212,148,.88)'); gr.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr * 3.1, 0, 6.29); g.fill();
  g.fillStyle = '#fff8e2'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.29); g.fill();
  g.fillStyle = D('#2a284e'); g.fillRect(0, Pn.Y(0), Pn.w, Pn.h - Pn.Y(0));
  const y0 = Pn.Y(1.0);
  g.fillStyle = D('#3a325a');
  g.beginPath(); g.moveTo(0, Pn.h); g.lineTo(0, y0);
  for (let x = 0; x <= Pn.w; x += 62) { const hh = 45 + R() * 88; g.lineTo(x, y0 - hh); g.lineTo(x + 54, y0 - hh); }
  g.lineTo(Pn.w, Pn.h); g.closePath(); g.fill();
  g.fillStyle = '#ffd27a';
  for (let i = 0; i < 95; i++) g.fillRect(R() * Pn.w, y0 - 16 - R() * 72, 7, 11);
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

// ---------------------------------------------------------------- SET 1: 1940'LAR KLİNİK & RÖNTGEN (x = 0)
function buildClinic(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#9e7d58', plank: 40, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(clinicWallTex([3, 1])));
  backW.position.set(0, 2.6, -3.2); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(clinicWallTex([3, 1])));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.8, 2.6, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(clinicWallTex([3, 1])));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.8, 2.6, 1.5); g.add(rightW);

  // Sol duvarda sıcak güneşli hastane penceresi
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.7), new THREE.MeshBasicMaterial({ color: '#fff0cc' }));
  win.rotation.y = Math.PI / 2; win.position.set(-4.74, 2.25, -1.0); g.add(win);

  // Arka duvarda IŞIKLI RÖNTGEN PANOSU (iki yüz: normal + severe kırmızı — P05'te değişir!)
  const xbFrame = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.82, .14), flat('#384652'));
  xbFrame.position.set(0, 1.85, -3.1); g.add(xbFrame);
  dyn.xrayNorm = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.64), new THREE.MeshBasicMaterial({ map: xrayTex(false) }));
  dyn.xrayNorm.position.set(0, 1.85, -3.02); dyn.xrayNorm.userData.noShadow = true; g.add(dyn.xrayNorm);
  dyn.xraySev = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.64), new THREE.MeshBasicMaterial({ map: xrayTex(true) }));
  dyn.xraySev.position.set(0, 1.85, -3.01); dyn.xraySev.userData.noShadow = true; dyn.xraySev.visible = false; g.add(dyn.xraySev);
  fx.xGlow = glow(scene, [0, 1.85, -2.9], { size: 2.3, color: '#8ad8ff', strength: .35 });

  // Ahşap muayene masası (solda-önde değil, hafif kenarda x = -1.18, z = -.65 — Harry P01'de köşesine çarpar!)
  const tbl = new THREE.Group(); tbl.position.set(-1.18, 0, -.65); g.add(tbl);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.05, .09, .72), painted(woodTex({ base: '#8a5d3b', plank: 30 })));
  top.position.y = .72; tbl.add(top);
  for (const lx of [-.44, .44]) for (const lz of [-.28, .28]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .72, 10), flat('#5e3e26'));
    leg.position.set(lx, .36, lz); tbl.add(leg);
  }
  // Sağda küçük ilaç dolabı
  const cab = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.9, .45), flat('#e8ebe8'));
  cab.position.set(2.35, .95, -2.88); g.add(cab);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(.36, .1, .04), flat('#c84038'));
  crossH.position.set(2.35, 1.45, -2.64); g.add(crossH);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(.1, .36, .04), flat('#c84038'));
  crossV.position.set(2.35, 1.45, -2.64); g.add(crossV);

  // Işık: soğuk mint/gök dolgusu + sıcak güneş (kameranın arka-solundan, asla kameraya karşı değil!)
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#bfe0ea', '#7a6856', 2.0));
  const SUN = [.48, -.42, -.76]; dyn.cSun = V(...SUN).normalize();
  const key = sun('#ffe0a8', 2.85, SUN, [0, 1, -1], { ext: 8 }); L.add(key); L.add(key.target);
  scene.add(L); sets.clinic = { g, L }; shadows(g);
  fx.cBeams = [[-4.5, 3.0, -1.4], [-4.5, 2.7, -.5]].map(p =>
    beam(scene, p, [p[0] + 4.4, p[1] - 2.0, p[2] + .8], { r0: .45, r1: 1.2, color: '#ffe8b8', strength: .14 })
  );
}

// ---------------------------------------------------------------- SET 2: DNA & BETON ODASI (x = 200)
function buildLab(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), flat('#18243c'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), flat('#141e34'));
  backW.position.set(0, 6, -5.0); g.add(backW);

  // 3B DÖNEN DNA ÇİFT SARMALI (x = 200, z = -1.2 — P06'da dikey kadrajın tam ortasında!)
  dyn.dna = new THREE.Group(); dyn.dna.position.set(0, 1.62, -1.2); g.add(dyn.dna);
  const strandA = flat('#5ec8ff'), strandB = flat('#ffcf66'), errMat = new THREE.MeshBasicMaterial({ color: '#ff4b3e' });
  for (let i = 0; i < 12; i++) {
    const y = (i - 5.5) * .22;
    const ang = i * .58;
    const isErr = i === 6; // TEK HARF HATASI!
    const rad = .46;
    const x1 = Math.cos(ang) * rad, z1 = Math.sin(ang) * rad;
    const x2 = -x1, z2 = -z1;
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(isErr ? .105 : .075, 14, 10), isErr ? errMat : strandA);
    s1.position.set(x1, y, z1); s1.userData.noShadow = true; dyn.dna.add(s1);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(isErr ? .105 : .075, 14, 10), isErr ? errMat : strandB);
    s2.position.set(x2, y, z2); s2.userData.noShadow = true; dyn.dna.add(s2);
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(isErr ? .042 : .024, isErr ? .042 : .024, rad * 2, 10), isErr ? errMat : flat('#9ad4f5'));
    rung.position.set(0, y, 0); rung.rotation.z = Math.PI / 2; rung.rotation.y = -ang; rung.userData.noShadow = true; dyn.dna.add(rung);
  }
  const dnaLbl = new THREE.Mesh(new THREE.PlaneGeometry(1.42, .56), new THREE.MeshBasicMaterial({ map: badgeTex('ACVR1 GENİ', 'TEK HARF HATASI!', '#1a1c30', '#ffffff', '#ff5447'), transparent: true }));
  dnaLbl.position.set(0, 3.05, -1.2); dnaLbl.userData.noShadow = true; g.add(dnaLbl);
  dyn.dnaLbl = dnaLbl;
  fx.dnaGlow = glow(scene, [200, 1.75, -1.0], { size: 2.0, color: '#ff5447', strength: .48 });

  // P07 GÜNDELİK BENZETME: Çatlak Tuğla Duvar + Taşan Gri Beton Blokları!
  dyn.wallGrp = new THREE.Group(); dyn.wallGrp.position.set(.44, 0, .2); g.add(dyn.wallGrp);
  const brickW = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.05, .24), painted(brickCrackTex()));
  brickW.position.set(0, 1.02, -.15); dyn.wallGrp.add(brickW);
  const concMat = flat('#9ca4ac'), concDark = flat('#7c848c');
  dyn.concreteBlocks = [
    [0, .35, .18, .92, .68, .52, concMat],
    [-.12, .92, .22, .78, .58, .56, concDark],
    [.15, 1.45, .18, .72, .52, .48, concMat],
    [0, .65, .44, .64, .54, .44, concDark],
  ].map(([bx, by, bz, w, h, d, m]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(bx, by, bz); dyn.wallGrp.add(b); return b;
  });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#94b8f2', '#3d385a', 1.95));
  const SUN = [-.32, -.45, -.84]; dyn.mSun = V(...SUN).normalize();
  const s = sun('#ffd492', 2.45, SUN, [200, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.lab = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: BİLİM MÜZESİ AKŞAM GALERİSİ (x = 300)
function buildMuseum(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), painted(woodTex({ base: '#6e5648', plank: 46, rep: [3, 3] })));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 1.2; g.add(floor);
  // balkon / galeri korkuluğu
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(9.0, .14, .26), flat('#b4a296'));
  railTop.position.set(0, .92, -1.85); g.add(railTop);
  for (let x = -4.0; x <= 4.0; x += .6) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.048, .06, .84, 10), flat('#98867c'));
    col.position.set(x, .46, -1.85); g.add(col);
  }
  // Cam Müze Vitrini (arka-orta z = -1.15, iki karakterin tam arkasında ışıldar!)
  const vit = new THREE.Group(); vit.position.set(0, 0, -1.15); g.add(vit);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.18, .55, .64), flat('#3a3646')); ped.position.y = .275; vit.add(ped);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.56), new THREE.MeshBasicMaterial({ map: skeletonDiagramTex() }));
  board.position.set(0, 1.38, .05); board.userData.noShadow = true; vit.add(board);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.66, .08), flat('#c89c4c'));
  frame.position.set(0, 1.38, 0); vit.add(frame);

  // Akşam gün batımı panoraması
  const far = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(museumSunsetTex(), { yaw: Math.PI, az: 105 * Math.PI / 180, el: [-14 * Math.PI / 180, 32 * Math.PI / 180], gain: 1.25 })
  );
  far.material.side = THREE.BackSide; g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a898e6', '#5c4b62', 1.85));
  const SUN = [0, -.26, 1]; dyn.hSun = V(...SUN).normalize();
  const s = sun('#ffaa60', 2.95, SUN, [300, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  const fill = new THREE.DirectionalLight('#c4bcff', 1.2); fill.position.set(302.5, 3.6, 7.5); fill.target.position.set(300, 1.1, 0);
  L.add(fill); L.add(fill.target);
  scene.add(L); sets.museum = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU (Dikey 9:16 güvenli mesafeler!)
function cameraPath() {
  const k = [
    // P01 PARADOKS KANCA (4 hızlı plan): geniş klinik → masa çarpma → röntgen panosu → Harry şaşkın yakın
    { t: 0, pos: [-.4, 1.25, 3.8], look: [-.25, 1.05, -.8], fov: 50, creep: .26, drift: .03 },
    { t: P(1, .30), dur: .40, pos: [-.75, 1.05, 1.85], look: [-.78, .85, -.65], fov: 46, creep: .28 },
    { t: P(1, .60), dur: .28, move: 'whip', pos: [0, 1.82, .15], look: [0, 1.85, -3.05], fov: 44, creep: .28 },
    { t: P(1, .86), dur: .28, move: 'whip', pos: [-.42, 1.08, 1.55], look: [-.46, 1.0, -.75], fov: 44, creep: .26 },
    // P02 "Bakın, beş yaşındaki Harry...": Harry + Cerrah tam ikili plan
    { t: PS(2) + .16, dur: .32, move: 'whip', pos: [-.05, 1.22, 3.75], look: [-.05, 1.12, -.85], fov: 50, creep: .22 },
    // P03 Röntgen + ikili plan (yeni kemik!)
    { t: PS(3) + .18, dur: .46, pos: [0, 1.52, 2.85], look: [0, 1.55, -2.4], fov: 50, creep: .26 },
    // P04 Cerrah gülümser: "Kolay iş, ameliyatla alırız!"
    { t: PS(4) + .14, dur: .30, move: 'whip', pos: [.45, 1.32, 2.15], look: [.42, 1.28, -.82], fov: 44, creep: .28 },
    // P05 Ameliyat ters tepti! Kırmızı dev röntgen panosu + şok darbesi
    { t: PS(5) + .14, dur: .30, move: 'whip', pos: [0, 1.72, .55], look: [0, 1.82, -3.0], fov: 46, creep: .32 },
    // P06 WHIP PAN → SET 2: 3B dönen DNA çift sarmalı & kırmızı ACVR1 hatası (tam ortada!)
    { t: PS(6) + .14, dur: .32, move: 'whip', pos: [200.0, 1.82, 4.35], look: [200.0, 1.95, -1.2], fov: 50, creep: .28 },
    // P07 Gündelik benzetme: Bilimci + çatlak duvardan taşan beton blokları (tam kadrajda!)
    { t: PS(7) + .16, dur: .36, move: 'whip', pos: [200.0, 1.18, 4.15], look: [200.0, 1.08, .2], fov: 50, creep: .24 },
    // P08 WHIP PAN → SET 3: Müze vitrinindeki İkinci İskelet diyagramı + Harry & Bilimci
    { t: PS(8) + .14, dur: .32, move: 'whip', pos: [300.0, 1.32, 2.55], look: [300.0, 1.38, -1.1], fov: 48, creep: .26 },
    // P09 Taş Adam Sendromu: Harry + Bilimci vitrinin önünde (tam ikili plan!)
    { t: PS(9) + .18, dur: .42, pos: [300.0, 1.22, 3.65], look: [300.0, 1.22, -.8], fov: 50, creep: .20 },
    // P10 Son vuruş: akşam ışığında yumuşakça geri çekilir (~4.45 m)
    { t: DUR, dur: Math.max(.5, DUR - PS(10) - .05), pos: [300.0, 1.32, 4.45], look: [300.0, 1.24, -3.5], fov: 52, creep: .15 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(5, .35), 1.15); // ameliyat ters tepme darbesi
  cp.kick(P(6, .45), .9);   // tek harf hatası vurgusu
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
  scene.background = new THREE.Color('#243248');
  buildClinic(scene); buildLab(scene); buildMuseum(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  fx.motes = new Smoke(scene, { color: '#ffe6b8', maxPoints: 450, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 140, size: .011, alpha: .55, speed: .04, on: t => where(t) === 'clinic',
    path: (u, t, i) => [-2.0 + (hash(i, 1) - .5) * 4.5, 1.5 + (hash(i, 2) - .5) * 2.4 + (u - .5) * .3, -1.0 + (hash(i, 3) - .5) * 3.0],
  });
  fx.motes.wisps.push({
    n: 110, size: .014, alpha: .75, speed: .25, on: t => where(t) === 'lab',
    path: (u, t, i) => [200 + (hash(i, 4) - .5) * 3.4, 1.5 + (hash(i, 5) - .5) * 2.6 + Math.sin(t + i) * .08, -1.0 + (hash(i, 6) - .5) * 2.2],
  });
  fx.motes.wisps.push({
    n: 90, size: .011, alpha: .5, speed: .04, on: t => where(t) === 'museum',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 5.0, 1.4 + (hash(i, 8) - .5) * 2.4 + (u - .5) * .3, (hash(i, 9) - .5) * 3.0],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(6) - .06, 'whoosh');
  cue(PS(7) - .06, 'whoosh');
  cue(PS(8) - .06, 'whoosh');
  cue(P(1, .28), 'bump');
  cue(P(1, .60), 'xray', { dur: .65 });
  cue(PS(3), 'xray', { dur: .9 });
  cue(PS(4) + .1, 'laugh', { dur: .65 });
  cue(P(5, .35), 'boom');
  cue(P(5, .35), 'snap');
  cue(P(6, .45), 'snap');
  cue(P(7, .35), 'concrete', { dur: 1.4 });
  cue(PS(8), 'evening', { dur: DUR - PS(8) });
  cue(PE(10) - .2, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return t < PS(6) ? 'clinic' : t < PS(8) ? 'lab' : 'museum'; }
function camSet(cam) { return cam.position.x > 250 ? 'museum' : cam.position.x > 100 ? 'lab' : 'clinic'; }
const WARM = '#ffd898', COOL = '#cde4f6';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['clinic', 'lab', 'museum']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tint = here === 'clinic' ? [1, 1, .99] : here === 'lab' ? [.98, .99, 1.03] : [1.03, .98, .96];

  for (const b of fx.cBeams) b.visible = here === 'clinic';
  fx.xGlow.visible = here === 'clinic';
  fx.dnaGlow.visible = here === 'lab' && t < PS(7) - .1;

  const hr = cast.harry, cr = cast.cerrah, blm = cast.bilimci;

  if (here === 'clinic') {
    const severe = t >= P(5, .30);
    dyn.xrayNorm.visible = !severe;
    dyn.xraySev.visible = severe;
    fx.xGlow.material.color.set(severe ? '#ff6454' : '#8ad8ff');

    // Harry (solda, P01'de masaya hafif çarpar, sonra şaşkın/endişeli)
    const bumpU = Math.sin(ramp(t, P(1, .20), P(1, .45)) * Math.PI);
    hr.show(); hr.place(-.48 - bumpU * .18, 0, -.75, cam, tint);
    const wow = t >= P(1, .75) || t >= PS(3);
    hr.draw({
      expr: severe ? 'worried' : wow ? 'surprised' : 'neutral',
      look: t >= PS(4) ? .6 : .15,
      sweat: severe || wow ? 1 : 0,
      blink: bl(1, P(1, .3), PS(3), P(5, .3)),
      armL: bumpU > .1 ? [95, 25] : [20, 18],
      armR: [20, 18],
      lit: -1, shade: COOL, rim: { color: WARM, a: .36 },
    });
    hr.castFrom(dyn.cSun, true);

    // Cerrah (sağda, P04'te özgüvenle gülümser, P05'te şok!)
    if (t >= PS(2) - .15) {
      cr.show(); cr.place(.42, 0, -.82, cam, tint);
      const smug = t >= PS(4) && t < PS(5);
      cr.draw({
        expr: severe ? 'surprised' : smug ? 'laugh' : 'smile',
        look: -.6,
        mouth: Math.max(talk(PS(4), PE(4)), smug ? .6 : 0),
        laughMarks: smug ? .85 : 0,
        sweat: severe ? 1 : 0,
        blink: bl(2, PS(2), PS(4), P(5, .3)),
        propL: 'scroll', propR: 'pen',
        armL: [58, 38], armR: smug ? [112, 32] : [55, 36],
        bob: smug ? -Math.abs(Math.sin(t * 12)) * 8 : 0,
        lit: -1, shade: COOL, rim: { color: WARM, a: .35 },
      });
      cr.castFrom(dyn.cSun, true);
    }
  } else if (here === 'lab') {
    const showWall = t >= PS(7) - .18;
    dyn.dna.visible = !showWall;
    dyn.dnaLbl.visible = !showWall;
    dyn.wallGrp.visible = showWall;

    if (!showWall) {
      dyn.dna.rotation.y = t * 1.15;
    } else {
      // Beton blokları çatlak duvardan birer birer taşıp odayı doldurur!
      dyn.concreteBlocks.forEach((b, idx) => {
        const u = ramp(t, P(7, .18 + idx * .16), P(7, .36 + idx * .16));
        b.scale.setScalar(Math.max(.001, u));
        b.visible = u > .01;
      });
      blm.show(); blm.place(199.50, 0, .22, cam, tint);
      blm.draw({
        expr: 'focused', look: .65,
        blink: bl(3, PS(7)),
        armR: [92, 28], armL: [22, 18],
        lit: 1, shade: COOL, rim: { color: '#ffbe58', a: .42 },
      });
      blm.castFrom(dyn.mSun, true);
    }
  } else {
    // SET 3: Bilim Müzesi Akşam Galerisi — Harry + Bilimci, arkalarında İkinci İskelet vitrini ve gün batımı!
    hr.show(); hr.place(299.58, 0, -.18, cam, tint);
    hr.draw({
      expr: t > PS(10) ? 'neutral' : 'worried',
      look: .25, lookY: -.1,
      blink: bl(4, PS(9), PS(10)),
      armL: [18, 14], armR: [18, 14],
      lit: -1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .52 },
    });
    blm.show(); blm.place(300.42, 0, -.22, cam, tint);
    blm.draw({
      expr: t > PS(10) ? 'smile' : 'focused',
      look: -.45,
      blink: bl(5, PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [56, 36], armR: [62, 40],
      lit: 1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .52 },
    });
    hr.castFrom(dyn.hSun, true); blm.castFrom(dyn.hSun, true);
  }

  fx.motes.update(t);
  for (const b of fx.cBeams) b.material.uniforms.uT.value = t;

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'clinic') {
    const subj = t >= P(5, .1) ? V(0, 1.8, -3.0) : V(-.05, 1.1, -.8);
    look = { ...focusOn(subj, 4.2, 4.5), sat: 1.18, lift: [.09, .1, .12], bloom: .78, vignette: .2 };
    C.scene.fog = null;
  } else if (here === 'lab') {
    const subj = t >= PS(7) - .15 ? V(200, 1.1, .2) : V(200, 1.75, -1.2);
    look = { ...focusOn(subj, 3.5, 5), sat: 1.24, lift: [.08, .09, .14], bloom: 1.0, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.2, -.4), 4, 5), sat: 1.2, lift: [.1, .09, .15], bloom: .95, vignette: .22 };
    C.scene.fog = null;
  }
  look.tint = here === 'clinic' ? [1.0, 1.0, .99] : here === 'lab' ? [.98, 1.0, 1.04] : [1.04, .98, .96];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
