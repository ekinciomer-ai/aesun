import { chromium } from 'playwright';import fs from 'fs';
let [mode,a,b,out]=process.argv.slice(2);if(mode==='list')out=b;fs.mkdirSync(out,{recursive:true});
const br=await chromium.launch();const p=await br.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CERR',m.text())});
await p.goto('http://127.0.0.1:8767/index.html');await p.waitForFunction('window.ready===true',null,{timeout:60000});
const ts=mode==='list'?a.split(',').map(Number):null;const fps=30;
const list=ts||Array.from({length:+b-+a},(_,i)=>(+a+i)/fps);
for(const [j,t] of list.entries()){const f=mode==='list'?`${out}/s_${t}.jpg`:`${out}/f${String(+a+j).padStart(5,'0')}.jpg`;if(mode!=='list'&&fs.existsSync(f))continue;
 await p.evaluate(t=>{seekFrame(t);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))},t);await p.screenshot({path:f,type:'jpeg',quality:90})}
await br.close();
