// ---- GES: panel datasheet, table templates, section, land fill ----
const G = {
  panel: { model: 'Örnek 730 Wp (ASTRO N7 sınıfı)', p: 730, L: 2384, W: 1303, T: 33, cells: 132, kg: 38.3, bifacial: true, powers: [] },
  tpl: [], // table templates
  bound: null, // [[x,y],...] closed boundary in world
  last: null, // last fill result
};
const D2R = Math.PI / 180;
const UC_PAYI = 0.08;   // ges-proje-cizim §3: masa uç payı 2×80 mm

// ---------- datasheet parsing ----------
let _pdfjs = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Yüklenemedi: ' + src)); document.head.appendChild(s); }); }
async function pdfjs() {
  if (_pdfjs) return _pdfjs;
  const base = new URL('./', document.baseURI).href;
  try { await loadScript(base + 'lib/pdf.min.js'); } catch (e) { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); }
  const lib = window.pdfjsLib;
  try { const r = await fetch(base + 'lib/pdf.worker.min.js'); if (!r.ok) throw 0; const blob = new Blob([await r.text()], { type: 'text/javascript' }); lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob); }
  catch (e) { lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }
  _pdfjs = lib; return lib;
}
async function pdfText(buf) {
  const lib = await pdfjs(); const doc = await lib.getDocument({ data: buf }).promise; let out = '';
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
    const pg = await doc.getPage(i); const tc = await pg.getTextContent(); let lastY = null;
    for (const it of tc.items) { const y = it.transform ? Math.round(it.transform[5]) : 0; if (lastY !== null && Math.abs(y - lastY) > 3) out += '\n'; else if (out && !out.endsWith(' ')) out += ' '; out += it.str; lastY = y; }
    out += '\n';
  }
  return out;
}
function parseDatasheet(txt) {
  const t = txt.replace(/ /g, ' ').replace(/[×✕Х]/g, 'x');
  const r = {};
  // dimensions L x W x T (mm)
  let m = /(\d{4})\s*(?:mm)?\s*[xX\*]\s*(\d{3,4})\s*(?:mm)?\s*[xX\*]\s*(\d{2}(?:[.,]\d)?)\s*mm/.exec(t)
    || /(\d{4})\s*[xX\*]\s*(\d{3,4})\s*[xX\*]\s*(\d{2}(?:[.,]\d)?)/.exec(t);
  if (m) { const a = +m[1], b = +m[2]; r.L = Math.max(a, b); r.W = Math.min(a, b); r.T = parseFloat(m[3].replace(',', '.')); }
  else { m = /(\d{4})\s*[xX\*]\s*(\d{3,4})\s*mm/.exec(t); if (m) { r.L = Math.max(+m[1], +m[2]); r.W = Math.min(+m[1], +m[2]); } }
  // cells
  m = /(\d{2,3})\s*(?:\(\s*\d+\s*[xX]\s*\d+\s*\)\s*)?(?:pcs|cells|half[- ]?cells|hücre)/i.exec(t) || /(?:number of cells|no\.? of cells|cell (?:qty|quantity|number)|hücre sayısı)[^\d]{0,30}(\d{2,3})/i.exec(t);
  if (m) { const c = +m[1]; if (c >= 54 && c <= 216) r.cells = c; }
  // weight
  m = /(\d{2}(?:[.,]\d{1,2})?)\s*kg/i.exec(t); if (m) { const w = parseFloat(m[1].replace(',', '.')); if (w > 10 && w < 60) r.kg = w; }
  // powers
  const pw = new Set();
  const lines = t.split('\n');
  for (const ln of lines) {
    if (/(P\s*max|Pmpp|Maximum Power|Nominal (?:Max\.? )?Power|Rated (?:Max\.? )?Power|Maks(?:imum)? Güç|Power Output|STC Power)/i.test(ln)) {
      for (const x of ln.match(/\b(\d{3})\b/g) || []) { const v = +x; if (v >= 250 && v <= 900) pw.add(v); }
    }
  }
  if (!pw.size) for (const x of t.match(/\b(\d{3})\s*W[p]?\b/g) || []) { const v = parseInt(x); if (v >= 250 && v <= 900) pw.add(v); }
  // model name suffix numbers often encode power ("...-730")
  r.powers = [...pw].sort((a, b) => a - b);
  if (r.powers.length) r.p = r.powers[r.powers.length - 1];
  m = /\b([A-Z]{2,}[A-Z0-9\-\/()]*\d{2,}[A-Z0-9\-\/()]*)\b/.exec(t); if (m) r.model = m[1];
  r.bifacial = /bifacial|bi-facial|çift yüz/i.test(t);
  // electrical values: pick the column of the selected (highest) power class when the line lists one value per class
  const col = (re, lo, hi) => {
    for (const ln of lines) { if (!re.test(ln)) continue;
      const nums = (ln.replace(re, ' ').match(/-?\d+[.,]\d+|\b\d{2,3}\b/g) || []).map((x) => parseFloat(x.replace(',', '.'))).filter((v) => v >= lo && v <= hi);
      if (!nums.length) continue; if (r.powers && nums.length === r.powers.length) return nums[r.powers.indexOf(r.p)]; return nums[nums.length - 1]; }
    return null; };
  r.voc = col(/(Open[- ]Circuit Voltage|\bVoc\b|Açık devre gerilimi)/i, 20, 120);
  r.vmp = col(/(Maximum Power Voltage|Voltage at Maximum Power|MPP Voltage|\bVmp+\b|\bVmpp\b)/i, 20, 120);
  r.isc = col(/(Short[- ]Circuit Current|\bIsc\b|Kısa devre akımı)/i, 5, 30);
  r.imp = col(/(Maximum Power Current|Current at Maximum Power|MPP Current|\bImp+\b|\bImpp\b)/i, 5, 30);
  const k = /(Temperature Coefficient (?:of )?(?:Voc|Uoc)|(?:Voc|Uoc)[^\n]{0,25}(?:temperature|sıcaklık) (?:coefficient|katsayı))[^\n]*?(-?0[.,]\d+)\s*%/i.exec(t) || /\b(?:β|beta)\s*\(?(?:Voc|Uoc)\)?[^\n]*?(-?0[.,]\d+)\s*%/i.exec(t);
  if (k) { const v = parseFloat((k[2] || k[1]).replace(',', '.')); r.kvoc = v > 0 ? -v : v; }
  return r;
}

