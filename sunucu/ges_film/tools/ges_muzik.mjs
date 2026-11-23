// Hareketli montaj müziği — tamamen kodla sentezlenir (telif yok, kaynak satırı gerekmez).
// 150 BPM, D minör → gün doğumunda D majöre açılır. Bölümler sahne zamanlarına (zaman.js) oturur.
// Kullanım: node tools/ges_muzik.mjs [--out audio/music/ges_montaj.wav]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'audio/music/ges_montaj.wav';
const { Z } = await import(pathToFileURL(path.join(ROOT, 'src/ges/zaman.js')));

const SR = 48000, DUR = Z.SON + 0.6, N = Math.round(DUR * SR);
const B = 60 / Z.BPM, S16 = B / 4, BAR = 4 * B;
const L = new Float32Array(N), R = new Float32Array(N);
const revL = new Float32Array(N), revR = new Float32Array(N);   // yankı gönderimi
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const add = (i, l, r, rv = 0) => { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; if (rv) { revL[i] += l * rv; revR[i] += r * rv; } };

// --- enstrümanlar ---
function kick(t0, g = 1) {
  const n = Math.round(0.32 * SR), s0 = Math.round(t0 * SR); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; const f = 48 + 110 * Math.exp(-t * 32); ph += 2 * Math.PI * f / SR;
    const v = (Math.sin(ph) * Math.exp(-t * 8) + (t < 0.004 ? (rnd() - 0.5) * 0.6 : 0)) * g * 0.95; add(s0 + i, v, v); }
}
function clap(t0, g = 1) {
  const n = Math.round(0.22 * SR), s0 = Math.round(t0 * SR); let lp = 0, prev = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; const env = (t < 0.01 ? 1 : 0) * (1 - (t % 0.01) / 0.01) * 0.6 + Math.exp(-(t - 0.02) * 22) * (t > 0.02 ? 1 : 0);
    const x = rnd() * 2 - 1; lp += 0.35 * (x - lp); const bp = lp - prev * 0.6; prev = lp;
    const v = bp * env * g * 0.55; add(s0 + i, v * 0.95, v, 0.35); }
}
function hat(t0, g = 1, acik = false, pan = 0.2) {
  const n = Math.round((acik ? 0.16 : 0.04) * SR), s0 = Math.round(t0 * SR); let p = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; const x = rnd() * 2 - 1; const hp = x - p; p = x;
    const v = hp * Math.exp(-t * (acik ? 22 : 90)) * g * 0.065; add(s0 + i, v * (1 - pan), v * (1 + pan)); }
}
// süpürme testere dalga + tek kutuplu alçak geçiren, zarflı
function saw(t0, dur, m, g, { cut = 1800, cutEnv = 0, a = 0.005, d = 0.2, sus = 0.6, rel = 0.05, det = 0, pan = 0, rv = 0, kare = false } = {}) {
  const n = Math.round((dur + rel) * SR), s0 = Math.round(t0 * SR), f = mtof(m);
  const ph = [rnd(), rnd()], fs_ = [f * Math.pow(2, det / 1200), f * Math.pow(2, -det / 1200)];
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = t < a ? t / a : t < a + d ? 1 - (1 - sus) * (t - a) / d : sus;
    if (t > dur) env *= Math.max(0, 1 - (t - dur) / rel);
    let v = 0;
    for (let k = 0; k < 2; k++) { ph[k] = (ph[k] + fs_[k] / SR) % 1; v += kare ? (ph[k] < 0.5 ? 0.7 : -0.7) : 2 * ph[k] - 1; }
    const c = Math.min(0.99, 2 * Math.PI * (cut + cutEnv * Math.exp(-t * 18)) / SR);
    lp1 += c * (v - lp1); lp2 += c * (lp1 - lp2);
    const o = lp2 * env * g * 0.5; add(s0 + i, o * (1 - pan), o * (1 + pan), rv);
  }
}
function gurultuYukselis(t0, t1, g) {   // riser: yükselen filtreli gürültü
  const s0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR); let lp = 0;
  for (let i = 0; i < n; i++) { const k = i / n; const c = Math.min(0.95, 2 * Math.PI * (400 + 9000 * k * k) / SR);
    lp += c * ((rnd() * 2 - 1) - lp); const v = lp * k * k * g * 0.35; add(s0 + i, v, v, 0.4); }
}
function darbe(t0, g) {   // büyük vurgu: alçak boom + zil gürültüsü
  kick(t0, 1.3 * g);
  const n = Math.round(1.8 * SR), s0 = Math.round(t0 * SR); let p = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, x = rnd() * 2 - 1, hp = x - p * 0.9; p = x; const v = hp * Math.exp(-t * 2.6) * g * 0.18; add(s0 + i, v, v * 0.92, 0.6); }
}

// --- armoni: Dm | Bb | F | C  (gün doğumunda Bb | C | D) ---
const AK = { Dm: [62, 65, 69], Bb: [58, 62, 65], F: [60, 65, 69], C: [60, 64, 67], D: [62, 66, 69] };
const KOK = { Dm: 38, Bb: 34, F: 41, C: 36, D: 38 };
const dizi = ['Dm', 'Bb', 'F', 'C'];
const akorAt = (t) => {
  if (t >= Z.gunBas) { const k = Math.floor((t - Z.gunBas) / BAR); return ['Bb', 'C', 'D', 'D'][Math.min(3, k)]; }
  return dizi[Math.floor(t / BAR) % 4];
};

