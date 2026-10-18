// ---- Tasarım araçları: inverter, trafo (TM), DM, OG / AC / DC kablo — tıkla-ekle, veri yaz, kendi katmanında hesaba girsin ----
// Her öğe kendi GES katmanında durur ve verisini `ges` alanında taşır; etiketi (yazı) aynı veriyi gösterir.
// DXF'ten geri açılınca veri etiketten okunur (TASARIM_ETIKET_RE). Özet (adet × güç, kablo boyları) çizim değiştikçe güncellenir.
const TS = {
  inv: { ad: 'İnverter', kat: 'GES-INV', renk: 6, alan: [['kw', 'Güç (kW)', () => pn('p-inv') ?? 100], ['model', 'Model', () => pv('p-invm') || '']] },
  tm: { ad: 'Trafo (TM)', kat: 'GES-TM', renk: 30, alan: [['kva', 'Güç (kVA)', () => pn('p-trafo') ?? 1250], ['gerilim', 'Gerilim', () => '33/0,4 kV']] },
  dm: { ad: 'DM', kat: 'GES-TM', renk: 30, alan: [['not', 'Not', () => 'Dağıtım merkezi']] },
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
function tsSembol(tip, x, y, s) {   // basit sembol (çizim ölçeğinde, s = boyut m)
  const o = []; const kat = TS[tip].kat, c = TS[tip].renk;
  if (tip === 'inv') { o.push({ t: 'pline', cl: true, pts: [[x - s, y - s * 0.6, 0], [x + s, y - s * 0.6, 0], [x + s, y + s * 0.6, 0], [x - s, y + s * 0.6, 0]] }, { t: 'line', x1: x - s, y1: y - s * 0.6, x2: x + s, y2: y + s * 0.6 }); }
  else { const w = tip === 'tm' ? 3 * s : 2.4 * s, h = 1.6 * s; o.push({ t: 'pline', cl: true, pts: [[x - w / 2, y - h / 2, 0], [x + w / 2, y - h / 2, 0], [x + w / 2, y + h / 2, 0], [x - w / 2, y + h / 2, 0]] }); if (tip === 'tm') { o.push({ t: 'circle', cx: x - s * 0.35, cy: y, r: s * 0.55 }, { t: 'circle', cx: x + s * 0.35, cy: y, r: s * 0.55 }); } }
  return o.map((q) => ({ id: newId(), layer: kat, c, lt: '', ...q }));
}
function tsSonNo(tip) { let n = 0; for (const it of S.doc.items.values()) if (it.ges && it.ges.tip === tip && it.ges.no) n = Math.max(n, it.ges.no); return n + 1; }
function tsOlcek() { return Math.max(0.6, 12 / V().s); }   // ekranda ~12 px
async function tsNokta(tip) {
  const T = TS[tip]; const v = await formDlg(T.ad + ' ekle', T.alan); if (!v) return;
  v.no = tip === 'dm' ? null : tsSonNo(tip);
  for (;;) {
    const p = await getPoint(T.ad + ' konumu (bitirmek için Enter):'); if (!Array.isArray(p)) return;
    S.doc.addLayer(T.kat, T.renk); const s = tip === 'inv' ? 1.2 : 2.5; const g = { ...v, tip };
    const sem = tsSembol(tip, p[0], p[1], s); sem[0].ges = g;
    const yz = { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: p[0] + s * 1.8, y: p[1], h: Math.max(0.8, s * 0.7), rot: 0, s: tsEtiket(tip, g), ha: 0, va: 2, gesEt: sem[0].id };
    addItems([...sem, yz], T.ad.toLowerCase()); renderLayers(); msg(tsEtiket(tip, g) + ' eklendi.', 'res');
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
  const L = tsBoy(pts), g = { ...v, tip }; S.doc.addLayer(T.kat, T.renk);
  const pl = { id: newId(), t: 'pline', layer: T.kat, c: T.renk, lt: '', cl: false, pts: pts.map((q) => [q[0], q[1], 0]), ges: g };
  const k = Math.floor(pts.length / 2), a = pts[k - 1], b = pts[k]; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  const yz = { id: newId(), t: 'text', layer: T.kat, c: T.renk, lt: '', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, h: Math.max(0.6, tsOlcek() * 0.8), rot: ang, s: tsEtiket(tip, g, L), ha: 1, va: 0, gesEt: pl.id };
  addItems([pl, yz], T.ad.toLowerCase()); renderLayers(); msg(tsEtiket(tip, g, L) + ' eklendi.', 'res');
}
// Veri düzenle: öğeye (sembol, kablo ya da etiketi) tıkla → form → veri + etiket güncellenir
CMD.GVERI = async () => {
  for (;;) {
    const p = await getPoint('Veri düzenlenecek tasarım öğesini tıklayın (Enter: bitir):'); if (!Array.isArray(p)) return;
    const q = V().w2s(p[0], p[1]); let it = pickItem(q[0], q[1], 10);
    if (it && !it.ges && it.gesEt) it = S.doc.items.get(it.gesEt);
    if (!it || !it.ges) { msg('Tasarım öğesi değil (İnverter, Trafo, DM ya da kablo seçin).', 'err'); continue; }
    const g = it.ges, T = TS[g.tip]; const v = await formDlg(T.ad + ' verisi', T.alan, g); if (!v) continue;
    const ng = { ...g, ...v }; const pairs = [[it, { ...it, ges: ng }]];
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
