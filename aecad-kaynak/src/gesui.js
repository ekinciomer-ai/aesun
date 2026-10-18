// ---- GES panel UI ----
const GKEY = 'aksaraycad.ges.v1';
// Standart masa kütüphanesi (proje masası listesi). TİP-1 varsayılan; diğerleri listede seçilebilir, arazi doldurmada kapalı gelir.
const TPL_STD = [['V', 2, 13, 25], ['V', 2, 13, 20], ['V', 2, 12, 25], ['V', 2, 14, 25], ['V', 2, 26, 25], ['V', 2, 28, 25], ['V', 1, 26, 25], ['V', 1, 28, 25], ['V', 3, 13, 25], ['H', 4, 13, 25], ['H', 3, 20, 25]];
const TPL_STD_V = 1;
function tplStdMerge() {
  for (const [o, r, n, a] of TPL_STD) if (!G.tpl.some((t) => t.orient === o && t.rows === r && t.per === n && t.tilt === a)) G.tpl.push({ orient: o, rows: r, per: n, tilt: a, gx: 0.02, gy: 0.02, front: 0.8, use: G.tpl.length === 0 });
  G._stdv = TPL_STD_V;
}
function gesSave() { try { localStorage.setItem(GKEY, JSON.stringify({ panel: G.panel, tpl: G.tpl, set: gesSettings(), stdv: G._stdv || 0 })); } catch (e) { /* storage unavailable */ } }
function gesLoad() {
  let stdv = 0;
  try { const s = JSON.parse(localStorage.getItem(GKEY) || 'null'); if (s && s.panel) { G.panel = s.panel; G.tpl = s.tpl || []; G._set = s.set || null; stdv = s.stdv || 0; } } catch (e) { /* ignore */ }
  if (stdv < TPL_STD_V) tplStdMerge(); else G._stdv = stdv;   // bir kez eklenir; kullanıcının sildiği şablon geri gelmez
}
const gv = (id) => document.getElementById(id);
const gnum = (id, d = 0) => { const v = parseFloat(String(gv(id).value).replace(',', '.')); return isFinite(v) ? v : d; };
function gesSettings() { const ids = ['g-lat', 'g-zone', 'g-set', 'g-gap', 'g-ang', 'g-hrs', 'g-pitch', 'g-align', 'g-valign']; const o = {}; for (const i of ids) if (gv(i)) o[i] = gv(i).value; return o; }

