// En Garip Hastalıklar #10 (SEZON FİNALİ): Acıyı Hiç Hissetmemek (CIPA) — TAMAMEN ÖZGÜN 3B DÜNYA!
//   SET 1 (x = 0):   GÜNEŞLİ ÇOCUK PARKI & 3B KAYDIRAK + SALINCAK (parlak mavi gökyüzü, kumlu oyun alanı, yapraklı ağaçlar!)
//   SET 2 (x = 200): 3B KAPALI NTRK1 SİNİR OTOYOLU & DEV 3B HARARET YAPAN ARABA GÖSTERGE PANELİ (180 KM/S + 120°C BUHAR + SÖNÜK UYARI!)
//   SET 3 (x = 300): MODERN AYDINLIK ÇOCUK NÖROLOJİ KLİNİĞİ (36.8°C dijital monitör, mavi koruyucu kask, buz çantası, koruyucu kalkan!)
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'cipa';
export const FPS = 30;
export let DUR = 41;
export const CUES = [];
export const LOOK = {
  kaan: {
    headW: 256, headH: 244,
    cloth: '#d83a38', clothDark: '#962220',
    trim: '#f4c642', scarf: '#2c6cb0', scarfY: 6,
    collar: false, bodyW: 174, height: 1.38,
  },
  ege: {
    headW: 254, headH: 242,
    hair: '#4a3222',
    cloth: '#e4a832', clothDark: '#a67418',
    pattern: 'hstripes', stripe: '#304e78',
    collar: false, bodyW: 180, height: 1.44,
  },
  drselin: {
    headW: 260, headH: 246,
    longHair: '#7c3f2c', hairLen: 210,
    cloth: '#eef2f4', clothDark: '#c4ced4',
    trim: '#2694a4', buttons: '#1c6c78',
    skirt: '#2e4a66', boots: '#283440',
    pocket: true, collar: true,
    bodyW: 196, height: 1.72,
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

// Park çimi dokusu (Set 1)
function parkGrassTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#6aa84f'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#7ec25e', 240, 24, .18, 1001, .28);
  dab(g, 512, 512, '#548c3e', 140, 18, .15, 1002, .22);
  return tx(c, [5, 5]);
}

// Güneşli Çocuk Parkı Gökyüzü Panoraması (Set 1)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function sunnyParkSkyTex() {
  const Pn = pano(4096, 1800, 115, -10, 38), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#2c82d8')); sky.addColorStop(.55, D('#72bef6')); sky.addColorStop(.92, D('#cceeff')); sky.addColorStop(1, D('#ebf8ff'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  // Parlak güneş
  const sx = Pn.X(16), sy = Pn.Y(22), sr = Pn.s * 3.2;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.2);
  gr.addColorStop(0, 'rgba(255,252,215,1)'); gr.addColorStop(.35, 'rgba(255,236,155,.85)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr * 3.2, 0, 6.29); g.fill();
  g.fillStyle = '#fffce0'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.29); g.fill();
  const R = rng(1005);
  for (let i = 0; i < 14; i++) {
    const cx = R() * Pn.w, cy = Pn.Y(10 + R() * 18), rw = 140 + R() * 170;
    g.fillStyle = 'rgba(255,255,255,0.88)';
    g.beginPath(); g.ellipse(cx, cy, rw, 34, 0, 0, 6.29); g.fill();
    g.beginPath(); g.ellipse(cx - rw * .35, cy - 16, rw * .52, 30, 0, 0, 6.29); g.fill();
  }
  const y0 = Pn.Y(0);
  g.fillStyle = D('#4c8e48'); g.fillRect(0, y0, Pn.w, Pn.h - y0);
  for (let x = 0; x <= Pn.w; x += 110) {
    g.fillStyle = D(x % 220 ? '#3f7d42' : '#55964e');
    g.beginPath(); g.arc(x, y0 - 20, 75 + R() * 40, Math.PI, 0); g.fill();
  }
  const t = new THREE.CanvasTexture(Pn.c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Kırmızı-beyaz çizgili kapalı NTRK1 bariyer dokusu (Set 2)
function barrierTex() {
  const [c, g] = cnv(512, 128);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#e03630';
  for (let x = -128; x < 640; x += 96) {
    g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 48, 128); g.lineTo(x + 96, 0); g.lineTo(x + 48, 0); g.closePath(); g.fill();
  }
  return tx(c);
}