// ---------- blocks ----------
function rectEnt(x0, y0, x1, y1, color = 256, layer = '0') { return { type: 'LWPOLYLINE', layer, colorIndex: color, flag: 1, vertices: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] }; }
function lineEnt(x0, y0, x1, y1, color = 256, layer = '0') { return { type: 'LINE', layer, colorIndex: color, startPoint: { x: x0, y: y0, z: 0 }, endPoint: { x: x1, y: y1, z: 0 } }; }
function setBlock(name, ents) { S.doc.blocks.set(name, { name, base: [0, 0, 0], ents }); const b = S.doc.blocks.get(name); delete b.prims; delete b.comp; }
function panelBlockName() { return 'PANEL_' + G.panel.p + 'W_' + G.panel.L + 'x' + G.panel.W; }
function makePanelBlock() { // module in plan, flat, portrait (width along x, length along y), metres
  const P = G.panel, w = P.W / 1000, l = P.L / 1000, fr = 0.035; const ents = [];
  ents.push(rectEnt(0, 0, w, l)); ents.push(rectEnt(fr, fr, w - fr, l - fr, 8));
  const cols = 6, rows = Math.max(1, Math.round((P.cells || 132) / cols)); const cw = (w - 2 * fr) / cols, ch = (l - 2 * fr) / rows;
  for (let c = 1; c < cols; c++) ents.push(lineEnt(fr + c * cw, fr, fr + c * cw, l - fr, 8));
  for (let r = 1; r < rows; r++) ents.push(lineEnt(fr, fr + r * ch, w - fr, fr + r * ch, 8));
  if ((P.cells || 0) >= 100) ents.push(lineEnt(fr, l / 2, w - fr, l / 2, 1)); // half-cut split
  const name = panelBlockName(); setBlock(name, ents); return name;
}
// table template: {name, orient:'V'|'H', rows, per, tilt, gx, gy, front}
function tplDims(tp) {
  const P = G.panel; const pw = (tp.orient === 'V' ? P.W : P.L) / 1000, pl = (tp.orient === 'V' ? P.L : P.W) / 1000;
  const len = tp.per * pw + (tp.per - 1) * tp.gx + 2 * UC_PAYI;   // uç payı 2×80 mm (TİP-1 → 17,339 m)
  const slant = tp.rows * pl + (tp.rows - 1) * tp.gy;
  const depth = slant * Math.cos(tp.tilt * D2R), rise = slant * Math.sin(tp.tilt * D2R);
  return { pw, pl, len, slant, depth, rise, back: tp.front + rise, n: tp.rows * tp.per, kwp: tp.rows * tp.per * P.p / 1000 };
}
const LEG_IN = 0.40, LEG_MAX = 2.40;
function legLayout(tp) {
  const d = tplDims(tp), c = Math.cos(tp.tilt * D2R); const span = Math.max(0, d.len - 2 * LEG_IN);
  const n = Math.max(1, Math.ceil(span / LEG_MAX - 1e-9)); const xs = []; for (let i = 0; i <= n; i++) xs.push(LEG_IN + span * i / n);
  const ys = [LEG_IN * c, d.depth - LEG_IN * c]; const out = []; for (const y of ys) for (const x of xs) out.push([x, y]); return out;
}
function tplName(tp) { return 'MASA_' + tp.rows + tp.orient + tp.per + '_' + tp.tilt + 'D_' + G.panel.p + 'W'; }
function makeTableBlock(tp) {
  const d = tplDims(tp), c = Math.cos(tp.tilt * D2R); const ents = [];
  for (let r = 0; r < tp.rows; r++) for (let k = 0; k < tp.per; k++) {
    const x0 = UC_PAYI + k * (d.pw + tp.gx), y0 = r * (d.pl + tp.gy) * c; ents.push(rectEnt(x0, y0, x0 + d.pw, y0 + d.pl * c));
  }
  // legs (no static data): rows 0.40 m inside front/back panel edge (along slope), first/last 0.40 m inside table ends, spacing <= 2.40 m
  for (const L of legLayout(tp)) ents.push(rectEnt(L[0] - 0.05, L[1] - 0.05, L[0] + 0.05, L[1] + 0.05, 8));
  const name = tplName(tp); setBlock(name, ents); return name;
}