function panelToForm() {
  const P = G.panel; gv('g-model').value = P.model || ''; gv('g-p').value = P.p; gv('g-L').value = P.L; gv('g-W').value = P.W; gv('g-T').value = P.T || ''; gv('g-cells').value = P.cells || '';
  const pl = gv('g-plist'); pl.innerHTML = ''; if (P.powers && P.powers.length > 1) { pl.hidden = false; for (const w of P.powers) { const b = document.createElement('button'); b.className = 'chip' + (w === P.p ? ' on' : ''); b.textContent = w; b.onclick = () => { P.p = w; panelToForm(); tplUpdate(); gesSave(); }; pl.appendChild(b); } } else pl.hidden = true;
  gv('g-pinfo').textContent = (P.L / 1000).toFixed(3) + ' × ' + (P.W / 1000).toFixed(3) + ' m · ' + ((P.L * P.W) / 1e6).toFixed(3) + ' m² · verim ≈ ' + (P.p / (P.L * P.W / 1e6) / 10).toFixed(1) + ' %' + (P.bifacial ? ' · çift yüzlü' : '');
}
function formToPanel() {
  const P = G.panel; P.model = gv('g-model').value.trim() || P.model; P.p = gnum('g-p', P.p); P.L = gnum('g-L', P.L); P.W = gnum('g-W', P.W); P.T = gnum('g-T', P.T); P.cells = gnum('g-cells', P.cells);
  if (P.W > P.L) [P.W, P.L] = [P.L, P.W];
  panelToForm(); tplUpdate(); gesSave();
}
function curTpl() { return { orient: gv('g-or').value, rows: Math.max(1, Math.round(gnum('g-rows', 2))), per: 0, tilt: gnum('g-tilt', 25), gx: gnum('g-gx', 2) / 100, gy: gnum('g-gx', 2) / 100, front: gnum('g-front', 0.8), total: Math.max(1, Math.round(gnum('g-n', 52))) }; }
function tplFromForm() { const t = curTpl(); t.per = Math.max(1, Math.ceil(t.total / t.rows)); delete t.total; return t; }
function tplUpdate() {
  const t = tplFromForm(); const d = tplDims(t); const tot = Math.round(gnum('g-n', 52));
  gv('g-tinfo').innerHTML = '';
  const kv = [['Dizilim', t.rows + t.orient + t.per + (t.rows * t.per !== tot ? '  (' + t.rows * t.per + ' modüle yuvarlandı)' : '')], ['Masa boyu', fmtNum(d.len, 2) + ' m'], ['Plan derinliği', fmtNum(d.depth, 2) + ' m'], ['Eğik boy', fmtNum(d.slant, 2) + ' m'], ['Arka yükseklik', fmtNum(d.back, 2) + ' m'], ['Ayak', (() => { const L = legLayout(t); const n = L.length / 2; return n + ' aks × 2 = ' + L.length + ' ayak · açıklık ' + fmtNum(n > 1 ? L[1][0] - L[0][0] : 0, 2) + ' m'; })()], ['Güç', d.n + ' × ' + G.panel.p + ' Wp = ' + fmtNum(d.kwp, 2) + ' kWp']];
  for (const [k, v] of kv) { const r = document.createElement('div'); r.innerHTML = '<span></span><b></b>'; r.firstChild.textContent = k; r.lastChild.textContent = v; gv('g-tinfo').appendChild(r); }
}
function renderTpl() {
  if (typeof pjMasaList === 'function') pjMasaList();
  const sel = gv('g-tsel'); if (!sel) return; const cur = +sel.value || 0; sel.innerHTML = '';
  G.tpl.forEach((t, i) => { const d = tplDims(t); const o = document.createElement('option'); o.value = i; o.textContent = (t.use !== false ? '✓ ' : '\u2003') + t.rows + t.orient + t.per + ' · ' + t.tilt + '° — ' + fmtNum(d.len, 2) + ' × ' + fmtNum(d.depth, 2) + ' m · ' + fmtNum(d.kwp, 1) + ' kWp'; sel.appendChild(o); });
  sel.value = String(Math.min(cur, Math.max(0, G.tpl.length - 1)));
  const t = G.tpl[+sel.value]; gv('g-tuse').checked = !!t && t.use !== false; gv('g-tuse').disabled = gv('g-tedit').disabled = gv('g-tdel').disabled = !t;
}
// TEK masa seçimi: "Proje masası" (p-masa), "Hazır şablonlar" listesi ve "Masa şablonu" formu aynı şablonu gösterir.
// Birinde seçim/değişiklik olunca diğerleri onu izler; form değişikliği seçili şablonu günceller.
function masaFormaYukle(t) {
  if (!t) return; gv('g-or').value = t.orient; gv('g-rows').value = t.rows; gv('g-n').value = t.rows * t.per; gv('g-tilt').value = t.tilt; gv('g-front').value = t.front; gv('g-gx').value = Math.round(t.gx * 100); tplUpdate();
}
function masaSec(i) {
  const t = G.tpl[i]; if (!t) return;
  G.tpl.forEach((q) => { q.use = q === t; }); const pm = gv('p-masa'); if (pm) pm.value = String(i); const ts = gv('g-tsel'); if (ts) ts.value = String(i);
  renderTpl(); if (pm) pm.value = String(i); if (ts) ts.value = String(i); masaFormaYukle(t); pitchUpdate(); gesSave(); if (typeof pjSave === 'function') pjSave(); if (typeof tfSync === 'function') tfSync();
}
function masaFormdan() {
  // formdaki masa listede varsa o seçilir; yoksa yeni şablon olarak eklenip seçilir (mevcut şablonlar bozulmaz)
  const f = tplFromForm();
  let i = G.tpl.findIndex((t) => t.orient === f.orient && t.rows === f.rows && t.per === f.per && t.tilt === f.tilt);
  if (i < 0) { G.tpl.push({ ...f, use: true }); i = G.tpl.length - 1; } else { Object.assign(G.tpl[i], { front: f.front, gx: f.gx, gy: f.gy }); }
  G.tpl.forEach((q, j) => { q.use = j === i; }); renderTpl(); gv('p-masa').value = String(i); gv('g-tsel').value = String(i); gv('g-tuse').checked = true;
  gesSave(); if (typeof pjSave === 'function') pjSave(); if (typeof pjAutoHints === 'function') pjAutoHints(); if (typeof tfSync === 'function') tfSync();
}
function tplSecInit() {
  const sel = gv('g-tsel'); const cur = () => G.tpl[+sel.value];
  sel.onchange = () => masaSec(+sel.value);
  gv('g-tuse').onchange = () => { const t = cur(); if (!t) return; t.use = gv('g-tuse').checked; gesSave(); renderTpl(); };
  gv('g-tedit').onclick = () => { const t = cur(); if (!t) return; gv('g-or').value = t.orient; gv('g-rows').value = t.rows; gv('g-n').value = t.rows * t.per; gv('g-tilt').value = t.tilt; gv('g-front').value = t.front; gv('g-gx').value = Math.round(t.gx * 100); tplUpdate(); };
  gv('g-tdel').onclick = () => { const i = +sel.value; if (!G.tpl[i]) return; G.tpl.splice(i, 1); sel.value = String(Math.max(0, i - 1)); renderTpl(); gesSave(); };
}
function boundInfo() {
  if (typeof cepheBilgi === 'function') cepheBilgi();
  const el = gv('g-binfo');
  if (!G.bound) { el.textContent = 'Sınır seçilmedi. Kapalı bir polyline çizin (Araziyi doldur onu otomatik alır), çizimden seçin ya da KML/KMZ yükleyin.'; return; }
  const a = Math.abs(polyArea(G.bound)); const np = (G.parcels || []).length;
  el.textContent = (np > 1 ? np + ' parsel birleşik' + ((G.parcelOut || []).length ? ' (' + G.parcelOut.length + ' bitişik değil)' : '') + ' · ' : '') + 'Sınır: ' + G.bound.length + ' köşe · ' + fmtNum(a, 0) + ' m² · ' + fmtNum(a / 10000, 3) + ' ha · ' + fmtNum(a / 1000, 2) + ' dönüm';
}
function autoLat() {
  if (!G.bound) return; const cx = G.bound.reduce((s, p) => s + p[0], 0) / G.bound.length, cy = G.bound.reduce((s, p) => s + p[1], 0) / G.bound.length;
  if (cx > 160000 && cx < 840000 && cy > 1000000 && cy < 9400000) { const lat = utm2lat(cx, cy, gnum('g-zone', 38)); gv('g-lat').value = lat.toFixed(3); }
}
function pitchUpdate() {
  const sel = [...G.tpl].filter((t) => t.use !== false); const out = gv('g-pinfo2');
  if (!sel.length) { out.textContent = 'Doldurma için en az bir şablon işaretleyin.'; return null; }
  const main = sel.reduce((a, b) => (tplDims(b).depth > tplDims(a).depth ? b : a));
  if (gv('g-hrs').value === 'manual') { gv('g-pitch').disabled = false; const p = gnum('g-pitch', 0); out.textContent = 'Elle girilen sıra aralığı: ' + fmtNum(p, 2) + ' m · GCR ' + fmtNum(tplDims(main).slant / p, 2); return p; }
  gv('g-pitch').disabled = true;
  const r = rowPitch(main, gnum('g-lat', 39), parseFloat(gv('g-hrs').value), gnum('g-ang', 0));
  if (!isFinite(r.pitch)) { out.textContent = r.err; return null; }
  gv('g-pitch').value = r.pitch.toFixed(2);
  out.textContent = 'Sıra aralığı (pitch) ' + fmtNum(r.pitch, 2) + ' m = derinlik ' + fmtNum(r.depth, 2) + ' + gölge ' + fmtNum(r.shadow, 2) + ' · en düşük güneş ' + fmtNum(r.minAlt, 1) + '° · GCR ' + fmtNum(tplDims(main).slant / r.pitch, 2);
  return r.pitch;
}

