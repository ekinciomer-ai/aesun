// Üç kullanım alanı filmi. Zamanlama, seslendirmeden üretilen kurgu dosyasından (K.sahneler: s0..s4, K.altyazi).
// render(t) saf fonksiyon: her şey t'den ve kin.js'den hesaplanır.
import {runSim} from 'teardown-kit/runtime.js';
import * as THREE from 'three';
import {SPEC, ges, kargo, sm, tarim} from './kin.js';
import {konsolKur} from './konsol.js';
import {sahneKur} from './sahne.js';

const D2R = Math.PI / 180;
let SP = {x: -3.25, y: 1.2, z: 4.6}; // GES sıcak noktası, sahne kurulunca güncellenir
const tr = (x, n = 1) => x.toFixed(n).replace('.', ',');
const eio = (x) => { const u = Math.max(0, Math.min(1, x)); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };

const KONF = {
  tarim: {acc: '#3d8fe0', ust: 'KOZMOS LAB · DRONE NEREDE ÇALIŞIR?', baslik: 'Tarımda ilaçlama', alt: 'AGRAS T50 SINIFI · GERÇEK ÖLÇÜLER', rozet: '40 L', rozetAlt: 'İLAÇ TANKI', sira: '01 / 03',
    satirlar: [{ad: 'TANK', bar: 1}, {ad: 'DEBİ'}, {ad: 'ŞERİT'}, {ad: 'ALAN HIZI'}, {ad: 'DOZAJ'}, {ad: 'İLAÇLANAN', bar: 1}],
    formul: 'ha/sa = v · w · 0,36    dozaj = Q / (v · w) · 10⁴ / 60'},
  ges: {acc: '#f05a23', ust: 'KOZMOS LAB · DRONE NEREDE ÇALIŞIR?', baslik: 'GES termal denetim', alt: 'MATRICE 30T SINIFI · GERÇEK ÖLÇÜLER', rozet: '4,3 cm', rozetAlt: 'PİKSEL · 30 M', sira: '02 / 03',
    satirlar: [{ad: 'YÜKSEKLİK', bar: 1}, {ad: 'PİKSEL (GSD)'}, {ad: 'İZ GENİŞLİĞİ'}, {ad: 'TERMAL'}, {ad: 'HASSASİYET'}, {ad: 'TARANAN', bar: 1}],
    formul: 'GSD = 2h · tan(61°/2) / √(640² + 512²)'},
  kargo: {acc: '#d6182b', ust: 'KOZMOS LAB · DRONE NEREDE ÇALIŞIR?', baslik: 'Havadan kargo', alt: 'FLYCART 30 SINIFI · GERÇEK ÖLÇÜLER', rozet: '40 kg', rozetAlt: 'EN ÇOK YÜK', sira: '03 / 03',
    satirlar: [{ad: 'YÜK'}, {ad: 'HALAT', bar: 1}, {ad: 'VİNÇ HIZI'}, {ad: 'YÜKSEKLİK'}, {ad: 'MENZİL'}, {ad: 'PARAŞÜT'}],
    formul: 'L = 0,8 m/s · t      halat ≤ 20 m'},
};

