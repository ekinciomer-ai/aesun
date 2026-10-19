// ---- application: UI, input, snaps, commands ----
const $ = (s) => document.querySelector(s);
const CANCEL = { cancel: true };
const S = {
  doc: null, view: null, cmd: null, pending: null, last: null, lastCmd: null, mouse: [0, 0], mw: [0, 0],
  osnap: true, ortho: false, snap: null, preview: null, ghost: null, curLayer: '0', textH: 2.5, offD: 1, filR: 0, dragging: null, hover: null,
  layerFilter: '', extNote: '', otrack: true, track: [], trk: null,
};
const V = () => S.view;

// ---------- messages ----------
function msg(t, cls) {
  const h = $('#hist'); const d = document.createElement('div'); d.textContent = t; if (cls) d.className = cls; h.appendChild(d);
  while (h.children.length > 60) h.removeChild(h.firstChild); h.scrollTop = h.scrollHeight;
}
function setPrompt(t) { $('#prompt').textContent = t; }
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), 3200); }

// ---------- redraw scheduling ----------
let _rq = false, _oq = false;
function redraw() { if (!_rq) { _rq = true; requestAnimationFrame(() => { _rq = false; V().render(); drawOverlay(); updateStatus(); if (typeof tasarimTik === 'function') tasarimTik(); }); } }
function redrawOverlay() { if (!_oq) { _oq = true; requestAnimationFrame(() => { _oq = false; drawOverlay(); }); } }

// ---------- extents ----------
function extents(all) {
  const doc = S.doc; const bbs = [];
  for (const it of doc.items.values()) { const L = doc.layers.get(it.layer); if (L && (!L.on || L.fz)) continue; const b = itemBB(doc, it); if (isFinite(b[0])) bbs.push(b); }
  if (!bbs.length) return { r: [-10, -10, 10, 10], out: 0 };
  const full = bbs.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])], [Infinity, Infinity, -Infinity, -Infinity]);
  if (all || bbs.length < 8) return { r: full, out: 0 };
  const cx = bbs.map((b) => (b[0] + b[2]) / 2).sort((a, b) => a - b), cy = bbs.map((b) => (b[1] + b[3]) / 2).sort((a, b) => a - b);
  const q = (a, f) => a[Math.min(a.length - 1, Math.max(0, Math.floor(a.length * f)))];
  const x0 = q(cx, 0.02), x1 = q(cx, 0.98), y0 = q(cy, 0.02), y1 = q(cy, 0.98);
  const span = Math.max(x1 - x0, y1 - y0, 1e-6) * 2;
  const core = [x0 - span, y0 - span, x1 + span, y1 + span];
  let r = [Infinity, Infinity, -Infinity, -Infinity], out = 0;
  for (const b of bbs) {
    const mx = (b[0] + b[2]) / 2, my = (b[1] + b[3]) / 2;
    if (mx < core[0] || mx > core[2] || my < core[1] || my > core[3] || (b[2] - b[0]) > span * 4 || (b[3] - b[1]) > span * 4) { out++; continue; }
    r = [Math.min(r[0], b[0]), Math.min(r[1], b[1]), Math.max(r[2], b[2]), Math.max(r[3], b[3])];
  }
  if (!isFinite(r[0])) return { r: full, out: 0 };
  return { r, out };
}
function zoomTo(r, pad = 1.06) {
  const v = V(); const w = Math.max(r[2] - r[0], 1e-6), h = Math.max(r[3] - r[1], 1e-6);
  v.cx = (r[0] + r[2]) / 2; v.cy = (r[1] + r[3]) / 2; v.s = Math.min(v.W / (w * pad), v.H / (h * pad)); redraw();
}
function zoomExtents(all) {
  const e = extents(all); zoomTo(e.r);
  if (e.out && !all) { S.extNote = e.out + ' nesne çizim alanının çok dışında kaldığı için görünüme alınmadı. Hepsini görmek için: Z → T'; msg(S.extNote, 'note'); }
}

// ---------- hit testing ----------
function forSegs(d, A, fn) { // A: 2x4 to screen; fn(x1,y1,x2,y2)
  for (const gr of d.comp.groups) {
    for (const pl of gr.lines) { const p = pl.p; let X0 = A[0] * p[0] + A[1] * p[1] + A[2] * p[2] + A[3], Y0 = A[4] * p[0] + A[5] * p[1] + A[6] * p[2] + A[7]; const fx = X0, fy = Y0;
      for (let i = 3; i < p.length; i += 3) { const X = A[0] * p[i] + A[1] * p[i + 1] + A[2] * p[i + 2] + A[3], Y = A[4] * p[i] + A[5] * p[i + 1] + A[6] * p[i + 2] + A[7]; if (fn(X0, Y0, X, Y, pl, gr) === true) return true; X0 = X; Y0 = Y; }
      if (pl.cl && fn(X0, Y0, fx, fy, pl, gr) === true) return true; }
    for (const f of gr.fills) for (const r of f.rings) for (let i = 0; i + 3 < r.length; i += 3) { const X = A[0] * r[i] + A[1] * r[i + 1] + A[2] * r[i + 2] + A[3], Y = A[4] * r[i] + A[5] * r[i + 1] + A[6] * r[i + 2] + A[7], X2 = A[0] * r[i + 3] + A[1] * r[i + 4] + A[2] * r[i + 5] + A[3], Y2 = A[4] * r[i + 3] + A[5] * r[i + 4] + A[6] * r[i + 5] + A[7]; if (fn(X, Y, X2, Y2, f, gr) === true) return true; }
  }
  return false;
}
function layerVisible(it) { const L = S.doc.layers.get(it.layer); return !L || (L.on && !L.fz); }
function textHit(d, A, X, Y) {
  for (const gr of d.comp.groups) for (const t of gr.texts) {
    const P = [A[0] * t.p[0] + A[1] * t.p[1] + A[2] * t.p[2] + A[3], A[4] * t.p[0] + A[5] * t.p[1] + A[6] * t.p[2] + A[7]];
    const ux = A[0] * t.u[0] + A[1] * t.u[1], uy = A[4] * t.u[0] + A[5] * t.u[1], vx = A[0] * t.v[0] + A[1] * t.v[1], vy = A[4] * t.v[0] + A[5] * t.v[1];
    const lu = Math.hypot(ux, uy) || 1, lv = Math.hypot(vx, vy) || 1;
    const dx = X - P[0], dy = Y - P[1]; const a = (dx * ux + dy * uy) / lu / lu, b = (dx * vx + dy * vy) / lv / lv; // in local units
    const w = Math.max(...t.lines.map((s) => textW(s))) * t.h, n = t.lines.length, ls = (t.ls || 1.667) * t.h;
    const x0 = t.ha === 1 ? -w / 2 : t.ha === 2 ? -w : 0;
    const tot = (n - 1) * ls + t.h;
    let top = t.mt ? (t.va === 3 ? 0 : t.va === 2 ? tot / 2 : tot) : (t.va === 3 ? 0 : t.va === 2 ? t.h / 2 : t.h);
    const bot = top - tot - t.h * 0.3;
    if (a >= x0 - t.h * 0.2 && a <= x0 + w + t.h * 0.2 && b <= top + t.h * 0.2 && b >= bot) return true;
  }
  return false;
}
function pickItem(X, Y, tol = 6) {
  const v = V(), doc = S.doc; const [wx, wy] = v.s2w(X, Y); const wt = tol / v.s; let best = null;
  for (const it of doc.items.values()) {
    if (!layerVisible(it)) continue;
    const b = itemBB(doc, it); if (wx < b[0] - wt || wx > b[2] + wt || wy < b[1] - wt || wy > b[3] + wt) continue;
    let hit = false;
    for (const d of drawables(doc, it)) {
      const A = v.scr(d.M);
      if (forSegs(d, A, (x1, y1, x2, y2) => distSeg(X, Y, x1, y1, x2, y2).d <= tol)) { hit = true; break; }
      if (textHit(d, A, X, Y)) { hit = true; break; }
      for (const gr of d.comp.groups) for (const p of gr.pts) { const q = [A[0] * p.p[0] + A[1] * p.p[1] + A[2] * p.p[2] + A[3], A[4] * p.p[0] + A[5] * p.p[1] + A[6] * p.p[2] + A[7]]; if (Math.hypot(q[0] - X, q[1] - Y) <= tol) hit = true; }
      if (hit) break;
    }
    if (hit) best = it;
  }
  return best;
}
function windowSelect(x0, y0, x1, y1, crossing) {
  const v = V(), doc = S.doc; const a = v.s2w(Math.min(x0, x1), Math.max(y0, y1)), b = v.s2w(Math.max(x0, x1), Math.min(y0, y1));
  const R = [a[0], a[1], b[0], b[1]]; const out = [];
  const SX0 = Math.min(x0, x1), SX1 = Math.max(x0, x1), SY0 = Math.min(y0, y1), SY1 = Math.max(y0, y1);
  const inR = (X, Y) => X >= SX0 && X <= SX1 && Y >= SY0 && Y <= SY1;
  const segRect = (ax, ay, bx, by) => { if (inR(ax, ay) || inR(bx, by)) return true; const e = [[SX0, SY0, SX1, SY0], [SX1, SY0, SX1, SY1], [SX1, SY1, SX0, SY1], [SX0, SY1, SX0, SY0]]; for (const q of e) if (segInt(ax, ay, bx, by, q[0], q[1], q[2], q[3])) return true; return false; };
  for (const it of doc.items.values()) {
    if (!layerVisible(it)) continue;
    const bb = itemBB(doc, it);
    const inside = bb[0] >= R[0] && bb[2] <= R[2] && bb[1] >= R[1] && bb[3] <= R[3];
    if (inside) { out.push(it.id); continue; }
    if (!crossing) continue;
    if (bb[2] < R[0] || bb[0] > R[2] || bb[3] < R[1] || bb[1] > R[3]) continue;
    let hit = false;
    for (const d of drawables(doc, it)) { const A = v.scr(d.M); if (forSegs(d, A, segRect)) { hit = true; break; }
      for (const gr of d.comp.groups) for (const t of gr.texts) { const X = A[0] * t.p[0] + A[1] * t.p[1] + A[2] * t.p[2] + A[3], Y = A[4] * t.p[0] + A[5] * t.p[1] + A[6] * t.p[2] + A[7]; if (inR(X, Y)) hit = true; }
      if (hit) break; }
    if (hit) out.push(it.id);
  }
  return out;
}

