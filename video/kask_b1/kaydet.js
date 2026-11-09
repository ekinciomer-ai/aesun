// node kaydet.js <sahne> <sure_sn> <cikti.mp4|kare.png> [img] [tek_kare_t]
const {chromium}=require('playwright');const path=require('path');const {spawn}=require('child_process');
(async()=>{const [sahne,sureS,out,img,tek]=process.argv.slice(2);const fps=30;
const b=await chromium.launch({args:['--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.error('HATA',e.message));
await p.goto('file://'+path.resolve(__dirname,'canlandirma.html')+'?sahne='+sahne+(img?'&img='+encodeURIComponent('file://'+path.resolve(img)):''));
await p.waitForFunction(()=>window.HAZIR,{timeout:60000});
if(tek!==undefined){await p.evaluate(t=>kare(t),+tek);await p.screenshot({path:out});await b.close();return}
const N=Math.round(+sureS*fps);
const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<N;i++){await p.evaluate(t=>kare(t),i/fps);const buf=await p.screenshot({type:'jpeg',quality:94});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('bitti',out)})();
