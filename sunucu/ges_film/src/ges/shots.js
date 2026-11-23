// Dikey (9:16) kamera planları ve kurgu. Konumlar dünya koordinatında (metre).
// Saha: X 0..64 (batı→doğu), Z 0..40 (5 sıra), paneller +Z'ye (kameraya) bakar. Servis yolu z≈46.
import { Z, ease } from './zaman.js';

const lerp = (a, b, k) => a + (b - a) * k;
const L3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export const SHOTS = {
  // 1. boş arazi, sis; yerden alçak itme, açılışta kararmadan açılır
  p_arazi: { cam: (tl) => { const k = ease(tl / 2.1);
    return { pos: L3([4, 1.1, 62], [8, 1.5, 55], k), tgt: [26, 3.5, 12], fov: 62, dof: { focus: 30, aperture: 0.8 }, post: { fade: ease(tl / 0.9) } }; } },
  // 2. kazık çakımı yakın: ön sıranın batı ucu
  p_kazik: { cam: (tl) => { const k = tl / 2.9;
    return { pos: L3([-2.5, 1.3, 42.6], [-0.5, 1.6, 42.0], k), tgt: L3([4, 1.1, 37.5], [8, 1.3, 36.5], k), fov: 52, dof: { focus: 9, aperture: 1.6 }, shake: 1 }; } },
  // 3. konstrüksiyon: yarı yüksek 3/4 açı
  p_kons: { cam: (tl) => { const k = tl / 3.0;
    return { pos: L3([-12, 8.5, 56], [-7, 10.5, 52], ease(k)), tgt: [24, 1.2, 22], fov: 54 }; } },
  // 4. panel dalgası: kamera dalgayla birlikte doğuya kayar
  p_panel: { cam: (tl) => { const k = tl / 3.6;
    return { pos: L3([2, 5.5, 50], [34, 6.5, 50], ease(k)), tgt: L3([10, 1.2, 28], [44, 1.6, 24], ease(k)), fov: 56, dof: { focus: 24, aperture: 0.5 } }; } },
  // 5. gün doğumu: vinç gibi yükselip sahayı ve ufku gösterir, sonda kararır
  p_gunes: { cam: (tl) => { const k = ease(tl / 3.6);
    return { pos: L3([18, 4, 58], [30, 34, 72], k), tgt: L3([36, 3, 20], [38, 2, -8], k), fov: L3([58, 0, 0], [62, 0, 0], k)[0], post: { fade: 1 - ease((tl - 2.95) / 0.65) } }; } },
};

export const TIMELINE = [
  { shot: 'p_arazi', start: 0, end: 2.1 },
  { shot: 'p_kazik', start: 2.1, end: 5.0 },
  { shot: 'p_kons', start: 5.0, end: 8.0 },
  { shot: 'p_panel', start: 8.0, end: 11.6 },
  { shot: 'p_gunes', start: 11.6, end: 15.0 },
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
  return { name, pos: c.pos, tgt: c.tgt, fov: c.fov ?? 55, dof: c.dof ?? null, shake: c.shake ?? 1, handheld: c.handheld ?? 1, post: { ...(c.post || {}) }, near: c.near ?? 0.3 };
}
