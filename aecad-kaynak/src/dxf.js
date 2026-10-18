// ---- DXF reader -> normalized {layers, blocks, model} ----
function decodeDxfBytes(u8) {
  let txt = new TextDecoder('utf-8', { fatal: false }).decode(u8);
  const m = /\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*(AC\d+)/.exec(txt.slice(0, 5000));
  const ver = m ? m[1] : 'AC1027';
  if (ver < 'AC1021') {
    const cp = /\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*(\S+)/.exec(txt.slice(0, 8000));
    const map = { ANSI_1254: 'windows-1254', ANSI_1252: 'windows-1252', ANSI_1251: 'windows-1251', ANSI_1250: 'windows-1250' };
    const enc = cp && map[cp[1].toUpperCase()] || 'windows-1254';
    try { txt = new TextDecoder(enc).decode(u8); } catch (e) { /* keep */ }
  }
  return txt;
}
function parseDxf(text) {
  const lines = text.split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i]), lines[i + 1].replace(/\s+$/, '')]);
  let i = 0;
  const layers = [], blocks = new Map(), model = [];
  const num = (v) => parseFloat(v);
  const D2R = Math.PI / 180;
  function readEntity() {
    // pairs[i] is [0, TYPE]
    const type = pairs[i][1]; i++;
    const e = { type, layer: '0', colorIndex: 256, extrusionDirection: { x: 0, y: 0, z: 1 } };
    const tags = [];
    while (i < pairs.length && pairs[i][0] !== 0) { tags.push(pairs[i]); i++; }
    const get = (c, d) => { const t = tags.find((x) => x[0] === c); return t ? t[1] : d; };
    const gn = (c, d = 0) => { const t = tags.find((x) => x[0] === c); return t ? num(t[1]) : d; };
    e.paper = get(67, '0').trim() === '1';
    e.layer = get(8, '0'); e.colorIndex = parseInt(get(62, '256')); e.lineType = get(6, ''); e.handle = get(5, '0');
    if (tags.some((t) => t[0] === 420)) e.color = parseInt(get(420)), e.colorIndex = 257;
    if (parseInt(get(60, '0')) === 1) e.isVisible = false;
    e.extrusionDirection = { x: gn(210, 0), y: gn(220, 0), z: gn(230, 1) };
    const pt = (c) => ({ x: gn(c, 0), y: gn(c + 10, 0), z: gn(c + 20, 0) });
    switch (type) {
      case 'LINE': e.startPoint = pt(10); e.endPoint = pt(11); break;
      case 'POINT': e.position = pt(10); break;
      case 'CIRCLE': e.center = pt(10); e.radius = gn(40); break;
      case 'ARC': e.center = pt(10); e.radius = gn(40); e.startAngle = gn(50) * D2R; e.endAngle = gn(51) * D2R; break;
      case 'ELLIPSE': e.center = pt(10); e.majorAxisEndPoint = pt(11); e.axisRatio = gn(40, 1); e.startAngle = gn(41, 0); e.endAngle = gn(42, Math.PI * 2); break;
      case 'LWPOLYLINE': {
        e.flag = parseInt(get(70, '0')); e.elevation = gn(38, 0); e.constantWidth = gn(43, 0); e.vertices = [];
        let v = null;
        for (const [c, val] of tags) { if (c === 10) { v = { x: num(val), y: 0, bulge: 0 }; e.vertices.push(v); } else if (c === 20 && v) v.y = num(val); else if (c === 42 && v) v.bulge = num(val); }
        break;
      }
      case 'POLYLINE': {
        e.flag = parseInt(get(70, '0')); e.elevation = gn(30, 0); e.vertices = [];
        while (i < pairs.length && pairs[i][0] === 0 && pairs[i][1] === 'VERTEX') {
          const vtx = readEntity(); e.vertices.push({ x: vtx.position ? vtx.position.x : 0, y: vtx.position ? vtx.position.y : 0, z: vtx.position ? vtx.position.z : 0, bulge: vtx.bulge || 0, flag: vtx.flag || 0 });
        }
        if (i < pairs.length && pairs[i][1] === 'SEQEND') readEntity();
        e.type = (e.flag & 8) ? 'POLYLINE3D' : 'POLYLINE2D';
        if (e.flag & (16 | 64)) { e.type = 'POLYLINE3D'; e.vertices = e.vertices.filter((v) => !(v.flag & 128) || (v.flag & 64)); }
        break;
      }
      case 'VERTEX': e.position = pt(10); e.bulge = gn(42, 0); e.flag = parseInt(get(70, '0')); break;
      case 'TEXT': case 'ATTRIB': case 'ATTDEF': {
        const tb = { text: get(1, ''), startPoint: pt(10), endPoint: pt(11), textHeight: gn(40, 1), rotation: gn(50, 0) * D2R, xScale: gn(41, 1), halign: parseInt(get(72, '0')), valign: parseInt(get(type === 'TEXT' ? 73 : 74, '0')), extrusionDirection: e.extrusionDirection };
        if (type === 'TEXT') Object.assign(e, tb); else { e.text = tb; e.flags = parseInt(get(70, '0')); e.tag = get(2, ''); }
        break;
      }
      case 'MTEXT': {
        let s = ''; for (const [c, val] of tags) if (c === 3) s += val; s += get(1, '');
        e.text = s; e.insertionPoint = pt(10); e.textHeight = gn(40, 1); e.rectWidth = gn(41, 0); e.attachmentPoint = parseInt(get(71, '1'));
        e.rotation = gn(50, 0) * D2R; if (tags.some((t) => t[0] === 11)) e.direction = pt(11); e.lineSpacing = gn(44, 1); break;
      }
      case 'INSERT': {
        e.name = get(2, ''); e.insertionPoint = pt(10); e.xScale = gn(41, 1); e.yScale = gn(42, 1); e.zScale = gn(43, 1); e.rotation = gn(50, 0) * D2R;
        e.columnCount = parseInt(get(70, '1')); e.rowCount = parseInt(get(71, '1')); e.columnSpacing = gn(44, 0); e.rowSpacing = gn(45, 0);
        e.attribs = [];
        if (parseInt(get(66, '0')) === 1) {
          while (i < pairs.length && pairs[i][0] === 0 && pairs[i][1] === 'ATTRIB') e.attribs.push(readEntity());
          if (i < pairs.length && pairs[i][1] === 'SEQEND') readEntity();
        }
        break;
      }
      case 'DIMENSION': e.name = get(2, ''); break;
      case 'SOLID': case 'TRACE': case '3DFACE': e.corner1 = pt(10); e.corner2 = pt(11); e.corner3 = pt(12); e.corner4 = pt(13); break;
      case 'LEADER': { e.vertices = []; let v = null; for (const [c, val] of tags) { if (c === 10) { v = { x: num(val), y: 0, z: 0 }; e.vertices.push(v); } else if (c === 20 && v) v.y = num(val); } break; }
      case 'SPLINE': {
        e.flag = parseInt(get(70, '0')); e.degree = parseInt(get(71, '3')); e.knots = []; e.weights = []; e.controlPoints = []; e.fitPoints = [];
        let cp = null, fp = null;
        for (const [c, val] of tags) {
          if (c === 40) e.knots.push(num(val)); else if (c === 41) e.weights.push(num(val));
          else if (c === 10) { cp = { x: num(val), y: 0, z: 0 }; e.controlPoints.push(cp); } else if (c === 20 && cp) cp.y = num(val); else if (c === 30 && cp) cp.z = num(val);
          else if (c === 11) { fp = { x: num(val), y: 0, z: 0 }; e.fitPoints.push(fp); } else if (c === 21 && fp) fp.y = num(val);
        }
        break;
      }
      case 'HATCH': {
        e.patternName = get(2, ''); e.solidFill = parseInt(get(70, '0')); e.elevation = gn(30, 0); e.boundaryPaths = [];
        // walk tags sequentially
        let k = tags.findIndex((t) => t[0] === 91); if (k < 0) break;
        const np = parseInt(tags[k][1]); k++;
        for (let pth = 0; pth < np && k < tags.length; pth++) {
          while (k < tags.length && tags[k][0] !== 92) k++; if (k >= tags.length) break;
          const flag = parseInt(tags[k][1]); k++;
          if (flag & 2) {
            const hasB = parseInt(tags[k][1]); k++; const cl = parseInt(tags[k][1]); k++; const nv = parseInt(tags[k][1]); k++;
            const vs = [];
            for (let q = 0; q < nv; q++) { const v = { x: num(tags[k][1]), y: num(tags[k + 1][1]), bulge: 0 }; k += 2; if (hasB && tags[k] && tags[k][0] === 42) { v.bulge = num(tags[k][1]); k++; } vs.push(v); }
            e.boundaryPaths.push({ vertices: vs });
          } else {
            const ne = parseInt(tags[k][1]); k++; const edges = [];
            for (let q = 0; q < ne && k < tags.length; q++) {
              const et = parseInt(tags[k][1]); k++;
              const take = (n) => { const o = []; for (let z = 0; z < n; z++) { o.push(num(tags[k][1])); k++; } return o; };
              if (et === 1) { const [a, b, c, d] = take(4); edges.push({ type: 1, start: { x: a, y: b }, end: { x: c, y: d } }); }
              else if (et === 2) { const [a, b, r, s, en] = take(5); const ccw = parseInt(tags[k][1]); k++; edges.push({ type: 2, center: { x: a, y: b }, radius: r, startAngle: s * D2R, endAngle: en * D2R, isCCW: !!ccw }); }
              else if (et === 3) { const [a, b, c, d, r, s, en] = take(7); const ccw = parseInt(tags[k][1]); k++; edges.push({ type: 3, center: { x: a, y: b }, end: { x: c, y: d }, lengthOfMinorAxis: r, startAngle: s * D2R, endAngle: en * D2R, isCCW: !!ccw }); }
              else if (et === 4) {
                const deg = parseInt(tags[k][1]); k++; k++; k++; const nk = parseInt(tags[k][1]); k++; const nc = parseInt(tags[k][1]); k++;
                const knots = take(nk); const cps = []; for (let z = 0; z < nc; z++) { cps.push({ x: num(tags[k][1]), y: num(tags[k + 1][1]) }); k += 2; if (tags[k] && tags[k][0] === 42) k++; }
                while (k < tags.length && [97, 11, 21, 12, 22, 13, 23, 73, 74, 95, 96].includes(tags[k][0]) && tags[k][0] !== 92) { if (tags[k][0] === 97) { const nf = parseInt(tags[k][1]); k += 1 + nf * 2; } else k++; }
                edges.push({ type: 4, degree: deg, knots, controlPoints: cps });
              } else break;
            }
            e.boundaryPaths.push({ edges });
          }
        }
        break;
      }
      case 'IMAGE': e.position = pt(10); e.uPixel = pt(11); e.vPixel = pt(12); e.imageSize = { x: gn(13, 1), y: gn(23, 1) }; break;
      default: break;
    }
    return e;
  }
  let section = null;
  while (i < pairs.length) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') { section = pairs[i + 1] ? pairs[i + 1][1] : null; i += 2; continue; }
    if (c === 0 && v === 'ENDSEC') { section = null; i++; continue; }
    if (c === 0 && v === 'EOF') break;
    if (section === 'TABLES' && c === 0 && v === 'LAYER' ) {
      i++; const L = { name: '0', colorIndex: 7, lineType: 'Continuous' }; let isEntry = false;
      while (i < pairs.length && pairs[i][0] !== 0) { const [cc, vv] = pairs[i]; if (cc === 2) { L.name = vv; isEntry = true; } else if (cc === 62) L.colorIndex = parseInt(vv); else if (cc === 6) L.lineType = vv; else if (cc === 70) { L.frozen = (parseInt(vv) & 1) === 1; L.locked = (parseInt(vv) & 4) === 4; } i++; }
      if (isEntry && pairs[i - 1]) { if (L.colorIndex < 0) { L.off = true; L.colorIndex = -L.colorIndex; } layers.push(L); }
      continue;
    }
    if (section === 'BLOCKS' && c === 0 && v === 'BLOCK') {
      i++; let name = '', base = [0, 0, 0];
      while (i < pairs.length && pairs[i][0] !== 0) { const [cc, vv] = pairs[i]; if (cc === 2) name = vv; else if (cc === 10) base[0] = num(vv); else if (cc === 20) base[1] = num(vv); else if (cc === 30) base[2] = num(vv); i++; }
      const ents = [];
      while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDBLK')) { if (pairs[i][0] === 0) ents.push(readEntity()); else i++; }
      i++; while (i < pairs.length && pairs[i][0] !== 0) i++;
      blocks.set(name, { base, ents }); continue;
    }
    if (section === 'ENTITIES' && c === 0) {
      const e = readEntity(); if (!e.paper) model.push(e); continue;
    }
    i++;
  }
  // drop paper space entities (group 67)
  return { layers, blocks, model, solids: new Map() };
}

