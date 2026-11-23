// Efrâsiyâb'ın Hikâyeleri: Ölüm'le Okey Masasına Oturan Kabadayı — yumurta kafa stili.
// Zamanlama KELİMEYE DEĞİL PARÇAYA bağlı: P(k, f) = k. seslendirme parçasının f oranındaki an.
// Setler (x ekseninde ayrı; sert kesme yok, süzülme + whip pan):
//   kahve (x=0)   1970'ler dumanlı kahvehane, yeşil çuhalı okey masası, sıcak sarkıt lamba + soğuk gece penceresi
//   kapi  (x=200) yağmurlu akşam kahvehane girişi (soğuk gece mavisi + camdan sızan sıcak kehribar)
//   masa  (x=300) yakın masa: takım elbise hayali, taş vuruşu, soğuk fısıltı, savrulan taşlar
import * as THREE from 'three';
import { painted, flat, rng, woodTex, D } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, beam, glow } from '/engine/src/fx.js';
import { vistaMat } from '/engine/src/vista.js';

export const NAME = 'efrasiyab-okey';
export const FPS = 30;
export let DUR = 40;
export const CUES = [];
export const LOOK = {
  abdurrahman: {
    headW: 274, headH: 252,
    hat: 'kulah', hatColor: '#34303c',
    mustache: '#1e1620',
    cloth: '#2b3344', clothDark: '#1b202c',
    trim: '#b0323a', buttons: '#d8ab4c', pocket: true, collar: true,
    bodyW: 224, height: 1.78
  },
  azrail: {
    headW: 256, headH: 248, shade: '#c2bede',
    body: 'robe', cloth: '#202634', clothDark: '#10141e',
    trim: '#5b6a84', collar: false,
    hat: 'kulah', hatColor: '#161a24',
    bodyW: 204, height: 1.96
  },
  kankardes: {
    headW: 264, headH: 246,
    mustache: '#4a3428',
    cloth: '#9c683b', clothDark: '#684224',
    pattern: 'stripes', buttons: '#3a2418', pocket: true, collar: true,
    scarf: '#3d5875', scarfY: 6,
    bodyW: 196, height: 1.66
  },
  kahveci: {
    headW: 258, headH: 244,
    mustache: '#3a2c26',
    cloth: '#d8ccb6', apron: true, collar: true,
    bodyW: 202, height: 1.64
  }
};

const S = smoother;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ramp = (t, a, b) => S(clamp((t - a) / Math.max(1e-4, b - a), 0, 1));
const V = (...a) => new THREE.Vector3(...a);
let C, PT = {}, cast = {}, sets = {}, fx = {}, dyn = {};

const P = (k, f = 0) => {
  const p = PT['P' + String(k).padStart(2, '0')] || { s: (k - 1) * 3.8, e: k * 3.8 };
  return p.s + (p.e - p.s) * f;
};
const PS = k => P(k, 0), PE = k => P(k, 1);

// ---------------------------------------------------------------- boyalı dokular
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tx(c, rep = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
  return t;
}
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function dab(g, w, h, base, n, r, amt, seed, a0 = .22) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = sh(base, 1 + (R() - .5) * amt); g.globalAlpha = a0 + R() * .25;
    g.beginPath(); g.ellipse(R() * w, R() * h, r * (.4 + R()), r * (.25 + R() * .4), R() * 3.14, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
}

function feltTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#1f6a4a'; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, '#1f6a4a', 700, 14, .24, 31, .2);
  g.strokeStyle = '#c8a052'; g.lineWidth = 6; g.globalAlpha = .5;
  g.strokeRect(22, 22, 468, 468);
  g.globalAlpha = 1;
  return tx(c, [1, 1]);
}

function plasterTex(base = '#9d98a8', seed = 41) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  dab(g, 512, 512, base, 520, 26, .22, seed, .22);
  return tx(c, [2, 1]);
}

function cobbleTex() {
  const [c, g] = cnv(512, 512);
  g.fillStyle = '#384664'; g.fillRect(0, 0, 512, 512);
  const R = rng(53);
  for (let y = 0; y < 512; y += 32) {
    const off = (y / 32) % 2 ? 18 : 0;
    for (let x = -16; x < 528; x += 48) {
      g.fillStyle = sh('#45587c', .85 + R() * .32);
      g.beginPath(); g.roundRect(x + off + 3, y + 3, 42, 26, 6); g.fill();
      g.strokeStyle = '#1e273a'; g.lineWidth = 2.5; g.stroke();
    }
  }
  return tx(c, [6, 6]);
}

function tileFaceTex(num, color) {
  const [c, g] = cnv(128, 160);
  g.fillStyle = '#f2e8d0'; g.fillRect(0, 0, 128, 160);
  g.strokeStyle = '#2a1a2c'; g.lineWidth = 10; g.strokeRect(5, 5, 118, 150);
  g.fillStyle = color; g.font = '900 72px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(num, 64, 68);
  g.beginPath(); g.arc(64, 122, 11, 0, 6.29); g.fill();
  return tx(c);
}

