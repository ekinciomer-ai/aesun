// Kazık çakma planı: her kazık hattı (sıra × ön/arka) bir çakma makinesi. Makine kazıktan kazığa ilerler,
// kazığı mastta tutar, çekiçle 2 darbede çakar. Zamanlar müzik ızgarasına (150 BPM: vuruş 0.4 sn, 16'lık 0.1 sn) oturur.
// Sahne (saha.js), makine (makine.js) ve ses (ges_ses.mjs) aynı planı kullanır.
import { Z } from './zaman.js';

export const SAHA = {
  SIRA: 5, MASA: 4,
  SIRA_ARA: 9.0, MASA_ARA: 16.0,
  MASA_BOY: 13.6, AYAK_X: [0.5, 6.8, 13.1],
  EGIM: 25 * Math.PI / 180,
  PANEL_EN: 1.13, PANEL_BOY: 2.28, PANEL_YAN: 12, PANEL_UST: 2,
  ON_Z: 1.6, ARKA_Z: -1.6, ON_Y: 1.0,
  MAKINE_YAN: 1.35,          // makine gövde merkezinin kazık hattına uzaklığı (mast yanda)
};
export const ARKA_Y = SAHA.ON_Y + (SAHA.ON_Z - SAHA.ARKA_Z) * Math.tan(SAHA.EGIM);

export const CEKIC = { HAREKET: 0.2, DARBE: [0, 0.1], SURE: 0.2, BEKLE_X: -2.6 };

export function kazikPlani() {
  const S = SAHA, hatlar = [];
  const xler = [];
  for (let c = 0; c < S.MASA; c++) for (const ax of S.AYAK_X) xler.push(c * S.MASA_ARA + ax);
  const adim = (Z.kazikSon - Z.kazikBas) / xler.length;          // 0.4 sn = 1 vuruş
  for (let r = S.SIRA - 1; r >= 0; r--) for (const on of [true, false]) {
    const z0 = r * S.SIRA_ARA, hz = z0 + (on ? S.ON_Z : S.ARKA_Z);
    const yan = on ? 1 : -1;                                      // makine hattın dış tarafında
    const kaziklar = xler.map((x, j) => ({ x, z: hz, top: on ? S.ON_Y : ARKA_Y, ts: Z.kazikBas + j * adim + CEKIC.HAREKET }));
    hatlar.push({ r, on, z: hz, mz: hz + yan * S.MAKINE_YAN, yan, kaziklar, adim });
  }
  return hatlar;
}

// kazığın görünen üst ucunun zemine göre fazlası (0 = çakıldı); null = henüz görünmez
export function kazikUst(p, t) {
  const d = t - p.ts;
  if (d < -0.02) return null;
  if (d < 0) return 2.2;                                          // mastta tutuluyor
  if (d < 0.1) return 2.2 - 1.3 * Math.min(1, d / 0.03);          // 1. darbe
  if (d < 0.2) return 0.9 - 0.9 * Math.min(1, (d - 0.1) / 0.03);  // 2. darbe
  return 0;
}
