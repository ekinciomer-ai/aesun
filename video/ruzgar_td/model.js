// Türbin geometrisi, metre cinsinden, koddan: kule (3 bölüm, flanşlar), temel ve ankraj civataları, yaw yatağı ve
// motorları, nasel kabuğu, şasi, ana mil, ana rulman, şanzıman (planet kademesi içi görünür), fren diski, kaplin,
// jeneratör, güç çevirici, trafo, soğutucu, rüzgâr ölçer; göbek, pitch yatakları ve NREL kiriş/burulma dağılımıyla
// loft edilmiş üç kanat. Ayrıca: kalıptaki sergi kanadı ve katman kesiti, kanat taşıma tırı, paletli vinç.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {T} from './kin.js';

const V3 = THREE.Vector3;
const D2R = Math.PI / 180;
export const ACC = '#2f7fd6';

export const MAT = {};
const std = (c, m, r, x = {}) => new THREE.MeshStandardMaterial({color: c, metalness: m, roughness: r, envMapIntensity: 0.55, ...x});
export function mats() {
  MAT.boya = std('#eceef0', 0, 0.42);
  MAT.kule = std('#e7e9ec', 0, 0.46);
  MAT.celik = std('#a3a8ae', 0.85, 0.36);
  MAT.parlak = std('#c9ced3', 1, 0.22);
  MAT.dokum = std('#5d636b', 0.45, 0.52);
  MAT.koyu = std('#2c3036', 0.3, 0.55);
  MAT.lastik = std('#1d1f22', 0, 0.8);
  MAT.beton = std('#c8c3b8', 0, 0.9);
  MAT.bakir = std('#c27a45', 0.9, 0.35);
  MAT.dolap = std('#d9dce0', 0.2, 0.5);
  MAT.sari = std('#e3b13a', 0.2, 0.45);
  MAT.kirmizi = std('#c8323a', 0.1, 0.5);
  MAT.cam = std('#f2f3f1', 0, 0.55);
  MAT.karbon = std('#25272b', 0.25, 0.42);
  MAT.balsa = std('#d9b98a', 0, 0.8);
  MAT.recine = std('#e9dcb8', 0, 0.35, {transparent: true, opacity: 0.85});
  MAT.kalip = std('#7d858e', 0.55, 0.4);
  MAT.acc = std(ACC, 0.1, 0.4, {emissive: new THREE.Color(ACC), emissiveIntensity: 0.25});
  return MAT;
}