// ---------- object snap ----------
const SNAP_SYM = { END: 'Uç nokta', MID: 'Orta nokta', CEN: 'Merkez', INT: 'Kesişim', PER: 'Dik', NEA: 'En yakın', QUA: 'Çeyrek', INS: 'Ekleme noktası', NOD: 'Nokta' };
function nativeSnaps(it, out) {
  const P = (x, y, t) => out.push({ x, y, t });
  switch (it.t) {
    case 'line': P(it.x1, it.y1, 'END'); P(it.x2, it.y2, 'END'); P((it.x1 + it.x2) / 2, (it.y1 + it.y2) / 2, 'MID'); break;
    case 'pline': { const v = it.pts, n = v.length; for (let i = 0; i < n; i++) { P(v[i][0], v[i][1], 'END'); if (i < n - 1 || it.cl) { const w = v[(i + 1) % n]; if (Math.abs(v[i][2]) < 1e-9) P((v[i][0] + w[0]) / 2, (v[i][1] + w[1]) / 2, 'MID'); else { const c = bulgeCenter(v[i][0], v[i][1], w[0], w[1], v[i][2]); P(c.cx, c.cy, 'CEN'); const a = []; bulgeArcPts(v[i][0], v[i][1], w[0], w[1], v[i][2], a); const k = Math.floor(a.length / 4) * 2; P(a[k], a[k + 1], 'MID'); } } } break; }
    case 'circle': P(it.cx, it.cy, 'CEN'); for (let k = 0; k < 4; k++) P(it.cx + it.r * Math.cos(k * Math.PI / 2), it.cy + it.r * Math.sin(k * Math.PI / 2), 'QUA'); break;
    case 'arc': { P(it.cx, it.cy, 'CEN'); P(it.cx + it.r * Math.cos(it.a0), it.cy + it.r * Math.sin(it.a0), 'END'); P(it.cx + it.r * Math.cos(it.a1), it.cy + it.r * Math.sin(it.a1), 'END'); let sw = ((it.a1 - it.a0) % TAU + TAU) % TAU; const am = it.a0 + sw / 2; P(it.cx + it.r * Math.cos(am), it.cy + it.r * Math.sin(am), 'MID'); break; }
    case 'text': P(it.x, it.y, 'INS'); break;
    case 'point': P(it.x, it.y, 'NOD'); break;
    case 'dim': P(it.x1, it.y1, 'END'); P(it.x2, it.y2, 'END'); break;
    case 'insert': { const q = mApply(it.M, 0, 0, 0); P(q[0], q[1], 'INS'); break; }
  }
}
function computeSnap(X, Y, base) {
  const v = V(), doc = S.doc, ap = 12; const [wx, wy] = v.s2w(X, Y); const wt = ap / v.s;
  const cands = [], segs = [];
  for (const it of doc.items.values()) {
    if (!layerVisible(it)) continue;
    const b = itemBB(doc, it); if (wx < b[0] - wt || wx > b[2] + wt || wy < b[1] - wt || wy > b[3] + wt) continue;
    nativeSnaps(it, cands);
    for (const d of drawables(doc, it)) {
      const A = v.scr(d.M); const native = !(it.t === 'insert' || it.t === 'geo');
      forSegs(d, A, (x1, y1, x2, y2, pl) => {
        if (Math.min(x1, x2) > X + ap || Math.max(x1, x2) < X - ap || Math.min(y1, y2) > Y + ap || Math.max(y1, y2) < Y - ap) return;
        if (segs.length < 3000) segs.push([x1, y1, x2, y2]);
        if (!native) { cands.push({ X: x1, Y: y1, t: 'END' }, { X: x2, Y: y2, t: 'END' }); if (pl && pl.p && pl.p.length === 6) cands.push({ X: (x1 + x2) / 2, Y: (y1 + y2) / 2, t: 'MID' }); }
      });
    }
  }
  for (const c of cands) if (c.X === undefined) { const q = v.w2s(c.x, c.y); c.X = q[0]; c.Y = q[1]; }
  // intersections
  if (segs.length < 400) for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const a = segs[i], b = segs[j]; const r = segInt(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3]);
    if (r && Math.hypot(r.x - X, r.y - Y) < ap) cands.push({ X: r.x, Y: r.y, t: 'INT' });
  }
  let best = null, bd = ap;
  for (const c of cands) { const d = Math.hypot(c.X - X, c.Y - Y); if (d < bd - (c.t === 'INT' || c.t === 'END' ? 1 : 0)) { bd = d; best = c; } }
  if (!best && base) { const B = v.w2s(base[0], base[1]);
    for (const s of segs) { const dx = s[2] - s[0], dy = s[3] - s[1], L = dx * dx + dy * dy; if (!L) continue; const t = ((B[0] - s[0]) * dx + (B[1] - s[1]) * dy) / L; if (t < 0 || t > 1) continue; const px = s[0] + dx * t, py = s[1] + dy * t; const d = Math.hypot(px - X, py - Y); if (d < bd) { bd = d; best = { X: px, Y: py, t: 'PER' }; } } }
  if (!best && S.nearest) for (const s of segs) { const r = distSeg(X, Y, s[0], s[1], s[2], s[3]); if (r.d < bd) { bd = r.d; best = { X: r.x, Y: r.y, t: 'NEA' }; } }
  if (!best) return null;
  const w = v.s2w(best.X, best.Y); return { x: w[0], y: w[1], t: best.t };
}
// object snap tracking: acquired points + base point give horizontal/vertical alignment paths
function trackSnap(X, Y, base) {
  const v = V(), tol = 12; const refs = S.track.map((p) => ({ p, s: v.w2s(p[0], p[1]) }));
  if (base) refs.push({ p: base, s: v.w2s(base[0], base[1]), base: true });
  const c = [];
  for (const r of refs) {
    if (Math.abs(X - r.s[0]) < tol && Math.abs(Y - r.s[1]) > 4) c.push({ k: 'v', w: r.p[0], p: r.p, d: Math.abs(X - r.s[0]), base: r.base });
    if (Math.abs(Y - r.s[1]) < tol && Math.abs(X - r.s[0]) > 4) c.push({ k: 'h', w: r.p[1], p: r.p, d: Math.abs(Y - r.s[1]), base: r.base });
  }
  if (!c.length) return null;
  let best = null;
  for (const a of c) if (a.k === 'v') for (const b of c) if (b.k === 'h' && b.p !== a.p) { const sc = a.d + b.d; if (!best || sc < best.sc) best = { sc, x: a.w, y: b.w, lines: [[a.p, [a.w, b.w]], [b.p, [a.w, b.w]]] }; }
  if (best) return best;
  // single path: prefer acquired points over the base point
  c.sort((p, q) => (p.base ? 1 : 0) - (q.base ? 1 : 0) || p.d - q.d); const h = c[0]; const w = v.s2w(X, Y);
  const pt = h.k === 'v' ? [h.w, w[1]] : [w[0], h.w];
  return { x: pt[0], y: pt[1], lines: [[h.p, pt]] };
}
function cursorWorld() {
  const v = V(); let [x, y] = v.s2w(S.mouse[0], S.mouse[1]);
  const base = S.pending && S.pending.opts && S.pending.opts.base;
  S.snap = null; S.trk = null;
  if (S.osnap && S.pending && S.pending.kind === 'point') {
    const sn = computeSnap(S.mouse[0], S.mouse[1], base); if (sn) { S.snap = sn; return [sn.x, sn.y]; }
  }
  if (S.otrack && S.pending && S.pending.kind === 'point' && !S.pending.opts.numeric) {
    const t = trackSnap(S.mouse[0], S.mouse[1], S.ortho ? null : base);
    if (t) { S.trk = t; return [t.x, t.y]; }
  }
  if (S.ortho && base) { if (Math.abs(x - base[0]) > Math.abs(y - base[1])) y = base[1]; else x = base[0]; }
  return [x, y];
}
function acquireTrack(p) {
  const i = S.track.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9);
  if (i >= 0) S.track.splice(i, 1); else { S.track.push([p[0], p[1]]); if (S.track.length > 5) S.track.shift(); }
  redrawOverlay();
}

