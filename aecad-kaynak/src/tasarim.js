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
  inv: { ad: 'İnverter', kat: 'GES-INV', renk: 6, alan: [['kw', 'Güç (kW)', () => pn('p-inv') ?? 100, SEC.kw], ['model', 'Model', () => pv('p-invm') || '—', () => ['—', ...(pv('p-invm') ? [pv('p-invm')] : [])]], ['str', 'String girişi (adet)', () => pn('p-strinv') || (typeof pjAuto === 'function' ? pjAuto().strInv : 20), () => Array.from({ length: 35 }, (_, i) => i + 6)]] },
  tm: { ad: 'Trafo (TM)', kat: 'GES-TM', renk: 30, alan: [['kva', 'Güç (kVA)', () => pn('p-trafo') ?? 1250, SEC.kva], ['gerilim', 'Gerilim', () => ((pn('p-trafo') ?? 1250) > 2000 ? '33/0,8 kV' : '33/0,4 kV'), SEC.gerilim], ['hucre', 'OG hücre sayısı', () => 3, SEC.hucreTM], ['boy', 'Bina boyu / uzun kenar (m)', () => 'oto', SEC.boy], ['en', 'Bina eni / kısa kenar (m)', () => 2.5, SEC.en]] },
  dm: { ad: 'DM', kat: 'GES-TM', renk: 30, alan: [['hucre', 'OG hücre sayısı (giriş+ölçü+çıkışlar)', () => 5, SEC.hucreDM], ['boy', 'Bina boyu / uzun kenar (m)', () => 'oto', SEC.boy], ['en', 'Bina eni / kısa kenar (m)', () => 2.5, SEC.en]] },
  og: { ad: 'OG kablo', kat: 'GES-OG-KABLO', renk: 1, alan: [['kablo', 'Kablo', () => pv('p-ogk') || '3x(1x120/16) NA2XSY 36 kV', SEC.og], ['pay', 'Uç payı (m)', () => 20, SEC.pay]] },
  ac: { ad: 'AC kablo', kat: 'GES-AC-KABLO', renk: 3, alan: [['kablo', 'Kablo', () => pv('p-ack') || '3x240/120 NA2XY', SEC.ac], ['pay', 'Uç payı (m)', () => 10, SEC.pay]] },
  dc: { ad: 'DC kablo', kat: 'GES-DC-KABLO', renk: 5, alan: [['kablo', 'Kablo', () => 'H1Z2Z2-K 1x6', SEC.dc], ['pay', 'Uç payı (m)', () => 3, SEC.pay]] },
};
// Form diyaloğu (qdlg üzerinde): alanlar → Promise(nesne | null)
function formDlg(baslik, alanlar, deger, ekler) {   // ekler: [[etiket, anahtar]] → ek düğme; sonuç o._ek = anahtar
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
    const bitir = (ok, ek) => { d.close(); p.innerHTML = ''; if (!ok) return res(null); const o = {}; if (ek) o._ek = ek; for (const k in ins) { const v = ins[k].value.trim(); const n = parseFloat(v.replace(',', '.')); o[k] = /^-?\d+([.,]\d+)?$/.test(v) ? n : v; } res(o); };
    const b1 = document.createElement('button'); b1.className = 'gb primary'; b1.textContent = 'Tamam'; b1.onclick = () => bitir(true);
    const b2 = document.createElement('button'); b2.className = 'gb ghost'; b2.textContent = 'Vazgeç'; b2.onclick = () => bitir(false);
    if (ins.kva && ins.gerilim) ins.kva.addEventListener('change', () => { const k = +ins.kva.value; const g = ins.gerilim.value; const yeni = g.replace(/0,[48] kV$/, k > 2000 ? '0,8 kV' : '0,4 kV'); if ([...ins.gerilim.options].some((o) => o.value === yeni)) ins.gerilim.value = yeni; });
    const bx = (ekler || []).map(([et, an]) => { const b = document.createElement('button'); b.className = 'gb'; b.textContent = et; b.onclick = () => bitir(true, an); return b; });
    box.append(b1, ...bx, b2); d.oncancel = () => { p.innerHTML = ''; res(null); };
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
    if (tip !== 'inv') { tsBinaMasaTemizle([it]); tsFormaYaz(); }
    else { tsInvNumarala(); await tsAcTekEkle(S.doc.items.get(it.id)); }
    if (tip === 'dm') return; v.no++;
  }
}
async function tsKablo(tip) {
  const T = TS[tip]; const v = await formDlg(T.ad + ' çiz', T.alan, null, tip === 'ac' ? [['Projedeki tüm inverterleri AG panoya bağla (otomatik)', 'oto']] : null); if (!v) return;
  if (v._ek === 'oto') { delete v._ek; return CMD.GACOTO(v); }
  const p0 = await getPoint(T.ad + ' başlangıcı:'); if (!Array.isArray(p0)) return; const pts = [p0];
  for (;;) {
    const r = await getPoint('Sonraki nokta [Geri al(G)] — bitir: Enter / sağ tık / çift tık (uç otomatik AG panoya bağlanır) · L=' + fmtNum(tsBoy(pts), 1) + ' m', { base: pts[pts.length - 1], kw: ['G'], preview: (m) => [{ pts: [...pts, m] }] });
    if (r === null || r === undefined) break; if (r.kw === 'G') { if (pts.length > 1) pts.pop(); continue; } if (!Array.isArray(r)) break; pts.push(r);
  }
  if (pts.length < 2) return;
  if (tip === 'ac') { const d = tsAcDuzelt(pts); if (d) { pts.length = 0; pts.push(...d.pts); msg('AC kablo nizami güzergâha düzeltildi: ' + d.not + '.', 'note'); } }
  if (tip === 'og') { const d = tsOgDuzelt(pts); if (d) { pts.length = 0; pts.push(...d.pts); msg('OG kablo nizami güzergâha düzeltildi: ' + d.not + '.', 'note'); } }
  const L = tsBoy(pts), g = { ...v, tip, no: tsKabloNo(tip, pts[0]) }; S.doc.addLayer(T.kat, T.renk);
  const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: pts.map((q) => [q[0], q[1], 0]), ges: g };
  const k = Math.floor(pts.length / 2), a = pts[k - 1], b = pts[k]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  const yz = { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, h: KABLO_YZ, rot: ang, s: tsEtiket(tip, g, L), ha: 1, va: 0, gesEt: pl.id };
  addItems([pl, yz], T.ad.toLowerCase()); renderLayers(); tsFormaYaz(); msg(tsEtiket(tip, g, L) + ' eklendi · ' + g.kablo + ' · L=' + fmtNum(L + (+g.pay || 0), 0) + ' m.', 'res');
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
  const serit = [];
  for (const x of kalan) {   // inverterin bağlı olduğu masa sırasına dik (derinlik yönü) iki yöne şerit
    let best = null; for (const it of S.doc.items.values()) { if (String(it.layer).toUpperCase() !== 'GES-MASA') continue; const q = tsMerkez(it); if (!q) continue; const d = Math.hypot(q[0] - x.p[0], q[1] - x.p[1]); if (d < 25 && (!best || d < best.d)) best = { d, it }; }
    const c = best && tsMasaCerceve(best.it); if (!c) continue; const Lr = c.D + 2.0;
    serit.push([x.p, [x.p[0] + c.uy[0] * Lr, x.p[1] + c.uy[1] * Lr]], [x.p, [x.p[0] - c.uy[0] * Lr, x.p[1] - c.uy[1] * Lr]]);
  }
  const K = tsKanalIzgara(tum, eng, kalan.length ? kalan[0].p : A, A, kalan.map((x) => x.p), serit); if (!K) return null;
  // Kullanıcı kuralı 19.10.2026: kanallar doğrusal; kırık yalnız ANA güzergâhta; en az kanal kazısı; dolandırma yok.
  // 1) Ağa düz (tek parça, gerekirse inverter çıkışından ≤ 2,5 m iniş) bağlanabilen inverterler: en kısa yeni kazılı olan önce.
  // 2) Hiçbiri bağlanamıyorsa en uzak inverterden ADP'ye ana hat (mevcut kanal ucuz → ağa girer), sonra 1'e dön.
  const out = new Map(), ag = [];
  for (const y of tohum || []) { const z = y.map((q) => [q[0], q[1]]); ag.push(z); K.agEkle(z); }
  // AG HAT İSTİKAMETİ (kullanıcı kuralı 19.10.2026): trafo tarafındaki sıraların masa uç köşelerinden 3 m açıktan geçen, panel alanının
  // kenarına paralel düz hat (dış zarf) — uçların 3 m
  // dışından, uçlara teğet doğru parçaları (dış zarf); trafodan en uzak inverterin sırasına kadar. İnverterler sıra açıklığından buna düz bağlanır.
  try {
    const ms = [...S.doc.items.values()].filter((it) => String(it.layer).toUpperCase() === 'GES-MASA');
    const f0 = ms.length && tsMasaCerceve(ms[0]);
    if (f0 && kalan.length && self.AC_ZARF !== false) {
      const ux = f0.ux, uy = [-ux[1], ux[0]], L_ = (p) => [p[0] * ux[0] + p[1] * ux[1], p[0] * uy[0] + p[1] * uy[1]], W_ = (q) => [q[0] * ux[0] + q[1] * uy[0], q[0] * ux[1] + q[1] * uy[1]];
      // istikamet bu köşke bağlı TÜM inverterlere göre kurulur (tek tek eklense de aynı hat — ortak kanal tutarlı kalır)
      const tumInv = (typeof tsInverterler === 'function' ? tsInverterler() : []).filter((x) => { const tms_ = [...S.doc.items.values()].filter((y) => y.t === 'insert' && y.ges && y.ges.tip === 'tm'); const en_ = tms_.reduce((a_, b_) => (Math.hypot(tsMerkez(b_)[0] - x.p[0], tsMerkez(b_)[1] - x.p[1]) < Math.hypot(tsMerkez(a_)[0] - x.p[0], tsMerkez(a_)[1] - x.p[1]) ? b_ : a_), tms_[0]); return en_ === tm; });
      const refInv = tumInv.length >= kalan.length ? tumInv : kalan;
      const Al = L_(A), invL = refInv.map((x) => L_(x.p)), cxI = invL.reduce((t, q) => t + q[0], 0) / invL.length;
      const dogu = Al[0] >= cxI;   // trafo inverterlerin hangi yanında
      // sıra uçları (yerel): masa çokgenlerini y'ye göre sıralara ayır; trafo tarafındaki uç
      const sira = [];
      for (const it of ms) { const P = tsMasaIz(it); if (!P) continue; const Q = P.map(L_); const y0 = Math.min(...Q.map((q) => q[1])), y1 = Math.max(...Q.map((q) => q[1])), x0 = Math.min(...Q.map((q) => q[0])), x1 = Math.max(...Q.map((q) => q[0])); const yc = (y0 + y1) / 2;
        let r = sira.find((z) => Math.abs(z.yc - yc) < (y1 - y0) / 2); if (!r) { r = { yc, y0, y1, x0, x1 }; sira.push(r); } else { r.x0 = Math.min(r.x0, x0); r.x1 = Math.max(r.x1, x1); r.y0 = Math.min(r.y0, y0); r.y1 = Math.max(r.y1, y1); } }
      if (sira.length >= 2) {
        const pay = 3.0, uc = sira.map((r) => [[dogu ? r.x1 + pay : r.x0 - pay, r.y0 - 0.3], [dogu ? r.x1 + pay : r.x0 - pay, r.y1 + 0.3]]).flat();
        const zarf = (pts) => {   // dış zarf: tam dışbükey zarfın TRAFO TARAFINDAKİ zinciri (en alt → en üst y)
          const H = tsHull(pts); if (H.length < 3) return pts.slice().sort((p, q) => p[1] - q[1]);
          let iLo = 0, iHi = 0; H.forEach((p, i) => { if (p[1] < H[iLo][1]) iLo = i; if (p[1] > H[iHi][1]) iHi = i; });
          const zin = (a, b) => { const o = [H[a]]; for (let i = a; i !== b; i = (i + 1) % H.length) o.push(H[(i + 1) % H.length]); return o; };
          const c1 = zin(iLo, iHi), c2 = zin(iHi, iLo).reverse(), ort = (c) => c.reduce((t, p) => t + p[0], 0) / c.length;
          return (dogu ? ort(c1) >= ort(c2) : ort(c1) <= ort(c2)) ? c1 : c2;
        };
        for (const yon of [1, -1]) {   // trafonun kuzeyi ve güneyi ayrı kollar
          const ust = invL.filter((q) => (q[1] - Al[1]) * yon > 0); if (!ust.length) continue;
          const uzak = ust.reduce((m, q) => (Math.abs(q[1] - Al[1]) > Math.abs(m[1] - Al[1]) ? q : m));
          const ylim = uzak[1] + yon * 3;   // en uzak inverterin sırasına kadar (tüm inverterler)
          // geometri o yandaki TÜM sıraların zarfından (inverter eklendikçe hat değişmez), sonra en uzak inverterin sırasında kesilir
          const icinde0 = (p) => (typeof sinirIcinde === 'function' ? sinirIcinde(W_(p)) : true);
          const kes = (H_) => { const o = []; for (let i = 0; i < H_.length; i++) { const p = H_[i]; if ((ylim - p[1]) * yon >= 0) { o.push(p); continue; } const q = H_[i - 1]; if (q) { const t = (ylim - q[1]) / ((p[1] - q[1]) || 1); o.push([q[0] + t * (p[0] - q[0]), ylim]); } break; } return o; };
          let H = null;
          { const tum = uc.filter((p) => (p[1] - Al[1]) * yon >= -2); if (tum.length >= 2) { const Ht = zarf(tum).sort((p, q) => (p[1] - q[1]) * yon); if (Ht.every(icinde0)) H = kes(Ht); } }
          if (!H || H.length < 2) { const pts = uc.filter((p) => (p[1] - Al[1]) * yon >= -2 && (ylim - p[1]) * yon >= 0); if (pts.length < 2) continue; H = zarf(pts).sort((p, q) => (p[1] - q[1]) * yon); }
          const kol = [...H.slice().reverse()].map(W_);   // uzaktan trafoya
          // her parça engelsiz olmalı; değilse o kol atlanır (ızgara yedeği çalışır)
          // engelli parça (köşk, sınır köşesi) yalnız o parçada ızgara güzergâhıyla aşılır
          // kullanıcı çizimi (19.10.2026): panellerin 3 m önünden, panel istikametine paralel DÜZ hat — yalnız masaya değmemesi ve
          // arazi içinde kalması aranır (köşk/ızgara engeli bu hattı kırmaz)
          const icinde = (p) => (typeof sinirIcinde === 'function' ? sinirIcinde(p) : true);
          let ok = kol.every(icinde);
          for (let i = 1; ok && i < kol.length; i++) if (!K.masaYok(kol[i - 1], kol[i])) ok = false;
          if (!ok) continue;
          const son = kol[kol.length - 1], bag = K.masaYok(son, A) ? [son, A] : K.yol(son, A, { duz: true });
          if (!bag) continue;
          const z = [...kol, ...bag.slice(1)]; ag.push(z); K.agEkle(z);
        }
      }
    }
  } catch (e) { }
  const kal = kalan.slice(), d = (p) => Math.hypot(p[0] - A[0], p[1] - A[1]);
  while (kal.length) {
    let en = null;
    // branşman (kullanıcı çizimi 19.10.2026): inverterden kanalın EN YAKIN noktasına tek düz çizgi (masaya değmeden); olmazsa sıra boyunca düz ışın
    if (ag.length) for (const x of kal) {
      let r = null;
      for (const y of ag) { let kl = 0; const kal_ = new Array(y.length).fill(0); for (let k = y.length - 2; k >= 0; k--) kal_[k] = kal_[k + 1] + Math.hypot(y[k + 1][0] - y[k][0], y[k + 1][1] - y[k][1]);
        for (let k = 0; k < y.length - 1; k++) { const p = y[k], q = y[k + 1], dx = q[0] - p[0], dy = q[1] - p[1], L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x.p[0] - p[0]) * dx + (x.p[1] - p[1]) * dy) / L2)), z = [p[0] + t * dx, p[1] + t * dy];
          const d_ = Math.hypot(z[0] - x.p[0], z[1] - x.p[1]), c = d_ + 0.25 * (kal_[k + 1] + Math.sqrt(L2) * (1 - t));
          if ((!r || c < r.c) && d_ <= 80 && K.masaYok(x.p, z)) r = { c, pts: [x.p, z, ...y.slice(k + 1)] }; } }
      if (!r) r = K.dal(x.p, 150);
      if (r && (!en || r.c < en.r.c)) en = { x, r };
    }
    let x, yol;
    if (en) { x = en.x; yol = en.r.pts; }
    else {
      x = kal.reduce((a, b) => (d(b.p) > d(a.p) ? b : a));
      // ağ varsa ağın en yakın noktasına (ayrı ana hat açılmaz); yoksa ADP'ye ana hat
      let hd = null;
      for (const y of ag) for (let k = 0; k < y.length - 1; k++) { const p = y[k], q = y[k + 1], dx = q[0] - p[0], dy = q[1] - p[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x.p[0] - p[0]) * dx + (x.p[1] - p[1]) * dy) / L2)), z = [p[0] + t * dx, p[1] + t * dy], dd = Math.hypot(z[0] - x.p[0], z[1] - x.p[1]); if (!hd || dd < hd.dd) hd = { dd, z, kuyruk: y.slice(k + 1) }; }
      if (hd && hd.dd > 0.5) { const r_ = K.yol(x.p, hd.z, { duz: true }); yol = r_ ? [...r_, ...hd.kuyruk] : null; }
      if (!yol) yol = K.gorur(x.p, A) && K.dik(x.p, A) ? [x.p, A] : K.yol(x.p, A, { duz: true });
    }
    kal.splice(kal.indexOf(x), 1);
    if (!yol) continue;   // güzergâh yoksa düz çizgi YOK (masa üstünden geçmez); bildirilir
    const sad = [yol[0]]; for (let i = 1; i < yol.length; i++) if (Math.hypot(yol[i][0] - sad[sad.length - 1][0], yol[i][1] - sad[sad.length - 1][1]) > 0.05) sad.push(yol[i]);
    out.set(x.it.id, sad); ag.push(sad); K.agEkle(sad);
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
// Kanal ızgarası (kullanıcı kuralı 19.10.2026): engeller 0,5 m şişirilir, arazi dışı ve sınıra 0,5 m'den yakın hücreler dolu.
// Izgara masa eksenine (sıra doğrultusu) döndürülür; yol yalnız 4 yönde (sıra boyunca / sıraya dik) gider, kırık cezalıdır ve
// açıklığın ORTASINDAN geçer (engele yakın hücre pahalı) — çapraz kesme, masa köşesine sürtünme yok; hatlar doğrusal.
function tsKanalIzgara(U, eng, P0, A, ekAc, serit) {
  let ux = [1, 0]; for (const it of S.doc.items.values()) if (String(it.layer).toUpperCase() === 'GES-MASA') { const f = tsMasaCerceve(it); if (f) { ux = f.ux; break; } }
  const cs = ux[0], sn = ux[1], Lc = (p) => [p[0] * cs + p[1] * sn, -p[0] * sn + p[1] * cs], Wc = (p) => [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs];
  U = U.map(Lc); eng = eng.map((o) => ({ ...o, P: o.P.map(Lc) })); P0 = Lc(P0); A = Lc(A); ekAc = (ekAc || []).map(Lc); serit = (serit || []).map(([a, b]) => [Lc(a), Lc(b)]);
  const c = 0.5, xs = U.map((q) => q[0]), ys = U.map((q) => q[1]);
  let X0 = Math.min(...xs) - 40, X1 = Math.max(...xs) + 40, Y0 = Math.min(...ys) - 40, Y1 = Math.max(...ys) + 40;
  // ayrık parseller: dış alan dolu değil ama pahalı (parseller arası kablo geçişi); tek parselde dış alan ve sınır bandı dolu
  const BS = (typeof sinirlar === 'function' ? sinirlar() : (G.bound ? [G.bound] : [])).filter((b) => b.length >= 3).map((b) => b.map(Lc)), B = BS.length ? BS.flat() : null, coklu = BS.length > 1;
  if (B) { X0 = Math.max(X0, Math.min(...B.map((q) => q[0])) - 1); X1 = Math.min(X1, Math.max(...B.map((q) => q[0])) + 1); Y0 = Math.max(Y0, Math.min(...B.map((q) => q[1])) - 1); Y1 = Math.min(Y1, Math.max(...B.map((q) => q[1])) + 1); }
  let h = 0.25; while (((X1 - X0) / h + 1) * ((Y1 - Y0) / h + 1) > 4e6) h *= 1.15;
  if (h > 1.0) return null;
  const nx = Math.ceil((X1 - X0) / h) + 1, ny = Math.ceil((Y1 - Y0) / h) + 1, N = nx * ny, blk = new Uint8Array(N), dis = new Uint8Array(N);
  const cx = (i) => X0 + i * h, cy = (j) => Y0 + j * h;
  const dSeg = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2)) : 0; return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy); };
  const isar = (P, r) => {
    const bx0 = Math.max(0, Math.floor((Math.min(...P.map((q) => q[0])) - r - X0) / h)), bx1 = Math.min(nx - 1, Math.ceil((Math.max(...P.map((q) => q[0])) + r - X0) / h));
    const by0 = Math.max(0, Math.floor((Math.min(...P.map((q) => q[1])) - r - Y0) / h)), by1 = Math.min(ny - 1, Math.ceil((Math.max(...P.map((q) => q[1])) + r - Y0) / h));
    for (let j = by0; j <= by1; j++) for (let i = bx0; i <= bx1; i++) {
      const k = j * nx + i; if (blk[k]) continue; const px = cx(i), py = cy(j);
      if (tsIcinde([px, py], P)) { blk[k] = 1; continue; }
      for (let e = 0; e < P.length; e++) if (dSeg(px, py, P[e], P[(e + 1) % P.length]) < r) { blk[k] = 1; break; }
    }
  };
  if (B) {
    for (let j = 0; j < ny; j++) {
      const y = cy(j), kes = [];
      for (const R of BS) for (let e = 0; e < R.length; e++) { const a = R[e], b = R[(e + 1) % R.length]; if ((a[1] > y) !== (b[1] > y)) kes.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      kes.sort((p, q) => p - q); let k = 0;
      for (let i = 0; i < nx; i++) { const x = cx(i); while (k < kes.length && kes[k] < x) k++; if (k % 2 === 0) { if (coklu) dis[j * nx + i] = 1; else blk[j * nx + i] = 1; } }
    }
    if (!coklu) for (const R of BS) for (let e = 0; e < R.length; e++) { const a = R[e], b = R[(e + 1) % R.length]; isar([a, b], c); }
  }
  for (const o of eng) isar(o.P, c);
  const ac = (p, r) => { const i0 = Math.round((p[0] - X0) / h), j0 = Math.round((p[1] - Y0) / h), R = Math.ceil(r / h); for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) if (i >= 0 && j >= 0 && i < nx && j < ny && Math.hypot(i - i0, j - j0) * h <= r && (!B || coklu || BS.some((R) => tsIcinde([cx(i), cy(j)], R)))) blk[j * nx + i] = 0; };
  ac(P0, 1.2); ac(A, 2.2); for (const q of ekAc) ac(q, 1.2);
  for (const [a, b] of serit) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / (h * 0.5)); for (let k = 0; k <= n; k++) { const t = k / n, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t, i = Math.round((px - X0) / h), j = Math.round((py - Y0) / h); if (i >= 0 && j >= 0 && i < nx && j < ny && !eng.some((o) => o.it && String(o.it.layer).toUpperCase() === 'GES-MASA' && tsIcinde([px, py], o.P))) blk[j * nx + i] = 0; } }
  // engele uzaklık (hücre, 4 komşu): açıklığın ortası tercih edilir
  const ak = new Float32Array(N); for (let k = 0; k < N; k++) ak[k] = blk[k] ? 0 : 1e9;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (!ak[k]) continue; let v = ak[k]; if (i) v = Math.min(v, ak[k - 1] + 1); if (j) v = Math.min(v, ak[k - nx] + 1); ak[k] = v; }
  for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; if (!ak[k]) continue; let v = ak[k]; if (i < nx - 1) v = Math.min(v, ak[k + 1] + 1); if (j < ny - 1) v = Math.min(v, ak[k + nx] + 1); ak[k] = v; }
  const ORTA = 1.6, KO = 1.5, TURN = 4.0, NETC = 0.15;   // m: bu açıklığın altında engele yaklaşmak cezalı; kırık başına ceza; mevcut kanalda adım ucuz (yeni kazı yok)
  // kanal ağı maskesi: hücre → (hat no + 1, parça no). En az kazı: yeni hat mevcut kanala girer, branşman kanala DÜZ (kırıksız) bağlanır.
  const netL = new Int32Array(N), netS = new Int32Array(N), hatlar = [], kalan_ = [];
  const agEkle = (yW) => {
    const li = hatlar.length; hatlar.push(yW); const y = yW.map(Lc);
    const kl = new Array(yW.length).fill(0); for (let k = yW.length - 2; k >= 0; k--) kl[k] = kl[k + 1] + Math.hypot(yW[k + 1][0] - yW[k][0], yW[k + 1][1] - yW[k][1]); kalan_.push(kl);
    for (let k = 0; k < y.length - 1; k++) { const a = y[k], b = y[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (h * 0.5))); for (let u = 0; u <= n; u++) { const [i, j] = hc([a[0] + (b[0] - a[0]) * u / n, a[1] + (b[1] - a[1]) * u / n]); if (i >= 0 && j >= 0 && i < nx && j < ny && !netL[j * nx + i]) { netL[j * nx + i] = li + 1; netS[j * nx + i] = k; } } }
  };
  // düz branşman: inverterden 4 yönde ışın; ya da inverter çıkışından açıklığa ≤ 2,5 m iniş + sıra boyunca tek düz hat. İlk kanal hücresinde durur.
  const dal = (pW, maxL) => {
    const p = Lc(pW); let en = null; const R = Math.round(2.5 / h), K2 = Math.round((maxL || 150) / h);
    for (let o = -R; o <= R; o++) {
      const sP = [p[0], p[1] + o * h], so = Math.abs(o) * h; if (o && !gorurL(p, sP)) continue;
      const yon = o ? [[1, 0], [-1, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of yon) for (let k = 0; k <= K2; k++) {
        const q = [sP[0] + dx * k * h, sP[1] + dy * k * h], [i, j] = hc(q); if (i < 0 || j < 0 || i >= nx || j >= ny) break; const cc = j * nx + i;
        if (netL[cc]) { const li_ = netL[cc] - 1, si_ = netS[cc]; const ki = so + k * h + 0.3 * Math.max(0, ORTA - ak[hc(sP)[1] * nx + hc(sP)[0]] * h) / ORTA + 0.25 * (kalan_[li_][si_] || 0); if (!en || ki < en.c) en = { c: ki, sP, q, li: li_, si: si_, o }; break; }
        if (blk[cc]) break;
      }
    }
    if (!en) return null;
    const y = hatlar[en.li], a = y[en.si], b = y[en.si + 1], qW = Wc(en.q), dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((qW[0] - a[0]) * dx + (qW[1] - a[1]) * dy) / L2)) : 0, qq = [a[0] + dx * t, a[1] + dy * t];
    const pts = [pW]; if (en.o) pts.push(Wc(en.sP)); pts.push(qq, ...y.slice(en.si + 1));
    return { c: en.c, pts };
  };
  const hc = (p) => [Math.round((p[0] - X0) / h), Math.round((p[1] - Y0) / h)];
  const doluL = (p) => { const [i, j] = hc(p); return i < 0 || j < 0 || i >= nx || j >= ny || blk[j * nx + i] === 1; };
  const gorurL = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (h * 0.4))); for (let k = 0; k <= n; k++) { const t = k / n; if (doluL([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false; } return true; };
  const dolu = (p) => doluL(Lc(p)), gorur = (a, b) => gorurL(Lc(a), Lc(b));
  const dik = (a, b) => { const p = Lc(a), q = Lc(b); return Math.abs(p[0] - q[0]) < 0.05 || Math.abs(p[1] - q[1]) < 0.05; };
  // ana hat doğrultma (kullanıcı kuralı 19.10.2026): ana kanal merdiven olmaz — engelden ≥ 1 m açıkla görülebilen en uzak noktaya
  // tek düz çizgi (sınıra paralel / çapraz olabilir); uçlardaki 3 m'de açıklık şartı aranmaz
  // masa çokgenleriyle gerçek kesişim testi (ızgaradan bağımsız; 0,5 m pay): düz hat hiçbir masaya değmez
  const masaP = eng.filter((o) => o.it && String(o.it.layer).toUpperCase() === 'GES-MASA').map((o) => o.P);
  const masaKeser = (p, q) => { const Lpq = Math.hypot(q[0] - p[0], q[1] - p[1]); for (const P of masaP) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const v of P) { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); } if (Math.max(p[0], q[0]) < x0 - 0.5 || Math.min(p[0], q[0]) > x1 + 0.5 || Math.max(p[1], q[1]) < y0 - 0.5 || Math.min(p[1], q[1]) > y1 + 0.5) continue; const n = Math.max(2, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.25)); for (let k = 0; k <= n; k++) { const t = k / n, z = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; if (t * Lpq < 1.5 || (1 - t) * Lpq < 1.5) continue;   // uçlar (inverter masa arkasında, ADP) muaf
        if (tsIcinde(z, P)) return true; for (let e = 0; e < P.length; e++) if (dSeg(z[0], z[1], P[e], P[(e + 1) % P.length]) < 0.5) return true; } } return false; };
  const acikGorur = (a, b, uc0, uc1) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (h * 0.4))); for (let k = 0; k <= n; k++) { const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; const [i, j] = hc(q); if (i < 0 || j < 0 || i >= nx || j >= ny || blk[j * nx + i]) return false; if (Math.hypot(q[0] - uc0[0], q[1] - uc0[1]) > 3 && Math.hypot(q[0] - uc1[0], q[1] - uc1[1]) > 3 && ak[j * nx + i] * h < 1.0) return false; } return true; };
  const yol = (aW, bW, opt) => {
    const a = Lc(aW), b = Lc(bW);
    const [si, sj] = hc(a), [gi, gj] = hc(b); if (si < 0 || sj < 0 || si >= nx || sj >= ny || gi < 0 || gj < 0 || gi >= nx || gj >= ny) return null;
    const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), gy = new Uint8Array(N).fill(255), kapali = new Uint8Array(N);
    const hh = (i, j) => h * NETC * (Math.abs(i - gi) + Math.abs(j - gj));
    const hk = [], hf = [];
    const push = (k, f) => { hk.push(k); hf.push(f); let x = hk.length - 1; while (x) { const p = (x - 1) >> 1; if (hf[p] <= hf[x]) break; [hk[p], hk[x]] = [hk[x], hk[p]]; [hf[p], hf[x]] = [hf[x], hf[p]]; x = p; } };
    const pop = () => { const k = hk[0], lk = hk.pop(), lf = hf.pop(); if (hk.length) { hk[0] = lk; hf[0] = lf; let x = 0; for (;;) { const a1 = 2 * x + 1, b1 = a1 + 1; let m = x; if (a1 < hk.length && hf[a1] < hf[m]) m = a1; if (b1 < hk.length && hf[b1] < hf[m]) m = b1; if (m === x) break; [hk[m], hk[x]] = [hk[x], hk[m]]; [hf[m], hf[x]] = [hf[x], hf[m]]; x = m; } } return k; };
    const s0 = sj * nx + si, goal = gj * nx + gi; dist[s0] = 0; push(s0, hh(si, sj));
    let son = -1, it = 0;
    while (hk.length && it++ < 8e6) {
      const c0 = pop(); if (kapali[c0]) continue; kapali[c0] = 1;
      if (c0 === goal) { son = c0; break; }
      const ci = c0 % nx, cj = (c0 - ci) / nx, dir = gy[c0];
      for (let nd = 0; nd < 4; nd++) {
        if (dir !== 255 && nd === ((dir + 2) & 3)) continue;
        const ni = ci + D4[nd][0], nj = cj + D4[nd][1]; if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue; const nc = nj * nx + ni; if (blk[nc] || kapali[nc]) continue;
        const g = dist[c0] + (netL[nc] ? h * NETC : h * (1 + KO * Math.max(0, ORTA - ak[nc] * h) / ORTA) * (dis[nc] ? 3 : 1)) + (dir !== 255 && nd !== dir ? TURN : 0);
        if (g < dist[nc]) { dist[nc] = g; prev[nc] = c0; gy[nc] = nd; push(nc, g + hh(ni, nj)); }
      }
    }
    if (son < 0) return null;
    const hcr = []; for (let k = son; k >= 0; k = prev[k]) hcr.push(k); hcr.reverse();
    const C = hcr.map((c1) => [cx(c1 % nx), cy(Math.floor(c1 / nx))]);
    // uçlar: inverter/ADP noktasından ilk hücreye dik dirsek (çapraz yok)
    const P = [a];
    if (C.length) { const c0 = C[0]; if (Math.abs(c0[0] - a[0]) > 1e-3 && Math.abs(c0[1] - a[1]) > 1e-3) { const yon = C.length > 1 && Math.abs(C[1][0] - c0[0]) > 1e-6; P.push(yon ? [a[0], c0[1]] : [c0[0], a[1]]); } }
    P.push(...C);
    if (C.length) { const cl = C[C.length - 1]; if (Math.abs(cl[0] - b[0]) > 1e-3 && Math.abs(cl[1] - b[1]) > 1e-3) { const yon = C.length > 1 && Math.abs(C[C.length - 2][0] - cl[0]) > 1e-6; P.push(yon ? [b[0], cl[1]] : [cl[0], b[1]]); } }
    P.push(b);
    const out = [P[0]];   // aynı doğrultudaki ara noktaları at
    for (let i = 1; i < P.length; i++) { const q = P[i], z = out[out.length - 1]; if (Math.hypot(q[0] - z[0], q[1] - z[1]) < 1e-4) continue; if (out.length >= 2) { const k = out[out.length - 2], cr = (z[0] - k[0]) * (q[1] - z[1]) - (z[1] - k[1]) * (q[0] - z[0]); if (Math.abs(cr) < 1e-6 && (z[0] - k[0]) * (q[0] - z[0]) + (z[1] - k[1]) * (q[1] - z[1]) >= 0) { out[out.length - 1] = q; continue; } } out.push(q); }
    if (opt && opt.duz && out.length > 2 && self.AC_DUZ !== false) {   // yoğun hücre dizisi üzerinde: görülebilen en uzak hücreye tek düz çizgi
      const D = P.filter((q, k) => k === 0 || k === P.length - 1 || k % 2 === 0); const o2 = [D[0]]; let i = 0;
      // kırık sayısı öneki: çapraz düz hat yalnız MERDİVENİN (≥ 3 kırık) yerine geçer; tek/çift kırıklı dik güzergâh korunur
      const tp = [0]; for (let k = 1; k < D.length; k++) { let t = 0; if (k >= 2) { const u = [D[k - 1][0] - D[k - 2][0], D[k - 1][1] - D[k - 2][1]], v = [D[k][0] - D[k - 1][0], D[k][1] - D[k - 1][1]]; if (Math.abs(u[0] * v[1] - u[1] * v[0]) > 1e-6) t = 1; } tp.push(tp[k - 1] + t); }
      const kir = (i0, j0) => Math.max(0, tp[j0 - 1] - tp[Math.min(j0 - 1, i0 + 1)]);
      const uygun = (i0, j0) => acikGorur(D[i0], D[j0], a, b) && !masaKeser(D[i0], D[j0]);   // kullanıcı çizimi (19.10.2026): ana kanal düz çizgi, masaya değmeden
      while (i < D.length - 1) {
        let j = Math.min(D.length - 1, i + 1200);
        while (j > i + 1 && !uygun(i, j)) j -= Math.max(1, Math.floor((j - i) / 40));
        if (j <= i + 1) j = i + 1;
        o2.push(D[j]); i = j;
      }
      const o3 = [o2[0]];   // aynı doğrultudakileri birleştir
      for (let k = 1; k < o2.length; k++) { const q = o2[k], z = o3[o3.length - 1]; if (o3.length >= 2) { const kk = o3[o3.length - 2], cr = (z[0] - kk[0]) * (q[1] - z[1]) - (z[1] - kk[1]) * (q[0] - z[0]); if (Math.abs(cr) < 0.02 * Math.hypot(q[0] - kk[0], q[1] - kk[1])) { o3[o3.length - 1] = q; continue; } } o3.push(q); }
      return o3.map(Wc);
    }
    return out.map(Wc);
  };
  const duzOk = (pW, qW) => { const p = Lc(pW), q = Lc(qW); return gorurL(p, q) && !masaKeser(p, q); };
  const masaYok = (pW, qW) => !masaKeser(Lc(pW), Lc(qW));
  return { dolu, gorur, dik, yol, agEkle, dal, duzOk, masaYok };
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
CMD.GOGK = () => tsKablo('og'); CMD.GACK = () => tsKablo('ac');
// ---- DC (kullanıcı kuralı 19.10.2026): önce ATAMA — inverter seç, masalarına tıkla; her atama inverterden masaya kesikli çizgi,
// inverterde "dolu/giriş" string sayısı. Sonra "DC çiz": kesikliler kalkar, her string masa içinde 1. panelden son panele tek çizgi,
// giriş (+) / çıkış (−) üçgeni, INV{i}.PV{s}.1 / .N kodu, ortada sıra*modül; DC boyu (ev dönüşü) metraja girer.
const DC_ATA = 'GES-DC-ATAMA';
function tsMasaAt(p) { for (const it of S.doc.items.values()) { if (String(it.layer).toUpperCase() !== 'GES-MASA') continue; const P = tsMasaIz(it); if (P && tsIcinde(p, P)) return it; } return null; }
function tsMasaCerceve(it) {   // masa yerel çerçevesi: o (köşe), ux (boy yönü), uy (derinlik yönü), L, D, satır R, sütun P
  let P, R, Pn; const m = /MASA_(\d+)([VH])(\d+)_/.exec(it.block || '');
  if (m) { R = +m[1]; Pn = +m[3]; } else { const tp = typeof mainTpl === 'function' ? mainTpl() : { rows: 2, per: 13 }; R = tp.rows; Pn = tp.per; }
  P = tsMasaIz(it); if (!P || P.length < 4) return null;
  const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1]], e2 = [P[3][0] - P[0][0], P[3][1] - P[0][1]];
  const l1 = Math.hypot(...e1), l2 = Math.hypot(...e2); const [ux, L, uy, D] = l1 >= l2 ? [e1, l1, e2, l2] : [e2, l2, e1, l1];
  return { o: P[0], ux: [ux[0] / L, ux[1] / L], uy: [uy[0] / D, uy[1] / D], L, D, R, P: Pn };
}
function tsMasaStr(it) { const c = tsMasaCerceve(it); if (!c) return 1; const sm = typeof pjAuto === 'function' ? pjAuto().strMod : c.R * c.P; return Math.max(1, Math.round(c.R * c.P / sm)); }
function tsAtamalar() { const o = new Map(); for (const it of S.doc.items.values()) if (it.ges && (it.ges.tip === 'dcata' || it.ges.tip === 'dcstr') && it.ges.masa) o.set(it.ges.masa, it.ges.inv); return o; }
function tsInvDurum(invId) {
  const inv = S.doc.items.get(invId); if (!inv) return null; const at = tsAtamalar(); let dolu = 0;
  for (const [mid, iid] of at) if (iid === invId) { const m = S.doc.items.get(mid); if (m) dolu += tsMasaStr(m); }
  return { dolu, giris: +inv.ges.str || null };
}
function tsInvDurumYazi(invId, kat) {   // inverter yanında "dolu/giriş str" yazısı (tek)
  const inv = S.doc.items.get(invId); const d = tsInvDurum(invId); const pairs = [];
  for (const t of S.doc.items.values()) if (t.durumInv === invId) pairs.push([t, null]);
  if (inv && d && d.dolu) { const c = tsMerkez(inv); pairs.push([null, { id: newId(), t: 'text', layer: kat, c: d.giris && d.dolu > d.giris ? 1 : 256, lt: '', x: c[0] + 1.2, y: c[1] - 1.0, h: KABLO_YZ, rot: 0, s: d.dolu + '/' + (d.giris || '?') + ' str', ha: 0, va: 0, durumInv: invId }]); }
  return pairs;
}
function tsMasaUc(it, p) {   // masanın p'ye yakın ucunun orta noktası (masa dışında 0,3 m)
  const c = tsMasaCerceve(it); if (!c) return tsMerkez(it);
  const nok = (s, t) => [c.o[0] + c.ux[0] * s + c.uy[0] * t, c.o[1] + c.ux[1] * s + c.uy[1] * t];
  const a = nok(-0.3, c.D / 2), b = nok(c.L + 0.3, c.D / 2); return Math.hypot(a[0] - p[0], a[1] - p[1]) <= Math.hypot(b[0] - p[0], b[1] - p[1]) ? a : b;
}
// DC çıkış yönü (kullanıcı kuralı 19.10.2026): string uçları masanın AC kanalı tarafındaki ucunda toplanır — arkadan gelen DC
// kablolar ilk masayla birlikte kanala yakın yerden boruyla invertere iner. Yön: inverterin AC kablosunun ilk ~5 m'si; kablo yoksa en yakın TM.
function tsDcYon(invIt) {
  const ip = tsMerkez(invIt);
  for (const it of S.doc.items.values()) if (it.t === 'pline' && it.ges && it.ges.tip === 'ac' && Math.hypot(it.pts[0][0] - ip[0], it.pts[0][1] - ip[1]) < 6) {
    let L = 0; for (let i = 1; i < it.pts.length; i++) { L += Math.hypot(it.pts[i][0] - it.pts[i - 1][0], it.pts[i][1] - it.pts[i - 1][1]); if (L >= 5 || i === it.pts.length - 1) { const q = it.pts[i]; const d = [q[0] - ip[0], q[1] - ip[1]], n = Math.hypot(...d) || 1; return [d[0] / n, d[1] / n]; } }
  }
  const tms = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm');
  if (tms.length) { const t = tsMerkez(tms.reduce((a, b) => (Math.hypot(tsMerkez(b)[0] - ip[0], tsMerkez(b)[1] - ip[1]) < Math.hypot(tsMerkez(a)[0] - ip[0], tsMerkez(a)[1] - ip[1]) ? b : a))); const d = [t[0] - ip[0], t[1] - ip[1]], n = Math.hypot(...d) || 1; return [d[0] / n, d[1] / n]; }
  return null;
}
function tsUcBas(c, nok, ip, yon) {   // true: string 0 ucundan başlar. Çıkış yönü masa boyuna belirgin paralelse onu kullan, değilse inverterin yakın ucu.
  if (yon) { const d = yon[0] * c.ux[0] + yon[1] * c.ux[1]; if (Math.abs(d) > 0.25) return d < 0; }
  return Math.hypot(nok(0, c.D / 2)[0] - ip[0], nok(0, c.D / 2)[1] - ip[1]) <= Math.hypot(nok(c.L, c.D / 2)[0] - ip[0], nok(c.L, c.D / 2)[1] - ip[1]);
}
function tsMasaIlkPanel(it, p, yon) {   // atama çizgisi masanın 1. paneline (inverter ucundaki üst sıra ilk modül) — çizgiler üst üste binmez
  const c = tsMasaCerceve(it); if (!c) return tsMerkez(it);
  const nok = (s, t) => [c.o[0] + c.ux[0] * s + c.uy[0] * t, c.o[1] + c.ux[1] * s + c.uy[1] * t];
  const bas = tsUcBas(c, nok, p, yon);
  const dx = c.L / c.P, dy = c.D / c.R; return nok(bas ? dx / 2 : c.L - dx / 2, c.D - dy / 2);
}
// İnverter numaraları her zaman 1…n sıralı (kullanıcı kuralı 19.10.2026): silinince boşluk kapanır, eklenince sıraya girer.
// Blok yazısı, AC kablo no/etiketi ve DC string kodları birlikte güncellenir.
// Çizimdeki GES nesneleri proje alanlarına (ve Proje tarif sayfasına) yansır: tek veri kaynağı form alanlarıdır.
function tsFormaYaz() {
  if (!S.doc || typeof gv !== 'function') return;
  const it = [...S.doc.items.values()].filter((x) => x.ges);
  const tek = (arr) => { const u = [...new Set(arr.filter((v) => v !== undefined && v !== null && v !== '' && v !== '—' && v !== 'oto'))]; return u.length === 1 ? u[0] : null; };
  const set = (id, v) => { const el = gv(id); if (!el || v === null || v === undefined || String(el.value) === String(v)) return false; el.value = v; return true; };
  const inv = it.filter((x) => x.t === 'insert' && x.ges.tip === 'inv'), tm = it.filter((x) => x.t === 'insert' && x.ges.tip === 'tm');
  let d = false;
  if (inv.length) { d = set('p-invn', inv.length) || d; d = set('p-inv', tek(inv.map((x) => +x.ges.kw))) || d; d = set('p-invm', tek(inv.map((x) => x.ges.model))) || d; const sv = tek(inv.map((x) => +x.ges.str)); if (sv !== null && (pv('p-strinv') !== null || typeof pjAuto !== 'function' || sv !== pjAuto().strInv)) d = set('p-strinv', sv) || d; }
  if (tm.length) d = set('p-trafo', tek(tm.map((x) => +x.ges.kva))) || d;
  const ac = it.filter((x) => x.ges.tip === 'ac'), og = it.filter((x) => x.ges.tip === 'og');
  if (ac.length) d = set('p-ack', tek(ac.map((x) => x.ges.kablo))) || d;
  if (og.length) d = set('p-ogk', tek(og.map((x) => x.ges.kablo))) || d;
  if (d) { if (typeof pjSave === 'function') pjSave(); if (typeof tfSync === 'function' && gv('tarif') && !gv('tarif').hidden) tfSync(); if (typeof pjAutoHints === 'function') pjAutoHints(); }
}
function tsInvNumarala() {
  if (!S.doc) return 0;
  setTimeout(tsFormaYaz, 0);
  const inv = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'inv').sort((a, b) => (+a.ges.no || 1e9) - (+b.ges.no || 1e9));
  const pairs = []; const eskiNo = new Map();
  inv.forEach((it, i) => { const n = i + 1; if (+it.ges.no === n) return; eskiNo.set(it.id, it.ges.no); const g = { ...it.ges, no: n }; pairs.push([it, { ...it, ges: g, block: tsBlok('inv', g).ad }]); });
  if (!pairs.length) return 0;
  const yeniNo = new Map(pairs.map(([o, n]) => [o.id, n.ges.no])), konum = new Map(inv.map((it) => [it.id, tsMerkez(it)]));
  for (const k of S.doc.items.values()) {
    if (k.t === 'pline' && k.ges && k.ges.tip === 'ac') {   // AC kablo: başladığı inverterin yeni numarası
      const id = [...yeniNo.keys()].find((iid) => { const p = konum.get(iid); return Math.hypot(k.pts[0][0] - p[0], k.pts[0][1] - p[1]) < 6; }); if (!id) continue;
      const g = { ...k.ges, no: yeniNo.get(id) }; pairs.push([k, { ...k, ges: g }]);
      for (const t of S.doc.items.values()) if (t.gesEt === k.id) pairs.push([t, { ...t, s: tsEtiket('ac', g, tsBoy(k.pts)) }]);
    }
    if (k.ges && k.ges.tip === 'dcstr' && yeniNo.has(k.ges.inv)) {   // DC string kodu INVn.PVs
      const kod = k.ges.kod.replace(/INV[^.]*\./, 'INV' + yeniNo.get(k.ges.inv) + '.'); pairs.push([k, { ...k, ges: { ...k.ges, kod } }]);
      for (const t of S.doc.items.values()) if (t.gesEt === k.id && t.t === 'text' && t.s.startsWith(k.ges.kod)) pairs.push([t, { ...t, s: kod + t.s.slice(k.ges.kod.length) }]);
    }
  }
  replaceItems(pairs, 'inverter numarala'); renderLayers();
  msg('İnverter numaraları güncellendi: ' + [...eskiNo].map(([id, o]) => 'INV-' + o + ' → INV-' + yeniNo.get(id)).join(', ') + '.', 'note');
  return pairs.length;
}
// Yeni inverter eklenince AC kablo otomatik: en yakın trafonun ADP'sine, mevcut AC kanal ağına katılarak (aynı kablo tipi)
// AG KABLO KANALI (kullanıcı kuralı 19.10.2026): tüm AC kabloların geçtiği ortak kanal 1 m bant olarak çizilir (GES-AG-KANAL);
// ortak güzergâhta tek kanal. Her AC çiziminde / inverter eklendikçe baştan güncellenir. Uzunluk = kazı metrajı.
function tsKanalCiz() {
  try {
    const KAT = 'GES-AG-KANAL', yarim = 0.5; S.doc.addLayer(KAT, 4);
    const sil = [...S.doc.items.values()].filter((it) => it.layer === KAT).map((it) => [it, null]);
    const parcalar = [], gor = new Set();
    for (const it of S.doc.items.values()) if (it.t === 'pline' && it.ges && it.ges.tip === 'ac') { const P = it.pts;
      for (let i = 1; i < P.length; i++) {
        const a_ = P[i - 1], b_ = P[i], L = Math.hypot(b_[0] - a_[0], b_[1] - a_[1]); if (L < 0.05) continue;
        const k_ = [a_, b_].map((q) => Math.round(q[0] * 10) + ',' + Math.round(q[1] * 10)).sort().join('|'); if (gor.has(k_)) continue; gor.add(k_);
        const ux = (b_[0] - a_[0]) / L, uy = (b_[1] - a_[1]) / L, nx = -uy * yarim, ny = ux * yarim, e = yarim;
        const A0 = [a_[0] - ux * e, a_[1] - uy * e], B0 = [b_[0] + ux * e, b_[1] + uy * e];
        parcalar.push([[[A0[0] + nx, A0[1] + ny], [B0[0] + nx, B0[1] + ny], [B0[0] - nx, B0[1] - ny], [A0[0] - nx, A0[1] - ny], [A0[0] + nx, A0[1] + ny]]]);
      } }
    const yeni = []; let alan = 0;
    if (parcalar.length) for (const pg of polygonClipping.union(...parcalar)) for (const ring of pg) { const pts = ring.slice(0, -1); alan += Math.abs(polyArea(pts)); yeni.push([null, { id: newId(), t: 'pline', layer: KAT, c: 256, lt: '', cl: true, pts: pts.map((q) => [q[0], q[1], 0]) }]); }
    if (sil.length || yeni.length) S.doc.commit([...sil, ...yeni].map(([o, n]) => ({ o, n })), 'AG kanal');
    if (alan) msg('AG kablo kanalı (1 m bant, ortak): ≈ ' + fmtNum(alan / (2 * yarim), 0) + ' m kazı.', 'note');
  } catch (e) { console.warn('kanal', e); }
}
async function tsAcTekEkle(it) {
  if (!it) return; const tms = [...S.doc.items.values()].filter((x) => x.t === 'insert' && x.ges && x.ges.tip === 'tm'); if (!tms.length) return;
  const p = tsMerkez(it), tm = tms.reduce((a, b) => (Math.hypot(tsMerkez(b)[0] - p[0], tsMerkez(b)[1] - p[1]) < Math.hypot(tsMerkez(a)[0] - p[0], tsMerkez(a)[1] - p[1]) ? b : a)), A = tsAdp(tm);
  const acs = [...S.doc.items.values()].filter((k) => k.t === 'pline' && k.ges && k.ges.tip === 'ac');
  const tohum = acs.filter((k) => { const e = k.pts[k.pts.length - 1]; return Math.hypot(e[0] - A[0], e[1] - A[1]) < 3; }).map((k) => k.pts.map((q) => [q[0], q[1]]));
  const ornek = acs[0] ? acs[0].ges : { kablo: pv('p-ack') || '3x240/120 NA2XY', pay: 10 };
  const M = tsAcAg([{ it, p }], A, tm, tohum); const yol = M && M.get(it.id); if (!yol || yol.length < 2) { msg('Yeni inverter için AC kablo yolu bulunamadı — elle çizin.', 'note'); return; }
  const g = { kablo: ornek.kablo, pay: ornek.pay, tip: 'ac', no: it.ges.no }, L = tsBoy(yol); S.doc.addLayer(TS.ac.kat, TS.ac.renk);
  const pl = { id: newId(), t: 'pline', layer: TS.ac.kat, c: TS.ac.renk, lt: '', cl: false, pts: yol.map((q) => [q[0], q[1], 0]), ges: g };
  const e = tsEtiketYeri(yol, tohum);
  addItems([pl, { id: newId(), t: 'text', layer: TS.ac.kat, c: TS.ac.renk, lt: '', x: e.x, y: e.y, h: KABLO_YZ, rot: e.rot, s: tsEtiket('ac', g, L), ha: 1, va: 0, gesEt: pl.id }], 'AC otomatik'); tsKanalCiz(); renderLayers();
  msg('INV-' + it.ges.no + ' için AC kablo AG panoya bağlandı (' + g.kablo + ', ' + fmtNum(L + (+g.pay || 0), 0) + ' m, ortak kanal). Geri al ile kaldırılır.', 'res');
}
function tsDcInvYenile(ids) {   // verilen inverterlerin stringleri atamaya göre yeniden çizilir (atama çizgisi yerine string)
  const at = tsAtamalar(); S.doc.addLayer('GES-DC-KABLO', 4); const pairs = [];
  for (const iid of ids) {
    if (!S.doc.items.get(iid)) continue; const eskiId = new Set();
    for (const it of S.doc.items.values()) if (it.ges && (it.ges.tip === 'dcata' || it.ges.tip === 'dcstr') && it.ges.inv === iid) { pairs.push([it, null]); eskiId.add(it.id); }
    for (const it of S.doc.items.values()) if (it.gesEt && eskiId.has(it.gesEt)) pairs.push([it, null]);
    const masalar = [...at].filter(([, v]) => v === iid).map(([mid]) => S.doc.items.get(mid)).filter(Boolean);
    if (masalar.length) pairs.push(...tsDcInvCiz(iid, masalar).yeni);
  }
  if (pairs.length) replaceItems(pairs, 'DC string'); tsMasaRenkle(); renderLayers();
}
CMD.GDCK = async () => {
  S.doc.addLayer(DC_ATA, 4, 'DASHED');
  for (;;) {
    const p = await getPoint('DC atama: inverter seçin (tıklayın) — Enter: bitir'); if (!Array.isArray(p)) break;
    const x = tsInverterler().reduce((a, b) => (!a || Math.hypot(b.p[0] - p[0], b.p[1] - p[1]) < Math.hypot(a.p[0] - p[0], a.p[1] - p[1]) ? b : a), null);
    if (!x || Math.hypot(x.p[0] - p[0], x.p[1] - p[1]) > Math.max(6, 30 / V().s)) { msg('Yakında inverter yok; inverterin üstüne tıklayın.', 'err'); continue; }
    if (!x.it.ges.str) { const v = await formDlg('INV-' + (x.it.ges.no || '') + ' string girişi', [TS.inv.alan[2]]); if (!v) continue; replaceItems([[x.it, { ...x.it, ges: { ...x.it.ges, str: +v.str } }]], 'string girişi'); x.it = S.doc.items.get(x.it.id); }
    const iid = x.it.id, ad = 'INV-' + (x.it.ges.no || '');
    for (;;) {
      const d = tsInvDurum(iid);
      const q = await getPoint(ad + ': masalarına tıklayın (tekrar tık = çıkar) · ' + d.dolu + '/' + (d.giris || '?') + ' string dolu — Enter: bu inverter bitti'); if (!Array.isArray(q)) break;
      const m = tsMasaAt(q); if (!m) { msg('Masa bulunamadı; masanın içine tıklayın.', 'err'); continue; }
      const pairs = []; let cikar = false;
      for (const it of S.doc.items.values()) if (it.ges && (it.ges.tip === 'dcata' || it.ges.tip === 'dcstr') && it.ges.masa === m.id) { pairs.push([it, null]); if (it.ges.inv === iid) cikar = true; for (const t of S.doc.items.values()) if (t.gesEt === it.id) pairs.push([t, null]); }
      const eskiInv = [...new Set(pairs.filter((pr) => pr[0].ges && pr[0].ges.inv !== iid).map((pr) => pr[0].ges.inv))];
      if (!cikar) { const u = tsMasaIlkPanel(m, x.p, tsDcYon(x.it)); pairs.push([null, { id: newId(), t: 'pline', layer: DC_ATA, c: 256, lt: '', cl: false, pts: [[x.p[0], x.p[1], 0], [u[0], u[1], 0]], ges: { tip: 'dcata', inv: iid, masa: m.id } }]); }
      replaceItems(pairs, 'DC atama');
      tsDcInvYenile([iid, ...eskiInv]);   // + masa rengi   // kullanıcı kuralı 19.10.2026: tıklanan masanın DC stringleri anında çizilir
      const dur = []; for (const id of [iid, ...eskiInv]) dur.push(...tsInvDurumYazi(id, 'GES-DC-KABLO')); if (dur.length) replaceItems(dur, 'DC durum');
      renderLayers(); const d2 = tsInvDurum(iid);
      const tk = tsDcTek(m, x.p, tsDcYon(x.it)), sn = tsDcSinir().L;
      msg(ad + ': ' + (cikar ? 'masa çıkarıldı' : 'masa atandı (' + tsMasaStr(m) + ' string) · masa–inverter tek yön ' + fmtNum(tk, 0) + ' m' + (tk > sn ? ' — ' + sn + ' m SINIRI AŞILDI' : '')) + ' · ' + d2.dolu + '/' + (d2.giris || '?') + ' string dolu' + (d2.giris && d2.dolu > d2.giris ? ' — GİRİŞ SAYISI AŞILDI' : ''), (d2.giris && d2.dolu > d2.giris) || (!cikar && tk > sn) ? 'err' : 'res');
    }
  }
};
// ---- DC otomatik atama (kullanıcı kuralı 19.10.2026): A.1 — DC tek yön ≤ sınır (modül Vmp/Imp varsa ΔU %1 boyu, yoksa 80 m /
// "DC tek yön sınır" alanı), inverter string girişi aşılmaz; en yakın uygun inverter. Sonra yanlış konumlu inverter için taşıma önerisi.
function tsDcSinir() {
  const el = pn('p-dcmax'); if (el) return { L: el, neden: 'girilen sınır' };
  const P = G.panel, vmp = pn('p-vmp') ?? P.vmp, imp = pn('p-imp') ?? P.imp, sm = typeof pjAuto === 'function' ? pjAuto().strMod : null;
  if (vmp && imp && sm) { const L = 0.01 * 6 * vmp * sm / (2 * imp * 0.0206) - 3; return { L: Math.round(L), neden: 'ΔU %1 (1×6 Cu, ' + sm + ' modül)' }; }
  return { L: 80, neden: 'Vmp/Imp yok → 80 m ön sınır' };
}
function tsDcTek(m, ip, yon) {   // masanın çıkış ucundan invertere tek yön (dik mesafe + 3 m iniş)
  const c = tsMasaCerceve(m); if (!c) return Infinity; const nok = (s_, t) => [c.o[0] + c.ux[0] * s_ + c.uy[0] * t, c.o[1] + c.ux[1] * s_ + c.uy[1] * t];
  const bas = tsUcBas(c, nok, ip, yon), u = bas ? nok(-0.3, c.D / 2) : nok(c.L + 0.3, c.D / 2);
  return Math.abs(u[0] - ip[0]) + Math.abs(u[1] - ip[1]) + 3;
}
function tsDcOtoAta(sadeceBos) {
  const sin = tsDcSinir(), inv = tsInverterler().map((x) => ({ ...x, yon: tsDcYon(x.it), cap: +x.it.ges.str || 0, dolu: 0 }));
  const masalar = [...S.doc.items.values()].filter((it) => String(it.layer).toUpperCase() === 'GES-MASA' && tsMasaCerceve(it));
  const eski = tsAtamalar(); const yeni = new Map(sadeceBos ? eski : []);
  for (const [mid, iid] of yeni) { const x = inv.find((y) => y.it.id === iid), m = S.doc.items.get(mid); if (x && m) x.dolu += tsMasaStr(m); }
  const ciftler = [];
  for (const m of masalar) { if (yeni.has(m.id)) continue; for (const x of inv) { const d = tsDcTek(m, x.p, x.yon); if (d <= sin.L) ciftler.push({ m, x, d }); } }
  // önce tek seçeneği olan masalar, sonra en kısa mesafe
  const secenek = new Map(); for (const c of ciftler) secenek.set(c.m.id, (secenek.get(c.m.id) || 0) + 1);
  ciftler.sort((a, b) => (secenek.get(a.m.id) - secenek.get(b.m.id)) || (a.d - b.d));
  for (const c of ciftler) { if (yeni.has(c.m.id)) continue; const n = tsMasaStr(c.m); if (c.x.cap && c.x.dolu + n > c.x.cap) continue; yeni.set(c.m.id, c.x.it.id); c.x.dolu += n; }
  const kalan = masalar.filter((m) => !yeni.has(m.id));
  return { yeni, kalan, sin, inv };
}
function tsDcAtaYaz(yeni) {   // atamaları kesikli çizgi olarak yaz (eski atama/çizim silinir)
  const pairs = []; for (const it of S.doc.items.values()) if ((it.ges && (it.ges.tip === 'dcata' || it.ges.tip === 'dcstr')) || it.durumInv || (it.gesEt && S.doc.items.get(it.gesEt) && (S.doc.items.get(it.gesEt).ges || {}).tip === 'dcstr')) pairs.push([it, null]);
  S.doc.addLayer(DC_ATA, 4, 'DASHED');
  for (const [mid, iid] of yeni) { const m = S.doc.items.get(mid), inv = S.doc.items.get(iid); if (!m || !inv) continue; const ip = tsMerkez(inv), u = tsMasaIlkPanel(m, ip, tsDcYon(inv)); pairs.push([null, { id: newId(), t: 'pline', layer: DC_ATA, c: 256, lt: '', cl: false, pts: [[ip[0], ip[1], 0], [u[0], u[1], 0]], ges: { tip: 'dcata', inv: iid, masa: mid } }]); }
  replaceItems(pairs, 'DC oto atama'); tsMasaRenkle();
  const dur = []; for (const iid of new Set(yeni.values())) dur.push(...tsInvDurumYazi(iid, DC_ATA)); if (dur.length) replaceItems(dur, 'DC durum'); renderLayers();
}
CMD.GDCOTO = async () => {
  const inv = tsInverterler(); if (!inv.length) { msg('Önce inverter ekleyin.', 'err'); return; }
  const eksik = inv.filter((x) => !x.it.ges || !x.it.ges.str);
  if (eksik.length) { const v = await formDlg(eksik.length + ' inverterde string girişi yok — hepsine', [TS.inv.alan[2]]); if (!v) return; replaceItems(eksik.map((x) => [x.it, { ...x.it, ges: { ...x.it.ges, str: +v.str } }]), 'string girişi'); }
  let sadeceBos = false; if (tsAtamalar().size) { const r = await askDlg('DC otomatik atama', 'Mevcut DC atamaları var. Ne yapılsın?', [['Hepsini yeniden ata', 'tum', 'primary'], ['Yalnız atanmamış masalar', 'bos', 'ghost'], ['Vazgeç', null, 'ghost']]); if (!r) return; sadeceBos = r === 'bos'; }
  busy('DC atanıyor…'); await tick();
  let R; try { R = tsDcOtoAta(sadeceBos); tsDcAtaYaz(R.yeni); } finally { busy(null); }
  msg(R.yeni.size + ' masa ' + new Set(R.yeni.values()).size + ' invertere atandı (DC tek yön ≤ ' + R.sin.L + ' m: ' + R.sin.neden + '; string girişi aşılmadı)' + (R.kalan.length ? ' · ' + R.kalan.length + ' masa atanamadı (sınır dışında ya da inverterler dolu)' : '') + '.', R.kalan.length ? 'note' : 'res');
  await tsInvOneri(R);
};
// Sıra uçları (kullanıcı kuralı 19.10.2026): inverter yalnız sıranın ucunda, yol/kanal kenarında, mevcut inverterlerle aynı hizada durur.
// Masalar sıralara (derinlik doğrultusunda) ve sıra içinde boşlukla ayrılan parçalara bölünür; her parçanın iki ucu aday.
function tsSiraUclari() {
  const ms = [...S.doc.items.values()].filter((it) => String(it.layer).toUpperCase() === 'GES-MASA').map((it) => ({ it, c: tsMasaCerceve(it) })).filter((x) => x.c);
  if (!ms.length) return [];
  const ux = ms[0].c.ux, uy = [-ux[1], ux[0]], D = ms[0].c.D;
  const pr = ms.map((x) => { const c = x.c, m = [c.o[0] + c.ux[0] * c.L / 2 + c.uy[0] * c.D / 2, c.o[1] + c.ux[1] * c.L / 2 + c.uy[1] * c.D / 2]; return { ...x, s: m[0] * ux[0] + m[1] * ux[1], t: m[0] * uy[0] + m[1] * uy[1] }; }).sort((a, b) => a.t - b.t);
  const siralar = []; for (const x of pr) { const r = siralar[siralar.length - 1]; if (r && Math.abs(x.t - r.t) < D * 0.5) { r.ms.push(x); r.t = (r.t * (r.ms.length - 1) + x.t) / r.ms.length; } else siralar.push({ t: x.t, ms: [x] }); }
  const uc = [], W = (s_, t) => [ux[0] * s_ + uy[0] * t, ux[1] * s_ + uy[1] * t];
  for (const r of siralar) {
    r.ms.sort((a, b) => a.s - b.s); let par = [r.ms[0]];
    // kullanıcı kuralı 19.10.2026: inverter masanın ARKASINDA (kuzey açıklık), sıra ucundaki masanın ucuna yakın
    const ag_ = gnum('g-ang', 0) * Math.PI / 180, kz = [-Math.sin(ag_), Math.cos(ag_)], sg = (uy[0] * kz[0] + uy[1] * kz[1]) >= 0 ? 1 : -1, arka = sg * (D / 2 + 0.5);
    const bitir = () => { const a = par[0], b = par[par.length - 1]; uc.push({ p: W(a.s - a.c.L / 2 + 1.0, r.t + arka), yan: -1, t: r.t }, { p: W(b.s + b.c.L / 2 - 1.0, r.t + arka), yan: 1, t: r.t }); };
    for (let k = 1; k < r.ms.length; k++) { const a = r.ms[k - 1], b = r.ms[k]; if (b.s - b.c.L / 2 - (a.s + a.c.L / 2) > 3) { bitir(); par = [b]; } else par.push(b); }
    bitir();
  }
  const ok = (q) => (!G.bound || sinirlar().some((b) => tsIcinde(q, b))) && !tsMasaAt(q) && ![...S.doc.items.values()].some((it) => it.t === 'insert' && it.ges && (it.ges.tip === 'tm' || it.ges.tip === 'dm') && tsIcinde(q, tsBinaIz(it) || []));
  return uc.filter((u) => ok(u.p)).map((u) => ({ ...u, ux }));
}
async function tsInvOneri(R) {
  const sin = R.sin, uc = tsSiraUclari(); if (!uc.length) return;
  const ux = uc[0].ux, mevcut = tsInverterler();
  const yanOf = (x, ms) => { if (!ms.length) return 0; const m = ms.reduce((a, b) => [a[0] + tsMerkez(b)[0] / ms.length, a[1] + tsMerkez(b)[1] / ms.length], [0, 0]); return Math.sign((x.p[0] - m[0]) * ux[0] + (x.p[1] - m[1]) * ux[1]); };
  const msOf = (iid, Y) => [...Y].filter(([, i]) => i === iid).map(([mid]) => S.doc.items.get(mid)).filter(Boolean);
  const dolu = (q, haric) => tsInverterler().some((y) => y.it !== haric && Math.hypot(y.p[0] - q[0], y.p[1] - q[1]) < 3);
  // 1) taşıma: yalnız aynı yandaki sıra uçlarına (masa ortasına değil)
  const oner = [];
  for (const x of mevcut) {
    const ms = msOf(x.it.id, R.yeni); if (ms.length < 2) continue; const yan = yanOf(x, ms) || 1, yon = tsDcYon(x.it);
    const enUzun = (p) => Math.max(...ms.map((m) => tsDcTek(m, p, yon))); const simdi = enUzun(x.p); let best = null;
    for (const u of uc) { if (u.yan !== yan || dolu(u.p, x.it)) continue; const v = enUzun(u.p); if (!best || v < best.v) best = { v, q: u.p }; }
    if (best && best.v < simdi * 0.85 && simdi - best.v > 5) oner.push({ x, simdi, best });
  }
  // 2) ilave: atanamayan masalar için, mevcut inverterlerin yanında (yol tarafı) sıra uçlarına yeni inverter
  const yanlar = mevcut.map((x) => yanOf(x, msOf(x.it.id, R.yeni))).filter(Boolean), tercih = yanlar.length ? Math.sign(yanlar.reduce((a, b) => a + b, 0)) || 1 : 1;
  const ornek = mevcut[0] ? mevcut[0].it : null, cap = (ornek && +ornek.ges.str) || pn('p-strinv') || 20;
  const kalan = new Set(R.kalan.map((m) => m.id)), ilave = [], kullan = new Set();
  for (const turYan of [tercih, -tercih]) {
    for (;;) {
      let best = null;
      for (const u of uc) {
        if (u.yan !== turYan || kullan.has(u) || dolu(u.p) || ilave.some((y) => Math.hypot(y.p[0] - u.p[0], y.p[1] - u.p[1]) < 3)) continue;
        const ad = [...kalan].map((id) => S.doc.items.get(id)).map((m) => ({ m, d: tsDcTek(m, u.p, null) })).filter((o) => o.d <= sin.L).sort((a, b) => a.d - b.d);
        let n = 0, sec = []; for (const o of ad) { const k = tsMasaStr(o.m); if (n + k > cap) continue; n += k; sec.push(o.m.id); }
        if (sec.length && (!best || n > best.n)) best = { u, n, sec };
      }
      if (!best || best.n < Math.max(4, cap * 0.4)) break;   // az dolu (ör. 1–3 string) inverter önerilmez; kalan masalar raporlanır
      kullan.add(best.u); ilave.push({ p: best.u.p, n: best.n }); for (const id of best.sec) kalan.delete(id);
    }
  }
  if (!oner.length && !ilave.length) { if (R.kalan.length) msg(R.kalan.length + ' masa atanamadı ve sıra uçlarında uygun inverter yeri yok (DC sınırı ' + sin.L + ' m) — iç yol açılmalı ya da elle inverter eklenmeli.', 'note'); return; }
  const satir = [...oner.map((o) => 'Taşı INV-' + (o.x.it.ges.no || '') + ': en uzun DC ' + fmtNum(o.simdi, 0) + ' → ' + fmtNum(o.best.v, 0) + ' m (sıra ucuna, ' + fmtNum(Math.hypot(o.best.q[0] - o.x.p[0], o.best.q[1] - o.x.p[1]), 0) + ' m)'),
    ...(ilave.length ? ['Ekle ' + ilave.length + ' inverter (sıra uçlarında, mevcutlarla aynı hizada): ' + ilave.map((y) => y.n + ' str').join(', ') + (kalan.size ? ' · yine de ' + kalan.size + ' masa açıkta (sıra ucundan DC sınırı ' + sin.L + ' m dışında ya da az dolu inverter gerekir → iç yol ya da elle)' : '')] : [])];
  const r = await askDlg('İnverter önerisi', satir.join('\n') + '\nUygulansın mı? Atama yenilenir, yeni inverterlere AC kablo otomatik çizilir; taşınanların AC kablosunu "AC oto" ile yenileyin.',
    [['Hepsini uygula', 'hep', 'primary'], ...(oner.length && ilave.length ? [['Yalnız ilave', 'ilave', 'ghost'], ['Yalnız taşıma', 'tasi', 'ghost']] : []), ['Hayır', null, 'ghost']]);
  if (!r) return;
  if (r !== 'ilave' && oner.length) replaceItems(oner.map((o) => { const it = o.x.it, dx = o.best.q[0] - o.x.p[0], dy = o.best.q[1] - o.x.p[1]; return [it, xfItem(it, mT(dx, dy))]; }), 'inverter taşı');
  const yeniler = [];
  if (r !== 'tasi' && ilave.length) {
    const g0 = ornek ? ornek.ges : { kw: pn('p-inv') ?? 100, model: pv('p-invm') || '—', str: cap }; const rot = ornek ? Math.atan2(ornek.M[4], ornek.M[0]) : 0;
    let no = tsSonNo('inv'); S.doc.addLayer(TS.inv.kat, TS.inv.renk);
    const it = ilave.map((y) => { const g = { kw: g0.kw, model: g0.model, str: g0.str || cap, no: no++, tip: 'inv' }; const B = tsBlok('inv', g); const o = { id: newId(), t: 'insert', layer: TS.inv.kat, c: 256, lt: '', block: B.ad, M: mMul(mT(y.p[0], y.p[1]), mRz(rot)), ap: [], ges: g }; yeniler.push(o.id); return o; });
    addItems(it, 'inverter ilave'); tsInvNumarala();
  }
  const R2 = tsDcOtoAta(false); tsDcAtaYaz(R2.yeni);
  for (const id of yeniler) await tsAcTekEkle(S.doc.items.get(id));
  renderLayers();
  msg((r !== 'ilave' ? oner.length : 0) + ' inverter taşındı, ' + yeniler.length + ' inverter eklendi; ' + R2.yeni.size + ' masa atandı' + (R2.kalan.length ? ', ' + R2.kalan.length + ' masa açıkta' : '') + '.', R2.kalan.length ? 'note' : 'res');
}
Object.assign(ALIAS, { GDCOTO: 'GDCOTO', DCOTO: 'GDCOTO' }); Object.assign(LABEL, { GDCOTO: 'DC OTOMATİK ATA' });
// Bir inverterin atanmış masalarındaki stringler (DC çiz ve DC ata'da tıklamayla anında): masa içi iz, + / − üçgenleri, kod, sıra*modül
// String düzeni (kullanıcı kuralı 19.10.2026, GES paneli "String düzeni" p-strtip):
//  tek    — tek masa tek string (masa içinde yılan)
//  altust — alt/üst string: aynı sıradaki komşu iki masanın üst sırası bir string, alt sırası bir string (string = 2 × sıra başı modül);
//           çift sayıda masada çiftler, tek kalan masa tek string. String boyu 2 × sıra modülü değilse tek düzene döner.
function tsStrTip() { return (typeof pv === 'function' && pv('p-strtip')) || 'tek'; }
function tsDcInvCiz(iid, masalar, tms) {
  const yeni = [], h = KABLO_YZ; let topL = 0, nStr = 0; tms = tms || [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm');
  const inv = S.doc.items.get(iid), ip = tsMerkez(inv), ino = inv.ges.no || '?', dcYon = tsDcYon(inv), sin = tsDcSinir();
  const trNo = tms.length > 1 ? (tms.reduce((a, b) => (Math.hypot(tsMerkez(b)[0] - ip[0], tsMerkez(b)[1] - ip[1]) < Math.hypot(tsMerkez(a)[0] - ip[0], tsMerkez(a)[1] - ip[1]) ? b : a)).ges.no || '') : '';
  const uz = (m) => Math.hypot(tsMerkez(m)[0] - ip[0], tsMerkez(m)[1] - ip[1]);
  masalar = masalar.filter((m) => tsMasaCerceve(m)).sort((a, b) => uz(a) - uz(b));
  let pv_ = 0;
  // ortak: bir string çizimi (iz noktaları, uç, tek yön, dönüş) + üçgenler, kodlar, sıra*modül, mesafe etiketi (sınır üstü kırmızı)
  const ciz = (m, c, iz, bas, tek, donus, orta) => {
    pv_++; nStr++; const L = 2 * tek + donus; topL += L;
    const kod = (trNo ? 'TR' + trNo + '.' : '') + 'INV' + ino + '.PV' + pv_;
    const pl = { id: newId(), t: 'pline', layer: 'GES-DC-KABLO', c: 256, lt: '', cl: false, pts: iz.map((q) => [q[0], q[1], 0]), ges: { tip: 'dcstr', inv: iid, masa: m.id, kablo: 'H1Z2Z2-K 1x6', pay: 0, L: +L.toFixed(1), tek: +tek.toFixed(1), pv: pv_, kod } };
    yeni.push([null, pl]);
    const tri = (q, renk) => ({ id: newId(), t: 'pline', layer: 'GES-DC-KABLO', c: renk, lt: '', cl: true, pts: [[q[0] - h * 0.6, q[1] - h * 0.5, 0], [q[0] + h * 0.6, q[1] - h * 0.5, 0], [q[0], q[1] + h * 0.5, 0]], gesEt: pl.id });
    const ic = bas ? 1 : -1, rot = Math.atan2(c.ux[1], c.ux[0]), ry = Math.cos(rot) < -1e-9 ? rot + Math.PI : rot, ters = Math.abs(ry - rot) > 1e-9;   // yazılar hep okunur yönde
    const yz = (q, s_, hh, renk) => ({ id: newId(), t: 'text', layer: 'GES-DC-KABLO', c: renk || 256, lt: '', x: q[0] + c.ux[0] * ic * h * 0.9 + c.uy[0] * h * 0.55, y: q[1] + c.ux[1] * ic * h * 0.9 + c.uy[1] * h * 0.55, h: hh, rot: ry, s: s_, ha: (ic > 0) !== ters ? 0 : 2, va: 0, gesEt: pl.id });
    const a = iz[0], b = iz[iz.length - 1], cx = orta ? orta[0] : iz.reduce((t, q) => t + q[0], 0) / iz.length, cy = orta ? orta[1] : iz.reduce((t, q) => t + q[1], 0) / iz.length;
    yeni.push([null, tri(a, 5)], [null, tri(b, 1)], [null, yz(a, kod + '.1', h * 0.8)], [null, yz(b, kod + '.' + iz.length, h * 0.8)]);
    const rs = Math.max(1, Math.round(iz.length / c.P)) > 1 && !orta ? Math.round(iz.length / c.P) : 1;
    yeni.push([null, { id: newId(), t: 'text', layer: 'GES-DC-KABLO', c: 1, lt: '', x: cx, y: cy, h: Math.min(c.D * 0.3, h * 2.6), rot: ry, s: rs + '*' + Math.round(iz.length / rs), ha: 1, va: 2, gesEt: pl.id }]);
    const asim = tek > sin.L;   // DC tek yön (masa → inverter): sınır üstü kırmızı
    yeni.push([null, { ...yz([a[0] - c.uy[0] * h * 1.6, a[1] - c.uy[1] * h * 1.6], fmtNum(tek, 0) + ' m', h * 0.85, asim ? 1 : 3), gesEt: pl.id }]);
  };
  const cer = (m) => { const c = tsMasaCerceve(m); const nok = (s_, t) => [c.o[0] + c.ux[0] * s_ + c.uy[0] * t, c.o[1] + c.ux[1] * s_ + c.uy[1] * t]; return { c, nok, bas: tsUcBas(c, nok, ip, dcYon) }; };
  const tekYon = (q) => Math.abs(q[0] - ip[0]) + Math.abs(q[1] - ip[1]) + 3;
  const tekMasa = (m) => {
    const { c, nok, bas } = cer(m), k = tsMasaStr(m);
    const dx = c.L / c.P, dy = c.D / c.R, sira = [];
    for (let r = 0; r < c.R; r++) { const t = c.D - (r + 0.5) * dy; const xs = Array.from({ length: c.P }, (_, i) => (i + 0.5) * dx); const ileri = (r % 2 === 0) === bas; for (const s_ of (ileri ? xs : xs.reverse())) sira.push(nok(s_, t)); }
    const N = Math.floor(sira.length / k), uc = bas ? nok(-0.3, c.D / 2) : nok(c.L + 0.3, c.D / 2), tek = tekYon(uc);
    for (let j = 0; j < k; j++) { const iz = sira.slice(j * N, (j + 1) * N); if (iz.length < 2) continue; const rs = Math.max(1, Math.round(N / c.P)); ciz(m, c, iz, bas, tek, (rs % 2 === 1) ? c.L : 0); }
  };
  const sm = typeof pjAuto === 'function' ? pjAuto().strMod : null;
  if (tsStrTip() === 'altust' && masalar.length > 1) {
    // aynı sıradaki komşu masalar çiftlenir (inverter tarafından başlayarak)
    const c0 = tsMasaCerceve(masalar[0]); const ux = c0.ux, uy = c0.uy;
    const pr = masalar.map((m) => { const q = tsMerkez(m), c = tsMasaCerceve(m), mc = [c.o[0] + c.ux[0] * c.L / 2 + c.uy[0] * c.D / 2, c.o[1] + c.ux[1] * c.L / 2 + c.uy[1] * c.D / 2]; return { m, c, s: mc[0] * ux[0] + mc[1] * ux[1], t: mc[0] * uy[0] + mc[1] * uy[1] }; });
    const kul = new Set();
    for (const A of pr) {
      if (kul.has(A.m.id)) continue;
      if (!(sm && sm === 2 * A.c.P)) { kul.add(A.m.id); tekMasa(A.m); continue; }
      const B = pr.filter((x) => !kul.has(x.m.id) && x !== A && Math.abs(x.t - A.t) < A.c.D * 0.5 && Math.abs(Math.abs(x.s - A.s) - A.c.L) < 2.5).sort((x, y) => uz(x.m) - uz(y.m))[0];
      if (!B) { kul.add(A.m.id); tekMasa(A.m); continue; }
      kul.add(A.m.id); kul.add(B.m.id);
      const a = cer(A.m), b = cer(B.m), yonA = (B.s > A.s) ? 1 : -1;   // A'dan B'ye doğru (dış uca)
      const yL = yonA * (A.c.ux[0] * ux[0] + A.c.ux[1] * ux[1]) > 0 ? 1 : -1;   // A'nın kendi ekseninde B yönü
      const dx = A.c.L / A.c.P, dy = A.c.D / A.c.R;
      const sirala = (C, w) => { const xs = Array.from({ length: C.c.P }, (_, i) => (i + 0.5) * dx); const iler = (C.c.ux[0] * ux[0] + C.c.ux[1] * ux[1] > 0) === (yonA > 0); return (iler ? xs : xs.reverse()).map((s_) => C.nok(s_, w)); };
      const ucA = yL > 0 ? a.nok(-0.3, A.c.D / 2) : a.nok(A.c.L + 0.3, A.c.D / 2), tek = tekYon(ucA);
      const orta = [(tsMerkez(A.m)[0] + tsMerkez(B.m)[0]) / 2, (tsMerkez(A.m)[1] + tsMerkez(B.m)[1]) / 2];
      for (let r = 0; r < A.c.R; r++) {
        const t = A.c.D - (r + 0.5) * dy, iz = [...sirala(a, t), ...sirala(b, t)];
        const k2 = Math.floor(iz.length / 2), om = [(iz[k2 - 1][0] + iz[k2][0]) / 2, (iz[k2 - 1][1] + iz[k2][1]) / 2];   // iki masa arası, string üzerinde
        ciz(r % 2 === 0 ? A.m : B.m, A.c, iz, yL > 0, tek, 2 * A.c.L + 0.5, om);   // uçlar iki masanın dış uçlarında: dönüş ≈ iki masa boyu; atama: üst sıra A, alt sıra B
      }
    }
  } else for (const m of masalar) tekMasa(m);
  return { yeni, topL, nStr };
}
CMD.GDCCIZ = async () => {
  if (!tsAtamalar().size) { const r = await askDlg('DC çiz', 'DC ataması yok. Masalar invertere otomatik atansın mı (DC tek yön sınırı ve string girişine göre)?', [['Otomatik ata ve çiz', 'ok', 'primary'], ['Vazgeç', null, 'ghost']]); if (r !== 'ok') return; await CMD.GDCOTO(); if (!tsAtamalar().size) return; }
  const at = tsAtamalar();
  busy('DC stringler çiziliyor…'); await tick();
  try {
    const sil = []; for (const it of S.doc.items.values()) if ((it.ges && (it.ges.tip === 'dcata' || it.ges.tip === 'dcstr' || it.ges.tip === 'dcisaret')) || it.durumInv || (it.gesEt && S.doc.items.get(it.gesEt) && S.doc.items.get(it.gesEt).ges && S.doc.items.get(it.gesEt).ges.tip === 'dcstr')) sil.push([it, null]);
    S.doc.addLayer('GES-DC-KABLO', 4); const yeni = []; const h = KABLO_YZ; let topL = 0, nStr = 0;
    const byInv = new Map(); for (const [mid, iid] of at) { if (!S.doc.items.get(mid) || !S.doc.items.get(iid)) continue; if (!byInv.has(iid)) byInv.set(iid, []); byInv.get(iid).push(S.doc.items.get(mid)); }
    const tms = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm');
    for (const [iid, masalar] of byInv) { const R = tsDcInvCiz(iid, masalar, tms); yeni.push(...R.yeni); topL += R.topL; nStr += R.nStr; yeni.push(...tsInvDurumYazi(iid, 'GES-DC-KABLO').filter((pr) => pr[1])); }
    replaceItems([...sil, ...yeni], 'DC çiz'); tsMasaRenkle(); renderLayers();
    msg(nStr + ' string çizildi (' + byInv.size + ' inverter) · DC kablo ≈ ' + fmtNum(topL, 0) + ' m (ev dönüşü: 2 × masa ucu→inverter + 3 m iniş; uçlar masanın iki ucundaysa + masa boyu). Atama kesikli çizgileri kaldırıldı; değiştirmek için yeniden "DC ata".', 'res');
  } finally { busy(null); }
};
// AC otomatik (kullanıcı kuralı 19.10.2026): tek tıkla tüm inverterlerden en yakın trafo binasının AG panosuna (ADP) kablo —
// TM başına ortak kanal ağı (ana hat + branşman), 1 m kanal, arazi içi, masa/inverter/binaya ≥ 0,5 m; numara AC-n.
CMD.GACOTO = async (vHazir) => {
  const inv = tsInverterler(), tms = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm');
  if (!inv.length || !tms.length) { msg('Önce inverter (İnverter +) ve trafo binası (Trafo +) ekleyin.', 'err'); return; }
  const tol = 6, eski = [...S.doc.items.values()].filter((it) => it.t === 'pline' && it.ges && it.ges.tip === 'ac');
  const bagli = new Set(); for (const k of eski) { const x = inv.find((y) => Math.hypot(y.p[0] - k.pts[0][0], y.p[1] - k.pts[0][1]) <= tol); if (x) bagli.add(x.it.id); }
  let hepsi = true;
  if (eski.length) { const r = await askDlg('AC kablo otomatik', eski.length + ' AC kablo zaten var (' + bagli.size + ' inverter bağlı). Ne yapılsın?', [['Hepsini yeniden çiz', 'tum', 'primary'], ['Yalnız kablosuz ' + (inv.length - bagli.size) + ' inverter', 'eksik', 'ghost'], ['Vazgeç', null, 'ghost']]); if (!r) return; hepsi = r === 'tum'; }
  const v = vHazir && vHazir.kablo ? vHazir : await formDlg('AC kablo (otomatik)', TS.ac.alan); if (!v) return;
  const hedef = hepsi ? inv : inv.filter((x) => !bagli.has(x.it.id)); if (!hedef.length) { msg('Kablosuz inverter yok.', 'res'); return; }
  busy('AC kablolar çiziliyor…'); await tick();
  try {
    const T = TS.ac, yeni = [], silinecek = hepsi ? eski : []; let top = 0, n = 0, yok = 0;
    S.doc.addLayer(T.kat, T.renk);
    for (const tm of tms) {
      const A = tsAdp(tm);
      const grp = hedef.filter((x) => tms.reduce((a, b) => (Math.hypot(tsMerkez(b)[0] - x.p[0], tsMerkez(b)[1] - x.p[1]) < Math.hypot(tsMerkez(a)[0] - x.p[0], tsMerkez(a)[1] - x.p[1]) ? b : a)) === tm);
      if (!grp.length) continue;
      const tohum = hepsi ? [] : eski.filter((k) => { const e = k.pts[k.pts.length - 1]; return Math.hypot(e[0] - A[0], e[1] - A[1]) < 3; }).map((k) => k.pts.map((q) => [q[0], q[1]]));
      const M = tsAcAg(grp, A, tm, tohum); if (!M) { yok += grp.length; continue; }
      const tumYol = [...tohum, ...M.values()];
      for (const x of grp) {
        const yol = M.get(x.it.id); if (!yol || yol.length < 2) { yok++; continue; }
        const g = { ...v, tip: 'ac', no: (x.it.ges && x.it.ges.no) || tsSonNo('ac') }, L = tsBoy(yol); top += L + (+g.pay || 0); n++;
        const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: yol.map((q) => [q[0], q[1], 0]), ges: g };
        const e = tsEtiketYeri(yol, tumYol);
        yeni.push([null, pl], [null, { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: e.x, y: e.y, h: KABLO_YZ, rot: e.rot, s: tsEtiket('ac', g, L), ha: 1, va: 0, gesEt: pl.id }]);
      }
    }
    const sil = []; for (const k of silinecek) { sil.push([k, null]); for (const t of S.doc.items.values()) if (t.gesEt === k.id) sil.push([t, null]); }
    if (!yeni.length && !sil.length) { msg('Kablo çizilemedi (saha çok büyük ya da engelsiz yol yok).', 'err'); return; }
    replaceItems([...sil, ...yeni], 'AC otomatik'); tsKanalCiz(); renderLayers();
    msg(n + ' inverterden AG panoya AC kablo çizildi (ortak kanal + branşman, ' + tms.length + ' trafo) · toplam ' + fmtNum(top, 0) + ' m' + (yok ? ' · ' + yok + ' inverterde yol bulunamadı — elle çizin' : '') + '. Geri al ile tek adımda kaldırılır.', yok ? 'note' : 'res');
  } finally { busy(null); }
};
Object.assign(ALIAS, { GACOTO: 'GACOTO', ACOTO: 'GACOTO' }); Object.assign(LABEL, { GACOTO: 'AC OTOMATİK' });
Object.assign(ALIAS, { GDCCIZ: 'GDCCIZ', DCCIZ: 'GDCCIZ' }); Object.assign(LABEL, { GDCCIZ: 'DC ÇİZ' });
Object.assign(ALIAS, { GINVEKLE: 'GINVEKLE', INVEKLE: 'GINVEKLE', GTMEKLE: 'GTMEKLE', TRAFOEKLE: 'GTMEKLE', GDMEKLE: 'GDMEKLE', DMEKLE: 'GDMEKLE', GOGK: 'GOGK', OGKABLO: 'GOGK', GACK: 'GACK', ACKABLO: 'GACK', GDCK: 'GDCK', DCKABLO: 'GDCK', GVERI: 'GVERI', VERI: 'GVERI' });
Object.assign(LABEL, { GINVEKLE: 'İNVERTER EKLE', GTMEKLE: 'TRAFO EKLE', GDMEKLE: 'DM EKLE', GOGK: 'OG KABLO', GACK: 'AC KABLO', GDCK: 'DC ATA', GVERI: 'VERİ DÜZENLE' });

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
    else if (g.tip === 'dcata') continue;
    else if (g.tip === 'dcstr') kabEkle('dc', g.kablo + ' (' + 'string)', +g.L || 0);
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
// String düzeni değişince mevcut DC atamalı inverterlerin stringleri yeni düzenle yeniden çizilir
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'p-strtip' && typeof S !== 'undefined' && S.doc) { const ids = [...new Set(tsAtamalar().values())]; if (ids.length) { tsDcInvYenile(ids); msg('String düzeni: ' + (e.target.value === 'altust' ? 'alt / üst string (2 masa)' : 'tek masa tek string') + ' — ' + ids.length + ' inverterin stringleri yeniden çizildi.', 'res'); } } });

