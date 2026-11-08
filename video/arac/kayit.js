// Kare kare kayıt: node kayit.js <sayfa.html yolu> <ar 916|169> <kurgu.json> <cikti.mp4> <fps> [ilk kare] [son kare]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {spawn}=require('child_process');
(async()=>{const [sayfa,ar,kf,out,fpsS,f0S,f1S]=process.argv.slice(2);const fps=+fpsS||30;const K=JSON.parse(fs.readFileSync(kf,'utf8'));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files']});
const vp=ar==='169'?{width:1920,height:1080}:{width:1080,height:1920};const OL=+K.olcek||1;const p=await b.newPage({viewport:vp,deviceScaleFactor:OL});
p.on('pageerror',e=>console.error('HATA',e.message));
await p.goto('file://'+path.resolve(sayfa)+'?kayit=1&ar='+ar+(K.dil?'&dil='+K.dil:''));await p.waitForFunction(()=>window.HAZIR,{timeout:120000});await p.evaluate(k=>kurgu(k),K);
const NT=Math.ceil(K.toplam*fps),F0=+f0S||0,N=Math.min(NT,f1S?+f1S:NT);
const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf',OL>1?'14':'17','-pix_fmt','yuv420p','-r',String(fps),out],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();for(let i=F0;i<N;i++){await p.evaluate(t=>kare(t),i/fps);const buf=await p.screenshot({type:'jpeg',quality:OL>1?97:93,timeout:180000});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
 if((i-F0)%300===0)console.log(`${i-F0}/${N-F0} ${((Date.now()-t0)/60000).toFixed(1)} dk`)}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('bitti',out)})();
