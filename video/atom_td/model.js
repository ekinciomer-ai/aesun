// VVER-1200 tipi basınçlı su reaktörlü santral, metre cinsinden, koddan: çift cidarlı koruma binası (kubbe), reaktör
// basınç kabı (kontrol çubuğu sürücüleri, 163 altıgen yakıt demeti), 4 yatay buhar üreteci, ana pompalar,
// basınçlandırıcı, çekirdek yakalayıcı, türbin binası (YB + 2 AB türbin, jeneratör, kondenser), soğutma kulesi.
// Ayrıca: pelet / yakıt çubuğu / demet (gerçek ölçü), çekirdek modelleri (U-235, fisyon ürünleri).
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const V3 = THREE.Vector3;
export const ACC = '#e0522b';
export const MAT = {};
export const KES = new THREE.Plane(new V3(-1, 0, 0), 0); // kesit düzlemi (dünya)
export const KES2 = new THREE.Plane(new V3(0, 0, 1), 0); // türbin gövdesi kesiti
const std = (c, m, r, x = {}) => new THREE.MeshStandardMaterial({color: c, metalness: m, roughness: r, envMapIntensity: 0.55, ...x});
export function mats() {
  MAT.beton = std('#d6d2c9', 0, 0.88, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.beton2 = std('#c4bfb4', 0, 0.9, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.betonD = std('#d6d2c9', 0, 0.88);
  MAT.boya = std('#eceef0', 0, 0.45);
  MAT.celik = std('#a8adb3', 0.85, 0.36);
  MAT.celikK = std('#a8adb3', 0.85, 0.36, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.parlak = std('#cdd2d7', 1, 0.24);
  MAT.koyu = std('#30343a', 0.35, 0.55);
  MAT.dokum = std('#5d636b', 0.45, 0.5);
  MAT.yesil = std('#7f9a86', 0.2, 0.55);
  MAT.mavi = std('#7d97ad', 0.3, 0.5);
  MAT.bina = std('#dcdfe3', 0.05, 0.6, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.cati = std('#b5bac1', 0.3, 0.55, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.kabK = std('#8f969e', 0.8, 0.4, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.zirk = std('#b9bdc2', 0.9, 0.3);
  MAT.zirkK = std('#b9bdc2', 0.9, 0.3, {clippingPlanes: [KES], side: THREE.DoubleSide});
  MAT.pelet = std('#3b3d40', 0.25, 0.62);
  MAT.komur = std('#1c1d1f', 0.1, 0.82);
  MAT.proton = std('#c9ccd1', 0.15, 0.4);
  MAT.notron = std('#4c535c', 0.15, 0.45);
  MAT.acc = std(ACC, 0.1, 0.4, {emissive: new THREE.Color(ACC), emissiveIntensity: 0.35});
  MAT.ust = std('#e9ebee', 0, 0.55, {clippingPlanes: [KES2], side: THREE.DoubleSide});
  MAT.deniz = std('#aebfcd', 0.2, 0.25);
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
const tube = (pts, r, m, seg = 64) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), seg, r, 20), m);
const hexGeo = (r, h) => {
  const g = cyl(r, r, h, 6);
  g.rotateY(Math.PI / 6);
  return g;
};

// ------------------------------------------------------------ reaktör adası (koruma binası içi)
export const RPV = {y0: 7, h: 11, r: 2.25};
export function buildAda() {
  const g = new THREE.Group();
  const P = {};
  // koruma binası: iç (öngermeli beton) + dış kabuk, kubbe
  const kab = (r, t, H, m) => {
    const prof = [[r, 0], [r, H]];
    for (let i = 1; i <= 24; i++) {
      const a = (i / 24) * (Math.PI / 2);
      prof.push([Math.max(0.001, r * Math.cos(a)), H + r * Math.sin(a)]);
    }
    const o = mesh(lathe(prof, 128), m);
    const ic = mesh(lathe(prof.map(([x, y]) => [Math.max(0.001, x - t), y]).reverse(), 128), m);
    const grp = new THREE.Group();
    grp.add(o, ic);
    // kesit yüzü: halka kalınlığı (kesit düzleminde görünür kapak)
    return grp;
  };
  const dis = kab(25, TIP === 'ap' ? 0.9 : 0.8, 44, MAT.beton2);
  const ic = TIP === 'ap' ? kab(20, 0.05, 40, MAT.celikK) : kab(22, 1.2, 42, MAT.beton);
  g.add(dis, ic);
  if (TIP === 'ap') {
    // pasif soğutma su tankı (kalkan binasının tepesinde halka tank)
    const tank = mesh(lathe([[3.5, 0], [9, 0], [9, 6], [3.5, 6], [3.5, 0]], 96), MAT.betonD);
    tank.position.y = 44 + 25 - 6;
    g.add(tank);
    P.pcs = {obj: tank, at: new V3(0, 72, 0)};
  }
  P.disKoruma = {obj: dis};
  P.icKoruma = {obj: ic};
  // taban ve döşemeler
  g.add(mesh(cyl(26, 26, 3, 128), MAT.beton2, (o) => (o.position.y = -1.5)));
  const doseme = mesh(new THREE.RingGeometry(5.5, 21.8, 128), MAT.beton, (o) => {
    o.rotation.x = -Math.PI / 2;
    o.position.y = 24;
  });
  g.add(doseme);
  // reaktör kuyusu (beton şaft)
  g.add(mesh(lathe([[5.2, 0], [5.2, 23.9], [4.2, 23.9], [4.2, 0.6]], 96), MAT.beton, (o) => (o.position.y = 0)));
  // çekirdek yakalayıcı: kabın altında huni
  const yak = new THREE.Group();
  yak.add(mesh(lathe([[0.001, 0], [2.8, 0], [3.2, 2.6], [2.9, 2.6], [2.5, 0.35], [0.001, 0.35]], 96), MAT.kabK));
  yak.add(mesh(lathe([[2.4, 2.6], [3.4, 3.6], [3.2, 3.7], [2.3, 2.75]], 96), MAT.celikK));
  yak.position.y = 0.7;
  g.add(yak);
  P.yakalayici = {obj: yak};
  // basınç kabı: alt yarım küre, gövde, flanş, kapak, 121 sürücü
  const kap = new THREE.Group();
  const R = RPV.r, Hh = RPV.h;
  const prof = [];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * (Math.PI / 2);
    prof.push([Math.max(0.001, (R + 0.2) * Math.cos(a)), (R + 0.2) * Math.sin(a)]);
  }
  prof.push([R + 0.2, Hh - R], [R + 0.45, Hh - R], [R + 0.45, Hh - R + 0.7]);
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * (Math.PI / 2);
    prof.push([Math.max(0.001, (R + 0.3) * Math.cos(a)), Hh - R + 0.7 + (R * 0.75) * Math.sin(a)]);
  }
  const kabuk = mesh(lathe(prof, 128), MAT.kabK);
  kap.add(kabuk);
  const icP = prof.map(([x, y]) => [Math.max(0.001, x - 0.2), y]).reverse();
  kap.add(mesh(lathe(icP, 128), MAT.kabK));
  // nozullar (4 sıcak, 4 soğuk) — kabın yan yüzünde iki kat
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 4 + Math.floor(i / 2) * (Math.PI / 2) + (i % 2 ? 0.22 : -0.22);
    kap.add(mesh(cyl(0.55, 0.62, 1.4, 32), MAT.celikK, (o) => {
      o.rotation.z = Math.PI / 2;
      o.rotation.y = -a;
      o.position.set(Math.cos(a) * (R + 0.75), Hh - R - (i % 2 ? 1.8 : 0.9), Math.sin(a) * (R + 0.75));
    }));
  }
  // kontrol çubuğu sürücüleri (CRDM) kapağın üstünde
  {
    const pts = [];
    const S = 0.36;
    for (let q = -9; q <= 9; q++)
      for (let r = -9; r <= 9; r++) {
        const x = S * (q + r / 2), z = S * r * 0.866;
        if (Math.hypot(x, z) < 1.85 && pts.length < 121) pts.push([x, z]);
      }
    const im = new THREE.InstancedMesh(cyl(0.07, 0.07, 4.2, 10), MAT.celik, pts.length);
    const m4 = new THREE.Matrix4();
    pts.forEach(([x, z], i) => {
      m4.makeTranslation(x, Hh - R + 0.7 + R * 0.6 + 2.1, z);
      im.setMatrixAt(i, m4);
    });
    im.castShadow = true;
    kap.add(im);
    P.crdm = {obj: im, n: pts.length};
  }
  // çekirdek: 163 altıgen demet (ön görünüm için silindirsel kafes içinde)
  const cek = new THREE.Group();
  {
    const pitch = 0.236;
    const pts = [];
    for (let q = -8; q <= 8; q++)
      for (let r = -8; r <= 8; r++) {
        const x = pitch * (q + r / 2), z = pitch * r * 0.866;
        pts.push([x, z, Math.hypot(x, z)]);
      }
    pts.sort((a, b) => a[2] - b[2]);
    let sec = pts.slice(0, 163);
    let geoD = hexGeo(0.115, 3.73), geoS = hexGeo(0.116, 3.6);
    if (TIP === 'ap') {
      const kp = [];
      for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) kp.push([i * 0.215, j * 0.215, Math.hypot(i, j * 1.0001)]);
      kp.sort((a, b) => a[2] - b[2]);
      sec = kp.slice(0, 157);
      geoD = new THREE.BoxGeometry(0.212, 4.27, 0.212);
      geoS = new THREE.BoxGeometry(0.214, 4.1, 0.214);
    }
    const im = new THREE.InstancedMesh(geoD, MAT.zirkK, sec.length);
    const m4 = new THREE.Matrix4();
    sec.forEach(([x, z], i) => {
      m4.makeTranslation(x, 0, z);
      im.setMatrixAt(i, m4);
    });
    im.castShadow = true;
    cek.add(im);
    const sicak = new THREE.InstancedMesh(geoS, MAT.acc.clone(), sec.length);
    sicak.material.clippingPlanes = [KES];
    sicak.material.transparent = true;
    sec.forEach(([x, z], i) => {
      m4.makeTranslation(x, 0, z);
      sicak.setMatrixAt(i, m4);
    });
    cek.add(sicak);
    P.sicak = {obj: sicak};
    cek.add(mesh(cyl(1.85, 1.85, 4.4, 96, true), MAT.celikK));
    cek.position.y = -R * 0.3 + 2.2;
  }
  kap.add(cek);
  // kontrol çubukları (çekirdeğe inen koyu çubuklar)
  const cubuk = new THREE.Group();
  {
    const im = new THREE.InstancedMesh(cyl(0.05, 0.05, 3.7, 8), MAT.koyu, 61);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let q = -4; q <= 4; q++)
      for (let r = -4; r <= 4; r++) {
        const x = 0.236 * 2 * (q + r / 2) * 0.5 * 2, z = 0.236 * 2 * r * 0.866;
        if (Math.hypot(x, z) < 1.7 && n < 61) {
          m4.makeTranslation(x, 0, z);
          im.setMatrixAt(n++, m4);
        }
      }
    im.count = n;
    cubuk.add(im);
  }
  kap.add(cubuk);
  kap.position.y = RPV.y0 + R;
  g.add(kap);
  P.kap = {obj: kap};
  P.cekirdek = {obj: cek};
  P.cubuk = {obj: cubuk};
  const SGY = RPV.y0 + R + Hh - R - 1.35 + 0.0;
  const ugs = [];
  if (TIP === 'ap') {
    // AP1000: 2 dikey buhar üreteci, her biri 1 sıcak bacak + 2 soğuk bacak ve kanallı motor pompaları
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI;
      const c = new V3(Math.cos(a) * 11, 0, Math.sin(a) * 11);
      const sg = new THREE.Group();
      const prof = [[0.001, -2.0], [1.5, -1.9], [2.2, -1.0], [2.2, 10], [2.9, 12.5], [2.9, 18.5], [2.2, 20.2], [0.9, 20.9], [0.001, 21]];
      sg.add(mesh(lathe(prof, 96), MAT.celikK));
      // iç U-boru demeti
      const im = new THREE.InstancedMesh(cyl(0.04, 0.04, 9, 6), MAT.parlak, 60);
      const m4 = new THREE.Matrix4();
      for (let k = 0; k < 60; k++) {
        const aa = (k / 60) * Math.PI * 2, rr = 0.5 + (k % 4) * 0.4;
        m4.makeTranslation(Math.cos(aa) * rr, 5, Math.sin(aa) * rr);
        im.setMatrixAt(k, m4);
      }
      sg.add(im);
      sg.add(mesh(cyl(0.5, 0.5, 2, 32), MAT.celikK, (o) => o.position.set(0, 21.5, 0)));
      sg.position.set(c.x, RPV.y0 + 2, c.z);
      g.add(sg);
      ugs.push(sg);
      const n1 = new V3(Math.cos(a) * 3.2, RPV.y0 + R + Hh - R - 0.9, Math.sin(a) * 3.2);
      const hot = new V3(c.x * 0.86, RPV.y0 + 0.4, c.z * 0.86);
      const sb = tube([n1, n1.clone().lerp(hot, 0.5).setY(n1.y - 1), hot], 0.48, MAT.celikK);
      g.add(sb);
      for (const s2 of [-1, 1]) {
        const tan = new V3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(s2);
        const pompa = new V3(c.x * 0.95, RPV.y0 - 1.5, c.z * 0.95).addScaledVector(tan, 1.6);
        const n2 = new V3(Math.cos(a + 0.5 * s2) * 3.2, RPV.y0 + R + Hh - R - 1.8, Math.sin(a + 0.5 * s2) * 3.2);
        g.add(tube([pompa.clone().add(new V3(0, -1.3, 0)), pompa.clone().add(new V3(0, -1.6, 0)).lerp(n2, 0.4).setY(n2.y - 2), n2], 0.4, MAT.celikK));
        const pm = new THREE.Group();
        pm.add(mesh(cyl(0.9, 0.9, 2.6, 48), MAT.dokum));
        pm.position.copy(pompa);
        g.add(pm);
        if (i === 0 && s2 === 1) P.pompa = {obj: pm, at: pompa.clone().add(new V3(0, 1.6, 0))};
      }
      if (i === 0) P.sicakBacak = {obj: sb, at: n1.clone().lerp(hot, 0.5).setY(n1.y - 1)};
      sg.userData.hot = [n1, hot];
    }
  } else {
  // 4 döngü: yatay buhar üreteci, sıcak/soğuk bacak, ana pompa
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * (Math.PI / 2);
    const c = new V3(Math.cos(a) * 13, SGY + 3.0, Math.sin(a) * 13);
    const tan = new V3(-Math.sin(a), 0, Math.cos(a));
    const sg = new THREE.Group();
    const L = 13.8;
    const bprof = [];
    for (let k = 0; k <= 12; k++) {
      const b = -Math.PI / 2 + (k / 12) * (Math.PI / 2);
      bprof.push([Math.max(0.001, 2.1 * Math.cos(b)), -L / 2 + 2.1 + 2.1 * Math.sin(b)]);
    }
    for (let k = 0; k <= 12; k++) {
      const b = (k / 12) * (Math.PI / 2);
      bprof.push([Math.max(0.001, 2.1 * Math.cos(b)), L / 2 - 2.1 + 2.1 * Math.sin(b)]);
    }
    const govde = mesh(lathe(bprof, 96), MAT.celikK);
    govde.rotation.x = Math.PI / 2;
    sg.add(govde);
    // iç boru demeti (yatay)
    const im = new THREE.InstancedMesh(cyl(0.05, 0.05, L - 3.2, 6), MAT.parlak, 70);
    const m4 = new THREE.Matrix4();
    for (let k = 0; k < 70; k++) {
      const yy = -1.2 + (k % 10) * 0.2, xx = -0.9 + Math.floor(k / 10) * 0.3;
      m4.makeRotationX(Math.PI / 2).setPosition(xx, yy, 0);
      im.setMatrixAt(k, m4);
    }
    sg.add(im);
    // buhar çıkış kolektörü
    sg.add(mesh(cyl(0.45, 0.45, 2.2, 32), MAT.celikK, (o) => o.position.set(0, 3.0, 0)));
    // iki dikey kolektör (sıcak/soğuk)
    sg.add(mesh(cyl(0.6, 0.6, 3.6, 32), MAT.celikK, (o) => o.position.set(-1.2, -2.6, 2.4)));
    sg.add(mesh(cyl(0.6, 0.6, 3.6, 32), MAT.celikK, (o) => o.position.set(-1.2, -2.6, -2.4)));
    for (const z of [-4.5, 4.5]) sg.add(mesh(new THREE.BoxGeometry(2.6, 2.6, 0.5), MAT.dokum, (o) => o.position.set(0, -2.6, z)));
    sg.position.copy(c);
    sg.lookAt(c.clone().add(tan));
    g.add(sg);
    ugs.push(sg);
    // bacaklar
    const n1 = new V3(Math.cos(a - 0.22) * 3.2, RPV.y0 + R + Hh - R - 0.9, Math.sin(a - 0.22) * 3.2);
    const n2 = new V3(Math.cos(a + 0.22) * 3.2, RPV.y0 + R + Hh - R - 1.8, Math.sin(a + 0.22) * 3.2);
    const hot = c.clone().addScaledVector(tan, -2.4).add(new V3(0, -4.4, 0)).addScaledVector(new V3(Math.cos(a), 0, Math.sin(a)), -1.2);
    const cold = c.clone().addScaledVector(tan, 2.4).add(new V3(0, -4.4, 0)).addScaledVector(new V3(Math.cos(a), 0, Math.sin(a)), -1.2);
    const sb = tube([n1, n1.clone().lerp(hot, 0.5).setY(n1.y), hot], 0.48, MAT.celikK);
    g.add(sb);
    const pompa = cold.clone().addScaledVector(new V3(Math.cos(a), 0, Math.sin(a)), -2.6).addScaledVector(tan, 2.2).setY(n2.y);
    const kb = tube([cold, cold.clone().setY(n2.y + 0.4), pompa, n2.clone().lerp(pompa, 0.4), n2], 0.45, MAT.celikK);
    g.add(kb);
    const pm = new THREE.Group();
    pm.add(mesh(cyl(1.1, 1.0, 2.4, 48), MAT.dokum, (o) => (o.position.y = 0)));
    pm.add(mesh(cyl(0.8, 0.8, 2.2, 48), MAT.yesil, (o) => (o.position.y = 2.3)));
    pm.position.copy(pompa);
    g.add(pm);
    if (i === 0) {
      P.sicakBacak = {obj: sb, at: n1.clone().lerp(hot, 0.5).setY(n1.y)};
      P.pompa = {obj: pm, at: pompa.clone().add(new V3(0, 3.4, 0))};
    }
    ugs[i].userData.hot = [n1, hot];
  }
  }
  P.ug = {obj: ugs[0]};
  // basınçlandırıcı
  const bas = new THREE.Group();
  bas.add(mesh(lathe([[0.001, -1.6], [1.0, -1.4], [1.5, -0.6], [1.5, 9.5], [1.0, 10.4], [0.001, 10.6]], 64), MAT.celikK));
  bas.position.set(0, SGY - 2, -13.5);
  g.add(bas);
  P.basincli = {obj: bas};
  // polar vinç
  const vinc = new THREE.Group();
  vinc.add(mesh(new THREE.TorusGeometry(20.5, 0.5, 8, 128), MAT.dokum, (o) => (o.rotation.x = Math.PI / 2)));
  vinc.add(mesh(new THREE.BoxGeometry(41, 1.6, 1.4), MAT.dokum, (o) => o.position.set(0, 0.8, 1.5)));
  vinc.add(mesh(new THREE.BoxGeometry(41, 1.6, 1.4), MAT.dokum, (o) => o.position.set(0, 0.8, -1.5)));
  vinc.add(mesh(new RoundedBoxGeometry(3.2, 1.6, 4.4, 3, 0.2), MAT.koyu, (o) => o.position.set(4, 2.2, 0)));
  vinc.position.y = 38;
  vinc.traverse((o) => {
    if (o.material) o.material = o.material === MAT.dokum ? MAT.kabK : o.material;
  });
  g.add(vinc);
  // ana buhar hattı: buhar üretecinden binadan dışarı (türbine)
  const bh = tube([ugs[ugs.length - 1].position.clone().add(new V3(0, TIP === 'ap' ? 22 : 3.5, 0)), new V3(10, 31, -12), new V3(0, 31, -21), new V3(0, 31, -40), new V3(0, 30, -52)], 0.6, MAT.celikK, 80);
  g.add(bh);
  P.buharHatti = {obj: bh, at: new V3(0, 31, -30)};
  return {root: g, P, ugs, kap, cubuk, cek, sicak: P.sicak.obj, SGY};
}

