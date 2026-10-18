// ---- Tasarım araçları: inverter, trafo (TM), DM, OG / AC / DC kablo — tıkla-ekle, veri yaz, kendi katmanında hesaba girsin ----
// Her öğe kendi GES katmanında durur ve verisini `ges` alanında taşır; etiketi (yazı) aynı veriyi gösterir.
// DXF'ten geri açılınca veri etiketten okunur (TASARIM_ETIKET_RE). Özet (adet × güç, kablo boyları) çizim değiştikçe güncellenir.
const TS = {
  inv: { ad: 'İnverter', kat: 'GES-INV', renk: 6, alan: [['kw', 'Güç (kW)', () => pn('p-inv') ?? 100], ['model', 'Model', () => pv('p-invm') || '']] },
  tm: { ad: 'Trafo (TM)', kat: 'GES-TM', renk: 30, alan: [['kva', 'Güç (kVA)', () => pn('p-trafo') ?? 1250], ['gerilim', 'Gerilim (boş = güce göre)', () => ''], ['hucre', 'OG hücre sayısı', () => 3], ['en', 'Bina eni (m) — imalatçı ölçüsü', () => 2.5]] },
  dm: { ad: 'DM', kat: 'GES-TM', renk: 30, alan: [['hucre', 'OG hücre sayısı (giriş+ölçü+çıkışlar)', () => 5], ['en', 'Bina eni (m) — imalatçı ölçüsü', () => 2.5], ['not', 'Not', () => 'Dağıtım merkezi']] },
  og: { ad: 'OG kablo', kat: 'GES-OG-KABLO', renk: 1, alan: [['kablo', 'Kablo', () => pv('p-ogk') || '3x(1x120/16) NA2XSY 36 kV'], ['pay', 'Uç payı (m)', () => 20]] },
  ac: { ad: 'AC kablo', kat: 'GES-AC-KABLO', renk: 3, alan: [['kablo', 'Kablo', () => pv('p-ack') || '3x240/120 NA2XY'], ['pay', 'Uç payı (m)', () => 10]] },
  dc: { ad: 'DC kablo', kat: 'GES-DC-KABLO', renk: 5, alan: [['kablo', 'Kablo', () => 'H1Z2Z2-K 1x6'], ['pay', 'Uç payı (m)', () => 3]] },
};
// Form diyaloğu (qdlg üzerinde): alanlar → Promise(nesne | null)
function formDlg(baslik, alanlar, deger) {
  return new Promise((res) => {
    const d = gv('qdlg'); d.querySelector('h3').textContent = baslik; const p = d.querySelector('p'); p.innerHTML = '';
    const ins = {};
    for (const [k, etiket, def] of alanlar) {
      const l = document.createElement('label'); l.className = 'gf'; l.textContent = etiket;
      const i = document.createElement('input'); i.value = deger && deger[k] !== undefined ? deger[k] : def(); l.appendChild(i); p.appendChild(l); ins[k] = i;
    }
    const box = d.querySelector('.qb'); box.innerHTML = '';
    const bitir = (ok) => { d.close(); p.innerHTML = ''; if (!ok) return res(null); const o = {}; for (const k in ins) { const v = ins[k].value.trim(); const n = parseFloat(v.replace(',', '.')); o[k] = /^-?\d+([.,]\d+)?$/.test(v) ? n : v; } res(o); };
    const b1 = document.createElement('button'); b1.className = 'gb primary'; b1.textContent = 'Tamam'; b1.onclick = () => bitir(true);
    const b2 = document.createElement('button'); b2.className = 'gb ghost'; b2.textContent = 'Vazgeç'; b2.onclick = () => bitir(false);
    box.append(b1, b2); d.oncancel = () => { p.innerHTML = ''; res(null); };
    d.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); bitir(true); } };
    d.showModal(); const f = p.querySelector('input'); if (f) f.select();
  });
}
function tsBoy(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function tsEtiket(tip, v, L) {
  if (tip === 'inv') return 'INV' + (v.no ? '-' + v.no : '') + ' · ' + fmtNum(v.kw, 0) + ' kW' + (v.model ? ' · ' + v.model : '');
  if (tip === 'tm') return 'TM' + (v.no ? '-' + v.no : '') + ' · ' + fmtNum(v.kva, 0) + ' kVA · ' + v.gerilim;
  if (tip === 'dm') return 'DM' + (v.not ? ' · ' + v.not : '');
  return TS[tip].ad.split(' ')[0].toUpperCase() + ' · ' + v.kablo + ' · L=' + fmtNum((L || 0) + (+v.pay || 0), 0) + ' m';
}
function tsSonNo(tip) { let n = 0; for (const it of S.doc.items.values()) if (it.ges && it.ges.tip === tip && it.ges.no) n = Math.max(n, it.ges.no); return n + 1; }
function tsOlcek() { return Math.max(0.6, 12 / V().s); }   // ekranda ~12 px
// ---- blok varlıkları (yerel koordinat, m) ----
const bR = (x0, y0, x1, y1, c = 256) => rectEnt(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), c);
const bL = (x0, y0, x1, y1, c = 256) => lineEnt(x0, y0, x1, y1, c);
const bC = (x, y, r, c = 256) => ({ type: 'CIRCLE', layer: '0', colorIndex: c, center: { x, y, z: 0 }, radius: r });
const bA = (x, y, r, a0, a1, c = 256) => ({ type: 'ARC', layer: '0', colorIndex: c, center: { x, y, z: 0 }, radius: r, startAngle: a0, endAngle: a1 });
const bT = (x, y, h, t, c = 256, ha = 1) => ({ type: 'TEXT', layer: '0', colorIndex: c, text: t, startPoint: { x, y, z: 0 }, endPoint: { x, y, z: 0 }, textHeight: h, rotation: 0, halign: ha, valign: 2 });
// kapı: duvar açıklığı (x0..x0+w, ön duvar y), içe açılan kanat yayı
function bKapi(o, x0, w, y, ic) { const d = ic > 0 ? 1 : -1; o.push(bL(x0, y, x0, y + d * w, 7), bA(x0, y, w, d > 0 ? 0 : -Math.PI / 2, d > 0 ? Math.PI / 2 : 0, 8)); }
// Trafo merkezi / DM köşkü — gerçek içerik: duvarlar, bölmeler, OG hücreleri, trafo + yağ çukuru, AG pano, kapılar.
// Ölçüler varsayılandır (imalatçı köşk ölçüsüyle değiştirilir); uzun kenar x ekseni, ön (kapı) cephe −y.
function tsKosk(tip, v) {
  let adp = null; const o = [], t = 0.12, W = +v.en || 2.5, n = Math.max(1, Math.round(+v.hucre || (tip === 'dm' ? 5 : 3)));
  const kva = +v.kva || 0, harici = tip === 'tm' && kva >= 2500;
  const wOG = Math.max(1.6, n * 0.5 + 0.6), wAG = tip === 'dm' ? 1.6 : 1.4;
  const wTR = tip === 'tm' && !harici ? (kva <= 630 ? 1.8 : kva <= 1250 ? 2.2 : 2.6) : 0;
  const bol = [['OG HÜCRE', wOG]]; if (wTR) bol.push(['TRAFO', wTR]); bol.push([tip === 'dm' ? 'KUMANDA / SCADA' : 'AG PANO', wAG]);
  const L = t * (bol.length + 1) + bol.reduce((a, b) => a + b[1], 0), x0 = -L / 2, y0 = -W / 2, y1 = W / 2;
  o.push(bR(x0, y0, x0 + L, y1, 7), bR(x0 + t, y0 + t, x0 + L - t, y1 - t, 8));
  let x = x0 + t; const hT = Math.max(0.1, W * 0.055);
  bol.forEach(([ad, w], k) => {
    if (k) o.push(bR(x - t, y0 + t, x, y1 - t, 7));
    o.push(bT(x + w / 2, y1 - t - hT * 1.2, hT, ad, 7));
    if (ad === 'OG HÜCRE') {
      const cw = (w - 0.3) / n;
      for (let i = 0; i < n; i++) { const cx = x + 0.15 + i * cw; o.push(bR(cx + 0.02, y1 - t - 0.85 - hT * 2.4, cx + cw - 0.02, y1 - t - hT * 2.4, 1), bT(cx + cw / 2, y1 - t - hT * 2.4 - 0.45, hT * 0.8, 'H-' + String(i + 1).padStart(2, '0'), 1)); }
      bKapi(o, x + 0.2, 0.9, y0 + t, 1);
    } else if (ad === 'TRAFO') {
      const m = 0.25; o.push(bR(x + m - 0.1, y0 + t + 0.2, x + w - m + 0.1, y1 - t - hT * 2.6, 8));
      o.push(bR(x + m, y0 + t + 0.35, x + w - m, y1 - t - hT * 2.8, 30), bC(x + w / 2 - 0.22, (y0 + y1) / 2, 0.32, 30), bC(x + w / 2 + 0.22, (y0 + y1) / 2, 0.32, 30));
      o.push(bT(x + w / 2, y0 + t + 0.25 + hT, hT * 0.85, 'TR ' + kva + ' kVA', 30), bT(x + w / 2, (y0 + y1) / 2 - 0.5, hT * 0.7, 'yağ çukuru', 8));
      bKapi(o, x + 0.15, Math.min(1.6, w - 0.3), y0 + t, 1);
    } else {
      adp = [x + w / 2, y1 - t - hT * 2.4 - 0.6];   // AC kablo bağlantı noktası: ADP alt kenarı
      o.push(bR(x + 0.15, y1 - t - hT * 2.4 - 0.6, x + w - 0.15, y1 - t - hT * 2.4, 3), bT(x + w / 2, y1 - t - hT * 2.4 - 0.3, hT * 0.8, tip === 'dm' ? 'SCADA / AKÜ' : 'ADP', 3));
      bKapi(o, x + 0.2, 0.9, y0 + t, 1);
    }
    x += w + t;
  });
  if (harici) {   // ≥ 2500 kVA: harici trafo, yağ çukuru ve çit binanın yanında (esas D)
    const ex = x0 + L + 1.2, tw = 2.6, th = 2.2;
    o.push(bR(ex, -th / 2, ex + tw, th / 2, 30), bC(ex + tw / 2 - 0.35, 0, 0.5, 30), bC(ex + tw / 2 + 0.35, 0, 0.5, 30), bR(ex - 0.4, -th / 2 - 0.4, ex + tw + 0.4, th / 2 + 0.4, 8), bR(ex - 1.0, -th / 2 - 1.0, ex + tw + 1.0, th / 2 + 1.0, 3));
    o.push(bT(ex + tw / 2, th / 2 + 1.25, hT, 'TR ' + kva + ' kVA (harici) · yağ çukuru · çit', 30));
  }
  const ad = tip === 'dm' ? 'DM' + (v.not ? ' · ' + v.not : '') : 'TM-' + v.no + ' · ' + fmtNum(kva, 0) + ' kVA · ' + v.gerilim;
  o.push(bT(0, y1 + hT * 2.2, hT * 1.6, ad, 30), bT(0, y0 - hT * 2.2, hT, fmtNum(L, 2) + ' × ' + fmtNum(W, 2) + ' m · ' + n + ' OG hücre', 8));
  return { ents: o, L: L + (harici ? 4.8 : 0), W, adp };
}
function tsInvBlok(v) {
  const o = [], a = 0.6, b = 0.4;
  o.push(bR(-a, -b, a, b, 6), bL(-a, -b, a, b, 6), bT(0, b + 0.35, 0.3, 'INV-' + v.no + ' · ' + fmtNum(+v.kw, 0) + ' kW', 6), bT(0, -b - 0.3, 0.22, v.model || '', 8));
  return { ents: o, L: 2 * a, W: 2 * b };
}
function tsBlok(tip, v, eski) {
  const B = tip === 'inv' ? tsInvBlok(v) : tsKosk(tip, v);
  const ad = 'AE_' + tip.toUpperCase() + '_' + (tip === 'tm' ? (+v.kva || 0) + 'kVA' : tip === 'inv' ? (+v.kw || 0) + 'kW' : 'X') + '_' + (eski || newId());
  setBlock(ad, B.ents); return { ad, ...B };
}
// yerleştir: merkez → (TM/DM) uzun kenar yönü → blok
async function tsNokta(tip) {
  const T = TS[tip]; const v = await formDlg(T.ad + ' ekle', T.alan); if (!v) return;
  v.no = tip === 'dm' ? null : tsSonNo(tip);
  if (tip === 'tm' && !v.gerilim) v.gerilim = (+v.kva || 0) > 2000 ? '33/0,8 kV' : '33/0,4 kV';
  for (;;) {
    const B = tsBlok(tip, v);
    const p = await getPoint(T.ad + ' merkezi (bitirmek için Enter):', { preview: (m) => [{ pts: [[m[0] - B.L / 2, m[1] - B.W / 2], [m[0] + B.L / 2, m[1] - B.W / 2], [m[0] + B.L / 2, m[1] + B.W / 2], [m[0] - B.L / 2, m[1] + B.W / 2]], cl: true }] });
    if (!Array.isArray(p)) { S.doc.blocks.delete(B.ad); return; }
    let ang = 0;
    if (tip !== 'inv') {
      const kose = (m) => { const a = Math.atan2(m[1] - p[1], m[0] - p[0]), c = Math.cos(a), s = Math.sin(a); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [p[0] + i * B.L / 2 * c - j * B.W / 2 * s, p[1] + i * B.L / 2 * s + j * B.W / 2 * c]); };
      const q = await getPoint('Bina uzun kenarı yönü (tıklayın; kapılar uzun kenarın sağ tarafında):', { base: p, preview: (m) => [{ pts: kose(m), cl: true }, { pts: [p, m] }] });
      if (!Array.isArray(q)) { S.doc.blocks.delete(B.ad); return; }
      ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    }
    S.doc.addLayer(T.kat, T.renk);
    const it = { id: newId(), t: 'insert', layer: T.kat, c: 256, lt: '', block: B.ad, M: mMul(mT(p[0], p[1]), mRz(ang)), ap: [], ges: { ...v, tip } };
    addItems([it], T.ad.toLowerCase()); renderLayers(); msg(T.ad + ' eklendi (' + fmtNum(B.L, 2) + ' × ' + fmtNum(B.W, 2) + ' m). Taşı (M) / Döndür (RO) ile tek parça hareket eder; verisi için “Veri”.', 'res');
    if (tip === 'dm') return; v.no++;
  }
}
async function tsKablo(tip) {
  const T = TS[tip]; const v = await formDlg(T.ad + ' çiz', T.alan); if (!v) return;
  const p0 = await getPoint(T.ad + ' başlangıcı:'); if (!Array.isArray(p0)) return; const pts = [p0];
  for (;;) {
    const r = await getPoint('Sonraki nokta [Geri al(G)] — Enter: bitir · L=' + fmtNum(tsBoy(pts), 1) + ' m', { base: pts[pts.length - 1], kw: ['G'], preview: (m) => [{ pts: [...pts, m] }] });
    if (r === null || r === undefined) break; if (r.kw === 'G') { if (pts.length > 1) pts.pop(); continue; } if (!Array.isArray(r)) break; pts.push(r);
  }
  if (pts.length < 2) return;
  if (tip === 'ac') { const d = tsAcDuzelt(pts); if (d) { pts.length = 0; pts.push(...d.pts); msg('AC kablo nizami güzergâha düzeltildi: ' + d.not + '.', 'note'); } }
  const L = tsBoy(pts), g = { ...v, tip }; S.doc.addLayer(T.kat, T.renk);
  const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: pts.map((q) => [q[0], q[1], 0]), ges: g };
  const k = Math.floor(pts.length / 2), a = pts[k - 1], b = pts[k]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  const yz = { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, h: Math.max(0.6, tsOlcek() * 0.8), rot: ang, s: tsEtiket(tip, g, L), ha: 1, va: 0, gesEt: pl.id };
  addItems([pl, yz], T.ad.toLowerCase()); renderLayers(); msg(tsEtiket(tip, g, L) + ' eklendi.', 'res');
  if (tip === 'ac' || tip === 'dc') await tsKabloCogalt(tip, g, pts);
}
// ---- AC kablo nizami güzergâh: inverterden başlar, MUTLAKA trafo binasındaki AG panodan (ADP) çıkar/biter;
//      eğik ya da eksik çizim sıra eksenine (sıra açısı) paralel/dik dik açılı parçalara çevrilir, çizilen ara noktalar korunur.
function tsAdp(it) {   // TM bloğunun ADP noktası (dünya koordinatı)
  const B = tsKosk('tm', { ...it.ges, no: it.ges.no || 1 }); const a = B.adp || [0, 0], M = it.M;
  return [M[0] * a[0] + M[1] * a[1] + M[3], M[4] * a[0] + M[5] * a[1] + M[7]];
}
function tsAcDuzelt(pts) {
  if (!pts || pts.length < 2) return null;
  const inv = tsInverterler(), tms = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm');
  if (!tms.length) return null;
  const son = pts[pts.length - 1], ilk = pts[0];
  const tm = tms.reduce((a, b) => (Math.hypot(tsMerkez(b)[0] - son[0], tsMerkez(b)[1] - son[1]) < Math.hypot(tsMerkez(a)[0] - son[0], tsMerkez(a)[1] - son[1]) ? b : a));
  const A = tsAdp(tm);
  const iv = inv.length ? inv.reduce((a, b) => (Math.hypot(b.p[0] - ilk[0], b.p[1] - ilk[1]) < Math.hypot(a.p[0] - ilk[0], a.p[1] - ilk[1]) ? b : a)) : null;
  const P0 = iv && Math.hypot(iv.p[0] - ilk[0], iv.p[1] - ilk[1]) <= Math.max(6, 40 / V().s) ? iv.p : ilk;
  const th = (typeof gnum === 'function' ? gnum('g-ang', 0) : 0) * D2R, c = Math.cos(th), s = Math.sin(th);
  const toL = (p) => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], toW = (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const ara = pts.slice(1, -1).map(toL), out = [toL(P0)];
  const git = (q) => { const l = out[out.length - 1], dx = q[0] - l[0], dy = q[1] - l[1]; if (Math.abs(dx) > 1e-3 && Math.abs(dy) > 1e-3) out.push(Math.abs(dx) >= Math.abs(dy) ? [q[0], l[1]] : [l[0], q[1]]); out.push(q); };
  for (const q of ara) git(q);
  git(toL(A));
  const tem = [out[0]];   // tekrar ve doğrusal ara noktaları at
  for (let i = 1; i < out.length; i++) { const q = out[i], l = tem[tem.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) < 1e-3) continue; if (tem.length >= 2) { const k = tem[tem.length - 2]; if ((Math.abs(k[0] - l[0]) < 1e-3 && Math.abs(l[0] - q[0]) < 1e-3) || (Math.abs(k[1] - l[1]) < 1e-3 && Math.abs(l[1] - q[1]) < 1e-3)) { tem[tem.length - 1] = q; continue; } } tem.push(q); }
  return { pts: tem.map(toW), not: (iv && P0 === iv.p ? 'inverterden' : 'başlangıçtan') + ' TM-' + (tm.ges.no || '') + ' AG panosuna (ADP), dik açılı' };
}
CMD.GKDUZ = async () => {   // mevcut tüm AC kabloları nizami güzergâha getir
  const pairs = []; let n = 0;
  for (const it of [...S.doc.items.values()]) {
    if (!(it.t === 'pline' && it.ges && it.ges.tip === 'ac')) continue;
    const d = tsAcDuzelt(it.pts.map((q) => [q[0], q[1]])); if (!d) continue; n++;
    const np = { ...it, pts: d.pts.map((q) => [q[0], q[1], 0]) }; pairs.push([it, np]);
    for (const e of S.doc.items.values()) if (e.gesEt === it.id) pairs.push([e, { ...e, s: tsEtiket('ac', it.ges, tsBoy(d.pts)) }]);
  }
  if (!n) { msg('Düzeltilecek AC kablo yok (önce Trafo + ile trafo binası ekleyin).', 'err'); return; }
  replaceItems(pairs, 'kablo düzelt'); msg(n + ' AC kablo nizami güzergâha getirildi; hepsi AG panodan (ADP) çıkıyor.', 'res');
};
Object.assign(ALIAS, { GKDUZ: 'GKDUZ', KABLODUZELT: 'GKDUZ' }); Object.assign(LABEL, { GKDUZ: 'KABLO DÜZELT' });
// ---- AC/DC kabloyu diğer inverterlere çoğalt: çizilen hat ana güzergâh (trunk) sayılır; her inverter en yakın noktadan ona bağlanır ----
function tsMerkez(it) {
  if (it.t === 'insert') return [it.M[3], it.M[7]];
  if (it.t === 'pline') { const p = it.pts; return [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]; }
  return null;
}
function tsInverterler() { return [...S.doc.items.values()].filter((it) => it.ges && it.ges.tip === 'inv').map((it) => ({ it, p: tsMerkez(it) })).filter((x) => x.p); }
function tsYakin(pts, p) {   // polyline üzerinde p'ye en yakın nokta ve o noktanın segment indeksi
  let best = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0; const q = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || d < best.d) best = { d, q, i };
  }
  return best;
}
async function tsKabloCogalt(tip, g, pts) {
  const inv = tsInverterler(); if (inv.length < 2) return;
  const tol = Math.max(2.5, 15 / V().s);
  const uc = (p) => inv.find((x) => Math.hypot(x.p[0] - p[0], x.p[1] - p[1]) <= tol);
  let yol = pts.map((q) => [q[0], q[1]]); let bas = uc(yol[0]);
  if (!bas) { bas = uc(yol[yol.length - 1]); if (bas) yol = yol.reverse(); }
  if (!bas) return;                                                    // çizilen kablo bir inverterden başlamıyor
  // kablosu olan inverterler (aynı türde bir kablonun ucu inverterde)
  const bagli = new Set([bas.it.id]);
  for (const it of S.doc.items.values()) if (it.ges && it.ges.tip === tip && it.t === 'pline') { for (const p of [it.pts[0], it.pts[it.pts.length - 1]]) { const x = uc(p); if (x) bagli.add(x.it.id); } }
  const kalan = inv.filter((x) => !bagli.has(x.it.id)); if (!kalan.length) return;
  const T = TS[tip];
  const r = await askDlg(T.ad + ' — diğer inverterler', 'Çizdiğiniz hat ana güzergâh sayılsın mı? Kablosu olmayan ' + kalan.length + ' invertere de ' + T.ad + ' (' + g.kablo + ') eklenir: her inverter ana hatta en kısa yoldan bağlanır, oradan sizin güzergâhınızla aynı uca gider. Her hat ayrı kablo, boyu ayrı hesaplanır.', [['Evet, ' + kalan.length + ' invertere ekle', 'ok', 'primary'], ['Hayır', null, 'ghost']]);
  if (r !== 'ok') return;
  const yeni = []; let top = 0;
  for (const x of kalan) {
    const y = tsYakin(yol, x.p); let p2 = [x.p, y.q, ...yol.slice(y.i)]; if (tip === 'ac') { const d = tsAcDuzelt(p2); if (d) p2 = d.pts; }
    const temiz = p2.filter((q, k) => !k || Math.hypot(q[0] - p2[k - 1][0], q[1] - p2[k - 1][1]) > 1e-3); if (temiz.length < 2) continue;
    const Lx = tsBoy(temiz); top += Lx + (+g.pay || 0);
    const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: temiz.map((q) => [q[0], q[1], 0]), ges: { ...g } };
    const a = temiz[0], b = temiz[1]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
    yeni.push(pl, { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, h: Math.max(0.5, tsOlcek() * 0.7), rot: ang, s: tsEtiket(tip, g, Lx), ha: 1, va: 0, gesEt: pl.id });
  }
  if (!yeni.length) return;
  addItems(yeni, T.ad.toLowerCase() + ' çoğalt'); renderLayers();
  msg(yeni.length / 2 + ' invertere ' + T.ad + ' eklendi · toplam ' + fmtNum(top, 0) + ' m (her hat ayrı). Geri al ile tek adımda kaldırılır.', 'res');
}
// Veri düzenle: öğeye (sembol, kablo ya da etiketi) tıkla → form → veri + etiket güncellenir
CMD.GVERI = async () => {
  for (;;) {
    const p = await getPoint('Veri düzenlenecek tasarım öğesini tıklayın (Enter: bitir):'); if (!Array.isArray(p)) return;
    const q = V().w2s(p[0], p[1]); let it = pickItem(q[0], q[1], 10);
    if (it && !it.ges && it.gesEt) it = S.doc.items.get(it.gesEt);
    if (!it || !it.ges) { msg('Tasarım öğesi değil (İnverter, Trafo, DM ya da kablo seçin).', 'err'); continue; }
    const g = it.ges, T = TS[g.tip]; const v = await formDlg(T.ad + ' verisi', T.alan, g); if (!v) continue;
    const ng = { ...g, ...v }; if (ng.tip === 'tm' && !ng.gerilim) ng.gerilim = (+ng.kva || 0) > 2000 ? '33/0,8 kV' : '33/0,4 kV'; const n2 = { ...it, ges: ng }; if (it.t === 'insert') { const B = tsBlok(g.tip, ng, it.id); n2.block = B.ad; } const pairs = [[it, n2]];
    for (const e of S.doc.items.values()) if (e.gesEt === it.id) pairs.push([e, { ...e, s: tsEtiket(g.tip, ng, it.t === 'pline' ? tsBoy(it.pts) : 0) }]);
    replaceItems(pairs, 'veri'); msg(tsEtiket(g.tip, ng, it.t === 'pline' ? tsBoy(it.pts) : 0) + ' güncellendi.', 'res');
  }
};
CMD.GINVEKLE = () => tsNokta('inv'); CMD.GTMEKLE = () => tsNokta('tm'); CMD.GDMEKLE = () => tsNokta('dm');
CMD.GOGK = () => tsKablo('og'); CMD.GACK = () => tsKablo('ac'); CMD.GDCK = () => tsKablo('dc');
Object.assign(ALIAS, { GINVEKLE: 'GINVEKLE', INVEKLE: 'GINVEKLE', GTMEKLE: 'GTMEKLE', TRAFOEKLE: 'GTMEKLE', GDMEKLE: 'GDMEKLE', DMEKLE: 'GDMEKLE', GOGK: 'GOGK', OGKABLO: 'GOGK', GACK: 'GACK', ACKABLO: 'GACK', GDCK: 'GDCK', DCKABLO: 'GDCK', GVERI: 'GVERI', VERI: 'GVERI' });
Object.assign(LABEL, { GINVEKLE: 'İNVERTER EKLE', GTMEKLE: 'TRAFO EKLE', GDMEKLE: 'DM EKLE', GOGK: 'OG KABLO', GACK: 'AC KABLO', GDCK: 'DC KABLO', GVERI: 'VERİ DÜZENLE' });

