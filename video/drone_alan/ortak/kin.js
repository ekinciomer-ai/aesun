// Drone kullanım alanları · matematik. three.js yok. Tek girdi: görev saati s (saniye, gerçek dünya).
// Kaynaklar: DJI Agras T50, DJI Matrice 30T, DJI FlyCart 30 resmî teknik özellikleri (bayi kataloglarından).

export const SPEC = {
  tarim: { // DJI Agras T50
    ad: 'TARIM DRONU', model: 'AGRAS T50 SINIFI',
    acikL: 2.800, acikW: 3.085, aks: 2.200, pervaneD: 1.375, rotor: 8, // m, eş eksenli 4 kol × 2
    tankL: 40, debiMax: 16, nozul: 2, genislik: [4, 11], genislikH: 3, // L, L/dk, m (3 m yükseklikte)
    egim: 50, radar: [1, 50], mtow: 92, // °, m, kg
  },
  ges: { // DJI Matrice 30T
    ad: 'TERMAL DENETİM DRONU', model: 'MATRICE 30T SINIFI',
    aks: 0.668, pervaneD: 0.42, rotor: 4,
    termalPx: [640, 512], dfov: 61, netd: 50, dogruluk: 2, sure: 41, // px, °, mK, ±°C, dk
  },
  kargo: { // DJI FlyCart 30
    ad: 'KARGO DRONU', model: 'FLYCART 30 SINIFI',
    acikL: 2.800, acikW: 3.085, aks: 2.200, pervaneD: 1.375, rotor: 8,
    yukMax: 40, yukCift: 30, menzilCift: 16, halat: 20, halatHiz: 0.8, parasut: 60, // kg, kg, km, m, m/s, m
  },
};

const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const sm = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ---------- TARIM: hız v, yükseklik 3 m'de şerit genişliği w, debi Q → alan hızı, dozaj, tank seviyesi
export function tarim(s, {v = 6, w = 9, Q = 16} = {}) {
  const T = SPEC.tarim;
  const akan = Math.min(T.tankL, (Q / 60) * Math.max(0, s));       // L
  const tank = T.tankL - akan;                                        // L
  const alanHiz = v * w;                                              // m²/s
  const haSaat = (alanHiz * 3600) / 10000;                            // ha/sa
  const dozaj = (Q / 60) / alanHiz * 10000;                           // L/ha
  const alan = (alanHiz * Math.max(0, s)) / 10000;                    // ha
  const bitis = (T.tankL / Q) * 60;                                   // s
  return {tank, akan, alanHiz, haSaat, dozaj, alan, bitis, v, w, Q};
}

// ---------- GES: yükseklik h → yer örnekleme mesafesi (GSD), iz genişliği, taranan alan
export function gesGsd(h) {
  const G = SPEC.ges;
  const diagPx = Math.hypot(G.termalPx[0], G.termalPx[1]);            // 819,6 px
  const diagYer = 2 * h * Math.tan((G.dfov / 2) * Math.PI / 180);     // m
  const gsd = diagYer / diagPx;                                       // m/px
  return {gsd, izW: gsd * G.termalPx[0], izH: gsd * G.termalPx[1], diagYer};
}
export function ges(s, {h = 30, v = 5} = {}) {
  const g = gesGsd(h);
  const yol = v * Math.max(0, s);                                     // m
  const alan = (yol * g.izW) / 10000;                                 // ha
  const hucre = 0.182;                                                // m, M10 hücre kenarı (örnek modül)
  return {...g, h, v, yol, alan, hucrePx: hucre / g.gsd};
}

// ---------- KARGO: halat boyu (0..20 m, 0,8 m/s), yük, menzil, kalan batarya (örnek görev)
export function kargo(s, {yuk = 30, inisBas = 0, inisSure = 25} = {}) {
  const K = SPEC.kargo;
  const k = cl((s - inisBas) / inisSure);
  const halat = Math.min(K.halat, K.halatHiz * Math.max(0, s - inisBas)); // m
  return {yuk, halat, halatOran: halat / K.halat, menzil: yuk <= K.yukCift ? K.menzilCift : 8, k};
}

// ---------- kontrol: elle doğrulama (node ile çalıştırılabilir)
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('kin.js')) {
  const g = gesGsd(30);
  console.log('GSD 30 m:', (g.gsd * 100).toFixed(2), 'cm/px · iz', g.izW.toFixed(1), 'm');
  const t = tarim(60);
  console.log('Tarım 60 s: tank', t.tank.toFixed(1), 'L · ', t.haSaat.toFixed(1), 'ha/sa · dozaj', t.dozaj.toFixed(1), 'L/ha · bitiş', t.bitis, 's');
  console.log('Kargo 10 s: halat', kargo(10).halat, 'm');
}
