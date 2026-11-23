// En Garip Hastalıklar #03: Yürüyen Ceset Sendromu (Cotard) — yumurta kafa stili.
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler: KLİNİK (x≈0), BEYİN BAĞLANTI ODASI (x≈200), PARİS AKŞAM BALKONU (x≈300). Sert kesme yok: süzülme + whip.
// Işık: her sette sıcak karşısında soğuk, güneş/anahtar ışık kameranın arka-yanından (asla kameraya karşı değil), gerçek gölge.
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'cotard-sendromu';
export const FPS = 30;
export let DUR = 38;
export const CUES = [];
export const LOOK = {
  matmazel: {
    headW: 256, headH: 244,
    longHair: '#3b2a24', hairLen: 265,
    cloth: '#7c849c', clothDark: '#4f5770',
    skirt: '#4f5770', boots: '#28242a',
    collar: true, buttons: '#d8dbe6',
    bodyW: 194, height: 1.62,
  },
  cotard: {
    headW: 270, headH: 250,
    mustache: '#3a2d28', beard: '#3a2d28',
    cloth: '#e2dcd0', clothDark: '#b8b0a0',
    trim: '#35485e', buttons: '#2c3a4c',
    pocket: true, collar: true,
    bodyW: 218, height: 1.76,
  },
  asistan: {
    headW: 262, headH: 246,
    mustache: '#4d3728',
    cloth: '#3d5a76', clothDark: '#263a4f',
    scarf: '#c24938', scarfY: 6,
    buttons: '#1e2c3a', pocket: true, collar: true,
    bodyW: 202, height: 1.68,
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
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .28;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

// 19. yy Paris klinik duvar kağıdı (açık tozlu mavi-krem çizgili, yüksek kontrastlı)
function wallpaperTex(rep = [3, 2]) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#c8d2dc'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#c8d2dc', 280, 24, .14, 17, .22);
  g.fillStyle = '#b4c2d0';
  for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 26, 512);
  g.strokeStyle = '#92a2b4'; g.lineWidth = 2;
  for (let x = 0; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  // alt ahşap lambri şeridi
  g.fillStyle = '#6e523e'; g.fillRect(0, 390, 512, 122);
  g.fillStyle = '#86664e'; g.fillRect(0, 382, 512, 14);
  return tx(c, rep);
}

// Ayna yüzeyi (hafif buğulu mavi-gümüş yansıma + matmazel silüeti)
function mirrorTex() {
  const [c, g] = cnv(512, 768);
  const gr = g.createLinearGradient(0, 0, 512, 768);
  gr.addColorStop(0, '#c6d8e8'); gr.addColorStop(.5, '#9ab2c8'); gr.addColorStop(1, '#758fa8');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 768);
  // diyagonal cam parıltıları
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.moveTo(60, 0); g.lineTo(170, 0); g.lineTo(0, 340); g.lineTo(0, 220); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(310, 0); g.lineTo(360, 0); g.lineTo(60, 768); g.lineTo(10, 768); g.closePath(); g.fill();
  // Matmazel'in aynadaki yansıması (donuk, yumurta kafa silüeti)
  g.save(); g.translate(256, 375);
  // saç
  g.fillStyle = '#3b2a24'; g.beginPath(); g.ellipse(0, 20, 92, 160, 0, 0, 6.29); g.fill();
  // omuzlar
  g.fillStyle = '#6c748c'; g.beginPath(); g.roundRect(-84, 90, 168, 220, 36); g.fill();
  // beyaz yumurta kafa
  g.fillStyle = '#eef1f6'; g.strokeStyle = PLUM; g.lineWidth = 7;
  g.beginPath(); g.ellipse(0, -18, 66, 72, 0, 0, 6.29); g.fill(); g.stroke();
  // saç perçemi
  g.fillStyle = '#3b2a24'; g.beginPath(); g.arc(0, -34, 68, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  // donuk gözler ve düz ağız
  g.fillStyle = PLUM;
  g.beginPath(); g.arc(-22, -16, 7, 0, 6.29); g.arc(22, -16, 7, 0, 6.29); g.fill();
  g.strokeStyle = PLUM; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-34, -30); g.lineTo(-10, -30); g.moveTo(10, -30); g.lineTo(34, -30); g.stroke();
  g.beginPath(); g.moveTo(-14, 16); g.lineTo(14, 16); g.stroke();
  g.restore();
  return tx(c);
}