async function gesDatasheet(file) {
  try {
    busy('Datasheet okunuyor…'); await tick();
    const buf = new Uint8Array(await file.arrayBuffer()); let txt;
    if (/\.pdf$/i.test(file.name)) txt = await pdfText(buf); else txt = new TextDecoder().decode(buf);
    const r = parseDatasheet(txt); const P = G.panel; const got = [];
    if (r.L && r.W) { P.L = r.L; P.W = r.W; got.push('ölçü'); } if (r.T) P.T = r.T; if (r.cells) { P.cells = r.cells; got.push('hücre'); } if (r.kg) P.kg = r.kg;
    if (r.p) { P.p = r.p; P.powers = r.powers; got.push('güç'); } if (r.model) P.model = r.model; P.bifacial = !!r.bifacial;
    for (const k of ['voc', 'vmp', 'isc', 'imp', 'kvoc']) if (r[k] !== null && r[k] !== undefined) P[k] = r[k];
    if (r.voc) got.push('Voc/Vmp/Isc/Imp');
    panelToForm(); tplUpdate(); renderTpl(); gesSave();
    if (!r.L) msg('Datasheet\'ten ölçü okunamadı; değerleri elle girin.', 'err');
    if (typeof pjAutoHints === 'function') pjAutoHints();
    msg('Datasheet: ' + file.name + ' → ' + (got.length ? got.join(', ') + ' okundu' : 'değer bulunamadı') + '. Model ' + P.model + ', ' + P.p + ' Wp, ' + P.L + '×' + P.W + '×' + P.T + ' mm' + (P.cells ? ', ' + P.cells + ' hücre' : '') + (P.voc ? ', Voc ' + P.voc + ' V, Vmp ' + P.vmp + ' V, Isc ' + P.isc + ' A, Imp ' + P.imp + ' A, β(Voc) ' + (P.kvoc ?? '—') + ' %/°C' : '') + (P.powers && P.powers.length > 1 ? '. Güç sınıfları: ' + P.powers.join(', ') : ''), 'res');
  } catch (e) { console.error(e); msg('Datasheet okunamadı: ' + (e.message || e), 'err'); }
  finally { busy(null); }
}
// ---- Parseller: birden çok KML/KMZ ya da koordinat bloğu eklenir; bitişik parseller tek saha olarak birleştirilir.
// Çekme yalnız birleşik dış sınırdan uygulanır (ortak parsel kenarlarında çekme yok). GES-ÇİZ'e parsel listesi gider (script de birleştirir).
const SNAP = 0.5;   // m — KML/ölçüm farkından kalan kenar boşluklarını kapatır (GES-ÇİZ ile aynı tolerans)
function parselEkle(list, src, crs) {
  if (!G.parcels) G.parcels = [];
  const n0 = G.parcels.length;
  for (const p of list) {
    let pts = p.pts; if (pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) pts = pts.slice(0, -1);
    if (pts.length < 3 || Math.abs(polyArea(pts)) < 1) continue;
    // aynı parsel ikinci kez eklenmesin
    const a = Math.abs(polyArea(pts)), c = centroidOf(pts);
    if (G.parcels.some((q) => Math.abs(Math.abs(polyArea(q.pts)) - a) < 0.5 && Math.hypot(centroidOf(q.pts)[0] - c[0], centroidOf(q.pts)[1] - c[1]) < 0.5)) continue;
    G.parcels.push({ ad: p.ad || ('P' + (G.parcels.length + 1)), pts, src, crs: crs || null });
  }
  parselBirlestir(); return G.parcels.length - n0;
}
function parselSil(i) { G.parcels.splice(i, 1); parselBirlestir(); }
function parselBirlestir() {
  const P = G.parcels || [];
  // eski parsel/sınır çizimlerini kaldır
  if (G.parcelIds && S.doc) { const ch = G.parcelIds.map((id) => ({ o: S.doc.items.get(id), n: null })).filter((x) => x.o); if (ch.length) S.doc.commit(ch, 'parsel'); }
  G.parcelIds = []; G.parcelOut = [];
  if (!P.length) { G.bound = null; G.boundSrc = null; G.boundCrs = null; boundInfo(); redraw(); return; }
  // köşe yakalama: başka parselin köşesine SNAP içinde olan köşe ona taşınır
  const all = []; P.forEach((q, k) => q.pts.forEach((v) => all.push([v, k])));
  const snapped = P.map((q, k) => q.pts.map((v) => { let b = v, bd = SNAP; for (const [w, kk] of all) { if (kk === k) continue; const d = Math.hypot(w[0] - v[0], w[1] - v[1]); if (d < bd) { bd = d; b = w; } } return [b[0], b[1]]; }));
  let parts;
  try { parts = polygonClipping.union(...snapped.map((r) => [[...r, r[0]]])); } catch (e) { console.warn(e); parts = snapped.map((r) => [[...r, r[0]]]); }
  parts = parts.map((pg) => pg[0].slice(0, -1)).sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)));
  G.bound = parts[0]; G.parcelOut = [];
  if (parts.length > 1) P.forEach((q, k) => { const c = centroidOf(snapped[k]); if (!pointInPoly(c, parts[0])) G.parcelOut.push(q.ad); });
  const crs = P.find((q) => q.crs); G.boundSrc = P.every((q) => q.src === 'kml') ? 'kml' : 'koordinat'; G.boundCrs = crs ? crs.crs : null;
  if (S.doc) {
    S.doc.addLayer('GES-PARSEL', 8); S.doc.addLayer('GES-SINIR', 3);
    const its = [];
    if (P.length > 1) P.forEach((q) => { its.push({ id: newId(), t: 'pline', layer: 'GES-PARSEL', c: 256, lt: '', cl: true, pts: q.pts.map((v) => [v[0], v[1], 0]) }); const c = centroidOf(q.pts); its.push({ id: newId(), t: 'text', layer: 'GES-PARSEL', c: 256, lt: '', x: c[0], y: c[1], h: Math.max(2, Math.sqrt(Math.abs(polyArea(q.pts))) / 25), rot: 0, s: q.ad, ha: 1, va: 2 }); });
    its.push({ id: newId(), t: 'pline', layer: 'GES-SINIR', c: 256, lt: '', cl: true, pts: G.bound.map((v) => [v[0], v[1], 0]) });
    S.doc.commit(its.map((n) => ({ o: null, n })), 'parsel'); G.parcelIds = its.map((x) => x.id);
    renderLayers(); zoomTo(itemBB(S.doc, its[its.length - 1])); redraw();
  }
  boundInfo(); autoLat(); pitchUpdate();
  if (G.parcelOut.length) msg('⚠ Bitişik olmayan parsel: ' + G.parcelOut.join(', ') + '. Proje en büyük birleşik alanda yapılır; bu parseller ayrı proje olarak çizilmeli.', 'err');
}
function pointInPoly(p, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
async function gesKml(file) {
  try {
    const buf = await file.arrayBuffer(); const txt = /\.kmz$/i.test(file.name) ? await unzipFirstKml(buf) : new TextDecoder().decode(buf);
    const polys = kmlPolys(txt); if (!polys.length) throw new Error('Dosyada poligon koordinatı bulunamadı.');
    // UTM dilimi: ilk parselden belirlenir, sonraki parseller aynı dilimde hesaplanır (tek koordinat sistemi)
    if (!(G.parcels && G.parcels.length && G.parcelZone)) { const lon0 = polys[0].reduce((s, q) => s + q[0], 0) / polys[0].length; G.parcelZone = utmZoneOf(lon0); }
    const z = G.parcelZone; let list = polys.map((p) => ({ pts: p.map((q) => ll2utm(q[1], q[0], z)), lat: p.reduce((s, q) => s + q[1], 0) / p.length }));
    // aynı dosyada iç içe poligonlar (bina, delik) parsel sayılmaz
    list = list.filter((o, i) => !list.some((b, j) => j !== i && Math.abs(polyArea(b.pts)) > Math.abs(polyArea(o.pts)) && pointInPoly(centroidOf(o.pts), b.pts)));
    const base = file.name.replace(/\.(kml|kmz)$/i, '');
    list.forEach((o, i) => { o.ad = list.length > 1 ? base + '-' + (i + 1) : base; });
    gv('g-zone').value = z; gv('g-lat').value = list[0].lat.toFixed(4);
    const n = parselEkle(list, 'kml', null);
    msg('KML: ' + file.name + ' → ' + n + ' parsel eklendi (UTM ' + z + 'N, WGS84). Toplam ' + G.parcels.length + ' parsel.', 'res');
  } catch (e) { console.error(e); msg('KML/KMZ okunamadı (' + file.name + '): ' + (e.message || e), 'err'); }
}

CMD.GPANEL = async () => {
  formToPanel(); const name = makePanelBlock();
  const p = await getPoint('Panel detayının yerleşim noktası:'); if (!Array.isArray(p)) return;
  S.doc.addLayer('GES-PANEL', 5); const P = G.panel, w = P.W / 1000, l = P.L / 1000, h = Math.max(0.06, w / 14);
  const L = S.curLayer;
  const its = [{ id: newId(), t: 'insert', layer: 'GES-PANEL', c: 256, lt: '', block: name, M: mT(p[0], p[1]), ap: [] },
    { id: newId(), t: 'dim', layer: L, c: 256, lt: '', x1: p[0], y1: p[1], x2: p[0] + w, y2: p[1], lx: p[0] + w / 2, ly: p[1] - h * 3, ang: 0, h, txt: String(P.W) },
    { id: newId(), t: 'dim', layer: L, c: 256, lt: '', x1: p[0] + w, y1: p[1], x2: p[0] + w, y2: p[1] + l, lx: p[0] + w + h * 3, ly: p[1] + l / 2, ang: Math.PI / 2, h, txt: String(P.L) },
    { id: newId(), t: 'text', layer: L, c: 256, lt: '', x: p[0], y: p[1] + l + h * 4.2, h: h * 1.2, rot: 0, s: P.model, ha: 0, va: 0 },
    { id: newId(), t: 'text', layer: L, c: 256, lt: '', x: p[0], y: p[1] + l + h * 2, h, rot: 0, s: P.p + ' Wp · ' + P.L + '×' + P.W + '×' + P.T + ' mm' + (P.cells ? ' · ' + P.cells + ' hücre' : '') + (P.kg ? ' · ' + P.kg + ' kg' : ''), ha: 0, va: 0 }];
  addItems(its, 'panel'); renderLayers();
};
CMD.GTABLE = async () => {
  const t = tplFromForm(); const name = makeTableBlock(t); const d = tplDims(t);
  S.doc.addLayer('GES-MASA', 5);
  for (;;) {
    const p = await getPoint('Masa ' + t.rows + t.orient + t.per + ' yerleşim noktası (sol alt köşe, bitirmek için Enter):', { preview: (m) => [{ pts: [m, [m[0] + d.len, m[1]], [m[0] + d.len, m[1] + d.depth], [m[0], m[1] + d.depth]], cl: true }] });
    if (!Array.isArray(p)) return;
    addItems([{ id: newId(), t: 'insert', layer: 'GES-MASA', c: 256, lt: '', block: name, M: mT(p[0], p[1]), ap: [] }], 'masa'); renderLayers();
  }
};
CMD.GSECTION = async () => {
  const t = tplFromForm(); const p = await getPoint('Kesitin yerleşim noktası (zemin, sol):'); if (!Array.isArray(p)) return;
  addItems(sectionItems(t, p), 'kesit');
};
CMD.GBOUND = async () => {
  const p = await getPoint('Arazi sınırı olan kapalı polyline\'ı tıklayın:', {}); if (!Array.isArray(p)) return;
  sinirSec(p);
};
// Elle çizilen sınır: seçili kapalı polyline, yoksa çizimdeki en büyük kapalı polyline (GES/ÖRNEK katmanları hariç) otomatik sınır olur.
function sinirOto() {
  if (G.bound) return true;
  const kapali = (it) => it && it.t === 'pline' && it.cl && it.pts && it.pts.length >= 3 && !/^(GES-|ORNEK-)/i.test(it.layer);
  const sec = [...(V().sel || [])].map((id) => S.doc.items.get(id)).filter(kapali);
  const aday = sec.length ? sec : [...S.doc.items.values()].filter(kapali);
  if (!aday.length) return false;
  const it = aday.reduce((a, b) => (Math.abs(polyArea(b.pts)) > Math.abs(polyArea(a.pts)) ? b : a));
  const a = [it.pts[0][0], it.pts[0][1]]; const v = it.pts;
  for (let i = 1; i < v.length; i++) bulgeArcPts(v[i - 1][0], v[i - 1][1], v[i][0], v[i][1], v[i - 1][2], a);
  bulgeArcPts(v[v.length - 1][0], v[v.length - 1][1], v[0][0], v[0][1], v[v.length - 1][2], a);
  const pts = []; for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]);
  if (Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-6) pts.pop();
  G.parcels = []; G.parcelIds = []; G.bound = pts; G.boundSrc = 'draw'; G.boundCrs = null; boundInfo(); autoLat(); pitchUpdate();
  if (typeof cepheCiz === 'function') cepheCiz();
  msg('Çizimdeki kapalı polyline arazi sınırı olarak alındı: ' + fmtNum(Math.abs(polyArea(pts)) / 10000, 3) + ' ha' + (aday.length > 1 && !sec.length ? ' (en büyüğü; başka sınır için “Sınırı çizimden seç”)' : '') + '.', 'res');
  return true;
}
// tıklanan noktadaki kapalı polyline'ı arazi sınırı yapar (GBOUND ve CEPHE ortak)
function sinirSec(p) {
  const q = V().w2s(p[0], p[1]); const it = pickItem(q[0], q[1]);
  let pts = null;
  if (it && it.t === 'pline') { const a = [it.pts[0][0], it.pts[0][1]]; const v = it.pts; for (let i = 1; i < v.length; i++) bulgeArcPts(v[i - 1][0], v[i - 1][1], v[i][0], v[i][1], v[i - 1][2], a); if (it.cl) bulgeArcPts(v[v.length - 1][0], v[v.length - 1][1], v[0][0], v[0][1], v[v.length - 1][2], a); pts = []; for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]); }
  else if (it && it.t === 'geo') { const pr = it.prims.find((x) => x.k === 0 && x.p.length >= 9); if (pr) { const w = xfArr(pr.p, it.M); pts = []; for (let i = 0; i < w.length; i += 3) pts.push([w[i], w[i + 1]]); } }
  if (!pts || pts.length < 3) { msg('Kapalı bir polyline seçin (en az 3 köşe).', 'err'); return false; }
  if (Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-6) pts.pop();
  G.parcels = []; G.parcelIds = []; G.bound = pts; G.boundSrc = 'draw'; G.boundCrs = null; setSel([it.id]); boundInfo(); autoLat(); pitchUpdate(); msg('Arazi sınırı seçildi: ' + fmtNum(Math.abs(polyArea(pts)) / 10000, 3) + ' ha.', 'res');
  if (typeof cepheCiz === 'function') cepheCiz();
  return true;
}
CMD.GFILL = async () => {
  if (!sinirOto()) { msg('Arazi sınırı yok: kapalı bir polyline çizin ya da KML/KMZ ekleyin.', 'err'); return; }
  // arazide masa varsa doldurma yapılmaz (çakışan masa): önce Sıfırla ya da sil
  const mevcut = [...S.doc.items.values()].filter((it) => it.t === 'insert' && it.layer === 'GES-MASA' && pointInPoly([it.M[3], it.M[7]], G.bound));
  if (mevcut.length) { await askDlg('Çakışan masa var', 'Arazide ' + mevcut.length + ' masa zaten çizili. Yeni doldurma bunlarla çakışır, bu yüzden yapılmadı. Önce mevcut masaları silin ya da "Sıfırla" ile temizleyin.', [['Tamam', 'ok', 'primary']]); msg('Doldurma yapılmadı: arazide ' + mevcut.length + ' masa var (çakışma).', 'err'); return; }
  formToPanel();
  const sel = G.tpl.filter((t) => t.use !== false); if (!sel.length) { msg('Doldurma için en az bir masa şablonu işaretleyin.', 'err'); return; }
  const pitch = pitchUpdate(); if (!pitch) return;
  const types = sel.map((tp) => { const d = tplDims(tp); return { tp, name: makeTableBlock(tp), len: d.len, depth: d.depth, n: d.n, kwp: d.kwp }; }).sort((a, b) => b.len - a.len);
  const base = { types, setback: gnum('g-set', 5), pitch, rowGap: gnum('g-gap', 0.5), rowAng: gnum('g-ang', 0) };
  if (cepheVar()) base.ic = (toL) => cepheIcHalkalar(toL, gnum('g-set', 5));
  const am = gv('g-align').value, vm = (gv('g-valign') || {}).value || 'south'; let res, hiza = '';
  const modOf = (r) => r.placed.reduce((t, p) => t + types[p.type].n, 0);
  if (am === 'opt') {
    const den = []; for (const xm of ['left', 'right', 'center']) for (const ym of ['south', 'north', 'center']) { const r = fillLand({ ...base, xm, ym }); den.push(r); if (!res || modOf(r) > modOf(res)) res = r; }
    const kotu = Math.min(...den.map(modOf));
    hiza = 'Optimum: ' + HIZA_AD[res.xm] + ' · ' + (res.ym === 'center' ? 'K-G ortalı' : HIZA_AD[res.ym]) + ' (9 seçenekten en çok modül; en kötüsünden +' + (modOf(res) - kotu).toLocaleString('tr') + ' modül)';
  } else if (am === 'duz') {
    const h = hizaDuz(base.rowAng); res = fillLand({ ...base, xm: h.xm, ym: h.ym });
    hiza = 'En düz sınır (' + fmtNum(h.L, 0) + ' m kenar): ' + HIZA_AD[h.xm] + ' · ' + HIZA_AD[h.ym];
  } else res = fillLand({ ...base, xm: am, ym: vm });
  if (!res.placed.length) { msg('Sınırın içine hiç masa sığmadı. Sınır mesafesini veya şablonu kontrol edin.', 'err'); return; }
  const items = []; const cnt = types.map(() => 0);
  S.doc.addLayer('GES-MASA', 5);
  for (const p of res.placed) { const t = types[p.type]; cnt[p.type]++; items.push({ id: newId(), t: 'insert', layer: 'GES-MASA', c: types.length > 1 && p.type > 0 ? 4 : 256, lt: '', block: t.name, M: mMul(mT(p.x, p.y), mRz(res.rowAng)), ap: [] }); }
  S.doc.addLayer('GES-CEKME', 1, 'DASHED'); S.doc.addLayer('GES-NOT', 7);
  // setback outline (approx: offset polygon via miter)
  const sb = gnum('g-set', 5); if (cepheVar()) { for (const r of cepheIcHalkalar((p) => p, sb) || []) items.push({ id: newId(), t: 'pline', cl: true, layer: 'GES-CEKME', c: 256, lt: '', pts: r.map((q) => [q[0], q[1], 0]) }); } else if (sb > 0) { const o = offsetItem({ id: -1, t: 'pline', cl: true, layer: 'GES-CEKME', c: 256, lt: '', pts: G.bound.map((q) => [q[0], q[1], 0]) }, sb, centroidOf(G.bound)); if (o) { o.layer = 'GES-CEKME'; items.push(o); } }
  const mods = types.reduce((s, t, i) => s + cnt[i] * t.n, 0), kwp = mods * G.panel.p / 1000;
  addItems(items, 'arazi doldur'); renderLayers();
  G.last = { cnt, types, mods, kwp, rows: res.rows, area: res.area, pitch };
  const lines = types.map((t, i) => (i === 0 ? 'Ana ' : 'Alternatif ') + t.tp.rows + t.tp.orient + t.tp.per + ': ' + cnt[i] + ' masa (' + cnt[i] * t.n + ' modül)');
  const sum = lines.join(' · ') + ' — Toplam ' + mods.toLocaleString('tr') + ' modül · ' + fmtNum(kwp / 1000, 3) + ' MWp DC · ' + res.rows + ' sıra · pitch ' + fmtNum(pitch, 2) + ' m · ' + fmtNum(kwp / (res.area / 10000), 0) + ' kWp/ha';
  const sum2 = sum + (hiza ? ' · ' + hiza : '') + (cepheVar() ? ' · cephe bazlı çekme' : '');
  msg(sum2, 'res'); gv('g-result').textContent = sum2; gv('g-result').hidden = false;
  // summary text near boundary
  const bb = G.bound.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const th = Math.max(1, (bb[3] - bb[1]) / 120);
  addItems([{ id: newId(), t: 'text', layer: 'GES-NOT', c: 7, lt: '', mt: true, x: bb[0], y: bb[1] - th * 2, h: th, rot: 0, s: 'GES YERLEŞİM ÖZETİ\n' + lines.join('\n') + '\nToplam: ' + mods.toLocaleString('tr') + ' modül × ' + G.panel.p + ' Wp = ' + fmtNum(kwp / 1000, 3) + ' MWp\nSıra aralığı ' + fmtNum(pitch, 2) + ' m · eğim ' + types[0].tp.tilt + '° · sınır mesafesi ' + fmtNum(sb, 1) + ' m', ha: 0, va: 3, ls: 1.6 }], 'özet');
};
function centroidOf(p) { return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]; }
Object.assign(ALIAS, { GTABLE: 'GTABLE', GSECTION: 'GSECTION', GBOUND: 'GBOUND', GFILL: 'GFILL', GPANEL: 'GPANEL', PANEL: 'GPANEL', GMASA: 'GTABLE', MASA: 'GTABLE', KESIT: 'GSECTION', SINIR: 'GBOUND', DOLDUR: 'GFILL' });
Object.assign(LABEL, { GPANEL: 'PANEL ÇİZ', GTABLE: 'MASA ÇİZ', GSECTION: 'MASA KESİTİ', GBOUND: 'ARAZİ SINIRI', GFILL: 'ARAZİ DOLDUR' });

