// Kare kare kayıt: node kayit.js <sahne.html> <kurgu.json> <cikti.mp4> [fps=30] [ilk kare] [son kare] [olcek=1]
// Tarayıcı: CHROME_YOL ortam değişkeni verilirse o kullanılır, yoksa Playwright'ın Chromium'u.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {spawn}=require('child_process');
(async()=>{const [sayfa,kf,out,fpsS,f0S,f1S,olS]=process.argv.slice(2);const fps=+fpsS||30;const K=JSON.parse(fs.readFileSync(kf,'utf8'));const OL=+olS||1;
const opt={args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files']};if(process.env.CHROME_YOL)opt.executablePath=process.env.CHROME_YOL;
const b=await chromium.launch(opt);const p=await b.newPage({viewport:{width:Math.round(1080*OL),height:Math.round(1920*OL)},deviceScaleFactor:1});
p.on('pageerror',e=>console.error('HATA',e.message));p.on('console',m=>{if(m.type()==='error')console.error('KONSOL',m.text())});
await p.goto('file://'+path.resolve(sayfa)+'?kayit=1');await p.waitForFunction(()=>window.HAZIR,{timeout:120000});await p.evaluate(()=>document.fonts.ready);
await p.evaluate(k=>kurgu(k),K);await p.evaluate(()=>new Promise(r=>setTimeout(r,1500)));// dokular yüklensin
const NT=Math.ceil(K.toplam*fps),F0=+f0S||0,N=Math.min(NT,f1S?+f1S:NT);
const tek=out.endsWith('.jpg');let ff=null;
if(!tek)ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-vf','scale=1080:1920:flags=lanczos','-c:v','libx264','-preset','veryfast','-crf','17','-pix_fmt','yuv420p','-r',String(fps),out],{stdio:['pipe','inherit','inherit']});
const LISTE=process.env.KARELER?process.env.KARELER.split(',').map(Number):null;const SIRA=LISTE||Array.from({length:N-F0},(_,j)=>F0+j);
const t0=Date.now();for(const i of SIRA){await p.evaluate(t=>kare(t),i/fps);const buf=await p.screenshot({type:'jpeg',quality:94,timeout:180000});
 if(tek){fs.writeFileSync(out.replace('.jpg',`_${String(i).padStart(5,'0')}.jpg`),buf);continue}
 if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
 if((i-F0)%150===0)console.log(`kare ${i-F0}/${N-F0} · ${((Date.now()-t0)/60000).toFixed(1)} dk`)}
if(ff){ff.stdin.end();await new Promise(r=>ff.on('close',r))}await b.close();console.log('bitti',out)})();