// Etiket levhası (beyin küreleri ve telefon ekranı için)
function badgeTex(title, sub, bg, fg, accent) {
  const [c, g] = cnv(512, 220);
  g.fillStyle = bg; g.beginPath(); g.roundRect(12, 12, 488, 196, 36); g.fill();
  g.strokeStyle = accent; g.lineWidth = 10; g.stroke();
  g.fillStyle = fg; g.font = '900 72px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(title, 256, 86);
  g.fillStyle = accent; g.font = '700 40px system-ui, sans-serif';
  g.fillText(sub, 256, 158);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Dokunmatiği bozuk parlayan telefon ekranı
function phoneScreenTex() {
  const [c, g] = cnv(384, 640);
  const gr = g.createLinearGradient(0, 0, 0, 640);
  gr.addColorStop(0, '#4688d6'); gr.addColorStop(1, '#1d3c6e');
  g.fillStyle = gr; g.fillRect(0, 0, 384, 640);
  // canlı görünen saat ve simge
  g.fillStyle = '#ffffff'; g.font = '900 96px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('18:80', 192, 160);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.roundRect(44, 230, 296, 150, 26); g.fill();
  g.fillStyle = '#ffdf78'; g.font = '800 42px system-ui, sans-serif';
  g.fillText('GÖRÜNTÜ VAR', 192, 290);
  g.fillStyle = '#ff8070'; g.font = '800 40px system-ui, sans-serif';
  g.fillText('TEPKİ: SIFIR', 192, 345);
  // dokunma halkası + çarpı
  g.strokeStyle = '#ff6b5b'; g.lineWidth = 10;
  g.beginPath(); g.arc(192, 500, 58, 0, 6.29); g.stroke();
  g.beginPath(); g.moveTo(164, 472); g.lineTo(220, 528); g.moveTo(220, 472); g.lineTo(164, 528); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 1880 Paris akşam panoraması (genel 19. yy kubbe & mansard çatı silueti, marka/logo yok)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function parisEveningTex() {
  const Pn = pano(4096, 1800, 105, -14, 32), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#323a6e')); sky.addColorStop(.45, D('#8a527c')); sky.addColorStop(.8, D('#e28a58')); sky.addColorStop(1, D('#ffce84'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(91);
  for (let i = 0; i < 10; i++) {
    g.fillStyle = D(i % 2 ? '#f0a272' : '#c8728a', .48);
    g.beginPath(); g.ellipse(R() * Pn.w, Pn.Y(7 + R() * 17), 190 + R() * 240, 18 + R() * 14, 0, 0, 6.29); g.fill();
  }
  // batan sıcak güneş
  const sx = Pn.X(6), sy = Pn.Y(4.0), sr = Pn.s * 3.5;
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.2);
  gr.addColorStop(0, 'rgba(255,244,210,1)'); gr.addColorStop(.35, 'rgba(255,210,145,.88)'); gr.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr * 3.2, 0, 6.29); g.fill();
  g.fillStyle = '#fff8e2'; g.beginPath(); g.arc(sx, sy, sr, 0, 6.29); g.fill();
  // alt nehir ve rıhtım
  const riv = g.createLinearGradient(0, Pn.Y(0), 0, Pn.h);
  riv.addColorStop(0, D('#343c74')); riv.addColorStop(1, D('#1b2044'));
  g.fillStyle = riv; g.fillRect(0, Pn.Y(0), Pn.w, Pn.h - Pn.Y(0));
  for (let i = 0; i < 120; i++) {
    const y = Pn.Y(-.5 - R() * 10);
    g.fillStyle = D('#ffd68e', .45 + R() * .4);
    g.fillRect(sx + (R() - .5) * 420, y, 28 + R() * 54, 4);
  }
  // Paris mansard çatı silueti + 19. yy neoklasik kubbe + sıcak pencere ışıkları
  const y0 = Pn.Y(1.0);
  g.fillStyle = D('#3a3058'); g.strokeStyle = D('#201938', .9); g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, Pn.h); g.lineTo(0, y0);
  for (let x = 0; x <= Pn.w; x += 68) {
    const hh = 55 + R() * 75;
    g.lineTo(x, y0 - hh); g.lineTo(x + 12, y0 - hh - 22); g.lineTo(x + 56, y0 - hh - 22); g.lineTo(x + 68, y0 - hh);
  }
  g.lineTo(Pn.w, Pn.h); g.closePath(); g.fill(); g.stroke();
  // neoklasik kubbe silueti
  const dx = Pn.X(-18);
  g.beginPath(); g.rect(dx - 75, y0 - 170, 150, 170); g.fill(); g.stroke();
  g.beginPath(); g.arc(dx, y0 - 170, 62, Math.PI, 0); g.fill(); g.stroke();
  g.beginPath(); g.rect(dx - 12, y0 - 255, 24, 30); g.fill(); g.stroke();
  // pencerelerde küçük sarı ışıklar
  g.fillStyle = '#ffd27a';
  for (let i = 0; i < 110; i++) {
    g.fillRect(R() * Pn.w, y0 - 18 - R() * 68, 7, 11);
  }
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

