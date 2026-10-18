// ---- document model, entity compilation ----
let _nextId = 1;
const newId = () => _nextId++;

function rawColor(e) {
  let c = e.colorIndex;
  if (typeof c !== 'number') c = parseInt(c);
  if (!(c >= 0 && c <= 256)) c = 256;
  if (typeof e.color === 'number' && e.color >= 0 && e.color <= 0xffffff && e.colorName === undefined && c === 257) c = -(e.color + 1);
  return c;
}
function colorCss(c, dark) {
  if (c < 0) return '#' + (-c - 1).toString(16).padStart(6, '0');
  return aciCss(c, dark);
}

class Doc {
  constructor() {
    this.layers = new Map();
    this.blocks = new Map();
    this.items = new Map();
    this.solids = new Map();
    this.undo = []; this.redo = [];
    this.addLayer('0', 7);
    this.name = 'Yeni çizim';
    this.dirty = false;
  }
  addLayer(name, c = 7, lt = 'Continuous') {
    if (!this.layers.has(name)) this.layers.set(name, { name, c, lt, on: true, fz: false, lk: false });
    return this.layers.get(name);
  }
  commit(changes, label) {
    if (!changes.length) return;
    for (const ch of changes) { if (ch.o) this.items.delete(ch.o.id); }
    for (const ch of changes) { if (ch.n) this.items.set(ch.n.id, ch.n); }
    this.undo.push({ changes, label }); this.redo.length = 0; this.dirty = true;
    if (this.undo.length > 200) this.undo.shift();
  }
  doUndo() {
    const tr = this.undo.pop(); if (!tr) return null;
    for (const ch of tr.changes) if (ch.n) this.items.delete(ch.n.id);
    for (const ch of tr.changes) if (ch.o) this.items.set(ch.o.id, ch.o);
    this.redo.push(tr); return tr.label;
  }
  doRedo() {
    const tr = this.redo.pop(); if (!tr) return null;
    for (const ch of tr.changes) if (ch.o) this.items.delete(ch.o.id);
    for (const ch of tr.changes) if (ch.n) this.items.set(ch.n.id, ch.n);
    this.undo.push(tr); return tr.label;
  }
}

// ---------- raw entity -> prims (local coordinates of its owner) ----------
// prim kinds: 0 polyline {p:Float64Array xyz, cl}, 1 text {p,u,v,h,lines,ha,va}, 2 fill {rings:[Float64Array xyz], pat}, 3 point {p}
function pushPoly(out, st, arr, cl, M) {
  if (arr.length < 6) return;
  const f = new Float64Array(arr.length);
  if (M) { for (let i = 0; i < arr.length; i += 3) { const q = mApply(M, arr[i], arr[i + 1], arr[i + 2]); f[i] = q[0]; f[i + 1] = q[1]; f[i + 2] = q[2]; } }
  else f.set(arr);
  out.push({ k: 0, p: f, cl: !!cl, c: st.c, l: st.l, lt: st.lt });
}
function to3(arr2, z) { const o = []; for (let i = 0; i < arr2.length; i += 2) o.push(arr2[i], arr2[i + 1], z); return o; }
function textPrim(st, p, ang, h, lines, ha, va, M, xs = 1, nrm) {
  let u = [Math.cos(ang) * xs, Math.sin(ang) * xs, 0], v = [-Math.sin(ang), Math.cos(ang), 0];
  if (M) {
    const q = mApply(M, p[0], p[1], p[2] || 0);
    const lin = (w) => [M[0] * w[0] + M[1] * w[1] + M[2] * w[2], M[4] * w[0] + M[5] * w[1] + M[6] * w[2], M[8] * w[0] + M[9] * w[1] + M[10] * w[2]];
    u = lin(u); v = lin(v); p = q;
  }
  return { k: 1, p: [p[0], p[1], p[2] || 0], u, v, h, lines, ha, va, c: st.c, l: st.l };
}
const P3 = (o) => o ? [o.x || 0, o.y || 0, o.z || 0] : [0, 0, 0];

