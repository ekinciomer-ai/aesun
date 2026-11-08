// ---- DWG R2004+ section reader + AcDs (3D solid) extractor ----
// R2004+ (AC1018..AC1032) section reader -> extracts AcDs (3DSOLID SAB data)
function lz77(src, outSize){
  const dst=new Uint8Array(outSize); let d=0, p=0;
  const rb=()=>src[p++];
  function litLen(){ const b=rb(); if(b>=1&&b<=0x0F) return [b+3,0]; if(b===0){let l=0x0F,x=rb(); while(x===0){l+=0xFF;x=rb();} return [l+x+3,0];} return [0,b]; }
  function longOff(){ let c=0,b=rb(); while(b===0){c+=0xFF;b=rb();} return c+b; }
  function two(){ const a=rb(), b=rb(); return [(a>>2)|(b<<6), a&3]; }
  let [lit,op]=litLen(); dst.set(src.subarray(p,p+lit),d); p+=lit; d+=lit;
  while(p<src.length){
    if(op===0) op=rb();
    let cb,co,ll;
    if(op>=0x40){ cb=((op&0xF0)>>4)-1; const o2=rb(); co=(o2<<2)|((op&0x0C)>>2); if(op&3){ll=op&3;op=0;} else [ll,op]=litLen(); }
    else if(op>=0x21&&op<=0x3F){ cb=op-0x1E; [co,ll]=two(); if(ll) op=0; else [ll,op]=litLen(); }
    else if(op===0x20){ cb=longOff()+0x21; [co,ll]=two(); if(ll) op=0; else [ll,op]=litLen(); }
    else if(op>=0x12&&op<=0x1F){ cb=(op&0x0F)+2; [co,ll]=two(); co+=0x3FFF; if(ll) op=0; else [ll,op]=litLen(); }
    else if(op===0x10){ cb=longOff()+9; [co,ll]=two(); co+=0x3FFF; if(ll) op=0; else [ll,op]=litLen(); }
    else if(op===0x11) break;
    else throw new Error('lz77 bad opcode '+op+' at '+p);
    let s=d-co-1; for(let i=0;i<cb;i++) dst[d++]=dst[s++];
    for(let i=0;i<ll;i++) dst[d++]=src[p++];
  }
  return dst;
}
function readSections(buf){
  const u8=buf instanceof Uint8Array?buf:new Uint8Array(buf);
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  const ver=String.fromCharCode(...u8.subarray(0,6));
  // decrypt header at 0x80
  const h=new Uint8Array(0x6c); let seed=1;
  for(let i=0;i<0x6c;i++){ seed=(Math.imul(seed,0x343fd)+0x269ec3)>>>0; h[i]=u8[0x80+i]^((seed>>>16)&0xff); }
  const hv=new DataView(h.buffer);
  const sig=String.fromCharCode(...h.subarray(0,11));
  if(sig!=='AcFssFcAJMB') throw new Error('Not R2004+ header: '+sig);
  const pageMapAddr=Number(hv.getBigUint64(0x54,true))+0x100;
  const sectionMapId=hv.getUint32(0x5C,true);
  function sysPage(addr){
    const type=dv.getUint32(addr,true), dsize=dv.getUint32(addr+4,true), csize=dv.getUint32(addr+8,true);
    return lz77(u8.subarray(addr+20,addr+20+csize), dsize);
  }
  // page map
  const pm=sysPage(pageMapAddr), pmv=new DataView(pm.buffer);
  const pages={}; let addr=0x100;
  for(let o=0;o+8<=pm.length;){ const num=pmv.getInt32(o,true), size=pmv.getUint32(o+4,true); o+=8;
    if(num>=0) pages[num]={addr,size}; else o+=16; addr+=size; }
  const sm=sysPage(pages[sectionMapId].addr), smv=new DataView(sm.buffer);
  const nDesc=smv.getUint32(0,true); let o=20; const sections={};
  for(let i=0;i<nDesc;i++){
    const size=Number(smv.getBigUint64(o,true)), pcount=smv.getUint32(o+8,true), maxd=smv.getUint32(o+12,true), comp=smv.getUint32(o+20,true), sid=smv.getUint32(o+24,true), enc=smv.getUint32(o+28,true);
    let name=''; for(let k=0;k<64&&sm[o+32+k];k++) name+=String.fromCharCode(sm[o+32+k]);
    o+=96; const plist=[];
    for(let j=0;j<pcount;j++){ plist.push({page:smv.getUint32(o,true),dsize:smv.getUint32(o+4,true),start:Number(smv.getBigUint64(o+8,true))}); o+=16; }
    sections[name]={size,maxd,comp,enc,sid,pages:plist};
  }
  function getSection(name){
    const s=sections[name]; if(!s) return null;
    const out=new Uint8Array(s.size);
    for(const pg of s.pages){
      const a=pages[pg.page].addr; const hd=new Uint32Array(8);
      for(let k=0;k<8;k++) hd[k]=(dv.getUint32(a+k*4,true)^(0x4164536b^a))>>>0;
      const csize=hd[2];
      let data;
      if(s.comp===2) data=lz77(u8.subarray(a+32,a+32+csize), s.maxd);
      else data=u8.subarray(a+32,a+32+csize);
      const n=Math.min(data.length, s.size-pg.start); if(n>0) out.set(data.subarray(0,n), pg.start);
    }
    return out;
  }
  return {ver,sections,getSection};
}
// Extract handle -> SAB bytes from AcDs section
function extractSolids(ds){
  const dv=new DataView(ds.buffer,ds.byteOffset,ds.byteLength);
  const segs={}; // idx -> {off,name}
  for(let o=0;o+48<=ds.length;o+=16){ // segments are 16-aligned? scan
    if(ds[o]===0xac&&ds[o+1]===0xd5){ let name=''; for(let k=2;k<8;k++) name+=String.fromCharCode(ds[o+k]);
      if(/^(_data_|segidx|datidx|schidx|schdat|search|blob01|prvsav)$/.test(name)){ segs[dv.getUint32(o+8,true)]={off:o,name,size:dv.getUint32(o+16,true)}; } }
  }
  const MAGIC=[0x41,0x53,0x4d,0x20,0x42,0x69,0x6e,0x61,0x72,0x79]; // "ASM Binary"
  const isSab=(q)=>{ for(let k=0;k<MAGIC.length;k++) if(ds[q+k]!==MAGIC[k]) { // also ACIS BinaryFile
      return ds[q]===0x41&&ds[q+1]===0x43&&ds[q+2]===0x49&&ds[q+3]===0x53; } return true; };
  const out=new Map();
  for(const [idx,s] of Object.entries(segs)){
    if(s.name!=='_data_') continue;
    let p=s.off+48; const ids=[];
    while(p+20<=ds.length && dv.getUint32(p,true)===20 && dv.getUint32(p+4,true)===1){ ids.push([Number(dv.getBigUint64(p+8,true)), dv.getUint32(p+16,true)]); p+=20; }
    // locate data-area base: pick shift with most recognisable records
    const ok=(q)=>{ if(q+14>ds.length) return 0; const w=dv.getUint32(q,true); if(w===0xbb106bb1) return 1; if(isSab(q+4)) return 2;
      return (ds[q+4]===0x89&&ds[q+5]===0x50&&ds[q+6]===0x4e)?1:0; };
    let best=0,bestScore=-1; const sample=ids.slice(0,40);
    for(let k=0;k<96;k++){ let sc=0; for(const [,x] of sample) sc+=ok(p+x+k); if(sc>bestScore){bestScore=sc;best=k;} }
    const A=p+best-4;
    for(const [h,x] of ids){
      const q=A+x+4; if(q+8>ds.length) continue;
      const w=dv.getUint32(q,true);
      if(w===0xbb106bb1){ // blob reference -> concatenate blob01 pages
        const total=Number(dv.getBigUint64(q+4,true)); const np=dv.getUint32(q+12,true);
        const buf=new Uint8Array(total); let filled=0;
        for(let k=0;k<np && filled<total;k++){ const si=dv.getUint32(q+36+k*8,true); const bs=segs[si];
          if(bs&&bs.name==='blob01'){ const b0=bs.off+48; const psz=dv.getUint32(b0+24,true); const off=Number(dv.getBigUint64(b0+8,true)); const n=Math.min(psz,total-off); if(n>0){ buf.set(ds.subarray(b0+32,b0+32+n),off); filled+=n; } } }
        if(filled) out.set(h,buf);
      } else {
        const sz=w; const st=q+4; if(isSab(st)) out.set(h, ds.subarray(st, st+sz));
      }
    }
  }
  return out;
}
