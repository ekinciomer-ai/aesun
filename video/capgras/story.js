// En Garip Hastalıklar #09: Capgras Sendromu (1923 Paris — Madame M. & Dr. Joseph Capgras) — TAMAMEN ÖZGÜN 3B DÜNYA!
//   SET 1 (x = 0):   1923 PARİS ART-DECO AYNALI SALONU (zümrüt-altın duvar, kristal avize, dev altın ayna, çift kopya illüzyonu!)
//   SET 2 (x = 200): 1920'LER PİRİNÇ TELEFON SANTRALİ & KOPAN DUYGU KABLOSU + DEV 3B ÇEVİRMELİ TELEFON TESTİ!
//   SET 3 (x = 300): 1923 PARİS AKŞAM BULVARI & KÖŞE KAFESİ (CAFÉ · PARIS 1923, çizgili tente, bistro masası, ışıklı EYFEL KULESİ!)
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'capgras';
export const FPS = 30;
export let DUR = 41;
export const CUES = [];
export const LOOK = {
  madame: {
    headW: 256, headH: 244,
    longHair: '#2c2228', hairLen: 215,
    cloth: '#8e2d48', clothDark: '#5a1a2c',
    skirt: '#242e44', boots: '#201e24',
    collar: true, buttons: '#f4ecd8',
    bodyW: 190, height: 1.62,
  },
  es: {
    headW: 262, headH: 248,
    mustache: '#6e4e34',
    cloth: '#344c72', clothDark: '#20304c',
    pattern: 'hstripes', stripe: '#20304c',
    scarf: '#a6383e', scarfY: 6,
    collar: false, bodyW: 204, height: 1.70,
  },
  capgras: {
    headW: 270, headH: 250,
    beard: '#7c7e84', beardLen: .55,
    cloth: '#dcd8ce', clothDark: '#aba69a',
    trim: '#3c345c', buttons: '#241e3c',
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
function dab(g, w, h, base, n, r, amt, seed, a0 = .22) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .20;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

// 1923 Paris Art-Deco zümrüt yeşili & altın panelli salon duvarı (Set 1)
function artDecoWallTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#1e4a44'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#1e4a44', 220, 22, .16, 901, .22);
  // Altın Art-Deco dikdörtgen çerçeve çıtaları
  g.strokeStyle = '#c8a052'; g.lineWidth = 6;
  g.strokeRect(28, 36, 206, 290); g.strokeRect(278, 36, 206, 290);
  // Alt ahşap lambri
  g.fillStyle = '#3e261c'; g.fillRect(0, 384, 512, 128);
  g.fillStyle = '#c8a052'; g.fillRect(0, 378, 512, 8);
  return tx(c, [3, 1]);
}

// Dev altın çerçeveli 1923 Paris aynası (derin cam parıltılı + gizemli çift yansıma)
function parisMirrorTex() {
  const [c, g] = cnv(512, 640);
  const gr = g.createLinearGradient(0, 0, 512, 640);
  gr.addColorStop(0, '#5a788a'); gr.addColorStop(.35, '#8fb2c2'); gr.addColorStop(.52, '#d2e6ee');
  gr.addColorStop(.68, '#6a8a9c'); gr.addColorStop(1, '#344c5e');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  // çapraz cam yansıma şeritleri
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.moveTo(60, 0); g.lineTo(140, 0); g.lineTo(0, 240); g.lineTo(0, 140); g.fill();
  g.beginPath(); g.moveTo(310, 0); g.lineTo(355, 0); g.lineTo(0, 520); g.lineTo(0, 455); g.fill();
  // altın iç süs kenarı
  g.strokeStyle = '#e0b85c'; g.lineWidth = 14; g.strokeRect(14, 14, 484, 612);
  return tx(c);
}

// 1920'ler pirinç-maun telefon santrali duvar panosu (Set 2)
function switchboardTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#2d1c16'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#3c241b', 180, 24, .18, 920, .24);
  // pirinç santral jak soket ızgarası
  for (let y = 40; y < 480; y += 56) {
    for (let x = 40; x < 480; x += 56) {
      g.fillStyle = '#a88442'; g.beginPath(); g.arc(x, y, 10, 0, 6.29); g.fill();
      g.fillStyle = '#140c0a'; g.beginPath(); g.arc(x, y, 5, 0, 6.29); g.fill();
    }
  }
  return tx(c, [4, 2]);
}