// ---------------------------------------------------------------- SET 1: 1880 PARİS KLİNİK ODASI (x = 0)
function buildClinic(scene) {
  const g = new THREE.Group(); scene.add(g);
  // parke ahşap zemin
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#946b44', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  // kilim (odanın merkezine sıcaklık verir)
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.6), flat('#8d3d3c'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, .006, -.4); g.add(rug);
  const rugIn = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 3.1), flat('#b45a4c'));
  rugIn.rotation.x = -Math.PI / 2; rugIn.position.set(0, .009, -.4); g.add(rugIn);

  // arka duvar (z = -3.4) + yan duvarlar (x = ±4.8) — kamera hep z > 0.5'te, asla duvara girmez!
  const wallM = painted(wallpaperTex([3, 1]));
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 5.2), wallM);
  backW.position.set(0, 2.6, -3.4); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(wallpaperTex([3, 1])));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.8, 2.6, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.2), painted(wallpaperTex([3, 1])));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.8, 2.6, 1.5); g.add(rightW);

  // Sol duvarda yüksek Paris penceresi (soğuk mavi ışık kaynağı!)
  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.8), new THREE.MeshBasicMaterial({ color: '#c4e0ff' }));
  winGlow.rotation.y = Math.PI / 2; winGlow.position.set(-4.74, 2.2, -1.2); g.add(winGlow);
  const frameM = flat('#4a382c');
  for (const [py, h] of [[3.62, .12], [2.2, .08], [.78, .12]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.12, h, 2.26), frameM); bar.position.set(-4.72, py, -1.2); g.add(bar);
  }
  for (const pz of [-2.28, -1.2, -.12]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.95, .1), frameM); bar.position.set(-4.72, 2.2, pz); g.add(bar);
  }

  // Arka duvarda büyük altın çerçeveli AYNA (Matmazel P05'te buna bakar!)
  const mirGrp = new THREE.Group(); mirGrp.position.set(-.15, 1.65, -3.32); g.add(mirGrp);
  const mirFrame = new THREE.Mesh(new THREE.BoxGeometry(1.52, 2.12, .12), flat('#b48a42')); mirGrp.add(mirFrame);
  const mirGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.92), new THREE.MeshBasicMaterial({ map: mirrorTex() }));
  mirGlass.position.z = .07; mirGrp.add(mirGlass);

  // Sağ arka köşede 19. yy kitaplık (derinlik ve dönem atmosferi)
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.5, .52), painted(woodTex({ base: '#6e4a2e', plank: 30 })));
  shelf.position.set(2.85, 1.25, -3.05); g.add(shelf);
  const bookCols = ['#8a322e', '#325278', '#426a48', '#b08238', '#5a3a64'];
  for (let r = 0; r < 3; r++) {
    for (let b = 0; b < 7; b++) {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(.16, .34 + (b % 3) * .05, .28), flat(bookCols[(r * 3 + b) % bookCols.length]));
      bk.position.set(2.22 + b * .2, .75 + r * .62, -2.85); g.add(bk);
    }
  }

  // Muayene masası (karakterlerin önünde değil, sağ-yan orta planda: x = .55, z = -.55 — karakteri kapatmaz!)
  const tbl = new THREE.Group(); tbl.position.set(.58, 0, -.55); g.add(tbl);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.38, .09, .78), painted(woodTex({ base: '#7c5334', plank: 32 })));
  top.position.y = .76; tbl.add(top);
  for (const lx of [-.58, .58]) for (const lz of [-.3, .3]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.045, .038, .76, 10), flat('#5a3b24'));
    leg.position.set(lx, .38, lz); tbl.add(leg);
  }
  // Masa üstünde sıcak parlayan GAZ LAMBASI (görüntüdeki sıcak anahtar ışık!)
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, .18, 14), flat('#c89844'));
  lampBase.position.set(.42, .89, -.15); tbl.add(lampBase);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(.1, .18, .22, 16), new THREE.MeshBasicMaterial({ color: '#ffdf88' }));
  lampShade.position.set(.42, 1.09, -.15); lampShade.userData.noShadow = true; tbl.add(lampShade);
  const lampGlow = glow(scene, [1.0, 1.12, -.7], { size: 1.5, color: '#ffcf72', strength: .42 });
  fx.cGlow = lampGlow;

  // Masa üstünde ÇORBA TABAĞI (Matmazel P03'te eliyle yana iter!)
  dyn.plate = new THREE.Group(); dyn.plate.position.set(.32, .82, -.52); g.add(dyn.plate);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.18, .12, .08, 18), flat('#f4efe6')); dyn.plate.add(bowl);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(.155, 18), flat('#d6843c'));
  soup.rotation.x = -Math.PI / 2; soup.position.y = .042; dyn.plate.add(soup);

  // Işık: soğuk mavi Paris penceresi dolgusu + sıcak gaz lambası/anahtar ışık (kameranın arka-sağından!)
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a8c8f0', '#7e634e', 2.05));
  const SUN = [-.45, -.42, -.78]; dyn.cSun = V(...SUN).normalize();
  const key = sun('#ffd699', 2.85, SUN, [0, 1, -1], { ext: 8 }); L.add(key); L.add(key.target);
  const warmPt = new THREE.PointLight('#ffbe64', 2.6, 8); warmPt.position.set(1.0, 1.35, -.7); L.add(warmPt);
  scene.add(L); sets.clinic = { g, L }; shadows(g);

  // Pencereden içeri süzülen soğuk-mavi gün ışığı huzmeleri
  fx.cBeams = [[-4.5, 3.0, -1.6], [-4.5, 2.7, -.7]].map(p =>
    beam(scene, p, [p[0] + 4.2, p[1] - 2.1, p[2] + .8], { r0: .42, r1: 1.15, color: '#c8e4ff', strength: .14 })
  );
}

