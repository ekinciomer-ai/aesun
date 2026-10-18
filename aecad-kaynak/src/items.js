// ---- native items, import, transforms ----
function importNormalized(norm) {
  const doc = new Doc();
  doc.layers.clear();
  for (const L of norm.layers) {
    let c = L.colorIndex; if (typeof c !== 'number') c = parseInt(c) || 7;
    const on = !(L.off === true || L.off === 'True' || c < 0);
    const sf = typeof L.standardFlag === 'number' ? L.standardFlag : null;
    const fz = sf !== null ? (sf & 1) === 1 : (L.frozen === true || L.frozen === 'True');
    const lk = sf !== null ? (sf & 4) === 4 : (L.locked === true || L.locked === 'True');
    doc.layers.set(L.name, { name: L.name, c: Math.abs(c) || 7, lt: L.lineType || 'Continuous', on, fz, lk });
  }
  if (!doc.layers.has('0')) doc.addLayer('0', 7);
  for (const [name, b] of norm.blocks) doc.blocks.set(name, { name, base: b.base || [0, 0, 0], ents: b.ents });
  doc.solids = norm.solids || new Map();
  const ctx = { blocks: doc.blocks, solids: doc.solids };
  doc.ctx = ctx;
  for (const e of norm.model) {
    const it = rawToItem(e, ctx);
    if (it) { if (!doc.layers.has(it.layer)) doc.addLayer(it.layer, 7); doc.items.set(it.id, it); }
  }
  return doc;
}
function rawToItem(e, ctx) {
  if (e.isVisible === false || e.type === 'VIEWPORT' || e.type === 'ATTDEF') return null;
  const base = { id: newId(), layer: e.layer || '0', c: rawColor(e), lt: e.lineType || '' };
  const ocs = ocsMatrix(e.extrusionDirection);
  const flip = ocs && Math.abs(ocs[10] + 1) < 1e-9; // extrusion (0,0,-1)
  const plain = !ocs || flip;
  const fx = (x) => flip ? -x : x;
  switch (e.type) {
    case 'LINE': return { ...base, t: 'line', x1: e.startPoint.x, y1: e.startPoint.y, x2: e.endPoint.x, y2: e.endPoint.y };
    case 'LWPOLYLINE': case 'POLYLINE2D':
      if (!plain || !(e.vertices && e.vertices.length > 1) || (e.flag & (16 | 64))) break;
      return { ...base, t: 'pline', cl: (e.flag & 1) === 1, pts: e.vertices.map((v) => [fx(v.x), v.y, flip ? -(v.bulge || 0) : (v.bulge || 0)]), w: e.constantWidth || 0 };
    case 'CIRCLE': if (!plain) break; return { ...base, t: 'circle', cx: fx(e.center.x), cy: e.center.y, r: e.radius };
    case 'ARC': if (!plain) break;
      if (flip) return { ...base, t: 'arc', cx: -e.center.x, cy: e.center.y, r: e.radius, a0: Math.PI - e.endAngle, a1: Math.PI - e.startAngle };
      return { ...base, t: 'arc', cx: e.center.x, cy: e.center.y, r: e.radius, a0: e.startAngle, a1: e.endAngle };
    case 'POINT': return { ...base, t: 'point', x: e.position.x, y: e.position.y };
    case 'TEXT': {
      if (ocs) break;
      let ha = e.halign || 0, va = e.valign || 0; let p = e.startPoint;
      if ((ha || va) && ha !== 3 && ha !== 5 && e.endPoint && (e.endPoint.x || e.endPoint.y)) p = e.endPoint;
      if (ha === 4) { ha = 1; va = 2; } if (ha === 3 || ha === 5) { ha = 0; va = 0; }
      return { ...base, t: 'text', x: p.x, y: p.y, h: e.textHeight || 1, rot: e.rotation || 0, s: decodeText(e.text || ''), ha, va, xs: e.xScale || 1 };
    }
    case 'MTEXT': {
      const ap = e.attachmentPoint || 1, col = (ap - 1) % 3, row = Math.floor((ap - 1) / 3);
      let ang = e.rotation || 0; const d = e.direction; if (d && (Math.abs(d.x) + Math.abs(d.y)) > 1e-9) ang = Math.atan2(d.y, d.x);
      return { ...base, t: 'text', mt: true, x: e.insertionPoint.x, y: e.insertionPoint.y, h: e.textHeight || 1, rot: ang, s: mtextPlain(e.text).join('\n'), ha: col, va: row === 0 ? 3 : row === 1 ? 2 : 1, wd: e.rectWidth || 0, ls: (e.lineSpacing || 1) * 1.667 };
    }
    case 'INSERT': case 'DIMENSION': {
      const b = ctx.blocks.get(e.name); if (!b) break;
      const Ms = insertMatrices(e, b);
      const ap = []; if (e.attribs) for (const a of e.attribs) compileRaw(a, ap, ctx);
      if (Ms.length === 1) return { ...base, t: 'insert', block: e.name, M: Ms[0], ap, dim: e.type === 'DIMENSION' };
      // arrays -> geo
      const prims = []; compileRaw(e, prims, ctx); return { ...base, t: 'geo', prims, M: M_ID, src: e.type };
    }
    default: break;
  }
  const prims = []; compileRaw(e, prims, ctx);
  if (!prims.length) return null;
  return { ...base, t: 'geo', prims, M: M_ID, src: e.type };
}