// ---- normalize libredwg database ----
function normalizeDwg(db, solids) {
  const layers = (db.tables.LAYER && db.tables.LAYER.entries) || [];
  const blocks = new Map(); let model = null;
  for (const b of db.tables.BLOCK_RECORD.entries) {
    const nm = b.name || '';
    if (/^\*model_space$/i.test(nm)) model = b.entities || [];
    else if (/^\*paper_space/i.test(nm)) continue;
    blocks.set(nm, { base: b.basePoint ? [b.basePoint.x || 0, b.basePoint.y || 0, b.basePoint.z || 0] : [0, 0, 0], ents: b.entities || [] });
  }
  if (!model) model = db.entities || [];
  return { layers, blocks, model, solids };
}

// ---- DXF writer (R12, AC1009) ----
function asciiName(s) {
  const map = { 'ı': 'i', 'İ': 'I', 'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C', 'ə': 'e', 'Ə': 'E', ' ': '_' };
  return (s || '0').replace(/[^\x21-\x7e]/g, (ch) => map[ch] || '_').replace(/[<>\/\\":;?*|=,'`]/g, '_').slice(0, 250) || '0';
}
function dxfText(s) { return (s || '').replace(/[^\x20-\x7e]/g, (ch) => '\\U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')); }
function writeDxf(doc) {
  const out = []; const W = (c, v) => { out.push(String(c)); out.push(typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(8).replace(/0+$/, '').replace(/\.$/, '.0')) : String(v)); };
  const lname = new Map(); for (const L of doc.layers.values()) lname.set(L.name, asciiName(L.name));
  const LN = (l) => lname.get(l) || asciiName(l);
  // blocks used
  const used = new Map(); let anon = 0;
  for (const it of doc.items.values()) if (it.t === 'insert' && !used.has(it.block)) used.set(it.block, /^\*/.test(it.block) ? 'ANON_' + (++anon) : asciiName(it.block));
  const col = (c) => c === 256 ? 256 : c === 0 ? 0 : c < 0 ? 7 : c;
  const head = (type, l, c) => { W(0, type); W(8, LN(l)); if (c !== 256) W(62, col(c)); };
  function primsOut(prims, M, isBlock) {
    for (const p of prims) {
      if (p.k === 0) {
        const pts = M ? xfArr(p.p, M) : p.p; const n = pts.length / 3; if (n < 2) continue;
        let z3 = false; for (let i = 2; i < pts.length; i += 3) if (Math.abs(pts[i]) > 1e-9) { z3 = true; break; }
        if (n === 2 && !p.cl) { head('LINE', p.l, p.c); W(10, pts[0]); W(20, pts[1]); W(30, pts[2]); W(11, pts[3]); W(21, pts[4]); W(31, pts[5]); continue; }
        head('POLYLINE', p.l, p.c); W(66, 1); W(10, 0); W(20, 0); W(30, 0); W(70, (p.cl ? 1 : 0) | (z3 ? 8 : 0));
        for (let i = 0; i < pts.length; i += 3) { W(0, 'VERTEX'); W(8, LN(p.l)); W(10, pts[i]); W(20, pts[i + 1]); W(30, pts[i + 2]); if (z3) W(70, 32); }
        W(0, 'SEQEND'); W(8, LN(p.l));
      } else if (p.k === 2) {
        for (const r0 of p.rings) { const r = M ? xfArr(r0, M) : r0; if (p.pat) continue;
          if (r.length / 3 <= 4) { head('SOLID', p.l, p.c); const q = []; for (let i = 0; i < r.length; i += 3) q.push([r[i], r[i + 1], r[i + 2]]); while (q.length < 4) q.push(q[q.length - 1]); const ord = [q[0], q[1], q[3], q[2]]; ord.forEach((v, j) => { W(10 + j, v[0]); W(20 + j, v[1]); W(30 + j, v[2]); }); }
          else { head('POLYLINE', p.l, p.c); W(66, 1); W(10, 0); W(20, 0); W(30, 0); W(70, 1); for (let i = 0; i < r.length; i += 3) { W(0, 'VERTEX'); W(8, LN(p.l)); W(10, r[i]); W(20, r[i + 1]); W(30, r[i + 2]); } W(0, 'SEQEND'); W(8, LN(p.l)); }
        }
      } else if (p.k === 3) { const q = M ? mApply(M, ...p.p) : p.p; head('POINT', p.l, p.c); W(10, q[0]); W(20, q[1]); W(30, q[2]); }
      else if (p.k === 1) {
        let P = p.p, u = p.u, v = p.v;
        if (M) { P = mApply(M, ...p.p); const lin = (w) => [M[0] * w[0] + M[1] * w[1] + M[2] * w[2], M[4] * w[0] + M[5] * w[1] + M[6] * w[2], 0]; u = lin(p.u); v = lin(p.v); }
        const kv = Math.hypot(v[0], v[1]) || 1, h = p.h * kv, rot = Math.atan2(u[1], u[0]) * 180 / Math.PI;
        const n = p.lines.length, ls = (p.ls || 1.667) * h;
        const tot = (n - 1) * ls + h;
        let firstBase = p.mt ? (p.va === 3 ? -h : p.va === 2 ? -h + tot / 2 : -h + tot) : 0;
        for (let i = 0; i < n; i++) {
          if (!p.lines[i]) continue;
          const off = firstBase - i * ls; const vx = -Math.sin(rot * Math.PI / 180), vy = Math.cos(rot * Math.PI / 180);
          const x = P[0] + vx * off, y = P[1] + vy * off;
          head('TEXT', p.l, p.c); W(10, x); W(20, y); W(30, 0); W(40, h); W(1, dxfText(p.lines[i])); if (Math.abs(rot) > 1e-9) W(50, rot);
          const xs = Math.hypot(u[0], u[1]) / kv; if (Math.abs(xs - 1) > 1e-6) W(41, xs);
          const va = p.mt ? 0 : p.va; if (p.ha || va) { W(72, p.ha); W(11, x); W(21, y); W(31, 0); if (va) W(73, va); }
        }
      }
    }
  }
  W(0, 'SECTION'); W(2, 'HEADER'); W(9, '$ACADVER'); W(1, 'AC1009'); W(9, '$INSBASE'); W(10, 0); W(20, 0); W(30, 0);
  W(9, '$DWGCODEPAGE'); W(3, 'ANSI_1254'); W(0, 'ENDSEC');
  W(0, 'SECTION'); W(2, 'TABLES');
  W(0, 'TABLE'); W(2, 'LTYPE'); W(70, 4);
  const lts = [['CONTINUOUS', 'Solid line', []], ['DASHED', '__ __ __', [0.5, -0.25]], ['HIDDEN', '- - - -', [0.25, -0.125]], ['CENTER', '____ _ ____', [1.25, -0.25, 0.25, -0.25]]];
  for (const [n, d, pat] of lts) { W(0, 'LTYPE'); W(2, n); W(70, 0); W(3, d); W(72, 65); W(73, pat.length); W(40, pat.reduce((a, b) => a + Math.abs(b), 0)); for (const x of pat) W(49, x); }
  W(0, 'ENDTAB');
  W(0, 'TABLE'); W(2, 'LAYER'); W(70, doc.layers.size);
  const ltn = (lt) => { const u = (lt || '').toUpperCase(); return u.includes('DASH') ? 'DASHED' : u.includes('HIDDEN') ? 'HIDDEN' : u.includes('CENTER') ? 'CENTER' : 'CONTINUOUS'; };
  for (const L of doc.layers.values()) { W(0, 'LAYER'); W(2, LN(L.name)); W(70, (L.fz ? 1 : 0) | (L.lk ? 4 : 0)); W(62, L.on ? L.c : -L.c); W(6, ltn(L.lt)); }
  W(0, 'ENDTAB');
  W(0, 'TABLE'); W(2, 'STYLE'); W(70, 1); W(0, 'STYLE'); W(2, 'STANDARD'); W(70, 0); W(40, 0); W(41, 1); W(50, 0); W(71, 0); W(42, 2.5); W(3, 'arial.ttf'); W(4, ''); W(0, 'ENDTAB');
  W(0, 'ENDSEC');
  W(0, 'SECTION'); W(2, 'BLOCKS');
  for (const [bn, nn] of used) {
    const b = doc.blocks.get(bn); if (!b) continue;
    W(0, 'BLOCK'); W(8, '0'); W(2, nn); W(70, 0); W(10, 0); W(20, 0); W(30, 0); W(3, nn);
    primsOut(blockPrims(doc.ctx, b), null, true);
    W(0, 'ENDBLK'); W(8, '0');
  }
  W(0, 'ENDSEC');
  W(0, 'SECTION'); W(2, 'ENTITIES');
  for (const it of doc.items.values()) {
    const l = it.layer, c = it.c;
    switch (it.t) {
      case 'line': head('LINE', l, c); W(10, it.x1); W(20, it.y1); W(30, 0); W(11, it.x2); W(21, it.y2); W(31, 0); break;
      case 'circle': head('CIRCLE', l, c); W(10, it.cx); W(20, it.cy); W(30, 0); W(40, it.r); break;
      case 'arc': head('ARC', l, c); W(10, it.cx); W(20, it.cy); W(30, 0); W(40, it.r); W(50, it.a0 * 180 / Math.PI); W(51, it.a1 * 180 / Math.PI); break;
      case 'point': head('POINT', l, c); W(10, it.x); W(20, it.y); W(30, 0); break;
      case 'pline':
        head('POLYLINE', l, c); W(66, 1); W(10, 0); W(20, 0); W(30, 0); W(70, it.cl ? 1 : 0); if (it.w) { W(40, it.w); W(41, it.w); }
        for (const v of it.pts) { W(0, 'VERTEX'); W(8, LN(l)); W(10, v[0]); W(20, v[1]); W(30, 0); if (v[2]) W(42, v[2]); }
        W(0, 'SEQEND'); W(8, LN(l)); break;
      case 'insert': {
        const M = it.M, nn = used.get(it.block);
        const sx = Math.hypot(M[0], M[4]); let sy = Math.hypot(M[1], M[5]); const det = M[0] * M[5] - M[1] * M[4]; if (det < 0) sy = -sy;
        const rot = Math.atan2(M[4], M[0]) * 180 / Math.PI;
        head('INSERT', l, c); W(2, nn); W(10, M[3]); W(20, M[7]); W(30, 0); if (Math.abs(sx - 1) > 1e-9) W(41, sx); if (Math.abs(sy - 1) > 1e-9) W(42, sy); if (Math.abs(rot) > 1e-9) W(50, rot);
        if (it.ap && it.ap.length) primsOut(it.ap, it.AM || null);
        break;
      }
      default: primsOut(nativeOrGeo(it), it.t === 'geo' ? it.M : null);
    }
  }
  W(0, 'ENDSEC'); W(0, 'EOF');
  return out.join('\r\n') + '\r\n';
}
function nativeOrGeo(it) { return it.t === 'geo' ? it.prims : nativePrims(it); }

// ---- tiny ZIP (store) ----
const _crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = _crcT[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function zipStore(name, data) {
  const nm = new TextEncoder().encode(name), crc = crc32(data), n = data.length;
  const lh = new Uint8Array(30 + nm.length), dv = new DataView(lh.buffer);
  dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true); dv.setUint16(8, 0, true); dv.setUint32(14, crc, true); dv.setUint32(18, n, true); dv.setUint32(22, n, true); dv.setUint16(26, nm.length, true); lh.set(nm, 30);
  const ch = new Uint8Array(46 + nm.length), cv = new DataView(ch.buffer);
  cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint32(16, crc, true); cv.setUint32(20, n, true); cv.setUint32(24, n, true); cv.setUint16(28, nm.length, true); ch.set(nm, 46);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, 1, true); ev.setUint16(10, 1, true); ev.setUint32(12, ch.length, true); ev.setUint32(16, lh.length + n, true);
  return new Blob([lh, data, ch, end], { type: 'application/zip' });
}
