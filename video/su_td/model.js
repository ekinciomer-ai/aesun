// Hidroelektrik santrali (Atatürk Barajı referanslı), metre cinsinden, koddan: kaya dolgu baraj (kil çekirdek, filtre,
// kaya dolgu, anroşman; kesitli), rezervuar, mansap nehri, vadi yamaçları, su alma yapısı, 8 cebri boru, santral binası
// (8 ünite). Ayrı dünyalar: Francis ünitesi yakın plan (salyangoz, sabit kanatlar, ayar kanatları, çark, emme borusu,
// mil, jeneratör), su döngüsü dioraması, pompaj depolamalı santral dioraması, Üç Boğaz beton ağırlık barajı.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const V3 = THREE.Vector3;
export const ACC = '#1590b5';
export const MAT = {};
export const KES = new THREE.Plane(new V3(-1, 0, 0), 1e6);
const std = (c, m, r, x = {}) => new THREE.MeshStandardMaterial({color: c, metalness: m, roughness: r, envMapIntensity: 0.55, ...x});
export function mats() {
  MAT.kaya = std('#b9b2a6', 0, 0.95);
  MAT.kil = std('#a4876a', 0, 0.95);
  MAT.filtre = std('#d8cdb5', 0, 0.95);
  MAT.anrosman = std('#8b8780', 0, 0.9);
  MAT.toprak = std('#cdbf9f', 0, 0.95);
  MAT.su = std('#5aa3c2', 0.15, 0.12, {transparent: true, opacity: 0.88});
  MAT.beton = std('#d9d6cf', 0, 0.85);
  MAT.betonK = std('#d9d6cf', 0, 0.85, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.celik = std('#a8adb3', 0.85, 0.36);
  MAT.celikK = std('#a8adb3', 0.85, 0.36, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.boru = std('#7f8a93', 0.75, 0.42);
  MAT.parlak = std('#cdd2d7', 1, 0.24);
  MAT.koyu = std('#30343a', 0.35, 0.55);
  MAT.dokum = std('#5d636b', 0.45, 0.5);
  MAT.yesil = std('#6f8f7a', 0.25, 0.5);
  MAT.boya = std('#eceef0', 0, 0.45);
  MAT.sari = std('#e3b13a', 0.2, 0.45);
  MAT.bakir = std('#c27a45', 0.9, 0.35);
  MAT.acc = std(ACC, 0.1, 0.4, {emissive: new THREE.Color(ACC), emissiveIntensity: 0.3});
  return MAT;
}
const mesh = (g, m, f) => {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true;
  o.receiveShadow = true;
  if (f) f(o);
  return o;
};
const cyl = (r1, r2, h, seg = 64, open = false) => new THREE.CylinderGeometry(r1, r2, h, seg, 1, open);
const lathe = (prof, seg = 96) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);

// ------------------------------------------------------------ baraj: kesit bölgeleri (z, y), x boyunca uzatılır
export const BRJ = {H: 169, kret: 16, L: 900, egim: 2.2};
const kesitGeo = (pts, x0, x1) => {
  const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
  const g = new THREE.ExtrudeGeometry(sh, {depth: x1 - x0, bevelEnabled: false, curveSegments: 4});
  g.rotateY(Math.PI / 2);
  g.translate(x0, 0, 0);
  return g;
};
// tip 'beton': Hoover tipi beton kemer-ağırlık (221 m, tabanda 201 m, krette 14 m)
export function buildBaraj(tip = 'kaya') {
  const g = new THREE.Group();
  const BETON = tip === 'beton';
  if (BETON) Object.assign(BRJ, {H: 221, kret: 14, egim: 0.43});
  const H = BRJ.H, k = BRJ.kret / 2, e = BRJ.egim;
  const T = BETON ? 190 : H * e + k; // taban yarım genişliği
  const dis = BETON ? [[-12, 0], [-7, H], [7, H], [189, 0]] : [[-T, 0], [-k, H], [k, H], [T, 0]];
  const cek = [[-62, 0], [-7, H - 4], [7, H - 4], [62, 0]];
  const fil = [[-84, 0], [-11, H - 3], [11, H - 3], [84, 0]];
  const anr = [[-T, 0], [-k, H], [-k + 0.1, H], [-T + 9, 0]];
  const parcalar = [];
  // iki yarım: A (x -450..0, kesit yüzü x=0'da görünür), B (0..450)
  for (const [x0, x1, ad] of [[-BRJ.L / 2, 0, 'A'], [0, BRJ.L / 2, 'B']]) {
    const y = new THREE.Group();
    if (BETON) {
      y.add(mesh(kesitGeo(dis, x0, x1), MAT.beton));
      // muayene galerileri (kesit yüzünde koyu boşluklar)
      for (const [z, yy] of [[0, 30], [20, 70], [10, 120], [2, 170], [60, 25], [110, 25]])
        y.add(mesh(new THREE.BoxGeometry(x1 - x0 + 0.6, 3, 2.5), MAT.koyu, (o) => o.position.set((x0 + x1) / 2, yy, z)));
    } else {
      y.add(mesh(kesitGeo(dis, x0, x1), MAT.kaya));
      y.add(mesh(kesitGeo(fil, x0, x1 + (ad === 'A' ? 0.4 : -0.4)), MAT.filtre));
      y.add(mesh(kesitGeo(cek, x0, x1 + (ad === 'A' ? 0.8 : -0.8)), MAT.kil));
      y.add(mesh(kesitGeo([[-T - 0.5, 0], [-k - 0.3, H + 0.3], [-k + 1.5, H + 0.3], [-T + 8, 0]], x0, x1), MAT.anrosman));
    }
    // kret yolu
    y.add(mesh(new THREE.BoxGeometry(x1 - x0, 1.2, BRJ.kret), MAT.beton, (o) => o.position.set((x0 + x1) / 2, H + 0.6, 0)));
    y.userData.ad = ad;
    g.add(y);
    parcalar.push(y);
  }
  void anr;
  // vadi yamaçları (sol/sağ dayanak)
  const yamac = new THREE.Group();
  for (const s of [-1, 1]) {
    const pts = [];
    const geo = new THREE.PlaneGeometry(900, 3200, 60, 120);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const u = (x + 450) / 900; // 0 vadi tarafı, 1 dış
      const h = 185 * Math.min(1, Math.pow(u * 1.6, 0.9)) + 18 * Math.sin(z * 0.004 + s) + 8 * Math.sin(z * 0.013 + x * 0.01);
      p.setY(i, Math.max(0, h));
    }
    geo.computeVertexNormals();
    void pts;
    const m = mesh(geo, MAT.toprak);
    m.scale.x = s;
    m.position.set(s * (BRJ.L / 2 + 450 - 10), 0, 0);
    yamac.add(m);
  }
  g.add(yamac);
  // rezervuar ve mansap
  const rez = mesh(new THREE.PlaneGeometry(BRJ.L + 200, 1800), MAT.su, (o) => {
    o.rotation.x = -Math.PI / 2;
    o.position.set(0, H - 9, -T * 0.55 - 900);
    o.castShadow = false;
  });
  g.add(rez);
  const mansap = mesh(new THREE.PlaneGeometry(160, 1500), MAT.su, (o) => {
    o.rotation.x = -Math.PI / 2;
    o.position.set(-150, 6, T + 760);
    o.castShadow = false;
  });
  g.add(mansap);
  // su alma kulesi + 8 cebri boru (mansap yüzünde) + santral binası
  const borular = [];
  const santral = new THREE.Group();
  const SZ = T + 40, SX = -150;
  for (let i = 0; i < 8; i++) {
    const x = SX - 105 + i * 30;
    const c = new THREE.CatmullRomCurve3([new V3(x, H - 30, -k - 30), new V3(x, H - 34, k + 4), new V3(x, H - 40, k + 14), new V3(x, 22, T - 6), new V3(x, 14, SZ - 18)], false, 'centripetal');
    const b = mesh(new THREE.TubeGeometry(c, 120, 3.6, 24), MAT.boru);
    g.add(b);
    borular.push(c);
    // ankraj blokları
    for (let t = 0.3; t < 0.95; t += 0.12) {
      const p = c.getPointAt(t);
      g.add(mesh(new THREE.BoxGeometry(11, 5, 7), MAT.beton, (o) => o.position.set(p.x, p.y - 3.5, p.z)));
    }
  }
  // su alma yapısı (memba yüzünde)
  g.add(mesh(new THREE.BoxGeometry(260, 40, 18), MAT.beton, (o) => o.position.set(SX, H - 24, -k - 34)));
  // santral binası (kesitli)
  santral.add(mesh(new THREE.BoxGeometry(270, 48, 70), MAT.betonK, (o) => o.position.set(SX, 24, SZ + 10)));
  santral.add(mesh(new THREE.BoxGeometry(274, 2, 74), MAT.betonK, (o) => o.position.set(SX, 48.5, SZ + 10)));
  const uniteler = [];
  const NU = BETON ? 17 : 8;
  for (let i = 0; i < NU; i++) {
    const x = SX - 120 + (i * 240) / (NU - 1);
    const sc = BETON ? 0.62 : 1;
    const u = new THREE.Group();
    u.add(mesh(cyl(9, 9, 6, 48), MAT.yesil, (o) => (o.position.y = 3)));
    u.add(mesh(cyl(5, 5, 2, 48), MAT.dokum, (o) => (o.position.y = 7)));
    u.add(mesh(cyl(1.5, 1.5, 3, 24), MAT.koyu, (o) => (o.position.y = 9.5)));
    u.position.set(x, 18, SZ + 4);
    u.scale.setScalar(sc);
    santral.add(u);
    uniteler.push(u);
  }
  // köprülü vinç
  santral.add(mesh(new THREE.BoxGeometry(4, 3, 66), MAT.sari, (o) => o.position.set(SX + 40, 42, SZ + 10)));
  g.add(santral);
  return {root: g, parcalar, borular, santral, uniteler, T, SZ, SX, rez, mansap, yamac};
}

