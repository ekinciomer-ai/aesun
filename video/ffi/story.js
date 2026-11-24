// En Garip Hastalıklar #05: Ölümcül Ailevi Uykusuzluk (FFI) — yumurta kafa stili.
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler: 1984 GECE ODASI & EEG KLİNİĞİ (x≈0), TALAMUS ŞALTERİ & SÖNMEYEN LAMBA (x≈200), BOLOGNA ŞAFAK BALKONU (x≈300).
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'ffi-uykusuzluk';
export const FPS = 30;
export let DUR = 39;
export const CUES = [];
export const LOOK = {
  silvano: {
    headW: 266, headH: 248,
    mustache: '#4d4644',
    cloth: '#3c5274', clothDark: '#263650',
    pattern: 'hstripes', stripe: '#263650',
    buttons: '#cfd6e2', collar: true,
    bodyW: 210, height: 1.72,
  },
  nobetci: {
    headW: 260, headH: 246,
    cloth: '#dfe6ec', clothDark: '#b2c2d0',
    scarf: '#3a7a8c', scarfY: 6,
    pocket: true, collar: true, buttons: '#7a8e9e',
    bodyW: 202, height: 1.68,
  },
  lugaresi: {
    headW: 272, headH: 250,
    mustache: '#6c6866', beard: '#6c6866',
    cloth: '#6e4c44', clothDark: '#4a312c',
    trim: '#d8ccb8', buttons: '#d8ab4c',
    pocket: true, collar: true,
    bodyW: 218, height: 1.76,
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

// 1984 İtalya gece odası & uyku laboratuvarı duvarı (sıcak taş-mavi kontrastlı)
function roomWallTex(rep = [3, 1]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#c4cfdc'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#c4cfdc', 240, 22, .14, 31, .2);
  g.fillStyle = '#5e4b3c'; g.fillRect(0, 385, 512, 127);
  g.fillStyle = '#7a624e'; g.fillRect(0, 376, 512, 12);
  return tx(c, rep);
}

// Büyük Analog Saat kadranı
function clockFaceTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#f8f2e4'; g.beginPath(); g.arc(256, 256, 240, 0, 6.29); g.fill();
  g.strokeStyle = '#362c28'; g.lineWidth = 18; g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.strokeStyle = i % 3 === 0 ? '#b83a2a' : '#362c28';
    g.lineWidth = i % 3 === 0 ? 12 : 6;
    g.beginPath();
    g.moveTo(256 + Math.cos(a) * 182, 256 + Math.sin(a) * 182);
    g.lineTo(256 + Math.cos(a) * 218, 256 + Math.sin(a) * 218);
    g.stroke();
  }
  g.fillStyle = '#b83a2a'; g.font = '900 44px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('03:00', 256, 365);
  return tx(c);
}

// EEG Uyku Monitörü (normal: düz/sıfır derin uyku, alarm: kırmızı 145 nabız / GÜN 120)
function eegTex(alarm = false) {
  const [c, g] = cnv(640, 420);
  g.fillStyle = alarm ? '#240f16' : '#0e222e'; g.fillRect(0, 0, 640, 420);
  g.strokeStyle = alarm ? 'rgba(255,95,85,0.22)' : 'rgba(95,210,255,0.2)'; g.lineWidth = 2;
  for (let x = 40; x < 640; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 420); g.stroke(); }
  for (let y = 40; y < 420; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(640, y); g.stroke(); }
  // EEG hızlı uyanık testere dalgası (derin uyku YOK!)
  g.strokeStyle = alarm ? '#ff5548' : '#5ee6b8'; g.lineWidth = 6; g.beginPath();
  for (let x = 24; x <= 616; x += 10) {
    const amp = alarm ? 52 : 28;
    const y = 215 + Math.sin(x * .22) * amp + Math.cos(x * .55) * (amp * .5);
    if (x === 24) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  g.fillStyle = alarm ? '#ff5c4d' : '#ffcf5c';
  g.font = '900 44px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText(alarm ? 'NABIZ: 145 · GÜN 120' : 'DERİN UYKU: %0', 320, 74);
  g.fillStyle = '#dce8f2'; g.font = '700 30px system-ui, sans-serif';
  g.fillText(alarm ? 'KRİTİK UYKUSUZLUK' : 'EEG · SÜREKLİ UYANIK', 320, 368);
  return tx(c);
}