function compileRaw(e, out, ctx, depth = 0) {
  const st = { c: rawColor(e), l: e.layer || '0', lt: e.lineType || '' };
  if (e.isVisible === false) return;
  const ocs = ocsMatrix(e.extrusionDirection);
  switch (e.type) {
    case 'LINE': pushPoly(out, st, [...P3(e.startPoint), ...P3(e.endPoint)], false); break;
    case 'LWPOLYLINE': case 'POLYLINE2D': {
      const vs = e.vertices || []; if (!vs.length) break;
      const cl = (e.flag & 1) === 1; const a = [vs[0].x, vs[0].y];
      for (let i = 1; i < vs.length; i++) bulgeArcPts(vs[i - 1].x, vs[i - 1].y, vs[i].x, vs[i].y, vs[i - 1].bulge || 0, a);
      if (cl && vs.length > 1) bulgeArcPts(vs[vs.length - 1].x, vs[vs.length - 1].y, vs[0].x, vs[0].y, vs[vs.length - 1].bulge || 0, a);
      const z = e.elevation || 0;
      if (a.length === 2) { out.push({ k: 3, p: ocs ? mApply(ocs, a[0], a[1], z) : [a[0], a[1], z], c: st.c, l: st.l }); break; }
      pushPoly(out, st, to3(a, z), false, ocs); break;
    }
    case 'POLYLINE3D': {
      const vs = (e.vertices || []).filter((v) => !(v.flag & 16)); const a = [];
      for (const v of vs) a.push(v.x, v.y, v.z || 0);
      if ((e.flag & 1) && vs.length > 2) a.push(vs[0].x, vs[0].y, vs[0].z || 0);
      pushPoly(out, st, a, false); break;
    }
    case 'CIRCLE': case 'ARC': {
      const c = P3(e.center);
      const pts = e.type === 'CIRCLE' ? arcPts(c[0], c[1], e.radius, 0, TAU, true) : arcPts(c[0], c[1], e.radius, e.startAngle, e.endAngle, false);
      pushPoly(out, st, to3(pts, c[2]), e.type === 'CIRCLE', ocs); break;
    }
    case 'ELLIPSE': {
      const c = P3(e.center), m = P3(e.majorAxisEndPoint), n = P3(e.extrusionDirection && Math.hypot(e.extrusionDirection.x, e.extrusionDirection.y, e.extrusionDirection.z) > 0 ? e.extrusionDirection : { x: 0, y: 0, z: 1 });
      const r = e.axisRatio || 1; const w = [(n[1] * m[2] - n[2] * m[1]) * r, (n[2] * m[0] - n[0] * m[2]) * r, (n[0] * m[1] - n[1] * m[0]) * r];
      let s0 = e.startAngle || 0, s1 = e.endAngle || TAU; if (s1 <= s0) s1 += TAU;
      const N = Math.max(16, Math.ceil((s1 - s0) / (TAU / 96))); const a = [];
      for (let i = 0; i <= N; i++) { const t = s0 + (s1 - s0) * i / N, cs = Math.cos(t), sn = Math.sin(t); a.push(c[0] + cs * m[0] + sn * w[0], c[1] + cs * m[1] + sn * w[1], c[2] + cs * m[2] + sn * w[2]); }
      pushPoly(out, st, a, false); break;
    }
    case 'SPLINE': {
      let a;
      if (e.controlPoints && e.controlPoints.length >= 2) a = deBoor(e.degree || 3, e.knots, e.controlPoints, e.weights, Math.min(600, Math.max(24, e.controlPoints.length * 10)));
      else if (e.fitPoints && e.fitPoints.length) { a = []; for (const p of e.fitPoints) a.push(p.x, p.y, p.z || 0); }
      if (a) pushPoly(out, st, a, false); break;
    }
    case 'TEXT': case 'ATTRIB': case 'ATTDEF': {
      if (e.type === 'ATTDEF') break;
      const t = e.type === 'ATTRIB' ? (e.text || {}) : e;
      if (e.type === 'ATTRIB' && (e.flags & 1)) break;
      let str = e.type === 'ATTRIB' ? (typeof t === 'string' ? t : t.text) : e.text;
      if (e.type === 'ATTRIB' && e.mtext && e.mtext.text) str = e.mtext.text;
      if (!str) break;
      const tb = typeof t === 'object' ? t : e;
      let ha = tb.halign || 0, va = tb.valign || 0;
      let p = P3(tb.startPoint);
      if ((ha || va) && ha !== 3 && ha !== 5 && tb.endPoint && (tb.endPoint.x || tb.endPoint.y)) p = P3(tb.endPoint);
      if (e.type === 'ATTRIB' && (ha || va) && e.alignmentPoint && (e.alignmentPoint.x || e.alignmentPoint.y)) p = P3(e.alignmentPoint);
      if (ha === 4) { ha = 1; va = 2; } if (ha === 3 || ha === 5) { ha = 0; va = 0; }
      const tp = textPrim(st, p, tb.rotation || 0, tb.textHeight || 1, [decodeText(str)], ha, va, ocs || ocsMatrix(tb.extrusionDirection), tb.xScale || 1);
      out.push(tp); break;
    }
    case 'MTEXT': {
      const h = e.textHeight || 1; let lines = mtextPlain(e.text);
      if (e.rectWidth > 0) lines = wrapLines(lines, e.rectWidth, h);
      const ap = e.attachmentPoint || 1; const col = (ap - 1) % 3, row = Math.floor((ap - 1) / 3);
      let ang = e.rotation || 0;
      const d = e.direction; if (d && (Math.abs(d.x) + Math.abs(d.y)) > 1e-9) ang = Math.atan2(d.y, d.x);
      const tp = textPrim(st, P3(e.insertionPoint), ang, h, lines, col, row === 0 ? 3 : row === 1 ? 2 : 1, null, 1);
      tp.mt = true; tp.ls = (e.lineSpacing || 1) * 1.667;
      const nm = ocsMatrix(e.extrusionDirection); if (nm && nm[10] < 0) { tp.u = [-tp.u[0], -tp.u[1], tp.u[2]]; }
      out.push(tp); break;
    }
    case 'SOLID': case 'TRACE': {
      const q = [e.corner1, e.corner2, e.corner4 || e.corner3, e.corner3].map(P3);
      const a = []; for (const v of q) { const w = ocs ? mApply(ocs, v[0], v[1], v[2]) : v; a.push(w[0], w[1], w[2]); }
      out.push({ k: 2, rings: [new Float64Array(a)], c: st.c, l: st.l }); break;
    }
    case '3DFACE': {
      const q = [e.corner1, e.corner2, e.corner3, e.corner4 || e.corner3].map(P3); const a = [];
      for (const v of q) a.push(...v); a.push(...q[0]); pushPoly(out, st, a, false); break;
    }
    case 'POINT': out.push({ k: 3, p: P3(e.position), c: st.c, l: st.l }); break;
    case 'LEADER': {
      const a = []; for (const v of (e.vertices || [])) a.push(v.x, v.y, v.z || 0);
      pushPoly(out, st, a, false); break;
    }
    case 'HATCH': {
      const rings = [];
      for (const bp of (e.boundaryPaths || [])) {
        const a = [];
        if (bp.vertices) {
          const vs = bp.vertices; if (!vs.length) continue; a.push(vs[0].x, vs[0].y);
          for (let i = 1; i < vs.length; i++) bulgeArcPts(vs[i - 1].x, vs[i - 1].y, vs[i].x, vs[i].y, vs[i - 1].bulge || 0, a);
          if (vs.length > 2) bulgeArcPts(vs[vs.length - 1].x, vs[vs.length - 1].y, vs[0].x, vs[0].y, vs[vs.length - 1].bulge || 0, a);
        } else if (bp.edges) {
          for (const ed of bp.edges) {
            if (ed.type === 1 || (ed.start && ed.end)) { if (!a.length) a.push(ed.start.x, ed.start.y); a.push(ed.end.x, ed.end.y); }
            else if (ed.type === 2 || ed.radius !== undefined) {
              let s = ed.startAngle, en = ed.endAngle; if (s > TAU + 0.01 || en > TAU + 0.01) { s *= Math.PI / 180; en *= Math.PI / 180; }
              let p = ed.isCCW === false ? arcPts(ed.center.x, ed.center.y, ed.radius, -s, -en, false) : arcPts(ed.center.x, ed.center.y, ed.radius, s, en, false);
              if (ed.isCCW === false) { const q = []; for (let i = 0; i < p.length; i += 2) { const ang = Math.atan2(p[i + 1] - ed.center.y, p[i] - ed.center.x); q.push(ed.center.x + ed.radius * Math.cos(-ang), ed.center.y + ed.radius * Math.sin(-ang)); } p = q; }
              for (let i = 0; i < p.length; i++) a.push(p[i]);
            } else if (ed.controlPoints) { const sp = deBoor(ed.degree || 3, ed.knots, ed.controlPoints, ed.weights, 48); for (let i = 0; i < sp.length; i += 3) a.push(sp[i], sp[i + 1]); }
            else if (ed.center && ed.end) { // ellipse edge
              const mx = ed.end.x, my = ed.end.y, r = ed.lengthOfMinorAxis || 1; let s = ed.startAngle, en = ed.endAngle; if (s > TAU + 0.01 || en > TAU + 0.01) { s *= Math.PI / 180; en *= Math.PI / 180; } if (en <= s) en += TAU;
              for (let i = 0; i <= 32; i++) { const t = s + (en - s) * i / 32; a.push(ed.center.x + Math.cos(t) * mx - Math.sin(t) * my * r, ed.center.y + Math.cos(t) * my + Math.sin(t) * mx * r); }
            }
          }
        }
        if (a.length >= 6) { const r3 = to3(a, e.elevation || 0); rings.push(new Float64Array(ocs ? (() => { const o = []; for (let i = 0; i < r3.length; i += 3) o.push(...mApply(ocs, r3[i], r3[i + 1], r3[i + 2])); return o; })() : r3)); }
      }
      if (rings.length) {
        const solid = e.solidFill === 1 || e.patternName === 'SOLID';
        out.push({ k: 2, rings, pat: !solid, c: st.c, l: st.l });
        if (!solid) for (const r of rings) out.push({ k: 0, p: r, cl: true, c: st.c, l: st.l, lt: '' });
      }
      break;
    }
    case 'IMAGE': {
      const p = P3(e.position), u = P3(e.uPixel), v = P3(e.vPixel), sx = e.imageSize ? e.imageSize.x : 1, sy = e.imageSize ? e.imageSize.y : 1;
      const q = [p, [p[0] + u[0] * sx, p[1] + u[1] * sx, p[2]], [p[0] + u[0] * sx + v[0] * sy, p[1] + u[1] * sx + v[1] * sy, p[2]], [p[0] + v[0] * sy, p[1] + v[1] * sy, p[2]], p];
      pushPoly(out, { ...st, lt: 'DASHED' }, q.flat(), false); break;
    }
    case '3DSOLID': case 'REGION': case 'BODY': case 'SURFACE': {
      const h = parseInt(e.handle, 16); const edges = ctx && ctx.solids && ctx.solids.get(h);
      if (edges) for (const ed of edges) pushPoly(out, st, ed.flat(), false);
      break;
    }
    case 'INSERT': case 'DIMENSION': {
      if (!ctx || depth > 12) break;
      const b = ctx.blocks.get(e.name); if (!b) break;
      const Ms = insertMatrices(e, b);
      const sub = blockPrims(ctx, b, depth + 1);
      const ic = st.c, il = st.l;
      for (const M of Ms) {
        for (const p of sub) {
          const c = p.c === 0 ? ic : p.c; const l = p.l === '0' ? il : p.l;
          if (p.k === 0) out.push({ k: 0, p: xfArr(p.p, M), cl: p.cl, c, l, lt: p.lt });
          else if (p.k === 2) out.push({ k: 2, rings: p.rings.map((r) => xfArr(r, M)), pat: p.pat, c, l });
          else if (p.k === 3) out.push({ k: 3, p: mApply(M, p.p[0], p.p[1], p.p[2]), c, l });
          else if (p.k === 1) { const lin = (w) => [M[0] * w[0] + M[1] * w[1] + M[2] * w[2], M[4] * w[0] + M[5] * w[1] + M[6] * w[2], M[8] * w[0] + M[9] * w[1] + M[10] * w[2]]; out.push({ ...p, p: mApply(M, p.p[0], p.p[1], p.p[2]), u: lin(p.u), v: lin(p.v), c, l }); }
        }
      }
      if (e.attribs) for (const a of e.attribs) compileRaw(a, out, ctx, depth + 1);
      break;
    }
    default: break;
  }
}
function xfArr(a, M) {
  const f = new Float64Array(a.length);
  for (let i = 0; i < a.length; i += 3) { const x = a[i], y = a[i + 1], z = a[i + 2]; f[i] = M[0] * x + M[1] * y + M[2] * z + M[3]; f[i + 1] = M[4] * x + M[5] * y + M[6] * z + M[7]; f[i + 2] = M[8] * x + M[9] * y + M[10] * z + M[11]; }
  return f;
}
function insertMatrices(e, b) {
  if (e.type === 'DIMENSION') return [M_ID];
  const base = b.base || [0, 0, 0];
  const ip = P3(e.insertionPoint);
  const sx = e.xScale || 1, sy = e.yScale || 1, sz = e.zScale || 1;
  const ocs = ocsMatrix(e.extrusionDirection);
  const pre = mMul(mS(sx, sy, sz), mT(-base[0], -base[1], -base[2]));
  const nc = Math.max(1, e.columnCount || 1), nr = Math.max(1, e.rowCount || 1);
  const out = [];
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
    let M = mMul(mMul(mT(ip[0], ip[1], ip[2]), mRz(e.rotation || 0)), mMul(mT(c * (e.columnSpacing || 0), r * (e.rowSpacing || 0)), pre));
    if (ocs) M = mMul(ocs, M);
    out.push(M);
    if (out.length > 5000) return out;
  }
  return out;
}
function blockPrims(ctx, b, depth = 0) {
  if (b.prims) return b.prims;
  if (b._busy) return [];
  b._busy = true;
  const out = [];
  for (const e of b.ents) compileRaw(e, out, ctx, depth);
  b._busy = false; b.prims = out; return out;
}