// ---------------------------------------------------------------- SET 2: BEYİN BAĞLANTI ODASI (x = 200)
function buildMind(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  // derin lacivert-indigo zemin ve arka duvar (parlak kürelerle yüksek kontrast!)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), flat('#1b2646'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), flat('#18223e'));
  backW.position.set(0, 6, -5.2); g.add(backW);

  // Sol küre: TANIMA MERKEZİ (sıcak altın-kehribar — dikey kadraja tam sığacak mesafede)
  const rec = new THREE.Mesh(new THREE.SphereGeometry(.42, 26, 20), new THREE.MeshBasicMaterial({ color: '#ffbe58' }));
  rec.position.set(-.68, 1.65, -1.4); rec.userData.noShadow = true; g.add(rec);
  const recRing = new THREE.Mesh(new THREE.TorusGeometry(.56, .03, 12, 40), flat('#ffe29c'));
  recRing.position.copy(rec.position); recRing.userData.noShadow = true; g.add(recRing);
  dyn.recRing = recRing;
  const recLbl = new THREE.Mesh(new THREE.PlaneGeometry(.92, .4), new THREE.MeshBasicMaterial({ map: badgeTex('TANIMA', 'SAĞLAM', '#18243c', '#ffffff', '#ffbe58'), transparent: true }));
  recLbl.position.set(-.68, 2.48, -1.4); recLbl.userData.noShadow = true; g.add(recLbl);

  // Sağ küre: DUYGU MERKEZİ (soğuk buz mavisi)
  const emo = new THREE.Mesh(new THREE.SphereGeometry(.42, 26, 20), new THREE.MeshBasicMaterial({ color: '#5ec8ff' }));
  emo.position.set(.68, 1.65, -1.4); emo.userData.noShadow = true; g.add(emo);
  const emoRing = new THREE.Mesh(new THREE.TorusGeometry(.56, .03, 12, 40), flat('#a8e4ff'));
  emoRing.position.copy(emo.position); emoRing.userData.noShadow = true; g.add(emoRing);
  dyn.emoRing = emoRing;
  const emoLbl = new THREE.Mesh(new THREE.PlaneGeometry(.92, .4), new THREE.MeshBasicMaterial({ map: badgeTex('DUYGU', 'SESSİZ', '#18243c', '#ffffff', '#5ec8ff'), transparent: true }));
  emoLbl.position.set(.68, 2.48, -1.4); emoLbl.userData.noShadow = true; g.add(emoLbl);

  // İki küreyi bağlayan SİNİR HATTI (sol ve sağ yarı — P06'da ortadan kopup sarkar!)
  dyn.wireL = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .64, 12), new THREE.MeshBasicMaterial({ color: '#ffd866' }));
  dyn.wireL.rotation.z = Math.PI / 2; dyn.wireL.position.set(-.32, 1.65, -1.4); dyn.wireL.userData.noShadow = true; g.add(dyn.wireL);
  dyn.wireR = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .64, 12), new THREE.MeshBasicMaterial({ color: '#80d8ff' }));
  dyn.wireR.rotation.z = Math.PI / 2; dyn.wireR.position.set(.32, 1.65, -1.4); dyn.wireR.userData.noShadow = true; g.add(dyn.wireR);

  // Kürelerin parıltı haleleri
  fx.mGlowL = glow(scene, [199.32, 1.65, -1.3], { size: 1.8, color: '#ffbe58', strength: .45 });
  fx.mGlowR = glow(scene, [200.68, 1.65, -1.3], { size: 1.8, color: '#5ec8ff', strength: .45 });

  // Gündelik benzetme: BÜYÜK PARLAYAN TELEFON / EKRAN (sağda, Dr. Cotard ile birlikte tam kadrajda!)
  dyn.phone = new THREE.Group(); dyn.phone.position.set(.38, 1.02, .25); dyn.phone.scale.setScalar(.82); g.add(dyn.phone);
  const pBody = new THREE.Mesh(new THREE.BoxGeometry(.76, 1.24, .08), flat('#263042')); dyn.phone.add(pBody);
  const pScr = new THREE.Mesh(new THREE.PlaneGeometry(.66, 1.1), new THREE.MeshBasicMaterial({ map: phoneScreenTex() }));
  pScr.position.z = .045; pScr.userData.noShadow = true; dyn.phone.add(pScr);

  // Işık: güçlü soğuk dolgu + sıcak ön-yan anahtar ışık (karakter ve küreler hep yüksek kontrastlı!)
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#8cb2f0', '#3d345c', 1.9));
  const SUN = [-.3, -.45, -.85]; dyn.mSun = V(...SUN).normalize();
  const s = sun('#ffcf8a', 2.4, SUN, [200, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  scene.add(L); sets.mind = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: PARİS AKŞAM BALKONU (x = 300)
function buildSunset(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  // taş balkon zemini
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), flat('#8d7c76'));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 1.6; g.add(floor);
  // taş balkon korkuluğu (arka kenar z = -1.65)
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, .14, .28), flat('#b4a296'));
  railTop.position.set(0, .92, -1.65); g.add(railTop);
  const railBot = new THREE.Mesh(new THREE.BoxGeometry(8.5, .18, .28), flat('#98867c'));
  railBot.position.set(0, .09, -1.65); g.add(railBot);
  for (let x = -3.8; x <= 3.8; x += .55) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.05, .065, .82, 10), flat('#a6948a'));
    col.position.set(x, .48, -1.65); g.add(col);
  }
  // Paris akşam panoraması (karakterlerin arkasında sıcak batan güneş!)
  const far = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(parisEveningTex(), { yaw: Math.PI, az: 105 * Math.PI / 180, el: [-14 * Math.PI / 180, 32 * Math.PI / 180], gain: 1.25 })
  );
  far.material.side = THREE.BackSide; far.position.set(0, 0, 0); g.add(far);
  // Işık: arkadan sıcak güneş + önden yumuşak soğuk-mor dolgu (karakter yüzleri tertemiz okunur!)
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a696e4', '#5c4a62', 1.85));
  const SUN = [0, -.26, 1]; dyn.hSun = V(...SUN).normalize();
  const s = sun('#ffa65c', 3.0, SUN, [300, 1, 0], { ext: 8 }); L.add(s); L.add(s.target);
  const fill = new THREE.DirectionalLight('#c4b8ff', 1.15); fill.position.set(302.5, 3.6, 7.5); fill.target.position.set(300, 1.1, 0);
  L.add(fill); L.add(fill.target);
  scene.add(L); sets.sunset = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU (Sert kesme SIFIR: süzülme + whip)
