// Nasıl Yapıldı kare kare kayıt: node kayit.js <motor klasörü> <kurgu.json> <çıktı.mp4> <genişlik> [fps] [ilk kare] [son kare] [arazi]
// Motor sayfası yerel http sunucusundan açılır (ES modülü + veri dosyaları için). Çıktı sessiz H.264.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const http=require('http');const {spawn}=require('child_process');
const TUR={'.html':'text/html','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.bin':'application/octet-stream','.png':'image/png'};
(async()=>{
 const [kok,kf,out,wS,fpsS,f0S,f1S,arS]=process.argv.slice(2);const w=+wS||540,hh=Math.round(w*16/9),fps=+fpsS||30;
 const K=JSON.parse(fs.readFileSync(kf,'utf8'));
 const srv=http.createServer((q,r)=>{const f=path.join(path.resolve(kok),decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':TUR[path.extname(f)]||'application/octet-stream'});r.end(d)})}).listen(0);
 const port=srv.address().port;
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:1});
 p.on('pageerror',e=>console.error('HATA',e.message));p.on('console',m=>{if(m.type()==='error')console.error('KONSOL',m.text())});
 await p.goto(`http://127.0.0.1:${port}/sahne.html?arazi=${arS||'900'}`);await p.waitForFunction(()=>window.HAZIR,{timeout:180000});
 await p.evaluate(k=>kurgu(k),K);
 await p.waitForFunction(()=>window.GORSEL_HAZIR!==false,{timeout:60000}).catch(()=>{});
 if(process.env.NY_ANLAR){for(const a of process.env.NY_ANLAR.split(',')){await p.evaluate(t=>kare(t),+a);await p.screenshot({path:`${out}_${a}.png`})}await b.close();srv.close();return}
 const NT=Math.ceil(K.toplam*fps),F0=+f0S||0,N=Math.min(NT,f1S?+f1S:NT);
 const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p','-r',String(fps),out],{stdio:['pipe','inherit','inherit']});
 const t0=Date.now();
 for(let i=F0;i<N;i++){await p.evaluate(t=>kare(t),i/fps);const buf=await p.screenshot({type:'jpeg',quality:94,timeout:180000});
  if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
  if((i-F0)%150===0)console.log(`${i-F0}/${N-F0} kare · ${((Date.now()-t0)/60000).toFixed(1)} dk`)}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();srv.close();console.log('bitti',out);
})();
