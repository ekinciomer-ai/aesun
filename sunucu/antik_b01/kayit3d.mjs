// 3D kare kare kayıt: http üzerinden açılır (modül için), WebGL yazılımla (swiftshader), ZAMAN enjekte edilir.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const [,, url, zamanJson, cikti, fpsArg, ornekArg] = process.argv; const FPS = Number(fpsArg || 30);
const b = await chromium.launch({args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage({viewport: {width: 1080, height: 1920}});
const hatalar = []; p.on('pageerror', e => hatalar.push(String(e))); p.on('console', m => { if (m.type() === 'error') hatalar.push(m.text()); });
await p.addInitScript(`window.ZAMAN=${fs.readFileSync(zamanJson, 'utf8')};`);
await p.goto(url); await p.waitForFunction(() => window.HAZIR === true, null, {timeout: 120000});
const toplam = await p.evaluate(() => window.TOPLAM);
const el = await p.$('#c');
if (ornekArg) { // yalnız örnek kareler (kontrol): "t1,t2,..." → cikti_<i>.jpg
  let i = 0; for (const t of ornekArg.split(',').map(Number)) { await p.evaluate(t => window.renderAt(t), t); fs.writeFileSync(cikti.replace('.jpg', `_${i++}.jpg`), await el.screenshot({type: 'jpeg', quality: 85})); }
  await b.close(); console.log(`örnek kareler tamam, hata ${hatalar.length}` + (hatalar.length ? ' · ' + hatalar.slice(0,3).join(' | ') : '')); process.exit(0);
}
const ff = spawn('ffmpeg', ['-v','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',cikti], {stdio:['pipe','inherit','inherit']});
const n = Math.round(toplam * FPS); const t0 = Date.now();
for (let i = 0; i < n; i++) { await p.evaluate(t => window.renderAt(t), i / FPS); ff.stdin.write(await el.screenshot({type:'jpeg', quality:92}));
  if (i % 150 === 0) console.log(`kare ${i}/${n} · ${((Date.now()-t0)/1000).toFixed(0)} sn`); }
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
console.log(`kayıt bitti: ${n} kare, ${toplam.toFixed(1)} sn, hata ${hatalar.length}` + (hatalar.length ? ' · ' + hatalar.slice(0,3).join(' | ') : ''));