// ---- her mod: segment sınırları b[0..5] verildiğinde (t) → {D, kam, durum, deg, etk}
function plan(mod, b) {
  const seg = (t) => { let i = 0; while (i < 4 && t >= b[i + 1]) i++; return {i, u: (t - b[i]) / (b[i + 1] - b[i])}; };
  if (mod === 'tarim') {
    const v = 6, w = 9, Q = 16, ZH = 4;                // ZH: göstergede zaman hızlandırma
    const sB = b[2] + 0.5 * (b[3] - b[2]);             // ilaçlama başlangıcı
    const zVis = (t) => -1.2 * Math.max(0, t - sB);    // görselde yavaş ilerleme (kamera takip eder)
    return (t) => {
      const {i, u} = seg(t), s = ZH * Math.max(0, t - sB), m = tarim(s, {v, w, Q});
      const patla = i === 2 ? sm(0.02, 0.18, u) * (1 - sm(0.38, 0.5, u)) : 0;
      const y = i === 0 ? 0.3 + 2.7 * eio(sm(0.15, 0.95, u)) : 3 + Math.sin(t * 1.4) * 0.04;
      const z = zVis(t), sprey = t >= sB ? sm(sB, sB + 0.6, t) : 0;
      const D = {t, y, z, patla, pervane: i === 0 && u < 0.12 ? sm(0, 0.12, u) : patla > 0.3 ? 0.15 : 1, tankOran: m.tank / SPEC.tarim.tankL, serit: w * sprey, izBoy: -z, sprey, egim: t >= sB ? -0.06 : 0};
      const K = [
        (q) => ({tx: 0, ty: 1.2 + 1.3 * eio(q), tz: z, az: 35 + 6 * q, el: 18, d: 12}),
        (q) => ({tx: 0, ty: 2.6, tz: z, az: 20 + 10 * q, el: 62, d: 10.5}),
        (q) => q < 0.5 ? ({tx: 0, ty: 2.9, tz: z, az: 55 + 8 * q, el: 14, d: 8.5}) : ({tx: 0, ty: 2.2, tz: z - 1, az: 200, el: 24, d: 12}),
        (q) => ({tx: 0, ty: 2.8, tz: z, az: 92 - 6 * q, el: 7, d: 8.5}),
        (q) => ({tx: 0, ty: 2, tz: z - 2, az: 160 + 10 * q, el: 30, d: 19}),
      ];
      const durum = ['KALKIŞ · TANK DOLU', '8 PERVANE · 4 KOLDA EŞ EKSENLİ', patla > 0.05 ? 'AYRIŞTIRILMIŞ GÖRÜNÜM' : `İLAÇLAMA · ZAMAN ×${ZH}`, `ARAZİ TAKİBİ · ${SPEC.tarim.egim}°'YE KADAR`, `İLAÇLAMA · ZAMAN ×${ZH}`][i];
      const deg = [{m: `${tr(m.tank)} L`, oran: m.tank / 40}, {m: `${Q} L/dk`}, {m: `${w} m`}, {m: `${tr(m.haSaat)} ha/sa`}, {m: `${tr(m.dozaj, 0)} L/ha`}, {m: `${tr(m.alan, 2)} ha`, oran: m.alan / 0.81}];
      const etk = i === 1 ? ['EŞ EKSENLİ MOTOR', 'GÖVDE'] : i === 2 && u < 0.5 ? ['İLAÇ TANKI', 'POMPA', 'SANTRİFÜJ PÜSKÜRTÜCÜ'] : i === 3 ? ['FAZ DİZİLİ RADAR'] : [];
      return {D, K, i, u, durum, deg, etk, etkO: i === 2 ? sm(0.12, 0.2, u) * (1 - sm(0.42, 0.48, u)) : sm(0.15, 0.3, u) * (1 - sm(0.88, 0.97, u))};
    };
  }
  if (mod === 'ges') {
    const v = 1.2;
    return (t) => {
      const {i, u} = seg(t);
      const h = i < 3 ? 30 : i === 3 ? 40 - 10 * eio(sm(0.05, 0.4, u)) : 30;
      const z = 18 - v * t, m = ges(t, {h, v});
      const termal = i >= 2 ? sm(0.0, 0.35, i === 2 ? u : 1) : 0, sicak = i >= 2 ? sm(i === 2 ? 0.45 : 0, i === 2 ? 0.6 : 0.01, i === 2 ? u : 1) : 0;
      const D = {t, y: h, x: -3.25, z, termal, sicak, iz: i >= 3 ? sm(0, 0.15, i === 3 ? u : 1) : 0, h, pervane: 1, isaret: i === 0 || i === 4 ? 0.85 : 0};
      const K = [
        (q) => ({tx: -3, ty: 17, tz: 0, az: 30 + 8 * q, el: 26, d: 78}),
        (q) => ({tx: -3.25, ty: h - 0.05, tz: z, az: 25 + 20 * q, el: 4, d: 2.3}),
        (q) => ({tx: SP.x, ty: SP.y, tz: SP.z, az: 25 + 8 * q, el: 52, d: 30}),
        (q) => ({tx: -3.25, ty: 15, tz: z, az: 70, el: 12, d: 82}),
        (q) => ({tx: -3, ty: 10, tz: z, az: 120 + 15 * q, el: 34, d: 75}),
      ];
      const durum = ['DENETİM UÇUŞU · 30 M', 'İKİ GÖZ · NORMAL + TERMAL', termal > 0.5 ? (sicak > 0.5 ? 'SICAK NOKTA TESPİT' : 'TERMAL GÖRÜNÜM') : 'TERMAL GÖRÜNÜM AÇILIYOR', 'KAMERA İZİ · GERÇEK ÖLÇEK', 'DENETİM SÜRÜYOR'][i];
      const deg = [{m: `${tr(h, 0)} m`, oran: h / 50}, {m: `${tr(m.gsd * 100, 2)} cm`}, {m: `${tr(m.izW, 1)} m`}, {m: '640×512'}, {m: `<${SPEC.ges.netd} mK`}, {m: `${tr(m.alan, 2)} ha`, oran: m.alan / 0.5}];
      const etk = i === 1 ? ['TERMAL KAMERA', 'GÖVDE'] : [];
      return {D, K, i, u, durum, deg, etk, etkO: sm(0.12, 0.25, u) * (1 - sm(0.88, 0.97, u))};
    };
  }
  // kargo
  const H = 5, R = 0.8, Lyer = H - 0.38 - 0.3;      // halat: kutu yere değene kadar
  return (t) => {
    const {i, u} = seg(t);
    const tInis = b[2], L0 = Math.min(Lyer, R * Math.max(0, t - tInis)), tYer = tInis + Lyer / R;
    const birak = t > tYer + 0.6;
    const L = birak ? Math.max(0, Lyer - R * (t - tYer - 0.6)) : L0;
    const yt = birak ? H + 6 * eio(sm(tYer + 1.2, tYer + 5, t)) : H;
    const zf = i === 0 ? 24 * (1 - eio(sm(0, 0.85, u))) : 0;
    const patla = i === 1 ? sm(0.08, 0.3, u) * (1 - sm(0.75, 0.92, u)) : 0;
    const D = {t, y: yt, z: zf, halat: L, birak, patla, pervane: patla > 0.3 ? 0.15 : 1, egim: i === 0 ? -0.12 * (1 - sm(0.6, 1, u)) : 0};
    const K = [
      (q) => ({tx: 0, ty: H - 0.6, tz: zf, az: 150 - 10 * q, el: 10, d: 12}),
      (q) => ({tx: 0, ty: H - 0.4, tz: 0, az: 40 + 12 * q, el: 12, d: 8.5}),
      (q) => ({tx: 0, ty: 2.1, tz: 0, az: 65, el: 6, d: 21}),
      (q) => ({tx: 0, ty: Math.max(2.1, yt - 2.6), tz: 0, az: 75 + 10 * q, el: 10, d: 23}),
      (q) => ({tx: 0, ty: Math.max(2, yt - 2.6), tz: 0, az: 120 + 12 * q, el: 16, d: 28}),
    ];
    const kalan = Math.max(0, Lyer - L0);
    const durum = ['TESLİMAT NOKTASINA YAKLAŞMA', 'AYRIŞTIRILMIŞ GÖRÜNÜM', birak ? 'TESLİM EDİLDİ' : L0 > 0 ? `VİNÇLE İNDİRME · ${tr(kalan, 1)} M KALDI` : 'HAVADA ASILI', 'GERİ DÖNÜŞ · PARAŞÜT HAZIR', 'GÖREV TAMAM'][i];
    const deg = [{m: birak ? '0 kg' : '30 kg'}, {m: `${tr(L, 1)} m`, oran: L / 20}, {m: '0,8 m/s'}, {m: `${tr(yt, 1)} m`}, {m: '16 km'}, {m: '≥ 60 m'}];
    const etk = i === 1 ? ['VİNÇ', 'YÜK KUTUSU', 'PARAŞÜT'] : i === 3 ? ['PARAŞÜT'] : [];
    return {D, K, i, u, durum, deg, etk, etkO: sm(0.25, 0.38, u) * (1 - sm(0.72, 0.8, u)) * (i === 1 ? 1 : 1)};
  };
}