// ------------------------------------------------------------ yardımcılar
const mesh = (g, m, f) => {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true;
  o.receiveShadow = true;
  if (f) f(o);
  return o;
};
const cyl = (r1, r2, h, seg = 48, open = false) => new THREE.CylinderGeometry(r1, r2, h, seg, 1, open);
// z ekseni boyunca silindir (merkez z0..z1)
const zcyl = (r, z0, z1, m, seg = 48) => mesh(cyl(r, r, Math.abs(z1 - z0), seg), m, (o) => {
  o.rotation.x = Math.PI / 2;
  o.position.z = (z0 + z1) / 2;
});
const rbox = (w, h, d, r, m) => mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
const lathe = (prof, seg = 64) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export function disliGeo(dis, rp, gen, delik = 0, ic = false) {
  const ra = rp * (1 + 2.2 / dis);
  const rr = rp * (1 - 2.6 / dis);
  const sh = new THREE.Shape();
  const P = [];
  for (let i = 0; i < dis; i++) {
    const a0 = (i / dis) * Math.PI * 2, da = (Math.PI * 2) / dis;
    const pts = ic
      ? [[ra, a0], [ra, a0 + da * 0.18], [rr, a0 + da * 0.34], [rr, a0 + da * 0.6], [ra, a0 + da * 0.76]]
      : [[rr, a0], [rr, a0 + da * 0.18], [ra, a0 + da * 0.34], [ra, a0 + da * 0.6], [rr, a0 + da * 0.76]];
    for (const [r, a] of pts) P.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  if (ic) {
    // dış çember + iç dişli delik
    sh.absarc(0, 0, ra * 1.16, 0, Math.PI * 2, false);
    const h = new THREE.Path();
    P.forEach(([x, y], k) => (k ? h.lineTo(x, y) : h.moveTo(x, y)));
    h.closePath();
    sh.holes.push(h);
  } else {
    P.forEach(([x, y], k) => (k ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.closePath();
    if (delik) {
      const h = new THREE.Path();
      h.absarc(0, 0, delik, 0, Math.PI * 2, true);
      sh.holes.push(h);
    }
  }
  const g = new THREE.ExtrudeGeometry(sh, {depth: gen, bevelEnabled: true, bevelThickness: gen * 0.04, bevelSize: rp * 0.012, bevelSegments: 1, curveSegments: 6});
  g.translate(0, 0, -gen / 2);
  return g;
}

// ------------------------------------------------------------ kanat: NREL 5 MW kiriş ve burulma dağılımı
const KIRIS = [[1.5, 3.542], [2.87, 3.542], [5.6, 3.854], [8.33, 4.167], [11.75, 4.557], [15.85, 4.652], [19.95, 4.458], [24.05, 4.249], [28.15, 4.007], [32.25, 3.748], [36.35, 3.502], [40.45, 3.256], [44.55, 3.01], [48.65, 2.764], [52.75, 2.518], [56.17, 2.313], [58.9, 2.086], [61.63, 1.419], [63, 0.7]];
const BURUL = [[1.5, 13.308], [11.75, 13.308], [15.85, 11.48], [19.95, 10.162], [24.05, 9.011], [28.15, 7.795], [32.25, 6.544], [36.35, 5.361], [40.45, 4.188], [44.55, 3.125], [48.65, 2.319], [52.75, 1.526], [56.17, 0.863], [58.9, 0.37], [61.63, 0.106], [63, 0]];
const tab = (tb, x) => {
  if (x <= tb[0][0]) return tb[0][1];
  for (let i = 1; i < tb.length; i++) if (x <= tb[i][0]) return tb[i - 1][1] + ((tb[i][1] - tb[i - 1][1]) * (x - tb[i - 1][0])) / (tb[i][0] - tb[i - 1][0]);
  return tb[tb.length - 1][1];
};
const kalinlik = (r) => (r < 13 ? 1 : r < 45 ? 0.4 - ((r - 13) / 32) * 0.19 : 0.21 - ((r - 45) / 18) * 0.03);
// profil: i = 0..N-1, çevre boyunca (firar kenarı → üst yüz → hücum kenarı → alt yüz)
export function profil(N, c, t, b) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const u = i / N;
    // NACA 4 haneli, %3 kamburluk, %40'ta
    const w = u < 0.5 ? 1 - u * 2 : (u - 0.5) * 2;
    const x = (1 - Math.cos(Math.PI * w)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const m = 0.03 * Math.min(1, (1 - t) * 1.4), p = 0.4;
    const yc = x < p ? (m / (p * p)) * (2 * p * x - x * x) : (m / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * x - x * x);
    const ys = u < 0.5 ? yc + yt : yc - yt;
    let ax = (x - 0.3) * c, az = -ys * c;
    // kök: daire
    const ph = u * Math.PI * 2;
    const cx = Math.cos(ph) * c * 0.5 * 0.98 + 0.2 * c * 0, cz = -Math.sin(ph) * c * 0.5 * 0.98;
    out.push([cx + (ax - cx) * b, cz + (az - cz) * b]);
  }
  return out;
}
export function kanatGeo(N = 56, r0 = 1.5, r1 = 63) {
  const R = [];
  for (let r = r0; r < 6; r += 0.75) R.push(r);
  for (let r = 6; r < 16; r += 1) R.push(r);
  for (let r = 16; r < 58; r += 2.5) R.push(r);
  for (let r = 58; r < r1; r += 0.8) R.push(r);
  R.push(r1);
  const pos = [];
  const idx = [];
  R.forEach((r, j) => {
    const c = tab(KIRIS, r) * (j === R.length - 1 ? 0.6 : 1);
    const b = Math.min(1, Math.max(0, (r - 3.2) / 10));
    const bb = b * b * (3 - 2 * b);
    const tw = tab(BURUL, r) * D2R;
    const t = kalinlik(r);
    const P = profil(N, c, t, bb);
    const cs = Math.cos(tw), sn = Math.sin(tw);
    for (const [x, z] of P) pos.push(x * cs - z * sn, r - r0, x * sn + z * cs);
  });
  for (let j = 0; j < R.length - 1; j++)
    for (let i = 0; i < N; i++) {
      const a = j * N + i, b = j * N + ((i + 1) % N), c = (j + 1) * N + i, d = (j + 1) * N + ((i + 1) % N);
      idx.push(a, c, b, b, c, d);
    }
  // uç ve kök kapakları
  const capc = (j, flip) => {
    const k = pos.length / 3;
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < N; i++) {
      x += pos[(j * N + i) * 3];
      y += pos[(j * N + i) * 3 + 1];
      z += pos[(j * N + i) * 3 + 2];
    }
    pos.push(x / N, y / N + (flip ? 0 : 0.25), z / N);
    for (let i = 0; i < N; i++) {
      const a = j * N + i, b = j * N + ((i + 1) % N);
      flip ? idx.push(k, a, b) : idx.push(k, b, a);
    }
  };
  capc(R.length - 1, false);
  capc(0, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------ türbin
export function buildTurbin() {
  const P = {}; // parça kaydı: ad -> {obj, mat, at(): V3 dünya}
  const kayit = (ad, obj, mat) => {
    P[ad] = {obj, mat};
    return obj;
  };
  const root = new THREE.Group();

  // temel
  const temel = new THREE.Group();
  temel.add(mesh(cyl(9.5, 10, 0.6, 8), MAT.beton, (o) => (o.position.y = -0.3)));
  temel.add(mesh(cyl(3.6, 3.9, 0.9, 64), MAT.beton, (o) => (o.position.y = 0.15)));
  {
    const n = 96;
    const g = cyl(0.045, 0.045, 0.7, 8);
    const im = new THREE.InstancedMesh(g, MAT.celik, n * 2);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n * 2; i++) {
      const a = (i % n) / n * Math.PI * 2, r = i < n ? 2.8 : 3.2;
      m4.makeTranslation(Math.cos(a) * r, 0.75, Math.sin(a) * r);
      im.setMatrixAt(i, m4);
    }
    im.castShadow = true;
    temel.add(im);
  }
  root.add(kayit('temel', temel, MAT.beton));

  // kule: konik, 3 bölüm, flanşlar
  const rK = (y) => 3.0 - (y / T.kule) * (3.0 - 1.935);
  const kule = [];
  const BOL = [0.6, 30, 60, T.kule];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const y0 = BOL[i], y1 = BOL[i + 1];
    g.add(mesh(lathe([[rK(y0), 0], [rK(y1), y1 - y0]], 96), MAT.kule));
    // flanşlar (iç halka)
    for (const yy of [0, y1 - y0]) g.add(mesh(new THREE.TorusGeometry(rK(y0 + yy) - 0.08, 0.1, 8, 72), MAT.celik, (o) => {
      o.rotation.x = Math.PI / 2;
      o.position.y = yy;
    }));
    if (i === 0) {
      g.add(rbox(1.0, 2.3, 0.3, 0.08, MAT.koyu)); // kapı
      g.children[g.children.length - 1].position.set(0, 1.6, rK(1.6) - 0.08);
      // merdiven
      g.add(mesh(new RoundedBoxGeometry(1.4, 0.15, 1.2, 2, 0.04), MAT.celik, (o) => o.position.set(0, 0.35, rK(0.4) + 0.5)));
    }
    g.position.y = y0;
    g.userData.y0 = y0;
    root.add(g);
    kule.push(kayit(`kule${i}`, g, MAT.kule));
  }

  // yaw: nasel grubu kule tepesinde
  const yaw = new THREE.Group();
  yaw.position.y = T.kule;
  root.add(yaw);
  const nasel = new THREE.Group(); // kurulumda kaldırılan parça
  yaw.add(nasel);
  // yaw yatağı, dişli halka, motorlar
  {
    const g = new THREE.Group();
    g.add(mesh(cyl(1.95, 1.95, 0.32, 96), MAT.celik, (o) => (o.position.y = 0.16)));
    const ring = mesh(disliGeo(120, 1.72, 0.26, 0, true), MAT.parlak, (o) => {
      o.rotation.x = Math.PI / 2;
      o.position.y = 0.5;
    });
    g.add(ring);
    const mot = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const m = new THREE.Group();
      m.add(mesh(cyl(0.2, 0.2, 1.0, 32), MAT.dokum, (o) => (o.position.y = 1.0)));
      m.add(mesh(cyl(0.24, 0.24, 0.12, 32), MAT.celik, (o) => (o.position.y = 1.52)));
      m.add(mesh(cyl(0.16, 0.16, 0.5, 32), MAT.koyu, (o) => (o.position.y = 0.4)));
      m.add(mesh(disliGeo(12, 0.13, 0.2, 0.03), MAT.parlak, (o) => {
        o.rotation.x = Math.PI / 2;
        o.position.y = 0.5;
      }));
      m.position.set(Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45);
      mot.add(m);
    }
    g.add(mot);
    nasel.add(kayit('yawYatak', g, MAT.celik));
    P.yawMotor = {obj: mot, mat: MAT.dokum};
  }
  // şasi: ön döküm şasi + arka çerçeve
  {
    const g = new THREE.Group();
    const sh = new THREE.Shape();
    [[-1.6, 0], [1.6, 0], [1.4, 1.1], [0.9, 1.5], [-0.9, 1.5], [-1.4, 1.1]].forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.closePath();
    const bg = new THREE.ExtrudeGeometry(sh, {depth: 6.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2});
    g.add(mesh(bg, MAT.dokum, (o) => o.position.set(0, 0.55, -2.4)));
    for (const x of [-1.25, 1.25]) {
      g.add(mesh(new THREE.BoxGeometry(0.28, 0.5, 9.4), MAT.dokum, (o) => o.position.set(x, 0.85, -7.3)));
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 9.4), MAT.dokum, (o) => o.position.set(x, 1.1, -7.3)));
    }
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.BoxGeometry(2.5, 0.22, 0.22), MAT.dokum, (o) => o.position.set(0, 0.85, -4.5 - k * 2.6)));
    nasel.add(kayit('sasi', g, MAT.dokum));
  }

  // tahrik hattı: göbek merkezinde, 5° eğik; yerel -z arkaya
  const tahrik = new THREE.Group();
  const HUBY = T.hub - T.kule;
  tahrik.position.set(0, HUBY, T.overhang);
  tahrik.rotation.x = -T.tilt * D2R;
  nasel.add(tahrik);
  const parca = (ad, g, mat, ex) => {
    g.userData.ex = ex; // patlatma ofseti
    g.userData.p0 = g.position.clone();
    tahrik.add(g);
    return kayit(ad, g, mat);
  };
  // ana mil (yavaş): flanş + mil
  const yavas = new THREE.Group();
  yavas.add(mesh(lathe([[0.001, 0], [0.95, 0], [0.95, 0.22], [0.5, 0.3], [0.42, 0.9], [0.4, 4.5], [0.001, 4.5]], 64), MAT.parlak, (o) => {
    o.rotation.x = -Math.PI / 2;
    o.position.z = -0.75;
  }));
  // flanş civataları
  {
    const im = new THREE.InstancedMesh(cyl(0.04, 0.04, 0.12, 8), MAT.koyu, 36);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      m4.makeRotationX(Math.PI / 2).setPosition(Math.cos(a) * 0.8, Math.sin(a) * 0.8, -0.8);
      im.setMatrixAt(i, m4);
    }
    yavas.add(im);
  }
  parca('anaMil', yavas, MAT.parlak, new V3(0, 0, 1.2));
  // ana rulman yuvası
  {
    const g = new THREE.Group();
    g.add(zcyl(0.88, -1.45, -2.45, MAT.dokum));
    g.add(zcyl(0.94, -1.5, -1.62, MAT.celik));
    g.add(zcyl(0.94, -2.28, -2.4, MAT.celik));
    g.add(mesh(new THREE.BoxGeometry(2.0, 1.0, 0.9), MAT.dokum, (o) => o.position.set(0, -0.75, -1.95)));
    g.add(mesh(new THREE.BoxGeometry(2.6, 0.14, 1.2), MAT.dokum, (o) => o.position.set(0, -1.25, -1.95)));
    parca('anaRulman', g, MAT.dokum, new V3(0, 2.6, 0));
  }
  // şanzıman: planet kademesi (halka + 3 planet + güneş), ikinci kademe, paralel kademe
  const sanz = new THREE.Group();
  const kabuk = new THREE.Group();
  const kabMat = MAT.dokum.clone();
  kabMat.transparent = true;
  kabuk.add(zcyl(1.3, -5.0, -6.4, kabMat, 96));
  kabuk.add(zcyl(1.05, -6.4, -7.2, kabMat, 96));
  kabuk.add(mesh(new RoundedBoxGeometry(1.9, 2.6, 1.0, 3, 0.15), kabMat, (o) => o.position.set(0, 0.35, -7.7)));
  for (const x of [-1, 1]) kabuk.add(mesh(new THREE.BoxGeometry(0.5, 0.35, 0.9), kabMat, (o) => o.position.set(x * 1.55, -0.2, -5.6))); // tork kolları
  sanz.add(kabuk);
  const icler = new THREE.Group();
  icler.add(mesh(disliGeo(84, 1.12, 0.9, 0, true), MAT.parlak, (o) => (o.position.z = -5.7)));
  const planetler = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    planetler.add(mesh(disliGeo(32, 0.42, 0.85, 0.08), MAT.celik, (o) => o.position.set(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0)));
  }
  planetler.position.z = -5.7;
  icler.add(planetler);
  const gunes = mesh(disliGeo(20, 0.27, 0.95, 0.06), MAT.bakir, (o) => (o.position.z = -5.7));
  icler.add(gunes);
  icler.add(zcyl(0.22, -6.2, -7.4, MAT.parlak, 32));
  sanz.add(icler);
  parca('sanziman', sanz, MAT.dokum, new V3(0, 0, -1.6));
  // hızlı mil, fren, kaplin (paralel kademe çıkışı yukarıda)
  const HSY = 0.95;
  const hizli = new THREE.Group();
  hizli.add(zcyl(0.16, -8.2, -10.2, MAT.parlak, 32));
  const fren = zcyl(0.62, -8.55, -8.62, MAT.parlak, 96);
  hizli.add(fren);
  hizli.add(zcyl(0.3, -9.2, -9.7, MAT.celik, 48));
  for (const z of [-9.25, -9.65]) hizli.add(zcyl(0.36, z - 0.03, z + 0.03, MAT.koyu, 48));
  hizli.position.y = HSY;
  const kaliper = rbox(0.3, 0.45, 0.32, 0.05, MAT.kirmizi);
  kaliper.position.set(0, HSY + 0.6, -8.58);
  tahrik.add(kaliper);
  parca('hizliMil', hizli, MAT.parlak, new V3(0, 0, -2.6));
  P.fren = {obj: fren, mat: MAT.parlak};
  // jeneratör
  {
    const g = new THREE.Group();
    g.add(zcyl(0.9, -10.3, -12.9, MAT.boya, 96));
    g.add(mesh(lathe([[0.001, 0], [0.92, 0], [0.92, 0.3], [0.6, 0.45], [0.001, 0.48]], 64), MAT.dokum, (o) => {
      o.rotation.x = -Math.PI / 2;
      o.position.z = -12.85;
      o.rotation.x = Math.PI / 2;
    }));
    g.add(zcyl(0.94, -10.25, -10.45, MAT.dokum, 96));
    // soğutma kanatları
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.14, 2.3), MAT.celik, 40);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      m4.makeRotationZ(a).setPosition(Math.cos(a + Math.PI / 2) * 0.96, Math.sin(a + Math.PI / 2) * 0.96, -11.6);
      im.setMatrixAt(i, m4);
    }
    im.castShadow = true;
    g.add(im);
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), MAT.koyu, (o) => o.position.set(0.75, 0.75, -10.9))); // klemens kutusu
    g.position.y = HSY;
    parca('jenerator', g, MAT.boya, new V3(0, 0, -4.0));
  }
  // nasel arka bölüm: çevirici, trafo, soğutucu, ölçer (nasel koordinatlarında)
  {
    const g = new THREE.Group();
    g.add(rbox(1.0, 2.0, 1.8, 0.06, MAT.dolap));
    for (let k = 0; k < 6; k++) g.add(mesh(new THREE.BoxGeometry(0.02, 0.08, 1.4), MAT.koyu, (o) => o.position.set(-0.51, 0.6 - k * 0.14, 0)));
    g.position.set(1.15, 2.2, -8.0);
    g.userData.ex = new V3(2.4, 0, 0);
    g.userData.p0 = g.position.clone();
    nasel.add(kayit('cevirici', g, MAT.dolap));
  }
  {
    const g = new THREE.Group();
    g.add(rbox(1.1, 1.6, 1.4, 0.05, MAT.koyu));
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1.3, 0.03), MAT.dokum, 14);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 14; i++) {
      m4.makeTranslation(-0.65, 0, -0.6 + i * 0.092);
      im.setMatrixAt(i, m4);
    }
    g.add(im);
    for (let i = 0; i < 3; i++) g.add(mesh(cyl(0.07, 0.09, 0.35, 16), MAT.cam, (o) => o.position.set(0, 0.95, -0.4 + i * 0.4)));
    g.position.set(-1.15, 2.0, -8.3);
    g.userData.ex = new V3(-2.4, 0, 0);
    g.userData.p0 = g.position.clone();
    nasel.add(kayit('trafo', g, MAT.koyu));
  }
  {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(3.4, 1.4, 0.25), MAT.celik));
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 1.3, 0.3), MAT.dokum, 60);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 60; i++) {
      m4.makeTranslation(-1.65 + i * 0.056, 0, 0);
      im.setMatrixAt(i, m4);
    }
    g.add(im);
    g.position.set(0, 4.85, -9.6);
    g.rotation.x = -0.35;
    g.userData.ex = new V3(0, 2.2, -1.5);
    g.userData.p0 = g.position.clone();
    nasel.add(kayit('sogutucu', g, MAT.celik));
  }
  // rüzgâr ölçer direği: kaplı anemometre + yön gösterici
  const olcer = new THREE.Group();
  olcer.add(mesh(cyl(0.04, 0.05, 1.3, 12), MAT.celik, (o) => (o.position.y = 0.65)));
  olcer.add(mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05), MAT.celik, (o) => (o.position.y = 1.3)));
  const anemo = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    anemo.add(mesh(new THREE.BoxGeometry(0.02, 0.02, 0.22), MAT.celik, (o) => {
      o.rotation.y = a;
      o.position.set(Math.sin(a) * 0.11, 0, Math.cos(a) * 0.11);
    }));
    anemo.add(mesh(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI), MAT.koyu, (o) => {
      o.position.set(Math.sin(a) * 0.22, 0, Math.cos(a) * 0.22);
      o.rotation.y = a + Math.PI / 2;
    }));
  }
  anemo.position.set(-0.55, 1.45, 0);
  olcer.add(anemo);
  const vane = new THREE.Group();
  vane.add(mesh(new THREE.BoxGeometry(0.02, 0.18, 0.4), MAT.koyu, (o) => (o.position.z = -0.2)));
  vane.add(mesh(new THREE.ConeGeometry(0.03, 0.12, 8), MAT.koyu, (o) => {
    o.rotation.x = Math.PI / 2;
    o.position.z = 0.06;
  }));
  vane.position.set(0.55, 1.42, 0);
  olcer.add(vane);
  olcer.position.set(0, 4.05, -10.6);
  nasel.add(kayit('olcer', olcer, MAT.celik));

  // nasel kabuğu: kesit için x>0 tarafı kırpılabilir, x-ray için fresnel
  const kabukMat = MAT.boya.clone();
  kabukMat.side = THREE.DoubleSide;
  const kapak = new THREE.Group();
  const kbg = new RoundedBoxGeometry(4.3, 4.1, 14.6, 6, 0.75);
  kapak.add(mesh(kbg, kabukMat, (o) => o.position.set(0, 2.25, -4.35)));
  kapak.add(mesh(new THREE.BoxGeometry(4.32, 0.05, 0.05), MAT.koyu, (o) => o.position.set(0, 0.9, 2.9))); // ayrım çizgisi
  nasel.add(kapak);
  P.kapak = {obj: kapak, mat: kabukMat};

  // rotor: göbek + pitch yatakları + 3 kanat
  const rotor = new THREE.Group();
  tahrik.add(rotor);
  const gobek = new THREE.Group();
  gobek.add(mesh(new THREE.SphereGeometry(1.55, 64, 32), MAT.dokum, (o) => o.scale.set(1, 1, 0.85)));
  const spinner = mesh(lathe([[2.05, 0], [2.0, 0.9], [1.7, 2.0], [1.1, 3.0], [0.4, 3.6], [0.001, 3.75]], 72), MAT.boya.clone(), (o) => {
    o.rotation.x = Math.PI / 2;
    o.position.z = -0.6;
  });
  spinner.material.side = THREE.DoubleSide;
  gobek.add(spinner);
  rotor.add(gobek);
  P.gobek = {obj: gobek, mat: MAT.dokum};
  P.spinner = {obj: spinner, mat: spinner.material};
  const kanatG = kanatGeo();
  const kanatlar = [];
  const yataklar = [];
  for (let i = 0; i < 3; i++) {
    const kol = new THREE.Group();
    kol.rotation.z = (i / 3) * Math.PI * 2;
    const cone = new THREE.Group();
    cone.rotation.x = T.precone * D2R;
    kol.add(cone);
    const yat = new THREE.Group();
    yat.add(mesh(new THREE.TorusGeometry(1.25, 0.16, 16, 64), MAT.parlak, (o) => {
      o.rotation.x = Math.PI / 2;
      o.position.y = 1.55;
    }));
    yat.add(mesh(disliGeo(90, 1.08, 0.22, 0, true), MAT.celik, (o) => {
      o.rotation.x = Math.PI / 2;
      o.position.y = 1.72;
    }));
    cone.add(yat);
    yataklar.push(yat);
    const pitch = new THREE.Group();
    pitch.position.y = 1.5;
    const km = MAT.boya.clone();
    const k = mesh(kanatG, km);
    pitch.add(k);
    // kök flanşı
    pitch.add(mesh(cyl(1.82, 1.82, 0.25, 64), MAT.celik, (o) => (o.position.y = 0.12)));
    cone.add(pitch);
    rotor.add(kol);
    kanatlar.push({kol, pitch, mesh: k, mat: km});
  }
  P.kanat = {obj: kanatlar[0].mesh, mat: kanatlar[0].mat};
  P.pitchYatak = {obj: yataklar[0], mat: MAT.parlak};

  // pozlama
  const pose = (s) => {
    // s: {rotor (rad), pitch (°), yaw (rad), hs (rad), ex 0..1, kesit 0..1, xray 0..1}
    rotor.rotation.z = s.rotor;
    for (const k of kanatlar) k.pitch.rotation.y = -(s.pitch ?? 0) * D2R;
    yavas.rotation.z = s.rotor;
    planetler.rotation.z = s.rotor * 0.0; // taşıyıcı ile döner: görünürde halkaya göre
    planetler.children.forEach((p, i) => (p.rotation.z = -s.rotor * 2.6));
    planetler.rotation.z = s.rotor;
    gunes.rotation.z = s.rotor * 5.2;
    hizli.rotation.z = s.hs ?? s.rotor * T.disli;
    P.jenerator.obj.rotation.z = 0;
    yaw.rotation.y = s.yaw ?? 0;
    anemo.rotation.y = (s.anemo ?? 0);
    const e = s.ex ?? 0;
    for (const k of ['anaMil', 'anaRulman', 'sanziman', 'hizliMil', 'jenerator', 'cevirici', 'trafo', 'sogutucu']) {
      const o = P[k].obj;
      o.position.copy(o.userData.p0).addScaledVector(o.userData.ex, e);
    }
    kaliper.position.set(0, HSY + 0.6, -8.58 - 2.6 * e);
    const kab = 1 - (s.ex ?? 0) * 0.0;
    kapak.visible = (s.kapak ?? 1) > 0.01;
    kabukMat.opacity = s.kapak ?? 1;
    kabukMat.transparent = (s.kapak ?? 1) < 0.999;
    kabukMat.depthWrite = !kabukMat.transparent;
    kabMat.opacity = 1 - 0.85 * (s.sanzXray ?? 0);
    kabMat.depthWrite = (s.sanzXray ?? 0) < 0.5;
    icler.visible = (s.sanzXray ?? 0) > 0.02;
    void kab;
  };
  return {root, P, kule, nasel, yaw, rotor, tahrik, kanatlar, temel, pose, kabukMat, HUBY};
}