// 1923 Paris Kafe Tabelası: CAFÉ · PARIS 1923
function cafeSignTex() {
  const [c, g] = cnv(640, 170);
  g.fillStyle = '#5c1824'; g.fillRect(0, 0, 640, 170);
  g.strokeStyle = '#f0ca72'; g.lineWidth = 10; g.strokeRect(12, 12, 616, 146);
  g.fillStyle = '#fff0cc'; g.font = '900 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('CAFÉ · PARIS 1923', 320, 72);
  g.fillStyle = '#f0ca72'; g.font = '700 26px system-ui, sans-serif';
  g.fillText('DR. JOSEPH CAPGRAS', 320, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Kırmızı-krem çizgili Paris kafe tentesi
function awningTex() {
  const [c, g] = cnv(512, 256);
  for (let x = 0; x < 512; x += 64) {
    g.fillStyle = (x / 64) % 2 ? '#f4ead2' : '#9c2232';
    g.fillRect(x, 0, 64, 256);
  }
  return tx(c, [2, 1]);
}

// Işıklı EYFEL KULESİ & 1923 PARİS AKŞAM BULVARI panoraması (Set 3)
function pano(w, h, azDeg, el0, el1) {
  const [c, g] = cnv(w, h);
  return { c, g, w, h, X: r => w * (.5 + r / azDeg), Y: e => h * (1 - (e - el0) / (el1 - el0)), s: w / azDeg };
}
function parisEiffelTex() {
  const Pn = pano(4096, 1800, 110, -10, 36), { g } = Pn;
  const sky = g.createLinearGradient(0, 0, 0, Pn.Y(0));
  sky.addColorStop(0, D('#101838')); sky.addColorStop(.52, D('#2a3062')); sky.addColorStop(.84, D('#6c466e')); sky.addColorStop(1, D('#cc7a5c'));
  g.fillStyle = sky; g.fillRect(0, 0, Pn.w, Pn.Y(0));
  const R = rng(930);
  // Yıldızlar
  g.fillStyle = 'rgba(255,244,210,0.85)';
  for (let i = 0; i < 120; i++) g.fillRect(R() * Pn.w, R() * Pn.Y(14), 4, 4);
  // PARLAYAN EYFEL KULESİ (tam merkezde, görkemli ve hemen tanınır!)
  const ex = Pn.X(0), ey = Pn.Y(0);
  const eGr = g.createRadialGradient(ex, ey - 280, 10, ex, ey - 280, 420);
  eGr.addColorStop(0, 'rgba(255,220,130,0.65)'); eGr.addColorStop(1, 'rgba(255,180,90,0)');
  g.fillStyle = eGr; g.beginPath(); g.arc(ex, ey - 280, 420, 0, 6.29); g.fill();
  g.fillStyle = '#222038';
  g.beginPath();
  g.moveTo(ex - 150, ey); g.quadraticCurveTo(ex - 45, ey - 260, ex - 18, ey - 580);
  g.lineTo(ex + 18, ey - 580); g.quadraticCurveTo(ex + 45, ey - 260, ex + 150, ey);
  g.lineTo(ex + 95, ey); g.quadraticCurveTo(ex, ey - 135, ex - 95, ey); g.closePath(); g.fill();
  // Eyfel'in altın ışıklı kat platformları & tepedeki fener
  g.fillStyle = '#ffd978';
  g.fillRect(ex - 102, ey - 150, 204, 14);
  g.fillRect(ex - 58, ey - 310, 116, 12);
  g.fillRect(ex - 22, ey - 580, 44, 10);
  g.beginPath(); g.arc(ex, ey - 595, 16, 0, 6.29); g.fill();
  // Haussmann Paris binaları silüeti + sıcak ışıklı pencereler
  g.fillStyle = D('#1d1e36'); g.fillRect(0, ey, Pn.w, Pn.h - ey);
  g.beginPath(); g.moveTo(0, ey);
  for (let x = 0; x <= Pn.w; x += 90) {
    const dist = Math.abs(x - ex);
    const bh = dist < 240 ? 40 : (95 + R() * 85);
    g.lineTo(x, ey - bh); g.lineTo(x + 82, ey - bh);
  }
  g.lineTo(Pn.w, ey); g.closePath(); g.fill();
  g.fillStyle = '#ffd67a';
  for (let i = 0; i < 140; i++) {
    const wx = R() * Pn.w;
    if (Math.abs(wx - ex) > 220) g.fillRect(wx, ey - 22 - R() * 88, 8, 12);
  }
  const t = new THREE.CanvasTexture(Pn.c); t.colorSpace = THREE.SRGBColorSpace; return t;
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
function sun(color, intensity, dir, target, { size = 2048, ext = 10, far = 65 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.copy(V(...target).addScaledVector(V(...dir).normalize(), -25));
  l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(size, size);
  Object.assign(l.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far });
  l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3; return l;
}

// ---------------------------------------------------------------- SET 1: 1923 PARİS ART-DECO AYNALI SALON (x = 0)
function buildParisSalon(scene) {
  const g = new THREE.Group(); scene.add(g);

  // Sıcak meşe parke + bordo-altın salon halısı
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), painted(woodTex({ base: '#8c603c', plank: 36, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.6), flat('#6e2432'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, .008, -.4); g.add(rug);

  // Zümrüt yeşili Art-Deco duvarlar
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.6), painted(artDecoWallTex()));
  backW.position.set(0, 2.8, -3.2); g.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.6), painted(artDecoWallTex()));
  leftW.rotation.y = Math.PI / 2; leftW.position.set(-4.8, 2.8, 1.5); g.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.6), painted(artDecoWallTex()));
  rightW.rotation.y = -Math.PI / 2; rightW.position.set(4.8, 2.8, 1.5); g.add(rightW);

  // Arka duvarın TAM ORTASINDA DEV ALTIN ÇERÇEVELİ PARİS AYNASI!
  const mirFrm = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.55, .14), flat('#c89c46'));
  mirFrm.position.set(0, 2.15, -3.12); g.add(mirFrm);
  const mirGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 2.28), new THREE.MeshBasicMaterial({ map: parisMirrorTex() }));
  mirGlass.position.set(0, 2.15, -3.04); mirGlass.userData.noShadow = true; g.add(mirGlass);

  // Tepeden sarkan 1923 ALTIN KRİSTAL AVİZE (P01 vinç açılışının başlangıç noktası!)
  const chan = new THREE.Group(); chan.position.set(0, 3.45, -.65); g.add(chan);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.1, 8), flat('#d4aa4e')); rod.position.y = .55; chan.add(rod);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.52, .04, 10, 24), flat('#e0b858')); ring.rotation.x = Math.PI / 2; chan.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffeca8' }));
    bulb.position.set(Math.cos(a) * .52, .10, Math.sin(a) * .52); bulb.userData.noShadow = true; chan.add(bulb);
  }
  fx.chanGlow = glow(scene, [0, 3.45, -.65], { size: 2.8, color: '#ffda88', strength: .52 });

  // Yuvarlak beyaz örtülü Paris yemek masası + 2 porselen fincan + altın çaydanlık
  const tbl = new THREE.Group(); tbl.position.set(0, 0, .05); g.add(tbl);
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(.56, .64, .74, 24), flat('#f4eee0'));
  cloth.position.y = .37; tbl.add(cloth);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .05, 24), flat('#fff8ec'));
  top.position.y = .76; tbl.add(top);
  for (const cx of [-.22, .22]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.055, .042, .09, 12), flat('#ffffff'));
    cup.position.set(cx, .83, .04); tbl.add(cup);
  }
  const pot = new THREE.Mesh(new THREE.SphereGeometry(.095, 14, 10), flat('#d8ac48'));
  pot.position.set(0, .87, -.04); tbl.add(pot);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#ffe8c4', '#2c4644', 1.85));
  const SUN = [-.3, -.62, -.72]; dyn.sSun = V(...SUN).normalize();
  const key = sun('#ffe4aa', 2.65, SUN, [0, 1.2, -.5], { ext: 9 }); L.add(key); L.add(key.target);
  dyn.salonPt = new THREE.PointLight('#ffd280', 3.2, 9); dyn.salonPt.position.set(0, 3.0, -.5); L.add(dyn.salonPt);
  scene.add(L); sets.salon = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: 1920'LER PİRİNÇ SANTRAL + KOPAN KABLO + DEV TELEFON (x = 200)
