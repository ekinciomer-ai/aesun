// node render.mjs w h fps i0 i1 outdir   (kare indeksleri [i0,i1))
import { chromium } from 'playwright';import fs from 'fs';
const [w,h,fps,i0,i1]=process.argv.slice(2,7).map(Number);const out=process.argv[7];fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto(`http://127.0.0.1:8765/scene.html?w=${w}&h=${h}`);await p.waitForFunction('window.ready===true',null,{timeout:120000});await p.evaluate(()=>document.fonts.ready);
for(let i=i0;i<i1;i++){const f=`${out}/f${String(i).padStart(5,'0')}.jpg`;if(fs.existsSync(f))continue;await p.evaluate(t=>setT(t),i/fps);await p.screenshot({path:f,type:'jpeg',quality:88});if(i%100===0)console.log(out,i)}
await b.close();