// ------------------------------------------------------------ Francis ünitesi (yakın plan, temsili ölçek)
export function buildUnite() {
  const g = new THREE.Group();
  // salyangoz: azalan kesitli tüp, merkez ekseni y
  const spiral = new THREE.Group();
  {
    const N = 26;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 1.9, a1 = ((i + 1) / N) * Math.PI * 1.9;
      const r = 3.4 - (i / N) * 2.4;
      const R = 8.0 + r * 0.8;
      const c = new THREE.CatmullRomCurve3([new V3(Math.cos(a0) * R, 0, Math.sin(a0) * R), new V3(Math.cos((a0 + a1) / 2) * R, 0, Math.sin((a0 + a1) / 2) * R), new V3(Math.cos(a1) * (R - 0.09), 0, Math.sin(a1) * (R - 0.09))]);
      spiral.add(mesh(new THREE.TubeGeometry(c, 4, r, 32, false), MAT.celikK));
    }
    // giriş borusu
    const c = new THREE.CatmullRomCurve3([new V3(11.2, 0, -16), new V3(11.2, 0, -4), new V3(11.0, 0, 0)]);
    spiral.add(mesh(new THREE.TubeGeometry(c, 8, 3.4, 32, false), MAT.celikK));
  }
  g.add(spiral);
  // sabit kanatlar (stay vanes) ve ayar kanatları (wicket gates)
  const ayar = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.25, 2.4, 1.6), MAT.dokum, (o) => {
      o.position.set(Math.cos(a) * 6.6, 0, Math.sin(a) * 6.6);
      o.rotation.y = -a + 0.6;
    }));
    const w = mesh(new THREE.BoxGeometry(0.16, 2.2, 1.3), MAT.parlak, (o) => o.position.set(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2));
    w.userData.a = a;
    g.add(w);
    ayar.push(w);
  }
  // çark: taç, bilezik, 15 eğri kanat
  const cark = new THREE.Group();
  cark.add(mesh(lathe([[0.6, 1.3], [3.6, 1.25], [4.2, 1.0], [4.25, 0.9], [3.4, 0.6], [1.2, 0.4], [0.6, 0.2]], 96), MAT.parlak));
  cark.add(mesh(lathe([[4.25, -1.2], [4.1, -1.4], [3.4, -2.6], [3.0, -3.4], [3.15, -3.5], [3.6, -2.6], [4.35, -1.3]], 96), MAT.parlak));
  {
    const nu = 16, nv = 8;
    for (let b = 0; b < 15; b++) {
      const pos = [], idx = [];
      for (let iu = 0; iu <= nu; iu++)
        for (let iv = 0; iv <= nv; iv++) {
          const u = iu / nu, v = iv / nv;
          const th = (b / 15) * Math.PI * 2 + u * 1.25 + v * 0.25;
          const r = 4.15 - u * (1.1 + v * 0.8);
          const y = 0.75 - v * (2.0 + u * 0.7) - u * 0.5;
          pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
        }
      for (let iu = 0; iu < nu; iu++)
        for (let iv = 0; iv < nv; iv++) {
          const a = iu * (nv + 1) + iv, c = a + nv + 1;
          idx.push(a, c, a + 1, a + 1, c, c + 1);
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const m = MAT.parlak.clone();
      m.side = THREE.DoubleSide;
      cark.add(mesh(geo, m));
    }
  }
  cark.add(mesh(cyl(0.9, 0.3, 2.2, 32), MAT.dokum, (o) => (o.position.y = -0.8)));
  g.add(cark);
  // emme borusu (dirsek)
  {
    const c = new THREE.CatmullRomCurve3([new V3(0, -3.4, 0), new V3(0, -9, 0), new V3(0, -13, 4), new V3(0, -14, 16)]);
    const geo = new THREE.TubeGeometry(c, 60, 1, 40, false);
    const p = geo.attributes.position;
    // yarıçap uca doğru büyür
    const tmp = new V3();
    for (let i = 0; i < p.count; i++) {
      const seg = Math.floor(i / 41) / 60;
      const cp = c.getPointAt(seg);
      tmp.set(p.getX(i), p.getY(i), p.getZ(i)).sub(cp).multiplyScalar(3.1 + seg * 2.6);
      p.setXYZ(i, cp.x + tmp.x, cp.y + tmp.y, cp.z + tmp.z);
    }
    geo.computeVertexNormals();
    g.add(mesh(geo, MAT.betonK));
  }
  // mil ve jeneratör
  const mil = mesh(cyl(0.7, 0.7, 14, 48), MAT.parlak, (o) => (o.position.y = 8));
  g.add(mil);
  const jen = new THREE.Group();
  jen.add(mesh(cyl(8.5, 8.5, 5.5, 96, false), MAT.yesil, (o) => (o.position.y = 0)));
  jen.add(mesh(cyl(9.2, 9.2, 0.8, 96), MAT.dokum, (o) => (o.position.y = 3.1)));
  jen.add(mesh(cyl(3.2, 3.2, 1.8, 64), MAT.dokum, (o) => (o.position.y = 4.4)));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    jen.add(mesh(new THREE.BoxGeometry(6, 0.8, 1), MAT.dokum, (o) => {
      o.position.set(Math.cos(a) * 6, 3.5, Math.sin(a) * 6);
      o.rotation.y = -a;
    }));
  }
  const rotorJ = new THREE.Group();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    rotorJ.add(mesh(new THREE.BoxGeometry(1.1, 4.6, 0.9), MAT.bakir || MAT.sari, (o) => {
      o.position.set(Math.cos(a) * 6.9, 0, Math.sin(a) * 6.9);
      o.rotation.y = -a;
    }));
  }
  jen.add(rotorJ);
  jen.position.y = 16;
  g.add(jen);
  // su akış yolları (parçacıklar için)
  const yollar = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const pts = [new V3(11.2, 0, -16), new V3(11.2, 0, -2)];
    for (let k = 0; k <= 8; k++) {
      const aa = (k / 8) * (a + 0.01);
      const R = 9.5 - (aa / (Math.PI * 2)) * 1.5;
      pts.push(new V3(Math.cos(aa) * R, 0, Math.sin(aa) * R));
    }
    pts.push(new V3(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2), new V3(Math.cos(a + 1) * 3.4, -1.0, Math.sin(a + 1) * 3.4), new V3(Math.cos(a + 1.5) * 1.6, -3.4, Math.sin(a + 1.5) * 1.6), new V3(Math.cos(a) * 1.5, -9, Math.sin(a) * 1.5), new V3(Math.cos(a) * 2, -13, 6), new V3(Math.cos(a) * 3, -14, 16));
    yollar.push(new THREE.CatmullRomCurve3(pts, false, 'centripetal'));
  }
  return {root: g, cark, ayar, jen, rotorJ, mil, spiral, yollar};
}

