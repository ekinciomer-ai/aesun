// ---- Tasarım araçları: inverter, trafo (TM), DM, OG / AC / DC kablo — tıkla-ekle, veri yaz, kendi katmanında hesaba girsin ----
// Her öğe kendi GES katmanında durur ve verisini `ges` alanında taşır; etiketi (yazı) aynı veriyi gösterir.
// DXF'ten geri açılınca veri etiketten okunur (TASARIM_ETIKET_RE). Özet (adet × güç, kablo boyları) çizim değiştikçe güncellenir.
const SEC = {
  kw: [50, 60, 100, 110, 125, 150, 175, 196, 200, 215, 250, 300, 320, 330, 350],
  kva: [400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 3500, 4000, 5000, 5750, 6250, 6300],
  gerilim: ['33/0,4 kV', '33/0,8 kV', '34,5/0,4 kV', '34,5/0,8 kV', '31,5/0,4 kV', '31,5/0,8 kV', '15,8/0,4 kV'],
  hucreTM: [2, 3, 4, 5, 6, 7, 8], hucreDM: [3, 4, 5, 6, 7, 8, 9, 10, 12], en: [2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 3.0, 3.2, 3.5, 4.0, 4.5, 5.0, 6.0],
  boy: ['oto', 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12, 13, 14, 15, 16, 18, 20],
  og: ['3x(1x95/16) NA2XSY 36 kV', '3x(1x120/16) NA2XSY 36 kV', '3x(1x150/25) NA2XSY 36 kV', '3x(1x185/25) NA2XSY 36 kV', '3x(1x240/25) NA2XSY 36 kV', '3x(1x400/35) NA2XSY 36 kV'],
  ac: ['3x95/50 NA2XY', '3x120/70 NA2XY', '3x150/70 NA2XY', '3x185/95 NA2XY', '3x240/120 NA2XY', '3x300/150 NA2XY', '2×(3x240/120) NA2XY', '2×(3x300/150) NA2XY', '3×(3x300/150) NA2XY', '4×(3x300/150) NA2XY'],
  dc: ['H1Z2Z2-K 1x4', 'H1Z2Z2-K 1x6', 'H1Z2Z2-K 1x10'], pay: [0, 3, 5, 10, 15, 20, 30],
};
const TS = {
  inv: { ad: 'İnverter', kat: 'GES-INV', renk: 6, alan: [['kw', 'Güç (kW)', () => pn('p-inv') ?? 100, SEC.kw], ['model', 'Model', () => pv('p-invm') || '—', () => ['—', ...(pv('p-invm') ? [pv('p-invm')] : [])]]] },
  tm: { ad: 'Trafo (TM)', kat: 'GES-TM', renk: 30, alan: [['kva', 'Güç (kVA)', () => pn('p-trafo') ?? 1250, SEC.kva], ['gerilim', 'Gerilim', () => ((pn('p-trafo') ?? 1250) > 2000 ? '33/0,8 kV' : '33/0,4 kV'), SEC.gerilim], ['hucre', 'OG hücre sayısı', () => 3, SEC.hucreTM], ['boy', 'Bina boyu / uzun kenar (m)', () => 'oto', SEC.boy], ['en', 'Bina eni / kısa kenar (m)', () => 2.5, SEC.en]] },
  dm: { ad: 'DM', kat: 'GES-TM', renk: 30, alan: [['hucre', 'OG hücre sayısı (giriş+ölçü+çıkışlar)', () => 5, SEC.hucreDM], ['boy', 'Bina boyu / uzun kenar (m)', () => 'oto', SEC.boy], ['en', 'Bina eni / kısa kenar (m)', () => 2.5, SEC.en]] },
  og: { ad: 'OG kablo', kat: 'GES-OG-KABLO', renk: 1, alan: [['kablo', 'Kablo', () => pv('p-ogk') || '3x(1x120/16) NA2XSY 36 kV', SEC.og], ['pay', 'Uç payı (m)', () => 20, SEC.pay]] },
  ac: { ad: 'AC kablo', kat: 'GES-AC-KABLO', renk: 3, alan: [['kablo', 'Kablo', () => pv('p-ack') || '3x240/120 NA2XY', SEC.ac], ['pay', 'Uç payı (m)', () => 10, SEC.pay]] },
  dc: { ad: 'DC kablo', kat: 'GES-DC-KABLO', renk: 5, alan: [['kablo', 'Kablo', () => 'H1Z2Z2-K 1x6', SEC.dc], ['pay', 'Uç payı (m)', () => 3, SEC.pay]] },
};
// Form diyaloğu (qdlg üzerinde): alanlar → Promise(nesne | null)
function formDlg(baslik, alanlar, deger) {
  return new Promise((res) => {
    const d = gv('qdlg'); d.querySelector('h3').textContent = baslik; const p = d.querySelector('p'); p.innerHTML = '';
    const ins = {};
    for (const [k, etiket, def, sec] of alanlar) {
      const l = document.createElement('label'); l.className = 'gf'; l.textContent = etiket;
      const v0 = deger && deger[k] !== undefined ? deger[k] : def(); let i;
      if (sec) {   // açılır liste: yazı yazılmaz; mevcut değer listede yoksa eklenir
        i = document.createElement('select'); const ls = typeof sec === 'function' ? sec() : sec.slice();
        if (v0 !== '' && v0 !== null && !ls.some((o) => String(o) === String(v0))) ls.push(v0);
        for (const o of ls) { const op = document.createElement('option'); op.value = String(o); op.textContent = typeof o === 'number' ? fmtNum(o, o % 1 ? 1 : 0) : o; i.appendChild(op); }
        i.value = String(v0);
      } else { i = document.createElement('input'); i.value = v0; }
      l.appendChild(i); p.appendChild(l); ins[k] = i;
    }
    const box = d.querySelector('.qb'); box.innerHTML = '';
    const bitir = (ok) => { d.close(); p.innerHTML = ''; if (!ok) return res(null); const o = {}; for (const k in ins) { const v = ins[k].value.trim(); const n = parseFloat(v.replace(',', '.')); o[k] = /^-?\d+([.,]\d+)?$/.test(v) ? n : v; } res(o); };
    const b1 = document.createElement('button'); b1.className = 'gb primary'; b1.textContent = 'Tamam'; b1.onclick = () => bitir(true);
    const b2 = document.createElement('button'); b2.className = 'gb ghost'; b2.textContent = 'Vazgeç'; b2.onclick = () => bitir(false);
    if (ins.kva && ins.gerilim) ins.kva.addEventListener('change', () => { const k = +ins.kva.value; const g = ins.gerilim.value; const yeni = g.replace(/0,[48] kV$/, k > 2000 ? '0,8 kV' : '0,4 kV'); if ([...ins.gerilim.options].some((o) => o.value === yeni)) ins.gerilim.value = yeni; });
    box.append(b1, b2); d.oncancel = () => { p.innerHTML = ''; res(null); };
    d.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); bitir(true); } };
    d.showModal(); const f = p.querySelector('input, select'); if (f) f.focus();
  });
}
function tsBoy(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function tsEtiket(tip, v, L) {
  if (tip === 'inv') return 'INV' + (v.no ? '-' + v.no : '') + ' · ' + fmtNum(v.kw, 0) + ' kW' + (v.model && v.model !== '—' ? ' · ' + v.model : '');
  if (tip === 'tm') return 'TM' + (v.no ? '-' + v.no : '') + ' · ' + fmtNum(v.kva, 0) + ' kVA · ' + v.gerilim;
  if (tip === 'dm') return 'DM' + (v.not ? ' · ' + v.not : '');
  // kablo: kısa numara (görsel bütünlük); kesit, boy ve pay özellikler panelinde, özette ve metrajda
  return TS[tip].ad.split(' ')[0].toUpperCase() + '-' + (v.no || '?');
}
const KABLO_YZ = 0.45;   // kablo numarası yazı yüksekliği (m, gerçek ölçü — zoomdan bağımsız)
// kablonun başladığı inverterin numarası (yoksa sıradaki kablo numarası)
function tsKabloNo(tip, p0) { const x = tsInverterler().find((y) => Math.hypot(y.p[0] - p0[0], y.p[1] - p0[1]) <= 6); return (x && x.it.ges && x.it.ges.no) || tsSonNo(tip); }
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
  const bol = [['OG HÜCRE', wOG]]; if (wTR) bol.push(['TRAFO', wTR]); bol.push([tip === 'dm' ? 'KUMANDA / SCADA' : 'AG PANO', tip === 'dm' ? wAG : 0.8]);   // AG pano bölmesi net 80 cm (kullanıcı ölçüsü)
  const Lmin = t * (bol.length + 1) + bol.reduce((a, b) => a + b[1], 0);
  const Lb = +v.boy > 0 ? +v.boy : 0;   // kullanıcı boyu: fazla uzunluk OG ve AG/kumanda bölmelerine paylaştırılır (trafo bölmesi sabit)
  if (Lb > Lmin) { const ek = Lb - Lmin, ix = bol.map((b, k) => (b[0] === 'TRAFO' ? -1 : k)).filter((k) => k >= 0); for (const k of ix) bol[k][1] += ek / ix.length; }
  const L = Math.max(Lmin, Lb), x0 = -L / 2, y0 = -W / 2, y1 = W / 2;
  o.push(bR(x0, y0, x0 + L, y1, 7), bR(x0 + t, y0 + t, x0 + L - t, y1 - t, 8));
  let x = x0 + t; const hT = Math.max(0.1, W * 0.055);
  bol.forEach(([ad, w], k) => {
    if (k) o.push(bR(x - t, y0 + t, x, y1 - t, 7));
    o.push(bT(x + w / 2, y1 - t - hT * 1.2, w < 1.2 ? hT * 0.6 : hT, w < 1.2 && ad === 'AG PANO' ? 'AG' : ad, 7));
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
      if (tip === 'tm' && k === bol.length - 1) {
        // AG pano (kullanıcı kuralı 19.10.2026): pano binanın enine dik durur, ara duvara dayalı; kapı KISA kenarda (uç duvar), pano kapıya bakar
        const pd = 0.7, px0 = x + 0.05, yA = y0 + t + 0.25, yB = y1 - t - 0.25;   // pano eni 70 cm, ara duvara dayalı
        o.push(bR(px0, yA, px0 + pd, yB, 3), bT(px0 + pd / 2, (yA + yB) / 2, hT * 0.8, 'ADP', 3));
        adp = [px0 + pd / 2, (yA + yB) / 2];   // AC kablo bağlantı noktası: ADP
        const xo = x + w + t, dw = Math.min(0.9, W - 2 * t - 0.4), yk = (y0 + y1) / 2 - dw / 2;   // uç (kısa kenar) duvar kapısı, dışa açılır
        o.push(bL(xo, yk, xo + dw, yk, 7), bA(xo, yk, dw, 0, Math.PI / 2, 8));
      } else {
        o.push(bR(x + 0.15, y1 - t - hT * 2.4 - 0.6, x + w - 0.15, y1 - t - hT * 2.4, 3), bT(x + w / 2, y1 - t - hT * 2.4 - 0.3, hT * 0.8, tip === 'dm' ? 'SCADA / AKÜ' : 'ADP', 3));
        bKapi(o, x + 0.2, 0.9, y0 + t, 1);
      }
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
  return { ents: o, L: L + (harici ? 4.8 : 0), W, adp, kisa: Lb && Lb < Lmin ? Lmin : 0 };
}
function tsInvBlok(v) {
  const o = [], a = 0.6, b = 0.4;
  o.push(bR(-a, -b, a, b, 6), bL(-a, -b, a, b, 6), bT(0, b + 0.35, 0.3, 'INV-' + v.no + ' · ' + fmtNum(+v.kw, 0) + ' kW', 6), bT(0, -b - 0.3, 0.22, v.model && v.model !== '—' ? v.model : '', 8));
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
      const q = await getPoint('Bina uzun kenarı yönü (tıklayın) [Kenara paralel(K)]:', { base: p, kw: ['K'], preview: (m) => [{ pts: kose(m), cl: true }, { pts: [p, m] }] });
      if (q && q.kw === 'K') { const k = await kenarSec('Bina uzun kenarı hangi kenara / çizgiye paralel (tıklayın):'); if (!k) { S.doc.blocks.delete(B.ad); return; } ang = k.ang; }
      else if (!Array.isArray(q)) { S.doc.blocks.delete(B.ad); return; }
      else ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    }
    if (B.kisa) msg('Bina boyu ' + fmtNum(+v.boy, 1) + ' m bu hücre/trafo düzenine yetmiyor; en az ' + fmtNum(B.kisa, 2) + ' m alındı.', 'err');
    S.doc.addLayer(T.kat, T.renk);
    const it = { id: newId(), t: 'insert', layer: T.kat, c: 256, lt: '', block: B.ad, M: mMul(mT(p[0], p[1]), mRz(ang)), ap: [], ges: { ...v, tip } };
    addItems([it], T.ad.toLowerCase()); renderLayers(); msg(T.ad + ' eklendi (' + fmtNum(B.L, 2) + ' × ' + fmtNum(B.W, 2) + ' m). Taşı (M) / Döndür (RO) ile tek parça hareket eder; verisi için “Veri”.', 'res');
    if (tip !== 'inv') tsBinaMasaTemizle([it]);
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
  if (tip === 'og') { const d = tsOgDuzelt(pts); if (d) { pts.length = 0; pts.push(...d.pts); msg('OG kablo nizami güzergâha düzeltildi: ' + d.not + '.', 'note'); } }
  const L = tsBoy(pts), g = { ...v, tip, no: tsKabloNo(tip, pts[0]) }; S.doc.addLayer(T.kat, T.renk);
  const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: pts.map((q) => [q[0], q[1], 0]), ges: g };
  const k = Math.floor(pts.length / 2), a = pts[k - 1], b = pts[k]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  const yz = { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, h: KABLO_YZ, rot: ang, s: tsEtiket(tip, g, L), ha: 1, va: 0, gesEt: pl.id };
  addItems([pl, yz], T.ad.toLowerCase()); renderLayers(); msg(tsEtiket(tip, g, L) + ' eklendi · ' + g.kablo + ' · L=' + fmtNum(L + (+g.pay || 0), 0) + ' m.', 'res');
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
  // Güzergâh (esas A.2 + kullanıcı kuralı 19.10.2026): kablo 1 m genişlikte bir kanal içinde gider — masa, inverter ve binaya
  // en az 0,5 m, arazi sınırına en az 0,5 m; arazi dışına çıkmaz. Çizilen güzergâh (eğik/düz) uygunsa aynen korunur;
  // uygun olmayan parça engelsiz, en az kırıklı yolla (8 yönlü arama + dönüş cezası + doğrultma) değiştirilir.
  const eng = tsEngeller(tm, iv && iv.it);
  const U0 = [P0, ...pts.slice(1, -1), A];
  const K = tsKanalIzgara(U0, eng, P0, A); if (!K) return { pts: U0, not: 'güzergâh alanı çok büyük, elle kontrol edin' };
  const U = [P0, ...pts.slice(1, -1).filter((q) => !K.dolu(q)), A];
  const yol = [P0]; let dz = 0, bulunamadi = 0;
  for (let i = 1; i < U.length; i++) {
    const a = yol[yol.length - 1], b = U[i];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-3) continue;
    if (K.gorur(a, b)) { yol.push(b); continue; }
    const r = K.yol(a, b);
    if (r && r.length >= 2) { yol.push(...r.slice(1)); dz++; } else { yol.push(b); bulunamadi++; }
  }
  const sad = [yol[0]];
  for (let i = 1; i < yol.length; i++) { const q = yol[i], z = sad[sad.length - 1]; if (Math.hypot(q[0] - z[0], q[1] - z[1]) < 0.05) continue; if (sad.length >= 2) { const k = sad[sad.length - 2], cr = (z[0] - k[0]) * (q[1] - z[1]) - (z[1] - k[1]) * (q[0] - z[0]); if (Math.abs(cr) < 1e-3 * Math.hypot(q[0] - k[0], q[1] - k[1])) { sad[sad.length - 1] = q; continue; } } sad.push(q); }
  return { pts: sad, not: (iv && P0 === iv.p ? 'inverterden' : 'başlangıçtan') + ' TM-' + (tm.ges.no || '') + ' AG panosuna (ADP), 1 m kanal içinde (masa/inverter/sınıra ≥ 0,5 m)' + (dz ? ', ' + dz + ' parça en az kırıkla yeniden yönlendirildi' : ', çizdiğiniz güzergâh korundu') + (bulunamadi ? ' (' + bulunamadi + ' parçada engelsiz yol bulunamadı — elle kontrol edin)' : '') };
}
// AC kanal ağı (kullanıcı kuralı 19.10.2026): kablolar dal budak ayrı gitmez. Ana hat (en uzak inverterden ADP'ye) tek kanal;
// diğer her inverter kanala en kısa (dik) branşmanla girer, oradan ana hatla aynı güzergâhta ADP'ye gider. Hatlar üst üste tek kanal görünür.
function tsAcAg(kalan, A, tm, tohum) {
  const eng = tsEngeller(tm, null).filter((e) => !(e.it.ges && e.it.ges.tip === 'inv') || !kalan.some((x) => x.it === e.it));
  const tum = [...kalan.map((x) => x.p), A, ...(tohum || []).flat()];
  const K = tsKanalIzgara(tum, eng, kalan.length ? kalan[0].p : A, A, kalan.map((x) => x.p)); if (!K) return null;
  const ag = (tohum || []).map((y) => y.map((q) => [q[0], q[1]])), out = new Map();
  const sirali = kalan.slice().sort((a, b) => Math.hypot(b.p[0] - A[0], b.p[1] - A[1]) - Math.hypot(a.p[0] - A[0], a.p[1] - A[1]));
  for (const x of sirali) {
    let yol;
    if (!ag.length) { const r = K.gorur(x.p, A) ? [x.p, A] : K.yol(x.p, A); yol = r || [x.p, A]; }
    else {
      let best = null; for (const y of ag) { const t = tsYakin(y, x.p); if (t && (!best || t.d < best.t.d)) best = { y, t }; }
      const q = best.t.q, kuyruk = [q, ...best.y.slice(best.t.i)];
      const br = K.gorur(x.p, q) ? [x.p, q] : (K.yol(x.p, q) || [x.p, q]);
      yol = [...br.slice(0, -1), ...kuyruk];
    }
    const sad = [yol[0]]; for (let i = 1; i < yol.length; i++) if (Math.hypot(yol[i][0] - sad[sad.length - 1][0], yol[i][1] - sad[sad.length - 1][1]) > 0.05) sad.push(yol[i]);
    out.set(x.it.id, sad); ag.push(sad);
  }
  return out;
}
// AC kablo etiketi: hattın kendine ait (kanala girmeden önceki) parçasına
function tsEtiketYeri(yol, ag) {
  let k = 0; for (let i = 0; i < yol.length - 1; i++) { const m = [(yol[i][0] + yol[i + 1][0]) / 2, (yol[i][1] + yol[i + 1][1]) / 2]; if (ag.some((y) => y !== yol && (tsYakin(y, m) || { d: 9 }).d < 0.05)) break; k = i; }
  const a = yol[k], b = yol[k + 1]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, rot: ang };
}
// OG kablo (kullanıcı kuralı 19.10.2026): AC ile aynı mantık — binadan (TM/DM) binaya, 1 m kanal içinde, arazi içinde,
// masa/inverter/diğer binalara ≥ 0,5 m, en az kırıkla; çizilen güzergâhın uyan parçası korunur.
function tsOgDuzelt(pts) {
  if (!pts || pts.length < 2) return null;
  const bin = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && (it.ges.tip === 'tm' || it.ges.tip === 'dm'));
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const yak = (p) => (bin.length ? bin.reduce((a, b) => (d(tsMerkez(b), p) < d(tsMerkez(a), p) ? b : a)) : null);
  const b0 = yak(pts[0]), b1 = yak(pts[pts.length - 1]);
  const P0 = b0 && d(tsMerkez(b0), pts[0]) <= 15 ? tsMerkez(b0) : pts[0], A = b1 && d(tsMerkez(b1), pts[pts.length - 1]) <= 15 ? tsMerkez(b1) : pts[pts.length - 1];
  const eng = tsEngeller(null, null).filter((e) => e.it !== b0 && e.it !== b1);
  const U0 = [P0, ...pts.slice(1, -1), A];
  const K = tsKanalIzgara(U0, eng, P0, A); if (!K) return null;
  const U = [P0, ...pts.slice(1, -1).filter((q) => !K.dolu(q)), A];
  const yol = [P0]; let dz = 0, yok = 0;
  for (let i = 1; i < U.length; i++) {
    const a = yol[yol.length - 1], b = U[i]; if (d(a, b) < 1e-3) continue;
    if (K.gorur(a, b)) { yol.push(b); continue; }
    const r = K.yol(a, b); if (r && r.length >= 2) { yol.push(...r.slice(1)); dz++; } else { yol.push(b); yok++; }
  }
  const sad = [yol[0]]; for (let i = 1; i < yol.length; i++) if (d(yol[i], sad[sad.length - 1]) > 0.05) sad.push(yol[i]);
  const ad = (b) => (b ? (b.ges.tip === 'dm' ? 'DM' : 'TM-' + (b.ges.no || '')) : 'uç');
  return { pts: sad, not: ad(b0) + ' → ' + ad(b1) + ', 1 m kanal içinde (≥ 0,5 m), arazi içinde' + (dz ? ', ' + dz + ' parça en az kırıkla yönlendirildi' : ', çizdiğiniz güzergâh korundu') + (yok ? ' (' + yok + ' parçada engelsiz yol yok — elle kontrol edin)' : '') };
}
// Trafo/DM binası (kullanıcı kuralı 19.10.2026): binaya denk gelen ya da binanın gölgesinde kalan masalar yerleşimden kaldırılır.
// Gölge: bina yüksekliği / tan(güneş yüksekliği), doldurmadaki gölgesiz saat aralığında (21 Aralık), bina izinin süpürdüğü alan.
const BINA_H = 3.51, BINA_PAY = 1.0;   // m — referans köşk yüksekliği (Zorlu) ve binaya en az açıklık
function tsBinaIz(it) {
  const bb = tsBlokBB(it.block), M = it.M; if (!bb) return null;
  return [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(([x, y]) => [M[0] * x + M[1] * y + M[3], M[4] * x + M[5] * y + M[7]]);
}
function tsHull(P) {
  const a = P.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); if (a.length < 3) return a;
  const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]); const lo = [], up = [];
  for (const p of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of a.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function tsGolge(iz, H) {
  const lat = (typeof gnum === 'function' ? gnum('g-lat', 39) : 39) * D2R, del = -23.44 * D2R; const hv = gv('g-hrs') ? parseFloat(gv('g-hrs').value) : 3; const W = (isFinite(hv) ? hv : 3) * 15;
  const pts = iz.slice();
  for (let w = -W; w <= W + 1e-9; w += 5) {
    const om = w * D2R, sa = Math.sin(lat) * Math.sin(del) + Math.cos(lat) * Math.cos(del) * Math.cos(om); if (sa <= 0.02) continue;
    const al = Math.asin(sa), psi = Math.asin(Math.max(-1, Math.min(1, Math.cos(del) * Math.sin(om) / Math.cos(al)))), L = H / Math.tan(al);
    for (const q of iz) pts.push([q[0] + Math.sin(psi) * L, q[1] + Math.cos(psi) * L]);   // gölge güneşin tersine: kuzey, öğleden sonra kuzeydoğu
  }
  return tsHull(pts);
}
function tsPolyKes(A, B) {   // iki çokgen kesişiyor mu (köşe içeride ya da kenar kesişimi)
  if (A.some((p) => tsIcinde(p, B)) || B.some((p) => tsIcinde(p, A))) return true;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) { const a = A[i], b = A[(i + 1) % A.length], c = B[j], d = B[(j + 1) % B.length]; if (segInt(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1])) return true; }
  return false;
}
function tsMasaIz(it) {
  if (it.t === 'insert') { const r = itemBB(S.doc, it); const bb = tsBlokBB(it.block), M = it.M; if (bb) return [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(([x, y]) => [M[0] * x + M[1] * y + M[3], M[4] * x + M[5] * y + M[7]]); return isFinite(r[0]) ? [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]] : null; }
  if (it.t === 'pline' && it.pts && it.pts.length >= 3) return it.pts.map((q) => [q[0], q[1]]);
  return null;
}
function tsBinaMasaTemizle(binalar) {
  const sil = new Map(); let ust = 0, golge = 0;
  for (const b of binalar) {
    const iz = tsBinaIz(b); if (!iz) continue;
    const c = iz.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0]);
    const pay = iz.map((q) => { const dx = q[0] - c[0], dy = q[1] - c[1], L = Math.hypot(dx, dy) || 1; return [q[0] + dx / L * BINA_PAY * 1.42, q[1] + dy / L * BINA_PAY * 1.42]; });
    const gl = tsGolge(iz, BINA_H);
    for (const it of S.doc.items.values()) {
      if (String(it.layer).toUpperCase() !== 'GES-MASA' || sil.has(it.id)) continue; const P = tsMasaIz(it); if (!P) continue;
      if (tsPolyKes(P, pay)) { sil.set(it.id, it); ust++; } else if (tsPolyKes(P, gl)) { sil.set(it.id, it); golge++; }
    }
  }
  if (!sil.size) return 0;
  replaceItems([...sil.values()].map((it) => [it, null]), 'bina masaları'); renderLayers();
  if (G.fillIds) G.fillIds = G.fillIds.filter((id) => !sil.has(id));
  msg('Trafo/DM binası: ' + sil.size + ' masa kaldırıldı (' + ust + ' binaya denk geliyordu, ' + golge + ' gölgede kalıyordu; bina h ' + fmtNum(BINA_H, 2) + ' m, gölgesiz saat aralığı). Geri al ile döner.', 'note');
  return sil.size;
}
CMD.GBTEMIZ = () => {   // taşıma/döndürmeden sonra: tüm trafo/DM binaları için
  const b = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && (it.ges.tip === 'tm' || it.ges.tip === 'dm'));
  if (!b.length) { msg('Trafo/DM binası yok.', 'err'); return; }
  if (!tsBinaMasaTemizle(b)) msg('Binalara denk gelen ya da gölgesinde kalan masa yok.', 'res');
};
Object.assign(ALIAS, { GBTEMIZ: 'GBTEMIZ', BINAMASA: 'GBTEMIZ' }); Object.assign(LABEL, { GBTEMIZ: 'BİNA MASA TEMİZLE' });
// 1 m kanal ızgarası: engeller 0,5 m şişirilir, arazi dışı ve sınıra 0,5 m'den yakın hücreler dolu; inverter çıkışı ve ADP çevresi açık
function tsKanalIzgara(U, eng, P0, A, ekAc) {
  const c = 0.5, xs = U.map((q) => q[0]), ys = U.map((q) => q[1]);
  let X0 = Math.min(...xs) - 40, X1 = Math.max(...xs) + 40, Y0 = Math.min(...ys) - 40, Y1 = Math.max(...ys) + 40;
  const B = G.bound && G.bound.length >= 3 ? G.bound : null;
  if (B) { X0 = Math.max(X0, Math.min(...B.map((q) => q[0])) - 1); X1 = Math.min(X1, Math.max(...B.map((q) => q[0])) + 1); Y0 = Math.max(Y0, Math.min(...B.map((q) => q[1])) - 1); Y1 = Math.min(Y1, Math.max(...B.map((q) => q[1])) + 1); }
  let h = 0.25; while (((X1 - X0) / h + 1) * ((Y1 - Y0) / h + 1) > 1.2e6) h *= 1.25;
  if (h > 1.0) return null;
  const nx = Math.ceil((X1 - X0) / h) + 1, ny = Math.ceil((Y1 - Y0) / h) + 1, blk = new Uint8Array(nx * ny);
  const cx = (i) => X0 + i * h, cy = (j) => Y0 + j * h;
  const dSeg = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2)) : 0; return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy); };
  const isar = (P, r) => {   // çokgen içi + r bandı dolu
    const bx0 = Math.max(0, Math.floor((Math.min(...P.map((q) => q[0])) - r - X0) / h)), bx1 = Math.min(nx - 1, Math.ceil((Math.max(...P.map((q) => q[0])) + r - X0) / h));
    const by0 = Math.max(0, Math.floor((Math.min(...P.map((q) => q[1])) - r - Y0) / h)), by1 = Math.min(ny - 1, Math.ceil((Math.max(...P.map((q) => q[1])) + r - Y0) / h));
    for (let j = by0; j <= by1; j++) for (let i = bx0; i <= bx1; i++) {
      const k = j * nx + i; if (blk[k]) continue; const px = cx(i), py = cy(j);
      if (tsIcinde([px, py], P)) { blk[k] = 1; continue; }
      for (let e = 0; e < P.length; e++) if (dSeg(px, py, P[e], P[(e + 1) % P.length]) < r) { blk[k] = 1; break; }
    }
  };
  if (B) {   // arazi dışı dolu (tarama), sınır kenarına < c bandı dolu
    for (let j = 0; j < ny; j++) {
      const y = cy(j), kes = [];
      for (let e = 0; e < B.length; e++) { const a = B[e], b = B[(e + 1) % B.length]; if ((a[1] > y) !== (b[1] > y)) kes.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      kes.sort((p, q) => p - q); let k = 0;
      for (let i = 0; i < nx; i++) { const x = cx(i); while (k < kes.length && kes[k] < x) k++; if (k % 2 === 0) blk[j * nx + i] = 1; }
    }
    for (let e = 0; e < B.length; e++) { const a = B[e], b = B[(e + 1) % B.length]; isar([a, b], c); }
  }
  for (const o of eng) isar(o.P, c);
  const ac = (p, r) => { const i0 = Math.round((p[0] - X0) / h), j0 = Math.round((p[1] - Y0) / h), R = Math.ceil(r / h); for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) if (i >= 0 && j >= 0 && i < nx && j < ny && Math.hypot(i - i0, j - j0) * h <= r && (!B || tsIcinde([cx(i), cy(j)], B))) blk[j * nx + i] = 0; };
  ac(P0, 1.2); ac(A, 2.2); for (const q of ekAc || []) ac(q, 1.2);
  const hc = (p) => [Math.round((p[0] - X0) / h), Math.round((p[1] - Y0) / h)];
  const dolu = (p) => { const [i, j] = hc(p); return i < 0 || j < 0 || i >= nx || j >= ny || blk[j * nx + i] === 1; };
  const gorur = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (h * 0.4))); for (let k = 0; k <= n; k++) { const t = k / n; if (dolu([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false; } return true; };
  const yol = (a, b) => {
    const [si, sj] = hc(a), [gi, gj] = hc(b); if (si < 0 || sj < 0 || si >= nx || sj >= ny || gi < 0 || gj < 0 || gi >= nx || gj >= ny) return null;
    const D8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], N = nx * ny, INF = 1e18, TURN = 2.5;
    const dist = new Float64Array(N * 8).fill(INF), prev = new Int32Array(N * 8).fill(-1), heap = [];
    const hh = (i, j) => { const dx = Math.abs(i - gi), dy = Math.abs(j - gj); return h * (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)); };
    const push = (k, d) => { heap.push([d, k]); let x = heap.length - 1; while (x) { const p = (x - 1) >> 1; if (heap[p][0] <= heap[x][0]) break; [heap[p], heap[x]] = [heap[x], heap[p]]; x = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let x = 0; for (;;) { const a1 = 2 * x + 1, b1 = a1 + 1; let m = x; if (a1 < heap.length && heap[a1][0] < heap[m][0]) m = a1; if (b1 < heap.length && heap[b1][0] < heap[m][0]) m = b1; if (m === x) break; [heap[m], heap[x]] = [heap[x], heap[m]]; x = m; } } return t; };
    const s0 = sj * nx + si; for (let d = 0; d < 8; d++) { dist[s0 * 8 + d] = 0; push(s0 * 8 + d, hh(si, sj)); }
    const goal = gj * nx + gi; let son = -1, it = 0;
    while (heap.length && it++ < 4e6) {
      const [f, k] = pop(); const c0 = k >> 3, dir = k & 7, ci = c0 % nx, cj = (c0 - ci) / nx; if (f - hh(ci, cj) > dist[k] + 1e-9) continue;
      if (c0 === goal) { son = k; break; }
      for (let nd = 0; nd < 8; nd++) {
        const dd = Math.min((nd - dir + 8) % 8, (dir - nd + 8) % 8); if (dd > 2) continue;
        const ni = ci + D8[nd][0], nj = cj + D8[nd][1]; if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue; const nc = nj * nx + ni; if (blk[nc]) continue;
        if (nd & 1 && (blk[cj * nx + ni] || blk[nj * nx + ci])) continue;   // köşeden sıyırma yok
        const g = dist[k] + h * (nd & 1 ? Math.SQRT2 : 1) + dd * TURN, nk = nc * 8 + nd;
        if (g < dist[nk]) { dist[nk] = g; prev[nk] = k; push(nk, g + hh(ni, nj)); }
      }
    }
    if (son < 0) return null;
    const hcr = []; for (let k = son; k >= 0; k = prev[k]) hcr.push(k >> 3); hcr.reverse();
    const P = hcr.map((c1) => [cx(c1 % nx), cy(Math.floor(c1 / nx))]); P[0] = a; P[P.length - 1] = b;
    const out = [P[0]]; let i = 0;   // doğrultma: görebildiği en uzak noktaya düz git (en az kırık)
    while (i < P.length - 1) { let j = P.length - 1; while (j > i + 1 && !gorur(P[i], P[j])) j--; out.push(P[j]); i = j; }
    return out;
  };
  return { dolu, gorur, yol };
}
// Özellikler paneli: tasarım öğesi (ya da etiketi) seçiliyken verisi açılır listelerle değişir; etiket, blok ve özet/hesaplar güncellenir
function tsOzellik(box, items) {
  if (items.length !== 1) return; let it = items[0]; if (!it.ges && it.gesEt) it = S.doc.items.get(it.gesEt); if (!it || !it.ges) return;
  const g = it.ges, T = TS[g.tip]; if (!T) return;
  const h = document.createElement('div'); h.className = 'ph sub'; h.textContent = T.ad + ' verisi (hesaba girer)'; box.appendChild(h);
  for (const [k, etiket, def, sec] of T.alan) {
    const l = document.createElement('label'); l.className = 'gf'; l.textContent = etiket; let el;
    const v0 = g[k] !== undefined ? g[k] : def();
    if (sec) { el = document.createElement('select'); const ls = typeof sec === 'function' ? sec() : sec.slice(); if (!ls.some((o) => String(o) === String(v0))) ls.push(v0); for (const o of ls) { const op = document.createElement('option'); op.value = String(o); op.textContent = typeof o === 'number' ? fmtNum(o, o % 1 ? 1 : 0) : o; el.appendChild(op); } el.value = String(v0); }
    else { el = document.createElement('input'); el.value = v0; }
    el.onchange = () => {
      const cur = S.doc.items.get(it.id); if (!cur) return; const raw = el.value, n = parseFloat(String(raw).replace(',', '.'));
      const ng = { ...cur.ges, [k]: /^-?\d+([.,]\d+)?$/.test(raw) ? n : raw };
      if (ng.tip === 'tm' && k === 'kva' && /0,[48] kV$/.test(ng.gerilim || '')) ng.gerilim = ng.gerilim.replace(/0,[48] kV$/, n > 2000 ? '0,8 kV' : '0,4 kV');
      const n2 = { ...cur, ges: ng }; if (cur.t === 'insert') n2.block = tsBlok(ng.tip, ng).ad;
      const pairs = [[cur, n2]]; for (const e of S.doc.items.values()) if (e.gesEt === cur.id) pairs.push([e, { ...e, s: tsEtiket(ng.tip, ng, cur.t === 'pline' ? tsBoy(cur.pts) : 0) }]);
      replaceItems(pairs, 'veri'); V().sel = new Set([cur.id]); updateProps(); msg(T.ad + ': ' + etiket + ' → ' + raw + ' (özet ve hesaplar güncellendi).', 'res');
    };
    l.appendChild(el); box.appendChild(l);
  }
  if (it.t === 'pline') { const L = tsBoy(it.pts); const p = document.createElement('p'); p.className = 'gi'; p.textContent = 'Boy ' + fmtNum(L, 1) + ' m + uç payı ' + fmtNum(+g.pay || 0, 0) + ' m = ' + fmtNum(L + (+g.pay || 0), 0) + ' m'; box.appendChild(p); }
}
// blok sınır kutusu (yerel), önbellekli
const _bbC = new Map();
function tsBlokBB(ad) {
  if (_bbC.has(ad)) return _bbC.get(ad); const b = S.doc.blocks.get(ad); if (!b) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const ek = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const e of b.ents || []) {
    if (e.vertices) for (const v of e.vertices) ek(v.x, v.y);
    if (e.startPoint && e.type === 'LINE') { ek(e.startPoint.x, e.startPoint.y); ek(e.endPoint.x, e.endPoint.y); }
    if (e.center && e.radius) { ek(e.center.x - e.radius, e.center.y - e.radius); ek(e.center.x + e.radius, e.center.y + e.radius); }
    if (e.type === 'INSERT' && e.insertionPoint) ek(e.insertionPoint.x, e.insertionPoint.y);
  }
  const r = isFinite(x0) ? [x0, y0, x1, y1] : null; _bbC.set(ad, r); return r;
}
// Izgara üzerinde dik açılı yol (dönüş cezalı Dijkstra). Engeller: masalar (GES-MASA), inverterler (başlangıç hariç), trafo binası (ADP çevresi hariç).
// Engeller (dünya çokgeni): masalar (GES-MASA blok/polyline, doldurma ya da proje paftası), inverterler, trafo/DM binası
function tsEngeller(tm, invIt) {
  const out = [];
  for (const it of S.doc.items.values()) {
    if (it === invIt) continue; const ly = String(it.layer || '').toUpperCase();
    const masa = ly === 'GES-MASA', inv = (it.ges && it.ges.tip === 'inv') || /^GES-INV/.test(ly), bina = it === tm || (it.ges && (it.ges.tip === 'tm' || it.ges.tip === 'dm'));
    if (!masa && !inv && !bina) continue;
    let P = null;
    if (it.t === 'insert') {
      const bb = tsBlokBB(it.block), M = it.M;
      if (bb) P = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(([x, y]) => [M[0] * x + M[1] * y + M[3], M[4] * x + M[5] * y + M[7]]);
      else { const r = itemBB(S.doc, it); if (isFinite(r[0])) P = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]; }
    } else if (it.t === 'pline' && it.pts && it.pts.length >= 3) P = it.pts.map((q) => [q[0], q[1]]);
    if (P) out.push({ P, bina: it === tm, it });
  }
  return out;
}
function tsIcinde(p, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i][1] > p[1]) !== (P[j][1] > p[1]) && p[0] < (P[j][0] - P[i][0]) * (p[1] - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; }
function tsKesisir(a, b, P) {   // a–b doğru parçası çokgenin içinden geçiyor mu (kenara değme sayılmaz, ±5 cm)
  const n = 24; for (let k = 1; k < n; k++) { const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; if (tsIcinde(q, P) && tsKenarUzak(q, P) > 0.05) return true; }
  for (let i = 0; i < P.length; i++) { const c = P[i], d = P[(i + 1) % P.length]; const x = segInt(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]); if (x && x.t > 1e-3 && x.t < 1 - 1e-3 && x.u > 1e-3 && x.u < 1 - 1e-3) return true; }
  return false;
}
function tsKenarUzak(q, P) { let m = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)) : 0; m = Math.min(m, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy)); } return m; }
function tsAkilliYol(P0, A, tm, invIt, toL, toW, eng) {
  const engel = (eng || tsEngeller(tm, invIt)).map((e) => { const W = e.P.map(toL); return { r: [Math.min(...W.map((q) => q[0])), Math.min(...W.map((q) => q[1])), Math.max(...W.map((q) => q[0])), Math.max(...W.map((q) => q[1]))], bina: e.bina }; });
  const a = toL(P0), b = toL(A);
  const xs = [a[0], b[0]], ys = [a[1], b[1]]; for (const e of engel) { xs.push(e.r[0], e.r[2]); ys.push(e.r[1], e.r[3]); }
  // arama alanı: iki uç + 60 m pay (çok büyük sahada tüm engeller değil, ilgili bölge)
  const X0 = Math.max(Math.min(...xs), Math.min(a[0], b[0]) - 60), X1 = Math.min(Math.max(...xs), Math.max(a[0], b[0]) + 60) + 3;
  const Y0 = Math.max(Math.min(...ys), Math.min(a[1], b[1]) - 60), Y1 = Math.min(Math.max(...ys), Math.max(a[1], b[1]) + 60) + 3;
  const h = Math.max(0.25, Math.max(X1 - X0, Y1 - Y0) / 600), nx = Math.ceil((X1 - X0 + 6) / h) + 1, ny = Math.ceil((Y1 - Y0 + 6) / h) + 1, ox = X0 - 3, oy = Y0 - 3;
  if (nx * ny > 600000) return null;
  const blk = new Uint8Array(nx * ny); const pay = 0.1;
  for (const e of engel) {
    const i0 = Math.max(0, Math.floor((e.r[0] - pay - ox) / h)), i1 = Math.min(nx - 1, Math.ceil((e.r[2] + pay - ox) / h)), j0 = Math.max(0, Math.floor((e.r[1] - pay - oy) / h)), j1 = Math.min(ny - 1, Math.ceil((e.r[3] + pay - oy) / h));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) blk[j * nx + i] = 1;
  }
  const ci = (p) => [Math.min(nx - 1, Math.max(0, Math.round((p[0] - ox) / h))), Math.min(ny - 1, Math.max(0, Math.round((p[1] - oy) / h)))];
  const [si, sj] = ci(a), [gi, gj] = ci(b);
  const ac = (i, j, r) => { for (let y = Math.max(0, j - r); y <= Math.min(ny - 1, j + r); y++) for (let x = Math.max(0, i - r); x <= Math.min(nx - 1, i + r); x++) blk[y * nx + x] = 0; };
  ac(si, sj, Math.ceil(0.9 / h)); ac(gi, gj, Math.ceil(1.6 / h));   // inverter çıkışı ve ADP çevresi
  const N = nx * ny, D = [[1, 0], [0, 1], [-1, 0], [0, -1]], INF = 1e18, dist = new Float64Array(N * 4).fill(INF), prev = new Int32Array(N * 4).fill(-1), turnC = 6;
  const heap = []; const push = (k, d) => { heap.push([d, k]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { const a1 = 2 * i + 1, b1 = a1 + 1; let m = i; if (a1 < heap.length && heap[a1][0] < heap[m][0]) m = a1; if (b1 < heap.length && heap[b1][0] < heap[m][0]) m = b1; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
  const s0 = sj * nx + si; for (let d = 0; d < 4; d++) { dist[s0 * 4 + d] = 0; push(s0 * 4 + d, 0); }
  const goal = gj * nx + gi; let son = -1, it2 = 0;
  while (heap.length && it2++ < 3e6) {
    const [dd, k] = pop(); if (dd > dist[k]) continue; const c = k >> 2, dir = k & 3; if (c === goal) { son = k; break; }
    const ci2 = c % nx, cj = (c - ci2) / nx;
    for (let nd = 0; nd < 4; nd++) {
      if ((nd + 2) % 4 === dir) continue; const ni = ci2 + D[nd][0], nj = cj + D[nd][1]; if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
      const nc = nj * nx + ni; if (blk[nc]) continue; const nk = nc * 4 + nd, nd2 = dd + h + (nd !== dir ? turnC : 0);
      if (nd2 < dist[nk]) { dist[nk] = nd2; prev[nk] = k; push(nk, nd2); }
    }
  }
  if (son < 0) return null;
  const hucre = []; for (let k = son; k >= 0; k = prev[k]) hucre.push(k >> 2); hucre.reverse();
  const loc = hucre.map((c) => [ox + (c % nx) * h, oy + Math.floor(c / nx) * h]);
  // köşeler: yön değişen noktalar; uçlar gerçek inverter ve ADP noktasına dik bağlanır
  const kose = [a]; let l = a;
  const ekle = (q) => { const dx = q[0] - l[0], dy = q[1] - l[1]; if (Math.abs(dx) > 1e-6 && Math.abs(dy) > 1e-6) kose.push(Math.abs(dx) < Math.abs(dy) ? [q[0], l[1]] : [l[0], q[1]]); kose.push(q); l = q; };
  for (let i = 1; i < loc.length - 1; i++) { const p0 = loc[i - 1], p1 = loc[i], p2 = loc[i + 1]; if ((p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]) !== 0) ekle(p1); }
  ekle(b);
  const tem = [kose[0]];
  for (let i = 1; i < kose.length; i++) { const q = kose[i], z = tem[tem.length - 1]; if (Math.hypot(q[0] - z[0], q[1] - z[1]) < 1e-3) continue; if (tem.length >= 2) { const k = tem[tem.length - 2]; if ((Math.abs(k[0] - z[0]) < 1e-3 && Math.abs(z[0] - q[0]) < 1e-3) || (Math.abs(k[1] - z[1]) < 1e-3 && Math.abs(z[1] - q[1]) < 1e-3)) { tem[tem.length - 1] = q; continue; } } tem.push(q); }
  return tem.map(toW);
}
CMD.GKDUZ = async () => {   // tüm AC kablolar: ortak kanal ağı (ana hat + branşmanlar), hepsi AG panodan (ADP)
  const kab = [...S.doc.items.values()].filter((it) => it.t === 'pline' && it.ges && it.ges.tip === 'ac');
  const tms = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm');
  const ogVar = [...S.doc.items.values()].some((x) => x.t === 'pline' && x.ges && x.ges.tip === 'og');
  if ((!kab.length || !tms.length) && !ogVar) { msg('Düzeltilecek AC/OG kablo yok (AC için önce Trafo + ile trafo binası ekleyin).', 'err'); return; }
  const inv = tsInverterler(), pairs = []; let n = 0;
  for (const tm of tms) {
    const A = tsAdp(tm), grp = kab.filter((it) => { const e = it.pts[it.pts.length - 1]; return tms.reduce((a, b) => (Math.hypot(tsMerkez(b)[0] - e[0], tsMerkez(b)[1] - e[1]) < Math.hypot(tsMerkez(a)[0] - e[0], tsMerkez(a)[1] - e[1]) ? b : a)) === tm; });
    if (!grp.length) continue;
    const bas = grp.map((it) => { const p0 = it.pts[0]; const x = inv.length ? inv.reduce((a, b) => (Math.hypot(b.p[0] - p0[0], b.p[1] - p0[1]) < Math.hypot(a.p[0] - p0[0], a.p[1] - p0[1]) ? b : a)) : null; return { it, x: x && Math.hypot(x.p[0] - p0[0], x.p[1] - p0[1]) < 6 ? x : { it: { id: 'k' + it.id }, p: [p0[0], p0[1]] } }; });
    bas.sort((a, b) => Math.hypot(b.x.p[0] - A[0], b.x.p[1] - A[1]) - Math.hypot(a.x.p[0] - A[0], a.x.p[1] - A[1]));
    const ana = tsAcDuzelt(bas[0].it.pts.map((q) => [q[0], q[1]])); if (!ana) continue;   // en uzaktaki hat ana güzergâh (çizilen yol korunur)
    const M = tsAcAg(bas.slice(1).map((b) => b.x), A, tm, [ana.pts]) || new Map();
    const tumYol = [ana.pts, ...M.values()];
    bas.forEach((b, k) => {
      const yol = k === 0 ? ana.pts : M.get(b.x.it.id); if (!yol) return; n++;
      const ges = { ...b.it.ges, no: (b.x.it.ges && b.x.it.ges.no) || b.it.ges.no || k + 1 };
      const np = { ...b.it, pts: yol.map((q) => [q[0], q[1], 0]), ges }; pairs.push([b.it, np]);
      const e = tsEtiketYeri(yol, tumYol);
      for (const t of S.doc.items.values()) if (t.gesEt === b.it.id) pairs.push([t, { ...t, x: e.x, y: e.y, rot: e.rot, h: KABLO_YZ, s: tsEtiket('ac', ges, tsBoy(yol)) }]);
    });
  }
  for (const it of [...S.doc.items.values()].filter((x) => x.t === 'pline' && x.ges && x.ges.tip === 'og')) {   // OG: aynı kanal mantığı
    const d = tsOgDuzelt(it.pts.map((q) => [q[0], q[1]])); if (!d) continue; n++;
    pairs.push([it, { ...it, pts: d.pts.map((q) => [q[0], q[1], 0]) }]);
    const e = tsEtiketYeri(d.pts, []);
    for (const t of S.doc.items.values()) if (t.gesEt === it.id) pairs.push([t, { ...t, x: e.x, y: e.y, rot: e.rot, h: KABLO_YZ, s: tsEtiket('og', it.ges, tsBoy(d.pts)) }]);
  }
  if (!n) { msg('Düzeltilecek AC/OG kablo yok.', 'err'); return; }
  replaceItems(pairs, 'kablo düzelt'); msg(n + ' kablo ortak kanala alındı: AC ana hat + inverter branşmanları (ADP\'den), OG binadan binaya aynı kanal kuralıyla.', 'res');
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
  if (tip === 'ac') {
    const tms = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm');
    const son = yol[yol.length - 1], tm = tms.length ? tms.reduce((a, b) => (Math.hypot(tsMerkez(b)[0] - son[0], tsMerkez(b)[1] - son[1]) < Math.hypot(tsMerkez(a)[0] - son[0], tsMerkez(a)[1] - son[1]) ? b : a)) : null;
    const M = tm ? tsAcAg(kalan, tsAdp(tm), tm, [yol]) : null;
    if (M) {
      const tumYol = [yol, ...M.values()];
      for (const x of kalan) {
        const temiz = M.get(x.it.id); if (!temiz || temiz.length < 2) continue;
        const Lx = tsBoy(temiz); top += Lx + (+g.pay || 0);
        const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: temiz.map((q) => [q[0], q[1], 0]), ges: { ...g, no: (x.it.ges && x.it.ges.no) || tsSonNo(tip) } };
        const e = tsEtiketYeri(temiz, tumYol);
        yeni.push(pl, { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: e.x, y: e.y, h: KABLO_YZ, rot: e.rot, s: tsEtiket(tip, pl.ges, Lx), ha: 1, va: 0, gesEt: pl.id });
      }
      if (yeni.length) { addItems(yeni, T.ad.toLowerCase() + ' çoğalt'); renderLayers(); msg(yeni.length / 2 + ' invertere ' + T.ad + ' eklendi: ortak kanal, her inverter kanala branşmanla girer · toplam ' + fmtNum(top, 0) + ' m kablo (her hat ayrı kablo).', 'res'); }
      return;
    }
  }
  for (const x of kalan) {
    const y = tsYakin(yol, x.p); let p2 = [x.p, y.q, ...yol.slice(y.i)]; if (tip === 'ac') { const d = tsAcDuzelt(p2); if (d) p2 = d.pts; }
    const temiz = p2.filter((q, k) => !k || Math.hypot(q[0] - p2[k - 1][0], q[1] - p2[k - 1][1]) > 1e-3); if (temiz.length < 2) continue;
    const Lx = tsBoy(temiz); top += Lx + (+g.pay || 0);
    const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: temiz.map((q) => [q[0], q[1], 0]), ges: { ...g, no: (x.it.ges && x.it.ges.no) || tsSonNo(tip) } };
    const a = temiz[0], b = temiz[1]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
    yeni.push(pl, { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, h: KABLO_YZ, rot: ang, s: tsEtiket(tip, pl.ges, Lx), ha: 1, va: 0, gesEt: pl.id });
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
    const ng = { ...g, ...v }; if (ng.tip === 'tm' && !ng.gerilim) ng.gerilim = (+ng.kva || 0) > 2000 ? '33/0,8 kV' : '33/0,4 kV'; const n2 = { ...it, ges: ng }; if (it.t === 'insert') { const B = tsBlok(g.tip, ng); n2.block = B.ad; } const pairs = [[it, n2]];
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
