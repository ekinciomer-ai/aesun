// Kare kare kayıt: her kare renderAt(t) ile çizilir, jpeg olarak ffmpeg'e akar (deterministik).
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import path from 'node:path';
const [,, html, cikti, fpsArg] = process.argv; const FPS = Number(fpsArg || 24);
const b = await chromium.launch({args: ['--no-sandbox']});
const p = await b.newPage({viewport: {width: 1080, height: 1920}});
const hatalar = []; p.on('pageerror', e => hatalar.push(String(e)));
await p.goto('file://' + path.resolve(html));
const toplam = await p.evaluate(() => window.TOPLAM);
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', cikti], {stdio: ['pipe', 'inherit', 'inherit']});
const el = await p.$('#c'); const n = Math.round(toplam * FPS);
for (let i = 0; i < n; i++) { await p.evaluate(t => window.renderAt(t), i / FPS); ff.stdin.write(await el.screenshot({type: 'jpeg', quality: 92})); }
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
console.log(`kayıt bitti: ${n} kare, konsol hatası ${hatalar.length}` + (hatalar.length ? ' · ' + hatalar[0] : ''));