// ---------- overlay ----------
function drawOverlay() {
  const v = V(), o = v.o, dpr = v.dpr; o.setTransform(dpr, 0, 0, dpr, 0, 0); o.clearRect(0, 0, v.W, v.H);
  if (!S.doc) return;
  const ACC = '#ff5a4e';
  if (S.hover && !S.pending) { const it = S.doc.items.get(S.hover); if (it) for (const d of drawables(S.doc, it)) v.drawDrawable(o, d, 'rgba(120,190,255,0.85)', true, true); }
  // ghost
  if (S.ghost && S.pending && S.pending.kind === 'point') {
    const m = S.mw; const T = S.ghost(m);
    if (T) { let n = 0; for (const id of S.ghostIds) { const it = S.doc.items.get(id); if (!it) continue; if (n++ > 400) break; for (const d of drawables(S.doc, it)) v.drawDrawable(o, { ...d, M: mMul(T, d.M) }, 'rgba(255,140,120,0.9)', true, true); } }
  }
  // preview shapes
  if (S.pending && S.pending.opts && S.pending.opts.preview) {
    const shapes = S.pending.opts.preview(S.mw) || [];
    o.strokeStyle = ACC; o.fillStyle = ACC; o.lineWidth = 1.2; o.setLineDash([]);
    for (const sh of shapes) {
      if (sh.dash) o.setLineDash([4, 4]); else o.setLineDash([]);
      if (sh.pts) { o.beginPath(); sh.pts.forEach((p, i) => { const q = v.w2s(p[0], p[1]); i ? o.lineTo(q[0], q[1]) : o.moveTo(q[0], q[1]); }); if (sh.cl) o.closePath(); o.stroke(); }
      if (sh.item) { for (const d of drawables(S.doc, sh.item)) v.drawDrawable(o, d, ACC, false, true); }
    }
    o.setLineDash([]);
  }
  // window
  if (S.dragging && S.dragging.kind === 'win') {
    const d = S.dragging; const cross = d.x1 < d.x0;
    o.fillStyle = cross ? 'rgba(80,200,120,0.12)' : 'rgba(80,140,255,0.12)'; o.strokeStyle = cross ? '#5fd38a' : '#6aa2ff';
    o.setLineDash(cross ? [5, 4] : []); const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
    o.fillRect(x, y, w, h); o.strokeRect(x + 0.5, y + 0.5, w, h); o.setLineDash([]);
  }
  // crosshair
  const [X, Y] = S.mouse; if (S.inside) {
    o.strokeStyle = v.dark ? 'rgba(235,235,235,0.75)' : 'rgba(30,30,30,0.75)'; o.lineWidth = 1; o.beginPath();
    const cs = S.pending && S.pending.kind === 'point' ? 40 : 18;
    o.moveTo(X - cs, Y + 0.5); o.lineTo(X + cs, Y + 0.5); o.moveTo(X + 0.5, Y - cs); o.lineTo(X + 0.5, Y + cs); o.stroke();
    if (!S.pending || S.pending.kind !== 'point') o.strokeRect(X - 4.5, Y - 4.5, 9, 9);
  }
  // tracking
  if (S.pending && S.pending.kind === 'point') {
    o.strokeStyle = '#5fd38a'; o.lineWidth = 1;
    for (const p of S.track) { const q = v.w2s(p[0], p[1]); o.beginPath(); o.moveTo(q[0] - 5, q[1]); o.lineTo(q[0] + 5, q[1]); o.moveTo(q[0], q[1] - 5); o.lineTo(q[0], q[1] + 5); o.stroke(); }
    if (S.trk) {
      o.setLineDash([6, 5]); o.beginPath();
      for (const [p, q] of S.trk.lines) { const A = v.w2s(p[0], p[1]), B = v.w2s(q[0], q[1]); const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; o.moveTo(A[0], A[1]); o.lineTo(B[0] + dx / L * 2000, B[1] + dy / L * 2000); }
      o.stroke(); o.setLineDash([]);
      const P = v.w2s(S.trk.x, S.trk.y); o.beginPath(); o.moveTo(P[0] - 6, P[1] - 6); o.lineTo(P[0] + 6, P[1] + 6); o.moveTo(P[0] + 6, P[1] - 6); o.lineTo(P[0] - 6, P[1] + 6); o.stroke();
      const base = S.pending.opts && S.pending.opts.base; const from = base || S.trk.lines[0][0];
      const dd = Math.hypot(S.trk.x - from[0], S.trk.y - from[1]), an = Math.atan2(S.trk.y - from[1], S.trk.x - from[0]) * 180 / Math.PI;
      const lbl = (S.trk.lines.length > 1 ? 'Kesişim izi' : 'İz') + ': ' + fmtNum(dd, 3) + ' < ' + fmtNum((an + 360) % 360, 1) + '°';
      o.font = '11px ' + FONT; const tw = o.measureText(lbl).width; o.fillStyle = 'rgba(21,24,28,0.88)'; o.fillRect(P[0] + 12, P[1] + 8, tw + 10, 18); o.fillStyle = '#5fd38a'; o.fillText(lbl, P[0] + 17, P[1] + 21);
    }
  }
  // snap marker
  if (S.snap) {
    const q = v.w2s(S.snap.x, S.snap.y); o.strokeStyle = '#ffd23f'; o.lineWidth = 2; o.beginPath(); const r = 6;
    const t = S.snap.t;
    if (t === 'END') o.rect(q[0] - r, q[1] - r, 2 * r, 2 * r);
    else if (t === 'MID') { o.moveTo(q[0], q[1] - r); o.lineTo(q[0] + r, q[1] + r); o.lineTo(q[0] - r, q[1] + r); o.closePath(); }
    else if (t === 'CEN') o.arc(q[0], q[1], r, 0, TAU);
    else if (t === 'INT') { o.moveTo(q[0] - r, q[1] - r); o.lineTo(q[0] + r, q[1] + r); o.moveTo(q[0] + r, q[1] - r); o.lineTo(q[0] - r, q[1] + r); }
    else if (t === 'PER') { o.moveTo(q[0] - r, q[1] - r); o.lineTo(q[0] - r, q[1] + r); o.lineTo(q[0] + r, q[1] + r); o.moveTo(q[0] - r, q[1]); o.lineTo(q[0], q[1]); o.lineTo(q[0], q[1] + r); }
    else if (t === 'QUA') { o.moveTo(q[0], q[1] - r); o.lineTo(q[0] + r, q[1]); o.lineTo(q[0], q[1] + r); o.lineTo(q[0] - r, q[1]); o.closePath(); }
    else { o.moveTo(q[0] - r, q[1] - r); o.lineTo(q[0] + r, q[1] - r); o.lineTo(q[0] - r, q[1] + r); o.lineTo(q[0] + r, q[1] + r); o.closePath(); }
    o.stroke(); o.font = '11px ' + FONT; o.fillStyle = '#ffd23f'; o.fillText(SNAP_SYM[t] || t, q[0] + 10, q[1] + 18);
  }
}

// ---------- input requests ----------
function ask(kind, prompt, opts = {}) {
  return new Promise((res, rej) => { S.pending = { kind, prompt, opts, res, rej }; setPrompt(prompt); if (kind === 'point') S.mw = cursorWorld(); redrawOverlay(); });
}
function resolvePending(v) { const p = S.pending; if (!p) return; S.pending = null; S.snap = null; if (v && Array.isArray(v)) S.last = v; p.res(v); redrawOverlay(); }
const getPoint = (prompt, opts) => ask('point', prompt, opts);
const getText = (prompt, opts) => ask('text', prompt, opts);
async function getNumber(prompt, opts = {}) { // number, or point distance from base, or null
  for (;;) {
    const r = await ask('point', prompt, { ...opts, numeric: true });
    if (r === null || (r && r.kw)) return r;
    if (typeof r === 'number') return r;
    if (Array.isArray(r) && opts.base) return opts.angle ? Math.atan2(r[1] - opts.base[1], r[0] - opts.base[0]) * 180 / Math.PI : Math.hypot(r[0] - opts.base[0], r[1] - opts.base[1]);
    if (Array.isArray(r) && !opts.base) { const p2 = await getPoint('İkinci nokta', { base: r, preview: (m) => [{ pts: [r, m] }] }); if (!Array.isArray(p2)) continue; return Math.hypot(p2[0] - r[0], p2[1] - r[1]); }
  }
}
function parseInput(txt) {
  const p = S.pending; if (!p) return;
  const t = txt.trim();
  if (p.kind === 'text') { resolvePending(txt); return; }
  if (t === '') { resolvePending(null); return; }
  const kw = (p.opts.kw || []).find((k) => k.toUpperCase() === t.toUpperCase().replace('İ', 'I') || k.toLocaleUpperCase('tr') === t.toLocaleUpperCase('tr'));
  if (kw) { resolvePending({ kw }); return; }
  const num = (s) => parseFloat(s.replace(',', '.'));
  if (p.kind === 'point') {
    const base = p.opts.base || S.last;
    let m;
    if ((m = /^@\s*(-?[\d.]+)\s*<\s*(-?[\d.]+)$/.exec(t)) && base) { const d = num(m[1]), a = num(m[2]) * Math.PI / 180; resolvePending([base[0] + d * Math.cos(a), base[1] + d * Math.sin(a)]); return; }
    if ((m = /^@\s*(-?[\d.]+)\s*[,;]\s*(-?[\d.]+)$/.exec(t)) && base) { resolvePending([base[0] + num(m[1]), base[1] + num(m[2])]); return; }
    if ((m = /^(-?[\d.]+)\s*[,;]\s*(-?[\d.]+)$/.exec(t))) { resolvePending([num(m[1]), num(m[2])]); return; }
    if ((m = /^-?[\d.]+$/.exec(t))) {
      const v = num(t);
      if (p.opts.numeric) { resolvePending(v); return; }
      if (p.opts.base) { const c = S.mw; let dx = c[0] - base[0], dy = c[1] - base[1]; const L = Math.hypot(dx, dy) || 1; resolvePending([base[0] + dx / L * v, base[1] + dy / L * v]); return; }
    }
    msg('Geçersiz giriş: "' + t + '". Örnek: 100,200  ·  @50,0  ·  @25<45' + (p.opts.kw ? '  ·  ' + p.opts.kw.join('/') : ''), 'err');
  }
}

// ---------- selection ----------
function setSel(ids, add) {
  if (!add) V().sel = new Set();
  for (const id of ids) { if (add === 'toggle' && V().sel.has(id)) V().sel.delete(id); else V().sel.add(id); }
  updateProps(); redraw();
}
async function getSelection(prompt = 'Nesneleri seçin') {
  if (V().sel.size) return [...V().sel];
  setPrompt(prompt + ' (bitirmek için Enter)');
  const r = await ask('select', prompt + ' (bitirmek için Enter)');
  return [...V().sel];
}

// ---------- doc ops ----------
function addItems(list, label) { S.doc.commit(list.map((n) => ({ o: null, n })), label); redraw(); }
function mkItem(t, props) { return { id: newId(), t, layer: S.curLayer, c: 256, lt: '', ...props }; }
function replaceItems(pairs, label) { S.doc.commit(pairs.map(([o, n]) => ({ o, n })), label); redraw(); }