// Araba Gösterge Kadranı Dokusu (HIZ veya HARARET 120°C!)
function gaugeTex(isTemp = false) {
  const [c, g] = cnv(400, 400);
  g.fillStyle = '#141820'; g.beginPath(); g.arc(200, 200, 192, 0, 6.29); g.fill();
  g.strokeStyle = '#9aa6b4'; g.lineWidth = 14; g.stroke();
  // Kırmızı tehlike yayı (sağ üstten sağ alta!)
  g.strokeStyle = '#ff3830'; g.lineWidth = 22;
  g.beginPath(); g.arc(200, 200, 152, -Math.PI * .15, Math.PI * .22); g.stroke();
  // Beyaz kadran çizgileri
  g.strokeStyle = '#eef4fa'; g.lineWidth = 6;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * .78 + (i / 8) * Math.PI * 1.44;
    g.beginPath(); g.moveTo(200 + Math.cos(a) * 124, 200 + Math.sin(a) * 124);
    g.lineTo(200 + Math.cos(a) * 158, 200 + Math.sin(a) * 158); g.stroke();
  }
  g.fillStyle = '#ffffff'; g.font = '900 44px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText(isTemp ? '120°C' : '180', 200, 292);
  g.fillStyle = isTemp ? '#ff6454' : '#7ec8ff'; g.font = '800 30px system-ui, sans-serif';
  g.fillText(isTemp ? 'HARARET!' : 'KM/S', 200, 336);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Modern Aydınlık Çocuk Nöroloji Kliniği Duvarı (Set 3)
function pediatricWallTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#fdf6e4'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#fdf6e4', 180, 26, .05, 1030, .18);
  // Çocuk dostu sıcak turkuaz alt duvar + sarı şerit
  g.fillStyle = '#5ebcc4'; g.fillRect(0, 360, 512, 152);
  g.fillStyle = '#f6c84c'; g.fillRect(0, 344, 512, 18);
  return tx(c, [3, 1]);
}