function buildSwitchboard(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), painted(woodTex({ base: '#4a3022', plank: 38, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(22, 10), painted(switchboardTex()));
  backW.position.set(0, 4.5, -3.5); g.add(backW);

  // SOL KANAT (x ≈ 0): YÜZ TANIMA MERKEZİ (sol) <== KOPAN KABLO ==> DUYGU KALBİ (sağ)!
  dyn.wireGrp = new THREE.Group(); dyn.wireGrp.position.set(0, 1.65, -1.0); g.add(dyn.wireGrp);

  // Sol küre: YÜZ TANIMA (yeşil-mavi parlayan mercek)
  const faceHub = new THREE.Mesh(new THREE.SphereGeometry(.38, 22, 16), new THREE.MeshBasicMaterial({ color: '#42d4a8' }));
  faceHub.position.set(-.68, 0, 0); faceHub.userData.noShadow = true; dyn.wireGrp.add(faceHub);
  const faceRing = new THREE.Mesh(new THREE.TorusGeometry(.44, .05, 12, 24), flat('#d8b054'));
  faceRing.position.set(-.68, 0, .05); dyn.wireGrp.add(faceRing);

  // Sağ küre: DUYGU · AMİGDALA (3B Kalp formu: iki üst küre + alt koni!)
  dyn.heartMat = new THREE.MeshBasicMaterial({ color: '#ff4454' });
  dyn.heartGrp = new THREE.Group(); dyn.heartGrp.position.set(.68, 0, 0); dyn.wireGrp.add(dyn.heartGrp);
  const hL = new THREE.Mesh(new THREE.SphereGeometry(.23, 18, 14), dyn.heartMat); hL.position.set(-.15, .10, 0); hL.userData.noShadow = true;
  const hR = new THREE.Mesh(new THREE.SphereGeometry(.23, 18, 14), dyn.heartMat); hR.position.set(.15, .10, 0); hR.userData.noShadow = true;
  const hB = new THREE.Mesh(new THREE.ConeGeometry(.34, .46, 16), dyn.heartMat); hB.rotation.x = Math.PI; hB.position.set(0, -.16, 0); hB.userData.noShadow = true;
  dyn.heartGrp.add(hL, hR, hB);

  // Ortadaki kopan pirinç-altın bağlantı kablosu (sol yarı + sağ yarı!)
  dyn.wireL = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .56, 12), new THREE.MeshBasicMaterial({ color: '#ffd45c' }));
  dyn.wireL.rotation.z = Math.PI / 2; dyn.wireL.position.set(-.28, 0, 0); dyn.wireL.userData.noShadow = true; dyn.wireGrp.add(dyn.wireL);
  dyn.wireR = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .56, 12), new THREE.MeshBasicMaterial({ color: '#ffd45c' }));
  dyn.wireR.rotation.z = Math.PI / 2; dyn.wireR.position.set(.28, 0, 0); dyn.wireR.userData.noShadow = true; dyn.wireGrp.add(dyn.wireR);

  // Üst & alt durum tabelaları (alphaTest ile tertemiz!)
  dyn.wireLbl1 = new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, .52),
    new THREE.MeshBasicMaterial({ map: badgeTex('YÜZ: EŞLEŞTİ ✓', 'DUYGU KABLOSU KOPUK!', '#1c1420', '#58f0bc', '#ff544c'), transparent: true, alphaTest: .35 })
  );
  dyn.wireLbl1.position.set(0, 1.02, .05); dyn.wireLbl1.userData.noShadow = true; dyn.wireGrp.add(dyn.wireLbl1);
  fx.wireSpark = glow(scene, [200, 1.65, -.85], { size: 2.2, color: '#ffca4c', strength: .55 });

  // SAĞ KANAT (x = +4.2): P08 ÜNLÜ TELEFON TESTİ — DEV 3B ÇEVİRMELİ TELEFON + PARLAYAN DUYGU KALBİ!
  dyn.phoneGrp = new THREE.Group(); dyn.phoneGrp.position.set(4.2, 0, -.6); g.add(dyn.phoneGrp);
  // Maun telefon sehpası
  const pTbl = new THREE.Mesh(new THREE.BoxGeometry(1.4, .82, .85), painted(woodTex({ base: '#5a3622', plank: 24 })));
  pTbl.position.y = .41; dyn.phoneGrp.add(pTbl);
  // 1920'ler siyah-altın çevirmeli telefon gövdesi (solda)
  const pBody = new THREE.Mesh(new THREE.CylinderGeometry(.24, .34, .34, 18), flat('#1e1c24'));
  pBody.position.set(-.34, .99, .05); dyn.phoneGrp.add(pBody);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .04, 18), new THREE.MeshBasicMaterial({ color: '#f2dfb2' }));
  dial.rotation.x = .85; dial.position.set(-.34, .98, .28); dyn.phoneGrp.add(dial);
  // Titreşip çalan telefon ahizesi!
  dyn.handset = new THREE.Group(); dyn.handset.position.set(-.34, 1.24, .05); dyn.phoneGrp.add(dyn.handset);
  const hsBar = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .64, 12), flat('#18161e')); hsBar.rotation.z = Math.PI / 2; dyn.handset.add(hsBar);
  for (const sx of [-.28, .28]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), flat('#d8b050')); cap.position.set(sx, -.04, 0); dyn.handset.add(cap);
  }
  // Sağda telefon sesiyle KIPKIRMIZI parlayan 3B DUYGU KALBİ!
  dyn.pHeart = new THREE.Group(); dyn.pHeart.position.set(.44, 1.52, .05); dyn.phoneGrp.add(dyn.pHeart);
  const phMat = new THREE.MeshBasicMaterial({ color: '#ff3b52' });
  const ph1 = new THREE.Mesh(new THREE.SphereGeometry(.22, 18, 14), phMat); ph1.position.set(-.14, .10, 0); ph1.userData.noShadow = true;
  const ph2 = new THREE.Mesh(new THREE.SphereGeometry(.22, 18, 14), phMat); ph2.position.set(.14, .10, 0); ph2.userData.noShadow = true;
  const ph3 = new THREE.Mesh(new THREE.ConeGeometry(.32, .44, 16), phMat); ph3.rotation.x = Math.PI; ph3.position.set(0, -.15, 0); ph3.userData.noShadow = true;
  dyn.pHeart.add(ph1, ph2, ph3);
  // Telefon ahizesinden kalbe akan 4 parlak altın ses halkası!
  dyn.callRings = Array.from({ length: 4 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(.09 + i * .03, .022, 10, 20), new THREE.MeshBasicMaterial({ color: '#ffd45c' }));
    m.rotation.y = Math.PI / 2; m.position.set(-.08 + i * .13, 1.38 + i * .04, .05); m.userData.noShadow = true;
    dyn.phoneGrp.add(m); return m;
  });
  const phoneLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.48, .50),
    new THREE.MeshBasicMaterial({ map: badgeTex('TELEFON TESTİ!', 'SES HATTI SAĞLAM ✓', '#1e1624', '#ffd866', '#ff4c5c'), transparent: true, alphaTest: .35 })
  );
  phoneLbl.position.set(.05, 2.38, .05); phoneLbl.userData.noShadow = true; dyn.phoneGrp.add(phoneLbl);
  fx.phoneGlow = glow(scene, [204.64, 1.52, -.45], { size: 2.3, color: '#ff485c', strength: .56 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#d4b496', '#2e1e1c', 1.8));
  const p1 = new THREE.PointLight('#ffd284', 3.4, 12); p1.position.set(200, 2.8, 2.2); L.add(p1);
  const p2 = new THREE.PointLight('#ff9a7a', 3.2, 12); p2.position.set(204.2, 2.6, 2.2); L.add(p2);
  scene.add(L); sets.board = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: 1923 PARİS AKŞAM BULVARI & KÖŞE KAFESİ (x = 300)
function buildParisCafe(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);

  // Paris akşam kaldırımı
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), flat('#444052'));
  floor.rotation.x = -Math.PI / 2; g.add(floor);

  // Sol arkada CAFÉ · PARIS 1923 köşe cephesi + kırmızı-krem çizgili tente!
  const cafe = new THREE.Group(); cafe.position.set(-2.3, 0, -2.5); cafe.rotation.y = .25; g.add(cafe);
  const cWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 1.8), flat('#c8b698')); cWall.position.y = 2.2; cafe.add(cWall);
  const cWin = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.65), new THREE.MeshBasicMaterial({ color: '#ffdf92' }));
  cWin.position.set(0, 1.45, .92); cWin.userData.noShadow = true; cafe.add(cWin);
  const cAwn = new THREE.Mesh(new THREE.BoxGeometry(3.1, .14, 1.25), painted(awningTex()));
  cAwn.rotation.x = .34; cAwn.position.set(0, 2.55, 1.42); cafe.add(cAwn);
  const cSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .66), new THREE.MeshBasicMaterial({ map: cafeSignTex() }));
  cSign.position.set(0, 3.25, .94); cSign.userData.noShadow = true; cafe.add(cSign);

  // Sağda klasik dökme demir Paris sokak feneri (altın ışıklı!)
  const lamp = new THREE.Group(); lamp.position.set(1.75, 0, -1.55); g.add(lamp);
  const lPole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .07, 3.2, 10), flat('#222830')); lPole.position.y = 1.6; lamp.add(lPole);
  const lBulb = new THREE.Mesh(new THREE.SphereGeometry(.18, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffe494' }));
  lBulb.position.y = 3.28; lBulb.userData.noShadow = true; lamp.add(lBulb);
  fx.parisLampGlow = glow(scene, [301.75, 3.28, -1.55], { size: 2.2, color: '#ffd470', strength: .52 });

  // Ortada küçük yuvarlak bistro masası + sıcak kahve fincanı
  const bistro = new THREE.Group(); bistro.position.set(0, 0, .35); g.add(bistro);
  const bLeg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .06, .74, 10), flat('#24222a')); bLeg.position.y = .37; bistro.add(bLeg);
  const bTop = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .05, 20), flat('#f4e8d2')); bTop.position.y = .76; bistro.add(bTop);

  // Kapanışta karakterlerin üstünde parlayan sıcak 3B KALP!
  dyn.eveHeart = new THREE.Group(); dyn.eveHeart.position.set(0, 2.22, -.4); g.add(dyn.eveHeart);
  const ehMat = new THREE.MeshBasicMaterial({ color: '#ff5268' });
  const eh1 = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), ehMat); eh1.position.set(-.09, .06, 0); eh1.userData.noShadow = true;
  const eh2 = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), ehMat); eh2.position.set(.09, .06, 0); eh2.userData.noShadow = true;
  const eh3 = new THREE.Mesh(new THREE.ConeGeometry(.22, .30, 14), ehMat); eh3.rotation.x = Math.PI; eh3.position.set(0, -.10, 0); eh3.userData.noShadow = true;
  dyn.eveHeart.add(eh1, eh2, eh3);
  fx.eveHeartGlow = glow(scene, [300, 2.22, -.35], { size: 1.6, color: '#ff6078', strength: .48 });

  // Işıklı EYFEL KULESİ & 1923 Paris akşam bulvarı panoraması
  const sky = new THREE.Mesh(
    new THREE.CylinderGeometry(65, 65, 76, 48, 1, true),
    vistaMat(parisEiffelTex(), { yaw: Math.PI, az: 110 * Math.PI / 180, el: [-10 * Math.PI / 180, 36 * Math.PI / 180], gain: 1.22 })
  );
  sky.material.side = THREE.BackSide; g.add(sky);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#948ee0', '#4a3648', 1.85));
  const SUN = [-.2, -.36, .9]; dyn.pSun = V(...SUN).normalize();
  const key = sun('#ffc47c', 2.75, SUN, [300, 1.2, 0], { ext: 10 }); L.add(key); L.add(key.target);
  const fill = new THREE.DirectionalLight('#c4beff', 1.35); fill.position.set(302.5, 3.2, 6.8); fill.target.position.set(300, 1.2, -.3);
  L.add(fill); L.add(fill.target);
  scene.add(L); sets.cafe = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA KOREOGRAFİSİ