// ------------------------------------------------------------ türbin binası ve türbin dizisi
export function buildTurbinBina() {
  const g = new THREE.Group();
  const P = {};
  // bina kabuğu: kesit düzlemi ile açılır
  const bina = new THREE.Group();
  bina.add(mesh(new THREE.BoxGeometry(120, 34, 46), MAT.bina, (o) => o.position.set(0, 17, 0)));
  bina.add(mesh(new THREE.BoxGeometry(122, 1.2, 48), MAT.cati, (o) => o.position.set(0, 34.6, 0)));
  g.add(bina);
  P.bina = {obj: bina};
  g.add(mesh(new THREE.BoxGeometry(110, 1.0, 22), MAT.betonD, (o) => o.position.set(-2, 12, 0))); // türbin masası
  // rotor diskleri
  const dizi = new THREE.Group();
  const rotorlar = [];
  const turb = (x0, L, r0, r1, n, m) => {
    const rt = new THREE.Group();
    rt.add(mesh(cyl(0.55, 0.55, L + 2, 32), MAT.parlak, (o) => (o.rotation.z = Math.PI / 2)));
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const x = -L / 2 + s * L;
      const rr = m ? r0 + (r1 - r0) * Math.abs(s - 0.5) * 2 : r0 + (r1 - r0) * s;
      rt.add(mesh(cyl(rr * 0.42, rr * 0.42, 0.35, 48), MAT.celik, (o) => {
        o.rotation.z = Math.PI / 2;
        o.position.x = x;
      }));
      const nb = 64;
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1, 0.28), MAT.parlak, nb);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let b = 0; b < nb; b++) {
        const a = (b / nb) * Math.PI * 2;
        const hb = rr * 0.58;
        e.set(a, 0, 0.5);
        q.setFromEuler(e);
        m4.compose(new V3(x, Math.cos(a) * (rr * 0.42 + hb / 2), Math.sin(a) * (rr * 0.42 + hb / 2)), q, new V3(1, hb, 1));
        im.setMatrixAt(b, m4);
      }
      im.castShadow = true;
      rt.add(im);
    }
    rt.position.set(x0, 15.5, 0);
    dizi.add(rt);
    rotorlar.push(rt);
    // gövde (üst yarısı kesik)
    const gv = mesh(lathe([[r0 * 1.15, -L / 2 - 1.5], [r1 * 1.1 + (m ? 0 : 0.6), -0.6], [r1 * 1.1 + 0.6, L / 2 + 1.5]].map(([r, y]) => [r, y]), 96), MAT.ust);
    gv.rotation.z = -Math.PI / 2;
    gv.position.set(x0, 15.5, 0);
    dizi.add(gv);
    return {rt, gv};
  };
  const yb = turb(-38, 7, 1.0, 1.6, 8, false);
  const ab1 = turb(-12, 9, 1.4, 3.4, 9, true);
  const ab2 = turb(14, 9, 1.4, 3.4, 9, true);
  P.ybTurbin = {obj: yb.rt, at: new V3(-38, 18, 0)};
  P.abTurbin = {obj: ab1.rt, at: new V3(-12, 20, 0)};
  // jeneratör
  const jen = new THREE.Group();
  jen.add(mesh(cyl(2.6, 2.6, 13, 64), MAT.yesil, (o) => (o.rotation.z = Math.PI / 2)));
  jen.add(mesh(new RoundedBoxGeometry(14, 1.6, 6.2, 3, 0.3), MAT.dokum, (o) => o.position.y = -2.4));
  jen.add(mesh(cyl(1.0, 1.0, 3, 32), MAT.koyu, (o) => {
    o.rotation.z = Math.PI / 2;
    o.position.x = 8.2;
  }));
  jen.position.set(39, 15.5, 0);
  dizi.add(jen);
  P.jenerator = {obj: jen, at: new V3(39, 18.5, 0)};
  // kondenser (AB türbinlerinin altında)
  for (const x of [-12, 14]) dizi.add(mesh(new RoundedBoxGeometry(12, 9, 14, 3, 0.5), MAT.mavi, (o) => o.position.set(x, 5.5, 0)));
  P.kondenser = {obj: dizi.children[dizi.children.length - 1], at: new V3(14, 9, 6)};
  g.add(dizi);
  // ana trafo dışarıda
  const trafo = new THREE.Group();
  trafo.add(mesh(new RoundedBoxGeometry(8, 7, 6, 3, 0.3), MAT.koyu, (o) => (o.position.y = 3.5)));
  for (let i = 0; i < 3; i++) trafo.add(mesh(cyl(0.3, 0.45, 3, 16), MAT.boya, (o) => o.position.set(-2.4 + i * 2.4, 8.5, 0)));
  trafo.position.set(72, 0, 0);
  g.add(trafo);
  P.trafo = {obj: trafo, at: new V3(72, 9, 0)};
  return {root: g, P, rotorlar};
}

