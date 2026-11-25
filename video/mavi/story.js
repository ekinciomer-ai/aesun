// En Garip Hastalıklar #08: Mavi Derili Aile (Kentucky Fugate, 1820) — TAMAMEN ÖZGÜN 3B DÜNYA!
//   SET 1 (x = 0):   1820 APALAŞ DAĞLARI — GÜNDÜZ ÇAM ORMANI, KÜTÜK KULÜBE & TAHTA KÖPRÜLÜ DERE (açık hava gündüz!)
//   SET 2 (x = 200): 3B DAMAR TÜNELİ İÇİNDEN UÇUŞ (FLY-THROUGH!) — 24 ALYUVAR + PASLI ASMA KİLİT + METİLEN MAVİSİ DALGASI!
//   SET 3 (x = 300): 1960'LAR KENTUCKY HEMATOLOJİ LABORATUVARI (nane-yeşili fayans, deney tüpleri, CANLI MAVİ→PEMBE TEN!)
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'mavi-deri';
export const FPS = 30;
export let DUR = 41;
export const CUES = [];
export const LOOK = {
  fugate: {
    headW: 262, headH: 248,
    shade: '#4c86d4',
    beard: '#4a3424', beardLen: .62,
    cloth: '#6c7c52', clothDark: '#445232',
    sash: '#7e5434', collar: true, buttons: '#d8c8a2',
    bodyW: 204, height: 1.70,
  },
  kasabali: {
    headW: 260, headH: 246,
    mustache: '#6c4428',
    cloth: '#c6743c', clothDark: '#86481e',
    pattern: 'hstripes', stripe: '#86481e',
    scarf: '#365e84', scarfY: 6,
    collar: false, bodyW: 200, height: 1.66,
  },
  cawein: {
    headW: 268, headH: 250,
    hair: '#4e3c30',
    cloth: '#e8ecea', clothDark: '#bcc6c2',
    trim: '#2e7c68', buttons: '#22584a',
    pocket: true, collar: true,
    bodyW: 212, height: 1.76,
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
function dab(g, w, h, base, n, r, amt, seed, a0 = .22) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .20;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

// Apalaş yeşil çayır dokusu (Set 1)
function meadowTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#5c8444'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#6c984e', 260, 26, .22, 801, .28);
  dab(g, 512, 512, '#4a6e36', 140, 18, .18, 802, .22);
  return tx(c, [5, 5]);
}

// Kütük kulübe duvarı (yatay kütükler!)
function logCabinTex() {
  const [c, g] = cnv(512, 512);
  for (let y = 0; y < 512; y += 44) {
    const gr = g.createLinearGradient(0, y, 0, y + 44);
    gr.addColorStop(0, '#4e321e'); gr.addColorStop(.45, '#8c5c38'); gr.addColorStop(1, '#3e2616');
    g.fillStyle = gr; g.fillRect(0, y, 512, 44);
    g.fillStyle = '#d4c8ae'; g.fillRect(0, y + 40, 512, 4);
  }
  return tx(c, [1.5, 1]);
}

// Ahşap vadi tabelası: KENTUCKY · 1820
function cabinSignTex() {
  const [c, g] = cnv(560, 160);
  g.fillStyle = '#52341e'; g.fillRect(0, 0, 560, 160);
  g.strokeStyle = '#d2b480'; g.lineWidth = 8; g.strokeRect(10, 10, 540, 140);
  g.fillStyle = '#fff0cc'; g.font = '900 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('KENTUCKY · 1820', 280, 62);
  g.fillStyle = '#b4dcff'; g.font = '800 28px system-ui, sans-serif';
  g.fillText('FUGATE AİLESİ', 280, 118);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Parlak gündüz Apalaş Dağları panoraması (Set 1)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function appalachianSkyTex() {
  const Pn = pano(4096, 1800, 115, -10, 38), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#3874b8')); sky.addColorStop(.55, D('#78b4e6')); sky.addColorStop(.92, D('#cce6fa')); sky.addColorStop(1, D('#e6f2fc'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  // kabarık gündüz bulutları
  const R = rng(805);
  for (let i = 0; i < 16; i++) {
    const cx = R() * Pn.w, cy = Pn.Y(10 + R() * 20), rw = 160 + R() * 190;
    g.fillStyle = 'rgba(255,255,255,0.82)';
    g.beginPath(); g.ellipse(cx, cy, rw, 36 + R() * 24, 0, 0, 6.29); g.fill();
    g.beginPath(); g.ellipse(cx - rw * .4, cy - 18, rw * .55, 34, 0, 0, 6.29); g.fill();
    g.beginPath(); g.ellipse(cx + rw * .38, cy - 12, rw * .48, 30, 0, 0, 6.29); g.fill();
  }
  // 2 katmanlı mavi-yeşil Apalaş dağ sırtları!
  const y0 = Pn.Y(0);
  g.fillStyle = D('#4c768e');
  g.beginPath(); g.moveTo(0, Pn.h); g.lineTo(0, y0 - 60);
  for (let x = 0; x <= Pn.w; x += 140) g.lineTo(x, y0 - 80 - Math.abs(Math.sin(x * .0018)) * 180 - R() * 45);
  g.lineTo(Pn.w, Pn.h); g.closePath(); g.fill();
  g.fillStyle = D('#3c6848');
  g.beginPath(); g.moveTo(0, Pn.h); g.lineTo(0, y0 - 20);
  for (let x = 0; x <= Pn.w; x += 110) g.lineTo(x, y0 - 25 - Math.abs(Math.sin(x * .0027 + 1.2)) * 105 - R() * 30);
  g.lineTo(Pn.w, Pn.h); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(Pn.c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 1960'lar vintage nane-yeşili hastane laboratuvarı fayans duvarı (Set 3)
function mintTileTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#c8e4da'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#c8e4da', 180, 24, .08, 830, .18);
  // alt yarı nane-yeşili seramik karolar
  g.fillStyle = '#8cc2b2'; g.fillRect(0, 240, 512, 272);
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3;
  for (let y = 240; y <= 512; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let x = 0; x <= 512; x += 38) { g.beginPath(); g.moveTo(x, 240); g.lineTo(x, 512); g.stroke(); }
  g.fillStyle = '#387464'; g.fillRect(0, 234, 512, 10);
  return tx(c, [3, 1]);
}

// Şişe ve laboratuvar etiketi
function bottleLabelTex() {
  const [c, g] = cnv(440, 200);
  g.fillStyle = '#f8f4e8'; g.fillRect(0, 0, 440, 200);
  g.strokeStyle = '#1d5ec4'; g.lineWidth = 10; g.strokeRect(10, 10, 420, 180);
  g.fillStyle = '#1448a8'; g.font = '900 44px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('METİLEN', 220, 78);
  g.fillText('MAVİSİ', 220, 132);
  g.fillStyle = '#385878'; g.font = '700 24px system-ui, sans-serif';
  g.fillText('1960 · DR. CAWEIN', 220, 174);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

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

// ---------------------------------------------------------------- SET 1: 1820 APALAŞ DAĞLARI, KÜTÜK KULÜBE & KÖPRÜLÜ DERE (x = 0)
function buildAppalachia(scene) {
  const g = new THREE.Group(); scene.add(g);

  // Yeşil dağ çayırı
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 28), painted(meadowTex()));
  ground.rotation.x = -Math.PI / 2; g.add(ground);

  // Parlak turkuaz akan dere (ortadan z ekseninde akar, üstünde ahşap köprü!)
  const creek = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 22), new THREE.MeshBasicMaterial({ color: '#46b2cc' }));
  creek.rotation.x = -Math.PI / 2; creek.position.set(-.1, .02, -1.0); g.add(creek);
  // Dere taşları
  const R = rng(810);
  for (let i = 0; i < 14; i++) {
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(.14 + R() * .14, 0), flat('#7a8286'));
    rk.position.set((i % 2 ? -1.45 : 1.25) + (R() - .5) * .3, .08, -4.5 + i * .7); g.add(rk);
  }

  // Ahşap yaya köprüsü (derenin üstünde, karakterler burada buluşur!)
  const bridge = new THREE.Group(); bridge.position.set(-.1, .16, -.85); g.add(bridge);
  for (let i = -5; i <= 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(.34, .09, 1.85), painted(woodTex({ base: '#8a623c', plank: 24 })));
    plank.position.set(i * .36, 0, 0); bridge.add(plank);
  }
  for (const rz of [-.86, .86]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.0, .09, .09), flat('#624428'));
    rail.position.set(0, .78, rz); bridge.add(rail);
    for (const rx of [-1.8, -.6, .6, 1.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.10, .82, .10), flat('#563a22'));
      post.position.set(rx, .40, rz); bridge.add(post);
    }
  }

  // Kütük dağ kulübesi (arka solda, taş bacalı + KENTUCKY · 1820 tabelalı!)
  const cabin = new THREE.Group(); cabin.position.set(-1.75, 0, -4.5); cabin.rotation.y = .22; g.add(cabin);
  const cBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 2.6), painted(logCabinTex()));
  cBody.position.y = 1.25; cabin.add(cBody);
  const cRoof = new THREE.Mesh(new THREE.ConeGeometry(2.75, 1.45, 4), flat('#523a2c'));
  cRoof.rotation.y = Math.PI / 4; cRoof.position.y = 3.18; cabin.add(cRoof);
  const cDoor = new THREE.Mesh(new THREE.BoxGeometry(.82, 1.68, .12), flat('#3e2416'));
  cDoor.position.set(0, .84, 1.32); cabin.add(cDoor);
  const cWin = new THREE.Mesh(new THREE.PlaneGeometry(.72, .68), new THREE.MeshBasicMaterial({ color: '#ffe092' }));
  cWin.position.set(1.05, 1.35, 1.32); cWin.userData.noShadow = true; cabin.add(cWin);
  // Taş baca (bacadan beyaz duman yükselecek!)
  const chim = new THREE.Mesh(new THREE.BoxGeometry(.54, 1.65, .54), flat('#7e7a78'));
  chim.position.set(-1.05, 3.25, -.4); cabin.add(chim);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.75, .52), new THREE.MeshBasicMaterial({ map: cabinSignTex() }));
  sign.position.set(0, 2.15, 1.34); sign.userData.noShadow = true; cabin.add(sign);

  // 6 Katmanlı Yeşil Apalaş Çam Ağacı
  for (const [px, pz, sc] of [[-4.2, -3.2, 1.1], [2.4, -4.2, 1.15], [3.6, -2.5, .95], [-3.8, -6.2, 1.25], [.8, -6.5, 1.2], [4.4, -5.4, 1.05]]) {
    const p = new THREE.Group(); p.position.set(px, 0, pz); p.scale.setScalar(sc); g.add(p);
    const trk = new THREE.Mesh(new THREE.CylinderGeometry(.11, .16, .85, 8), flat('#4d3320')); trk.position.y = .42; p.add(trk);
    for (const [y, r, h, col] of [[1.25, 1.0, 1.35, '#2c5e3a'], [2.05, .78, 1.15, '#356e44'], [2.75, .54, .95, '#428050']]) {
      const cn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), flat(col)); cn.position.y = y; p.add(cn);
    }
  }

  // Parlak gündüz Apalaş gökyüzü ve dağları
  const sky = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(appalachianSkyTex(), { yaw: Math.PI, az: 115 * Math.PI / 180, el: [-10 * Math.PI / 180, 38 * Math.PI / 180], gain: 1.12 })
  );
  sky.material.side = THREE.BackSide; g.add(sky);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#bfe2ff', '#587842', 2.05));
  const SUN = [-.35, -.68, -.64]; dyn.aSun = V(...SUN).normalize();
  const key = sun('#fff2d2', 2.75, SUN, [0, 1, -1], { ext: 11 }); L.add(key); L.add(key.target);
  scene.add(L); sets.valley = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: 3B DAMAR TÜNELİ UÇUŞU + PASLI ASMA KİLİT (x = 200)
