// NREL 5 MW referans türbini (Jonkman ve ark., 2009, NREL/TP-500-38060). Tek girdi: rüzgâr hızı v (m/s).
// Rotor devri, kanat açısı, jeneratör devri ve güç bu fonksiyondan okunur; three.js yok.
export const T = {
  P: 5.0, // MW anma gücü
  R: 63, // m rotor yarıçapı (çap 126 m)
  hub: 90, // m göbek yüksekliği
  kule: 87.6, // m kule yüksekliği
  kanat: 61.5, // m kanat boyu
  vin: 3, vr: 11.4, vout: 25, // m/s devreye girme / anma / devreden çıkma
  rpmMin: 6.9, rpmMax: 12.1, // dev/dk rotor
  disli: 97, // şanzıman oranı 97:1
  verim: 0.944, // jeneratör verimi
  cp: 0.482, lam: 7.55, // en iyi güç katsayısı ve uç hız oranı
  rho: 1.225, // kg/m³ hava yoğunluğu
  tilt: 5, precone: 2.5, overhang: 5,
  mKanat: 17740, mRotor: 110000, mNasel: 240000, mKule: 347460, // kg
};
T.A = Math.PI * T.R * T.R;
// anma üstü kararlı kanat açısı (Jonkman tablo 7-1, yaklaşık)
const PITCH = [[11.4, 0], [12, 3.83], [13, 6.6], [14, 8.7], [15, 10.45], [16, 12.06], [17, 13.54], [18, 14.92], [19, 16.23], [20, 17.47], [21, 18.7], [22, 19.94], [23, 21.18], [24, 22.35], [25, 23.47]];
const tablo = (tb, x) => {
  if (x <= tb[0][0]) return tb[0][1];
  for (let i = 1; i < tb.length; i++) if (x <= tb[i][0]) {
    const [x0, y0] = tb[i - 1], [x1, y1] = tb[i];
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return tb[tb.length - 1][1];
};
/** v: rüzgâr (m/s); dur: 0..1 fırtına durdurma (kanatlar 90°'ye, rotor durur) */
export function durum(v, dur = 0) {
  let rpm, P, pitch;
  if (v < T.vin) { rpm = 0; P = 0; pitch = 0; }
  else if (v < T.vr) {
    rpm = Math.min(T.rpmMax, Math.max(T.rpmMin, (T.lam * v / T.R) * 60 / (2 * Math.PI)));
    P = Math.min(T.P, 0.5 * T.rho * T.A * T.cp * v ** 3 * T.verim / 1e6);
    pitch = 0;
  } else { rpm = T.rpmMax; P = T.P; pitch = tablo(PITCH, Math.min(v, 25)); }
  rpm *= 1 - dur; P *= 1 - dur; pitch = pitch + (90 - pitch) * dur;
  return {v, rpm, gen: rpm * T.disli, P, pitch, tork: rpm > 0 ? P * 1e6 / (rpm * 2 * Math.PI / 60) / 1e3 : 0};
}
/** güç eğrisi örnekleri (çizim için) */
export const egri = () => Array.from({length: 121}, (_, i) => { const v = i * 0.25; return [v, v > T.vout ? 0 : durum(v).P]; });