// ---------- commands ----------
const CMD = {};
const ALIAS = {
  L: 'LINE', CIZGI: 'LINE', LINE: 'LINE', PL: 'PLINE', PLINE: 'PLINE', REC: 'RECT', RECTANG: 'RECT', DIK: 'RECT', C: 'CIRCLE', CIRCLE: 'CIRCLE', DAIRE: 'CIRCLE',
  A: 'ARC', ARC: 'ARC', YAY: 'ARC', T: 'TEXT', DT: 'TEXT', TEXT: 'TEXT', MT: 'TEXT', YAZI: 'TEXT', DLI: 'DIMLIN', DIM: 'DIMLIN', DAL: 'DIMALI', PO: 'POINT', POINT: 'POINT',
  M: 'MOVE', MOVE: 'MOVE', TASI: 'MOVE', CO: 'COPY', CP: 'COPY', COPY: 'COPY', KOPYALA: 'COPY', RO: 'ROTATE', ROTATE: 'ROTATE', DONDUR: 'ROTATE', SC: 'SCALE', SCALE: 'SCALE', OLCEKLE: 'SCALE',
  MI: 'MIRROR', MIRROR: 'MIRROR', AYNALA: 'MIRROR', O: 'OFFSET', OFFSET: 'OFFSET', OFSET: 'OFFSET', TR: 'TRIM', TRIM: 'TRIM', BUDA: 'TRIM', F: 'FILLET', FILLET: 'FILLET',
  E: 'ERASE', ERASE: 'ERASE', SIL: 'ERASE', X: 'EXPLODE', EXPLODE: 'EXPLODE', PATLAT: 'EXPLODE', DI: 'DIST', DIST: 'DIST', MESAFE: 'DIST', AA: 'AREA', AREA: 'AREA', ALAN: 'AREA',
  Z: 'ZOOM', ZOOM: 'ZOOM', U: 'UNDO', UNDO: 'UNDO', REDO: 'REDO', TH: 'TEXTH', LA: 'LAYER', ID: 'IDPT', LI: 'LIST', LIST: 'LIST',
};
async function runCommand(name) {
  const key = ALIAS[name.toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/Ö/g, 'O').replace(/Ü/g, 'U').replace(/Ğ/g, 'G').replace(/^[_.\-]/, '')];
  if (!key) { msg('Bilinmeyen komut: ' + name + '  (Yardım için ? yazın)', 'err'); return; }
  if (S.cmd) cancelCmd();
  if (!S.doc) return;
  S.cmd = key; S.lastCmd = key; msg('Komut: ' + LABEL[key]);
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.cmd === key));
  const kb = S.sonBtn && Date.now() - S.sonBtn.t < 600 ? S.sonBtn.el : null; if (kb && kb.classList.contains('gb')) kb.classList.add('on');   // komutu başlatan panel düğmesi komut bitene kadar aktif renkte
  try { await CMD[key](); }
  catch (e) { if (e !== CANCEL) { console.error(e); msg('Hata: ' + (e.message || e), 'err'); } else msg('*İptal*'); }
  finally { S.cmd = null; S.pending = null; S.ghost = null; S.snap = null; S.track = []; S.trk = null; setPrompt('Komut:'); document.querySelectorAll('.tool, .gb').forEach((b) => b.classList.remove('on')); redraw(); }
}
function cancelCmd() { if (S.pending) { const p = S.pending; S.pending = null; p.rej(CANCEL); } }
const LABEL = { LINE: 'ÇİZGİ', PLINE: 'POLYLINE', RECT: 'DİKDÖRTGEN', CIRCLE: 'DAİRE', ARC: 'YAY', TEXT: 'YAZI', DIMLIN: 'DOĞRUSAL ÖLÇÜ', DIMALI: 'HİZALI ÖLÇÜ', POINT: 'NOKTA', MOVE: 'TAŞI', COPY: 'KOPYALA', ROTATE: 'DÖNDÜR', SCALE: 'ÖLÇEKLE', MIRROR: 'AYNALA', OFFSET: 'OFSET', TRIM: 'BUDA', FILLET: 'KÖŞE', ERASE: 'SİL', EXPLODE: 'PATLAT', DIST: 'MESAFE', AREA: 'ALAN', ZOOM: 'ZOOM', UNDO: 'GERİ AL', REDO: 'İLERİ AL', TEXTH: 'YAZI YÜKSEKLİĞİ', LAYER: 'KATMAN', IDPT: 'KOORDİNAT', LIST: 'LİSTE' };