function gesInit() {
  gesLoad(); tplSecInit();
  if (G._set) for (const [k, v] of Object.entries(G._set)) if (gv(k)) gv(k).value = v;
  panelToForm(); tplUpdate(); renderTpl(); boundInfo(); pitchUpdate();
  for (const id of ['g-model', 'g-p', 'g-L', 'g-W', 'g-T', 'g-cells']) gv(id).addEventListener('change', formToPanel);
  for (const id of ['g-or', 'g-rows', 'g-n', 'g-tilt', 'g-front', 'g-gx']) { gv(id).addEventListener('input', () => { tplUpdate(); pitchUpdate(); }); gv(id).addEventListener('change', masaFormdan); }
  { const pm = gv('p-masa'); if (pm) pm.addEventListener('change', () => masaSec(+pm.value)); }
  for (const id of ['g-lat', 'g-zone', 'g-hrs', 'g-ang', 'g-pitch', 'g-set', 'g-gap', 'g-align', 'g-valign']) gv(id).addEventListener('change', () => { if (id === 'g-zone') autoLat(); pitchUpdate(); gesSave(); });
  gv('g-ds').onchange = (e) => { const f = e.target.files[0]; if (f) gesDatasheet(f); e.target.value = ''; };
  gv('g-kml').onchange = async (e) => { const fs = [...e.target.files]; e.target.value = ''; for (const f of fs) await gesKml(f); gv('g-kml').dispatchEvent(new Event('yuklendi')); };
  gv('g-bds').onclick = () => gv('g-ds').click();
  gv('g-bkml').onclick = () => gv('g-kml').click();
  gv('g-bpanel').onclick = () => runCommand('GPANEL');
  gv('g-btable').onclick = () => runCommand('GTABLE');
  gv('g-bsec').onclick = () => runCommand('GSECTION');
  gv('g-bsave').onclick = () => { const t = tplFromForm(); t.use = true; if (G.tpl.some((x) => x.orient === t.orient && x.rows === t.rows && x.per === t.per && x.tilt === t.tilt)) { msg('Bu şablon zaten listede.'); return; } G.tpl.push(t); renderTpl(); pitchUpdate(); gesSave(); msg('Şablon kaydedildi: ' + t.rows + t.orient + t.per + ' · ' + t.tilt + '°', 'res'); };
  gv('g-bbound').onclick = () => runCommand('GBOUND');
  gv('g-bfill').onclick = () => runCommand('GFILL');
  document.querySelectorAll('.stab').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('.stab').forEach((x) => x.classList.toggle('on', x === b)); gv('tab-layers').hidden = b.dataset.tab !== 'layers'; gv('tab-ges').hidden = b.dataset.tab !== 'ges'; }));
}