function cameraPath() {
  const k = [
    // P01 AVİZEDEN İNEN VİNÇ: Kristal avizeden yemek masasına inip eş + hayalet KOPYA'yı gösterir!
    { t: 0, pos: [0, 3.35, 3.65], look: [0, 1.55, -.65], fov: 50, creep: .12, drift: .03 },
    { t: P(1, .45), dur: .75, pos: [.45, 1.48, 2.35], look: [.45, 1.35, -.75], fov: 46, creep: .20 },
    { t: P(1, .84), dur: .34, pos: [.35, 1.40, 1.85], look: [.40, 1.34, -.75], fov: 45, creep: .20 },
    // P02 MASADA DONUP KALMA: Madame M. ve Eşi yemek masası etrafında tam ikili plan!
    { t: PS(2) + .16, dur: .36, move: 'whip', pos: [0, 1.40, 3.85], look: [0, 1.34, -.75], fov: 50, creep: .18 },
    // P03 ÇAPRAZ AÇI: Kocası kahkahayla güler!
    { t: PS(3) + .14, dur: .32, move: 'whip', pos: [1.15, 1.38, 1.95], look: [.48, 1.32, -.75], fov: 46, creep: .24 },
    // P04 DİYAGONAL GERİLİM: Avize soğur, Madame M. endişeyle uzaklaşır (arkada dev altın ayna!)
    { t: PS(4) + .16, dur: .36, move: 'whip', pos: [-1.15, 1.46, 2.65], look: [-.15, 1.36, -1.2], fov: 50, creep: .20 },
    // P05 WHIP PAN → SET 3 (PARİS KAFESİ): Dr. Capgras bistro masasında Madame M.'yi inceler!
    { t: PS(5) + .14, dur: .34, move: 'whip', pos: [300.0, 1.42, 3.75], look: [300.0, 1.35, -.6], fov: 50, creep: .18 },
    // P06 WHIP PAN → SET 2 (SANTRAL ODASI): YÜZ TANIMA <== KOPAN KABLO ==> DUYGU KALBİ!
    { t: PS(6) + .14, dur: .34, move: 'whip', pos: [200.0, 1.72, 3.25], look: [200.0, 1.72, -1.0], fov: 50, creep: .22 },
    // P07 YAKIN TAKİP: Duygu kalbi kararır, Madame M. şaşkın bakar!
    { t: PS(7) + .14, dur: .34, move: 'whip', pos: [200.0, 1.50, 3.95], look: [200.0, 1.56, -.9], fov: 50, creep: .18 },
    // P08 YANA KAYAN TAKİP → DEV 3B ÇEVİRMELİ TELEFON TESTİ! (ahize çalar, kalp KIPKIRMIZI yanar!)
    { t: PS(8) + .14, dur: .38, move: 'whip', pos: [204.22, 1.54, 2.95], look: [204.22, 1.52, -.6], fov: 50, creep: .18 },
    // P09 WHIP PAN → SET 3 (PARİS AKŞAM BULVARI & EYFEL): Dr. Capgras & gülümseyen Madame M.!
    { t: PS(9) + .14, dur: .34, move: 'whip', pos: [300.0, 1.44, 3.65], look: [300.0, 1.42, -.8], fov: 50, creep: .16 },
    // P10 VİNÇ ÇIKIŞI: Işıklı Eyfel Kulesi ve sıcak parlayan 3B kalp ile yükselerek kapanış!
    { t: DUR, dur: Math.max(.8, DUR - PS(10) - .05), pos: [300.0, 2.02, 4.75], look: [300.0, 1.58, -1.6], fov: 52, creep: .12 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(6, .42), 1.15); // duygu kablosunun kopma anı!
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
  scene.background = new THREE.Color('#1a223a');
  buildParisSalon(scene); buildSwitchboard(scene); buildParisCafe(scene);
  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);
  // P01 Çift Kopya İllüzyonu için ikinci hayalet kopya karakteri!
  cast.esGhost = new Toon(LOOK.es, scene);

  fx.motes = new Smoke(scene, { color: '#ffe8b8', maxPoints: 450, H: ctx.H, additive: true, near: 2.0 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.motes.wisps.push({
    n: 95, size: .012, alpha: .45, speed: .08, on: t => where(t) === 'salon',
    path: (u, t, i) => [(hash(i, 1) - .5) * 4.5, 3.2 - u * 2.8, -.8 + (hash(i, 2) - .5) * 2.5],
  });
  fx.motes.wisps.push({
    n: 120, size: .015, alpha: .65, speed: .35, on: t => where(t) === 'board',
    path: (u, t, i) => [200 + (hash(i, 4) - .5) * 8.0, 1.5 + (hash(i, 5) - .5) * 2.6, -1.0 + (hash(i, 6) - .5) * 2.0],
  });
  fx.motes.wisps.push({
    n: 110, size: .012, alpha: .55, speed: .06, on: t => where(t) === 'cafe',
    path: (u, t, i) => [300 + (hash(i, 7) - .5) * 5.2, 3.0 - u * 2.5, -1.2 + (hash(i, 9) - .5) * 3.0],
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(PS(5) - .06, 'whoosh');
  cue(PS(6) - .06, 'whoosh');
  cue(PS(8) - .06, 'whoosh');
  cue(PS(9) - .06, 'whoosh');
  cue(P(1, .42), 'ghost');
  cue(P(6, .42), 'snap');
  cue(P(6, .42), 'boom');
  cue(PS(8) + .10, 'ring', { dur: PE(8) - PS(8) });
  cue(PS(9), 'paris_eve', { dur: DUR - PS(9) });
  cue(PE(10) - .35, 'warm');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) { return t < PS(5) ? 'salon' : (t >= PS(6) && t < PS(9)) ? 'board' : 'cafe'; }
function camSet(cam) { return cam.position.x > 250 ? 'cafe' : cam.position.x > 100 ? 'board' : 'salon'; }
const WARM = '#ffd890', COOL = '#c8e0f6';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['salon', 'board', 'cafe']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();
  const env = ctx.env, talk = (a, b) => t >= a && t <= b ? flap(env, t) : 0;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);

  fx.chanGlow.visible = here === 'salon';
  fx.wireSpark.visible = here === 'board' && t < PS(8) - .1;
  fx.phoneGlow.visible = here === 'board' && t >= PS(8) - .15;
  fx.parisLampGlow.visible = here === 'cafe';
  fx.eveHeartGlow.visible = here === 'cafe' && t >= PS(9);

  const mad = cast.madame, es = cast.es, gh = cast.esGhost, cap = cast.capgras;

  if (here === 'salon') {
    const cold = t >= PS(4);
    dyn.salonPt.color.set(cold ? '#88c6c8' : '#ffd280');
    dyn.salonPt.intensity = cold ? 2.0 : 3.2;

    // Eşi (sağda; P03'te güler!)
    const laughing = t >= PS(3) && t <= PE(3) + .18;
    es.show(); es.place(.48, 0, -.75, cam, [1, 1, 1]);
    es.draw({
      expr: laughing ? 'laugh' : 'smile',
      look: -.55,
      mouth: Math.max(talk(PS(3), PE(3)), laughing ? .65 : 0),
      laughMarks: laughing ? .9 : 0,
      blink: bl(1, PS(3)),
      armL: laughing ? [110, 34] : [22, 18],
      armR: laughing ? [64, 38] : [22, 18],
      bob: laughing ? -Math.abs(Math.sin(t * 14)) * 9 : 0,
      lit: 1, shade: COOL, rim: { color: WARM, a: .40 },
    });
    es.castFrom(dyn.sSun, true);

    // P01 ÇİFT KOPYA İLLÜZYONU: Eşin yanından soğuk mavi hayalet kopya ayrılır!
    if (t >= P(1, .36) && t < PS(2) - .05) {
      const split = Math.sin(ramp(t, P(1, .36), PE(1)) * Math.PI) * .42 + .18;
      gh.show(); gh.place(.48 - split, 0, -.92, cam, [.62, .86, 1.18]);
      gh.draw({
        expr: 'smug', look: -.1, blink: 0,
        armL: [18, 16], armR: [18, 16],
        lit: -1, shade: '#6498d8', rim: { color: '#78d4ff', a: .55 },
      });
    }

    // Madame M. (solda; P02-P04 arası şaşkın/endişeli geri adım atar!)
    if (t >= PS(2) - .15) {
      const stepBack = cold ? ramp(t, PS(4), PE(4)) * .32 : 0;
      mad.show(); mad.place(-.48 - stepBack, 0, -.75 - stepBack * .5, cam, [1, 1, 1]);
      mad.draw({
        expr: cold ? 'worried' : 'surprised',
        look: .58,
        sweat: cold || t < PS(3) ? 1 : 0,
        blink: bl(2, PS(2), PS(4)),
        armL: [24, 18], armR: [24, 18],
        lit: 1, shade: COOL, rim: { color: cold ? '#80d8d8' : WARM, a: .38 },
      });
      mad.castFrom(dyn.sSun, true);
    }
  } else if (here === 'board') {
    const snapU = ramp(t, P(6, .40), P(6, .75));
    // Kablo ikiye kopup aşağı sarkar!
    dyn.wireL.rotation.z = Math.PI / 2 - snapU * .65;
    dyn.wireL.position.set(-.28 - snapU * .08, -snapU * .22, 0);
    dyn.wireR.rotation.z = Math.PI / 2 + snapU * .65;
    dyn.wireR.position.set(.28 + snapU * .08, -snapU * .22, 0);
    // Kablo kopunca Duygu kalbi sıcak kırmızıdan soğuk gri-maviye söner!
    const hOn = new THREE.Color('#ff3b52'), hOff = new THREE.Color('#4a5468');
    dyn.heartMat.color.copy(hOn).lerp(hOff, snapU);
    dyn.heartGrp.scale.setScalar(1.0 + (1 - snapU) * .08 * Math.sin(t * 9));
    fx.wireSpark.scale.setScalar(snapU > .05 && snapU < .85 ? (1.3 + .4 * Math.sin(t * 28)) : .45);

    // P07'de Madame M. kopuk kabloların önünde şaşkın durur!
    if (t >= PS(7) - .12 && t < PS(8) - .1) {
      mad.show(); mad.place(200.0, 0, .55, cam, [1, 1, 1]);
      mad.draw({
        expr: 'worried', look: 0, sweat: 1, blink: bl(3, PS(7)),
        armL: [32, 20], armR: [32, 20], lit: 1, shade: COOL, rim: { color: '#ff7068', a: .44 },
      });
    }

    // P08 TELEFON TESTİ: Ahize titreşip çalar, altın halkalar akıp kalbi KIPKIRMIZI yakar!
    if (t >= PS(8) - .15) {
      const ringVib = Math.sin(t * 48) * .08;
      dyn.handset.rotation.z = ringVib;
      dyn.handset.position.y = 1.26 + Math.abs(Math.sin(t * 24)) * .05;
      dyn.callRings.forEach((r, i) => {
        const ph = (t * 2.2 + i * .25) % 1;
        r.position.x = -.14 + ph * .46;
        r.scale.setScalar(.7 + ph * .65);
      });
      dyn.pHeart.scale.setScalar(1.05 + .14 * Math.sin(t * 10));
      fx.phoneGlow.scale.setScalar(1.0 + .25 * Math.sin(t * 10));
    }
  } else {
    // SET 3: 1923 PARİS AKŞAM BULVARI & KÖŞE KAFESİ (CAFÉ · PARIS 1923 + EYFEL KULESİ!)
    const finale = t >= PS(9) - .1;
    dyn.eveHeart.visible = finale;
    if (finale) {
      dyn.eveHeart.scale.setScalar(.95 + .12 * Math.sin(t * 7));
      dyn.eveHeart.position.y = 2.22 + Math.sin(t * 2.4) * .06;
    }

    mad.show(); mad.place(299.52, 0, -.58, cam, [1.02, .99, .97]);
    mad.draw({
      expr: finale ? 'smile' : 'worried',
      look: .45,
      blink: bl(4, PS(5), PS(9), PS(10)),
      armL: [18, 16], armR: [18, 16],
      lit: 1, shade: '#c8c0e4', rim: { color: '#ffc880', a: .50 },
    });
    cap.show(); cap.place(300.48, 0, -.62, cam, [1.02, .99, .97]);
    cap.draw({
      expr: finale ? 'proud' : 'focused',
      look: -.48,
      blink: bl(5, PS(5), PS(9)),
      propL: 'scroll', propR: 'pen',
      armL: [56, 36], armR: [62, 40],
      lit: 1, shade: '#c8c0e4', rim: { color: '#ffc880', a: .50 },
    });
    mad.castFrom(dyn.pSun, true); cap.castFrom(dyn.pSun, true);
  }

  fx.motes.update(t);

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'salon') {
    look = { ...focusOn(V(0, 1.35, -.8), 3.8, 5.2), sat: 1.20, lift: [.09, .10, .10], bloom: .82, vignette: .20 };
    C.scene.fog = null;
  } else if (here === 'board') {
    const subj = t >= PS(8) - .15 ? V(204.2, 1.5, -.6) : V(200, 1.6, -.9);
    look = { ...focusOn(subj, 3.5, 5.2), sat: 1.25, lift: [.09, .08, .10], bloom: .95, vignette: .22 };
    C.scene.fog = null;
  } else {
    look = { ...focusOn(V(300, 1.4, -.6), 3.8, 5.5), sat: 1.22, lift: [.10, .09, .13], bloom: .90, vignette: .20 };
    C.scene.fog = null;
  }
  look.tint = here === 'salon' ? [1.01, 1.02, .98] : here === 'board' ? [1.03, .99, .96] : [1.03, .99, .98];
  look.blur = st.moving > .15 ? 15 : 0;
  return look;
}
