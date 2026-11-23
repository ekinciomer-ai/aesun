// Polyfork (polyfork.dev) hazır modelleri: iş makineleri, araçlar, işçiler, ağaçlar.
// Lisans: ücretsiz modellerin mesh dosyaları CC BY 4.0 — yayın açıklamasına "3D models: Polyfork (polyfork.dev), CC BY 4.0" yazılır.
// Hareket: konum = f(t); işçi animasyonları AnimationMixer.setTime(t) ile kareye bağlı (deterministik).
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Z, clamp01, ease } from '../zaman.js';
import * as GR from './gercek.js';

const YOL = '/assets/polyfork/';

export async function create(ctx) {
  const { THREE, scene } = ctx;
  const rng = ctx.rng(4242);
  const loader = new GLTFLoader();
  const cache = {};
  const yukle = async (ad) => (cache[ad] ??= loader.loadAsync(`${YOL}${ad}.glb`));
  const G = ctx.STIL === 'gercek';
  // Stil 2: makinelere kir/akıntı/çizik, ağaçlarda renk yumuşatma (iskeletli işçilere dokunulmaz)
  const gercekle = (o, ad) => {
    if (!G) return;
    const agac = /tree/.test(ad);
    o.traverse((m) => {
      if (!m.isMesh || m.isSkinnedMesh || !m.material) return;
      const yeni = (mt) => {
        const c = mt.clone();
        if (c.color) { const hsl = {}; c.color.getHSL(hsl); c.color.setHSL(hsl.h, hsl.s * (agac ? 0.55 : 0.75), hsl.l * (agac ? 0.8 : 0.92)); }
        c.roughness = Math.max(c.roughness ?? 0.6, agac ? 0.9 : 0.55);
        if (!agac && c.isMeshStandardMaterial) ctx.applyWeather(c, { tex: 0.9, grain: 0.6, dirt: 0.55, streak: 0.5, moss: 0, chip: 0.25, rust: 0.08, wet: 0.05, bump: 0.002 });
        return c;
      };
      m.material = Array.isArray(m.material) ? m.material.map(yeni) : yeni(m.material);
    });
  };
  const golge = (o, al = true) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = al; } });

  async function koy(ad, x, z, ry = 0, s = 1) {
    const g = await yukle(ad);
    const o = g.animations?.length ? SkeletonUtils.clone(g.scene) : g.scene.clone(true);
    o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s);
    gercekle(o, ad); golge(o); scene.add(o);
    return { o, clips: g.animations || [] };
  }

  const hareketli = [];

  // --- şantiye düzeni ---
  // mobil vinç: sahanın doğusunda, panel paletlerinin yanında
  await koy('mobile-crane-671d3f', 76, 30, -Math.PI / 2 + 0.3);
  // paletler (küçük yük sandıkları) vinç yanında
  for (let i = 0; i < 6; i++) await koy('cargo-container-fd73bc', 70 + (i % 3) * 1.3, 40 + Math.floor(i / 3) * 2.6, 0);
  // paletli ekskavatör: batı yolunun yanında
  await koy('tracked-excavator-8ebd3c', -15, 26, 0.6);
  // şantiye çadırı (ofis)
  await koy('commander-s-tent-c8b8b5', -18, 40, 0.2, 0.8);

  // damperli kamyon: ön servis yolunda batıdan doğuya
  {
    const { o } = await koy('articulated-dump-truck-ee50f3', 0, 46, -Math.PI / 2);
    hareketli.push((t) => { o.position.x = 90 - 16 * t; o.position.z = 46.8; });
  }
  // pikap: batı yolunda kuzeyden güneye, sonra durur
  {
    const { o } = await koy('pickup-truck-a34bf2', -8, 0, 0);
    hareketli.push((t) => { const k = ease((t - 3.0) / 6.0); o.position.set(-8.6, 0, -30 + 64 * k); o.rotation.y = 0; });
  }
  // forklift: palet alanı ile saha arasında gidip gelir
  {
    const { o } = await koy('cargo-forklift-91f591', 66, 36, -Math.PI / 2);
    hareketli.push((t) => { const k = 0.5 - 0.5 * Math.cos(t * 0.7); o.position.set(66 - 10 * k, 0, 36.5); o.rotation.y = -Math.PI / 2 + (Math.sin(t * 0.7) > 0 ? 0 : Math.PI); });
  }

  // --- işçiler ---
  const mixers = [];
  async function isci(ad, klip, yolFn, faz = 0) {
    const { o, clips } = await koy(ad, 0, 0, 0);
    const mixer = new THREE.AnimationMixer(o);
    const c = clips.find((c) => c.name === klip) || clips[0];
    if (c) mixer.clipAction(c).play();
    mixers.push({ mixer, faz });
    if (yolFn) hareketli.push((t) => yolFn(t, o));
    return o;
  }
  const yuru = (a, b, hiz, t0 = 0) => (t, o) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const T = L / hiz;
    let s = ((t - t0) % (2 * T) + 2 * T) % (2 * T); const geri = s > T; if (geri) s = 2 * T - s;
    const k = s / T; o.position.set(a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k);
    const dx = (b[0] - a[0]) * (geri ? -1 : 1), dz = (b[1] - a[1]) * (geri ? -1 : 1); o.rotation.y = Math.atan2(dx, dz);
  };
  // sıralar arasında yürüyen işçiler (sıra aralıkları z = 4.5, 13.5, 22.5, 31.5)
  await isci('construction-worker-c1ad8c', 'Walk', yuru([2, 40.5], [30, 40.5], 1.35, 0), 0);
  await isci('construction-worker-c1ad8c', 'Walk', yuru([60, 31.8], [20, 31.8], 1.3, 3), 0.4);
  await isci('groundworker-083f5c', 'Walk', yuru([10, 22.8], [44, 22.8], 1.25, 1), 0.2);
  await isci('groundworker-083f5c', 'Idle', null, 0.7).then((o) => { o.position.set(5.8, 0, 41.6); o.rotation.y = Math.PI * 1.15; });
  await isci('construction-worker-c1ad8c', 'Idle', null, 0.3).then((o) => { o.position.set(22.5, 0, 40.2); o.rotation.y = Math.PI; });
  await isci('crane-banksman-3994e0', 'Idle', null, 0.5).then((o) => { o.position.set(68, 0, 33); o.rotation.y = -Math.PI / 2; });

  // --- ağaçlar: çitin dışında kuşak ---
  const agacAd = ['tall-pine-tree-ab4108', 'oak-tree-50ee7c'];
  const yerler = [];
  for (let i = 0; i < 46; i++) {
    let x, z;
    do { x = -60 + rng() * 190; z = -50 + rng() * 140; } while (x > -30 && x < 96 && z > -14 && z < 80);
    const tur = rng() < 0.6 ? 0 : 1, a = rng() * 6.28, s = 0.8 + rng() * 0.6;
    if (G) yerler.push({ x, z, a, s, tur: tur === 0 ? 'kavak' : 'yuvarlak' });
    else await koy(agacAd[tur], x, z, a, s);
  }
  if (G) {
    // Anadolu tarlası: sahanın kuzeyinde ve doğusunda kavak sıraları
    for (let i = 0; i < 26; i++) yerler.push({ x: -40 + i * 6.5 + rng(), z: -24 + rng(), a: rng() * 6.28, s: 0.85 + rng() * 0.3, tur: 'kavak' });
    for (let i = 0; i < 14; i++) yerler.push({ x: 112 + rng(), z: -10 + i * 6.8 + rng(), a: rng() * 6.28, s: 0.85 + rng() * 0.3, tur: 'kavak' });
    GR.agaclar(ctx, yerler);
  }

  return {
    update(t) {
      for (const f of hareketli) f(t);
      for (const m of mixers) m.mixer.setTime(t + m.faz);
    },
  };
}