// ---------- section (side view) ----------
function sectionItems(tp, at) {
  const d = tplDims(tp), x0 = at[0], y0 = at[1], t = tp.tilt * D2R; const it = []; const L = S.curLayer;
  const mk = (t2, o) => ({ id: newId(), t: t2, layer: L, c: 256, lt: '', ...o });
  const fx = x0 + 0.6, fy = y0 + tp.front; const bx = fx + d.depth, by = fy + d.rise;
  it.push(mk('line', { x1: x0 - 0.8, y1: y0, x2: bx + 1.6, y2: y0, c: 8 })); // ground
  // panel slab
  const th = (G.panel.T || 35) / 1000 + 0.06; const nx = -Math.sin(t) * th, ny = Math.cos(t) * th;
  it.push(mk('pline', { cl: true, pts: [[fx, fy, 0], [bx, by, 0], [bx + nx, by + ny, 0], [fx + nx, fy + ny, 0]], c: 5 }));
  // module joints
  for (let r = 1; r < tp.rows; r++) { const s = r * (d.pl + tp.gy) - tp.gy / 2; const px = fx + s * Math.cos(t), py = fy + s * Math.sin(t); it.push(mk('line', { x1: px, y1: py, x2: px + nx, y2: py + ny, c: 5 })); }
  // posts at 18% and 82%
  for (const f of [LEG_IN / d.slant, 1 - LEG_IN / d.slant]) { const px = fx + d.depth * f, py = fy + d.rise * f; it.push(mk('line', { x1: px, y1: y0 - 1.2, x2: px, y2: py, c: 2 })); it.push(mk('line', { x1: px - 0.12, y1: y0, x2: px + 0.12, y2: y0, c: 2 })); }
  // dims
  const h = Math.max(0.12, d.slant / 18);
  it.push(mk('dim', { x1: fx, y1: y0, x2: fx, y2: fy, lx: fx - 0.9, ly: 0, ang: Math.PI / 2, h, txt: fmtNum(tp.front, 2) }));
  it.push(mk('dim', { x1: bx, y1: y0, x2: bx, y2: by, lx: bx + 1.0, ly: 0, ang: Math.PI / 2, h, txt: fmtNum(d.back, 2) }));
  it.push(mk('dim', { x1: fx, y1: fy, x2: bx, y2: by, lx: (fx + bx) / 2 - Math.sin(t) * 0.9, ly: (fy + by) / 2 + Math.cos(t) * 0.9, ang: t, h, txt: fmtNum(d.slant, 3) }));
  it.push(mk('dim', { x1: fx, y1: y0, x2: bx, y2: y0, lx: 0, ly: y0 - 0.7, ang: 0, h, txt: fmtNum(d.depth, 3) }));
  // angle
  const ar = Math.min(1.2, d.depth * 0.35);
  it.push(mk('line', { x1: fx, y1: fy, x2: fx + ar * 1.25, y2: fy, c: 8 }));
  it.push(mk('arc', { cx: fx, cy: fy, r: ar, a0: 0, a1: t, c: 1 }));
  it.push(mk('text', { x: fx + ar * 1.35, y: fy - h * 1.4, h, rot: 0, s: 'β = ' + tp.tilt + '°', ha: 0, va: 0, c: 1 }));
  it.push(mk('text', { x: x0 - 0.8, y: y0 - 1.9, h: h * 1.1, rot: 0, s: 'KESİT · ' + tp.rows + tp.orient + tp.per + ' · ' + G.panel.p + ' Wp · ' + d.n + ' modül · ' + fmtNum(d.kwp, 2) + ' kWp', ha: 0, va: 0 }));
  return it;
}