// ------------------------------------------------------------ sergi kanadı: kalıp ve katman kesiti (r = 24 m)
export function buildSergi() {
  const g = new THREE.Group();
  const geo = kanatGeo(64);
  const KES = 22.5, ARA = 6; // kesit yeri (kanat boyu) ve açılan boşluk
  const planeA = new THREE.Plane(new V3(0, -1, 0), KES); // y < KES
  const planeB = new THREE.Plane(new V3(0, 1, 0), -KES); // y > KES (kaydırılmış parça)
  const mA = MAT.boya.clone();
  mA.clippingPlanes = [planeA];
  mA.side = THREE.DoubleSide;
  const mB = MAT.boya.clone();
  mB.clippingPlanes = [planeB];
  mB.side = THREE.DoubleSide;
  const iki = new THREE.Group();
  const a = mesh(geo, mA);
  const b = mesh(geo, mB);
  iki.add(a, b);
  // kesit dilimi: profil r = KES+1.5
  const r = KES + 1.5;
  const c = tab(KIRIS, r), t = kalinlik(r), tw = tab(BURUL, r) * D2R;
  const N = 96;
  const dis = profil(N, c, t, 1);
  const ic = profil(N, c * 0.94, t * 0.86, 1).map(([x, z]) => [x + c * 0.015, z]);
  const shp = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
    return s;
  };
  const ext = (s, d) => {
    const e = new THREE.ExtrudeGeometry(s, {depth: d, bevelEnabled: false, curveSegments: 4});
    e.translate(0, 0, -d / 2);
    e.rotateX(Math.PI / 2); // şekil (x,z) → dünya (x, -, z)... düzlem y'ye dik
    return e;
  };
  const dilim = new THREE.Group();
  const kat = {};
  // dış kabuk: cam elyaf
  kat.cam = mesh(ext(shp(dis, [ic.slice().reverse()]), 0.5), MAT.cam);
  // karbon kiriş başlıkları (üst/alt), kesme gövdeleri, çekirdek
  const yz = (x) => {
    // x konumunda iç profilin üst/alt z'si
    let up = -1e9, lo = 1e9;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const [x0, z0] = ic[i], [x1, z1] = ic[j];
      if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) {
        const z = z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
        up = Math.max(up, z);
        lo = Math.min(lo, z);
      }
    }
    return [lo, up];
  };
  const kap = (x0, x1, ust, kal) => {
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const x = x0 + ((x1 - x0) * k) / 12;
      const [lo, up] = yz(x);
      pts.push([x, ust ? up : lo]);
    }
    for (let k = 12; k >= 0; k--) {
      const x = x0 + ((x1 - x0) * k) / 12;
      const [lo, up] = yz(x);
      pts.push([x, ust ? up - kal : lo + kal]);
    }
    return pts;
  };
  const sx0 = -0.12 * c, sx1 = 0.22 * c;
  kat.karbonU = mesh(ext(shp(kap(sx0, sx1, true, 0.09)), 0.52), MAT.karbon);
  kat.karbonA = mesh(ext(shp(kap(sx0, sx1, false, 0.09)), 0.52), MAT.karbon);
  const web = (x) => {
    const [lo, up] = yz(x);
    return [[x - 0.035, lo + 0.08], [x + 0.035, lo + 0.08], [x + 0.035, up - 0.08], [x - 0.035, up - 0.08]];
  };
  kat.web1 = mesh(ext(shp(web(sx0 + 0.05)), 0.52), MAT.balsa);
  kat.web2 = mesh(ext(shp(web(sx1 - 0.05)), 0.52), MAT.balsa);
  // firar kenarı çekirdeği (köpük/balsa sandviç)
  kat.cekirdek = mesh(ext(shp([...kap(sx1 + 0.05, 0.6 * c, true, 0.05)]), 0.5), MAT.balsa);
  kat.cekirdek2 = mesh(ext(shp([...kap(sx1 + 0.05, 0.6 * c, false, 0.05)]), 0.5), MAT.balsa);
  for (const k in kat) dilim.add(kat[k]);
  dilim.rotation.y = -tw;
  dilim.position.y = KES;
  g.add(iki);
  g.add(dilim);
  // kalıp yarısı: kanadın altında uzun oluk
  const kalip = new THREE.Group();
  {
    const N2 = 40;
    const pos = [], idx = [];
    const RS = [];
    for (let y = 0; y <= 62; y += 1.5) RS.push(y);
    RS.forEach((y) => {
      const rr = y + 1.5;
      const cc = tab(KIRIS, rr) * 1.25 + 0.6;
      for (let i = 0; i <= N2; i++) {
        const u = i / N2;
        const x = (u - 0.5) * cc * 1.3;
        const z = 0.9 + Math.cos((u - 0.5) * Math.PI) * -cc * 0.32 - 0.25;
        pos.push(x, y, z);
      }
    });
    for (let j = 0; j < RS.length - 1; j++)
      for (let i = 0; i < N2; i++) {
        const a2 = j * (N2 + 1) + i, b2 = a2 + 1, c2 = a2 + N2 + 1, d2 = c2 + 1;
        idx.push(a2, b2, c2, b2, d2, c2);
      }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setIndex(idx);
    gg.computeVertexNormals();
    const km = MAT.kalip.clone();
    km.side = THREE.DoubleSide;
    kalip.add(mesh(gg, km));
    // ayaklar
    for (let y = 2; y < 62; y += 6) kalip.add(mesh(new THREE.BoxGeometry(5.5, 0.3, 0.3), MAT.koyu, (o) => o.position.set(0, y, -1.4)));
  }
  // yerleşim: kanat yerel y (açıklık) → dünya x, yerel z (kalınlık) → dünya y, yerel x (kiriş) → dünya z
  const ust = new THREE.Group();
  const yat = new THREE.Group();
  yat.add(g);
  yat.add(kalip);
  kalip.position.z = -0.9;
  yat.matrixAutoUpdate = false;
  yat.matrix.makeBasis(new V3(0, 0, 1), new V3(1, 0, 0), new V3(0, 1, 0));
  ust.add(yat);
  return {
    root: ust,
    kat,
    dilim,
    iki,
    b,
    KES: r,
    kalip,
    set(s) {
      // s.ac: boşluk 0..1, s.kalip 0..1 (kalıp görünür), s.dilim: dilim dışarı
      b.position.y = ARA * (s.ac ?? 0);
      // kırpma düzlemleri dünya uzayında: kanat yerel y ekseni boyunca
      ust.updateMatrixWorld(true);
      const o = yat.localToWorld(new V3(0, KES, 0)), o2 = yat.localToWorld(new V3(0, KES + ARA * (s.ac ?? 0), 0));
      const ax = yat.localToWorld(new V3(0, KES + 1, 0)).sub(o).normalize();
      planeA.setFromNormalAndCoplanarPoint(ax.clone().negate(), o);
      planeB.setFromNormalAndCoplanarPoint(ax, o2);
      dilim.position.y = KES + ARA * 0.5 * (s.ac ?? 0);
      dilim.visible = (s.ac ?? 0) > 0.02;
      dilim.position.x = -(s.dilim ?? 0) * 0.0;
      // katmanları sırayla ayır
      const e = s.katman ?? 0;
      kat.cam.position.y = 0;
      kat.karbonU.position.y = 0;
      const off = [['cam', 0], ['karbonU', 0.8], ['karbonA', -0.8], ['web1', 1.6], ['web2', 2.4], ['cekirdek', 3.2], ['cekirdek2', 4.0]];
      for (const [k, o] of off) kat[k].position.set(0, o * 0.0 + e * (o * 0.22), 0);
      kalip.visible = (s.kalip ?? 1) > 0.01;
    },
  };
}