CMD.LINE = async () => {
  let p = await getPoint('İlk nokta:'); if (!Array.isArray(p)) return; const start = p; const made = [];
  for (;;) {
    const r = await getPoint(made.length >= 2 ? 'Sonraki nokta [Kapat(K)/Geri al(G)]:' : 'Sonraki nokta [Geri al(G)]:', { base: p, kw: ['K', 'G'], preview: (m) => [{ pts: [p, m] }] });
    if (r === null) break;
    if (r.kw === 'G') { const last = made.pop(); if (last) { S.doc.doUndo(); p = [last.x1, last.y1]; redraw(); } continue; }
    if (r.kw === 'K') { if (made.length >= 2) addItems([mkItem('line', { x1: p[0], y1: p[1], x2: start[0], y2: start[1] })], 'çizgi'); break; }
    const it = mkItem('line', { x1: p[0], y1: p[1], x2: r[0], y2: r[1] }); addItems([it], 'çizgi'); made.push(it); p = r;
  }
};
CMD.PLINE = async () => {
  const p0 = await getPoint('Başlangıç noktası:'); if (!Array.isArray(p0)) return; const pts = [p0];
  for (;;) {
    const r = await getPoint('Sonraki nokta [Kapat(K)/Geri al(G)]:', { base: pts[pts.length - 1], kw: ['K', 'G'], preview: (m) => [{ pts: [...pts, m] }] });
    if (r === null) break;
    if (r.kw === 'G') { if (pts.length > 1) pts.pop(); continue; }
    if (r.kw === 'K') { if (pts.length >= 2) { addItems([mkItem('pline', { pts: pts.map((q) => [q[0], q[1], 0]), cl: true })], 'polyline'); } return; }
    pts.push(r);
  }
  if (pts.length >= 2) addItems([mkItem('pline', { pts: pts.map((q) => [q[0], q[1], 0]), cl: false })], 'polyline');
};
CMD.RECT = async () => {
  const a = await getPoint('İlk köşe:'); if (!Array.isArray(a)) return;
  const rp = (b) => [a, [b[0], a[1]], b, [a[0], b[1]]];
  const b = await getPoint('Karşı köşe (veya @genişlik,yükseklik):', { base: a, preview: (m) => [{ pts: rp(m), cl: true }] }); if (!Array.isArray(b)) return;
  addItems([mkItem('pline', { pts: rp(b).map((q) => [q[0], q[1], 0]), cl: true })], 'dikdörtgen');
};
CMD.CIRCLE = async () => {
  const c = await getPoint('Merkez noktası:'); if (!Array.isArray(c)) return;
  const r = await getNumber('Yarıçap:', { base: c, preview: (m) => [{ pts: [c, m], dash: true }, { item: { id: -1, t: 'circle', cx: c[0], cy: c[1], r: Math.hypot(m[0] - c[0], m[1] - c[1]) || 1e-9, layer: S.curLayer, c: 256 } }] });
  if (typeof r !== 'number' || r <= 0) return;
  addItems([mkItem('circle', { cx: c[0], cy: c[1], r })], 'daire');
};
function circ3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(d) < 1e-12) return null;
  const s = (p) => p[0] * p[0] + p[1] * p[1];
  const x = (s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, y = (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d;
  return { x, y, r: Math.hypot(a[0] - x, a[1] - y) };
}
function arc3(a, b, c) {
  const k = circ3(a, b, c); if (!k) return null;
  const A = Math.atan2(a[1] - k.y, a[0] - k.x), B = Math.atan2(b[1] - k.y, b[0] - k.x), C = Math.atan2(c[1] - k.y, c[0] - k.x);
  const ccw = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 0;
  return ccw ? { cx: k.x, cy: k.y, r: k.r, a0: A, a1: C } : { cx: k.x, cy: k.y, r: k.r, a0: C, a1: A };
}
CMD.ARC = async () => {
  const a = await getPoint('Yayın başlangıç noktası:'); if (!Array.isArray(a)) return;
  const b = await getPoint('Yay üzerinde ikinci nokta:', { base: a, preview: (m) => [{ pts: [a, m] }] }); if (!Array.isArray(b)) return;
  const c = await getPoint('Bitiş noktası:', { base: b, preview: (m) => { const g = arc3(a, b, m); return g ? [{ item: { id: -1, t: 'arc', ...g, layer: S.curLayer, c: 256 } }] : [{ pts: [a, b, m] }]; } }); if (!Array.isArray(c)) return;
  const g = arc3(a, b, c); if (!g) { msg('Üç nokta aynı doğru üzerinde; yay çizilemez.', 'err'); return; }
  addItems([mkItem('arc', g)], 'yay');
};
CMD.TEXT = async () => {
  const p = await getPoint('Yazının başlangıç noktası:'); if (!Array.isArray(p)) return;
  const h = await getNumber('Yazı yüksekliği <' + S.textH + '>:', { base: p, preview: (m) => [{ pts: [p, m], dash: true }] }); if (typeof h === 'number' && h > 0) S.textH = h;
  const a = await getNumber('Döndürme açısı <0>:', { base: p, angle: true, preview: (m) => [{ pts: [p, m], dash: true }] });
  const rot = typeof a === 'number' ? a * Math.PI / 180 : 0;
  for (let line = 0; ; line++) {
    const s = await getText('Yazıyı girin (boş satır = bitir):'); if (!s) return;
    const off = line * S.textH * 1.667;
    addItems([mkItem('text', { x: p[0] + Math.sin(rot) * off, y: p[1] - Math.cos(rot) * off, h: S.textH, rot, s, ha: 0, va: 0 })], 'yazı');
  }
};
async function dimCmd(aligned) {
  const a = await getPoint('Birinci uzatma çizgisi başlangıcı:'); if (!Array.isArray(a)) return;
  const b = await getPoint('İkinci uzatma çizgisi başlangıcı:', { base: a, preview: (m) => [{ pts: [a, m], dash: true }] }); if (!Array.isArray(b)) return;
  const mk = (m) => {
    let ang;
    if (aligned) ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    else { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; ang = Math.abs(m[1] - my) * 1.0 >= Math.abs(m[0] - mx) ? 0 : Math.PI / 2; if (Math.abs(b[1] - a[1]) < 1e-9 && !aligned) ang = 0; }
    return { id: -1, t: 'dim', x1: a[0], y1: a[1], x2: b[0], y2: b[1], lx: m[0], ly: m[1], ang, h: S.textH, layer: S.curLayer, c: 256 };
  };
  const m = await getPoint('Ölçü çizgisinin konumu:', { base: b, preview: (m) => [{ item: mk(m) }] }); if (!Array.isArray(m)) return;
  const it = mk(m); delete it.id; addItems([mkItem('dim', it)], 'ölçü');
  msg('Ölçü = ' + fmtNum(dimGeom(it).val, 3));
}
CMD.DIMLIN = () => dimCmd(false);
CMD.DIMALI = () => dimCmd(true);
CMD.POINT = async () => { for (;;) { const p = await getPoint('Nokta konumu (bitirmek için Enter):'); if (!Array.isArray(p)) return; addItems([mkItem('point', { x: p[0], y: p[1] })], 'nokta'); } };

function editableIds(ids) {
  return ids.filter((id) => { const it = S.doc.items.get(id); const L = it && S.doc.layers.get(it.layer); if (L && L.lk) return false; return !!it; });
}
// Döndürme yardımcıları: tıklanan noktaya en yakın kenar (çizgi, polyline, arazi sınırı) ve seçimin ana doğrultusu
function kenarlarHepsi(haric) {
  const H = new Set(haric || []), out = [];
  const ek = (a, b) => { if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-6) out.push([a, b]); };
  for (const it of S.doc.items.values()) {
    if (H.has(it.id)) continue; const L = S.doc.layers.get(it.layer); if (L && L.on === false) continue;
    if (it.t === 'line') ek([it.x1, it.y1], [it.x2, it.y2]);
    else if (it.t === 'pline' && it.pts) { for (let i = 0; i + 1 < it.pts.length; i++) ek(it.pts[i], it.pts[i + 1]); if (it.cl && it.pts.length > 2) ek(it.pts[it.pts.length - 1], it.pts[0]); }
  }
  if (typeof G !== 'undefined' && G.bound) G.bound.forEach((p, i) => ek(p, G.bound[(i + 1) % G.bound.length]));
  return out;
}
function enYakinKenar(p, haric) {
  let best = null;
  for (const [a, b] of kenarlarHepsi(haric)) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); if (!best || d < best.d) best = { d, a, b, ang: Math.atan2(dy, dx) };
  }
  return best;
}
async function kenarSec(prompt, haric) {
  const p = await getPoint(prompt, { preview: (m) => { const k = enYakinKenar(m, haric); return k ? [{ pts: [k.a, k.b], dash: true }] : []; } });
  if (!Array.isArray(p)) return null; const k = enYakinKenar(p, haric); if (!k) { msg('Yakında kenar yok.', 'err'); return null; } return k;
}
function aciYakin(d) { while (d > Math.PI / 2) d -= Math.PI; while (d <= -Math.PI / 2) d += Math.PI; return d; }   // en küçük döndürme (±90°)
function yonSecim(ids) {
  const its = ids.map((id) => S.doc.items.get(id)).filter(Boolean);
  const ins = its.find((it) => it.t === 'insert'); if (ins && its.length === 1) return Math.atan2(ins.M[4], ins.M[0]);
  let best = null;
  for (const it of its) { const P = it.t === 'line' ? [[it.x1, it.y1], [it.x2, it.y2]] : it.t === 'pline' ? it.pts : null; if (!P) continue; for (let i = 0; i + 1 < P.length; i++) { const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); if (!best || L > best.L) best = { L, a: Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]) }; } }
  if (best) return best.a; if (ins) return Math.atan2(ins.M[4], ins.M[0]); return 0;
}
async function xformCmd(kind) {
  let ids = editableIds(await getSelection());
  if (!ids.length) { msg('Seçili nesne yok.'); return; }
  setSel(ids);
  const base = await getPoint(kind === 'mirror' ? 'Ayna çizgisinin ilk noktası:' : 'Temel nokta:'); if (!Array.isArray(base)) return;
  S.ghostIds = ids;
  const apply = (T, keep) => {
    const pairs = []; const news = [];
    for (const id of ids) { const it = S.doc.items.get(id); if (!it) continue; const n = xfItem(it, T); if (keep) { n.id = newId(); pairs.push([null, n]); news.push(n.id); } else pairs.push([it, n]); }
    replaceItems(pairs, kind); return news;
  };
  if (kind === 'move' || kind === 'copy') {
    S.ghost = (m) => mT(m[0] - base[0], m[1] - base[1]);
    for (;;) {
      const p = await getPoint(kind === 'copy' ? 'İkinci nokta (bitirmek için Enter):' : 'İkinci nokta:', { base, preview: (m) => [{ pts: [base, m], dash: true }] });
      if (!Array.isArray(p)) break;
      apply(mT(p[0] - base[0], p[1] - base[1]), kind === 'copy');
      if (kind === 'move') break;
    }
  } else if (kind === 'rotate') {
    const T = (a) => mMul(mT(base[0], base[1]), mMul(mRz(a), mT(-base[0], -base[1])));
    S.ghost = (m) => T(Math.atan2(m[1] - base[1], m[0] - base[0]));
    const a = await getNumber('Döndürme açısı (derece ya da tıklayın) [Kenara paralel(K)/Referans(R)]:', { base, angle: true, kw: ['K', 'R'], preview: (m) => [{ pts: [base, m], dash: true }] });
    if (a && a.kw === 'K') {
      S.ghost = null; const cur = yonSecim(ids);
      const k = await kenarSec('Paralel olacağı kenar / çizgi (tıklayın):', ids); if (!k) return;
      apply(T(aciYakin(k.ang - cur))); msg('Kenara paralel döndürüldü (' + fmtNum(k.ang * 180 / Math.PI, 2) + '°). Ters yön için RO → 180.', 'res');
    } else if (a && a.kw === 'R') {
      S.ghost = null;
      const r1 = await getPoint('Referans doğrultusu 1. nokta:'); if (!Array.isArray(r1)) return;
      const r2 = await getPoint('Referans doğrultusu 2. nokta:', { base: r1, preview: (m) => [{ pts: [r1, m], dash: true }] }); if (!Array.isArray(r2)) return;
      const ref = Math.atan2(r2[1] - r1[1], r2[0] - r1[0]);
      S.ghost = (m) => T(Math.atan2(m[1] - base[1], m[0] - base[0]) - ref);
      const y = await getNumber('Yeni açı (derece ya da tıklayın) [Kenar(K)]:', { base, angle: true, kw: ['K'], preview: (m) => [{ pts: [base, m], dash: true }] });
      let yeni; if (y && y.kw === 'K') { S.ghost = null; const k = await kenarSec('Hizalanacak kenar / çizgi (tıklayın):', ids); if (!k) return; yeni = ref + aciYakin(k.ang - ref); } else if (typeof y === 'number') yeni = y * Math.PI / 180; else return;
      apply(T(yeni - ref));
    } else if (typeof a === 'number') apply(T(a * Math.PI / 180));
    else { S.ghost = null; return; }
  } else if (kind === 'scale') {
    const T = (f) => mMul(mT(base[0], base[1]), mMul(mS(f, f, 1), mT(-base[0], -base[1])));
    S.ghost = (m) => { const f = Math.hypot(m[0] - base[0], m[1] - base[1]); return f > 1e-9 ? T(f) : null; };
    const f = await getNumber('Ölçek faktörü:', { base, preview: (m) => [{ pts: [base, m], dash: true }] }); if (typeof f !== 'number' || f <= 0) return;
    apply(T(f));
  } else if (kind === 'mirror') {
    const T = (m) => { const dx = m[0] - base[0], dy = m[1] - base[1], L = Math.hypot(dx, dy); if (L < 1e-12) return null; const ux = dx / L, uy = dy / L; const R = [ux * ux - uy * uy, 2 * ux * uy, 0, 0, 2 * ux * uy, uy * uy - ux * ux, 0, 0, 0, 0, 1, 0]; return mMul(mT(base[0], base[1]), mMul(R, mT(-base[0], -base[1]))); };
    S.ghost = T;
    const p = await getPoint('Ayna çizgisinin ikinci noktası:', { base, preview: (m) => [{ pts: [base, m], dash: true }] }); if (!Array.isArray(p)) return;
    const M = T(p); if (!M) return; S.ghost = null;
    const k = await getPoint('Kaynak nesneler silinsin mi? [Evet(E)/Hayır(H)] <H>:', { kw: ['E', 'H'] });
    const del = k && k.kw === 'E';
    if (del) apply(M); else apply(M, true);
  }
  S.ghost = null;
  if (kind !== 'scale' && typeof tsBinaMasaTemizle === 'function') { const b = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && (it.ges.tip === 'tm' || it.ges.tip === 'dm') && (ids.includes(it.id) || kind === 'copy')); if (b.length) tsBinaMasaTemizle(b); }
}
CMD.MOVE = () => xformCmd('move');
CMD.COPY = () => xformCmd('copy');
CMD.ROTATE = () => xformCmd('rotate');
CMD.SCALE = () => xformCmd('scale');
CMD.MIRROR = () => xformCmd('mirror');
CMD.ERASE = async () => {
  const ids = editableIds(await getSelection('Silinecek nesneleri seçin')); if (!ids.length) return;
  const set = new Set(ids); for (const it of S.doc.items.values()) if (it.gesEt && set.has(it.gesEt)) set.add(it.id);   // kablo silinince adı/etiketi de silinir
  replaceItems([...set].map((id) => [S.doc.items.get(id), null]), 'sil'); V().sel.clear(); updateProps(); msg(ids.length + ' nesne silindi' + (set.size > ids.length ? ' (+' + (set.size - ids.length) + ' kablo etiketi)' : '') + '.');
};
function primsToNative(prims, M, it) {
  const out = [];
  for (const p of prims) {
    const c = p.c === 0 ? it.c : p.c, layer = p.l === '0' ? it.layer : p.l;
    if (p.k === 0) {
      const a = M ? xfArr(p.p, M) : p.p; const n = a.length / 3; if (n < 2) continue;
      if (n === 2) out.push({ id: newId(), t: 'line', layer, c, lt: p.lt || '', x1: a[0], y1: a[1], x2: a[3], y2: a[4] });
      else { const pts = []; for (let i = 0; i < a.length; i += 3) pts.push([a[i], a[i + 1], 0]); let cl = !!p.cl; if (!cl && n > 2 && Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]) < 1e-9) { pts.pop(); cl = true; } out.push({ id: newId(), t: 'pline', layer, c, lt: p.lt || '', pts, cl }); }
    } else if (p.k === 1) {
      let P = p.p, u = p.u, v = p.v; if (M) { P = mApply(M, ...p.p); const lin = (w) => [M[0] * w[0] + M[1] * w[1] + M[2] * w[2], M[4] * w[0] + M[5] * w[1] + M[6] * w[2], 0]; u = lin(p.u); v = lin(p.v); }
      const kv = Math.hypot(v[0], v[1]) || 1;
      out.push({ id: newId(), t: 'text', layer, c, lt: '', x: P[0], y: P[1], h: p.h * kv, rot: Math.atan2(u[1], u[0]), s: p.lines.join('\n'), ha: p.ha, va: p.va, mt: !!p.mt, ls: p.ls, xs: Math.hypot(u[0], u[1]) / kv });
    } else if (p.k === 3) { const q = M ? mApply(M, ...p.p) : p.p; out.push({ id: newId(), t: 'point', layer, c, lt: '', x: q[0], y: q[1] }); }
    else if (p.k === 2) out.push({ id: newId(), t: 'geo', layer, c, lt: '', prims: [{ ...p, c, l: layer }], M: M || M_ID });
  }
  return out;
}
CMD.EXPLODE = async () => {
  const ids = editableIds(await getSelection('Patlatılacak nesneleri seçin')); const pairs = []; let n = 0;
  for (const id of ids) {
    const it = S.doc.items.get(id); let parts = null;
    if (it.t === 'insert') { const b = S.doc.blocks.get(it.block); parts = primsToNative(blockPrims(S.doc.ctx, b), it.M, it); if (it.ap) parts.push(...primsToNative(it.ap, it.AM, it)); }
    else if (it.t === 'geo') parts = primsToNative(it.prims, it.M, it);
    else if (it.t === 'pline') { parts = []; const v = it.pts; for (let i = 0; i < v.length - (it.cl ? 0 : 1); i++) { const w = v[(i + 1) % v.length]; if (Math.abs(v[i][2]) < 1e-9) parts.push({ id: newId(), t: 'line', layer: it.layer, c: it.c, lt: it.lt, x1: v[i][0], y1: v[i][1], x2: w[0], y2: w[1] }); else { const c = bulgeCenter(v[i][0], v[i][1], w[0], w[1], v[i][2]); let A = Math.atan2(v[i][1] - c.cy, v[i][0] - c.cx), B = Math.atan2(w[1] - c.cy, w[0] - c.cx); if (v[i][2] < 0) [A, B] = [B, A]; parts.push({ id: newId(), t: 'arc', layer: it.layer, c: it.c, lt: it.lt, cx: c.cx, cy: c.cy, r: c.r, a0: A, a1: B }); } } }
    else if (it.t === 'dim') parts = primsToNative(nativePrims(it), null, it);
    if (!parts) continue; if (parts.length > 200000) { msg('Nesne çok büyük; patlatılmadı.', 'err'); continue; }
    pairs.push([it, null]); for (const p of parts) pairs.push([null, p]); n++;
  }
  if (pairs.length) { replaceItems(pairs, 'patlat'); V().sel.clear(); updateProps(); }
  msg(n + ' nesne patlatıldı.');
};
CMD.DIST = async () => {
  const a = await getPoint('İlk nokta:'); if (!Array.isArray(a)) return;
  const b = await getPoint('İkinci nokta:', { base: a, preview: (m) => [{ pts: [a, m] }] }); if (!Array.isArray(b)) return;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  msg('Mesafe = ' + fmtNum(Math.hypot(dx, dy), 3) + '   ΔX = ' + fmtNum(dx, 3) + '   ΔY = ' + fmtNum(dy, 3) + '   Açı = ' + fmtNum(Math.atan2(dy, dx) * 180 / Math.PI, 2) + '°', 'res');
};
function plArea(pts) { let a = 0, per = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; per += Math.hypot(q[0] - p[0], q[1] - p[1]); } return { a: Math.abs(a) / 2, per }; }
CMD.AREA = async () => {
  const first = await getPoint('İlk köşe noktası [Nesne(N)]:', { kw: ['N'] }); if (first === null) return;
  if (first.kw === 'N') {
    const r = await getPoint('Kapalı polyline veya daire seçin:', {}); if (!Array.isArray(r)) return;
    const q = V().w2s(r[0], r[1]); const it = pickItem(q[0], q[1]); if (!it) { msg('Nesne bulunamadı.'); return; }
    if (it.t === 'circle') { msg('Alan = ' + fmtNum(Math.PI * it.r * it.r, 3) + '   Çevre = ' + fmtNum(TAU * it.r, 3), 'res'); return; }
    if (it.t === 'pline') { const a = []; const v = it.pts; a.push(v[0][0], v[0][1]); for (let i = 1; i < v.length; i++) bulgeArcPts(v[i - 1][0], v[i - 1][1], v[i][0], v[i][1], v[i - 1][2], a); if (it.cl) bulgeArcPts(v[v.length - 1][0], v[v.length - 1][1], v[0][0], v[0][1], v[v.length - 1][2], a); const pts = []; for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]); if (it.cl) pts.pop(); const r2 = plArea(pts); msg('Alan = ' + fmtNum(r2.a, 3) + '   Çevre = ' + fmtNum(it.cl ? r2.per : r2.per - Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]), 3), 'res'); return; }
    msg('Bu nesnenin alanı hesaplanamıyor (polyline veya daire seçin).', 'err'); return;
  }
  if (!Array.isArray(first)) return; const pts = [first];
  for (;;) { const r = await getPoint('Sonraki köşe (bitirmek için Enter):', { base: pts[pts.length - 1], preview: (m) => [{ pts: [...pts, m], cl: true }] }); if (!Array.isArray(r)) break; pts.push(r); }
  if (pts.length < 3) return; const r = plArea(pts);
  msg('Alan = ' + fmtNum(r.a, 3) + '   Çevre = ' + fmtNum(r.per, 3) + (r.a > 10000 ? '   (' + fmtNum(r.a / 10000, 4) + ' ha · ' + fmtNum(r.a / 1000, 3) + ' dönüm)' : ''), 'res');
};
CMD.ZOOM = async () => {
  const r = await getPoint('Zoom [Kapsam(K)/Tümü(T)/Pencere(P)] <K>:', { kw: ['K', 'T', 'P'] });
  if (r === null || r.kw === 'K') { zoomExtents(false); return; }
  if (r.kw === 'T') { zoomExtents(true); return; }
  let a = Array.isArray(r) ? r : await getPoint('Pencerenin ilk köşesi:'); if (!Array.isArray(a)) return;
  const b = await getPoint('Karşı köşe:', { base: a, preview: (m) => [{ pts: [a, [m[0], a[1]], m, [a[0], m[1]]], cl: true }] }); if (!Array.isArray(b)) return;
  zoomTo([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], 1);
};
CMD.UNDO = async () => { const l = S.doc.doUndo(); msg(l ? 'Geri alındı: ' + l : 'Geri alınacak işlem yok.'); V().sel.clear(); updateProps(); redraw(); };
CMD.REDO = async () => { const l = S.doc.doRedo(); msg(l ? 'Yinelendi: ' + l : 'Yinelenecek işlem yok.'); redraw(); };
CMD.TEXTH = async () => { const h = await getNumber('Varsayılan yazı/ölçü yüksekliği <' + S.textH + '>:', {}); if (typeof h === 'number' && h > 0) { S.textH = h; msg('Yazı yüksekliği = ' + h); } };
CMD.LAYER = async () => { document.querySelector('#side').classList.add('open'); $('#layerq').focus(); };
CMD.IDPT = async () => { const p = await getPoint('Nokta seçin:'); if (Array.isArray(p)) msg('X = ' + fmtNum(p[0], 4) + '   Y = ' + fmtNum(p[1], 4), 'res'); };
CMD.LIST = async () => {
  const ids = await getSelection();
  for (const id of ids.slice(0, 20)) { const it = S.doc.items.get(id); const name = { line: 'Çizgi', pline: 'Polyline', circle: 'Daire', arc: 'Yay', text: 'Yazı', dim: 'Ölçü', point: 'Nokta', insert: 'Blok: ' + it.block, geo: (it.src || 'Nesne') }[it.t]; let ex = '';
    if (it.t === 'line') ex = '  uzunluk ' + fmtNum(Math.hypot(it.x2 - it.x1, it.y2 - it.y1), 3);
    if (it.t === 'circle') ex = '  r ' + fmtNum(it.r, 3);
    msg(name + '  · katman ' + it.layer + ex, 'res'); }
};

