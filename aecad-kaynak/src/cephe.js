// ---- Cephe (komşuluk): arazi sınırının her kenarı yol / komşu parsel / diğer olarak işaretlenir; her tip kendi çekme mesafesini alır ----
// Kayıt kenar uçlarıyla tutulur (sınır sırası değişse de eşleşir). İşaretsiz kenar genel çekmeyi alır.
const CEPHE_TIP = {
  yol: { ad: 'Yol', kisa: 'YOL', c: 1, renk: '#ef4444', id: 'p-cyol' },
  parsel: { ad: 'Komşu parsel', kisa: 'PARSEL', c: 3, renk: '#22c55e', id: 'p-cpar' },
  diger: { ad: 'Diğer', kisa: 'DİĞER', c: 5, renk: '#3b82f6', id: 'p-cdig' },
};
const CKEY = 'aecad.cephe.v1';
G.cephe = [];
function cepheYukle() { try { G.cephe = JSON.parse(localStorage.getItem(CKEY) || '[]') || []; } catch (e) { G.cephe = []; } }
function cepheKaydet() { try { localStorage.setItem(CKEY, JSON.stringify(G.cephe)); } catch (e) { /* ignore */ } }
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function cepheTip(p, q) { for (const c of G.cephe) if (segDist(p, c.a, c.b) <= 0.5 && segDist(q, c.a, c.b) <= 0.5) return c.tip; return null; }
function cepheD(tip, genel) { if (!tip || !CEPHE_TIP[tip]) return genel; const v = pn(CEPHE_TIP[tip].id); return v ?? genel; }
function cepheKenarlar() {
  if (!G.bound) return []; const B = G.bound;
  return B.map((p, i) => { const q = B[(i + 1) % B.length]; return { i, a: p, b: q, tip: cepheTip(p, q), L: Math.hypot(q[0] - p[0], q[1] - p[1]) }; });
}
function cepheVar() { return cepheKenarlar().some((k) => k.tip); }
function cepheAta(i, tip) {
  const k = cepheKenarlar()[i]; if (!k) return;
  G.cephe = G.cephe.filter((c) => !(segDist(k.a, c.a, c.b) <= 0.5 && segDist(k.b, c.a, c.b) <= 0.5));
  if (tip) G.cephe.push({ a: [k.a[0], k.a[1]], b: [k.b[0], k.b[1]], tip });
  cepheKaydet(); cepheCiz(); cepheBilgi(); if (typeof tfPreview === 'function') tfPreview();
}
// script parametresi: işaretli kenarlar + mesafe (genel = Çitten çekme)
function cepheParam() {
  const g = pn('p-cekme') ?? 5;
  return cepheKenarlar().filter((k) => k.tip).map((k) => ({ a: [+k.a[0].toFixed(3), +k.a[1].toFixed(3)], b: [+k.b[0].toFixed(3), +k.b[1].toFixed(3)], tip: k.tip, cekme_m: cepheD(k.tip, g) }));
}
function cepheOzet(genel) {
  const t = {}; for (const k of cepheKenarlar()) { const n = k.tip || 'genel'; t[n] = (t[n] || 0) + k.L; }
  return Object.keys(t).map((n) => (n === 'genel' ? 'işaretsiz' : CEPHE_TIP[n].ad.toLowerCase()) + ' ' + fmtNum(t[n], 0) + ' m → ' + fmtNum(n === 'genel' ? genel : cepheD(n, genel), 1) + ' m çekme').join(' · ');
}
function cepheBilgi() { const el = gv('g-cinfo'); if (!el) return; el.textContent = G.bound ? (cepheVar() ? 'Cepheler: ' + cepheOzet(pn('p-cekme') ?? 5) : 'Cephe işaretlenmedi — tüm kenarlarda genel çekme.') : ''; }
// çizimde işaret: GES-CEPHE katmanı (renkli kenar + etiket); her değişiklikte yeniden üretilir
function cepheCiz() {
  if (!S.doc || PJ.srcDoc) return;
  const eski = [...S.doc.items.values()].filter((it) => it.layer === 'GES-CEPHE');
  const yeni = []; const K = cepheKenarlar().filter((k) => k.tip);
  if (K.length) {
    S.doc.addLayer('GES-CEPHE', 1);
    const bb = G.bound.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
    const th = Math.max(1, Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 90), cen = centroidOf(G.bound), g = pn('p-cekme') ?? 5;
    for (const k of K) {
      const T = CEPHE_TIP[k.tip];
      yeni.push({ id: newId(), t: 'line', layer: 'GES-CEPHE', c: T.c, lt: '', x1: k.a[0], y1: k.a[1], x2: k.b[0], y2: k.b[1] });
      const mx = (k.a[0] + k.b[0]) / 2, my = (k.a[1] + k.b[1]) / 2; let nx = -(k.b[1] - k.a[1]) / (k.L || 1), ny = (k.b[0] - k.a[0]) / (k.L || 1);
      if ((cen[0] - mx) * nx + (cen[1] - my) * ny < 0) { nx = -nx; ny = -ny; }
      let ang = Math.atan2(k.b[1] - k.a[1], k.b[0] - k.a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      yeni.push({ id: newId(), t: 'text', layer: 'GES-CEPHE', c: T.c, lt: '', x: mx + nx * th * 1.6, y: my + ny * th * 1.6, h: th, rot: ang, s: T.kisa + ' · ' + fmtNum(cepheD(k.tip, g), 1) + ' m', ha: 1, va: 2 });
    }
  }
  if (!eski.length && !yeni.length) return;
  replaceItems([...eski.map((it) => [it, null]), ...yeni.map((n) => [null, n])], 'cephe'); renderLayers();
}
CMD.GCEPHE = async () => {
  if (!G.bound) { msg('Önce arazi sınırını seçin.', 'err'); return; }
  for (;;) {
    const p = await getPoint('Cepheyi (sınır kenarını) tıklayın — bitirmek için Enter:', {}); if (!Array.isArray(p)) return;
    const K = cepheKenarlar(); let best = null, bd = Infinity;
    for (const k of K) { const d = segDist(p, k.a, k.b); if (d < bd) { bd = d; best = k; } }
    if (!best || bd > 20 / V().s) { msg('Sınır kenarı bulunamadı; kenara daha yakın tıklayın.', 'err'); continue; }
    const g = pn('p-cekme') ?? 5;
    const r = await askDlg('Cephe ' + (best.i + 1) + ' · ' + fmtNum(best.L, 0) + ' m', 'Bu kenar neye komşu? Çekme mesafesi tipe göre uygulanır (GES → Arazi doldurma alanlarından değiştirilir).',
      [['Yol · ' + fmtNum(cepheD('yol', g), 1) + ' m', 'yol', 'primary'], ['Komşu parsel · ' + fmtNum(cepheD('parsel', g), 1) + ' m', 'parsel'], ['Diğer · ' + fmtNum(cepheD('diger', g), 1) + ' m', 'diger'], ['Genel · ' + fmtNum(g, 1) + ' m', 'genel', 'ghost']]);
    if (r === null) continue;
    cepheAta(best.i, r === 'genel' ? null : r); msg('Cephe ' + (best.i + 1) + ': ' + (r === 'genel' ? 'genel çekme' : CEPHE_TIP[r].ad) + '.', 'res');
  }
};
Object.assign(ALIAS, { GCEPHE: 'GCEPHE', CEPHE: 'GCEPHE' });
Object.assign(LABEL, { GCEPHE: 'CEPHE İŞARETLE' });

// fillLand için: cephe bazlı iç alan halkaları (yerel koordinatta); işaret yoksa null
function cepheIcHalkalar(toL, genel) {
  const K = cepheKenarlar(); if (!K.some((k) => k.tip)) return null;
  const circ = (c, r) => { const o = []; for (let j = 0; j < 20; j++) { const t = j / 20 * 2 * Math.PI; o.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); } o.push(o[0]); return [o]; };
  const parts = [];
  for (const k of K) {
    const d = k.tip ? cepheD(k.tip, genel) : genel; if (!(d > 0)) continue;
    const a = toL(k.a), b = toL(k.b), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * d, ny = (b[0] - a[0]) / L * d;
    parts.push([[[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny], [a[0] + nx, a[1] + ny]]], circ(a, d));
  }
  const R = G.bound.map(toL); const res = polygonClipping.difference([[...R, R[0]]], ...parts);
  return res.flatMap((pg) => pg.map((r) => r.slice(0, -1))).filter((r) => r.length >= 3);
}
function scanXR(rings, y) {
  const xs = []; for (const poly of rings) { const n = poly.length; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } }
  xs.sort((p, q) => p - q); const iv = []; for (let i = 0; i + 1 < xs.length; i += 2) iv.push([xs[i], xs[i + 1]]); return iv;
}
function cepheInit() {
  cepheYukle(); cepheBilgi();
  const b = gv('g-bcephe'); if (b) b.onclick = () => runCommand('GCEPHE');
  for (const id of ['p-cyol', 'p-cpar', 'p-cdig', 'p-cekme']) { const el = gv(id); if (el) el.addEventListener('change', () => { cepheCiz(); cepheBilgi(); if (typeof tfPreview === 'function') tfPreview(); }); }
}