function nightCityTex() {
  const w = 2048, h = 1024, [c, g] = cnv(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h * .72);
  sky.addColorStop(0, D('#162344')); sky.addColorStop(.55, D('#2a406e')); sky.addColorStop(1, D('#4b628c'));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const mx = w * .62, my = h * .24;
  const mg = g.createRadialGradient(mx, my, 12, mx, my, 130);
  mg.addColorStop(0, 'rgba(220,235,255,.9)'); mg.addColorStop(.35, 'rgba(160,195,245,.32)'); mg.addColorStop(1, 'rgba(120,160,220,0)');
  g.fillStyle = mg; g.beginPath(); g.arc(mx, my, 130, 0, 6.29); g.fill();
  g.fillStyle = '#e8f2ff'; g.beginPath(); g.arc(mx, my, 24, 0, 6.29); g.fill();
  const y0 = h * .64, R = rng(77);
  g.fillStyle = D('#151e34'); g.beginPath(); g.moveTo(0, h); g.lineTo(0, y0);
  for (let x = 0; x <= w; x += 36) {
    const bh = 24 + R() * 74;
    g.lineTo(x, y0 - bh); g.lineTo(x + 30, y0 - bh);
  }
  g.lineTo(w, h); g.closePath(); g.fill();
  for (const [cx, rad] of [[w * .34, 48], [w * .74, 38]]) {
    g.fillStyle = D('#121a2e');
    g.beginPath(); g.arc(cx, y0 - rad * 1.1, rad, Math.PI, 0); g.lineTo(cx + rad, y0); g.lineTo(cx - rad, y0); g.closePath(); g.fill();
    for (const s of [-1, 1]) {
      g.fillRect(cx + s * rad * 1.35 - 5, y0 - rad * 2.4, 10, rad * 2.4);
      g.beginPath(); g.moveTo(cx + s * rad * 1.35 - 6, y0 - rad * 2.4); g.lineTo(cx + s * rad * 1.35, y0 - rad * 2.9); g.lineTo(cx + s * rad * 1.35 + 6, y0 - rad * 2.4); g.fill();
    }
  }
  for (let i = 0; i < 65; i++) {
    g.fillStyle = D('#ffca78', .5 + R() * .4);
    g.fillRect(R() * w, y0 - 8 - R() * 52, 8, 11);
  }
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

// ---------------------------------------------------------------- ortak 3B mobilya & aksesuar
function buildTeaGlass(x, y, z) {
  const grp = new THREE.Group(); grp.position.set(x, y, z);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.065, .05, .012, 16), flat('#ebe3d2'));
  saucer.position.y = .006; grp.add(saucer);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.055, .005, 8, 18), flat('#b6322a'));
  rim.rotation.x = Math.PI / 2; rim.position.y = .013; grp.add(rim);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.032, .026, .085, 14), flat('#9a2a18'));
  glass.position.y = .052; grp.add(glass);
  const topGlass = new THREE.Mesh(new THREE.CylinderGeometry(.036, .031, .024, 14), flat('#e8e4da'));
  topGlass.position.y = .098; grp.add(topGlass);
  return grp;
}