// Etiket tabelası
function badgeTex(title, sub, bg, fg, accent) {
  const [c, g] = cnv(560, 210);
  g.fillStyle = bg; g.beginPath(); g.roundRect(12, 12, 536, 186, 32); g.fill();
  g.strokeStyle = accent; g.lineWidth = 10; g.stroke();
  g.fillStyle = fg; g.font = '900 60px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(title, 280, 82);
  g.fillStyle = accent; g.font = '800 38px system-ui, sans-serif';
  g.fillText(sub, 280, 148);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Bologna şafak panoraması (sıcak gün doğumu + ünlü ikiz İtalyan ortaçağ kuleleri silueti)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function bolognaDawnTex() {
  const Pn = pano(4096, 1800, 105, -14, 32), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#2a366c')); sky.addColorStop(.45, D('#845282')); sky.addColorStop(.8, D('#ea9258')); sky.addColorStop(1, D('#ffd890'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(85);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = D(i % 2 ? '#f8b27a' : '#ca7a90', .45);
    g.beginPath(); g.ellipse(R() * Pn.w, Pn.Y(8 + R() * 16), 200 + R() * 220, 18 + R() * 12, 0, 0, 6.29); g.fill();
  }
  const sx = Pn.X(4), sy = Pn.Y(3.8), sr = Pn.s * 3.5;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.2);
  gr.addColorStop(0, 'rgba(255,246,216,1)'); gr.addColorStop(.35, 'rgba(255,214,150,.88)'); gr.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr * 3.2, 0, 6.29); g.fill();
  g.fillStyle = '#fff9e6'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.29); g.fill();
  g.fillStyle = D('#2a264c'); g.fillRect(0, Pn.Y(0), Pn.w, Pn.h - Pn.Y(0));
  const y0 = Pn.Y(1.0);
  g.fillStyle = D('#423254'); g.strokeStyle = D('#241a34', .9); g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, Pn.h); g.lineTo(0, y0);
  for (let x = 0; x <= Pn.w; x += 64) { const hh = 48 + R() * 72; g.lineTo(x, y0 - hh); g.lineTo(x + 56, y0 - hh); }
  g.lineTo(Pn.w, Pn.h); g.closePath(); g.fill(); g.stroke();
  // Bologna tarzı ikiz tuğla kule silueti (hafif eğik!)
  const tx1 = Pn.X(-18), tx2 = Pn.X(-13);
  g.save(); g.translate(tx1, y0); g.rotate(-.03); g.fillRect(-16, -240, 32, 240); g.strokeRect(-16, -240, 32, 240); g.restore();
  g.save(); g.translate(tx2, y0); g.rotate(.055); g.fillRect(-14, -155, 28, 155); g.strokeRect(-14, -155, 28, 155); g.restore();
  g.fillStyle = '#ffd27a';
  for (let i = 0; i < 100; i++) g.fillRect(R() * Pn.w, y0 - 16 - R() * 68, 7, 11);
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

