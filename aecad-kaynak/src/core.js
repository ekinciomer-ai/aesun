// ---- core: colours, matrices, geometry, compile ----
const TAU = Math.PI * 2;

// AutoCAD Color Index -> css
const ACI = (() => {
  const t = new Array(256);
  const base = ['#000000', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffffff', '#808080', '#c0c0c0'];
  for (let i = 0; i < 10; i++) t[i] = base[i];
  const vals = [1, 1, 0.8, 0.8, 0.6, 0.6, 0.5, 0.5, 0.3, 0.3];
  for (let i = 10; i < 250; i++) {
    const h = Math.floor((i - 10) / 10) * 15, k = i % 10;
    const v = vals[k], s = (k % 2) ? 0.5 : 1;
    const f = (n) => { const kk = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(kk, 4 - kk, 1)); };
    const c = [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
    t[i] = '#' + c;
  }
  const g = ['#333333', '#505050', '#696969', '#828282', '#bebebe', '#ffffff'];
  for (let i = 0; i < 6; i++) t[250 + i] = g[i];
  return t;
})();
function aciCss(i, bgDark) {
  if (i === 7 || i === 255) return bgDark ? '#f2f2f2' : '#111111';
  if (i < 0) i = -i;
  return ACI[i] || '#f2f2f2';
}

// 3x4 affine matrices [a b c d / e f g h / i j k l]
const M_ID = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function mMul(A, B) {
  const r = new Array(12);
  for (let i = 0; i < 3; i++) {
    const a0 = A[i * 4], a1 = A[i * 4 + 1], a2 = A[i * 4 + 2], a3 = A[i * 4 + 3];
    r[i * 4] = a0 * B[0] + a1 * B[4] + a2 * B[8];
    r[i * 4 + 1] = a0 * B[1] + a1 * B[5] + a2 * B[9];
    r[i * 4 + 2] = a0 * B[2] + a1 * B[6] + a2 * B[10];
    r[i * 4 + 3] = a0 * B[3] + a1 * B[7] + a2 * B[11] + a3;
  }
  return r;
}
const mT = (x, y, z = 0) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
const mS = (x, y, z = 1) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0];
const mRz = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; };
function mApply(M, x, y, z = 0) { return [M[0] * x + M[1] * y + M[2] * z + M[3], M[4] * x + M[5] * y + M[6] * z + M[7], M[8] * x + M[9] * y + M[10] * z + M[11]]; }
function ocsMatrix(n) {
  if (!n) return null;
  let nx = n.x || 0, ny = n.y || 0, nz = n.z || 0;
  const L = Math.hypot(nx, ny, nz);
  if (L < 1e-12) return null;
  nx /= L; ny /= L; nz /= L;
  if (Math.abs(nx) < 1e-9 && Math.abs(ny) < 1e-9 && nz > 0) return null;
  let ax;
  if (Math.abs(nx) < 1 / 64 && Math.abs(ny) < 1 / 64) ax = [nz, 0, -nx]; // Wy x N
  else ax = [-ny, nx, 0]; // Wz x N
  const la = Math.hypot(ax[0], ax[1], ax[2]); ax = ax.map((v) => v / la);
  const ay = [ny * ax[2] - nz * ax[1], nz * ax[0] - nx * ax[2], nx * ax[1] - ny * ax[0]];
  return [ax[0], ay[0], nx, 0, ax[1], ay[1], ny, 0, ax[2], ay[2], nz, 0];
}
function mDet2(M) { return M[0] * M[5] - M[1] * M[4]; }
function mInv2D(M) { // inverse of planar part (ignores z coupling)
  const d = M[0] * M[5] - M[1] * M[4];
  const a = M[5] / d, b = -M[1] / d, e = -M[4] / d, f = M[0] / d;
  return [a, b, 0, -(a * M[3] + b * M[7]), e, f, 0, -(e * M[3] + f * M[7]), 0, 0, 1, -M[11]];
}