// ------------------------------------------------------------ diorama zemini (yükseklik fonksiyonu ile)
export function arazi(W, D, n, hf, renk) {
  const geo = new THREE.PlaneGeometry(W, D, n, n);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const h = hf(x, z);
    p.setY(i, h);
    renk(h, c);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = mesh(geo, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.95, envMapIntensity: 0.4}));
  // diorama kenar duvarları (kesit görünümü)
  const g = new THREE.Group();
  g.add(m);
  const kenar = (pts) => {
    const shp = new THREE.Shape();
    shp.moveTo(pts[0][0], -20);
    for (const [s, h] of pts) shp.lineTo(s, h);
    shp.lineTo(pts[pts.length - 1][0], -20);
    shp.closePath();
    return new THREE.ShapeGeometry(shp);
  };
  const N = 80;
  const mk = new THREE.MeshStandardMaterial({color: '#bda98a', roughness: 0.95, side: THREE.DoubleSide});
  for (const zz of [-D / 2, D / 2]) {
    const pts = Array.from({length: N + 1}, (_, i) => {
      const x = -W / 2 + (i / N) * W;
      return [x, hf(x, zz)];
    });
    g.add(mesh(kenar(pts), mk, (o) => (o.position.z = zz)));
  }
  for (const xx of [-W / 2, W / 2]) {
    const pts = Array.from({length: N + 1}, (_, i) => {
      const z = -D / 2 + (i / N) * D;
      return [z, hf(xx, z)];
    });
    g.add(mesh(kenar(pts), mk, (o) => {
      o.rotation.y = -Math.PI / 2;
      o.position.x = xx;
    }));
  }
  return g;
}