// ---------------------------------------------------------------- SET 1: 1984 GECE ODASI & EEG KLİNİĞİ (x = 0)
function buildClinic(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#8c6844', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.4), flat('#3a4e6e'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, .006, -.4); g.add(rug);

  const backW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(roomWallTex([3, 1])));
  backW.position.set(0, 2.6, -3.2); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(roomWallTex([3, 1])));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.8, 2.6, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(roomWallTex([3, 1])));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.8, 2.6, 1.5); g.add(rightW);

  // Sol duvarda soğuk gece mavi pencere
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.7), new THREE.MeshBasicMaterial({ color: '#9ec4f5' }));
  win.rotation.y = Math.PI / 2; win.position.set(-4.74, 2.25, -1.1); g.add(win);

  // Arka duvarda SOLDA BÜYÜK ANALOG SAAT (akrep + yelkovan hızla döner!)
  const clkGrp = new THREE.Group(); clkGrp.position.set(-1.15, 2.15, -3.12); g.add(clkGrp);
  const clkFace = new THREE.Mesh(new THREE.CircleGeometry(.56, 32), new THREE.MeshBasicMaterial({ map: clockFaceTex() }));
  clkFace.userData.noShadow = true; clkGrp.add(clkFace);
  dyn.handMin = new THREE.Mesh(new THREE.BoxGeometry(.035, .42, .02), flat('#241c18'));
  dyn.handMin.geometry.translate(0, .18, 0); dyn.handMin.position.z = .02; clkGrp.add(dyn.handMin);
  dyn.handHr = new THREE.Mesh(new THREE.BoxGeometry(.05, .28, .02), flat('#b83a2a'));
  dyn.handHr.geometry.translate(0, .11, 0); dyn.handHr.position.z = .03; clkGrp.add(dyn.handHr);

  // Arka duvarda SAĞ-ORTADA EEG UYKU MONİTÖRÜ (normal & kırmızı alarm)
  const monFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.18, .14), flat('#2b3642'));
  monFrame.position.set(.48, 2.05, -3.1); g.add(monFrame);
  dyn.eegNorm = new THREE.Mesh(new THREE.PlaneGeometry(1.60, 1.04), new THREE.MeshBasicMaterial({ map: eegTex(false) }));
  dyn.eegNorm.position.set(.48, 2.05, -3.02); dyn.eegNorm.userData.noShadow = true; g.add(dyn.eegNorm);
  dyn.eegAlarm = new THREE.Mesh(new THREE.PlaneGeometry(1.60, 1.04), new THREE.MeshBasicMaterial({ map: eegTex(true) }));
  dyn.eegAlarm.position.set(.48, 2.05, -3.01); dyn.eegAlarm.userData.noShadow = true; dyn.eegAlarm.visible = false; g.add(dyn.eegAlarm);
  fx.eegGlow = glow(scene, [.48, 2.05, -2.9], { size: 2.0, color: '#5ee6b8', strength: .32 });

  // Başucu / klinik masası (x = .72, z = -.48) + sıcak sarı abajur + uyku hapı şişesi
  const tbl = new THREE.Group(); tbl.position.set(.78, 0, -.48); g.add(tbl);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.05, .08, .66), painted(woodTex({ base: '#765034', plank: 30 })));
  top.position.y = .74; tbl.add(top);
  for (const lx of [-.44, .44]) for (const lz of [-.24, .24]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .74, 10), flat('#4e3422'));
    leg.position.set(lx, .37, lz); tbl.add(leg);
  }
  const lampB = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, .18, 14), flat('#c89a48')); lampB.position.set(.32, .87, -.1); tbl.add(lampB);
  const lampS = new THREE.Mesh(new THREE.CylinderGeometry(.1, .18, .22, 16), new THREE.MeshBasicMaterial({ color: '#ffe088' }));
  lampS.position.set(.32, 1.07, -.1); lampS.userData.noShadow = true; tbl.add(lampS);
  fx.lampGlow = glow(scene, [1.1, 1.1, -.58], { size: 1.5, color: '#ffd070', strength: .42 });

  // Uyku hapı şişesi (P04'te devrilir!)
  dyn.pillBottle = new THREE.Group(); dyn.pillBottle.position.set(.48, .88, -.42); g.add(dyn.pillBottle);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .19, 14), flat('#d87832')); dyn.pillBottle.add(bot);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .05, 14), flat('#f2efe8')); cap.position.y = .11; dyn.pillBottle.add(cap);

  // Işık: soğuk gece mavi dolgu + sıcak abajur / anahtar ışık (kameranın arka-sağından!)
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#9ec2f2', '#6a584c', 1.95));
  const SUN = [-.45, -.42, -.78]; dyn.cSun = V(...SUN).normalize();
  const key = sun('#ffd898', 2.8, SUN, [0, 1, -1], { ext: 8 }); L.add(key); L.add(key.target);
  const warmPt = new THREE.PointLight('#ffbe64', 2.4, 8); warmPt.position.set(1.1, 1.35, -.55); L.add(warmPt);
  scene.add(L); sets.clinic = { g, L }; shadows(g);
  fx.cBeams = [[-4.5, 3.0, -1.5], [-4.5, 2.7, -.6]].map(p =>
    beam(scene, p, [p[0] + 4.3, p[1] - 2.0, p[2] + .8], { r0: .42, r1: 1.15, color: '#b4d6ff', strength: .14 })
  );
}