// DXF'ten açılan çizimde veri etiketlerden okunur
const TASARIM_ETIKET_RE = /^(INV|TM|DM|OG|AC|DC)\b/;
function tsEtiketOku(s, kat) {
  const kw = s.match(/([\d.,]+)\s*kW\b/), kva = s.match(/([\d.,]+)\s*kVA/), L = s.match(/L=([\d.,]+)\s*m/), n = (x) => parseFloat(String(x).replace(/\./g, '').replace(',', '.'));
  if (/^INV/.test(s) && kw) return { tip: 'inv', kw: n(kw[1]) };
  if (/^TM/.test(s) && kva) return { tip: 'tm', kva: n(kva[1]) };
  if (/^DM/.test(s)) return { tip: 'dm' };
  const m = s.match(/^(OG|AC|DC) · (.+?) · L=/); if (m && L) return { tip: m[1].toLowerCase(), kablo: m[2], L: n(L[1]) };
  return null;
}
// Özet: adet × güç = toplam; trafo; kablo boyları (tip bazında). DXF'ten gelen (ges'siz) etiketler de sayılır.
let _tsSig = '';
function tasarimOzet() {
  const el = gv('g-tasozet'); if (!el || !S.doc) return;
  const inv = [], tm = [], kab = {}; let dm = 0; const veri = new Set();
  const kabEkle = (tip, kablo, L) => { const k = tip.toUpperCase() + ' · ' + kablo; kab[k] = (kab[k] || 0) + L; };
  for (const it of S.doc.items.values()) {
    const g = it.ges; if (!g) continue; veri.add(it.id);
    if (g.tip === 'inv') inv.push(+g.kw || 0); else if (g.tip === 'tm') tm.push(+g.kva || 0); else if (g.tip === 'dm') dm++;
    else if (it.t === 'pline') kabEkle(g.tip, g.kablo, tsBoy(it.pts) + (+g.pay || 0));
  }
  for (const it of S.doc.items.values()) {                    // DXF'ten açılmış bloklar: blok adından (AE_TM_1250kVA_…, AE_INV_110kW_…)
    if (it.t !== 'insert' || it.ges) continue; const m = /^AE_(TM|INV|DM)_([\d.]+)?/.exec(it.block || ''); if (!m) continue;
    if (m[1] === 'TM') tm.push(+m[2] || 0); else if (m[1] === 'INV') inv.push(+m[2] || 0); else dm++;
  }
  for (const it of S.doc.items.values()) {                    // veri alanı olmayan (DXF'ten açılmış) etiketler
    if (it.t !== 'text' || (it.gesEt && veri.has(it.gesEt)) || !/^GES-(INV|TM|OG-KABLO|AC-KABLO|DC-KABLO)$/.test(it.layer) || !TASARIM_ETIKET_RE.test(it.s || '')) continue;
    const g = tsEtiketOku(it.s, it.layer); if (!g) continue;
    if (g.tip === 'inv') inv.push(g.kw); else if (g.tip === 'tm') tm.push(g.kva); else if (g.tip === 'dm') dm++; else kabEkle(g.tip, g.kablo, g.L);
  }
  const grp = (a) => { const o = {}; for (const v of a) o[v] = (o[v] || 0) + 1; return Object.keys(o).sort((x, y) => y - x).map((v) => o[v] + ' × ' + fmtNum(+v, 0)); };
  const sat = [];
  if (inv.length) sat.push(['İnverter', grp(inv).join(' + ') + ' kW = ' + fmtNum(inv.reduce((a, b) => a + b, 0), 0) + ' kW (' + inv.length + ' adet)']);
  if (tm.length) { const kva = tm.reduce((a, b) => a + b, 0), ac = inv.reduce((a, b) => a + b, 0); sat.push(['Trafo', grp(tm).join(' + ') + ' kVA = ' + fmtNum(kva, 0) + ' kVA' + (ac ? ' · yüklenme %' + fmtNum(ac / kva * 100, 0) : '')]); }
  if (dm) sat.push(['DM', dm + ' adet']);
  for (const k of Object.keys(kab).sort()) sat.push([k.split(' · ')[0] + ' kablo', k.split(' · ').slice(1).join(' · ') + ' · ' + fmtNum(kab[k], 0) + ' m']);
  el.innerHTML = ''; el.hidden = !sat.length;
  for (const [a, b] of sat) { const r = document.createElement('div'); r.innerHTML = '<span></span><b></b>'; r.firstChild.textContent = a; r.lastChild.textContent = b; el.appendChild(r); }
}
function tasarimTik() { if (!S.doc) return; const sig = S.doc.items.size + ':' + S.doc.undo.length + ':' + (S.doc.redo ? S.doc.redo.length : 0); if (sig !== _tsSig) { _tsSig = sig; tasarimOzet(); } }