// ------------------------------------------------------------ taşıma tırı: çekici + uzatılabilir dorse + kanat
export function buildTir() {
  const g = new THREE.Group();
  const kabin = new THREE.Group();
  const kmat = std('#d3d6da', 0.3, 0.4);
  kabin.add(mesh(new RoundedBoxGeometry(2.5, 2.9, 2.3, 4, 0.25), kmat, (o) => o.position.set(0, 2.45, 0)));
  kabin.add(mesh(new THREE.BoxGeometry(2.3, 0.9, 0.05), std('#30353c', 0.9, 0.15), (o) => o.position.set(0, 3.0, 1.16)));
  kabin.add(mesh(new THREE.BoxGeometry(2.5, 0.5, 6.5), MAT.koyu, (o) => o.position.set(0, 1.0, -1.9)));
  kabin.add(mesh(new THREE.BoxGeometry(2.4, 0.6, 0.3), MAT.celik, (o) => o.position.set(0, 1.0, 1.25)));
  g.add(kabin);
  const tekerG = cyl(0.52, 0.52, 0.4, 32);
  const tekerler = [];
  const teker = (x, z) => {
    const t = mesh(tekerG, MAT.lastik, (o) => {
      o.rotation.z = Math.PI / 2;
      o.position.set(x, 0.52, z);
    });
    g.add(t);
    tekerler.push(t);
    const j = mesh(cyl(0.3, 0.3, 0.42, 16), MAT.celik, (o) => {
      o.rotation.z = Math.PI / 2;
      o.position.set(x, 0.52, z);
    });
    g.add(j);
  };
  for (const z of [0.2, -3.6, -4.8]) for (const x of [-1.05, 1.05]) teker(x, z);
  // dorse: sabit kiriş + uzayan kiriş + arka dingiller
  const dorse = new THREE.Group();
  dorse.add(mesh(new THREE.BoxGeometry(1.2, 0.7, 26), MAT.sari, (o) => o.position.set(0, 1.35, -17)));
  const uzay = mesh(new THREE.BoxGeometry(0.9, 0.5, 26), MAT.sari, (o) => o.position.set(0, 1.35, -30));
  dorse.add(uzay);
  const arka = new THREE.Group();
  arka.add(mesh(new THREE.BoxGeometry(2.6, 0.6, 7.2), MAT.koyu, (o) => o.position.set(0, 1.35, 0)));
  for (const z of [-2.7, -1.35, 0, 1.35, 2.7]) for (const x of [-1.05, 1.05]) {
    const t = mesh(tekerG, MAT.lastik, (o) => {
      o.rotation.z = Math.PI / 2;
      o.position.set(x, 0.52, z);
    });
    arka.add(t);
    tekerler.push(t);
  }
  dorse.add(arka);
  g.add(dorse);
  // kanat: kök önde (çekiciye yakın), kiriş yatay
  const kanat = new THREE.Group();
  const km = MAT.boya.clone();
  const k = mesh(kanatGeo(48), km);
  k.rotation.x = -Math.PI / 2; // açıklık -z, kiriş yatay
  kanat.add(k);
  kanat.position.set(0, 3.9, -6.2);
  g.add(kanat);
  // kök sehpası
  g.add(mesh(new THREE.BoxGeometry(2.4, 2.0, 0.6), MAT.koyu, (o) => o.position.set(0, 2.2, -6.5)));
  return {
    root: g,
    kanat,
    kanatMat: km,
    set(s) {
      // s.uzat 0..1, s.teker (rad)
      const L = 20 * (s.uzat ?? 1);
      uzay.position.z = -30 - L * 0.5 + 0;
      arka.position.z = -36 - L;
      for (const t of tekerler) t.rotation.x = s.teker ?? 0;
    },
    boy: () => 61.5,
  };
}