// ---- native -> prims ----
function dimGeom(it) {
  const d = [Math.cos(it.ang), Math.sin(it.ang)], n = [-d[1], d[0]];
  const off1 = (it.lx - it.x1) * n[0] + (it.ly - it.y1) * n[1];
  const off2 = (it.lx - it.x2) * n[0] + (it.ly - it.y2) * n[1];
  const q1 = [it.x1 + n[0] * off1, it.y1 + n[1] * off1], q2 = [it.x2 + n[0] * off2, it.y2 + n[1] * off2];
  const val = Math.abs((it.x2 - it.x1) * d[0] + (it.y2 - it.y1) * d[1]);
  return { d, n, q1, q2, off1, off2, val };
}
function fmtNum(v, dec = 2) { return (Math.round(v * 10 ** dec) / 10 ** dec).toFixed(dec); }
function nativePrims(it) {
  const st = { c: it.c, l: it.layer, lt: it.lt || '' };
  const out = [];
  switch (it.t) {
    case 'line': pushPoly(out, st, [it.x1, it.y1, 0, it.x2, it.y2, 0], false); break;
    case 'pline': {
      const v = it.pts; const a = [v[0][0], v[0][1]];
      for (let i = 1; i < v.length; i++) bulgeArcPts(v[i - 1][0], v[i - 1][1], v[i][0], v[i][1], v[i - 1][2], a);
      if (it.cl) bulgeArcPts(v[v.length - 1][0], v[v.length - 1][1], v[0][0], v[0][1], v[v.length - 1][2], a);
      pushPoly(out, st, to3(a, 0), false); break;
    }
    case 'circle': pushPoly(out, st, to3(arcPts(it.cx, it.cy, it.r, 0, TAU, true), 0), true); break;
    case 'arc': pushPoly(out, st, to3(arcPts(it.cx, it.cy, it.r, it.a0, it.a1, false), 0), false); break;
    case 'point': out.push({ k: 3, p: [it.x, it.y, 0], c: it.c, l: it.layer }); break;
    case 'text': {
      let lines = it.s.split('\n'); if (it.mt && it.wd) lines = wrapLines(lines, it.wd, it.h);
      const tp = textPrim(st, [it.x, it.y, 0], it.rot, it.h, lines, it.ha, it.va, null, it.xs || 1);
      if (it.mt || lines.length > 1) { tp.mt = true; tp.ls = it.ls || 1.667; }
      out.push(tp); break;
    }
    case 'dim': {
      const g = dimGeom(it), h = it.h, ext = h * 0.6;
      const s1 = Math.sign(g.off1) || 1, s2 = Math.sign(g.off2) || 1;
      pushPoly(out, st, [it.x1 + g.n[0] * s1 * h * 0.3, it.y1 + g.n[1] * s1 * h * 0.3, 0, g.q1[0] + g.n[0] * s1 * ext, g.q1[1] + g.n[1] * s1 * ext, 0], false);
      pushPoly(out, st, [it.x2 + g.n[0] * s2 * h * 0.3, it.y2 + g.n[1] * s2 * h * 0.3, 0, g.q2[0] + g.n[0] * s2 * ext, g.q2[1] + g.n[1] * s2 * ext, 0], false);
      pushPoly(out, st, [g.q1[0], g.q1[1], 0, g.q2[0], g.q2[1], 0], false);
      // ticks (architectural)
      const tk = h * 0.5, tx = (g.d[0] + g.n[0]) * tk * 0.7071, ty = (g.d[1] + g.n[1]) * tk * 0.7071;
      for (const q of [g.q1, g.q2]) pushPoly(out, st, [q[0] - tx, q[1] - ty, 0, q[0] + tx, q[1] + ty, 0], false);
      let ang = it.ang; if (Math.cos(ang) < -1e-6 || (Math.abs(Math.cos(ang)) < 1e-6 && Math.sin(ang) < 0)) ang += Math.PI;
      const nn = [-Math.sin(ang), Math.cos(ang)];
      const mx = (g.q1[0] + g.q2[0]) / 2 + nn[0] * h * 0.5, my = (g.q1[1] + g.q2[1]) / 2 + nn[1] * h * 0.5;
      out.push(textPrim(st, [mx, my, 0], ang, h, [it.txt || fmtNum(g.val, it.dec ?? 2)], 1, 1, null));
      break;
    }
    default: break;
  }
  return out;
}