// OFFSET
function offsetItem(it, d, side) {
  const sgnLine = (ax, ay, bx, by) => Math.sign((bx - ax) * (side[1] - ay) - (by - ay) * (side[0] - ax)) || 1;
  if (it.t === 'line') { const dx = it.x2 - it.x1, dy = it.y2 - it.y1, L = Math.hypot(dx, dy); const s = sgnLine(it.x1, it.y1, it.x2, it.y2); const nx = -dy / L * d * s, ny = dx / L * d * s; return { ...it, id: newId(), x1: it.x1 + nx, y1: it.y1 + ny, x2: it.x2 + nx, y2: it.y2 + ny }; }
  if (it.t === 'circle' || it.t === 'arc') { const inside = Math.hypot(side[0] - it.cx, side[1] - it.cy) < it.r; const r = it.r + (inside ? -d : d); if (r <= 0) return null; return { ...it, id: newId(), r }; }
  if (it.t === 'pline') {
    const v = it.pts, n = v.length, cl = it.cl;
    // side via nearest segment
    let bi = 0, bd = Infinity; for (let i = 0; i < n - (cl ? 0 : 1); i++) { const w = v[(i + 1) % n]; const r = distSeg(side[0], side[1], v[i][0], v[i][1], w[0], w[1]); if (r.d < bd) { bd = r.d; bi = i; } }
    const w0 = v[(bi + 1) % n]; const s = sgnLine(v[bi][0], v[bi][1], w0[0], w0[1]);
    const segN = (i) => { const a = v[i], b = v[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L * d * s, dx / L * d * s]; };
    const out = [];
    for (let i = 0; i < n; i++) {
      const hasPrev = cl || i > 0, hasNext = cl || i < n - 1;
      const pN = hasPrev ? segN((i - 1 + n) % n) : null, nN = hasNext ? segN(i) : null;
      let q;
      if (pN && nN) {
        const a = v[(i - 1 + n) % n], b = v[i], c = v[(i + 1) % n];
        const r = segInt(a[0] + pN[0], a[1] + pN[1], b[0] + pN[0], b[1] + pN[1], b[0] + nN[0], b[1] + nN[1], c[0] + nN[0], c[1] + nN[1], true);
        q = r ? [r.x, r.y] : [b[0] + nN[0], b[1] + nN[1]];
      } else { const N = pN || nN; q = [v[i][0] + N[0], v[i][1] + N[1]]; }
      out.push([q[0], q[1], v[i][2]]);
    }
    return { ...it, id: newId(), pts: out };
  }
  return null;
}
CMD.OFFSET = async () => {
  const d = await getNumber('Ofset mesafesi <' + S.offD + '>:', {}); if (typeof d === 'number' && d > 0) S.offD = d;
  for (;;) {
    const p = await getPoint('Ofsetlenecek nesneyi seçin (bitirmek için Enter):', {}); if (!Array.isArray(p)) return;
    const q = V().w2s(p[0], p[1]); const it = pickItem(q[0], q[1]);
    if (!it || !['line', 'circle', 'arc', 'pline'].includes(it.t)) { msg('Çizgi, polyline, daire veya yay seçin.'); continue; }
    setSel([it.id]);
    const side = await getPoint('Hangi tarafa? (bir nokta gösterin):', { preview: (m) => { const o = offsetItem(it, S.offD, m); return o ? [{ item: { ...o, id: -1 } }] : []; } });
    setSel([]);
    if (!Array.isArray(side)) return; const o = offsetItem(it, S.offD, side); if (o) addItems([o], 'ofset');
  }
};
// TRIM (quick)
function worldSegsAll(exceptId, bb) {
  const segs = []; const doc = S.doc;
  for (const it of doc.items.values()) {
    if (it.id === exceptId || !layerVisible(it)) continue; const b = itemBB(doc, it);
    if (b[2] < bb[0] || b[0] > bb[2] || b[3] < bb[1] || b[1] > bb[3]) continue;
    for (const d of drawables(doc, it)) forSegs(d, d.M.length ? [d.M[0], d.M[1], d.M[2], d.M[3], d.M[4], d.M[5], d.M[6], d.M[7]] : null, (x1, y1, x2, y2) => { if (Math.max(x1, x2) < bb[0] || Math.min(x1, x2) > bb[2] || Math.max(y1, y2) < bb[1] || Math.min(y1, y2) > bb[3]) return; segs.push([x1, y1, x2, y2]); });
  }
  return segs;
}
function trimItem(it, p) {
  const bb = itemBB(S.doc, it); const segs = worldSegsAll(it.id, bb);
  if (it.t === 'line') {
    const ts = [0, 1]; for (const s of segs) { const r = segInt(it.x1, it.y1, it.x2, it.y2, s[0], s[1], s[2], s[3]); if (r && r.t > 1e-9 && r.t < 1 - 1e-9) ts.push(r.t); }
    ts.sort((a, b) => a - b); const tp = distSeg(p[0], p[1], it.x1, it.y1, it.x2, it.y2).t;
    let k = 0; while (k < ts.length - 1 && ts[k + 1] < tp) k++; const t0 = ts[k], t1 = ts[k + 1];
    if (t0 === 0 && t1 === 1) return null;
    const P = (t) => [it.x1 + (it.x2 - it.x1) * t, it.y1 + (it.y2 - it.y1) * t]; const out = [];
    if (t0 > 0) { const a = P(0), b = P(t0); out.push({ ...it, id: newId(), x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); }
    if (t1 < 1) { const a = P(t1), b = P(1); out.push({ ...it, id: newId(), x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); }
    return out;
  }
  if (it.t === 'circle' || it.t === 'arc') {
    const angs = []; const full = it.t === 'circle'; const a0 = full ? 0 : it.a0; const sw = full ? TAU : (((it.a1 - it.a0) % TAU) + TAU) % TAU || TAU;
    const rel = (a) => ((a - a0) % TAU + TAU) % TAU;
    for (const s of segs) { const dx = s[2] - s[0], dy = s[3] - s[1]; const fx = s[0] - it.cx, fy = s[1] - it.cy; const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - it.r * it.r; const D = B * B - 4 * A * C; if (D < 0 || !A) continue; for (const sg of [-1, 1]) { const t = (-B + sg * Math.sqrt(D)) / (2 * A); if (t < -1e-9 || t > 1 + 1e-9) continue; const r = rel(Math.atan2(fy + dy * t, fx + dx * t)); if (r > 1e-9 && r < sw - 1e-9) angs.push(r); } }
    const ap = rel(Math.atan2(p[1] - it.cy, p[0] - it.cx));
    angs.sort((a, b) => a - b);
    if (full) { if (angs.length < 2) return null; let k = angs.findIndex((a) => a > ap); let s0, s1; if (k <= 0) { s0 = angs[angs.length - 1]; s1 = angs[0]; } else { s0 = angs[k - 1]; s1 = angs[k]; } return [{ ...it, id: newId(), t: 'arc', a0: a0 + s1, a1: a0 + s0 }]; }
    const ts = [0, ...angs, sw]; let k = 0; while (k < ts.length - 1 && ts[k + 1] < ap) k++; const t0 = ts[k], t1 = ts[k + 1];
    if (t0 === 0 && t1 === sw) return null; const out = [];
    if (t0 > 0) out.push({ ...it, id: newId(), a0: a0, a1: a0 + t0 }); if (t1 < sw) out.push({ ...it, id: newId(), a0: a0 + t1, a1: a0 + sw });
    return out;
  }
  if (it.t === 'pline') {
    const v = it.pts; if (v.some((q) => Math.abs(q[2]) > 1e-9)) { msg('Yay içeren polyline budanamıyor; önce patlatın (X).', 'err'); return null; }
    const P = v.map((q) => [q[0], q[1]]); if (it.cl) P.push(P[0]);
    const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const L = cum[cum.length - 1];
    const cuts = [];
    for (let i = 0; i < P.length - 1; i++) for (const s of segs) { const r = segInt(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], s[0], s[1], s[2], s[3]); if (r) { const d = cum[i] + r.t * (cum[i + 1] - cum[i]); if (d > 1e-9 && d < L - 1e-9) cuts.push(d); } }
    let pd = 0, bd = Infinity; for (let i = 0; i < P.length - 1; i++) { const r = distSeg(p[0], p[1], P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]); if (r.d < bd) { bd = r.d; pd = cum[i] + r.t * (cum[i + 1] - cum[i]); } }
    cuts.sort((a, b) => a - b);
    const at = (d) => { let i = 0; while (i < cum.length - 2 && cum[i + 1] < d) i++; const t = (d - cum[i]) / ((cum[i + 1] - cum[i]) || 1); return [P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t]; };
    const sub = (d0, d1) => { const o = [at(d0)]; for (let i = 0; i < cum.length; i++) if (cum[i] > d0 + 1e-9 && cum[i] < d1 - 1e-9) o.push(P[i]); o.push(at(d1)); return o; };
    const mk = (pts) => ({ ...it, id: newId(), cl: false, pts: pts.map((q) => [q[0], q[1], 0]) });
    if (it.cl) { if (cuts.length < 2) return null; let k = cuts.findIndex((c) => c > pd); let s0, s1; if (k <= 0) { s0 = cuts[cuts.length - 1]; s1 = cuts[0]; return [mk(sub(s1, s0))]; } s0 = cuts[k - 1]; s1 = cuts[k]; const a = sub(s1, L), b = sub(0, s0); return [mk(a.concat(b.slice(1)))]; }
    const ts = [0, ...cuts, L]; let k = 0; while (k < ts.length - 1 && ts[k + 1] < pd) k++; const t0 = ts[k], t1 = ts[k + 1];
    if (t0 === 0 && t1 === L) return null; const out = []; if (t0 > 0) out.push(mk(sub(0, t0))); if (t1 < L) out.push(mk(sub(t1, L))); return out;
  }
  return null;
}
CMD.TRIM = async () => {
  for (;;) {
    const p = await getPoint('Budanacak parçayı tıklayın (bitirmek için Enter):', {}); if (!Array.isArray(p)) return;
    const q = V().w2s(p[0], p[1]); const it = pickItem(q[0], q[1]);
    if (!it || !['line', 'circle', 'arc', 'pline'].includes(it.t)) { msg('Çizgi, polyline, daire veya yay tıklayın.'); continue; }
    const r = trimItem(it, p); if (r === null) { msg('Kesen nesne bulunamadı.'); continue; }
    replaceItems([[it, null], ...r.map((n) => [null, n])], 'buda');
  }
};
CMD.FILLET = async () => {
  for (;;) {
    const a = await getPoint('Birinci çizgiyi seçin [Yarıçap(Y)] <r=' + S.filR + '>:', { kw: ['Y'] }); if (a === null) return;
    if (a.kw === 'Y') { const r = await getNumber('Köşe yarıçapı <' + S.filR + '>:', {}); if (typeof r === 'number' && r >= 0) S.filR = r; continue; }
    const qa = V().w2s(a[0], a[1]); const A = pickItem(qa[0], qa[1]); if (!A || A.t !== 'line') { msg('Çizgi seçin.'); continue; }
    setSel([A.id]);
    const b = await getPoint('İkinci çizgiyi seçin:', {}); setSel([]); if (!Array.isArray(b)) return;
    const qb = V().w2s(b[0], b[1]); const B = pickItem(qb[0], qb[1]); if (!B || B.t !== 'line' || B.id === A.id) { msg('Başka bir çizgi seçin.'); continue; }
    const X = segInt(A.x1, A.y1, A.x2, A.y2, B.x1, B.y1, B.x2, B.y2, true); if (!X) { msg('Çizgiler paralel.', 'err'); continue; }
    const keep = (L, pick) => { const d1 = Math.hypot(L.x1 - X.x, L.y1 - X.y), d2 = Math.hypot(L.x2 - X.x, L.y2 - X.y); // keep the end on the picked side
      const t = distSeg(pick[0], pick[1], L.x1, L.y1, L.x2, L.y2).t; const tx = segInt(L.x1, L.y1, L.x2, L.y2, X.x, X.y, X.x + 1, X.y, true); const tX = Math.abs(L.x2 - L.x1) > Math.abs(L.y2 - L.y1) ? (X.x - L.x1) / (L.x2 - L.x1) : (X.y - L.y1) / (L.y2 - L.y1);
      return t < tX ? [L.x1, L.y1] : [L.x2, L.y2]; };
    const fa = keep(A, a), fb = keep(B, b); const r = S.filR;
    if (r <= 1e-12) { replaceItems([[A, { ...A, x1: fa[0], y1: fa[1], x2: X.x, y2: X.y }], [B, { ...B, x1: fb[0], y1: fb[1], x2: X.x, y2: X.y }]], 'köşe'); continue; }
    const ua = [fa[0] - X.x, fa[1] - X.y], ub = [fb[0] - X.x, fb[1] - X.y]; const la = Math.hypot(...ua), lb = Math.hypot(...ub); ua[0] /= la; ua[1] /= la; ub[0] /= lb; ub[1] /= lb;
    const th = Math.acos(Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1]))); const t = r / Math.tan(th / 2);
    if (t > la || t > lb) { msg('Yarıçap çok büyük.', 'err'); continue; }
    const pa = [X.x + ua[0] * t, X.y + ua[1] * t], pb = [X.x + ub[0] * t, X.y + ub[1] * t]; const bis = [ua[0] + ub[0], ua[1] + ub[1]]; const lbis = Math.hypot(...bis); const dc = r / Math.sin(th / 2);
    const c = [X.x + bis[0] / lbis * dc, X.y + bis[1] / lbis * dc]; let a0 = Math.atan2(pa[1] - c[1], pa[0] - c[0]), a1 = Math.atan2(pb[1] - c[1], pb[0] - c[0]);
    if ((((a1 - a0) % TAU) + TAU) % TAU > Math.PI) [a0, a1] = [a1, a0];
    replaceItems([[A, { ...A, x1: fa[0], y1: fa[1], x2: pa[0], y2: pa[1] }], [B, { ...B, x1: fb[0], y1: fb[1], x2: pb[0], y2: pb[1] }], [null, mkItem('arc', { cx: c[0], cy: c[1], r, a0, a1, layer: A.layer })]], 'köşe');
  }
};