// ------------------------------------------------------------ paletli vinç: kafes bom
export function buildVinc() {
  const g = new THREE.Group();
  const VM = std('#3a3f46', 0.4, 0.5);
  const VS = std('#e3b13a', 0.2, 0.45);
  for (const x of [-3.2, 3.2]) {
    const p = rbox(1.6, 1.6, 12, 0.5, VM);
    p.position.set(x, 0.8, 0);
    g.add(p);
  }
  const ust = new THREE.Group();
  ust.add(rbox(6, 2.2, 9, 0.3, VS));
  ust.children[0].position.set(0, 2.9, -1);
  ust.add(rbox(2.2, 2.4, 2.6, 0.25, VM));
  ust.children[1].position.set(2.2, 4.4, 2.2);
  ust.add(mesh(new THREE.BoxGeometry(5.5, 3.5, 2.2), VM, (o) => o.position.set(0, 3.6, -5.3))); // karşı ağırlık
  g.add(ust);
  // kafes bom: kare kesit 2.4 m, boy 128 m
  const BOM = 128, S = 2.4, n = 64;
  const bom = new THREE.Group();
  const birim = cyl(1, 1, 1, 8);
  const cubuk = (a, b, r) => {
    const d = new V3().subVectors(b, a);
    const L = d.length();
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize());
    m4.compose(a.clone().add(b).multiplyScalar(0.5), q, new V3(r, L, r));
    return m4;
  };
  const M = [];
  const k = (i, j) => new V3((j & 1 ? 1 : -1) * S * 0.5 * (1 - (i / n) * 0.3), (j & 2 ? 1 : -1) * S * 0.5 * (1 - (i / n) * 0.3), (i / n) * BOM);
  for (let j = 0; j < 4; j++) M.push([cubuk(k(0, j), k(n, j), 0.11), 0]);
  const yuz = [[0, 1], [1, 3], [3, 2], [2, 0]];
  for (let i = 0; i < n; i++)
    for (const [a, b] of yuz) {
      M.push([cubuk(k(i, i % 2 ? a : b), k(i + 1, i % 2 ? b : a), 0.045), 1]);
      if (i % 4 === 0) M.push([cubuk(k(i, a), k(i, b), 0.05), 1]);
    }
  const ana = new THREE.InstancedMesh(birim, VS, M.length);
  M.forEach(([m4], i) => ana.setMatrixAt(i, m4));
  ana.castShadow = true;
  bom.add(ana);
  bom.position.set(0, 3.4, 3.0);
  ust.add(bom);
  // halat + kanca
  const halatG = new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, -1, 0)]);
  const halat = new THREE.LineSegments(halatG, new THREE.LineBasicMaterial({color: '#2a2d31'}));
  g.add(halat);
  const kanca = rbox(0.9, 1.4, 0.9, 0.2, VS);
  g.add(kanca);
  return {
    root: g,
    bom,
    ust,
    BOM,
    set(s) {
      // s.aci (rad, yatayla), s.don (rad, üst dönüş), s.yuk V3 dünya (kanca)
      bom.rotation.x = -(s.aci ?? 1.3);
      ust.rotation.y = s.don ?? 0;
      g.updateMatrixWorld(true);
      const uc = new V3(0, 0, BOM).applyMatrix4(bom.matrixWorld);
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const ucL = uc.clone().applyMatrix4(inv);
      const yuk = (s.yuk ?? uc.clone().add(new V3(0, -20, 0))).clone().applyMatrix4(inv);
      halat.geometry.setFromPoints([ucL, yuk.clone().add(new V3(0, 0.7, 0))]);
      kanca.position.copy(yuk);
      return uc;
    },
  };
}
