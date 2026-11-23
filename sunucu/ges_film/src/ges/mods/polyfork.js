// Polyfork (polyfork.dev) hazır modelleri: iş makineleri, araçlar, işçiler, ağaçlar.
// Lisans: ücretsiz modellerin mesh dosyaları CC BY 4.0 — yayın açıklamasına "3D models: Polyfork (polyfork.dev), CC BY 4.0" yazılır.
// Hareket: konum = f(t); işçi animasyonları AnimationMixer.setTime(t) ile kareye bağlı (deterministik).
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Z, clamp01, ease } from '../zaman.js';

const YOL = '/assets/polyfork/';

export async function create(ctx) {
  const { THREE, scene } = ctx;
  const rng = ctx.rng(4242);
  const loader = new GLTFLoader();
  const cache = {};
  const yukle = async (ad) => (cache[ad] ??= loader.loadAsync(`${YOL}${ad}.glb`));
  const golge = (o, al = true) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = al; } });

  async function koy(ad, x, z, ry = 0, s = 1) {
    const g = await yukle(ad);
    const o = g.animations?.length ? SkeletonUtils.clone(g.scene) : g.scene.clone(true);
    o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s);
    golge(o); scene.add(o);
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
    hareketli.push((t) => { o.position.x = 150 - 10.5 * t; o.position.z = 46.8; });
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
  await isci('groundworker-083f5c', 'Idle', null, 0.7).then((o) => { o.position.set(6, 0, 39.6); o.rotation.y = Math.PI * 0.85; });
  await isci('construction-worker-c1ad8c', 'Idle', null, 0.3).then((o) => { o.position.set(22.5, 0, 40.2); o.rotation.y = Math.PI; });
  await isci('crane-banksman-3994e0', 'Idle', null, 0.5).then((o) => { o.position.set(68, 0, 33); o.rotation.y = -Math.PI / 2; });

  // --- ağaçlar: çitin dışında kuşak ---
  const agacAd = ['tall-pine-tree-ab4108', 'oak-tree-50ee7c'];
  for (let i = 0; i < 46; i++) {
    let x, z;
    do { x = -60 + rng() * 190; z = -50 + rng() * 140; } while (x > -30 && x < 96 && z > -14 && z < 80);
    await koy(agacAd[rng() < 0.6 ? 0 : 1], x, z, rng() * 6.28, 0.8 + rng() * 0.6);
  }

  return {
    update(t) {
      for (const f of hareketli) f(t);
      for (const m of mixers) m.mixer.setTime(t + m.faz);
    },
  };
}
