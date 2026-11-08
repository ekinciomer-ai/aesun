// ---- DWG/DXF PROJE ANALİZİ (kullanıcı isteği 20.10.2026): açılan yabancı bir projeyi (başka müellifin DWG'si) inceler,
// masa / inverter / trafo / parsel / yol nesnelerini tanır, bizim proje formatına (GES-MASA bloğu, inverter-TM tasarım nesnesi,
// arazi sınırı, şablon ve sıra aralığı) çevirir. Sonra "son hali onayla" ile proje paftaları bizim sistemle üretilir.
function dwgOzet() {
  const D = S.doc; if (!D) return null;
  const it = [...D.items.values()], up = (x) => String(x.layer || '').toUpperCase();
  const bbOf = (x) => { const b = itemBB(D, x); return b && isFinite(b[0]) && isFinite(b[2]) ? b : null; };
  // blok yerel boyutu (döndürülmemiş)
  const blkBoy = new Map();
  const yerel = (ad) => { if (blkBoy.has(ad)) return blkBoy.get(ad); let r = null; try { const b = itemBB(D, { id: -1, t: 'insert', block: ad, M: mT(0, 0), ap: [] }); if (b && isFinite(b[0])) r = [b[2] - b[0], b[3] - b[1]]; } catch (e) { } blkBoy.set(ad, r); return r; };
  // gruplar: blok adı (insert) ya da kapalı pline boyut sınıfı
  const grp = new Map();
  for (const x of it) {
    if (x.ges) continue;   // zaten bizim tasarım nesnesi
    let k = null, w = 0, h = 0, rot = 0, c = null;
    if (x.t === 'insert' && x.block) { const yb = yerel(x.block); if (!yb) continue; w = Math.max(yb[0], yb[1]); h = Math.min(yb[0], yb[1]); rot = Math.atan2(x.M[4], x.M[0]); const b = bbOf(x); if (!b) continue; c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; k = 'B:' + x.block; }
    else if (x.t === 'pline' && x.cl && x.pts && x.pts.length >= 4 && x.pts.length <= 12) {
      const b = bbOf(x); if (!b) continue; const P = x.pts; let L = 0, ang = 0; for (let i = 0; i < P.length; i++) { const a = P[i], q = P[(i + 1) % P.length], l = Math.hypot(q[0] - a[0], q[1] - a[1]); if (l > L) { L = l; ang = Math.atan2(q[1] - a[1], q[0] - a[0]); } }
      const ca = Math.cos(-ang), sa = Math.sin(-ang); const R = P.map((q) => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca]); const xs = R.map((q) => q[0]), ys = R.map((q) => q[1]);
      w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys); if (w < h) { const t = w; w = h; h = t; }
      rot = ((ang % Math.PI) + Math.PI) % Math.PI; if (rot > Math.PI / 2) rot -= Math.PI; c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; k = 'P:' + up(x) + ':' + Math.round(w * 2) / 2 + 'x' + Math.round(h * 4) / 4;
    } else continue;
    let g = grp.get(k); if (!g) { g = { k, ad: k.slice(2), lay: new Set(), n: 0, w, h, uy: [] }; grp.set(k, g); }
    g.n++; g.lay.add(up(x)); g.uy.push({ x, c, rot, w, h });
  }
  const G_ = [...grp.values()];
  const say = (g) => g.n, isim = (g) => (g.ad + ' ' + [...g.lay].join(' ')).toUpperCase();
  // masa: en kalabalık, 5–60 m × 1–12 m
  const masaA = G_.filter((g) => g.n >= 10 && g.w >= 5 && g.w <= 60 && g.h >= 1 && g.h <= 12).sort((a, b) => say(b) - say(a));
  const masa = masaA[0] || null;
  // inverter: 0,3–3 m, 2–500 adet; adı/katmanı INV olan önce
  const invA = G_.filter((g) => g !== masa && g.n >= 2 && g.n <= 500 && g.w >= 0.3 && g.w <= 3.5 && g.h <= 3.5).sort((a, b) => (/INV/.test(isim(b)) - /INV/.test(isim(a))) || say(b) - say(a));
  const inv = invA.find((g) => /INV/.test(isim(g))) || null;
  // trafo / köşk: 3–25 m, 1–40 adet, adı/katmanı TM/TRAFO/KÖŞK
  const tmA = G_.filter((g) => g !== masa && g.n >= 1 && g.n <= 40 && g.w >= 3 && g.w <= 25 && g.h >= 2).filter((g) => /\bTM|TRAFO|KOSK|KÖŞK|KÖSK|\bTR-?\d|SUBSTATION|\bADP|\bDM\b|ŞALT|SALT/.test(isim(g)));
  const tm = tmA.sort((a, b) => say(b) - say(a))[0] || null;
  // parsel: masa merkezlerinin ≥ %90'ını içeren en küçük kapalı pline (3+ köşe); PARSEL/SINIR/ÇİT katmanı önce
  let parsel = null;
  if (masa) {
    const mc = masa.uy.map((u) => u.c);
    const ad = it.filter((x) => x.t === 'pline' && x.cl && x.pts && x.pts.length >= 3 && !x.ges && !(masa.uy.some((u) => u.x === x))).map((x) => ({ x, pts: x.pts.map((q) => [q[0], q[1]]), A: Math.abs(polyArea(x.pts.map((q) => [q[0], q[1]]))) }))
      .filter((o) => o.A > 1000 && mc.filter((c) => pointInPoly(c, o.pts)).length >= mc.length * 0.9)
      .sort((a, b) => (/PARSEL|SINIR|SNR|CIT|ÇİT|FENCE|BOUND|KADASTRO|ARAZI|ARAZİ/.test(up(b.x)) - /PARSEL|SINIR|SNR|CIT|ÇİT|FENCE|BOUND|KADASTRO|ARAZI|ARAZİ/.test(up(a.x))) || a.A - b.A);
    parsel = ad[0] || null;
  }
  // yollar: YOL/ROAD katmanındaki plinelar
  const yol = it.filter((x) => x.t === 'pline' && !x.ges && /YOL|ROAD|SERVIS|SERVİS/.test(up(x)) && !(parsel && parsel.x === x));
  return { masa, inv, tm, parsel, yol, gruplar: G_ };
}
function dwgSiraBilgi(masa) {   // sıra açısı (baskın), sıra sayısı ve sıra aralığı (medyan)
  const rots = masa.uy.map((u) => u.rot); const ang = rots.sort((a, b) => a - b)[Math.floor(rots.length / 2)];
  const c = Math.cos(ang), s = Math.sin(ang); const ys = masa.uy.map((u) => -u.c[0] * s + u.c[1] * c).sort((a, b) => a - b);
  const sira = []; for (const y of ys) { const r = sira[sira.length - 1]; if (r && Math.abs(y - r.y) < masa.h * 0.6) { r.n++; r.y = (r.y * (r.n - 1) + y) / r.n; } else sira.push({ y, n: 1 }); }
  const ar = []; for (let i = 1; i < sira.length; i++) ar.push(sira[i].y - sira[i - 1].y); ar.sort((a, b) => a - b);
  return { ang, sira: sira.length, pitch: ar.length ? ar[Math.floor(ar.length / 2)] : null };
}
CMD.GDWGTANI = async () => {
  if (!S.doc || !S.doc.items.size) { msg('Önce analiz edilecek DWG/DXF dosyasını açın (Aç).', 'err'); return; }
  busy('Çizim inceleniyor…'); await tick();
  let O; try { O = dwgOzet(); } finally { busy(null); }
  if (!O || !O.masa) { msg('Masa dizisi bulunamadı: çizimde tekrar eden masa bloğu/kapalı çokgen yok (en az 10 adet, 5–60 m boy).', 'err'); return; }
  const M = O.masa, SB = dwgSiraBilgi(M);
  // şablon: masa boyuna en yakın mevcut şablon
  const tpl = G.tpl.map((tp, i) => ({ tp, i, d: tplDims(tp) })).sort((a, b) => Math.abs(a.d.len - M.w) + Math.abs(a.d.depth - M.h) * 0.5 - (Math.abs(b.d.len - M.w) + Math.abs(b.d.depth - M.h) * 0.5));
  const T = tpl[0]; const fark = T ? Math.abs(T.d.len - M.w) : 99;
  const satir = [
    'Masa: ' + M.n + ' adet · ' + fmtNum(M.w, 2) + ' × ' + fmtNum(M.h, 2) + ' m · ' + SB.sira + ' sıra · sıra aralığı ' + (SB.pitch ? fmtNum(SB.pitch, 2) + ' m' : '?') + ' · açı ' + fmtNum(SB.ang * 180 / Math.PI, 1) + '° (' + M.ad + ')',
    'Şablon: ' + (T ? T.tp.rows + T.tp.orient + T.tp.per + ' (' + fmtNum(T.d.len, 2) + ' m' + (fark > 0.6 ? ', boy farkı ' + fmtNum(fark, 2) + ' m — Masa şablonundan düzeltin' : '') + ')' : 'yok'),
    'İnverter: ' + (O.inv ? O.inv.n + ' adet (' + O.inv.ad + ')' : 'bulunamadı — sonra "İnverter ekle" ile konur'),
    'Trafo/köşk: ' + (O.tm ? O.tm.n + ' adet (' + O.tm.ad + ')' : 'bulunamadı — sonra "Trafo ekle" ile konur'),
    'Parsel sınırı: ' + (O.parsel ? fmtNum(O.parsel.A / 10000, 2) + ' ha (' + String(O.parsel.x.layer) + ')' : 'bulunamadı — masaların dış zarfı + 5 m alınır'),
    'Yol çizgisi: ' + O.yol.length + ' adet (bilgi; iç yol bizim kuralla yeniden değerlendirilir)',
  ];
  const r = await askDlg('DWG proje analizi', satir.join('\n') + '\n\nTanınan nesneler bizim proje formatına çevrilsin mi? (Tanınan orijinal nesneler silinir, diğer katmanlar kalır; Geri al ile döner.)', [['Dönüştür', 'ok', 'primary'], ['Vazgeç', null, 'ghost']]);
  if (r !== 'ok') return;
  busy('Proje formatına çevriliyor…'); await tick();
  try {
    const D = S.doc, sil = new Set(), yeni = [];
    // 1) parsel → arazi sınırı
    let pts; if (O.parsel) { pts = O.parsel.pts; sil.add(O.parsel.x); }
    else { const H = tsHull(M.uy.map((u) => u.c)); const c0 = centroidOf(H); pts = H.map((p) => { const d = Math.hypot(p[0] - c0[0], p[1] - c0[1]) || 1; const e = 5 + M.w / 2; return [p[0] + (p[0] - c0[0]) / d * e, p[1] + (p[1] - c0[1]) / d * e]; }); }
    G.parcels = [{ ad: 'P1', pts: pts.map((q) => [+q[0].toFixed(3), +q[1].toFixed(3)]), src: 'dwg' }]; parselBirlestir(); G.boundSrc = 'dwg';
    // 2) masa → bizim şablon bloğu, aynı merkez ve açı
    if (T) { if (gv('p-masa')) { gv('p-masa').value = String(T.i); } const tp = T.tp; const ad = makeTableBlock(tp); S.doc.addLayer('GES-MASA', 5); S.doc.layers.get('GES-MASA').c = masaRenk();
      const angD = +(SB.ang * 180 / Math.PI).toFixed(2); if (gv('g-ang')) gv('g-ang').value = String(angD);
      if (SB.pitch && gv('g-hrs') && gv('g-pitch')) { gv('g-hrs').value = 'manual'; gv('g-pitch').value = SB.pitch.toFixed(2); }
      for (const u of M.uy) { sil.add(u.x); const o = { id: newId(), t: 'insert', layer: 'GES-MASA', c: 256, lt: '', block: ad, M: mMul(mT(0, 0), mRz(SB.ang)), ap: [] };
        const b = itemBB(D, o); const ox = (b[0] + b[2]) / 2, oy = (b[1] + b[3]) / 2; o.M = mMul(mT(u.c[0] - ox, u.c[1] - oy), mRz(SB.ang)); _bbCache.delete(o); _drCache.delete(o); yeni.push(o); }
    }
    // 3) inverter / trafo → tasarım nesnesi
    const ekle = (tip, c, g) => { const TT = TS[tip]; const v = {}; for (const [k, , f] of TT.alan) v[k] = f(); Object.assign(v, g, { tip }); D.addLayer(TT.kat, TT.renk);
      const B = tsBlok(tip, v); const o = { id: newId(), t: 'insert', layer: TT.kat, c: 256, lt: '', block: B.ad, M: mMul(mT(0, 0), mRz(SB.ang)), ap: [], ges: v };
      const b = itemBB(D, o); const ox = (b[0] + b[2]) / 2 - o.M[3], oy = (b[1] + b[3]) / 2 - o.M[7]; o.M = mMul(mT(c[0] - ox, c[1] - oy), mRz(SB.ang)); _bbCache.delete(o); _drCache.delete(o); yeni.push(o); };
    if (O.inv) O.inv.uy.forEach((u, i) => { sil.add(u.x); ekle('inv', u.c, { no: i + 1, kw: pn('p-inv') || 100 }); });
    if (O.tm) O.tm.uy.forEach((u, i) => { sil.add(u.x); ekle('tm', u.c, { no: i + 1, kva: pn('p-trafo') || 1250, hucre: 3 }); });
    replaceItems([...[...sil].map((x) => [x, null]), ...yeni.map((n) => [null, n])], 'DWG → proje'); renderLayers();
    G.fillIds = yeni.filter((o) => o.layer === 'GES-MASA').map((o) => o.id);
    if (T) { const n = M.n; G.last = { cnt: [n], types: [{ tp: T.tp, n: T.d.n, len: T.d.len, depth: T.d.depth, kwp: T.d.kwp }], mods: n * T.d.n, kwp: n * T.d.kwp, rows: SB.sira, area: Math.abs(polyArea(pts)), pitch: SB.pitch || gnum('g-pitch', 8.7) }; if (typeof pjAutoHints === 'function') pjAutoHints(); }
    if (typeof gesSave === 'function') gesSave(); if (typeof pjSave === 'function') pjSave(); if (typeof pjOnayDurum === 'function') pjOnayDurum();
    const ek = [];
    if (!O.inv) ek.push('inverter yok: "İnverter +" ile ekleyin ya da "son hali onayla" otomatik yerleştirir');
    if (!O.tm) ek.push('trafo yok: "Trafo +" ile ekleyin ya da otomatik yerleşir');
    if (fark > 0.6) ek.push('masa boyu şablondan ' + fmtNum(fark, 2) + ' m farklı: Masa şablonunda panel/dizilimi düzeltin');
    msg('DWG projesi dönüştürüldü: ' + M.n + ' masa' + (O.inv ? ', ' + O.inv.n + ' inverter' : '') + (O.tm ? ', ' + O.tm.n + ' trafo' : '') + ', parsel ' + fmtNum(Math.abs(polyArea(pts)) / 10000, 2) + ' ha. Sıradaki adım: "son hali onayla" → proje paftaları bizim sistemle üretilir.' + (ek.length ? ' Not: ' + ek.join('; ') + '.' : ''), 'res');
  } finally { busy(null); }
};
Object.assign(ALIAS, { GDWGTANI: 'GDWGTANI', DWGANALIZ: 'GDWGTANI', DWGTANI: 'GDWGTANI', PROJEDONUSTUR: 'GDWGTANI' }); Object.assign(LABEL, { GDWGTANI: 'DWG PROJE ANALİZİ' });
