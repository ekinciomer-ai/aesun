// GES filmi ses bandı: müzik + ortam + olay sesleri. Zamanlar sahnenin kendi sabitlerinden (zaman.js, saha.js) gelir.
// Kullanım: node tools/ges_ses.mjs [--out out/ges_ses.wav]
// Kaynaklar: audio/CREDITS.md (müzik Scott Buckley CC BY 4.0, efektler freesound CC0).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'out/ges_ses.wav';
const { Z } = await import(pathToFileURL(path.join(ROOT, 'src/ges/zaman.js')));
const { SAHA, uzaklik } = await import(pathToFileURL(path.join(ROOT, 'src/ges/mods/saha.js')));
const DUR = Z.SON;

const olay = [];   // { dosya, at, ss, d, g, fo }
const ekle = (dosya, at, o = {}) => olay.push({ dosya, at, ss: o.ss ?? 0, d: o.d ?? 3, g: o.g ?? 1, fo: o.fo ?? 0.08, fi: o.fi ?? 0.005 });

// müzik: tam orkestra girişi (5:13.4) panel dalgasına denk gelir
ekle('music/the_long_dark.mp3', 0, { ss: 313.4 - Z.panelBas, d: DUR, g: 0.55, fi: 1.2, fo: 1.0 });
ekle('sfx/fieldamb.mp3', 0, { ss: 12, d: DUR, g: 0.5, fi: 0.8, fo: 1.0 });
ekle('sfx/windsoft.mp3', 0, { ss: 2, d: DUR, g: 0.25, fi: 1, fo: 1 });

// kazık darbeleri: kameraya en yakın ön sıra kazıkları (her biri 5 darbe)
const kaz = [];
for (let c = 0; c < SAHA.MASA; c++) for (const ax of SAHA.AYAK_X) {
  const x = c * SAHA.MASA_ARA + ax, z = (SAHA.SIRA - 1) * SAHA.SIRA_ARA + SAHA.ON_Z;
  kaz.push({ x, ts: Z.kazikBas + (Z.kazikSon - 0.55 - Z.kazikBas) * uzaklik(x, z) });
}
kaz.sort((a, b) => a.x - b.x);
kaz.slice(0, 7).forEach((p, j) => {
  const g = 0.9 * Math.pow(0.82, j);
  for (let i = 0; i < 5; i++) {
    const at = p.ts + i * 0.11;
    if (at < 2.1 || at > 5.0) continue;
    ekle('sfx/mechclamp.mp3', at, { ss: 0.0, d: 0.22, g, fo: 0.1 });
    ekle('sfx/bassimpact.mp3', at, { d: 0.35, g: g * 0.45, fo: 0.2 });
  }
});
// konstrüksiyon: hidrolik / vinç
ekle('sfx/hoist.mp3', Z.konsBas, { ss: 3, d: 3.0, g: 0.45, fi: 0.4, fo: 0.6 });
ekle('sfx/hydraulics.mp3', Z.konsBas + 0.6, { d: 2.2, g: 0.35, fi: 0.2, fo: 0.5 });
// panel oturma tıkırtıları (dalga boyunca)
for (let i = 0; i < 14; i++) ekle('sfx/metaldoor3.mp3', Z.panelBas + 0.35 + i * 0.24 + (i % 3) * 0.03, { d: 0.18, g: 0.32 - i * 0.012, fo: 0.08 });
// gün doğumu: kuşlar
ekle('sfx/doveswings.mp3', Z.gunBas + 0.8, { ss: 1, d: 2.6, g: 0.5, fi: 0.3, fo: 0.8 });
ekle('sfx/crowcalls.mp3', Z.gunBas + 1.6, { ss: 2, d: 3.0, g: 0.18, fi: 0.4, fo: 0.8 });

// ffmpeg filtre grafiği
const dosyalar = [...new Set(olay.map((o) => o.dosya))];
const say = Object.fromEntries(dosyalar.map((d) => [d, olay.filter((o) => o.dosya === d).length]));
const args = ['-v', 'error', '-y'];
for (const d of dosyalar) args.push('-i', path.join(ROOT, 'audio', d));
const fc = [], etiket = [], sira = {};
dosyalar.forEach((d, i) => { fc.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=${say[d]}${Array.from({ length: say[d] }, (_, k) => `[s${i}_${k}]`).join('')}`); sira[d] = 0; });
olay.forEach((o, n) => {
  const i = dosyalar.indexOf(o.dosya), k = sira[o.dosya]++;
  const ms = Math.max(0, Math.round(o.at * 1000));
  fc.push(`[s${i}_${k}]atrim=start=${o.ss}:duration=${o.d},asetpts=PTS-STARTPTS,afade=t=in:d=${o.fi},afade=t=out:st=${Math.max(0, o.d - o.fo)}:d=${o.fo},volume=${o.g.toFixed(3)},adelay=${ms}|${ms}[e${n}]`);
  etiket.push(`[e${n}]`);
});
fc.push(`${etiket.join('')}amix=inputs=${etiket.length}:normalize=0:dropout_transition=0,atrim=duration=${DUR},alimiter=limit=0.89,afade=t=out:st=${DUR - 0.7}:d=0.7[out]`);
args.push('-filter_complex', fc.join(';'), '-map', '[out]', '-ar', '48000', path.join(ROOT, out));
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
console.log(`ses: ${olay.length} olay → ${out}`);