function buildBloodTunnel(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);

  // Gerçek 3B kırmızı-bordo damar tüneli (20 halka + iç duvar silindiri!)
  const wallMat = new THREE.MeshLambertMaterial({ color: '#641828', side: THREE.BackSide });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 22, 24, 1, true), wallMat);
  cyl.rotation.x = Math.PI / 2; cyl.position.set(0, 1.5, -2.5); g.add(cyl);
  for (let i = 0; i < 16; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.48, .16, 10, 28), flat(i % 2 ? '#7c1e32' : '#581222'));
    ring.position.set(Math.sin(i * .4) * .12, 1.5 + Math.cos(i * .4) * .08, 6.0 - i * 1.15);
    g.add(ring);
  }

  // 24 adet yüzen 3B bikonkav ALYUVAR (uçuş koridoru etrafında döner, kamera merceğini asla kapatmaz!)
  const R = rng(820);
  dyn.rbcs = Array.from({ length: 24 }, (_, i) => {
    const cell = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: '#6c3e56' }); // başta koyu kahverengi-mor methemoglobin!
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.21, .08, 12, 20), mat);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .08, 16), mat);
    core.rotation.x = Math.PI / 2;
    cell.add(rim, core);
    const ang = (i / 24) * Math.PI * 2 * 3 + R() * .4, rad = .78 + R() * .95;
    cell.userData = {
      x0: Math.cos(ang) * rad, y0: 1.48 + Math.sin(ang) * rad * .72,
      z0: 3.0 - i * .42, sp: .5 + R() * .8, ph: R() * 6.29, mat,
    };
    cell.position.set(cell.userData.x0, cell.userData.y0, cell.userData.z0);
    g.add(cell); return cell;
  });

  // P08 GÜNDELİK BENZETME: DEV 3B PASLI ASMA KİLİT + TEPEDEN DÜŞEN ELEKTRİK MAVİSİ DAMLA!
  dyn.lockGrp = new THREE.Group(); dyn.lockGrp.position.set(0, 1.48, -1.2); g.add(dyn.lockGrp);
  dyn.lockMat = new THREE.MeshLambertMaterial({ color: '#7c4c34' }); // paslı demir!
  const lBody = new THREE.Mesh(new THREE.BoxGeometry(.96, .86, .34), dyn.lockMat);
  lBody.position.y = -.15; dyn.lockGrp.add(lBody);
  // Anahtar deliği
  const kh1 = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .38, 12), flat('#181014'));
  kh1.rotation.x = Math.PI / 2; kh1.position.set(0, -.05, 0); dyn.lockGrp.add(kh1);
  const kh2 = new THREE.Mesh(new THREE.BoxGeometry(.09, .24, .38), flat('#181014'));
  kh2.position.set(0, -.22, 0); dyn.lockGrp.add(kh2);
  // Üstteki metal U-halka (kilidin açılınca yukarı kalkıp dönecek parçası!)
  dyn.shackle = new THREE.Mesh(new THREE.TorusGeometry(.30, .085, 12, 24, Math.PI), flat('#988c86'));
  dyn.shackle.position.set(0, .28, 0); dyn.lockGrp.add(dyn.shackle);
  // Tepeden düşen parlak elektrik mavisi METİLEN MAVİSİ damlası!
  dyn.oilDrop = new THREE.Mesh(new THREE.SphereGeometry(.16, 18, 14), new THREE.MeshBasicMaterial({ color: '#38a4ff' }));
  dyn.oilDrop.scale.set(.78, 1.38, .78); dyn.oilDrop.position.set(0, 1.55, .15); dyn.oilDrop.userData.noShadow = true; dyn.lockGrp.add(dyn.oilDrop);
  dyn.lockLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, .50),
    new THREE.MeshBasicMaterial({ map: badgeTex('METİLEN MAVİSİ', 'KİLİTLİ ENZİM AÇILDI!', '#121c30', '#70c8ff', '#ff5448'), transparent: true, alphaTest: .35 })
  );
  dyn.lockLbl.position.set(0, -1.02, .12); dyn.lockLbl.userData.noShadow = true; dyn.lockGrp.add(dyn.lockLbl);

  // P06 üst bilgi etiketi (sadece P06'da görünür, tünelin açık merkezinde net!)
  dyn.bloodLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.32, .46),
    new THREE.MeshBasicMaterial({ map: badgeTex('METHEMOGLOBİN', 'OKSİJEN KİLİTLENDİ!', '#241422', '#ffbc82', '#5ea6ff'), transparent: true, alphaTest: .35 })
  );
  dyn.bloodLbl.position.set(0, 2.18, -.5); dyn.bloodLbl.userData.noShadow = true; g.add(dyn.bloodLbl);

  fx.tunnelGlow = glow(scene, [200, 1.5, -1.95], { size: 3.0, color: '#42a2ff', strength: .42 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#ffb2be', '#4a1c30', 2.05));
  const p1 = new THREE.PointLight('#ffaa96', 3.8, 14); p1.position.set(200, 2.1, 2.2); L.add(p1);
  const p2 = new THREE.PointLight('#ffd49a', 3.2, 10); p2.position.set(200.4, 1.9, .8); L.add(p2);
  const p3 = new THREE.PointLight('#64b8ff', 2.6, 12); p3.position.set(200, 2.0, -3.0); L.add(p3);
  scene.add(L); sets.tunnel = { g, L };
}

// ---------------------------------------------------------------- SET 3: 1960'LAR VİNTAGE HEMATOLOJİ LABORATUVARI (x = 300)
function buildLab(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);

  // Temiz açık gri-nane laboratuvar zemini & fayans duvarlar
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), flat('#bcc8c4'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), painted(mintTileTex()));
  backW.position.set(0, 3.0, -3.2); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), painted(mintTileTex()));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.6, 3.0, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), painted(mintTileTex()));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.6, 3.0, 1.5); g.add(rightW);

  // Arkada büyük GÜNDÜZ LABORATUVAR PENCERESİ (açık mavi gökyüzü, sıcak gün ışığı!)
  const winFrm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.75, .14), flat('#eef4f2'));
  winFrm.position.set(0, 2.48, -3.12); g.add(winFrm);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.55), new THREE.MeshBasicMaterial({ color: '#b8e0ff' }));
  winGlass.position.set(0, 2.48, -3.04); winGlass.userData.noShadow = true; g.add(winGlass);
  const winBar = new THREE.Mesh(new THREE.BoxGeometry(.07, 1.6, .1), flat('#eef4f2'));
  winBar.position.set(0, 2.48, -3.02); g.add(winBar);

  // Ön ortada 1960'lar BEYAZ-ÇELİK LABORATUVAR TEZGÂHI + MİKROSKOP + DENEY TÜPLERİ + METİLEN MAVİSİ ŞİŞESİ!
  const bench = new THREE.Group(); bench.position.set(0, 0, .55); g.add(bench);
  const bTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, .10, .86), flat('#2e383c'));
  bTop.position.y = .80; bench.add(bTop);
  const bCab = new THREE.Mesh(new THREE.BoxGeometry(2.05, .76, .74), flat('#e2ece8'));
  bCab.position.y = .38; bench.add(bCab);

  // 5 cam deney tüplü raf (sol tarafta — P09'da koyu kahverengi-mordan YAKUT KIRMIZISINA döner!)
  const rack = new THREE.Group(); rack.position.set(-.58, .85, .05); bench.add(rack);
  const rBase = new THREE.Mesh(new THREE.BoxGeometry(.66, .04, .18), flat('#8e6844')); rack.add(rBase);
  const rTop = new THREE.Mesh(new THREE.BoxGeometry(.66, .03, .16), flat('#8e6844')); rTop.position.y = .22; rack.add(rTop);
  dyn.tubes = Array.from({ length: 5 }, (_, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: '#563c58' });
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .26, 12), mat);
    liq.position.set((i - 2) * .115, .17, 0); liq.userData.noShadow = true; rack.add(liq); return mat;
  });

  // Ortada parlayan büyük METİLEN MAVİSİ cam şişesi!
  dyn.mbBottle = new THREE.Group(); dyn.mbBottle.position.set(.02, .85, .10); bench.add(dyn.mbBottle);
  const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(.14, .15, .36, 18), new THREE.MeshBasicMaterial({ color: '#1e7eff' }));
  bCyl.position.y = .18; bCyl.userData.noShadow = true; dyn.mbBottle.add(bCyl);
  const bNeck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .07, .12, 14), flat('#cfe8ff'));
  bNeck.position.y = .41; dyn.mbBottle.add(bNeck);
  const bLbl = new THREE.Mesh(new THREE.PlaneGeometry(.38, .18), new THREE.MeshBasicMaterial({ map: bottleLabelTex() }));
  bLbl.position.set(0, .18, .155); bLbl.userData.noShadow = true; dyn.mbBottle.add(bLbl);
  fx.bottleGlow = glow(scene, [300.02, 1.08, .65], { size: 1.5, color: '#38a0ff', strength: .52 });

  // Sağda 1960'lar antika siyah-pirinç mikroskop
  const mic = new THREE.Group(); mic.position.set(.68, .85, .02); bench.add(mic);
  const mBase = new THREE.Mesh(new THREE.BoxGeometry(.26, .06, .30), flat('#22282c')); mBase.position.y = .03; mic.add(mBase);
  const mArm = new THREE.Mesh(new THREE.BoxGeometry(.06, .36, .06), flat('#22282c')); mArm.position.set(.08, .22, -.04); mic.add(mArm);
  const mTube = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .34, 14), flat('#d4a846'));
  mTube.rotation.z = .28; mTube.position.set(-.02, .34, 0); mic.add(mTube);

  fx.labBeams = [[-.5, 3.2, -2.9], [.5, 3.2, -2.9]].map(p =>
    beam(scene, [300 + p[0], p[1], p[2]], [300 + p[0] * 1.2, .2, 1.4], { r0: .45, r1: 1.4, color: '#e2f4ff', strength: .14 })
  );

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#e4f6ff', '#6c887e', 2.05));
  const SUN = [-.22, -.55, .80]; dyn.lSun = V(...SUN).normalize();
  const key = sun('#fff8e8', 2.65, SUN, [300, 1.2, 0], { ext: 9 }); L.add(key); L.add(key.target);
  const front = new THREE.DirectionalLight('#ffffff', 1.25); front.position.set(300, 2.8, 6.2); front.target.position.set(300, 1.2, -.4);
  L.add(front); L.add(front.target);
  scene.add(L); sets.lab = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA KOREOGRAFİSİ (VİNÇ + DAMAR UÇUŞU + LAB DÖNÜŞÜMÜ!)
