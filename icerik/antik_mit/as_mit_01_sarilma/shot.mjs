// usage: node shot.mjs w h t1,t2,... outprefix
import { chromium } from 'playwright';
const [w,h,ts,out]=[+process.argv[2],+process.argv[3],process.argv[4].split(',').map(Number),process.argv[5]];
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:w,height:h}});
p.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text())});p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto(`http://127.0.0.1:8765/scene.html?w=${w}&h=${h}`);await p.waitForFunction('window.ready===true',null,{timeout:120000});
await p.evaluate(()=>document.fonts.ready);
for(const t of ts){const t0=Date.now();await p.evaluate(t=>setT(t),t);await p.screenshot({path:`${out}_${t}.jpg`,type:'jpeg',quality:85});console.log(t,Date.now()-t0,'ms')}
await b.close();