function buildOkeyTable(parent, tx0, tz0, { storeDyn = false } = {}) {
  const grp = new THREE.Group(); grp.position.set(tx0, 0, tz0); parent.add(grp);
  const wood = painted(woodTex({ base: '#6e4228', plank: 36, rep: [2, 2] }));
  const darkWood = painted(woodTex({ base: '#4a2a18', plank: 36, rep: [1, 1] }));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.58, .08, 1.12), wood);
  frame.position.y = .72; grp.add(frame);
  const felt = new THREE.Mesh(new THREE.BoxGeometry(1.42, .02, .96), painted(feltTex()));
  felt.position.y = .768; grp.add(felt);
  for (const sx of [-.68, .68]) for (const sz of [-.46, .46]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.09, .70, .09), darkWood);
    leg.position.set(sx, .35, sz); grp.add(leg);
  }
  const rackGeo = new THREE.BoxGeometry(.54, .065, .065);
  const rackMat = painted(woodTex({ base: '#8c5a34', plank: 24 }));
  const rLeft = new THREE.Mesh(rackGeo, rackMat); rLeft.position.set(-.44, .81, .16); rLeft.rotation.y = .45; grp.add(rLeft);
  const rRight = new THREE.Mesh(rackGeo, rackMat); rRight.position.set(.44, .81, .16); rRight.rotation.y = -.45; grp.add(rRight);
  const rBack = new THREE.Mesh(rackGeo, rackMat); rBack.position.set(0, .81, -.30); grp.add(rBack);

  const nums = [['11', '#c42b24'], ['12', '#1c538c'], ['13', '#1d181e'], ['7', '#c88018'], ['★', '#c42b24']];
  const tileMats = nums.map(([n, col]) => [
    flat('#d8ccb0'), flat('#d8ccb0'), flat('#e6dcc2'), flat('#c4b698'),
    new THREE.MeshBasicMaterial({ map: tileFaceTex(n, col) }), flat('#dfd4ba')
  ]);
  const tileGeo = new THREE.BoxGeometry(.056, .078, .02);
  const scatter = [];
  for (let i = 0; i < 6; i++) {
    const tL = new THREE.Mesh(tileGeo, tileMats[i % 5]);
    tL.position.set(-.58 + i * .058, .852, .05 + i * .032); tL.rotation.y = .45; grp.add(tL);
    const tR = new THREE.Mesh(tileGeo, tileMats[(i + 2) % 5]);
    tR.position.set(.26 + i * .058, .852, .25 - i * .032); tR.rotation.y = -.45; grp.add(tR);
    scatter.push({ m: tL, base: tL.position.clone(), rot: tL.rotation.clone(), idx: i });
    scatter.push({ m: tR, base: tR.position.clone(), rot: tR.rotation.clone(), idx: i + 6 });
  }
  for (let s = 0; s < 4; s++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(.065, .022, .085), flat('#efe5cc'));
    st.position.set(-.18, .79 + s * .023, -.04); grp.add(st);
  }
  grp.add(buildTeaGlass(-.56, .778, -.28));
  grp.add(buildTeaGlass(.56, .778, -.26));

  const winTile = new THREE.Mesh(new THREE.BoxGeometry(.095, .03, .125), [
    flat('#d8ccb0'), flat('#d8ccb0'), new THREE.MeshBasicMaterial({ map: tileFaceTex('★', '#c82420') }),
    flat('#c4b698'), flat('#d8ccb0'), flat('#d8ccb0')
  ]);
  winTile.position.set(.04, .795, -.02);
  winTile.visible = false;
  grp.add(winTile);

  if (storeDyn) {
    dyn.winTile = winTile;
    dyn.scatter = scatter;
    dyn.racks = [rLeft, rRight, rBack];
  }
  return grp;
}

// ---------------------------------------------------------------- SET 1: KAHVEHANE (x = 0)
function buildKahve(scene) {
  const g = new THREE.Group(); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), painted(woodTex({ base: '#5e3c28', plank: 42, rep: [4, 4] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const wallMat = painted(plasterTex('#8d94aa', 41));
  const lambriMat = painted(woodTex({ base: '#503220', plank: 34, rep: [4, 1] }));
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); backWall.position.set(0, 2.6, -3.5); g.add(backWall);
  const lambri = new THREE.Mesh(new THREE.BoxGeometry(12, 1.25, .08), lambriMat); lambri.position.set(0, .625, -3.44); g.add(lambri);
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideL.rotation.y = Math.PI / 2; sideL.position.set(-4.2, 2.6, 0); g.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), wallMat); sideR.rotation.y = -Math.PI / 2; sideR.position.set(4.2, 2.6, 0); g.add(sideR);

  const winPane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.85), new THREE.MeshBasicMaterial({ map: nightCityTex() }));
  winPane.position.set(0, 2.15, -3.42); winPane.userData.noShadow = true; g.add(winPane);
  const frameMat = flat('#3a2418');
  for (const [fx, fy, fw, fh] of [[0, 3.09, 2.78, .1], [0, 1.21, 2.78, .12], [-1.34, 2.15, .1, 1.98], [1.34, 2.15, .1, 1.98], [0, 2.15, .07, 1.85], [0, 2.15, 2.6, .07]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, .1), frameMat); b.position.set(fx, fy, -3.37); g.add(b);
  }
  const clk = new THREE.Group(); clk.position.set(-2.25, 2.25, -3.35); g.add(clk);
  clk.add(new THREE.Mesh(new THREE.BoxGeometry(.44, .78, .12), flat('#442616')));
  const dial = new THREE.Mesh(new THREE.CircleGeometry(.16, 20), flat('#ece0c2')); dial.position.set(0, .14, .068); clk.add(dial);
  const pend = new THREE.Group(); pend.position.set(0, -.04, .07); clk.add(pend);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(.02, .26, .02), flat('#d9a84a')); rod.position.y = -.13; pend.add(rod);
  const bob = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .02, 14), flat('#e5b856')); bob.rotation.x = Math.PI / 2; bob.position.y = -.26; pend.add(bob);
  dyn.pendulum = pend;

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, .08, .42), flat('#4c2c1a')); shelf.position.set(2.25, 1.52, -3.22); g.add(shelf);
  const semBody = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, .44, 16), flat('#c68038')); semBody.position.set(2.25, 1.78, -3.2); g.add(semBody);
  const semTop = new THREE.Mesh(new THREE.SphereGeometry(.12, 14, 10), flat('#dc9648')); semTop.position.set(2.25, 2.08, -3.2); g.add(semTop);

  buildOkeyTable(g, 0, -.55);
  for (const [sx, sz] of [[-1.15, -.45], [1.15, -.45], [0, -1.45]]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.22, .24, .46, 12), flat('#4e2e1a'));
    st.position.set(sx, .23, sz); g.add(st);
  }

  const lamp = new THREE.Group(); lamp.position.set(0, 2.55, -.55); g.add(lamp);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.8, 8), flat('#1e1820')); cord.position.y = .9; lamp.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.34, .24, 20, 1, true), flat('#22503e')); shade.material.side = THREE.DoubleSide; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.075, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.4, 1.8, 1.0) }));
  bulb.position.y = -.09; bulb.userData.noShadow = true; lamp.add(bulb);
  dyn.lampHalo = glow(scene, [0, 2.45, -.55], { size: 1.5, color: '#ffcb74', alpha: .38 });
  dyn.lampBeam = beam(scene, [0, 2.42, -.55], [0, .75, -.55], { r0: .26, r1: 1.45, color: '#ffd48a', strength: .15 });

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#7a9ad6', '#2e2438', 1.35));
  const keyDir = [.28, -.78, -.55]; dyn.kSun = V(...keyDir).normalize();
  const s = sun('#ffcf82', 3.2, keyDir, [0, .8, -.55], { ext: 6 }); L.add(s); L.add(s.target);
  const pt = new THREE.PointLight('#ffbe62', 4.5, 9, 1.6); pt.position.set(0, 2.32, -.45); L.add(pt);
  const coolFill = new THREE.DirectionalLight('#6c96e0', 1.15); coolFill.position.set(0, 2.4, -5.5); coolFill.target.position.set(0, 1, 0); L.add(coolFill); L.add(coolFill.target);
  scene.add(L); sets.kahve = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 2: YAĞMURLU KAPI (x = 200)