function cameraPath() {
  const k = [
    // P01 VİNÇ AÇILIŞI: Apalaş çamları ve dere üstünden aşağı süzülüp safir mavisi yüzlü Fugate'e iner!
    { t: 0, pos: [-.4, 3.85, 4.75], look: [-.2, 1.35, -1.6], fov: 50, creep: .12, drift: .03 },
    { t: P(1, .50), dur: .78, pos: [-.35, 1.50, 2.20], look: [-.35, 1.38, -.80], fov: 46, creep: .20 },
    { t: P(1, .84), dur: .34, pos: [-.35, 1.38, 1.48], look: [-.35, 1.34, -.80], fov: 44, creep: .22 },
    // P02 TAKİP PLANI: Fugate ahşap köprüden yürüyerek kasabalının yanına gelir (arka planda kütük kulübe!)
    { t: PS(2) + .16, dur: .38, move: 'whip', pos: [.1, 1.48, 3.65], look: [-.1, 1.35, -1.4], fov: 50, creep: .18 },
    // P03 ÇAPRAZ AÇI: Kasabalı köprü başında kahkahayla güler!
    { t: PS(3) + .14, dur: .32, move: 'whip', pos: [1.32, 1.42, 1.85], look: [.52, 1.36, -.85], fov: 46, creep: .24 },
    // P04 DİYAGONAL GERİ ÇEKİLİŞ: Fugate üzgün kütük kulübeye doğru uzaklaşır!
    { t: PS(4) + .16, dur: .36, move: 'whip', pos: [1.25, 1.65, 2.95], look: [-.85, 1.35, -2.5], fov: 50, creep: .20 },
    // P05 WHIP PAN → SET 3 (1960 LAB): Dr. Cawein + Fugate + laboratuvar tezgâhı tam kadraj!
    { t: PS(5) + .14, dur: .34, move: 'whip', pos: [300.0, 1.50, 4.18], look: [300.0, 1.38, -.55], fov: 50, creep: .16 },
    // P06 WHIP PAN → SET 2 (3B DAMAR TÜNELİ UÇUŞU!): Kamera tünelin açık merkezinden ileri uçar!
    { t: PS(6) + .10, dur: .30, move: 'whip', pos: [200.0, 1.52, 4.85], look: [200.0, 1.52, -2.0], fov: 54, creep: .06 },
    { t: PE(6) - .08, dur: Math.max(.8, PE(6) - PS(6) - .25), pos: [200.0, 1.50, 1.85], look: [200.0, 1.50, -4.0], fov: 54, creep: .06 },
    // P07 WHIP PAN → SET 3: Parlayan METİLEN MAVİSİ şişesi + şok olmuş Fugate & Dr. Cawein (yüzleri açık!)
    { t: PS(7) + .14, dur: .32, move: 'whip', pos: [300.0, 1.48, 3.45], look: [300.0, 1.32, -.2], fov: 48, creep: .18 },
    // P08 WHIP PAN → SET 2: Dev 3B paslı asma kilit + düşen mavi damla + kilit açılıp alyuvarlar KIPKIRMIZI!
    { t: PS(8) + .14, dur: .32, move: 'whip', pos: [200.0, 1.48, 2.55], look: [200.0, 1.44, -1.2], fov: 50, creep: .20 },
    // P09 WHIP PAN → SET 3: CANLI TEN DÖNÜŞÜMÜ! Fugate'in mavi yüzü gözler önünde sağlıklı renge döner!
    { t: PS(9) + .14, dur: .32, move: 'whip', pos: [299.62, 1.46, 2.25], look: [299.54, 1.38, -.68], fov: 46, creep: .20 },
    // P10 VİNÇ ÇIKIŞI: Laboratuvar tezgâhındaki mavi şişe ve kırmızı tüplerle birlikte yükselip uzaklaşır!
    { t: DUR, dur: Math.max(.8, DUR - PS(10) - .05), pos: [300.0, 2.02, 4.35], look: [300.0, 1.36, -.5], fov: 52, creep: .12 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(8, .38), 1.15); // mavi damlanın paslı kilidi açma anı!
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
  scene.background = new THREE.Color('#66a6de');
  buildAppalachia(scene); buildBloodTunnel(scene); buildLab(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Set 1: Kütük kulübe bacasından yükselen gerçek beyaz duman + dere parıltısı; Set 2: kan akışı zerreleri!
  fx.motes = new Smoke(scene, { color: '#ffffff', maxPoints: 500, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 140, size: .028, alpha: .48, speed: .28, on: t => where(t) === 'valley',
    path: (u, t, i) => [-2.85 + u * .85 + Math.sin(t * 2 + i) * .18 * u, 4.05 + u * 2.4, -4.65 + (hash(i, 2) - .5) * .35],
  });
  fx.motes.wisps.push({
    n: 160, size: .015, alpha: .68, speed: .65, on: t => where(t) === 'tunnel',
    path: (u, t, i) => [200 + (hash(i, 4) - .5) * 3.8, 1.5 + (hash(i, 5) - .5) * 3.0, 5.0 - u * 10.0],
  });
  fx.motes.wisps.push({
    n: 80, size: .011, alpha: .42, speed: .06, on: t => where(t) === 'lab',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 4.2, 3.2 - u * 2.6, -1.5 + (hash(i, 9) - .5) * 3.2],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(5) - .06, 'whoosh');
  cue(PS(6) - .06, 'whoosh');
  cue(PS(7) - .06, 'whoosh');
  cue(PS(8) - .06, 'whoosh');
  cue(PS(9) - .06, 'whoosh');
  cue(0.05, 'creek', { dur: PE(4) });
  cue(PS(6), 'heartbeat', { dur: PE(6) - PS(6) });
  cue(P(8, .32), 'drop');
  cue(P(8, .38), 'unlock');
  cue(P(8, .38), 'boom');
  cue(PE(10) - .2, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) {
  if (t < PS(5)) return 'valley';
  if ((t >= PS(6) && t < PS(7)) || (t >= PS(8) && t < PS(9))) return 'tunnel';
  return 'lab';
}
function camSet(cam) { return cam.position.x > 250 ? 'lab' : cam.position.x > 100 ? 'tunnel' : 'valley'; }
const WARM = '#ffe2a4', COOL = '#cfe4fa';
const lerp = (a, b, u) => a + (b - a) * u;

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['valley', 'tunnel', 'lab']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);

  fx.tunnelGlow.visible = here === 'tunnel';
  fx.bottleGlow.visible = here === 'lab';
  for (const b of fx.labBeams) b.visible = here === 'lab';

  // FUGATE'İN CANLI TEN DÖNÜŞÜMÜ: P01–P08 arası belirgin SAFİR MAVİ → P09–P10'da SAĞLIKLI PEMBE-BEYAZ!
  const cureU = ramp(t, PS(9) + .15, PE(9) - .25);
  const blueTint = [lerp(.56, 1.03, cureU), lerp(.78, .99, cureU), lerp(1.24, .95, cureU)];
  const fugShade = cureU > .55 ? '#e4d4cc' : '#3a78d8';

  const fug = cast.fugate, kas = cast.kasabali, caw = cast.cawein;

  if (here === 'valley') {
    const walkU = ramp(t, PS(2), PE(2));
    const retreatU = ramp(t, PS(4), PE(4));
    const walking = (t >= PS(2) && t <= PE(2)) || (t >= PS(4) && t <= PE(4));
    const fxPos = t < PS(2) ? -.38 : (t < PS(4) ? (-.72 + walkU * .36) : (-.36 - retreatU * 1.15));
    const fzPos = t < PS(4) ? -.82 : (-.82 - retreatU * 2.15);
    const fyPos = t < PS(4) ? .21 : lerp(.21, 0, Math.min(1, retreatU * 2));
    const wBob = walking ? Math.abs(Math.sin(t * 11)) * 7 : 0;

    fug.show(); fug.place(fxPos, fyPos, fzPos, cam, blueTint);
    fug.draw({
      expr: t >= PS(4) ? 'worried' : (t >= P(1, .6) && t < PS(2) ? 'surprised' : 'neutral'),
      look: t >= PS(4) ? -.4 : (t >= PS(2) ? .55 : 0),
      sweat: t >= PS(3) && t < PS(5) ? 1 : 0,
      blink: bl(1, P(1, .5), PS(3), PS(4)),
      bob: wBob,
      armL: walking ? [36 * Math.sin(t * 11), 16] : [18, 16],
      armR: walking ? [-36 * Math.sin(t * 11), 16] : [18, 16],
      lit: 1, shade: fugShade, rim: { color: '#78beff', a: .48 },
    });
    fug.castFrom(dyn.aSun, true);

    // Kasabalı (P02-P04 köprü ucunda sağda; P03'te kahkahayla güler!)
    if (t >= PS(2) - .1) {
      const laughing = t >= PS(3) && t <= PE(3) + .18;
      kas.show(); kas.place(.55, .21, -.85, cam, [1, 1, 1]);
      kas.draw({
        expr: laughing ? 'laugh' : 'smile',
        look: -.6,
        mouth: Math.max(talk(PS(3), PE(3)), laughing ? .65 : 0),
        laughMarks: laughing ? .9 : 0,
        blink: bl(2, PS(3)),
        armL: laughing ? [112, 34] : [22, 18],
        armR: laughing ? [64, 38] : [22, 18],
        bob: laughing ? -Math.abs(Math.sin(t * 14)) * 9 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
      });
      kas.castFrom(dyn.aSun, true);
    }
  } else if (here === 'tunnel') {
    const showLock = t >= PS(8) - .18;
    dyn.lockGrp.visible = showLock;
    dyn.bloodLbl.visible = !showLock;

    const unlockU = showLock ? ramp(t, P(8, .38), P(8, .75)) : 0;
    // 24 3B alyuvar tünelde yüzer; P08'de kilit açılınca dalga dalga YAKUT KIRMIZISINA döner!
    const colBad = new THREE.Color('#5a364c'), colGood = new THREE.Color('#e62e3c');
    dyn.rbcs.forEach((cell, i) => {
      const u = cell.userData;
      cell.position.set(
        u.x0 + Math.sin(t * u.sp + u.ph) * .16,
        u.y0 + Math.cos(t * u.sp * .9 + u.ph) * .14,
        u.z0 + ((t * .8 + i * .3) % 2.4) - 1.2
      );
      cell.rotation.set(t * .7 + u.ph, t * .9 + i, 0);
      const cellCure = Math.max(0, Math.min(1, unlockU * 1.4 - (i / 24) * .4));
      u.mat.color.copy(colBad).lerp(colGood, cellCure);
    });

    if (showLock) {
      // Mavi damla paslı kilidin üstüne düşer → kilit parlayıp U-halkası yukarı kalkarak AÇILIR!
      const dropU = ramp(t, P(8, .08), P(8, .38));
      dyn.oilDrop.visible = t < P(8, .44);
      dyn.oilDrop.position.y = 1.55 - dropU * 1.15;
      dyn.shackle.position.y = .28 + unlockU * .30;
      dyn.shackle.rotation.y = unlockU * .75;
      dyn.lockMat.color.set(unlockU > .25 ? '#d8a642' : '#7c4c34');
      fx.tunnelGlow.material.color.set(unlockU > .25 ? '#ff4a44' : '#3ea4ff');
      fx.tunnelGlow.scale.setScalar(.9 + unlockU * .6);
    } else {
      fx.tunnelGlow.material.color.set('#5886d8');
    }
  } else {
    // SET 3: 1960'LAR VİNTAGE HEMATOLOJİ LABORATUVARI!
    // Deney tüpleri de P09'da koyu kahverengi-mordan PARLAK YAKUT KIRMIZISINA döner!
    const tBad = new THREE.Color('#563c58'), tGood = new THREE.Color('#e82838');
    dyn.tubes.forEach(mat => mat.color.copy(tBad).lerp(tGood, cureU));
    // P07'de METİLEN MAVİSİ şişesi hafifçe parlayıp yükselir (yüzleri kapatmaz!)
    const showBot = t >= PS(7) - .1 && t < PS(8);
    dyn.mbBottle.position.y = showBot ? (.90 + Math.sin(t * 7) * .03) : .85;
    dyn.mbBottle.scale.setScalar(showBot ? 1.06 : 1.0);
    fx.bottleGlow.scale.setScalar(showBot ? 1.25 : .9);

    fug.show(); fug.place(299.58, 0, -.68, cam, blueTint);
    fug.draw({
      expr: cureU > .55 ? 'smile' : (showBot ? 'surprised' : 'worried'),
      look: .45,
      sweat: showBot ? 1 : 0,
      blink: bl(3, PS(5), PS(7), PS(9)),
      armL: cureU > .55 ? [48, 22] : [18, 16],
      armR: cureU > .55 ? [48, 22] : [18, 16],
      lit: 1, shade: fugShade, rim: { color: cureU > .55 ? WARM : '#74beff', a: .46 },
    });
    caw.show(); caw.place(300.42, 0, -.70, cam, [1, 1, 1]);
    caw.draw({
      expr: showBot ? 'grin' : (cureU > .55 ? 'proud' : 'focused'),
      look: -.48,
      blink: bl(4, PS(5), PS(7), PS(9)),
      propL: showBot ? undefined : 'scroll',
      propR: showBot ? undefined : 'pen',
      armL: showBot ? [92, 30] : [56, 36],
      armR: showBot ? [68, 28] : [62, 40],
      lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
    });
    fug.castFrom(dyn.lSun, true); caw.castFrom(dyn.lSun, true);
  }

  fx.motes.update(t);
  for (const b of fx.labBeams) b.material.uniforms.uT.value = t;

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'valley') {
    look = { ...focusOn(V(0, 1.3, -1.0), 4.0, 5.5), sat: 1.20, lift: [.10, .11, .11], bloom: .78, vignette: .16 };
    C.scene.fog = null;
  } else if (here === 'tunnel') {
    look = { ...focusOn(V(200, 1.5, -1.0), 3.4, 5.5), sat: 1.28, lift: [.09, .07, .09], bloom: .98, vignette: .24 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.3, -.4), 3.8, 5.2), sat: 1.16, lift: [.11, .12, .11], bloom: .76, vignette: .15 };
    C.scene.fog = null;
  }
  look.tint = here === 'valley' ? [1.01, 1.02, .99] : here === 'tunnel' ? [1.03, .97, .99] : [.99, 1.02, 1.01];
  look.blur = st.moving > .15 ? 15 : 0;
  return look;
}