// ------------------------------------------------------------ soğutma kulesi (hiperbolik)
export function buildKule() {
  const g = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 40; i++) {
    const y = (i / 40) * 165;
    const w = 34, yw = 128;
    const r = y < yw ? w + (55 - w) * Math.pow((yw - y) / yw, 1.7) : w + (37 - w) * ((y - yw) / (165 - yw));
    prof.push([r, y]);
  }
  const m = mesh(lathe(prof, 160), new THREE.MeshStandardMaterial({color: '#dad7d0', roughness: 0.9, side: THREE.DoubleSide}));
  g.add(m);
  // ayaklar (kolonlar)
  const im = new THREE.InstancedMesh(cyl(0.5, 0.5, 9, 8), MAT.betonD, 48);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    m4.makeTranslation(Math.cos(a) * 55, -4.5, Math.sin(a) * 55);
    im.setMatrixAt(i, m4);
  }
  g.add(im);
  m.position.y = 9;
  g.position.y = 0;
  im.position.y = 9;
  return {root: g};
}

// ------------------------------------------------------------ pelet, çubuk, demet (gerçek ölçü, metre)
export const YK = {peletR: 0.0038, peletH: 0.0095, delik: 0.0007, zarfR: 0.00455, zarfT: 0.00065, boy: 3.73, demet: 312, adim: 0.01275};
// TIP 'ap': AP1000 (ABD Vogtle 3-4): 157 kare demet 17x17 (264 çubuk, Ø 9,5 mm), aktif boy 4,27 m, 2 dikey buhar üreteci,
// çelik koruma kabı + beton kalkan binası ve pasif soğutma su tankı. 'vver': VVER-1200 (Akkuyu).
export let TIP = 'vver';
export function tipAyarla(t) {
  TIP = t;
  if (t === 'ap') Object.assign(YK, {peletR: 0.0041, peletH: 0.0098, delik: 0.0001, zarfR: 0.00475, boy: 4.27, demet: 264, adim: 0.0126});
}
export function buildYakit() {
  const g = new THREE.Group();
  // tek pelet (çukur uçlu, ortası delikli silindir)
  const peletGeo = lathe([[YK.delik, 0], [YK.peletR - 0.0004, 0], [YK.peletR, 0.0004], [YK.peletR, YK.peletH - 0.0004], [YK.peletR - 0.0004, YK.peletH], [YK.delik, YK.peletH], [YK.delik, 0]], 64);
  const pelet = mesh(peletGeo, MAT.pelet);
  pelet.position.set(0, 0.002, 0);
  g.add(pelet);
  // kömür bloğu: 1 t (yaklaşık 1 m³ yığın)
  const komur = new THREE.Group();
  {
    let sd = 11;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), MAT.komur, 1400);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < 1400; i++) {
      const u = rnd(), v = rnd(), r = Math.sqrt(u) * 0.62;
      const a = v * Math.PI * 2;
      const h = (1 - (r / 0.62) ** 1.6) * 0.9;
      e.set(rnd() * 6, rnd() * 6, rnd() * 6);
      q.setFromEuler(e);
      const s = 0.6 + rnd() * 0.9;
      m4.compose(new V3(Math.cos(a) * r, rnd() * h + 0.03, Math.sin(a) * r), q, new V3(s, s * (0.7 + rnd() * 0.5), s));
      im.setMatrixAt(i, m4);
    }
    im.castShadow = true;
    im.receiveShadow = true;
    komur.add(im);
  }
  komur.position.set(-0.55, 0, -1.4);
  g.add(komur);
  // yakıt çubuğu: kesitli zirkonyum zarf + pelet yığını (yalnız alt 0.25 m ayrıntılı)
  const cubuk = new THREE.Group();
  const zarf = mesh(cyl(YK.zarfR, YK.zarfR, YK.boy, 48, true), MAT.zirkK);
  zarf.position.y = YK.boy / 2;
  cubuk.add(zarf);
  cubuk.add(mesh(cyl(YK.zarfR, YK.zarfR - 0.001, 0.012, 48), MAT.zirk, (o) => (o.position.y = YK.boy + 0.006)));
  const yigin = new THREE.InstancedMesh(peletGeo, MAT.pelet, 60);
  {
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 60; i++) {
      m4.makeTranslation(0, 0.004 + i * (YK.peletH + 0.0002), 0);
      yigin.setMatrixAt(i, m4);
    }
  }
  cubuk.add(yigin);
  cubuk.position.set(0.05, 0, 0.02);
  g.add(cubuk);
  // demet: 312 çubuk, altıgen, ara ızgaralar, üst/alt başlık
  const demet = new THREE.Group();
  const pos = [];
  for (let q = -11; q <= 11; q++)
    for (let r = -11; r <= 11; r++) {
      const s = -q - r;
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
      if (ring <= 10 && !(q === 0 && r === 0)) pos.push([YK.adim * (q + r / 2), YK.adim * r * 0.866, ring]);
    }
  // 331 konumdan 18 kılavuz kanal + merkez → 312 çubuk
  let kilavuz = pos.filter(([, , ring], i) => ring === 3 || (ring === 6 && i % 3 === 0)).slice(0, 18);
  let kset = new Set(kilavuz);
  let cub = pos.filter((p) => !kset.has(p)).slice(0, 312);
  if (TIP === 'ap') {
    // 17x17: 24 kılavuz tüp + 1 ölçüm tüpü, 264 yakıt çubuğu
    const K = new Set(['2,5', '2,8', '2,11', '3,3', '3,13', '5,2', '5,5', '5,8', '5,11', '5,14', '8,2', '8,5', '8,8', '8,11', '8,14', '11,2', '11,5', '11,8', '11,11', '11,14', '13,3', '13,13', '14,5', '14,8', '14,11']);
    kilavuz = [];
    cub = [];
    for (let i = 0; i < 17; i++) for (let j = 0; j < 17; j++) (K.has(`${i},${j}`) ? kilavuz : cub).push([(i - 8) * YK.adim, (j - 8) * YK.adim, 0]);
  }
  const im = new THREE.InstancedMesh(cyl(YK.zarfR, YK.zarfR, YK.boy, 12), MAT.zirk, cub.length);
  const m4 = new THREE.Matrix4();
  cub.forEach(([x, z], i) => {
    m4.makeTranslation(x, YK.boy / 2 + 0.12, z);
    im.setMatrixAt(i, m4);
  });
  im.castShadow = true;
  demet.add(im);
  const kim = new THREE.InstancedMesh(cyl(0.0065, 0.0065, YK.boy + 0.1, 12), MAT.parlak, kilavuz.length);
  kilavuz.forEach(([x, z], i) => {
    m4.makeTranslation(x, YK.boy / 2 + 0.12, z);
    kim.setMatrixAt(i, m4);
  });
  demet.add(kim);
  const AP = TIP === 'ap';
  const hex = (r, h, y, m) => demet.add(mesh(AP ? new THREE.BoxGeometry(0.214, h, 0.214) : hexGeo(r, h), m, (o) => (o.position.y = y)));
  for (let k = 0; k < 13; k++) {
    const y = 0.35 + k * 0.27;
    const gr = mesh(new THREE.TorusGeometry(AP ? 0.151 : 0.117, 0.004, 4, AP ? 4 : 6), MAT.parlak, (o) => {
      o.rotation.x = Math.PI / 2;
      o.rotation.z = AP ? Math.PI / 4 : Math.PI / 6;
      o.position.y = y;
      o.scale.z = 4;
    });
    demet.add(gr);
  }
  hex(0.118, 0.12, 0.06, MAT.dokum);
  demet.add(mesh((() => { const g2 = new THREE.CylinderGeometry(AP ? 0.151 : 0.118, AP ? 0.151 : 0.118, 0.05, AP ? 4 : 6, 1, true); g2.rotateY(AP ? Math.PI / 4 : Math.PI / 6); return g2; })(), MAT.dokum, (o) => { o.position.y = YK.boy + 0.17; o.material = MAT.dokum.clone(); o.material.side = THREE.DoubleSide; }));
  demet.position.set(0.5, 0, 0.1);
  g.add(demet);
  return {root: g, pelet, komur, cubuk, zarf, yigin, demet, cubPos: cub};
}