// group prims by style for fast drawing; computes local bbox
function groupPrims(prims) {
  const groups = new Map(); let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const acc = (x, y, z) => { if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z; if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z; };
  let nseg = 0;
  for (const p of prims) {
    const key = p.l + '\u0000' + p.c + '\u0000' + (p.lt || '');
    let g = groups.get(key);
    if (!g) { g = { l: p.l, c: p.c, lt: p.lt || '', lines: [], fills: [], texts: [], pts: [] }; groups.set(key, g); }
    if (p.k === 0) { g.lines.push(p); for (let i = 0; i < p.p.length; i += 3) acc(p.p[i], p.p[i + 1], p.p[i + 2]); nseg += p.p.length / 3; }
    else if (p.k === 2) { g.fills.push(p); for (const r of p.rings) for (let i = 0; i < r.length; i += 3) acc(r[i], r[i + 1], r[i + 2]); }
    else if (p.k === 1) { g.texts.push(p); acc(p.p[0], p.p[1], p.p[2]); const w = Math.max(...p.lines.map((s) => textW(s))) * p.h, n = p.lines.length;
      const ux = p.u[0], uy = p.u[1], vx = p.v[0], vy = p.v[1];
      const hh = p.h * (1 + (n - 1) * (p.ls || 1.667));
      for (const [a, b] of [[-w, -hh], [w, hh], [-w, hh], [w, -hh]]) acc(p.p[0] + ux * a + vx * b, p.p[1] + uy * a + vy * b, p.p[2]); }
    else if (p.k === 3) { g.pts.push(p); acc(p.p[0], p.p[1], p.p[2]); }
  }
  if (mn[0] === Infinity) { mn = [0, 0, 0]; mx = [0, 0, 0]; }
  return { groups: [...groups.values()], bb: [mn, mx], nseg };
}
function blockCompiled(ctx, b) {
  if (!b.comp) b.comp = groupPrims(blockPrims(ctx, b));
  return b.comp;
}