// Çocuk Kliniği Dijital Monitör (mod 0: NTRK1 GENİ · CIPA, mod 1: 36.8°C GÜVENLİ · SAAT BAŞI KONTROL)
function clinicScreenTex(safe = false) {
  const [c, g] = cnv(600, 380);
  g.fillStyle = safe ? '#102c2a' : '#182238'; g.fillRect(0, 0, 600, 380);
  g.strokeStyle = safe ? '#4ce4a8' : '#ff6854'; g.lineWidth = 10; g.strokeRect(12, 12, 576, 356);
  g.fillStyle = safe ? '#5cf4b8' : '#ff7864'; g.font = '900 72px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText(safe ? '36.8°C' : 'NTRK1', 300, 148);
  g.fillStyle = '#ffffff'; g.font = '900 38px system-ui, sans-serif';
  g.fillText(safe ? 'ISI GÜVENLİ ✓' : 'AĞRI SİNİRİ: YOK', 300, 232);
  g.fillStyle = safe ? '#b4f4dc' : '#ffd288'; g.font = '700 28px system-ui, sans-serif';
  g.fillText(safe ? 'SAAT BAŞI KONTROL · CIPA' : 'CIPA · DOĞUŞTAN DUYARSIZLIK', 300, 302);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Sezon Finali Koruyucu Kalkan/Alarm Simgesi (alphaTest: .5)
function shieldTex() {
  const [c, g] = cnv(256, 256);
  g.fillStyle = '#ffd65c'; g.strokeStyle = '#382218'; g.lineWidth = 12;
  g.beginPath(); g.moveTo(128, 22); g.lineTo(216, 62); g.quadraticCurveTo(216, 178, 128, 232);
  g.quadraticCurveTo(40, 178, 40, 62); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#2694a4'; g.beginPath(); g.moveTo(128, 48); g.lineTo(190, 76); g.quadraticCurveTo(190, 162, 128, 202);
  g.quadraticCurveTo(66, 162, 66, 76); g.closePath(); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 92px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('!', 128, 130);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function badgeTex(title, sub, bg, fg, accent) {
  const [c, g] = cnv(560, 200);
  g.fillStyle = bg; g.beginPath(); g.roundRect(12, 12, 536, 176, 32); g.fill();
  g.strokeStyle = accent; g.lineWidth = 10; g.stroke();
  g.fillStyle = fg; g.font = '900 44px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
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

// ---------------------------------------------------------------- SET 1: GÜNEŞLİ ÇOCUK PARKI & KAYDIRAK (x = 0)
function buildPlayground(scene) {
  const g = new THREE.Group(); scene.add(g);

  // Yeşil park çimi + yumuşak kumlu oyun alanı
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(34, 28), painted(parkGrassTex()));
  grass.rotation.x = -Math.PI / 2; g.add(grass);
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, .06, 32), flat('#e6cf98'));
  sand.position.set(0, .03, -1.2); g.add(sand);

  // 3B KIRMIZI-SARI ÇOCUK PARKI KAYDIRAĞI (arka solda!)
  const slide = new THREE.Group(); slide.position.set(-1.35, 0, -2.4); slide.rotation.y = .35; g.add(slide);
  for (const [lx, lz] of [[-.45, -.45], [.45, -.45], [-.45, .45], [.45, .45]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.15, 10), flat('#2e6eb8'));
    post.position.set(lx, 1.08, lz); slide.add(post);
  }
  const plat = new THREE.Mesh(new THREE.BoxGeometry(1.06, .12, 1.06), flat('#f4c438'));
  plat.position.y = 1.68; slide.add(plat);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.95, .68, 4), flat('#e03c36'));
  roof.rotation.y = Math.PI / 4; roof.position.y = 2.52; slide.add(roof);
  // Eğimli parlak kırmızı kaydırak gövdesi!
  const chute = new THREE.Mesh(new THREE.BoxGeometry(.72, .10, 2.35), flat('#e64238'));
  chute.rotation.x = .68; chute.position.set(0, .92, 1.32); slide.add(chute);

  // 3B SALINCAK TAKIMI (arka sağda!)
  const swing = new THREE.Group(); swing.position.set(1.85, 0, -2.9); swing.rotation.y = -.28; g.add(swing);
  const sTop = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.2, 10), flat('#e8a82e'));
  sTop.rotation.z = Math.PI / 2; sTop.position.y = 2.35; swing.add(sTop);
  for (const sx of [-1.0, 1.0]) for (const dz of [-.55, .55]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.05, .055, 2.55, 8), flat('#2e6eb8'));
    leg.position.set(sx, 1.2, dz * .5); leg.rotation.x = dz * -.42; swing.add(leg);
  }
  dyn.swingSeat = new THREE.Group(); dyn.swingSeat.position.set(0, 2.35, 0); swing.add(dyn.swingSeat);
  for (const rx of [-.24, .24]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 1.65, 6), flat('#555a60'));
    rope.position.set(rx, -.82, 0); dyn.swingSeat.add(rope);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.58, .08, .28), flat('#e64238'));
  seat.position.y = -1.65; dyn.swingSeat.add(seat);

  // Renkli park topu (ön zeminde!)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.20, 16, 12), flat('#f4c438'));
  ball.position.set(-.18, .24, -.12); g.add(ball);

  // Yuvarlak yapraklı 4 park ağacı
  for (const [tx0, tz0, sc] of [[-4.1, -3.5, 1.15], [4.2, -3.8, 1.1], [-3.2, -6.2, 1.3], [2.2, -6.4, 1.25]]) {
    const tr = new THREE.Group(); tr.position.set(tx0, 0, tz0); tr.scale.setScalar(sc); g.add(tr);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.14, .20, 1.4, 10), flat('#6c482e')); trunk.position.y = .7; tr.add(trunk);
    for (const [cx, cy, cz, r, col] of [[0, 2.0, 0, .95, '#3e8e44'], [-.55, 1.75, .25, .65, '#4ea250'], [.55, 1.80, -.15, .68, '#367e3e']]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), flat(col)); leaf.position.set(cx, cy, cz); tr.add(leaf);
    }
  }

  // Güneşli gökyüzü silindiri
  const sky = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(sunnyParkSkyTex(), { yaw: Math.PI, az: 115 * Math.PI / 180, el: [-10 * Math.PI / 180, 38 * Math.PI / 180], gain: 1.1 })
  );
  sky.material.side = THREE.BackSide; g.add(sky);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#c4e8ff', '#628a46', 2.05));
  const SUN = [-.35, -.70, -.62]; dyn.pSun = V(...SUN).normalize();
  dyn.parkSun = sun('#fff4d4', 2.75, SUN, [0, 1, -1], { ext: 11 }); L.add(dyn.parkSun); L.add(dyn.parkSun.target);
  scene.add(L); sets.park = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: KAPALI NTRK1 BARİYERİ & DEV 3B ARABA GÖSTERGE PANELİ (x = 200)
