// usage: node render.mjs <w> <h> <fps> <t0> <t1> <outdir> [step]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs'; // ortamda hazır
import fs from 'fs';
const [w, h, fps, t0, t1, out, only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()) });
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto(`http://127.0.0.1:8765/scene.html?w=${w}&h=${h}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
const el = await page.$('#wrap');
const times = [];
if (only) { for (const s of only.split(',')) times.push(+s) }
else { const n = Math.round((+t1 - +t0) * +fps); for (let i = 0; i < n; i++) times.push(+t0 + i / +fps) }
let i0 = 0; const st = Date.now();
for (const t of times) {
  const name = only ? `t_${t.toFixed(2)}.jpg` : `f_${String(Math.round(t * +fps)).padStart(5, '0')}.jpg`;
  if (!only && fs.existsSync(`${out}/${name}`)) { i0++; continue }
  await page.evaluate(([t,f]) => window[f](t), [t, process.env.RF||'renderAt']);
  await el.screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 92 });
  i0++;
  if (i0 % 60 === 0) console.log(`${i0}/${times.length} ${((Date.now() - st) / i0 / 1000).toFixed(2)}s/f`);
}
console.log('done', ((Date.now() - st) / 1000).toFixed(1), 's');
await browser.close();
