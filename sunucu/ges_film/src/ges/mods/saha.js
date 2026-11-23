// GES sahası: zemin, servis yolu, çit, kazıklar, konstrüksiyon (aşık+mertek), paneller, inverterler.
// Tüm geometri kodla; hareket yalnız t'nin fonksiyonu (sabit tohum).
import { Z, clamp01, ease, easeOut, easeOutBack } from '../zaman.js';
import * as GR from './gercek.js';

export const SAHA = {
  SIRA: 5, MASA: 4,            // 5 sıra × 4 masa
  SIRA_ARA: 9.0, MASA_ARA: 16.0,
  MASA_BOY: 13.6, AYAK_X: [0.5, 4.7, 8.9, 13.1],
  EGIM: 25 * Math.PI / 180,
  PANEL_EN: 1.13, PANEL_BOY: 2.28, PANEL_YAN: 12, PANEL_UST: 2,
  ON_Z: 1.6, ARKA_Z: -1.6, ON_Y: 1.0,
};
const S = SAHA;
// dalga başlangıç noktası (kameraya yakın köşe)
const KOSE = [-4, 44];
const MAX_UZ = Math.hypot(S.MASA * S.MASA_ARA + 4, 44 + 2);
export const uzaklik = (x, z) => clamp01(Math.hypot(x - KOSE[0], z - KOSE[1]) / MAX_UZ);