function buildDashboard(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), flat('#181c26'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), flat('#141822'));
  backW.position.set(0, 5, -3.8); g.add(backW);

  // SOL KANAT (x = 0): P06 KAPALI NTRK1 SİNİR OTOYOLU!
  dyn.nerveGrp = new THREE.Group(); dyn.nerveGrp.position.set(0, 0, -.8); g.add(dyn.nerveGrp);
  // Işıklı sinir yolu rayı
  const track = new THREE.Mesh(new THREE.BoxGeometry(2.6, .16, .6), flat('#2c384e'));
  track.position.set(0, 1.15, 0); dyn.nerveGrp.add(track);
  // Soldan hızla gelip bariyere çarpan parlak ateş-acı sinyali küresi!
  dyn.painOrb = new THREE.Mesh(new THREE.SphereGeometry(.20, 18, 14), new THREE.MeshBasicMaterial({ color: '#ff5638' }));
  dyn.painOrb.position.set(-.95, 1.48, .05); dyn.painOrb.userData.noShadow = true; dyn.nerveGrp.add(dyn.painOrb);
  // Ortada KIRMIZI-BEYAZ ÇİZGİLİ KAPALI BARİYER (NTRK1: KAPALI)!
  const bPost1 = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.3, 10), flat('#7e8896')); bPost1.position.set(.15, 1.1, -.32); dyn.nerveGrp.add(bPost1);
  const bPost2 = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.3, 10), flat('#7e8896')); bPost2.position.set(.15, 1.1, .32); dyn.nerveGrp.add(bPost2);
  const bBar = new THREE.Mesh(new THREE.BoxGeometry(.18, .95, .86), new THREE.MeshBasicMaterial({ map: barrierTex() }));
  bBar.position.set(.15, 1.52, 0); bBar.userData.noShadow = true; dyn.nerveGrp.add(bBar);
  const nerveLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.48, .50),
    new THREE.MeshBasicMaterial({ map: badgeTex('NTRK1 KAPALI!', 'ACI: 0% · TERLEME: 0%', '#1c1420', '#ff8066', '#ff483c'), transparent: true, alphaTest: .35 })
  );
  nerveLbl.position.set(0, 2.55, 0); nerveLbl.userData.noShadow = true; dyn.nerveGrp.add(nerveLbl);
  fx.orbGlow = glow(scene, [200, 1.48, -.7], { size: 2.0, color: '#ff5c38', strength: .55 });

  // SAĞ KANAT (x = +5.2): P07 DEV 3B HARARET YAPAN ARABA GÖSTERGE PANELİ!
  dyn.dashGrp = new THREE.Group(); dyn.dashGrp.position.set(5.2, 0, -.6); g.add(dyn.dashGrp);
  // Araba konsol gövdesi
  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.28, .55), flat('#222630'));
  consoleBox.position.set(0, 1.48, -.15); dyn.dashGrp.add(consoleBox);
  // Sol kadran: HIZ (180 KM/S!)
  const spdDial = new THREE.Mesh(new THREE.CircleGeometry(.48, 32), new THREE.MeshBasicMaterial({ map: gaugeTex(false) }));
  spdDial.position.set(-.55, 1.52, .14); spdDial.userData.noShadow = true; dyn.dashGrp.add(spdDial);
  dyn.spdNeedle = new THREE.Mesh(new THREE.BoxGeometry(.042, .40, .03), new THREE.MeshBasicMaterial({ color: '#ff4238' }));
  dyn.spdNeedle.position.set(-.55, 1.52, .18); dyn.spdNeedle.userData.noShadow = true; dyn.dashGrp.add(dyn.spdNeedle);
  // Sağ kadran: HARARET (120°C KIRMIZI!)
  const tmpDial = new THREE.Mesh(new THREE.CircleGeometry(.48, 32), new THREE.MeshBasicMaterial({ map: gaugeTex(true) }));
  tmpDial.position.set(.55, 1.52, .14); tmpDial.userData.noShadow = true; dyn.dashGrp.add(tmpDial);
  dyn.tmpNeedle = new THREE.Mesh(new THREE.BoxGeometry(.042, .40, .03), new THREE.MeshBasicMaterial({ color: '#ff3428' }));
  dyn.tmpNeedle.position.set(.55, 1.52, .18); dyn.tmpNeedle.userData.noShadow = true; dyn.dashGrp.add(dyn.tmpNeedle);
  // Ortada 3 KARANLIK / SÖNÜK UYARI IŞIĞI SOKETİ (uyarı ışıkları sökük!)
  for (const wy of [1.74, 1.52, 1.30]) {
    const offLamp = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .06, 16), flat('#101218'));
    offLamp.rotation.x = Math.PI / 2; offLamp.position.set(0, wy, .14); dyn.dashGrp.add(offLamp);
  }
  const dashLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, .52),
    new THREE.MeshBasicMaterial({ map: badgeTex('HARARET 120°C!', 'UYARI IŞIKLARI SÖKÜK!', '#22141a', '#ffd45c', '#ff4438'), transparent: true, alphaTest: .35 })
  );
  dashLbl.position.set(0, 2.55, .12); dashLbl.userData.noShadow = true; dyn.dashGrp.add(dashLbl);
  fx.heatGlow = glow(scene, [205.8, 1.55, -.35], { size: 2.2, color: '#ff4432', strength: .56 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a8c4e8', '#2a222c', 1.85));
  const p1 = new THREE.PointLight('#ff8462', 3.4, 12); p1.position.set(200, 2.6, 2.2); L.add(p1);
  const p2 = new THREE.PointLight('#ffaa7a', 3.5, 12); p2.position.set(205.2, 2.5, 2.4); L.add(p2);
  scene.add(L); sets.dash = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: MODERN AYDINLIK ÇOCUK NÖROLOJİ KLİNİĞİ (x = 300)
function buildPediatricClinic(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);

  // Sıcak aydınlık ahşap zemin + renkli çocuk kliniği duvarları
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), painted(woodTex({ base: '#c49e72', plank: 38, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), painted(pediatricWallTex()));
  backW.position.set(0, 3.0, -3.1); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), painted(pediatricWallTex()));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.6, 3.0, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), painted(pediatricWallTex()));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.6, 3.0, 1.5); g.add(rightW);

  // Arka duvarda MODERN DİJİTAL ISI & NTRK1 MONİTÖRÜ!
  const scrFrm = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.42, .12), flat('#24303a'));
  scrFrm.position.set(0, 2.25, -3.02); g.add(scrFrm);
  dyn.scrNtrk = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.28), new THREE.MeshBasicMaterial({ map: clinicScreenTex(false) }));
  dyn.scrNtrk.position.set(0, 2.25, -2.94); dyn.scrNtrk.userData.noShadow = true; g.add(dyn.scrNtrk);
  dyn.scrSafe = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.28), new THREE.MeshBasicMaterial({ map: clinicScreenTex(true) }));
  dyn.scrSafe.position.set(0, 2.25, -2.93); dyn.scrSafe.userData.noShadow = true; dyn.scrSafe.visible = false; g.add(dyn.scrSafe);

  // Ön masada KORUYUCU MAVİ KASK + SOĞUTUCU BUZ ÇANTASI + SARI ÇALAR SAAT!
  const tbl = new THREE.Group(); tbl.position.set(0, 0, .58); g.add(tbl);
  const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.95, .09, .78), flat('#f4efe2')); tTop.position.y = .72; tbl.add(tTop);
  for (const lx of [-.84, .84]) for (const lz of [-.30, .30]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .72, 10), flat('#2694a4'));
    leg.position.set(lx, .36, lz); tbl.add(leg);
  }
  // Koruyucu mavi çocuk kaskı (solda)
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.20, 18, 12, 0, Math.PI * 2, 0, Math.PI * .58), flat('#2c82d8'));
  helm.position.set(-.54, .78, .04); tbl.add(helm);
  // Soğutucu buz çantası (ortada)
  const ice = new THREE.Mesh(new THREE.BoxGeometry(.32, .22, .16), flat('#5cc8ff'));
  ice.position.set(0, .88, .04); tbl.add(ice);
  // Saat başı kontrol çalar saati (sağda)
  const clk = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .09, 20), flat('#f4c438'));
  clk.rotation.x = Math.PI / 2; clk.position.set(.54, .91, .04); tbl.add(clk);
  const clkFace = new THREE.Mesh(new THREE.CircleGeometry(.11, 20), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  clkFace.position.set(.54, .91, .095); clkFace.userData.noShadow = true; tbl.add(clkFace);

  // Sezon Finali: Monitörün hemen üstünde parlayan altın-turkuaz KORUYUCU ALARM KALKANI (yazıyı kapatmaz!)
  dyn.shield = new THREE.Mesh(
    new THREE.PlaneGeometry(.58, .58),
    new THREE.MeshBasicMaterial({ map: shieldTex(), transparent: true, alphaTest: .5, side: THREE.DoubleSide })
  );
  dyn.shield.position.set(0, 3.02, -.45); dyn.shield.userData.noShadow = true; g.add(dyn.shield);
  fx.shieldGlow = glow(scene, [300, 3.02, -.50], { size: 1.7, color: '#ffd862', strength: .50 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#fff8e8', '#68989e', 2.15));
  const SUN = [-.2, -.55, .82]; dyn.cSun = V(...SUN).normalize();
  const key = sun('#fff4d8', 2.55, SUN, [300, 1.2, 0], { ext: 9 }); L.add(key); L.add(key.target);
  const front = new THREE.DirectionalLight('#ffffff', 1.25); front.position.set(300, 2.8, 6.2); front.target.position.set(300, 1.2, -.4);
  L.add(front); L.add(front.target);
  scene.add(L); sets.clinic = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA KOREOGRAFİSİ
function cameraPath() {
  const k = [
    // P01 PARK VİNÇ AÇILIŞI: Kaydırak ve salıncaklı güneşli parktan aşağı inip gülümseyen Kaan'a zoom!
    { t: 0, pos: [-.3, 3.65, 4.45], look: [-.2, 1.25, -1.4], fov: 50, creep: .12, drift: .03 },
    { t: P(1, .48), dur: .72, pos: [-.42, 1.32, 2.05], look: [-.42, 1.15, -.75], fov: 46, creep: .20 },
    { t: P(1, .84), dur: .34, pos: [-.42, 1.18, 1.38], look: [-.42, 1.10, -.75], fov: 44, creep: .20 },
    // P02 OYUN ALANI: Kaan (gülümser) + Ege (şaşkın) tam ikili plan!
    { t: PS(2) + .16, dur: .36, move: 'whip', pos: [0, 1.32, 3.65], look: [0, 1.18, -.95], fov: 50, creep: .16 },
    // P03 ÇAPRAZ AÇI: Arkadaşı Ege kahkahayla güler!
    { t: PS(3) + .14, dur: .32, move: 'whip', pos: [1.18, 1.26, 1.75], look: [.48, 1.16, -.78], fov: 46, creep: .22 },
    // P04 GÜNEŞ HARARETİ: Güneş kızarır, Kaan terleyemeden kıpkırmızı ısınır!
    { t: PS(4) + .16, dur: .36, move: 'whip', pos: [-.38, 1.24, 1.95], look: [-.40, 1.15, -.80], fov: 46, creep: .20 },
    // P05 WHIP PAN → SET 3 (ÇOCUK KLİNİĞİ): Dr. Selin + küçük Kaan + NTRK1 dijital monitör!
    { t: PS(5) + .14, dur: .34, move: 'whip', pos: [300.0, 1.48, 4.10], look: [300.0, 1.44, -.65], fov: 50, creep: .16 },
    // P06 WHIP PAN → SET 2 (KAPALI NTRK1 SİNİR OTOYOLU): Ateş sinyali bariyere çarpıp durur!
    { t: PS(6) + .14, dur: .34, move: 'whip', pos: [200.0, 1.65, 3.95], look: [200.0, 1.68, -.8], fov: 50, creep: .14 },
    // P07 YANA KAYAN TAKİP → DEV 3B ARABA GÖSTERGE PANELİ (iki kadran tam kadraj + beyaz buhar!)
    { t: PS(7) + .14, dur: .38, move: 'whip', pos: [205.2, 1.68, 4.35], look: [205.2, 1.66, -.6], fov: 50, creep: .08 },
    // P08 WHIP PAN → SET 3: 36.8°C GÜVENLİ monitörü + koruyucu kask, buz çantası ve çalar saat!
    { t: PS(8) + .14, dur: .34, move: 'whip', pos: [300.0, 1.38, 3.45], look: [300.0, 1.28, -.25], fov: 48, creep: .16 },
    // P09 İKİLİ SICAK PLAN: Dr. Selin & gülümseyen Kaan!
    { t: PS(9) + .14, dur: .32, move: 'whip', pos: [300.0, 1.44, 3.85], look: [300.0, 1.42, -.65], fov: 50, creep: .14 },
    // P10 SEZON FİNALİ VİNÇ ÇIKIŞI: Altın koruyucu kalkan-alarm ve sıcak gülümsemelerle yükselir!
    { t: DUR, dur: Math.max(.8, DUR - PS(10) - .05), pos: [300.0, 2.02, 4.75], look: [300.0, 1.52, -1.0], fov: 52, creep: .10 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .42), 1.15); // ateş sinyalinin kapalı NTRK1 bariyerine çarpma anı!
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
  scene.background = new THREE.Color('#6ec0f5');
  buildPlayground(scene); buildDashboard(scene); buildPediatricClinic(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Set 2 P07 hararet yapan araba kadranından yükselen GERÇEK BEYAZ BUHAR!
  fx.motes = new Smoke(scene, { color: '#eef4ff', maxPoints: 500, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 80, size: .012, alpha: .45, speed: .08, on: t => where(t) === 'park',
    path: (u, t, i) => [(hash(i, 1) - .5) * 6.0, 3.2 - u * 2.5, -1.5 + (hash(i, 2) - .5) * 3.0],
  });
  fx.motes.wisps.push({
    n: 190, size: .028, alpha: .55, speed: .48, on: t => where(t) === 'dash' && t >= PS(7) - .15,
    path: (u, t, i) => [205.8 + (hash(i, 4) - .5) * .65 + Math.sin(t * 3 + i) * .16 * u, 1.85 + u * 1.9, -.45 + (hash(i, 6) - .5) * .35],
  });
  fx.motes.wisps.push({
    n: 85, size: .012, alpha: .45, speed: .06, on: t => where(t) === 'clinic',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 4.5, 3.0 - u * 2.4, -1.2 + (hash(i, 9) - .5) * 3.0],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(5) - .06, 'whoosh');
  cue(PS(6) - .06, 'whoosh');
  cue(PS(7) - .06, 'whoosh');
  cue(PS(8) - .06, 'whoosh');
  cue(P(1, .35), 'thud');
  cue(P(6, .42), 'barrier');
  cue(PS(7) + .08, 'steam', { dur: PE(7) - PS(7) });
  cue(PS(8) + .10, 'clock', { dur: PE(8) - PS(8) });
  cue(PE(10) - .30, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return t < PS(5) ? 'park' : (t >= PS(6) && t < PS(8)) ? 'dash' : 'clinic'; }
function camSet(cam) { return cam.position.x > 250 ? 'clinic' : cam.position.x > 100 ? 'dash' : 'park'; }
const WARM = '#ffe09c', COOL = '#cfe4fa';
const lerp = (a, b, u) => a + (b - a) * u;

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['park', 'dash', 'clinic']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);

  fx.orbGlow.visible = here === 'dash' && t < PS(7) - .1;
  fx.heatGlow.visible = here === 'dash' && t >= PS(7) - .15;
  fx.shieldGlow.visible = here === 'clinic' && t >= PS(9);

  const kaan = cast.kaan, ege = cast.ege, doc = cast.drselin;

  if (here === 'park') {
    // Salıncak parkta hafifçe sallanır!
    dyn.swingSeat.rotation.x = Math.sin(t * 2.4) * .28;
    // P04'te güneş hararetli sıcak turuncuya döner, Kaan terleyemeden kızarır!
    const hotU = ramp(t, PS(4), PE(4));
    dyn.parkSun.color.set(hotU > .25 ? '#ff9658' : '#fff4d4');
    const kaanTint = [lerp(1.0, 1.24, hotU), lerp(1.0, .74, hotU), lerp(1.0, .68, hotU)];

    kaan.show(); kaan.place(-.42, .06, -.78, cam, kaanTint);
    kaan.draw({
      expr: hotU > .25 ? 'worried' : 'grin',
      look: t >= PS(2) && t < PS(4) ? .52 : 0,
      sweat: 0, // BİLİMSEL DOĞRULUK: CIPA hastası TERLEYEMEZ (anhidrosis) → ter damlası 0!
      blink: bl(1, P(1, .5), PS(2), PS(4)),
      armL: hotU > .25 ? [28, 18] : [64, 24],
      armR: hotU > .25 ? [28, 18] : [64, 24],
      bob: t >= PS(2) && t < PS(3) ? Math.abs(Math.sin(t * 8)) * 6 : 0,
      lit: 1, shade: hotU > .25 ? '#ff9884' : COOL, rim: { color: WARM, a: .40 },
    });
    kaan.castFrom(dyn.pSun, true);

    if (t >= PS(2) - .12 && t < PS(4) - .08) {
      const laughing = t >= PS(3) && t <= PE(3) + .18;
      ege.show(); ege.place(.48, .06, -.78, cam, [1, 1, 1]);
      ege.draw({
        expr: laughing ? 'laugh' : 'surprised',
        look: -.58,
        mouth: Math.max(talk(PS(3), PE(3)), laughing ? .65 : 0),
        laughMarks: laughing ? .9 : 0,
        blink: bl(2, PS(3)),
        armL: laughing ? [112, 34] : [36, 20],
        armR: laughing ? [64, 38] : [22, 18],
        bob: laughing ? -Math.abs(Math.sin(t * 14)) * 9 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .36 },
      });
      ege.castFrom(dyn.pSun, true);
    }
  } else if (here === 'dash') {
    if (t < PS(7) - .12) {
      // P06: Ateş sinyali hızla gelir ama kapalı NTRK1 bariyerine çarpıp geri seker!
      const hitU = ramp(t, P(6, .08), P(6, .42));
      const bounce = t > P(6, .42) ? Math.sin((t - P(6, .42)) * 18) * Math.exp(-(t - P(6, .42)) * 4) * .16 : 0;
      dyn.painOrb.position.x = -.95 + hitU * .84 - Math.abs(bounce);
      fx.orbGlow.position.set(200 + dyn.painOrb.position.x, 1.48, -.7);
    } else {
      // P07: Hız ve Hararet ibreleri kırmızı bölgeye (120°C) dayanıp şiddetle titreşir!
      const revU = ramp(t, PS(7), PS(7) + .85);
      const jitter = Math.sin(t * 38) * .06;
      dyn.spdNeedle.rotation.z = lerp(1.6, -1.75, revU) + jitter;
      dyn.tmpNeedle.rotation.z = lerp(1.4, -1.85, revU) + jitter * 1.2;
      fx.heatGlow.scale.setScalar(1.0 + .28 * Math.sin(t * 18));
    }
  } else {
    // SET 3: MODERN AYDINLIK ÇOCUK NÖROLOJİ KLİNİĞİ (SEZON FİNALİ!)
    const safeMode = t >= PS(8) - .1;
    dyn.scrNtrk.visible = !safeMode;
    dyn.scrSafe.visible = safeMode;
    const finale = t >= PS(9) - .1;
    dyn.shield.visible = finale;
    if (finale) {
      dyn.shield.scale.setScalar(.95 + .09 * Math.sin(t * 6));
      dyn.shield.position.y = 3.02 + Math.sin(t * 2.5) * .05;
      dyn.shield.lookAt(cam.position);
    }

    kaan.show(); kaan.place(299.54, 0, -.68, cam, [1, 1, 1]);
    kaan.draw({
      expr: finale ? 'smile' : (safeMode ? 'neutral' : 'worried'),
      look: .45,
      blink: bl(3, PS(5), PS(8), PS(10)),
      armL: finale ? [46, 20] : [18, 16],
      armR: finale ? [46, 20] : [18, 16],
      lit: 1, shade: COOL, rim: { color: WARM, a: .42 },
    });
    doc.show(); doc.place(300.46, 0, -.70, cam, [1, 1, 1]);
    doc.draw({
      expr: finale ? 'proud' : (safeMode ? 'smile' : 'focused'),
      look: -.48,
      blink: bl(4, PS(5), PS(8), PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [56, 36], armR: [62, 40],
      lit: 1, shade: COOL, rim: { color: WARM, a: .40 },
    });
    kaan.castFrom(dyn.cSun, true); doc.castFrom(dyn.cSun, true);
  }

  fx.motes.update(t);

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'park') {
    look = { ...focusOn(V(0, 1.2, -.9), 4.0, 5.5), sat: 1.22, lift: [.10, .11, .10], bloom: .78, vignette: .15 };
    C.scene.fog = null;
  } else if (here === 'dash') {
    const subj = t >= PS(7) - .15 ? V(205.2, 1.6, -.6) : V(200, 1.6, -.8);
    look = { ...focusOn(subj, 3.5, 5.2), sat: 1.26, lift: [.09, .09, .11], bloom: .95, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.35, -.5), 3.8, 5.5), sat: 1.18, lift: [.11, .11, .10], bloom: .78, vignette: .14 };
    C.scene.fog = null;
  }
  look.tint = here === 'park' ? [1.02, 1.02, .98] : here === 'dash' ? [1.02, .99, .99] : [1.01, 1.02, .99];
  look.blur = st.moving > .15 ? 15 : 0;
  return look;
}