// ---------- panels ----------
function layerCounts() { const m = new Map(); for (const it of S.doc.items.values()) m.set(it.layer, (m.get(it.layer) || 0) + 1); return m; }
function swatch(c) { return colorCss(c, true); }
function renderLayers() {
  const ul = $('#layers'); ul.innerHTML = ''; const counts = layerCounts(); const q = S.layerFilter.toLocaleLowerCase('tr');
  const arr = [...S.doc.layers.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  $('#lcount').textContent = arr.length;
  for (const L of arr) {
    if (q && !L.name.toLocaleLowerCase('tr').includes(q)) continue;
    const li = document.createElement('li'); li.className = 'lrow' + (L.name === S.curLayer ? ' cur' : '') + (L.on && !L.fz ? '' : ' off');
    const eye = document.createElement('button'); eye.className = 'eye'; eye.title = L.on && !L.fz ? 'Katmanı gizle' : 'Katmanı göster'; eye.setAttribute('aria-label', eye.title);
    eye.innerHTML = L.on && !L.fz ? '<svg viewBox="0 0 16 16"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg>' : '<svg viewBox="0 0 16 16"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" opacity=".45"/><path d="M2 14L14 2" stroke="currentColor"/></svg>';
    eye.onclick = (ev) => { ev.stopPropagation(); if (L.fz) { L.fz = false; L.on = true; } else L.on = !L.on; renderLayers(); redraw(); };
    const sw = document.createElement('button'); sw.className = 'sw'; sw.style.background = swatch(L.c); sw.title = 'Renk: ' + L.c; sw.setAttribute('aria-label', 'Katman rengi');
    sw.onclick = (ev) => { ev.stopPropagation(); openPalette(sw, (c) => { L.c = c; renderLayers(); redraw(); }); };
    const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = L.name; nm.title = L.name;
    const ct = document.createElement('span'); ct.className = 'lct'; ct.textContent = counts.get(L.name) || '';
    const lk = document.createElement('button'); lk.className = 'lk' + (L.lk ? ' on' : ''); lk.title = L.lk ? 'Kilidi aç' : 'Kilitle'; lk.setAttribute('aria-label', lk.title);
    lk.innerHTML = L.lk ? '<svg viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="7" rx="1" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor"/></svg>' : '<svg viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="7" rx="1" fill="none" stroke="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0" fill="none" stroke="currentColor"/></svg>';
    lk.onclick = (ev) => { ev.stopPropagation(); L.lk = !L.lk; renderLayers(); };
    li.append(eye, sw, nm, ct, lk);
    li.onclick = () => { S.curLayer = L.name; renderLayers(); updateStatus(); };
    li.ondblclick = () => { // isolate
      const iso = [...S.doc.layers.values()].every((x) => x === L || !x.on);
      for (const x of S.doc.layers.values()) x.on = iso ? true : x === L; renderLayers(); redraw();
    };
    ul.appendChild(li);
  }
}
let _palCb = null;
function openPalette(anchor, cb) {
  const p = $('#palette'); _palCb = cb; p.hidden = false; const r = anchor.getBoundingClientRect(); const pr = document.body.getBoundingClientRect();
  p.style.left = Math.max(8, Math.min(r.left, pr.width - 240)) + 'px'; p.style.top = Math.min(r.bottom + 4, window.innerHeight - 140) + 'px';
}
function buildPalette() {
  const p = $('#palette'); const cs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 40, 50, 90, 130, 150, 170, 200, 210, 230, 250, 252, 254, 31, 41, 51, 141, 161, 221, 241];
  for (const c of cs) { const b = document.createElement('button'); b.className = 'pc'; b.style.background = colorCss(c, true); b.title = 'Renk ' + c; b.setAttribute('aria-label', 'Renk ' + c); b.onclick = () => { p.hidden = true; if (_palCb) _palCb(c); }; p.appendChild(b); }
  document.addEventListener('pointerdown', (e) => { if (!p.hidden && !p.contains(e.target) && !e.target.classList.contains('sw') && e.target.id !== 'pcolor') p.hidden = true; });
}
function updateProps() {
  const box = $('#props'); const ids = [...V().sel].filter((id) => S.doc.items.has(id));
  if (!ids.length) { box.innerHTML = '<p class="muted">Nesne seçili değil. Seçmek için tıklayın veya pencere çizin (soldan sağa: tamamen içeride kalanlar, sağdan sola: değenler).</p>'; return; }
  const items = ids.map((id) => S.doc.items.get(id));
  const types = {}; for (const it of items) { const k = { line: 'Çizgi', pline: 'Polyline', circle: 'Daire', arc: 'Yay', text: 'Yazı', dim: 'Ölçü', point: 'Nokta', insert: 'Blok', geo: 'Diğer' }[it.t]; types[k] = (types[k] || 0) + 1; }
  const layers = [...new Set(items.map((i) => i.layer))];
  box.innerHTML = '';
  const h = document.createElement('div'); h.className = 'psum'; h.innerHTML = '<b>' + ids.length + '</b> nesne · ' + Object.entries(types).map(([k, v]) => v + ' ' + k.toLocaleLowerCase('tr')).join(', '); box.appendChild(h);
  const row = (label, el) => { const r = document.createElement('label'); r.className = 'prow'; const s = document.createElement('span'); s.textContent = label; r.append(s, el); box.appendChild(r); };
  const sel = document.createElement('select'); sel.id = 'player';
  for (const L of [...S.doc.layers.keys()].sort((a, b) => a.localeCompare(b, 'tr'))) { const o = document.createElement('option'); o.value = L; o.textContent = L; sel.appendChild(o); }
  if (layers.length === 1) sel.value = layers[0]; else { const o = document.createElement('option'); o.value = ''; o.textContent = '(karışık)'; o.selected = true; sel.prepend(o); }
  sel.onchange = () => { if (!sel.value) return; replaceItems(items.map((it) => [it, { ...it, layer: sel.value }]), 'katman değiştir'); V().sel = new Set(ids); updateProps(); };
  row('Katman', sel);
  const cb = document.createElement('button'); cb.id = 'pcolor'; cb.className = 'pcolor'; const c0 = items.every((i) => i.c === items[0].c) ? items[0].c : null;
  cb.innerHTML = '<i style="background:' + (c0 === 256 || c0 === null ? 'transparent' : colorCss(c0, true)) + '"></i>' + (c0 === 256 ? 'ByLayer' : c0 === 0 ? 'ByBlock' : c0 === null ? '(karışık)' : 'Renk ' + (c0 < 0 ? 'RGB' : c0));
  cb.onclick = () => openPalette(cb, (c) => { const cur = ids.map((id) => S.doc.items.get(id)).filter(Boolean); replaceItems(cur.map((it) => [it, { ...it, c }]), 'renk'); V().sel = new Set(ids); updateProps(); });
  const bl = document.createElement('button'); bl.className = 'mini'; bl.textContent = 'ByLayer'; bl.title = 'Rengi katmandan al'; bl.onclick = () => { const cur = ids.map((id) => S.doc.items.get(id)).filter(Boolean); replaceItems(cur.map((it) => [it, { ...it, c: 256 }]), 'renk'); V().sel = new Set(ids); updateProps(); };
  const wrap = document.createElement('div'); wrap.className = 'pcw'; wrap.append(cb); if (c0 !== 256) wrap.append(bl); row('Renk', wrap);
  if (items.length === 1) {
    const it = items[0]; const info = document.createElement('div'); info.className = 'pinfo';
    const kv = []; const f = (v) => fmtNum(v, 3);
    if (it.t === 'line') kv.push(['Uzunluk', f(Math.hypot(it.x2 - it.x1, it.y2 - it.y1))], ['Açı', fmtNum(Math.atan2(it.y2 - it.y1, it.x2 - it.x1) * 180 / Math.PI, 2) + '°']);
    if (it.t === 'circle') kv.push(['Yarıçap', f(it.r)], ['Alan', f(Math.PI * it.r * it.r)]);
    if (it.t === 'arc') kv.push(['Yarıçap', f(it.r)]);
    if (it.t === 'pline') { kv.push(['Köşe', it.pts.length], ['Kapalı', it.cl ? 'Evet' : 'Hayır']); if (it.cl && it.pts.every((p) => !p[2])) kv.push(['Alan', f(plArea(it.pts).a)]); }
    if (it.t === 'insert') kv.push(['Blok', it.block.length > 28 ? it.block.slice(0, 26) + '…' : it.block]);
    if (it.t === 'dim') kv.push(['Değer', f(dimGeom(it).val)]);
    for (const [k, v] of kv) { const d = document.createElement('div'); d.innerHTML = '<span></span><b></b>'; d.firstChild.textContent = k; d.lastChild.textContent = v; info.appendChild(d); }
    if (kv.length) box.appendChild(info);
    if (it.t === 'text') {
      const ta = document.createElement('textarea'); ta.id = 'ptext'; ta.rows = 2; ta.value = it.s; ta.onchange = () => { const cur = S.doc.items.get(it.id); replaceItems([[cur, { ...cur, s: ta.value }]], 'yazı'); V().sel = new Set([it.id]); };
      row('Yazı', ta);
      const hi = document.createElement('input'); hi.id = 'ptexth'; hi.type = 'number'; hi.step = 'any'; hi.value = +it.h.toFixed(4); hi.onchange = () => { const v = parseFloat(hi.value); if (v > 0) { const cur = S.doc.items.get(it.id); replaceItems([[cur, { ...cur, h: v }]], 'yazı'); V().sel = new Set([it.id]); } };
      row('Yükseklik', hi);
    }
  }
  if (typeof tsOzellik === 'function') tsOzellik(box, items);
}
function updateStatus() {
  const w = S.mw; $('#coords').textContent = 'X ' + fmtNum(w[0], 3) + '   Y ' + fmtNum(w[1], 3);
  $('#curlayer').textContent = S.curLayer;
  $('#bsnap').classList.toggle('on', S.osnap); $('#bortho').classList.toggle('on', S.ortho); $('#bgrid').classList.toggle('on', !!V().gridOn); $('#btrack').classList.toggle('on', S.otrack);
  $('#rinfo').textContent = S.doc ? S.doc.items.size.toLocaleString('tr') + ' nesne · ' + Math.round(V().lastMs) + ' ms' : '';
}

// her düğmeye basışta kısa renk geri bildirimi; komut başlatırsa runCommand onu komut süresince "on" tutar
document.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('.gb, .tool, .st-card'); if (!b) return; S.sonBtn = { el: b, t: Date.now() }; b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 450); }, true);
