// Kazık çakma makinesi (GES tipi, paletli, yan mastlı hidrolik çekiç) — kodla.
// Her kazık hattında bir makine: bekleme yerinden çıkar, kazıktan kazığa ilerler, kazığı mastta tutar, 2 darbede çakar.
import { kazikPlani, kazikUst, CEKIC } from '../kazik_plan.js';
import { ease } from '../zaman.js';

export async function create(ctx) {
  const { THREE, scene } = ctx;
  const G = ctx.STIL === 'gercek';
  const boya = new THREE.MeshStandardMaterial({ color: 0xe8a317, roughness: 0.5, metalness: 0.15 });
  const palet = new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.85 });
  const celik = new THREE.MeshStandardMaterial({ color: 0x5b6066, roughness: 0.45, metalness: 0.6 });
  const cam = new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.1, metalness: 0.3 });
  const hortum = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  if (G) {
    ctx.applyWeather(boya, { tex: 1.2, grain: 0.6, dirt: 0.5, streak: 0.55, moss: 0, chip: 0.25, rust: 0.06, wet: 0.05, bump: 0.002 });
    ctx.applyWeather(palet, { tex: 1.5, grain: 0.8, dirt: 0.8, streak: 0.2, moss: 0, chip: 0, rust: 0.1, wet: 0, bump: 0.004 });
    ctx.applyWeather(celik, { tex: 1.5, grain: 0.6, dirt: 0.3, streak: 0.4, moss: 0, chip: 0.1, rust: 0.12, wet: 0, bump: 0.002 });
  }
  const kutu = (w, h, d, m, x, y, z, ebeveyn) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true; ebeveyn.add(k); return k; };

  // yerel eksen: +X ilerleme yönü, mast +Z yanında (yan = -1 ise grup Y'de döndürülmez, mast tarafı aynalanır)
  function makine(yan) {
    const g = new THREE.Group();
    // paletler + makaralar
    for (const z of [-0.62, 0.62]) {
      kutu(2.5, 0.42, 0.42, palet, 0, 0.23, z, g);
      for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.44, 10), celik); c.rotation.x = Math.PI / 2; c.position.set(-1.0 + i * 0.5, 0.16, z); g.add(c); }
    }
    // gövde, motor kaputu, karşı ağırlık
    kutu(1.9, 0.55, 1.5, boya, -0.05, 0.72, 0, g);
    kutu(0.95, 0.55, 1.25, boya, -0.55, 1.27, -0.05, g);
    kutu(0.25, 0.7, 1.3, celik, -1.05, 1.05, 0, g);
    // operatör yeri: koltuk + ROPS kafes + tavan
    kutu(0.45, 0.45, 0.45, celik, 0.45, 1.2, -0.25, g);
    for (const [x, z] of [[0.15, -0.65], [0.85, -0.65], [0.15, 0.15], [0.85, 0.15]]) kutu(0.06, 1.25, 0.06, boya, x, 1.62, z, g);
    kutu(0.85, 0.06, 0.95, boya, 0.5, 2.25, -0.25, g);
    kutu(0.02, 0.5, 0.75, cam, 0.87, 1.85, -0.25, g);
    // yan kol + mast (lider) + çekiç
    const kol = kutu(0.25, 0.22, 0.8, celik, 0.35, 0.95, 0.7, g);
    const mast = new THREE.Group(); mast.position.set(0.35, 0, 1.0); g.add(mast);   // mast kazığın 0.35 m gerisinde
    kutu(0.22, 5.2, 0.26, boya, 0, 2.85, 0, mast);
    kutu(0.05, 5.2, 0.05, celik, -0.13, 2.85, -0.1, mast);
    kutu(0.05, 5.2, 0.05, celik, -0.13, 2.85, 0.1, mast);
    kutu(0.4, 0.15, 0.4, celik, 0, 5.5, 0, mast);
    const hid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), celik); hid.position.set(-0.25, 1.4, -0.55); hid.rotation.x = 0.5; g.add(hid);
    const hort = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.6, 6), hortum); hort.position.set(-0.18, 3.0, 0); mast.add(hort);
    const cekic = new THREE.Group(); cekic.position.z = 0.35; mast.add(cekic);   // çekiç kazık ekseninde
    kutu(0.12, 0.12, 0.4, celik, 0, 0.6, 0.17, mast); kutu(0.12, 0.12, 0.4, celik, 0, 1.6, 0.17, mast);   // kazık tutucu kollar
    kutu(0.42, 0.95, 0.42, celik, 0.12, 0.475, 0, cekic);
    kutu(0.46, 0.12, 0.46, boya, 0.12, 0.98, 0, cekic);
    kutu(0.2, 0.18, 0.2, celik, 0.12, -0.05, 0, cekic);
    if (yan > 0) g.scale.z = -1;                                  // makine hattın +Z dışında: mast -Z'ye (kazığa) bakar
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    // yüzey yönleri ters dönmesin diye aynalanan grupta malzemeler çift yüzlü
    if (yan > 0) g.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.side = THREE.DoubleSide; } });
    return { g, cekic, mast };
  }

  const hatlar = kazikPlani();
  const mk = hatlar.map((h) => { const m = makine(h.yan); scene.add(m.g); return { ...m, h }; });

  // mast ekseni kazık hattında: gövde x'i = kazık x'i - 0.35 (mast gövdeye göre +0.35'te)
  function konum(h, t) {
    const P = h.kaziklar, H = CEKIC.HAREKET;
    const bekle = CEKIC.BEKLE_X;
    if (t < P[0].ts - H) return { x: bekle, p: null };
    for (let j = 0; j < P.length; j++) {
      const varis = P[j].ts, onceki = j ? P[j - 1].x : bekle, kalkis = varis - H;
      if (t < kalkis) return { x: onceki, p: j ? P[j - 1] : null };
      if (t < varis) return { x: onceki + (P[j].x - onceki) * ease((t - kalkis) / H), p: null };
      if (j === P.length - 1 || t < P[j + 1].ts - H) return { x: P[j].x, p: P[j] };
    }
    return { x: P[P.length - 1].x, p: P[P.length - 1] };
  }

  return {
    update(t) {
      for (const m of mk) {
        const { x, p } = konum(m.h, t);
        m.g.position.set(x - 0.35, 0, m.h.mz);
        // çekiç: kazık mastta ise kazığın üstünde, darbede iner-kalkar; boşta mast tepesinde
        let alt = 4.3;
        if (p) {
          const ust = kazikUst(p, t);
          if (ust !== null && t - p.ts < 0.28) {
            let lift = 0.45;
            for (const d of CEKIC.DARBE) {
              const dt = t - (p.ts + d);
              if (dt > -0.05 && dt < 0) lift = Math.min(lift, 0.45 * (-dt / 0.05));
              else if (dt >= 0 && dt < 0.05) lift = Math.min(lift, 0.45 * (dt / 0.05));
            }
            alt = p.top + ust + 0.05 + lift;
          } else alt = Math.min(4.3, p.top + 0.05 + 0.45 + (t - p.ts - 0.28) * 12);
        }
        m.cekic.position.y = alt;
      }
    },
  };
}