// ---------- sun / row pitch ----------
function rowPitch(tp, lat, hrs, rowAng = 0) {
  const d = tplDims(tp); const phi = lat * D2R, del = -23.44 * D2R; let worst = 0, minAlt = 90;
  const W = hrs * 15; // half-window in degrees of hour angle
  for (let w = -W; w <= W + 1e-9; w += 1) {
    const om = w * D2R; const sa = Math.sin(phi) * Math.sin(del) + Math.cos(phi) * Math.cos(del) * Math.cos(om);
    if (sa <= 0.01) return { pitch: NaN, err: 'Güneş bu saat aralığında ufkun altında; saat aralığını daraltın.' };
    const al = Math.asin(sa); minAlt = Math.min(minAlt, al / D2R);
    const sp = Math.cos(del) * Math.sin(om) / Math.cos(al); const psi = Math.asin(Math.max(-1, Math.min(1, sp))); // azimuth from south
    const s = d.rise / Math.tan(al) * Math.cos(psi - rowAng * D2R);
    worst = Math.max(worst, s);
  }
  return { pitch: d.depth + worst, shadow: worst, minAlt, depth: d.depth };
}

// ---------- polygon helpers ----------
function scanX(poly, y) {
  const xs = []; const n = poly.length;
  for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
  xs.sort((p, q) => p - q); const iv = []; for (let i = 0; i + 1 < xs.length; i += 2) iv.push([xs[i], xs[i + 1]]); return iv;
}
function ivIntersect(A, B) { const out = []; for (const a of A) for (const b of B) { const s = Math.max(a[0], b[0]), e = Math.min(a[1], b[1]); if (e > s) out.push([s, e]); } return out.sort((p, q) => p[0] - q[0]); }
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }

