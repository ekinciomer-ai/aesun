// ---- renderer ----
const DASH = (lt) => {
  if (!lt) return null; const u = lt.toUpperCase();
  if (u === 'CONTINUOUS' || u === 'BYLAYER' || u === 'BYBLOCK') return null;
  if (u.includes('PHANTOM')) return [16, 4, 3, 4, 3, 4];
  if (u.includes('CENTER')) return [16, 4, 4, 4];
  if (u.includes('DOT')) return [2, 4];
  if (u.includes('HIDDEN') || u.includes('DASH')) return [7, 4];
  if (u.includes('FENCE')) return [10, 3, 2, 3];
  return null;
};
class View {
  constructor(canvas, overlay) {
    this.cv = canvas; this.ov = overlay; this.g = canvas.getContext('2d'); this.o = overlay.getContext('2d');
    this.cx = 0; this.cy = 0; this.s = 1; this.W = 1; this.H = 1; this.dpr = 1;
    this.dark = true; this.doc = null; this.sel = new Set(); this.lastMs = 0; this.fast = false;
    this.showFills = true;
  }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
    for (const c of [this.cv, this.ov]) { c.width = Math.round(this.W * this.dpr); c.height = Math.round(this.H * this.dpr); c.style.width = this.W + 'px'; c.style.height = this.H + 'px'; }
  }
  w2s(x, y) { return [(x - this.cx) * this.s + this.W / 2, this.H / 2 - (y - this.cy) * this.s]; }
  s2w(X, Y) { return [(X - this.W / 2) / this.s + this.cx, (this.H / 2 - Y) / this.s + this.cy]; }
  visRect() { const a = this.s2w(0, this.H), b = this.s2w(this.W, 0); return [a[0], a[1], b[0], b[1]]; }
  layerOf(l, pl) { return this.doc.layers.get(l === '0' && pl ? pl : l); }
  styleOf(c, l, pc, pl) {
    const ln = (l === '0' && pl) ? pl : l; const L = this.doc.layers.get(ln);
    if (L && (!L.on || L.fz)) return null;
    if (c === 0) { if (pc === undefined || pc === 0) c = 7; else { c = pc; if (c === 256) { const PL = this.doc.layers.get(pl); return colorCss(PL ? PL.c : 7, this.dark); } } }
    if (c === 256) return colorCss(L ? L.c : 7, this.dark);
    return colorCss(c, this.dark);
  }
  ltOf(lt, l, pl) {
    if (!lt || /^bylayer$/i.test(lt)) { const L = this.doc.layers.get((l === '0' && pl) ? pl : l); return L ? DASH(L.lt) : null; }
    return DASH(lt);
  }
  // composite matrix world->screen for a drawable matrix M; returns 2x4 array
  scr(M) {
    const s = this.s, ox = -this.cx * s + this.W / 2, oy = this.cy * s + this.H / 2;
    return [s * M[0], s * M[1], s * M[2], s * M[3] + ox, -s * M[4], -s * M[5], -s * M[6], -s * M[7] + oy];
  }
  render(opts = {}) {
    const t0 = performance.now();
    const g = this.g, doc = this.doc; const dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = this.dark ? '#1d2126' : '#fbfbf9'; g.fillRect(0, 0, this.W, this.H);
    if (!doc) return;
    this.drawGrid(g);
    const vr = this.visRect(); const pad = 2 / this.s;
    const dots = new Map();
    let nDrawn = 0;
    for (const it of doc.items.values()) {
      const L = this.doc.layers.get(it.layer); if (L && (!L.on || L.fz)) continue;
      const bb = itemBB(doc, it);
      if (bb[2] < vr[0] - pad || bb[0] > vr[2] + pad || bb[3] < vr[1] - pad || bb[1] > vr[3] + pad) continue;
      const sw = (bb[2] - bb[0]) * this.s, sh = (bb[3] - bb[1]) * this.s;
      if (sw < 1.5 && sh < 1.5) { // dot LOD
        const col = this.styleOf(it.c === 0 ? 7 : it.c, it.layer); if (!col) continue;
        let arr = dots.get(col); if (!arr) dots.set(col, arr = []);
        const p = this.w2s((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2); arr.push(p[0], p[1]); continue;
      }
      const lodBox = it.t === 'insert' && (sw < (this.fast ? 28 : 14) && sh < (this.fast ? 28 : 14));
      for (const d of drawables(doc, it)) {
        if (lodBox && d.ins) this.drawBoxLOD(g, d); else this.drawDrawable(g, d, null, sw * sh > 4e6);
      }
      nDrawn++;
    }
    for (const [col, arr] of dots) { g.fillStyle = col; for (let i = 0; i < arr.length; i += 2) g.fillRect(arr[i] - 0.5, arr[i + 1] - 0.5, 1.2, 1.2); }
    // selection
    if (this.sel.size) {
      for (const id of this.sel) { const it = doc.items.get(id); if (!it) continue; for (const d of drawables(doc, it)) this.drawDrawable(g, d, '#5aa9ff', true, true); }
    }
    this.lastMs = performance.now() - t0; this.nDrawn = nDrawn;
  }
  drawGrid(g) {
    if (!this.gridOn) return;
    const target = 60 / this.s; const p = Math.pow(10, Math.floor(Math.log10(target))); let step = p;
    for (const m of [1, 2, 5, 10]) if (p * m >= target) { step = p * m; break; }
    const vr = this.visRect();
    g.strokeStyle = this.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; g.lineWidth = 1; g.beginPath();
    for (let x = Math.ceil(vr[0] / step) * step; x <= vr[2]; x += step) { const X = Math.round(this.w2s(x, 0)[0]) + 0.5; g.moveTo(X, 0); g.lineTo(X, this.H); }
    for (let y = Math.ceil(vr[1] / step) * step; y <= vr[3]; y += step) { const Y = Math.round(this.w2s(0, y)[1]) + 0.5; g.moveTo(0, Y); g.lineTo(this.W, Y); }
    g.stroke();
  }
  drawBoxLOD(g, d) {
    const [mn, mx] = d.comp.bb; const A = this.scr(d.M); const z = (mn[2] + mx[2]) / 2;
    const col = this.styleOf(d.pc === 0 ? 7 : d.pc, d.pl); if (!col) return;
    g.strokeStyle = col; g.lineWidth = 1; g.setLineDash([]); g.beginPath();
    const c = [[mn[0], mn[1]], [mx[0], mn[1]], [mx[0], mx[1]], [mn[0], mx[1]]];
    c.forEach(([x, y], i) => { const X = A[0] * x + A[1] * y + A[2] * z + A[3], Y = A[4] * x + A[5] * y + A[6] * z + A[7]; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.closePath(); g.stroke();
  }
  drawDrawable(g, d, hl, cull, isSel) {
    const A = this.scr(d.M); const W = this.W, H = this.H;
    const a0 = A[0], a1 = A[1], a2 = A[2], a3 = A[3], b0 = A[4], b1 = A[5], b2 = A[6], b3 = A[7];
    const k = Math.sqrt(Math.abs(a0 * b1 - a1 * b0)) || 1e-9;
    for (const gr of d.comp.groups) {
      const col = hl || this.styleOf(gr.c, gr.l, d.pc, d.pl); if (!col) continue;
      // fills
      if (gr.fills.length && this.showFills && !isSel) {
        g.fillStyle = col;
        for (const f of gr.fills) {
          g.globalAlpha = f.pat ? 0.16 : 1; g.beginPath();
          for (const r of f.rings) { for (let i = 0; i < r.length; i += 3) { const X = a0 * r[i] + a1 * r[i + 1] + a2 * r[i + 2] + a3, Y = b0 * r[i] + b1 * r[i + 1] + b2 * r[i + 2] + b3; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); }
          g.fill('evenodd');
        }
        g.globalAlpha = 1;
      }
      if (gr.lines.length) {
        g.strokeStyle = col; g.lineWidth = hl ? 1.6 : 1;
        const dash = hl ? [5, 3] : this.ltOf(gr.lt, gr.l, d.pl); g.setLineDash(dash || []);
        g.beginPath();
        for (const pl of gr.lines) {
          const p = pl.p;
          if (cull) {
            if (!pl.bb) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < p.length; i += 3) { const x = p[i], y = p[i + 1], z = p[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; } pl.bb = [x0, y0, x1, y1, (z0 + z1) / 2]; }
            const bb = pl.bb, zc = bb[4];
            const X0 = a0 * bb[0] + a1 * bb[1] + a2 * zc + a3, Y0 = b0 * bb[0] + b1 * bb[1] + b2 * zc + b3, X1 = a0 * bb[2] + a1 * bb[3] + a2 * zc + a3, Y1 = b0 * bb[2] + b1 * bb[3] + b2 * zc + b3;
            const X2 = a0 * bb[0] + a1 * bb[3] + a2 * zc + a3, Y2 = b0 * bb[0] + b1 * bb[3] + b2 * zc + b3, X3 = a0 * bb[2] + a1 * bb[1] + a2 * zc + a3, Y3 = b0 * bb[2] + b1 * bb[1] + b2 * zc + b3;
            const mnX = Math.min(X0, X1, X2, X3), mxX = Math.max(X0, X1, X2, X3), mnY = Math.min(Y0, Y1, Y2, Y3), mxY = Math.max(Y0, Y1, Y2, Y3);
            if (mxX < -4 || mnX > W + 4 || mxY < -4 || mnY > H + 4) continue;
            if (mxX - mnX < 0.6 && mxY - mnY < 0.6) { g.moveTo(mnX, mnY); g.lineTo(mnX + 0.8, mnY); continue; }
          }
          let X = a0 * p[0] + a1 * p[1] + a2 * p[2] + a3, Y = b0 * p[0] + b1 * p[1] + b2 * p[2] + b3; g.moveTo(X, Y);
          let lx = X, ly = Y;
          for (let i = 3; i < p.length; i += 3) {
            X = a0 * p[i] + a1 * p[i + 1] + a2 * p[i + 2] + a3; Y = b0 * p[i] + b1 * p[i + 1] + b2 * p[i + 2] + b3;
            if (i + 3 < p.length && Math.abs(X - lx) < 0.35 && Math.abs(Y - ly) < 0.35) continue;
            g.lineTo(X, Y); lx = X; ly = Y;
          }
          if (pl.cl) g.closePath();
        }
        g.stroke();
      }
      if (gr.pts.length) {
        g.fillStyle = col;
        for (const pt of gr.pts) { const X = a0 * pt.p[0] + a1 * pt.p[1] + a2 * pt.p[2] + a3, Y = b0 * pt.p[0] + b1 * pt.p[1] + b2 * pt.p[2] + b3; g.fillRect(X - 1.5, Y - 1.5, 3, 3); }
      }
      if (gr.texts.length && !(this.fast && !hl)) {
        g.fillStyle = col;
        for (const t of gr.texts) this.drawText(g, t, A, hl);
      }
    }
    g.setLineDash([]);
  }
  drawText(g, t, A, hl) {
    const ux = A[0] * t.u[0] + A[1] * t.u[1] + A[2] * t.u[2], uy = A[4] * t.u[0] + A[5] * t.u[1] + A[6] * t.u[2];
    const vx = A[0] * t.v[0] + A[1] * t.v[1] + A[2] * t.v[2], vy = A[4] * t.v[0] + A[5] * t.v[1] + A[6] * t.v[2];
    const kv = Math.hypot(vx, vy); const hp = t.h * kv; if (hp < 2.2) return;
    const X = A[0] * t.p[0] + A[1] * t.p[1] + A[2] * t.p[2] + A[3], Y = A[4] * t.p[0] + A[5] * t.p[1] + A[6] * t.p[2] + A[7];
    if (X < -4000 || X > this.W + 4000 || Y < -4000 || Y > this.H + 4000) return;
    const ku = Math.hypot(ux, uy) || 1;
    g.save();
    // canvas (a,b) -> P + a*U - b*V   (V is screen-up direction)
    g.setTransform(this.dpr * ux / kv, this.dpr * uy / kv, -this.dpr * vx / kv, -this.dpr * vy / kv, this.dpr * X, this.dpr * Y);
    g.font = (hp * 1.4).toFixed(2) + 'px ' + FONT;
    const n = t.lines.length, ls = (t.ls || 1.667) * hp;
    let y0;
    if (t.mt) { const tot = (n - 1) * ls + hp; y0 = t.va === 3 ? hp : t.va === 2 ? hp - tot / 2 : t.va === 1 ? hp - tot : hp; }
    else y0 = t.va === 3 ? hp : t.va === 2 ? hp / 2 : t.va === 1 ? -hp * 0.3 : 0;
    g.textAlign = t.ha === 1 ? 'center' : t.ha === 2 ? 'right' : 'left'; g.textBaseline = 'alphabetic';
    for (let i = 0; i < n; i++) g.fillText(t.lines[i], 0, y0 + i * ls);
    g.restore();
  }
}