function buildKapi(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), painted(cobbleTex()));
  street.rotation.x = -Math.PI / 2; g.add(street);
  const facade = new THREE.Mesh(new THREE.BoxGeometry(10, 4.8, .4), painted(plasterTex('#566382', 62)));
  facade.position.set(0, 2.4, -2.2); g.add(facade);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.35, .14), flat('#3d2316')); doorFrame.position.set(0, 1.18, -1.96); g.add(doorFrame);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.45), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.9, 1.35, .7) }));
  doorGlow.position.set(0, 1.5, -1.88); doorGlow.userData.noShadow = true; g.add(doorGlow);
  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.35), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.75, 1.22, .62) }));
  winGlow.position.set(-2.35, 1.62, -1.96); winGlow.userData.noShadow = true; g.add(winGlow);
  const far = new THREE.Mesh(new THREE.CylinderGeometry(42, 42, 36, 40, 1, true), vistaMat(nightCityTex(), { yaw: Math.PI, az: Math.PI * 2, el: [-15 * Math.PI / 180, 35 * Math.PI / 180], gain: .9 }));
  far.material.side = THREE.BackSide; far.position.set(0, 5, 0); g.add(far);

  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#5c82c8', '#1f263c', 1.4));
  const moonDir = [-.45, -.68, -.58]; dyn.dSun = V(...moonDir).normalize();
  const s = sun('#9cc0ff', 2.4, moonDir, [200, .9, 0], { ext: 7 }); L.add(s); L.add(s.target);
  const warmDoor = new THREE.PointLight('#ffba5a', 6.5, 10, 1.5); warmDoor.position.set(200, 1.8, -1.35); L.add(warmDoor);
  scene.add(L); sets.kapi = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- SET 3: YAKIN MASA & HAYAL/FISILTI (x = 300)
function buildMasa(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), painted(woodTex({ base: '#4c3222', plank: 42, rep: [3, 3] })));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), painted(plasterTex('#5c6684', 88)));
  wall.position.set(0, 2.5, -2.9); g.add(wall);
  buildOkeyTable(g, 0, -.55, { storeDyn: true });

  const suit = new THREE.Group(); suit.position.set(0, 1.62, -.95); suit.visible = false; g.add(suit);
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(.44, .56, .16), flat('#2b4a78')); jacket.position.y = 0; suit.add(jacket);
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(.14, .44, .18), flat('#f4efe4')); shirt.position.y = .04; suit.add(shirt);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(.055, .34, .20), flat('#c6302a')); tie.position.y = .02; suit.add(tie);
  const hanger = new THREE.Mesh(new THREE.TorusGeometry(.08, .016, 8, 16, Math.PI), flat('#e6b84c')); hanger.position.y = .31; suit.add(hanger);
  dyn.suit = suit;

  const L = new THREE.Group();
  const hemi = new THREE.HemisphereLight('#7898d8', '#2c2238', 1.4); L.add(hemi);
  const kDir = [.25, -.78, -.58]; dyn.mSun = V(...kDir).normalize();
  const key = sun('#ffd084', 3.2, kDir, [300, .9, -.55], { ext: 5 }); L.add(key); L.add(key.target);
  const pt = new THREE.PointLight('#ffbe62', 4.2, 8, 1.6); pt.position.set(300, 2.25, -.35); L.add(pt);
  dyn.mHemi = hemi; dyn.mKey = key; dyn.mPt = pt;
  scene.add(L); sets.masa = { g, L }; shadows(g);
}

