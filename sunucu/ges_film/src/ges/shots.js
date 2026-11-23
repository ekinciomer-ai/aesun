// Dikey (9:16) kamera planları ve kurgu — 8 farklı açı. Konumlar dünya koordinatında (metre).
// Saha: X 0..64 (batı→doğu), Z 0..40 (5 sıra; sıra z = 0, 9, 18, 27, 36), paneller +Z'ye bakar. Servis yolu z≈46.
// Kamera sallantısı yok (titreme olmasın); hareketler yumuşak (ease).
import { Z, ease } from './zaman.js';

const lerp = (a, b, k) => a + (b - a) * k;
const L3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const M = [32, 0, 20];                                   // saha merkezi

export const SHOTS = {
  // 1. yer seviyesi: boş arazi, sis; açılışta kararmadan açılır
  p_arazi: { cam: (tl) => { const k = ease(tl / 1.8);
    return { pos: L3([4, 1.1, 62], [7, 1.4, 57], k), tgt: [26, 3.2, 12], fov: 60, dof: { focus: 30, aperture: 0.7 }, post: { fade: ease(tl / 0.8) } }; } },
  // 2. kazık yakın: ön sıranın batı ucu, göz hizası
  p_kazik: { cam: (tl) => { const k = ease(tl / 1.6);
    return { pos: L3([-2.5, 1.3, 42.6], [-1.0, 1.5, 42.2], k), tgt: L3([4, 1.1, 37.5], [6, 1.2, 37.0], k), fov: 50, dof: { focus: 8, aperture: 1.4 } }; } },
  // 3. alçak drone (eğik kuş bakışı): kazık ızgarası, yavaş kayar
  p_kus: { cam: (tl) => { const k = ease(tl / 1.6);
    return { pos: L3([0, 15, 52], [8, 16, 50], k), tgt: L3([10, 0, 34], [18, 0, 31], k), fov: 52 }; } },
  // 4. sıra arası alçak: iki sıra arasından X boyunca, mertekler iki yanda yükselir
  p_sira: { cam: (tl) => { const k = ease(tl / 1.6);
    return { pos: L3([-3, 1.0, 31.6], [3, 1.15, 31.6], k), tgt: [34, 1.6, 31.0], fov: 48, dof: { focus: 12, aperture: 0.6 } }; } },
  // 5. 3/4 yüksek açı: konstrüksiyon dalgası
  p_kons: { cam: (tl) => { const k = ease(tl / 1.4);
    return { pos: L3([-12, 9.5, 54], [-8, 11, 50], k), tgt: [26, 1.2, 20], fov: 52 }; } },
  // 6. panel yakın: ön sıra batı masası, paneller göz önünde oturur
  p_panelyakin: { cam: (tl) => { const k = ease(tl / 1.6);
    return { pos: L3([3.5, 3.4, 42.6], [6.0, 3.6, 42.1], k), tgt: L3([6.0, 1.2, 36.0], [8.5, 1.3, 35.8], k), fov: 50, dof: { focus: 7, aperture: 0.8 } }; } },
  // 7. takip: kamera panel dalgasıyla doğuya kayar
  p_panel: { cam: (tl) => { const k = ease(tl / 1.8);
    return { pos: L3([18, 6.5, 47], [44, 7.5, 43], k), tgt: L3([32, 1.2, 22], [52, 1.4, 14], k), fov: 54, dof: { focus: 26, aperture: 0.4 } }; } },
  // 8. gün doğumu: sahanın çevresinde dönen ve yükselen drone, sonunda kararır
  p_gunes: { cam: (tl) => { const k = ease(tl / 3.6);
    const a = lerp(1.95, 2.42, k), R = lerp(58, 64, k);    // açı (radyan, saha merkezine göre)
    return { pos: [M[0] + Math.cos(a) * R, lerp(6, 30, k), M[2] + Math.sin(a) * R], tgt: [M[0], lerp(2, 1, k), M[2] - 4], fov: 58, post: { fade: 1 - ease((tl - 2.95) / 0.65) } }; } },
};

export const TIMELINE = [
  { shot: 'p_arazi', start: 0, end: 1.8 },
  { shot: 'p_kazik', start: 1.8, end: 3.4 },
  { shot: 'p_kus', start: 3.4, end: 5.0 },
  { shot: 'p_sira', start: 5.0, end: 6.6 },
  { shot: 'p_kons', start: 6.6, end: 8.0 },
  { shot: 'p_panelyakin', start: 8.0, end: 9.6 },
  { shot: 'p_panel', start: 9.6, end: 11.4 },
  { shot: 'p_gunes', start: 11.4, end: 15.0 },
];
export const DURATION = Z.SON;

export function evalShot(name, t) {
  let s = SHOTS[name], tl = t;
  if (s) { const seg = TIMELINE.find((g) => g.shot === name); if (seg) tl = t - seg.start; }
  if (!s) {
    for (const seg of TIMELINE) if (t >= seg.start && t < seg.end) { s = SHOTS[seg.shot]; tl = t - seg.start; name = seg.shot; break; }
    if (!s) { const seg = TIMELINE[TIMELINE.length - 1]; s = SHOTS[seg.shot]; tl = t - seg.start; name = seg.shot; }
  }
  const c = s.cam(tl, t);
  return { name, pos: c.pos, tgt: c.tgt, fov: c.fov ?? 55, dof: c.dof ?? null, shake: 0, handheld: 0, post: { ...(c.post || {}) }, near: c.near ?? 0.3 };
}
