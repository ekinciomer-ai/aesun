// Kare kare kayıt: ZAMAN enjekte edilir, her kare renderAt(t) ile çizilir, jpeg → ffmpeg (deterministik)
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const [,, html, zamanJson, cikti, fpsArg] = process.argv; const FPS = Number(fpsArg || 30);
const b = await chromium.launch({args: ['--no-sandbox']});
const p = await b.newPage({viewport: {width: 1080, height: 1920}});
const hatalar = []; p.on('pageerror', e => hatalar.push(String(e)));
await p.addInitScript(`window.ZAMAN=${fs.readFileSync(zamanJson, 'utf8')};`);
await p.goto('file://' + path.resolve(html));
const toplam = await p.evaluate(() => window.TOPLAM);
const ff = spawn('ffmpeg', ['-v','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',cikti], {stdio:['pipe','inherit','inherit']});
const el = await p.$('#c'); const n = Math.round(toplam * FPS);
for (let i = 0; i < n; i++) { await p.evaluate(t => window.renderAt(t), i / FPS); ff.stdin.write(await el.screenshot({type:'jpeg', quality:92})); }
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
console.log(`kayıt bitti: ${n} kare, ${toplam.toFixed(1)} sn, konsol hatası ${hatalar.length}` + (hatalar.length ? ' · ' + hatalar[0] : ''));