// ---------------------------------------------------------------- KAMERA YOLU
function cameraPath() {
  const k = [
    { t: 0,           pos: [199.4, 1.32, 3.3],   look: [200.0, 1.28, -1.6], fov: 48, creep: .26, drift: .04 },
    { t: P(1, .30),   dur: .42, pos: [200.25, 1.38, 1.85], look: [200.0, 1.38, -.65], fov: 44, creep: .30 },
    { t: P(1, .58),   dur: .30, move: 'whip', pos: [-.45, 1.48, 2.55], look: [0, 1.15, -.6], fov: 48, creep: .28 },
    { t: P(1, .84),   dur: .30, move: 'whip', pos: [1.55, 1.38, 1.65], look: [1.55, 1.32, -1.2], fov: 43, creep: .26 },
    { t: PS(2) + .16, dur: .30, move: 'whip', pos: [-1.15, 1.42, 2.95], look: [-.25, 1.25, -.75], fov: 46, creep: .24 },
    { t: PE(2),       dur: Math.max(.4, PE(2) - PS(2) - .2), pos: [-.95, 1.38, 2.25], look: [-.52, 1.28, -.78], fov: 44, creep: .24 },
    { t: PS(3) + .22, dur: .55, pos: [-.15, 1.42, 3.05], look: [0, 1.32, -.85], fov: 48, creep: .25 },
    { t: PE(3),       dur: Math.max(.4, PE(3) - PS(3) - .25), pos: [.15, 1.44, 2.75], look: [.18, 1.38, -.95], fov: 46, creep: .24 },
    { t: PS(4) + .20, dur: .30, move: 'whip', pos: [.15, 1.38, 3.25], look: [.15, 1.25, -.75], fov: 49, creep: .24 },
    { t: PE(4),       dur: Math.max(.4, PE(4) - PS(4) - .25), pos: [-.05, 1.34, 2.55], look: [.25, 1.26, -.75], fov: 46, creep: .22 },
    { t: PS(5) + .15, dur: .30, move: 'whip', pos: [300.25, 1.42, 2.25], look: [300.28, 1.32, -.75], fov: 46, creep: .25 },
    { t: PE(5) + .45, dur: Math.max(.4, PE(5) - PS(5) + .2), pos: [300.12, 1.48, 2.65], look: [300.15, 1.42, -.85], fov: 48, creep: .22 },
    { t: PS(6) + .20, dur: .50, pos: [299.65, 1.48, 1.95], look: [300.12, 1.12, -.65], fov: 44, creep: .28 },
    { t: PE(6),       dur: Math.max(.4, PE(6) - PS(6) - .22), pos: [300.38, 1.38, 1.85], look: [300.42, 1.22, -.65], fov: 42, creep: .26 },
    { t: PS(7) + .16, dur: .35, pos: [299.95, 1.56, 1.65], look: [300.02, 1.02, -.58], fov: 42, creep: .32 },
    { t: PS(8) + .18, dur: .42, pos: [300.25, 1.44, 2.35], look: [300.22, 1.36, -.78], fov: 44, creep: .26 },
    { t: PE(8),       dur: Math.max(.4, PE(8) - PS(8) - .2), pos: [300.38, 1.40, 1.95], look: [300.32, 1.34, -.72], fov: 42, creep: .24 },
    { t: PS(9) + .15, dur: .32, pos: [300.0, 1.46, 3.05], look: [300.0, 1.26, -.65], fov: 50, creep: .28 },
    { t: PE(9),       dur: Math.max(.4, PE(9) - PS(9) - .18), pos: [300.0, 1.52, 3.35], look: [300.0, 1.22, -.65], fov: 50, creep: .22 },
    { t: PS(10) + .12, dur: .30, move: 'whip', pos: [0, 1.55, 2.85], look: [0, 1.12, -.65], fov: 48, creep: .24 },
    { t: P(10, .46),   dur: .30, move: 'whip', pos: [200.0, 1.35, 2.85], look: [200.0, 1.32, -1.0], fov: 46, creep: .22 },
    { t: DUR,          dur: Math.max(.5, DUR - P(10, .46) - .05), pos: [200.0, 1.45, 4.35], look: [200.0, 1.35, -1.5], fov: 50, creep: .18 },
  ];
  const cp = new CamPath(k, { fps: FPS });
  cp.kick(P(7, .62), 1.15);
  cp.kick(P(9, .28), 1.25);
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx;
  for (const w of ctx.words) {
    const p = PT[w.part] ||= { s: w.start, e: w.end };
    p.s = Math.min(p.s, w.start); p.e = Math.max(p.e, w.end);
  }
  const lastEnd = ctx.words.length ? ctx.words[ctx.words.length - 1].end : 38;
  DUR = Math.ceil((lastEnd + 1.6) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#1d2740');

  buildKahve(scene);
  buildKapi(scene);
  buildMasa(scene);

  for (const n of Object.keys(LOOK)) cast[n] = new Toon(LOOK[n], scene);

  fx.smoke = new Smoke(scene, { color: '#c4bac8', maxPoints: 340, H: ctx.H });
  fx.smoke.wisps.push({
    n: 80, size: .45, alpha: .22, speed: .09,
    on: t => where(t) !== 'kapi',
    path: (u, t, i) => {
      const baseX = where(t) === 'masa' ? 300 : 0;
      const ox = ((i % 5) - 2) * .38;
      return [baseX + ox + Math.sin(u * 5 + t * .8 + i) * .22, .92 + u * 1.9, -.55 + Math.cos(u * 4 + t * .6 + i) * .25];
    }
  });
  fx.rain = new Smoke(scene, { color: '#b4d0f2', maxPoints: 320, H: ctx.H, additive: true, near: 1.4 });
  const hash = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  fx.rain.wisps.push({
    n: 200, size: .018, alpha: .42, speed: .85,
    on: t => where(t) === 'kapi',
    path: (u, t, i) => [
      200 + (hash(i, 1) - .5) * 6.5 - u * .35,
      3.8 - u * 4.0,
      (hash(i, 3) - .5) * 5.0
    ]
  });

  dyn.cam = cameraPath();

  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(P(1, .58) - .05, 'whoosh');
  cue(PS(5) + .10, 'whoosh');
  cue(P(10, .46) - .05, 'whoosh');
  cue(PS(2) + .12, 'whoosh');
  cue(PS(4) + .16, 'whoosh');
  cue(PS(10) + .08, 'whoosh');

  cue(0, 'rain', { dur: P(1, .58) });
  cue(P(10, .46), 'rain', { dur: DUR - P(10, .46) });
  cue(P(1, .62), 'snap');
  cue(PS(6) + .2, 'snap'); cue(P(6, .45), 'snap'); cue(P(6, .72), 'snap');
  cue(P(7, .58), 'boom');
  cue(P(7, .60), 'snap');
  cue(PS(8), 'tremble', { dur: PE(8) - PS(8) });
  cue(P(9, .26), 'boom');
  cue(P(9, .34), 'snap'); cue(P(9, .46), 'snap'); cue(P(9, .58), 'snap');
  cue(P(10, .52), 'steps', { dur: Math.max(.8, DUR - P(10, .52) - .3) });
  cue(PE(10) - .25, 'shimmer');
}

// ---------------------------------------------------------------- KARE KARE
const vis = (s, on) => { sets[s].g.visible = on; sets[s].L.visible = on; };
function where(t) {
  if (t < P(1, .56)) return 'kapi';
  if (t < PS(5) + .12) return 'kahve';
  if (t < PS(10) + .10) return 'masa';
  if (t < P(10, .44)) return 'kahve';
  return 'kapi';
}
function camSet(cam) { return cam.position.x > 250 ? 'masa' : cam.position.x > 100 ? 'kapi' : 'kahve'; }

const WARM = '#ffc474', COOL = '#cfd8f0', ICY = '#9ec6f5';

export function frame(t, ctx) {
  const { cam } = ctx, cp = dyn.cam;
  const st = cp.apply(cam, t);
  const here = camSet(cam);
  for (const s of ['kahve', 'kapi', 'masa']) vis(s, s === here);
  for (const c of Object.values(cast)) c.hide();

  dyn.lampHalo.visible = here === 'kahve';
  dyn.lampBeam.visible = here === 'kahve';
  dyn.lampBeam.material.uniforms.uT.value = t;
  dyn.pendulum.rotation.z = Math.sin(t * 3.1) * .24;

  const env = ctx.env, talk = (a, b) => (t >= a && t <= b ? flap(env, t) : 0);
  const bl = (seed, ...sw) => blinkAt(t, seed, sw);
  const ab = cast.abdurrahman, az = cast.azrail, kk = cast.kankardes, kv = cast.kahveci;
  const tint = here === 'kapi' ? [.98, .99, 1.02] : [1.0, .99, .98];

  if (here === 'kapi') {
    const isOutro = t > PS(9);
    const walkU = isOutro ? ramp(t, P(10, .46), DUR) : ramp(t, 0, P(1, .52));
    const azZ = isOutro ? -1.4 + walkU * 2.1 : .5 - walkU * 1.45;
    az.show(); az.place(200.0, 0, azZ, cam, tint);
    az.draw({
      expr: isOutro ? 'smug' : 'neutral',
      look: isOutro ? .15 : -.15,
      blink: bl(1, P(1, .3), P(10, .6)),
      bob: -Math.abs(Math.sin(t * 6.5)) * 8,
      armL: [14 + Math.sin(t * 6.5) * 8, 8],
      armR: [14 - Math.sin(t * 6.5) * 8, 8],
      lit: -1, shade: '#c4cce8', rim: { color: '#ffbe68', a: .5 }
    });
    az.castFrom(dyn.dSun, true);
  } else if (here === 'kahve') {
    const isAfter = t >= PS(10);
    if (!isAfter) {
      const racon = t >= PS(2) && t < PS(4);
      const lie = t >= PS(4);
      ab.show(); ab.place(-.56, 0, -.58, cam, tint);
      ab.draw({
        expr: racon ? 'proud' : 'smug',
        look: lie ? .75 : .55,
        mouth: Math.max(talk(PS(2), PE(2)), talk(PS(3), PE(3)), talk(P(4, .45), PE(4))),
        blink: bl(2, PS(2), PS(3), PS(4)),
        armR: racon ? [105 + Math.sin(t * 8) * 14, 30] : lie ? [75, 45] : [36, 20],
        armL: [24, 16],
        bob: racon ? -Math.abs(Math.sin(t * 5)) * 5 : 0,
        lit: -1, shade: COOL, rim: { color: WARM, a: .42 }
      });
      ab.castFrom(dyn.kSun, true);

      az.show(); az.place(lie ? -.05 : .48, 0, lie ? -1.18 : -.82, cam, tint);
      az.draw({
        expr: 'neutral', look: -.45, blink: bl(3, PS(3)),
        armL: [16, 10], armR: [16, 10],
        lit: 1, shade: '#bfc4e4', rim: { color: WARM, a: .32 }
      });
      az.castFrom(dyn.kSun, true);

      if (t >= PS(4) - .1) {
        const arr = ramp(t, PS(4) - .1, PS(4) + .55);
        kk.show(); kk.place(.56 + (1 - arr) * .85, 0, -.52, cam, tint);
        kk.draw({
          expr: t > P(4, .55) ? 'grin' : 'smile',
          look: -.65, blink: bl(4, PS(4) + .5),
          armL: [28, 22], armR: [24, 18],
          bob: arr < 1 ? -Math.abs(Math.sin(t * 10)) * 9 : 0,
          lit: 1, shade: COOL, rim: { color: WARM, a: .38 }
        });
        kk.castFrom(dyn.kSun, true);
      }

      if (t < PS(2) + .1) {
        kv.show(); kv.place(1.55, 0, -1.25, cam, tint);
        kv.draw({
          expr: 'surprised', look: -.65, sweat: 1, blink: bl(5, P(1, .8)),
          armL: [115, 25], armR: [115, 25],
          lit: 1, shade: COOL, rim: { color: WARM, a: .35 }
        });
        kv.castFrom(dyn.kSun, true);
      }
    } else {
      az.show(); az.place(.05, 0, -1.15, cam, tint);
      az.draw({
        expr: 'smug', look: .15, blink: bl(6, PS(10) + .2),
        armL: [18, 10], armR: [18, 10],
        lit: 1, shade: '#bfc4e4', rim: { color: WARM, a: .35 }
      });
      az.castFrom(dyn.kSun, true);
    }
  } else {
    const chill = ramp(t, PS(8) - .1, PS(8) + .55) * (1 - ramp(t, PS(9), PS(9) + .35));
    const slam = ramp(t, P(7, .42), P(7, .64));
    const chaos = ramp(t, P(9, .22), P(9, .78));

    dyn.mKey.color.set('#ffd084').lerp(new THREE.Color('#7ca8f0'), chill);
    dyn.mPt.color.set('#ffbe62').lerp(new THREE.Color('#5a8ee8'), chill);
    dyn.mPt.intensity = 4.2 + (t >= P(9, .24) && t <= P(9, .42) ? 4.0 : 0) - chill * 1.4;

    const suitOn = t >= PS(5) && t < PS(6) + .15;
    dyn.suit.visible = suitOn;
    if (suitOn) {
      const sc = ramp(t, PS(5) + .1, PS(5) + .45) * (1 - ramp(t, PS(6) - .15, PS(6) + .15));
      dyn.suit.scale.setScalar(Math.max(.001, sc));
      dyn.suit.position.y = 1.66 + Math.sin(t * 4) * .05;
      dyn.suit.rotation.y = Math.sin(t * 2.2) * .35;
    }

    dyn.winTile.visible = t >= P(7, .35);
    if (dyn.winTile.visible) {
      dyn.winTile.position.y = .795 + (1 - slam) * .55;
      dyn.winTile.rotation.y = (1 - slam) * .5;
    }

    for (const s of dyn.scatter) {
      if (chaos > .01) {
        const ang = s.idx * 1.7;
        s.m.position.set(
          s.base.x + Math.cos(ang) * chaos * .55,
          s.base.y + Math.sin(chaos * Math.PI) * (.38 + (s.idx % 3) * .12),
          s.base.z + Math.sin(ang) * chaos * .45
        );
        s.m.rotation.set(chaos * 2.5, s.rot.y + chaos * 3.1, chaos * 1.8);
      } else {
        s.m.position.copy(s.base); s.m.rotation.copy(s.rot);
      }
    }

    ab.show(); ab.place(299.44 - chaos * .14, 0, -.52, cam, tint);
    ab.draw({
      expr: t >= PS(9) ? 'angry' : t >= PS(8) ? 'worried' : t >= PS(7) ? 'surprised' : 'focused',
      look: .72,
      sweat: t >= PS(7) && t < PS(9) ? 1 : 0,
      blink: bl(7, PS(7), PS(9)),
      armR: t >= PS(9) ? [125, 25] : [30, 20],
      armL: t >= PS(9) ? [95, 30] : [20, 16],
      lean: t >= PS(9) ? 8 : 0,
      lit: -1, shade: chill > .3 ? ICY : COOL, rim: { color: chill > .3 ? '#7ab8ff' : WARM, a: .42 }
    });
    ab.castFrom(dyn.mSun, true);

    const laugh5 = t >= PS(5) && t < PS(6);
    const greedy6 = t >= PS(6) && t < PS(7);
    const shock8 = t >= P(8, .48) && t < PS(9);
    kk.show(); kk.place(300.52 + chaos * .14, 0, -.50, cam, tint);
    kk.draw({
      expr: t >= PS(9) ? 'angry' : shock8 ? 'surprised' : t >= PS(7) ? 'worried' : greedy6 ? 'smug' : laugh5 ? 'laugh' : 'grin',
      look: -.72,
      mouth: Math.max(talk(PS(5), PE(5)), laugh5 ? .72 : 0),
      laughMarks: laugh5 ? .95 : 0,
      sweat: greedy6 || shock8 ? 1 : 0,
      blink: bl(8, PS(6), P(8, .48), PS(9)),
      armL: t >= PS(9) ? [125, 25] : laugh5 ? [88, 35] : [35, 28],
      armR: t >= PS(9) ? [95, 30] : [28, 22],
      bob: laugh5 ? -Math.abs(Math.sin(t * 14)) * 12 : shock8 ? Math.sin(t * 48) * 3 : 0,
      lean: t >= PS(9) ? -8 : 0,
      lit: 1, shade: chill > .3 ? ICY : COOL, rim: { color: chill > .3 ? '#7ab8ff' : WARM, a: .42 }
    });
    kk.castFrom(dyn.mSun, true);

    const leanW = ramp(t, PS(8), PS(8) + .45) * (1 - ramp(t, PS(9) - .05, PS(9) + .25));
    az.show(); az.place(300.0 + leanW * .24, 0, -1.06 + leanW * .26, cam, tint);
    az.draw({
      expr: t >= P(7, .4) ? 'smug' : 'neutral',
      look: leanW > .1 ? .8 : -.1,
      mouth: talk(PS(8), PE(8)) * .55,
      blink: bl(9, P(7, .6), PS(8)),
      armR: t >= P(7, .35) && t < PS(8) ? [112 * slam, 28] : [18, 12],
      armL: [18, 12],
      lean: leanW * 10,
      lit: 1, shade: '#b8c4ea', rim: { color: chill > .3 ? '#8cc8ff' : WARM, a: .4 }
    });
    az.castFrom(dyn.mSun, true);
  }

  for (const s of [fx.smoke, fx.rain]) s.update(t);

  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (here === 'kapi') {
    look = { ...focusOn(V(200.0, 1.2, -.5), 4, 4.5), sat: 1.18, lift: [.07, .085, .13], bloom: .85, vignette: .22 };
    C.scene.fog = new THREE.FogExp2('#1d2c4a', .045);
  } else if (here === 'kahve') {
    look = { ...focusOn(V(0, 1.1, -.65), 4, 4.5), sat: 1.16, lift: [.08, .08, .11], bloom: .78, vignette: .22 };
    C.scene.fog = new THREE.FogExp2('#242738', .022);
  } else {
    const chill = ramp(t, PS(8) - .1, PS(8) + .55) * (1 - ramp(t, PS(9), PS(9) + .35));
    look = { ...focusOn(V(300.0, 1.15, -.65), 4.5, 3.8), sat: 1.18, lift: [.075 - chill * .02, .085, .12 + chill * .04], bloom: .8, vignette: .24 };
    C.scene.fog = new THREE.FogExp2(chill > .35 ? '#1b2b4a' : '#242738', .025);
  }
  look.tint = here === 'kapi' ? [.95, .98, 1.04] : [.99, .99, 1.01];
  look.blur = st.moving > .15 ? 16 : 0;
  return look;
}
