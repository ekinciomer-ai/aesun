// ---- SAB (ASM/ACIS binary) -> wireframe edges (3D polylines) ----
function sabEdges(u8){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  let p=0; while(p<u8.length && u8[p]!==0x07) p++;
  const recs=[]; let name='', tok=[]; const str=(n)=>{let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(u8[p+i]);p+=n;return s;};
  const V=()=>{const v=[dv.getFloat64(p,true),dv.getFloat64(p+8,true),dv.getFloat64(p+16,true)];p+=24;return v;};
  loop: while(p<u8.length){
    const t=u8[p++];
    switch(t){
      case 0x02: p+=1; break; case 0x03: p+=2; break;
      case 0x04: case 0x15: tok.push(dv.getInt32(p,true)); p+=4; break;
      case 0x0C: tok.push({r:dv.getInt32(p,true)}); p+=4; break;
      case 0x05: p+=4; break;
      case 0x06: tok.push(dv.getFloat64(p,true)); p+=8; break;
      case 0x07: { const n=u8[p++]; p+=n; tok.push('s'); break; }
      case 0x08: { const n=dv.getUint16(p,true); p+=2+n; tok.push('s'); break; }
      case 0x09: case 0x12: { const n=dv.getUint32(p,true); p+=4+n; tok.push('s'); break; }
      case 0x0A: tok.push(true); break; case 0x0B: tok.push(false); break;
      case 0x0D: { const n=u8[p++]; name+=(name?'-':'')+str(n); if(name==='End-of-ASM-data'||name==='End-of-ACIS-data') break loop; break; }
      case 0x0E: { const n=u8[p++]; name+=(name?'-':'')+str(n); break; }
      case 0x0F: case 0x10: break;
      case 0x11: recs.push({n:name,t:tok}); name=''; tok=[]; break;
      case 0x13: tok.push({p:V()}); break;
      case 0x14: case 0x16: tok.push({v:V()}); break;
      default: break loop;
    }
  }
  // recs[0] = asmheader; pointers index into recs directly
  const R=(x)=> (x&&typeof x==='object'&&'r' in x&&x.r>=0)? recs[x.r] : null;
  let xf=null;
  for(const r of recs){ if(r.n==='transform'){ const v=r.t.filter(x=>x&&typeof x==='object'&&(x.v||x.p)); const sc=r.t.find(x=>typeof x==='number');
      if(v.length>=4) xf={a:v[0].v||v[0].p,b:v[1].v||v[1].p,c:v[2].v||v[2].p,t:v[3].p||v[3].v,s:(typeof sc==='number'&&sc>0?sc:1)}; break; } }
  const T=xf? (q)=>[xf.s*(q[0]*xf.a[0]+q[1]*xf.b[0]+q[2]*xf.c[0])+xf.t[0], xf.s*(q[0]*xf.a[1]+q[1]*xf.b[1]+q[2]*xf.c[1])+xf.t[1], xf.s*(q[0]*xf.a[2]+q[1]*xf.b[2]+q[2]*xf.c[2])+xf.t[2]] : (q)=>q;
  const vpos=(vr)=>{ if(!vr||vr.n!=='vertex') return null; const pt=vr.t.filter(x=>x&&typeof x==='object'&&'r' in x).map(R).find(z=>z&&z.n==='point'); const q=pt&&pt.t.find(x=>x&&x.p); return q?q.p:null; };
  const out=[];
  for(const r of recs){
    if(r.n!=='edge') continue;
    const t=r.t; // [attr, hist, ?, v0, p0, v1, p1, coedge, curve, sense, conv]
    const ptrs=[]; const nums=[];
    for(const x of t){ if(x&&typeof x==='object'&&'r' in x) ptrs.push(x); else if(typeof x==='number') nums.push(x); }
    const v0=R(ptrs[2]), v1=R(ptrs[3]), cv=R(ptrs[5]);
    const a=vpos(v0), b=vpos(v1);
    const p0=nums[1], p1=nums[2]; // nums[0]=history
    if(cv && /ellipse-curve/.test(cv.n)){
      const g=cv.t.filter(x=>x&&typeof x==='object'&&(x.p||x.v)); const ratio=cv.t.find(x=>typeof x==='number'&&!Number.isInteger(x))||1;
      if(g.length>=3){ const c=g[0].p||g[0].v, n=g[1].v||g[1].p, m=g[2].v||g[2].p;
        const w=[n[1]*m[2]-n[2]*m[1], n[2]*m[0]-n[0]*m[2], n[0]*m[1]-n[1]*m[0]];
        let s0=p0, s1=p1; if(!(isFinite(s0)&&isFinite(s1))||Math.abs(s1-s0)<1e-9){ s0=0; s1=Math.PI*2; }
        const N=Math.max(4,Math.ceil(Math.abs(s1-s0)/(Math.PI/12))); const pts=[];
        for(let i=0;i<=N;i++){ const u=s0+(s1-s0)*i/N; const cs=Math.cos(u), sn=Math.sin(u)*ratio; pts.push(T([c[0]+cs*m[0]+sn*w[0], c[1]+cs*m[1]+sn*w[1], c[2]+cs*m[2]+sn*w[2]])); }
        out.push(pts); continue; }
    }
    if(a&&b) out.push([T(a),T(b)]);
  }
  return out;
}