// ---------------------------------------------------------------- SET 2: TALAMUS ŞALTERİ & SÖNMEYEN LAMBA (x = 200)
function buildBrainSwitch(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), flat('#162038'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), flat('#121a30'));
  backW.position.set(0, 6, -5.0); g.add(backW);

  // P06: DEV TALAMUS UYKU ŞALTERİ (ortada, AÇIK konumda mor-kırmızı prion kristalleriyle kilitlenir!)
  dyn.switchGrp = new THREE.Group(); dyn.switchGrp.position.set(0, 1.58, -1.2); g.add(dyn.switchGrp);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.48, .26), flat('#2b3c58')); dyn.switchGrp.add(box);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(.24, .92, .1), flat('#0e1524')); slot.position.z = .12; dyn.switchGrp.add(slot);
  // Şalter kolu (yukarıda = UYANIK / AÇIK konumda kilitli!)
  dyn.lever = new THREE.Group(); dyn.lever.position.set(0, 0, .14); dyn.switchGrp.add(dyn.lever);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .62, 12), flat('#dce4ec'));
  arm.position.set(0, .26, .16); arm.rotation.x = -.55; dyn.lever.add(arm);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.14, 18, 14), new THREE.MeshBasicMaterial({ color: '#ff5244' }));
  knob.position.set(0, .52, .34); knob.userData.noShadow = true; dyn.lever.add(knob);

  // Hatalı Prion Kristalleri (P06 ortasında şalterin etrafında büyüyüp kolu kilitler!)
  const prMat = new THREE.MeshBasicMaterial({ color: '#c44cff' });
  const prRed = new THREE.MeshBasicMaterial({ color: '#ff4b6e' });
  dyn.prions = [
    [-.28, .28, .24, .18], [.28, .24, .22, .16], [-.22, -.12, .24, .15],
    [.24, -.16, .22, .17], [0, .42, .26, .15], [0, .05, .28, .19],
  ].map(([px, py, pz, r], idx) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), idx % 2 ? prMat : prRed);
    m.position.set(px, py, pz); m.userData.noShadow = true; dyn.switchGrp.add(m); return m;
  });

  dyn.swLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, .56),
    new THREE.MeshBasicMaterial({ map: badgeTex('TALAMUS ŞALTERİ', 'KALICI KİLİTLENDİ!', '#181b30', '#ffffff', '#ff5268'), transparent: true })
  );
  dyn.swLbl.position.set(0, 2.95, -1.2); dyn.swLbl.userData.noShadow = true; g.add(dyn.swLbl);
  fx.swGlow = glow(scene, [200, 1.85, -.9], { size: 2.1, color: '#ff5268', strength: .45 });

  // P07 GÜNDELİK BENZETME: Sönmeyen Sarı Oda Ampulü + Yapıştırıcılı Duvar Anahtarı!
  dyn.bulbGrp = new THREE.Group(); dyn.bulbGrp.position.set(.42, 0, .2); g.add(dyn.bulbGrp);
  // Tepeden sarkan kablo ve dev parlak sarı ampul
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.3, 8), flat('#3a4458'));
  cord.position.set(0, 2.55, 0); dyn.bulbGrp.add(cord);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.30, 22, 18), new THREE.MeshBasicMaterial({ color: '#ffea80' }));
  bulb.position.set(0, 1.85, 0); bulb.userData.noShadow = true; dyn.bulbGrp.add(bulb);
  // Altında yapıştırıcıyla kilitlenmiş duvar düğmesi
  const swPlate = new THREE.Mesh(new THREE.BoxGeometry(.64, .78, .12), flat('#e8e2d4'));
  swPlate.position.set(0, .92, -.05); dyn.bulbGrp.add(swPlate);
  const swToggle = new THREE.Mesh(new THREE.BoxGeometry(.22, .32, .16), flat('#ff5c4d'));
  swToggle.position.set(0, .96, .06); swToggle.rotation.x = -.32; dyn.bulbGrp.add(swToggle);
  const glue = new THREE.Mesh(new THREE.SphereGeometry(.18, 14, 10), flat('#ffd85c'));
  glue.scale.set(1.2, .75, .45); glue.position.set(0, .82, .11); dyn.bulbGrp.add(glue);
  const bulbLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, .42),
    new THREE.MeshBasicMaterial({ map: badgeTex('IŞIK AÇIK', 'ASLA SÖNMÜYOR', '#182034', '#ffea80', '#ff6454'), transparent: true })
  );
  bulbLbl.position.set(0, .24, .05); bulbLbl.userData.noShadow = true; dyn.bulbGrp.add(bulbLbl);
  fx.bulbGlow = glow(scene, [200.42, 1.85, .3], { size: 2.6, color: '#ffdf66', strength: .55 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#92b4f2', '#3c3658', 1.95));
  const SUN = [-.32, -.45, -.84]; dyn.mSun = V(...SUN).normalize();
  const s = sun('#ffd694', 2.45, SUN, [200, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.brain = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: BOLOGNA ŞAFAK BALKONU (x = 300)
function buildDawn(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), flat('#8d7872'));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 1.6; g.add(floor);
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, .14, .28), flat('#b4a094'));
  railTop.position.set(0, .92, -1.65); g.add(railTop);
  for (let x = -3.8; x <= 3.8; x += .55) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.05, .065, .82, 10), flat('#a49288'));
    col.position.set(x, .48, -1.65); g.add(col);
  }
  const far = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(bolognaDawnTex(), { yaw: Math.PI, az: 105 * Math.PI / 180, el: [-14 * Math.PI / 180, 32 * Math.PI / 180], gain: 1.25 })
  );
  far.material.side = THREE.BackSide; g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a898e6', '#5c4a62', 1.85));
  const SUN = [0, -.26, 1]; dyn.hSun = V(...SUN).normalize();
  const s = sun('#ffaa60', 3.0, SUN, [300, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  const fill = new THREE.DirectionalLight('#c4bcff', 1.2); fill.position.set(302.5, 3.6, 7.5); fill.target.position.set(300, 1.1, 0);
  L.add(fill); L.add(fill.target);
  scene.add(L); sets.dawn = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU (Dikey 9:16 güvenli mesafeler!)
function cameraPath() {
  const k = [
    // P01 PARADOKS KANCA (4 hızlı plan): geniş gece odası → dönen duvar saati → EEG monitörü → Silvano açık gözler yakın
    { t: 0, pos: [-.4, 1.32, 3.85], look: [-.1, 1.2, -.85], fov: 50, creep: .26, drift: .03 },
    { t: P(1, .30), dur: .38, pos: [-1.1, 2.08, -.15], look: [-1.15, 2.15, -3.1], fov: 44, creep: .28 },
    { t: P(1, .60), dur: .28, move: 'whip', pos: [.45, 2.0, .05], look: [.48, 2.05, -3.05], fov: 46, creep: .28 },
    { t: P(1, .86), dur: .28, move: 'whip', pos: [-.45, 1.34, 1.55], look: [-.48, 1.32, -.75], fov: 44, creep: .28 },
    // P02 "Bakın, 1984 İtalya'sında...": Silvano + Nöbetçi Doktor ikili plan (tam kadraj!)
    { t: PS(2) + .16, dur: .32, move: 'whip', pos: [-.02, 1.25, 3.85], look: [-.04, 1.18, -.82], fov: 50, creep: .22 },
    // P03 Nöbetçi doktor güler: "Strestendir beyefendi, şu hapı alın!"
    { t: PS(3) + .14, dur: .30, move: 'whip', pos: [.48, 1.30, 2.25], look: [.44, 1.24, -.78], fov: 46, creep: .28 },
    // P04 En ağır ilaçlar bile işe yaramadı: Silvano + devrilen ilaç şişesi + dönen saat
    { t: PS(4) + .16, dur: .36, move: 'whip', pos: [-.08, 1.26, 3.45], look: [-.1, 1.16, -.78], fov: 50, creep: .26 },
    // P05 Prof. Lugaresi EEG ekranını inceler ve donup kalır!
    { t: PS(5) + .14, dur: .32, move: 'whip', pos: [.22, 1.48, 2.95], look: [.28, 1.52, -1.6], fov: 50, creep: .28 },
    // P06 WHIP PAN → SET 2: Dev Talamus Uyku Şalteri + kilitlenen prion kristalleri!
    { t: PS(6) + .14, dur: .32, move: 'whip', pos: [200.0, 1.78, 4.35], look: [200.0, 1.88, -1.2], fov: 50, creep: .28 },
    // P07 Gündelik benzetme: Prof. Lugaresi + hiç sönmeyen sarı ampul & yapıştırıcılı düğme!
    { t: PS(7) + .16, dur: .36, move: 'whip', pos: [200.0, 1.24, 4.25], look: [200.0, 1.18, .2], fov: 50, creep: .22 },
    // P08 WHIP PAN → SET 1: Kırmızı alarm EEG (`NABIZ: 145 · GÜN 120`) + Silvano bitkin!
    { t: PS(8) + .14, dur: .32, move: 'whip', pos: [.15, 1.55, 2.75], look: [.12, 1.62, -2.0], fov: 50, creep: .30 },
    // P09 WHIP PAN → SET 3: Bologna şafak balkonu, Silvano + Prof. Lugaresi (tam kadraj!)
    { t: PS(9) + .14, dur: .32, move: 'whip', pos: [300.0, 1.24, 3.55], look: [300.0, 1.20, -.8], fov: 50, creep: .20 },
    // P10 Son vuruş: yavaşça geri çekilir (~4.45 m)
    { t: DUR, dur: Math.max(.5, DUR - PS(10) - .05), pos: [300.0, 1.32, 4.45], look: [300.0, 1.22, -3.8], fov: 52, creep: .15 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .48), 1.15); // şalter kilitlenme darbesi!
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
  scene.background = new THREE.Color('#222e46');
  buildClinic(scene); buildBrainSwitch(scene); buildDawn(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  fx.motes = new Smoke(scene, { color: '#ffe4b4', maxPoints: 450, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 130, size: .011, alpha: .55, speed: .04, on: t => where(t) === 'clinic',
    path: (u, t, i) => [-2.0 + (hash(i, 1) - .5) * 4.5, 1.5 + (hash(i, 2) - .5) * 2.4 + (u - .5) * .3, -1.0 + (hash(i, 3) - .5) * 3.0],
  });
  fx.motes.wisps.push({
    n: 110, size: .014, alpha: .75, speed: .28, on: t => where(t) === 'brain',
    path: (u, t, i) => [200 + (hash(i, 4) - .5) * 3.4, 1.5 + (hash(i, 5) - .5) * 2.6 + Math.sin(t + i) * .08, -1.0 + (hash(i, 6) - .5) * 2.2],
  });
  fx.motes.wisps.push({
    n: 90, size: .011, alpha: .5, speed: .04, on: t => where(t) === 'dawn',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 5.0, 1.4 + (hash(i, 8) - .5) * 2.4 + (u - .5) * .3, (hash(i, 9) - .5) * 3.0],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(6) - .06, 'whoosh');
  cue(PS(7) - .06, 'whoosh');
  cue(PS(9) - .06, 'whoosh');
  cue(0.05, 'clock', { dur: PE(1) });
  cue(PS(3) + .1, 'laugh', { dur: .65 });
  cue(PS(4), 'clock', { dur: PE(4) - PS(4) });
  cue(PS(5), 'eeg', { dur: PE(5) - PS(5) });
  cue(P(6, .48), 'snap');
  cue(P(6, .48), 'boom');
  cue(PS(7), 'buzz', { dur: PE(7) - PS(7) });
  cue(PS(8), 'eeg', { dur: PE(8) - PS(8) });
  cue(PS(9), 'evening', { dur: DUR - PS(9) });
  cue(PE(10) - .2, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return (t < PS(6) || (t >= PS(8) && t < PS(9))) ? 'clinic' : t < PS(8) ? 'brain' : 'dawn'; }
function camSet(cam) { return cam.position.x > 250 ? 'dawn' : cam.position.x > 100 ? 'brain' : 'clinic'; }
const WARM = '#ffd690', COOL = '#cde2f6';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['clinic', 'brain', 'dawn']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tint = here === 'clinic' ? [1, .99, .99] : here === 'brain' ? [.98, .99, 1.03] : [1.03, .98, .96];

  for (const b of fx.cBeams) b.visible = here === 'clinic';
  fx.lampGlow.visible = here === 'clinic';
  fx.eegGlow.visible = here === 'clinic';
  fx.swGlow.visible = here === 'brain' && t < PS(7) - .1;
  fx.bulbGlow.visible = here === 'brain' && t >= PS(7) - .18;

  const sl = cast.silvano, nb = cast.nobetci, lg = cast.lugaresi;

  if (here === 'clinic') {
    // Saat kolları hızla döner (aylarca uykusuzluk!)
    const spin = t * 4.5;
    dyn.handMin.rotation.z = -spin;
    dyn.handHr.rotation.z = -spin / 8;

    // P04'te uyku hapı şişesi devrilir
    const tip = ramp(t, P(4, .25), P(4, .55));
    dyn.pillBottle.rotation.z = -tip * 1.45;
    dyn.pillBottle.position.y = .88 - tip * .04;

    // P08'de EEG kırmızı alarm moduna geçer!
    const alarm = t >= PS(8) - .1;
    dyn.eegNorm.visible = !alarm;
    dyn.eegAlarm.visible = alarm;
    fx.eegGlow.material.color.set(alarm ? '#ff5448' : '#5ee6b8');

    // Silvano (solda, gözler fal taşı gibi açık, hiç göz kırpmaz — uykusuz!)
    sl.show(); sl.place(-.48, 0, -.75, cam, tint);
    sl.draw({
      expr: alarm || t >= PS(4) ? 'worried' : 'surprised',
      look: t >= PS(2) && t < PS(5) ? .55 : .08,
      sweat: t >= P(1, .75) ? 1 : 0,
      blink: 0, // hiç uyuyamadığı için gözler açık!
      armL: [18, 16], armR: [18, 16],
      lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
    });
    sl.castFrom(dyn.cSun, true);

    // Nöbetçi Doktor (P02-P04 arası sağda, P03'te gülüyor!)
    if (t >= PS(2) - .15 && t < PS(5) - .1) {
      nb.show(); nb.place(.44, 0, -.78, cam, tint);
      const laughing = t >= PS(3) && t <= PE(3) + .2;
      nb.draw({
        expr: laughing ? 'laugh' : t >= PS(4) ? 'surprised' : 'smile',
        look: -.6,
        mouth: Math.max(talk(PS(3), PE(3)), laughing ? .65 : 0),
        laughMarks: laughing ? .88 : 0,
        blink: bl(2, PS(3), PS(4)),
        armL: laughing ? [112, 34] : [22, 18],
        armR: laughing ? [64, 38] : [22, 18],
        bob: laughing ? -Math.abs(Math.sin(t * 14)) * 9 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .35 },
      });
      nb.castFrom(dyn.cSun, true);
    }

    // Prof. Lugaresi (P05 ve P08'de sağda EEG'yi inceliyor, şok!)
    if (t >= PS(5) - .1) {
      lg.show(); lg.place(.42, 0, -.82, cam, tint);
      lg.draw({
        expr: alarm ? 'worried' : 'surprised',
        look: -.45, lookY: -.25,
        sweat: 1,
        blink: bl(3, PS(5), PS(8)),
        propL: 'scroll', propR: 'pen',
        armL: [58, 36], armR: [62, 40],
        lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
      });
      lg.castFrom(dyn.cSun, true);
    }
  } else if (here === 'brain') {
    const showBulb = t >= PS(7) - .18;
    dyn.switchGrp.visible = !showBulb;
    dyn.swLbl.visible = !showBulb;
    dyn.bulbGrp.visible = showBulb;

    if (!showBulb) {
      // Prion kristalleri P06 ortasında hızla büyüyüp Talamus şalterini kilitler!
      const lockU = ramp(t, P(6, .35), P(6, .62));
      dyn.prions.forEach((m, idx) => {
        const u = Math.max(.001, ramp(t, P(6, .28 + idx * .05), P(6, .52 + idx * .05)));
        m.scale.setScalar(u);
        m.rotation.y = t * (idx % 2 ? 1.4 : -1.2);
      });
      // Kilitli şalter aşağı inmeye çalışıp titrer ama inemez!
      dyn.lever.rotation.x = Math.sin(t * 28) * .05 * lockU;
    } else {
      // P07: Prof. Lugaresi yapıştırıcılı duvar anahtarına basmaya çalışır, lamba asla sönmez!
      fx.bulbGlow.scale.setScalar(1 + Math.sin(t * 16) * .05);
      lg.show(); lg.place(199.50, 0, .22, cam, tint);
      lg.draw({
        expr: 'focused', look: .65,
        blink: bl(4, PS(7)),
        armR: [88 + Math.sin(t * 10) * 8, 28], armL: [22, 18],
        lit: 1, shade: COOL, rim: { color: '#ffdf66', a: .46 },
      });
      lg.castFrom(dyn.mSun, true);
    }
  } else {
    // SET 3: Bologna Şafak Balkonu — Silvano + Prof. Lugaresi gün doğumunda yan yana!
    sl.show(); sl.place(299.60, 0, -.22, cam, tint);
    sl.draw({
      expr: t > PS(10) ? 'neutral' : 'worried',
      look: .2, lookY: -.1,
      blink: bl(5, PS(10)),
      armL: [18, 14], armR: [18, 14],
      lit: -1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .54 },
    });
    lg.show(); lg.place(300.40, 0, -.28, cam, tint);
    lg.draw({
      expr: 'focused', look: -.45,
      blink: bl(6, PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [56, 36], armR: [62, 40],
      lit: 1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .54 },
    });
    sl.castFrom(dyn.hSun, true); lg.castFrom(dyn.hSun, true);
  }

  fx.motes.update(t);
  for (const b of fx.cBeams) b.material.uniforms.uT.value = t;

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'clinic') {
    const subj = t >= PS(5) && t < PS(6) ? V(.2, 1.6, -1.6) : V(0, 1.2, -.8);
    look = { ...focusOn(subj, 4.2, 4.5), sat: 1.18, lift: [.09, .095, .125], bloom: .78, vignette: .2 };
    C.scene.fog = null;
  } else if (here === 'brain') {
    const subj = t >= PS(7) - .15 ? V(200, 1.2, .2) : V(200, 1.7, -1.2);
    look = { ...focusOn(subj, 3.5, 5), sat: 1.24, lift: [.08, .09, .14], bloom: 1.05, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.2, -.3), 4, 5), sat: 1.2, lift: [.1, .09, .15], bloom: .95, vignette: .22 };
    C.scene.fog = null;
  }
  look.tint = here === 'clinic' ? [.99, 1.0, 1.02] : here === 'brain' ? [.98, 1.0, 1.04] : [1.04, .98, .96];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