// ------------------------------------------------------------ çekirdek (nükleon kümesi)
export function nukleus(Z, A, rN = 0.5) {
  const g = new THREE.Group();
  const R = rN * Math.cbrt(A) * 0.95;
  const pts = [];
  const gold = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < A; i++) {
    const y = 1 - (i / (A - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = gold * i;
    const k = Math.cbrt((i * 7919) % A / A * 0.9 + 0.1);
    pts.push(new V3(Math.cos(th) * rr * k * R, y * k * R, Math.sin(th) * rr * k * R));
  }
  const geo = new THREE.SphereGeometry(rN, 20, 14);
  const p = new THREE.InstancedMesh(geo, MAT.proton, Z);
  const n = new THREE.InstancedMesh(geo, MAT.notron, A - Z);
  const m4 = new THREE.Matrix4();
  let ip = 0, ineu = 0;
  pts.forEach((v, i) => {
    m4.makeTranslation(v.x, v.y, v.z);
    if ((i * 37) % A < Z && ip < Z) p.setMatrixAt(ip++, m4);
    else if (ineu < A - Z) n.setMatrixAt(ineu++, m4);
    else p.setMatrixAt(ip++, m4);
  });
  p.castShadow = n.castShadow = true;
  g.add(p, n);
  g.userData.R = R;
  return g;
}