// ------------------------------------------------------------ Üç Boğaz: beton ağırlık barajı (2335 m, 181 m)
export function buildUcBogaz() {
  const g = new THREE.Group();
  const H = 181, L = 2335;
  const sh = [[-60, 0], [-6, H], [12, H], [12, 150], [110, 0]];
  g.add(mesh(kesitGeo(sh, -L / 2, L / 2), MAT.beton));
  // dolusavak kapakları ve santral blokları
  for (let i = 0; i < 23; i++) g.add(mesh(new THREE.BoxGeometry(8, 30, 14), MAT.koyu, (o) => o.position.set(-150 + i * 14, H - 25, 18)));
  for (const [x0, n] of [[-1050, 14], [420, 12]]) {
    for (let i = 0; i < n; i++) g.add(mesh(new THREE.BoxGeometry(32, 46, 40), MAT.boya, (o) => o.position.set(x0 + i * 38, 23, 130)));
  }
  g.add(mesh(new THREE.PlaneGeometry(L + 400, 2400), MAT.su, (o) => {
    o.rotation.x = -Math.PI / 2;
    o.position.set(0, H - 6, -1240);
  }));
  g.add(mesh(new THREE.PlaneGeometry(L, 2000), MAT.su, (o) => {
    o.rotation.x = -Math.PI / 2;
    o.position.set(0, 4, 1150);
  }));
  return {root: g, H, L};
}