// drawables cache
const _drCache = new WeakMap();
function drawables(doc, it) {
  let d = _drCache.get(it); if (d) return d;
  if (it.t === 'insert') {
    const b = doc.blocks.get(it.block);
    d = [];
    if (b) d.push({ comp: blockCompiled(doc.ctx || doc, b), M: it.M, pc: it.c, pl: it.layer, ins: true });
    if (it.ap && it.ap.length) d.push({ comp: groupPrims(it.ap), M: it.AM || M_ID, pc: it.c, pl: it.layer });
  } else if (it.t === 'geo') d = [{ comp: groupPrims(it.prims), M: it.M, pc: it.c, pl: it.layer }];
  else d = [{ comp: groupPrims(nativePrims(it)), M: M_ID, pc: it.c, pl: it.layer }];
  _drCache.set(it, d); return d;
}
const _bbCache = new WeakMap();
function itemBB(doc, it) {
  let r = _bbCache.get(it); if (r) return r;
  r = [Infinity, Infinity, -Infinity, -Infinity];
  for (const d of drawables(doc, it)) {
    const [mn, mx] = d.comp.bb; if (!isFinite(mn[0])) continue;
    for (const x of [mn[0], mx[0]]) for (const y of [mn[1], mx[1]]) for (const z of [mn[2], mx[2]]) {
      const q = mApply(d.M, x, y, z); if (q[0] < r[0]) r[0] = q[0]; if (q[1] < r[1]) r[1] = q[1]; if (q[0] > r[2]) r[2] = q[0]; if (q[1] > r[3]) r[3] = q[1];
    }
  }
  _bbCache.set(it, r); return r;
}

// ---- transforms (2D affine T as 3x4 matrix) ----
function xfItem(it, T) {
  const n = { ...it };
  const P = (x, y) => [T[0] * x + T[1] * y + T[3], T[4] * x + T[5] * y + T[7]];
  const det = T[0] * T[5] - T[1] * T[4], sc = Math.sqrt(Math.abs(det)), rot = Math.atan2(T[4], T[0]), mir = det < 0;
  switch (it.t) {
    case 'line': [n.x1, n.y1] = P(it.x1, it.y1); [n.x2, n.y2] = P(it.x2, it.y2); break;
    case 'pline': n.pts = it.pts.map((v) => { const q = P(v[0], v[1]); return [q[0], q[1], mir ? -v[2] : v[2]]; }); break;
    case 'circle': [n.cx, n.cy] = P(it.cx, it.cy); n.r = it.r * sc; break;
    case 'arc': {
      [n.cx, n.cy] = P(it.cx, it.cy); n.r = it.r * sc;
      const pa = P(it.cx + Math.cos(it.a0), it.cy + Math.sin(it.a0)), pb = P(it.cx + Math.cos(it.a1), it.cy + Math.sin(it.a1));
      const A0 = Math.atan2(pa[1] - n.cy, pa[0] - n.cx), A1 = Math.atan2(pb[1] - n.cy, pb[0] - n.cx);
      if (mir) { n.a0 = A1; n.a1 = A0; } else { n.a0 = A0; n.a1 = A1; } break;
    }
    case 'point': [n.x, n.y] = P(it.x, it.y); break;
    case 'text': {
      [n.x, n.y] = P(it.x, it.y); n.h = it.h * sc;
      if (it.wd) n.wd = it.wd * sc;
      if (mir) { // keep text readable: mirror position only
        const u = [T[0] * Math.cos(it.rot) + T[1] * Math.sin(it.rot), T[4] * Math.cos(it.rot) + T[5] * Math.sin(it.rot)];
        n.rot = Math.atan2(u[1], u[0]); if (Math.cos(n.rot) < 0) n.rot += Math.PI;
      } else n.rot = it.rot + rot; break;
    }
    case 'dim': {
      [n.x1, n.y1] = P(it.x1, it.y1); [n.x2, n.y2] = P(it.x2, it.y2); [n.lx, n.ly] = P(it.lx, it.ly); n.h = it.h * sc;
      const u = [T[0] * Math.cos(it.ang) + T[1] * Math.sin(it.ang), T[4] * Math.cos(it.ang) + T[5] * Math.sin(it.ang)]; n.ang = Math.atan2(u[1], u[0]);
      break;
    }
    case 'insert': n.M = mMul(T, it.M); if (it.ap && it.ap.length) n.AM = mMul(T, it.AM || M_ID); break;
    case 'geo': n.M = mMul(T, it.M); break;
  }
  return n;
}