function cameraPath() {
  const k = [
    // P01 PARADOKS KANCA (4 hızlı plan): geniş klinik → gaz lambası/masa → Matmazel yakın → ayna açısı
    { t: 0, pos: [-.9, 1.35, 3.9], look: [.15, 1.15, -.7], fov: 50, creep: .28, drift: .04 },
    { t: P(1, .30), dur: .42, pos: [.35, 1.12, 1.55], look: [.55, .95, -.55], fov: 44, creep: .30 },
    { t: P(1, .60), dur: .28, move: 'whip', pos: [-.72, 1.28, 1.55], look: [-.68, 1.25, -.75], fov: 42, creep: .28 },
    { t: P(1, .86), dur: .28, move: 'whip', pos: [-.15, 1.48, -.25], look: [-.15, 1.55, -3.3], fov: 46, creep: .24 },
    // P02 "Bakın, 1880 Paris'inde...": geri süzülüp Dr. Cotard ve Matmazel tam ikili plan
    { t: PS(2) + .16, dur: .32, move: 'whip', pos: [-.1, 1.25, 3.85], look: [-.12, 1.12, -.88], fov: 50, creep: .22 },
    // P03 Matmazel tabağı iter (ikisi de tam kadrajda + masa)
    { t: PS(3) + .18, dur: .48, pos: [-.12, 1.18, 3.25], look: [-.1, 1.05, -.82], fov: 48, creep: .24 },
    // P04 Asistan güler/itiraz eder (whip sağa)
    { t: PS(4) + .14, dur: .30, move: 'whip', pos: [1.3, 1.28, 2.35], look: [1.22, 1.22, -.75], fov: 46, creep: .28 },
    // P05 Matmazel aynaya bakar (whip sola-arkaya, gerilim itmesi)
    { t: PS(5) + .14, dur: .30, move: 'whip', pos: [-.5, 1.38, 1.55], look: [-.22, 1.45, -2.9], fov: 46, creep: .32 },
    // P06 WHIP PAN → SET 2: Beyin Bağlantı Odası (iki küre + etiketler %100 kadrajda!)
    { t: PS(6) + .14, dur: .32, move: 'whip', pos: [200.0, 1.72, 4.75], look: [200.0, 1.72, -1.4], fov: 52, creep: .24 },
    // P07 Gündelik benzetme: Dr. Cotard + parlayan telefon ekranı %100 kadrajda!
    { t: PS(7) + .18, dur: .42, pos: [200.0, 1.16, 4.15], look: [200.0, 1.08, .22], fov: 48, creep: .22 },
    // P08 Beynin korkunç sonucu: WHIP → Klinik yakın plan Matmazel gözleri
    { t: PS(8) + .14, dur: .32, move: 'whip', pos: [-.52, 1.30, 1.65], look: [-.52, 1.28, -.75], fov: 42, creep: .32 },
    // P09 WHIP PAN → SET 3: Paris akşam balkonu, ikisi de tam kadrajda!
    { t: PS(9) + .14, dur: .32, move: 'whip', pos: [300.0, 1.22, 3.45], look: [300.0, 1.18, -.8], fov: 50, creep: .20 },
    // P10 Son vuruş: yavaşça geri çekilir (~4.45 m, karakterler net kalır)
    { t: DUR, dur: Math.max(.5, DUR - PS(10) - .05), pos: [300.0, 1.32, 4.45], look: [300.0, 1.22, -4.0], fov: 52, creep: .15 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .56), 1.15); // sinir hattı kopuş darbesi!
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
  scene.background = new THREE.Color('#28344e');
  buildClinic(scene); buildMind(scene); buildSunset(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  // Toz zerreleri (klinik pencere huzmesinde) ve kıvılcım partikülleri (kopan beyin hattında!)
  fx.motes = new Smoke(scene, { color: '#ffe4b0', maxPoints: 500, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 150, size: .011, alpha: .55, speed: .04, on: t => where(t) === 'clinic',
    path: (u, t, i) => [-2.2 + (hash(i, 1) - .5) * 4.5, 1.5 + (hash(i, 2) - .5) * 2.5 + (u - .5) * .3, -1.0 + (hash(i, 3) - .5) * 3.0],
  });
  fx.motes.wisps.push({
    n: 140, size: .018, alpha: .85, speed: .65, on: t => where(t) === 'mind' && t >= P(6, .52),
    path: (u, t, i) => {
      const ang = hash(i, 4) * 6.28, rad = u * (1.2 + hash(i, 5) * 1.1);
      return [200 + Math.cos(ang) * rad, 1.68 + Math.sin(ang) * rad - u * u * .7, -1.35 + (hash(i, 6) - .5) * .6];
    },
  });
  fx.motes.wisps.push({
    n: 80, size: .01, alpha: .5, speed: .04, on: t => where(t) === 'sunset',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 5.0, 1.4 + (hash(i, 8) - .5) * 2.4 + (u - .5) * .3, (hash(i, 9) - .5) * 3.0],
  });

  dyn.cam = cameraPath();

  // Ses ipuçları (mix.py)
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(6) - .06, 'whoosh');
  cue(PS(8) - .06, 'whoosh');
  cue(PS(9) - .06, 'whoosh');
  cue(0.05, 'heartbeat', { dur: PE(1) });
  cue(P(1, .58) - .1, 'rise', { dur: .28 });
  cue(PS(2) - .1, 'rise', { dur: .3 });
  cue(P(3, .52), 'slide', { dur: .45 });
  cue(PS(4) + .1, 'laugh', { dur: .7 });
  cue(PS(5), 'rise', { dur: .55 });
  cue(P(6, .56), 'snap');
  cue(P(6, .56), 'boom');
  cue(PS(9), 'evening', { dur: DUR - PS(9) });
  cue(PE(10) - .2, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return (t < PS(6) || (t >= PS(8) && t < PS(9))) ? 'clinic' : t < PS(8) ? 'mind' : 'sunset'; }