export async function create(ctx) {
  const { THREE, scene, TEX } = ctx;
  const rng = ctx.rng(20261123);
  const G = ctx.STIL === 'gercek';
  const tan = Math.tan(S.EGIM);
  const tx = (w, h, draw, rep) => { const t = TEX.canvasTexture(w, h, draw, { repeat: true }); t.repeat.set(rep[0], rep[1]); return t; };
  const ARKA_Y = S.ON_Y + (S.ON_Z - S.ARKA_Z) * tan;

  // ---------- zemin ----------
  const zeminTex = tx(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6e5d45'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(7);
    for (let i = 0; i < 26000; i++) {
      const x = r() * w, y = r() * h, s = 1 + r() * 3, v = r();
      g.fillStyle = v < 0.45 ? `rgba(${90 + r() * 40},${76 + r() * 30},${52 + r() * 20},0.55)` : v < 0.8 ? `rgba(${120 + r() * 40},${110 + r() * 30},${70 + r() * 25},0.45)` : `rgba(${70 + r() * 30},${90 + r() * 30},${45 + r() * 20},0.5)`;
      g.fillRect(x, y, s, s);
    }
  }, [60, 60]);
  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), G ? GR.zeminMalzeme(ctx, 200) : new THREE.MeshStandardMaterial({ map: zeminTex, roughness: 0.97, metalness: 0 }));
  zemin.rotation.x = -Math.PI / 2; zemin.receiveShadow = true; scene.add(zemin);

  // servis yolu (mıcır): saha önünde X boyunca ve batıda Z boyunca
  const yolTex = tx(512, 512, (g, w, h) => {
    g.fillStyle = '#8f8574'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(11);
    for (let i = 0; i < 9000; i++) { const c = 110 + r() * 80; g.fillStyle = `rgba(${c},${c * 0.95},${c * 0.86},0.6)`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
  }, [40, 2]);
  const yolMat = G ? GR.yolMalzeme(ctx, 35, 1) : new THREE.MeshStandardMaterial({ map: yolTex, roughness: 0.95 });
  const yol1 = new THREE.Mesh(new THREE.PlaneGeometry(140, 6), yolMat);
  yol1.rotation.x = -Math.PI / 2; yol1.position.set(30, 0.02, 46); yol1.receiveShadow = true; scene.add(yol1);
  const yol2 = new THREE.Mesh(new THREE.PlaneGeometry(70, 6), G ? GR.yolMalzeme(ctx, 18, 1) : yolMat.clone());
  if (!G) { yol2.material.map = yolTex.clone(); yol2.material.map.repeat.set(20, 2); yol2.material.map.needsUpdate = true; }
  yol2.rotation.set(-Math.PI / 2, 0, Math.PI / 2); yol2.position.set(-8, 0.021, 14); yol2.receiveShadow = true; scene.add(yol2);

  // kuru ot öbekleri (yalnız gerçekçi stil): yollar dışında
  if (G) GR.otlar(ctx, 9000, (r) => {
    const x = -70 + r() * 210, z = -60 + r() * 150;
    if (z > 42.5 && z < 49.5 && x > -45 && x < 105) return null;
    if (x > -11.5 && x < -4.5 && z > -21 && z < 49) return null;
    return [x, z];
  });

  // uzak tepeler (sis içinde silüet)
  {
    const g = new THREE.BufferGeometry(), pos = [], idx = [], N = 160, R = 520;
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2;
      const hgt = 18 + 26 * (0.5 + 0.5 * Math.sin(a * 3 + 1.2)) * (0.6 + 0.4 * Math.sin(a * 7.3)) + 10 * rng();
      pos.push(Math.cos(a) * R, -2, Math.sin(a) * R, Math.cos(a) * R, hgt, Math.sin(a) * R);
      if (i < N) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a4a42, roughness: 1, side: THREE.DoubleSide })));
  }

  // çit direkleri
  {
    const ps = [];
    const x0 = -4, x1 = S.MASA * S.MASA_ARA + 2, z0 = -6, z1 = 43.5;
    for (let x = x0; x <= x1; x += 3) { ps.push([x, z0], [x, z1]); }
    for (let z = z0 + 3; z < z1; z += 3) { ps.push([x0, z], [x1, z]); }
    const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6), new THREE.MeshStandardMaterial({ color: 0x9a9fa3, metalness: 0.7, roughness: 0.4 }), ps.length);
    const o = new THREE.Object3D();
    ps.forEach(([x, z], i) => { o.position.set(x, 1.0, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = true; scene.add(m);
    // tel (yatay iki hat)
    const tel = new THREE.MeshStandardMaterial({ color: 0x8a8f93, metalness: 0.6, roughness: 0.5 });
    for (const y of [0.6, 1.8]) {
      for (const [a, b] of [[[x0, z0], [x1, z0]], [[x0, z1], [x1, z1]], [[x0, z0], [x0, z1]], [[x1, z0], [x1, z1]]]) {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const t = new THREE.Mesh(new THREE.BoxGeometry(L, 0.02, 0.02), tel);
        t.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); t.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); scene.add(t);
      }
    }
  }

  // ---------- masalar ----------
  const masalar = [];
  for (let r = 0; r < S.SIRA; r++) for (let c = 0; c < S.MASA; c++) {
    const x0 = c * S.MASA_ARA, z0 = r * S.SIRA_ARA;
    masalar.push({ r, c, x0, z0, d: uzaklik(x0 + S.MASA_BOY / 2, z0) });
  }

  const galv = G ? GR.galvaniz(ctx) : new THREE.MeshStandardMaterial({ color: 0xa9aeb2, metalness: 0.45, roughness: 0.45, envMapIntensity: 0.5 });
  const galvKoyu = G ? GR.galvaniz(ctx, true) : new THREE.MeshStandardMaterial({ color: 0x8a8f93, metalness: 0.45, roughness: 0.5, envMapIntensity: 0.5 });

  // kazıklar: her ayakta ön ve arka
  const kaziklar = [];
  for (const m of masalar) for (const ax of S.AYAK_X) {
    for (const on of [true, false]) {
      const x = m.x0 + ax, z = m.z0 + (on ? S.ON_Z : S.ARKA_Z), top = on ? S.ON_Y : ARKA_Y;
      const ts = Z.kazikBas + (Z.kazikSon - 0.55 - Z.kazikBas) * uzaklik(x, z) + rng() * 0.06;
      kaziklar.push({ x, z, top, ts });
    }
  }
  const kazikGeo = G ? GR.kazikGeo(THREE) : new THREE.BoxGeometry(0.15, 1, 0.12); if (!G) kazikGeo.translate(0, 0.5, 0);
  const kazikMesh = new THREE.InstancedMesh(kazikGeo, galv, kaziklar.length);
  kazikMesh.frustumCulled = false; kazikMesh.castShadow = true; kazikMesh.receiveShadow = true; scene.add(kazikMesh);

  // mertekler (eğik, ön kazıktan arkaya)
  const mertekL = Math.hypot(S.ON_Z - S.ARKA_Z, ARKA_Y - S.ON_Y) + 0.5;
  const mertekGeo = G ? GR.mertekGeo(THREE) : new THREE.BoxGeometry(0.1, 0.12, 1); // z boyunca uzar
  const merteklar = [];
  for (const m of masalar) for (const ax of S.AYAK_X) {
    const tc = Z.konsBas + (Z.konsSon - 0.9 - Z.konsBas) * m.d + ax * 0.02;
    merteklar.push({ x: m.x0 + ax, z: m.z0, tc });
  }
  const mertekMesh = new THREE.InstancedMesh(mertekGeo, galvKoyu, merteklar.length);
  mertekMesh.frustumCulled = false; mertekMesh.castShadow = true; scene.add(mertekMesh);

  // aşıklar (X boyunca, mertek üstünde 2 adet)
  const asikGeo = G ? GR.asikGeo(THREE) : new THREE.BoxGeometry(1, 0.08, 0.08);
  const asiklar = [];
  for (const m of masalar) for (const s of [-1.15, 1.15]) {
    const tc = Z.konsBas + 0.35 + (Z.konsSon - 0.9 - Z.konsBas) * m.d;
    asiklar.push({ m, s, tc });
  }
  const asikMesh = new THREE.InstancedMesh(asikGeo, galv, asiklar.length);
  asikMesh.frustumCulled = false; asikMesh.castShadow = true; scene.add(asikMesh);

  // paneller
  const panelTex = tx(256, 512, (g, w, h) => {
    g.fillStyle = '#c9ced3'; g.fillRect(0, 0, w, h);             // alüminyum çerçeve
    const b = 7; g.fillStyle = '#0b1a33'; g.fillRect(b, b, w - 2 * b, h - 2 * b);
    const cx = 6, cy = 12, cw = (w - 2 * b) / cx, ch = (h - 2 * b) / cy;
    for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) {
      const v = 0.92 + 0.08 * Math.sin(i * 12.9 + j * 78.2);
      g.fillStyle = `rgb(${Math.round(18 * v)},${Math.round(38 * v)},${Math.round(78 * v)})`;
      g.fillRect(b + i * cw + 1.2, b + j * ch + 1.2, cw - 2.4, ch - 2.4);
      g.fillStyle = 'rgba(160,175,200,0.35)';
      for (let k = 1; k < 5; k++) g.fillRect(b + i * cw + k * cw / 5, b + j * ch + 1.2, 0.6, ch - 2.4);
    }
  }, [1, 1]);
  const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, metalness: 0.55, roughness: 0.16, envMapIntensity: 1.3 });
  const panelGeo = new THREE.BoxGeometry(S.PANEL_EN - 0.02, 0.04, S.PANEL_BOY - 0.02);
  // kutunun üst yüzü dışındaki yüzler için de aynı doku; sorun değil (ince)
  const paneller = [];
  const egimY = (dz) => (S.ON_Y + ARKA_Y) / 2 + 0.16 - dz * tan; // dz: masa yerel z (ön +)
  for (const m of masalar) {
    let k = 0;
    for (let u = 0; u < S.PANEL_UST; u++) for (let i = 0; i < S.PANEL_YAN; i++) {
      const lx = (S.MASA_BOY - S.PANEL_YAN * S.PANEL_EN) / 2 + (i + 0.5) * S.PANEL_EN;
      const slope = (u - 0.5) * S.PANEL_BOY;                    // eğim boyunca (arka +)
      const dz = -slope * Math.cos(S.EGIM);
      const tp = Z.panelBas + (Z.panelSon - 0.7 - Z.panelBas) * m.d + (i / S.PANEL_YAN) * 0.35 + u * 0.08 + rng() * 0.04;
      paneller.push({ x: m.x0 + lx, z: m.z0 + dz, y: egimY(dz), tp, yaw: (rng() - 0.5) * 0.5, k: k++ });
    }
  }
  const panelMesh = new THREE.InstancedMesh(panelGeo, G ? GR.panelMalzemeleri(ctx) : panelMat, paneller.length);
  panelMesh.frustumCulled = false; panelMesh.castShadow = true; panelMesh.receiveShadow = true; scene.add(panelMesh);

  // inverterler: her sıranın doğu ucunda
  const invMat = new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: 0.3, roughness: 0.5 });
  if (G) ctx.applyWeather(invMat, { tex: 1.5, grain: 0.5, dirt: 0.35, streak: 0.5, moss: 0, wet: 0, chip: 0, rust: 0 });
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) });
  const inverterler = [];
  for (let r = 0; r < S.SIRA; r++) {
    const x = S.MASA * S.MASA_ARA - 1.2, z = r * S.SIRA_ARA + 2.6;
    const g = new THREE.Group();
    const govde = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.28), invMat); govde.position.y = 1.05; govde.castShadow = true; g.add(govde);
    const ayak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), galv); ayak.position.y = 0.5; g.add(ayak);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.02), ledMat.clone()); led.position.set(0.18, 1.32, 0.15); g.add(led);
    g.position.set(x, 0, z); scene.add(g);
    inverterler.push({ led, x, z, tl: Z.ledBas + (Z.ledSon - Z.ledBas) * (r / (S.SIRA - 1)) });
  }

  const toz = G ? GR.tozHavuzu(ctx, 40) : null;

  // güneş diski (ufukta doğar)
  const gunes = new THREE.Mesh(new THREE.SphereGeometry(22, 24, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) }));
  gunes.frustumCulled = false; scene.add(gunes);

  // ---------- güncelleme ----------
  const o = new THREE.Object3D();
  const gizli = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    update(t, fr) {
      // kazıklar: 5 darbede çakılır
      kaziklar.forEach((p, i) => {
        const k = (t - p.ts) / 0.55;
        if (k < -0.25) { kazikMesh.setMatrixAt(i, gizli); return; }
        let off;
        if (k < 0) off = 2.4 + (-k) * 4;                     // yukarıdan gelir
        else { const s = Math.min(5, k * 5), n = Math.floor(s), f = s - n; off = 2.4 * (1 - (n + easeOut(f * 1.6)) / 5); }
        off = Math.max(0, off);
        o.position.set(p.x, 0, p.z); o.rotation.set(0, 0, 0); o.scale.set(1, p.top + off + 0.0001, 1);
        // gömülü kısım görünmez; görünen boy = top + off, taban y=0
        o.updateMatrix(); kazikMesh.setMatrixAt(i, o.matrix);
      });
      kazikMesh.instanceMatrix.needsUpdate = true;
      // toz: darbe sırasında ve hemen sonra kazık dibinde kabaran bulut
      if (toz) {
        let n = 0;
        for (const p of kaziklar) {
          const k = (t - p.ts) / 0.55;
          if (k < 0 || k > 2.6 || n >= toz.length) continue;
          for (let j = 0; j < 2 && n < toz.length; j++) {
            const s = toz[n++], a = k * 1.3 + j * 2.1;
            s.visible = true;
            s.position.set(p.x + Math.cos(a) * 0.25 * (1 + k), 0.25 + 0.35 * k + j * 0.15, p.z + Math.sin(a) * 0.25 * (1 + k));
            const sc = 0.6 + 1.2 * k + j * 0.3; s.scale.set(sc, sc * 0.75, 1);
            s.material.opacity = 0.55 * (k < 1 ? 1 : Math.max(0, 1 - (k - 1) / 1.6)) * (k < 0.15 ? k / 0.15 : 1);
          }
        }
        for (; n < toz.length; n++) toz[n].visible = false;
      }

      // mertekler: önden arkaya uzar
      merteklar.forEach((m, i) => {
        const k = ease((t - m.tc) / 0.45);
        if (k <= 0) { mertekMesh.setMatrixAt(i, gizli); return; }
        const L = mertekL * k;
        o.rotation.set(S.EGIM, 0, 0);
        // ön uç sabit (ön kazık tepesi), arka uca doğru uzar
        const zc = S.ON_Z + 0.25 - (L / 2) * Math.cos(S.EGIM), yc = S.ON_Y + 0.06 + ((S.ON_Z + 0.25 - zc)) * Math.tan(S.EGIM) - 0.1;
        o.position.set(m.x, yc, m.z + zc); o.scale.set(1, 1, L); o.updateMatrix(); mertekMesh.setMatrixAt(i, o.matrix);
      });
      mertekMesh.instanceMatrix.needsUpdate = true;

      // aşıklar: batıdan doğuya uzar
      asiklar.forEach((a, i) => {
        const k = ease((t - a.tc) / 0.5);
        if (k <= 0) { asikMesh.setMatrixAt(i, gizli); return; }
        const L = S.MASA_BOY * k, dz = -a.s * Math.cos(S.EGIM);
        o.rotation.set(S.EGIM, 0, 0);
        o.position.set(a.m.x0 + L / 2, egimY(dz) - 0.12, a.m.z0 + dz); o.scale.set(L, 1, 1); o.updateMatrix(); asikMesh.setMatrixAt(i, o.matrix);
      });
      asikMesh.instanceMatrix.needsUpdate = true;

      // paneller: yukarıdan süzülerek oturur
      paneller.forEach((p, i) => {
        const k = (t - p.tp) / 0.6;
        if (k <= 0) { panelMesh.setMatrixAt(i, gizli); return; }
        const e = easeOutBack(k), y = p.y + 3.2 * (1 - easeOut(k)), w = 1 - clamp01(k);
        o.position.set(p.x, y, p.z);
        o.rotation.set(S.EGIM * clamp01(e) + 0.35 * w, p.yaw * w, 0.15 * w * Math.sin(p.k));
        const s = 0.6 + 0.4 * clamp01(k * 2.5); o.scale.set(s, 1, s);
        o.updateMatrix(); panelMesh.setMatrixAt(i, o.matrix);
      });
      panelMesh.instanceMatrix.needsUpdate = true;

      // güneş: yükseklik -3° → +5°, parlaklık artar
      { const k = clamp01((t - Z.gunBas) / (Z.SON - Z.gunBas)); const el = (-3 + 8 * k) * Math.PI / 180, az = Math.atan2(-0.66, 0.75), R = 950;
        gunes.position.set(ctx.SAHA_MERKEZ.x + Math.cos(az) * Math.cos(el) * R, Math.sin(el) * R, ctx.SAHA_MERKEZ.z + Math.sin(az) * Math.cos(el) * R);
        const b = 400 * ease(k * 1.4); gunes.material.color.setRGB(b, b * 0.55, b * 0.22); }
      // inverter ışıkları
      for (const v of inverterler) {
        const k = clamp01((t - v.tl) / 0.15);
        const blink = k > 0 ? (0.85 + 0.15 * Math.sin(t * 9 + v.z)) : 0;
        v.led.material.color.setRGB(0.25 * k * blink, 2.6 * k * blink, 0.6 * k * blink);
        if (k > 0) fr.glow.push([v.x + 0.18, 1.32, v.z + 0.2, 0.9, 0.15 * k, 0.9 * k, 0.3 * k]);
      }
    },
  };
}