// geometry helpers
function bulgeArcPts(x1, y1, x2, y2, b, out) {
  // appends intermediate points (excluding start, including end)
  if (!b || Math.abs(b) < 1e-9) { out.push(x2, y2); return; }
  const th = 4 * Math.atan(b), dx = x2 - x1, dy = y2 - y1, ch = Math.hypot(dx, dy);
  if (ch < 1e-12) { out.push(x2, y2); return; }
  const r = ch / (2 * Math.sin(th / 2));
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, h = r * Math.cos(th / 2);
  const nx = -dy / ch, ny = dx / ch;
  const cx = mx + nx * h, cy = my + ny * h;
  const a0 = Math.atan2(y1 - cy, x1 - cx);
  const n = Math.max(2, Math.ceil(Math.abs(th) / (Math.PI / 24)));
  const rr = Math.abs(r);
  for (let i = 1; i <= n; i++) { const a = a0 + th * i / n; out.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
  out[out.length - 2] = x2; out[out.length - 1] = y2;
}
function bulgeCenter(x1, y1, x2, y2, b) {
  const th = 4 * Math.atan(b), dx = x2 - x1, dy = y2 - y1, ch = Math.hypot(dx, dy);
  const r = ch / (2 * Math.sin(th / 2)), h = r * Math.cos(th / 2);
  return { cx: (x1 + x2) / 2 - dy / ch * h, cy: (y1 + y2) / 2 + dx / ch * h, r: Math.abs(r) };
}
function arcPts(cx, cy, r, a0, a1, full) {
  let sweep = full ? TAU : ((a1 - a0) % TAU + TAU) % TAU;
  if (!full && sweep < 1e-9) sweep = TAU;
  const n = Math.max(8, Math.ceil(sweep / (TAU / 72)));
  const p = [];
  for (let i = 0; i <= n; i++) { const a = a0 + sweep * i / n; p.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
  return p;
}
function deBoor(deg, knots, cps, weights, nseg) {
  const n = cps.length; if (n < 2) return [];
  if (!knots || knots.length !== n + deg + 1) {
    knots = []; for (let i = 0; i <= n + deg; i++) knots.push(i <= deg ? 0 : i >= n ? n - deg : i - deg);
  }
  const t0 = knots[deg], t1 = knots[n];
  const out = [];
  for (let s = 0; s <= nseg; s++) {
    let t = t0 + (t1 - t0) * s / nseg; if (s === nseg) t = t1 - 1e-10 * (t1 - t0);
    let k = deg; while (k < n - 1 && knots[k + 1] <= t) k++;
    const d = [];
    for (let j = 0; j <= deg; j++) { const c = cps[k - deg + j], w = weights && weights.length === n ? weights[k - deg + j] : 1; d.push([c.x * w, c.y * w, (c.z || 0) * w, w]); }
    for (let r = 1; r <= deg; r++) for (let j = deg; j >= r; j--) {
      const i = k - deg + j, den = knots[i + deg - r + 1] - knots[i]; const a = den ? (t - knots[i]) / den : 0;
      for (let q = 0; q < 4; q++) d[j][q] = (1 - a) * d[j - 1][q] + a * d[j][q];
    }
    const w = d[deg][3] || 1; out.push(d[deg][0] / w, d[deg][1] / w, d[deg][2] / w);
  }
  return out;
}
function hull2(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function segInt(ax, ay, bx, by, cx, cy, dx, dy, ext) {
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy, den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-14) return null;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / den, u = ((cx - ax) * ry - (cy - ay) * rx) / den;
  if (!ext && (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9)) return null;
  return { x: ax + rx * t, y: ay + ry * t, t, u };
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t, y = ay + dy * t; return { d: Math.hypot(px - x, py - y), x, y, t };
}

// ---- text helpers ----
function decodeU(s) { return s.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\M\+[0-9A-Fa-f](\w{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
function decodeText(s) {
  if (!s) return '';
  s = decodeU(s);
  return s.replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[uUoO]/g, '').replace(/%%%/g, '%');
}
function mtextPlain(s) {
  if (!s) return [''];
  s = decodeU(s);
  s = s.replace(/\\\\/g, '\u0001').replace(/\\\{/g, '\u0002').replace(/\\\}/g, '\u0003');
  s = s.replace(/\\[Pp]/g, '\n').replace(/\\~/g, ' ').replace(/\\[NX]/g, '\n');
  s = s.replace(/\\S([^;]*?)[#^\/]([^;]*?);/g, '$1/$2');
  s = s.replace(/\\[fFcCHhTtQqWwAaLlOoKkpH][^;\\{}]*;?/g, (m) => /^\\[LlOoKk]$/.test(m) ? '' : (m.endsWith(';') || /^\\[fFcCHhTtQqWwAap]/.test(m)) ? '' : m);
  s = s.replace(/\\[LlOoKk]/g, '');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\u0001/g, '\\').replace(/\u0002/g, '{').replace(/\u0003/g, '}');
  s = decodeText(s);
  return s.split('\n');
}
let _mctx = null; const _wcache = new Map();
const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
function textW(str) { // width at height 1 (cap height) ~ font size 1.4
  let w = _wcache.get(str);
  if (w !== undefined) return w;
  if (!_mctx) _mctx = document.createElement('canvas').getContext('2d');
  _mctx.font = '140px ' + FONT; w = _mctx.measureText(str).width / 100;
  if (_wcache.size > 50000) _wcache.clear();
  _wcache.set(str, w); return w;
}
function wrapLines(lines, width, h) {
  if (!width || width <= 0) return lines;
  const out = [];
  for (const ln of lines) {
    const words = ln.split(' '); let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && textW(t) * h > width * 1.02) { out.push(cur); cur = w; } else cur = t;
    }
    out.push(cur);
  }
  return out;
}