// greedy-optimal combo for a span: maximise modules, tables sorted by length desc
function bestCombo(span, types, gap) {
  let best = { mods: 0, cnt: [], left: span, nt: 0 };
  const rec = (i, left, cnt, mods) => {
    if (i === types.length) { const nt = cnt.reduce((a, b) => a + b, 0); if (mods > best.mods || (mods === best.mods && nt < best.nt)) best = { mods, cnt: cnt.slice(), left, nt }; return; }
    const L = types[i].len + gap; const max = Math.floor((left + gap) / L);
    const lo = i === types.length - 1 ? max : Math.max(0, max - 2);
    for (let k = max; k >= lo; k--) { cnt[i] = k; rec(i + 1, left - k * L, cnt, mods + k * types[i].n); }
  };
  rec(0, span, [], 0); return best;
}
// Hizalama: xm = left (batı) | right (doğu) | center; ym = south (güneyden) | north (kuzeyden) | center.
// opts.ic: cephe bazlı iç alan halkaları (çekme zaten düşülmüş) — verilirse setback 0 ile taranır.
function fillLand(opts) {
  const { types, pitch, rowGap, rowAng } = opts; // types: [{tp, name, len, depth, n}]
  const xm = opts.xm || (opts.align === 'center' ? 'center' : opts.align === 'right' ? 'right' : 'left'), ym = opts.ym || 'south';
  const th = rowAng * D2R, c = Math.cos(th), s = Math.sin(th);
  const toL = (p) => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], toW = (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const rings = opts.ic ? opts.ic(toL) : null; const setback = rings ? 0 : opts.setback;
  const poly = G.bound.map(toL);
  const ys = (rings ? rings.flat() : poly).map((p) => p[1]); const minY = Math.min(...ys), maxY = Math.max(...ys);
  const depth = Math.max(...types.map((t) => t.depth));
  const scan = rings ? (yy) => scanXR(rings, yy) : (yy) => scanX(poly, yy);
  const span = maxY - minY - 2 * setback - depth; if (span < -1e-9) return { placed: [], rows: 0, rowAng: th, area: Math.abs(polyArea(G.bound)), xm, ym };
  const art = span - Math.floor(span / pitch + 1e-9) * pitch;
  let yS = minY + setback + (ym === 'north' ? art : ym === 'center' ? art / 2 : 0);
  const placed = []; let rows = 0;
  for (let y = yS; y + depth <= maxY - setback + 1e-9; y += pitch) {
    const y0 = y - setback, y1 = y + depth + setback; const n = Math.max(4, Math.ceil((y1 - y0) / 0.5));
    let iv = null;
    const samples = []; for (let k = 0; k <= n; k++) samples.push(y0 + (y1 - y0) * k / n);
    for (const r of (rings || [poly])) for (const p of r) if (p[1] > y0 && p[1] < y1) samples.push(p[1] - 1e-7, p[1] + 1e-7);
    for (const yy of samples) { const cur = scan(yy); iv = iv === null ? cur : ivIntersect(iv, cur); if (!iv.length) break; }
    if (!iv || !iv.length) continue;
    let any = false;
    for (const [a0, a1] of iv) {
      let x0 = a0 + setback, x1 = a1 - setback; if (x1 - x0 < types[types.length - 1].len) continue;
      const bc = bestCombo(x1 - x0, types, rowGap);
      let x = xm === 'center' ? x0 + bc.left / 2 : xm === 'right' ? x0 + bc.left : x0;
      for (let i = 0; i < types.length; i++) for (let k = 0; k < (bc.cnt[i] || 0); k++) {
        const w = toW([x, y]); placed.push({ type: i, x: w[0], y: w[1] }); x += types[i].len + rowGap; any = true;
      }
    }
    if (any) rows++;
  }
  return { placed, rows, rowAng: th, area: Math.abs(polyArea(G.bound)), xm, ym };
}
// "En düz sınır": en uzun sınır kenarı; K-G'ye yakınsa o yana (batı/doğu) dayanır, D-B'ye yakınsa o yandan (güney/kuzey) başlar.
function hizaDuz(rowAng) {
  const th = rowAng * D2R, c = Math.cos(th), s = Math.sin(th), toL = (p) => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
  const B = G.bound.map(toL), cx = B.reduce((t, p) => t + p[0], 0) / B.length, cy = B.reduce((t, p) => t + p[1], 0) / B.length;
  let best = null, bl = 0; for (let i = 0; i < B.length; i++) { const a = B[i], b = B[(i + 1) % B.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > bl) { bl = L; best = [a, b]; } }
  const [a, b] = best, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  if (Math.abs(b[1] - a[1]) >= Math.abs(b[0] - a[0])) return { xm: mx < cx ? 'left' : 'right', ym: 'south', L: bl };
  return { xm: 'center', ym: my < cy ? 'south' : 'north', L: bl };
}
const HIZA_AD = { left: 'batıya', right: 'doğuya', center: 'ortalı', south: 'güneyden', north: 'kuzeyden' };

// ---------- KML / KMZ ----------
async function unzipFirstKml(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer); let p = 0;
  while (p + 30 < u8.length && dv.getUint32(p, true) === 0x04034b50) {
    const method = dv.getUint16(p + 8, true), csz = dv.getUint32(p + 18, true), nl = dv.getUint16(p + 26, true), el = dv.getUint16(p + 28, true);
    const name = new TextDecoder().decode(u8.subarray(p + 30, p + 30 + nl)); const st = p + 30 + nl + el; const data = u8.subarray(st, st + csz);
    if (/\.kml$/i.test(name)) {
      if (method === 0) return new TextDecoder().decode(data);
      const ds = new DecompressionStream('deflate-raw'); const out = await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer(); return new TextDecoder().decode(out);
    }
    p = st + csz;
  }
  throw new Error('KMZ içinde KML bulunamadı.');
}
function kmlPolys(txt) {
  const out = []; const re = /<coordinates>([\s\S]*?)<\/coordinates>/gi; let m;
  while ((m = re.exec(txt))) { const pts = m[1].trim().split(/\s+/).map((s) => s.split(',').map(Number)).filter((a) => a.length >= 2 && isFinite(a[0]) && isFinite(a[1])); if (pts.length >= 3) out.push(pts); }
  return out;
}
function utmZoneOf(lon) { return Math.floor((lon + 180) / 6) + 1; }
function ll2utm(lat, lon, zone) {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const lon0 = ((zone - 1) * 6 - 180 + 3) * D2R, phi = lat * D2R, lam = lon * D2R;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (lam - lon0);
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  let y = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  if (lat < 0) y += 10000000; return [x, y];
}
function utm2lat(x, y, zone) { // latitude only (for sun calc)
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f); const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
  return p1 / D2R; // footpoint latitude (error < 0.2° near CM — enough for shading)
}