const V3 = THREE.Vector3;
function etiketler(st, adlar, o) {
  if (!adlar.length || o < 0.01) return [];
  const sec = st.drone.P.filter((p) => adlar.includes(p.ad) && p.sadece !== false);
  const goru = [];
  const tekrar = new Set();
  for (const p of sec) {
    if (tekrar.has(p.ad)) continue; tekrar.add(p.ad);
    const w = p.o.getWorldPosition(new V3());
    const s = st.project(w.x, w.y, w.z);
    if (s) goru.push({ad: p.ad, alt: p.alt, px: s[0], py: s[1]});
  }
  const sol = goru.filter((g) => g.px < 540).sort((a, b) => a.py - b.py), sag = goru.filter((g) => g.px >= 540).sort((a, b) => a.py - b.py);
  const yerles = (kol, lx, isSag) => { let y = 440; return kol.map((g) => { y = Math.max(y, Math.min(1180, g.py)); const r = {...g, lx, ly: y, sag: isSag, o}; y += 104; return r; }); };
  return [...yerles(sol, 64, false), ...yerles(sag, 1016, true)];
}

export function calistir(mod, K) {
  const b = [0, ...K.sahneler.slice(1).map((s) => s.bas), K.toplam];
  const P = plan(mod, b);
  runSim({duration: K.toplam, fps: 30, theme: 'light', accent: KONF[mod].acc, hud: {enabled: false, title: KONF[mod].baslik, subtitle: ''}, director: {enabled: false}, watermark: ''}, async ({canvas, capture}) => {
    const st = sahneKur({canvas, mod});
    if (st.sicakPos) SP = st.sicakPos;
    const app = document.getElementById('app');
    const resize = () => {
      const k = Math.min(innerWidth / 1080, innerHeight / 1920);
      canvas.style.width = `${1080 * k}px`; canvas.style.height = `${1920 * k}px`;
      st.resize(1080, 1920, capture ? (devicePixelRatio || 1) * k : Math.min(devicePixelRatio || 1, 2) * k);
    };
    resize();
    const ui = konsolKur(app, KONF[mod]);
    const kam = (t) => {
      const r = P(t); let c = r.K[r.i](r.u);
      if (r.i > 0) { const g = eio(Math.min(1, (t - b[r.i]) / 1.3)); if (g < 1) { const p = P(b[r.i] - 1e-3), c0 = p.K[r.i - 1](1); const o = {}; for (const k in c) o[k] = c0[k] + (c[k] - c0[k]) * g; c = o; } }
      if (mod === 'tarim' && r.i === 2) { // aynı segment içinde iki kamera arası yumuşak geçiş
        const m = (t - b[2]) / (b[3] - b[2]); if (m > 0.5 && m < 0.62) { const a = r.K[2](0.499), z = r.K[2](0.5), g = eio((m - 0.5) / 0.12); const o = {}; for (const k in z) o[k] = a[k] + (z[k] - a[k]) * g; c = o; }
      }
      return {r, c};
    };
    return {
      resize,
      render(t) {
        const {r, c} = kam(t);
        st.kare(r.D, {tx: c.tx, ty: c.ty, tz: c.tz, az: c.az * D2R, el: c.el * D2R, d: c.d});
        const a = K.altyazi.find((x) => t >= x.bas && t < x.son);
        ui.guncelle({durum: r.durum, degerler: r.deg, etiketler: etiketler(st, r.etk, r.etkO), altyazi: a ? a.metin : ''});
        return {};
      },
    };
  });
}
