// Kurgunun zaman çizelgesi ve ışık geçişi. Sahne, ses ve kamera aynı sabitleri kullanır.
import * as THREE from 'three';

export const Z = {
  kazikBas: 2.1, kazikSon: 4.9,      // kazıklar sırayla çakılır
  konsBas: 5.0, konsSon: 7.9,        // konstrüksiyon yükselir
  panelBas: 8.0, panelSon: 11.8,     // paneller dalga gibi oturur
  gunBas: 11.4, gunSon: 14.2,        // güneş doğar
  ledBas: 12.3, ledSon: 13.2,        // inverter ışıkları yanar
  SON: 15,
};

export const clamp01 = (k) => Math.min(1, Math.max(0, k));
export const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
export const easeOut = (k) => { k = clamp01(k); return 1 - Math.pow(1 - k, 3); };
export const easeOutBack = (k) => { k = clamp01(k); const c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

const C = (r, g, b) => new THREE.Color(r, g, b);
// şafak öncesi (mavi saat) ve gün doğumu anahtarları
const SAFAK = {
  zenith: C(0.050, 0.100, 0.215), horizon: C(0.150, 0.185, 0.290), skyGlow: 0.9, skyGlowDir: new THREE.Vector3(0.75, 0.06, -0.66).normalize(),
  fogColor: C(0.110, 0.150, 0.240), mistColor: C(0.150, 0.180, 0.240),
  hemiSky: C(0.62, 0.70, 0.86), hemiGround: C(0.05, 0.05, 0.05), hemiIntensity: 1.5,
  keyColor: C(0.78, 0.84, 1.0), keyIntensity: 0.55, keyDir: new THREE.Vector3(0.55, 0.65, 0.35).normalize(), exposure: 1.05, mistDensity: 0.030,
};
const GUNES = {
  zenith: C(0.140, 0.300, 0.580), horizon: C(1.150, 0.560, 0.230), skyGlow: 2.6, skyGlowDir: new THREE.Vector3(0.75, 0.06, -0.66).normalize(),
  fogColor: C(0.620, 0.470, 0.360), mistColor: C(0.700, 0.540, 0.400),
  hemiSky: C(0.85, 0.82, 0.80), hemiGround: C(0.12, 0.09, 0.06), hemiIntensity: 1.7,
  keyColor: C(1.0, 0.72, 0.42), keyIntensity: 3.0, keyDir: new THREE.Vector3(0.80, 0.30, -0.10).normalize(), exposure: 1.0, mistDensity: 0.018,
};
const _v = new THREE.Vector3();
export function gunIsigi(t, LOOK) {
  const k = ease((t - Z.gunBas) / (Z.gunSon - Z.gunBas));
  for (const n of ['zenith', 'horizon', 'fogColor', 'mistColor', 'hemiSky', 'hemiGround', 'keyColor']) LOOK[n].copy(SAFAK[n]).lerp(GUNES[n], k);
  for (const n of ['skyGlow', 'hemiIntensity', 'keyIntensity', 'exposure', 'mistDensity']) LOOK[n] = SAFAK[n] + (GUNES[n] - SAFAK[n]) * k;
  LOOK.skyGlowDir.copy(SAFAK.skyGlowDir);
  LOOK.keyDir.copy(_v.copy(SAFAK.keyDir).lerp(GUNES.keyDir, k).normalize());
  return k;
}