function camSet(cam) { return cam.position.x > 250 ? 'sunset' : cam.position.x > 100 ? 'mind' : 'clinic'; }
const WARM = '#ffd08a', COOL = '#cfe0f6';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['clinic', 'mind', 'sunset']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const tint = here === 'clinic' ? [1, .99, .98] : here === 'mind' ? [.98, .99, 1.02] : [1.02, .98, .96];

  for (const b of fx.cBeams) b.visible = here === 'clinic';
  fx.cGlow.visible = here === 'clinic';
  fx.mGlowL.visible = here === 'mind';
  fx.mGlowR.visible = here === 'mind';

  const mz = cast.matmazel, ct = cast.cotard, as = cast.asistan;

  if (here === 'clinic') {
    // Tabak itme hareketi (P03 ortasında masada sağa kayar!)
    const push = ramp(t, P(3, .45), P(3, .90));
    dyn.plate.position.x = .12 + push * .42;
    dyn.plate.position.z = -.52 - push * .12;

    // Matmazel (sol-orta, donuk ve ifadesiz)
    const mirrorLook = t >= PS(5) && t < PS(6);
    const mzX = mirrorLook ? -.42 : -.52;
    const mzZ = mirrorLook ? -1.45 : -.75;
    mz.show(); mz.place(mzX, 0, mzZ, cam, tint);
    const pushing = t >= P(3, .38) && t <= PE(3) + .1;
    mz.draw({
      expr: t >= PS(8) ? 'worried' : 'neutral',
      look: mirrorLook ? .15 : pushing ? .75 : .1,
      lookY: t >= PS(8) ? -.1 : .05,
      lid: .28,
      mouth: talk(PS(3), PE(3)),
      blink: bl(1, PS(3), PS(5), PS(8)),
      armL: [18, 16],
      armR: pushing ? [95, 25] : [18, 16],
      lit: 1, shade: COOL, rim: { color: WARM, a: .38 },
    });
    mz.castFrom(dyn.cSun, true);

    // Dr. Cotard (P02'den itibaren odada, elinde defter ve kalemle not alır)
    if (t >= PS(2) - .15 && t < PS(8) - .1) {
      ct.show(); ct.place(.28, 0, -1.05, cam, tint);
      const writing = t >= PS(2) && t < PS(4);
      ct.draw({
        expr: t >= PS(5) ? 'focused' : 'neutral',
        look: t >= PS(4) && t < PS(5) ? .75 : -.6,
        blink: bl(2, PS(2), PS(4), PS(5)),
        propL: 'scroll', propR: 'pen',
        armL: [62, 42], armR: writing ? [68 + Math.sin(t * 14) * 6, 48] : [45, 30],
        lit: 1, shade: COOL, rim: { color: WARM, a: .35 },
      });
      ct.castFrom(dyn.cSun, true);
    }

    // Genç Asistan (sağda, P04'te gülerek itiraz eder!)
    if (t >= PS(2) - .15 && t < PS(8) - .1) {
      as.show(); as.place(1.22, 0, -.75, cam, tint);
      const laughing = t >= PS(4) && t <= PE(4) + .22;
      as.draw({
        expr: laughing ? 'laugh' : t >= PS(5) ? 'surprised' : 'smile',
        look: -.75,
        mouth: Math.max(talk(PS(4), PE(4)), laughing ? .65 : 0),
        laughMarks: laughing ? .9 : 0,
        blink: bl(3, PS(4), PS(5)),
        armL: laughing ? [115, 35] : [20, 18],
        armR: laughing ? [60, 40] : [20, 18],
        bob: laughing ? -Math.abs(Math.sin(t * 14)) * 10 : 0,
        lit: 1, shade: COOL, rim: { color: WARM, a: .35 },
      });
      as.castFrom(dyn.cSun, true);
    }
  } else if (here === 'mind') {
    // Küre halkaları yavaşça döner; P06 %56 anında sinir hattı ortadan kopup sarkar!
    dyn.recRing.rotation.y = t * .7;
    dyn.emoRing.rotation.y = -t * .55;
    const snapU = ramp(t, P(6, .54), P(6, .76));
    dyn.wireL.position.set(-.32 - snapU * .14, 1.65 - snapU * .32, -1.4);
    dyn.wireL.rotation.z = Math.PI / 2 + snapU * .72;
    dyn.wireR.position.set(.32 + snapU * .14, 1.65 - snapU * .32, -1.4);
    dyn.wireR.rotation.z = Math.PI / 2 - snapU * .72;
    // Duygu küresi kopuş sonrası soluklaşır
    fx.mGlowR.material.opacity = .45 * (1 - snapU * .65);

    // P07 gündelik benzetme: Dr. Cotard telefon ekranının yanında!
    const phoneOn = t >= PS(7) - .25;
    dyn.phone.visible = phoneOn;
    if (phoneOn) {
      dyn.phone.position.y = 1.02 + Math.sin(t * 2.6) * .04;
      ct.show(); ct.place(199.58, 0, .22, cam, tint);
      ct.draw({
        expr: 'focused', look: .65, blink: bl(4, PS(7)),
        armR: [88, 30], armL: [24, 20],
        lit: 1, shade: COOL, rim: { color: '#ffbe58', a: .4 },
      });
      ct.castFrom(dyn.mSun, true);
    }
  } else {
    // SET 3: Paris akşam balkonu — arkada sıcak batan güneş, önde Dr. Cotard + Matmazel
    mz.show(); mz.place(299.64, 0, -.25, cam, tint);
    mz.draw({
      expr: t > PS(10) ? 'neutral' : 'worried',
      look: .15, lookY: -.1, lid: .22,
      blink: bl(5, PS(9), PS(10)),
      armL: [18, 14], armR: [18, 14],
      lit: -1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .55 },
    });
    ct.show(); ct.place(300.38, 0, -.32, cam, tint);
    ct.draw({
      expr: 'focused', look: -.55,
      blink: bl(6, PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [58, 38], armR: [64, 42],
      lit: 1, shade: '#cfc4ec', rim: { color: '#ffb070', a: .55 },
    });
    mz.castFrom(dyn.hSun, true); ct.castFrom(dyn.hSun, true);
  }

  fx.motes.update(t);
  for (const b of fx.cBeams) b.material.uniforms.uT.value = t;

  // Lens & renk düzeltme (her sette yüksek kontrast ve sıcak-soğuk dengesi)
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'clinic') {
    const subj = t < P(1, .58) ? V(.2, 1.0, -.6) : t >= PS(4) && t < PS(5) ? V(1.22, 1.2, -.75) : V(-.45, 1.2, -.85);
    look = { ...focusOn(subj, 4.5, 4), sat: 1.18, lift: [.09, .095, .12], bloom: .75, vignette: .2 };
    C.scene.fog = null;
  } else if (here === 'mind') {
    const subj = t >= PS(7) - .2 ? V(200.1, 1.1, .25) : V(200, 1.68, -1.4);
    look = { ...focusOn(subj, 3.5, 5), sat: 1.25, lift: [.08, .09, .14], bloom: 1.05, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.15, -.25), 4, 5), sat: 1.2, lift: [.1, .09, .15], bloom: .95, vignette: .22 };
    C.scene.fog = null;
  }
  look.tint = here === 'clinic' ? [1.0, 1.0, 1.0] : here === 'mind' ? [.98, 1.0, 1.04] : [1.04, .98, .96];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
