// GES filmi ses bandı: müzik + ortam + olay sesleri. Zamanlar sahnenin kendi sabitlerinden (zaman.js, saha.js) gelir.
// Kullanım: node tools/ges_ses.mjs [--out out/ges_ses.wav]
// Kaynaklar: müzik kodla üretilir (ges_muzik.mjs, telifsiz); efektler freesound CC0 (audio/CREDITS.md).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'out/ges_ses.wav';
const { Z } = await import(pathToFileURL(path.join(ROOT, 'src/ges/zaman.js')));
const { kazikPlani, CEKIC } = await import(pathToFileURL(path.join(ROOT, 'src/ges/kazik_plan.js')));
const DUR = Z.SON;

const olay = [];   // { dosya, at, ss, d, g, fo }
const ekle = (dosya, at, o = {}) => olay.push({ dosya, at, ss: o.ss ?? 0, d: o.d ?? 3, g: o.g ?? 1, fo: o.fo ?? 0.08, fi: o.fi ?? 0.005 });

// müzik: kodla bestelenmiş hareketli montaj parçası (tools/ges_muzik.mjs, 150 BPM, telifsiz)
ekle('music/ges_montaj.wav', 0, { d: DUR, g: 0.62, fi: 0.01, fo: 0.6 });
ekle('sfx/fieldamb.mp3', 0, { ss: 12, d: DUR, g: 0.22, fi: 0.8, fo: 1.0 });

// kazık darbeleri: çakma makinelerinin çekiç zamanları (müzik 16'lıklarına oturur)
// yakın plan makinesi (ön sıra, ön hat) yüksek; diğer makineler tek, kısık katman
const hatlar = kazikPlani(), kahraman = hatlar[0];
for (const p of kahraman.kaziklar) for (const d of CEKIC.DARBE) {
  const at = p.ts + d, yakin = at < 3.2 ? 1 : at < 4.8 ? 0.45 : 0.3;
  ekle('sfx/mechclamp.mp3', at, { d: 0.2, g: 0.55 * yakin, fo: 0.1 });
  ekle('sfx/bassimpact.mp3', at, { d: 0.3, g: 0.3 * yakin, fo: 0.15 });
}
const digerZaman = new Set();
for (const h of hatlar.slice(1)) for (const p of h.kaziklar) for (const d of CEKIC.DARBE) digerZaman.add(Math.round((p.ts + d) * 100) / 100);
for (const at of digerZaman) ekle('sfx/metaldoor1.mp3', at + 0.008, { d: 0.12, g: 0.12, fo: 0.06 });
// makine motor uğultusu (kazık süresince)
ekle('sfx/trunkmotor.mp3', Z.kazikBas, { d: Z.kazikSon - Z.kazikBas, g: 0.12, fi: 0.3, fo: 0.5 });
// konstrüksiyon: hidrolik / vinç
ekle('sfx/hoist.mp3', Z.konsBas, { ss: 3, d: 1.6, g: 0.3, fi: 0.2, fo: 0.4 });
ekle('sfx/hydraulics.mp3', Z.konsBas + 0.4, { d: 1.2, g: 0.25, fi: 0.2, fo: 0.4 });
// panel oturma tıkırtıları (dalga boyunca)
for (let i = 0; i < 16; i++) ekle('sfx/metaldoor3.mp3', Z.panelBas + 0.2 + i * 0.2, { d: 0.16, g: 0.2 - i * 0.008, fo: 0.08 });   // 8'liklerde
// gün doğumu: kuşlar
ekle('sfx/doveswings.mp3', Z.gunBas + 0.8, { ss: 1, d: 2.6, g: 0.3, fi: 0.3, fo: 0.8 });


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