// Atama yapıldıkça masa rengi inverterine göre değişir (her inverter ayrı renk; atanmamış masa katman renginde)
const TS_MASA_PAL = [30, 3, 6, 4, 2, 140, 210, 40, 160, 230, 90, 190, 50, 120, 250, 10];
function tsMasaRenkle() {
  if (!S.doc) return; const at = tsAtamalar(), pairs = [];
  for (const it of S.doc.items.values()) {
    if (String(it.layer).toUpperCase() !== 'GES-MASA') continue;
    const iid = at.get(it.id), inv = iid && S.doc.items.get(iid); const no = inv && inv.ges ? (+inv.ges.no || 1) : null;
    const c = no ? TS_MASA_PAL[(no - 1) % TS_MASA_PAL.length] : 256;
    if (it.t === 'insert') {   // blok içi çizgiler katman renginde: renkli blok kopyası kullanılır
      const kok = String(it.block).replace(/_C\d+$/, ''), hedef = c === 256 ? kok : kok + '_C' + c;
      if (hedef !== it.block) { if (!S.doc.blocks.get(hedef)) { const b = S.doc.blocks.get(kok); if (!b) continue; setBlock(hedef, (b.ents || []).map((e) => ({ ...e, colorIndex: c }))); } pairs.push([it, { ...it, block: hedef }]); }
    } else if ((it.c ?? 256) !== c) pairs.push([it, { ...it, c }]);
  }
  if (pairs.length) { replaceItems(pairs, 'masa rengi'); renderLayers(); }
}