const bolum = (t) => (t < Z.kazikBas ? 'giris' : t < Z.panelBas ? 'A' : t < Z.gunBas ? 'B' : 'son');
const toplamAdim = Math.floor(Z.SON / S16);
for (let s = 0; s < toplamAdim; s++) {
  const t = s * S16, b = bolum(t), a = akorAt(t), vurus = s % 4 === 0, n16 = s % 16;
  if (b === 'giris') {
    if (vurus && s >= 8) kick(t, 0.5);
    if (s % 2 === 1) hat(t, 0.5);
  } else if (b === 'A' || b === 'B') {
    if (vurus) kick(t, 1);
    if (n16 === 4 || n16 === 12) clap(t, b === 'B' ? 1 : 0.85);
    hat(t, s % 2 ? 0.9 : 0.55, n16 % 4 === 2, (s % 2 ? 0.25 : -0.15));
    // bas: 8'lik ostinato (kök-kök-oktav-kök), kick'ten kaçar
    if (s % 2 === 0) { const nota = KOK[a] + ((s / 2) % 4 === 2 ? 12 : 0); saw(t + 0.012, S16 * 1.7, nota, 0.9, { cut: 380, cutEnv: 900, d: 0.12, sus: 0.5, rel: 0.03 }); }
    // arpej: B bölümünde 16'lık, A'nın 2. yarısında 8'lik
    const ak = AK[a], seq = [0, 1, 2, 1, 2, 0, 2, 1];
    if (b === 'B' || (t >= 4.8 && s % 2 === 0)) saw(t, S16 * 0.9, ak[seq[s % 8]] + 12, 0.42, { cut: 2600, cutEnv: 2500, d: 0.08, sus: 0.15, rel: 0.05, kare: true, pan: (s % 2 ? 0.35 : -0.35), rv: 0.25 });
  } else {
    // son: geniş akor + yumuşak ritim, son vuruşta büyük vurgu
    if (vurus && t < Z.SON - 1.2) kick(t, 0.75);
    if (s % 2 === 1 && t < Z.SON - 1.2) hat(t, 0.6, n16 % 4 === 2);
    const ak = AK[a], seq = [0, 1, 2, 1];
    if (t < Z.SON - 1.2) saw(t, S16 * 0.9, ak[seq[s % 4]] + 12 + (s % 8 >= 4 ? 12 : 0), 0.3, { cut: 3200, cutEnv: 2000, d: 0.1, sus: 0.1, rel: 0.08, kare: true, pan: (s % 2 ? 0.4 : -0.4), rv: 0.45 });
  }
}
// pad akorları (her ölçü), bölüme göre yoğunluk
for (let bar = 0; bar * BAR < Z.SON; bar++) {
  const t = bar * BAR, a = akorAt(t + 0.01), b = bolum(t + 0.01);
  const g = b === 'giris' ? 0.32 : b === 'A' ? 0.22 : b === 'B' ? 0.3 : 0.42;
  const sur = Math.min(BAR, Z.SON - t);
  for (const m of AK[a]) saw(t, sur, m, g, { cut: b === 'son' ? 2400 : 1300, a: 0.25, d: 0.5, sus: 0.85, rel: 0.4, det: 9, pan: (m % 2 ? 0.3 : -0.3), rv: 0.5 });
  if (b === 'son') saw(t, sur, AK[a][0] - 12, 0.3, { cut: 900, a: 0.3, sus: 0.9, rel: 0.6, det: 6, rv: 0.4 });
}
// geçişler
gurultuYukselis(Z.panelBas - 1.6, Z.panelBas, 1.0);
darbe(Z.panelBas, 1.0);
gurultuYukselis(Z.gunBas - 0.8, Z.gunBas, 0.6);
darbe(Z.gunBas, 0.7);
darbe(Z.SON - 1.2, 0.9);
saw(Z.SON - 1.2, 1.4, 50, 0.5, { cut: 700, a: 0.01, sus: 0.8, rel: 0.6, rv: 0.6 });
for (const m of AK.D) saw(Z.SON - 1.2, 1.4, m + 12, 0.35, { cut: 3000, a: 0.01, d: 0.6, sus: 0.5, rel: 0.6, det: 8, rv: 0.6 });

// --- yankı (Schroeder) ---
function yanki(src, dst, gecikmeler) {
  const comb = gecikmeler.map((d) => ({ b: new Float32Array(Math.round(d * SR)), i: 0 }));
  const ap = [0.005, 0.0017].map((d) => ({ b: new Float32Array(Math.round(d * SR)), i: 0 }));
  for (let n = 0; n < N; n++) {
    let y = 0;
    for (const c of comb) { const o = c.b[c.i]; c.b[c.i] = src[n] + o * 0.78; c.i = (c.i + 1) % c.b.length; y += o; }
    y /= comb.length;
    for (const a of ap) { const o = a.b[a.i]; const v = -0.6 * y + o; a.b[a.i] = y + 0.6 * v; a.i = (a.i + 1) % a.b.length; y = v; }
    dst[n] += y * 0.55;
  }
}
yanki(revL, L, [0.0297, 0.0371, 0.0411, 0.0437]);
yanki(revR, R, [0.0301, 0.0359, 0.0423, 0.0449]);

// --- son işlem: yumuşak sınırlayıcı, normalize, bitişte söndürme ---
let pk = 0;
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 0.8); R[i] = Math.tanh(R[i] * 0.8); pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
const gn = 0.89 / pk, fo = Math.round(0.5 * SR);
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const f = i > N - fo ? (N - i) / fo : 1;
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gn * f)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gn * f)) * 32767), i * 4 + 2);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true });
fs.writeFileSync(path.join(ROOT, out), Buffer.concat([h, pcm]));
console.log(`müzik: ${Z.BPM} BPM, ${DUR.toFixed(1)} sn → ${out}`);
