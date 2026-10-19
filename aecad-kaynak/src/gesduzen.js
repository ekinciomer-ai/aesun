// ---- Çizimden ve yazıyla düzenleme: trafo taşı, inverter taşı, yol çiz, yol sil → yerleşim son duruma göre yeniden hesaplanır ----
// Düzenlemeler GES-ÇİZ parametresidir (elektrik.tm_tasi / inv_tasi, yol.ek_yollar / sil_yollar); masa, inverter, trafo ve kablolar
// script tarafından bu kısıtlarla yeniden yerleştirilir. Koordinatlar gerçek koordinattır (açılan paftayla aynı).
PJ.duzen = PJ.duzen || { tm: [], inv: [], ekYol: [], silYol: [] };
function pjDuzenUygula(p) {
  const D = PJ.duzen; p.elektrik.tm_tasi = kopya(D.tm); p.elektrik.inv_tasi = kopya(D.inv);
  p.yol = p.yol || {}; p.yol.ek_yollar = kopya(D.ekYol); p.yol.sil_yollar = kopya(D.silYol); p.elektrik.dm_konum = PJ.dm; return p;
}
function pjDuzenSay() { const D = PJ.duzen; return D.tm.length + D.inv.length + D.ekYol.length + D.silYol.length; }
function pjDuzenBilgi() {
  const D = PJ.duzen, el = gv('p-duzinfo'); if (!el) return;
  el.textContent = pjDuzenSay() ? 'Bekleyen düzenleme: ' + [D.tm.length && D.tm.length + ' trafo taşıma', D.inv.length && D.inv.length + ' inverter taşıma', D.ekYol.length && D.ekYol.length + ' yeni yol', D.silYol.length && D.silYol.length + ' silinen yol'].filter(Boolean).join(', ') + (PJ.aktif ? ' · temel: ' + PJ.aktif.ad : '') : 'Düzenleme yok. Önce bir yerleşim açın (Yerleşim seçenekleri → Yerleşim), sonra trafo/inverter taşıyın ya da yol çizin.';
  gv('p-duzcalis').disabled = !pjDuzenSay() && !PJ.dm;
}
function pjNes() { return PJ.aktif && PJ.aktif.nes; }
function pjEnYakin(list, p, maks) { let b = null, bd = maks; for (const o of list || []) { const d = Math.hypot(o.x - p[0], o.y - p[1]); if (d < bd) { bd = d; b = o; } } return b; }
function pjIsaret(items, label) { S.doc.addLayer('GES-DUZEN', 1); addItems(items.map((o) => ({ id: newId(), layer: 'GES-DUZEN', c: 256, lt: '', ...o })), label); renderLayers(); }
function pjOk(a, b) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, L = Math.min(4, d / 4);
  return [{ t: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, { t: 'line', x1: b[0], y1: b[1], x2: b[0] - ux * L + uy * L * 0.5, y2: b[1] - uy * L - ux * L * 0.5 }, { t: 'line', x1: b[0], y1: b[1], x2: b[0] - ux * L - uy * L * 0.5, y2: b[1] - uy * L + ux * L * 0.5 }, { t: 'circle', cx: a[0], cy: a[1], r: 2 }]; }
// aynı nesne ikinci kez taşınırsa yeni kayıt değil, mevcut kaydın hedefi güncellenir (script 'den' noktasını otomatik konumla eşler)
function pjTasiKaydet(list, poz, hedef) { const v = list.find((t) => Math.hypot(t.ye[0] - poz[0], t.ye[1] - poz[1]) < 1.5); if (v) v.ye = hedef; else list.push({ den: poz, ye: hedef }); }
function pjNesneGerek() { if (!pjNes()) { msg('Önce bir yerleşim açın: Yerleşim seçenekleri → bir satırda "Yerleşim".', 'err'); return false; } return true; }
CMD.GTMTASI = async () => {
  if (!pjNesneGerek()) return;
  const p = await getPoint('Taşınacak trafoyu (TM) tıklayın:'); if (!Array.isArray(p)) return;
  const tm = pjEnYakin(pjNes().tm, p, 60); if (!tm) { msg('Yakında trafo yok (60 m).', 'err'); return; }
  const q = await getPoint(tm.ad + ' yeni konumu (merkez):', { base: [tm.x, tm.y], preview: (m) => [{ pts: [[tm.x, tm.y], m] }] }); if (!Array.isArray(q)) return;
  pjTasiKaydet(PJ.duzen.tm, [tm.x, tm.y], [q[0], q[1]]); tm.x = q[0]; tm.y = q[1];
  pjIsaret([...pjOk([p[0], p[1]], q), { t: 'pline', cl: true, pts: [[q[0] - 6, q[1] - 5, 0], [q[0] + 6, q[1] - 5, 0], [q[0] + 6, q[1] + 5, 0], [q[0] - 6, q[1] + 5, 0]] }], 'trafo taşı');
  pjSave(); pjDuzenBilgi(); msg(tm.ad + ' taşınacak. Başka düzenleme yapın ya da "Düzenlemeyle yeniden çiz".', 'res');
};
CMD.GINVTASI = async () => {
  if (!pjNesneGerek()) return;
  const p = await getPoint('Taşınacak inverteri tıklayın:'); if (!Array.isArray(p)) return;
  const iv = pjEnYakin(pjNes().inv, p, 25); if (!iv) { msg('Yakında inverter yok (25 m).', 'err'); return; }
  const q = await getPoint(iv.ad + ' yeni konumu (kendi masalarından en yakın masa başına oturur, A.4):', { base: [iv.x, iv.y], preview: (m) => [{ pts: [[iv.x, iv.y], m] }] }); if (!Array.isArray(q)) return;
  pjTasiKaydet(PJ.duzen.inv, [iv.x, iv.y], [q[0], q[1]]); iv.x = q[0]; iv.y = q[1];
  pjIsaret(pjOk([p[0], p[1]], q), 'inverter taşı'); pjSave(); pjDuzenBilgi(); msg(iv.ad + ' taşınacak.', 'res');
};
CMD.GYOLCIZ = async () => {
  const p0 = await getPoint('Yol ekseni başlangıcı (yol ' + (pn('p-icw') ?? 5) + ' m, kanal bir yanında):'); if (!Array.isArray(p0)) return; const pts = [p0];
  for (;;) {
    const r = await getPoint('Sonraki nokta [Geri al(G)] — Enter: bitir:', { base: pts[pts.length - 1], kw: ['G'], preview: (m) => [{ pts: [...pts, m] }] });
    if (r === null || r === undefined) break; if (r.kw === 'G') { if (pts.length > 1) pts.pop(); continue; } if (!Array.isArray(r)) break; pts.push(r);
  }
  if (pts.length < 2) return;
  PJ.duzen.ekYol.push(pts.map((q) => [+q[0].toFixed(3), +q[1].toFixed(3)]));
  pjIsaret([{ t: 'pline', cl: false, lt: 'DASHED', pts: pts.map((q) => [q[0], q[1], 0]) }], 'yol çiz'); pjSave(); pjDuzenBilgi();
  msg('Yol eklendi (' + pts.length + ' nokta). Uç kenar yola/kanala değmiyorsa en yakın noktaya uzatılır.', 'res');
};
CMD.GYOLSIL = async () => {
  if (!pjNesneGerek()) return;
  const p = await getPoint('Kaldırılacak iç yolun üzerine tıklayın:'); if (!Array.isArray(p)) return;
  const yollar = pjNes().yol || []; let b = null, bd = 25;
  for (const y of yollar) for (let i = 1; i < y.pts.length; i++) { const d = distSeg(p[0], p[1], y.pts[i - 1][0], y.pts[i - 1][1], y.pts[i][0], y.pts[i][1]); if (d < bd) { bd = d; b = y; } }
  if (!b) { msg('Yakında iç yol yok (25 m).', 'err'); return; }
  if (b.elle) { const i = PJ.duzen.ekYol.findIndex((pl) => Math.hypot(pl[0][0] - b.pts[0][0], pl[0][1] - b.pts[0][1]) < 30 || Math.hypot(pl[pl.length - 1][0] - b.pts[b.pts.length - 1][0], pl[pl.length - 1][1] - b.pts[b.pts.length - 1][1]) < 30); if (i >= 0) PJ.duzen.ekYol.splice(i, 1); }
  else PJ.duzen.silYol.push([+p[0].toFixed(3), +p[1].toFixed(3)]);
  pjIsaret([{ t: 'line', x1: p[0] - 5, y1: p[1] - 5, x2: p[0] + 5, y2: p[1] + 5 }, { t: 'line', x1: p[0] - 5, y1: p[1] + 5, x2: p[0] + 5, y2: p[1] - 5 }], 'yol sil');
  pjSave(); pjDuzenBilgi(); msg('İç yol ' + b.no + ' kaldırılacak.', 'res');
};
CMD.GDUZCIZ = async () => pjDuzenCiz();
function pjDuzenCiz(not) {
  if (!G.bound) { msg('Arazi sınırı yok.', 'err'); return; }
  const base = PJ.aktif ? kopya(PJ.aktif.param) : buildParam(); pjDuzenUygula(base);
  PJ.duzNo = (PJ.duzNo || 0) + 1;
  const D = PJ.duzen; const acik = not || ['trafo ' + D.tm.length, 'inverter ' + D.inv.length, 'yeni yol ' + D.ekYol.length, 'silinen yol ' + D.silYol.length].filter((s) => !/ 0$/.test(s)).join(', ');
  const temel = PJ.aktif;
  if (!gv('pjdlg').open) pjDialog('yerlesim');
  pjAltEkle({ ad: 'Düzenleme ' + PJ.duzNo, acik: (temel ? temel.ad + ' üzerine: ' : '') + (acik || 'değişiklik'), param: base, duzen: true, uygula: () => { if (temel) temel.uygula(); } });
}
function pjDuzenSifirla() { PJ.duzen = { tm: [], inv: [], ekYol: [], silYol: [] }; pjSave(); pjDuzenBilgi(); }
// Projeyi sıfırla: çizimdeki tüm GES nesneleri (masa, çekme, özet, panel/kesit) + yerleşim seçenekleri, düzenlemeler ve hesap sonuçları silinir.
// Arazi sınırı/parselleri ve form değerleri kalır. Çizim silmesi Geri al ile döner.
const GES_KORU = new Set(['GES-PARSEL', 'GES-SINIR', 'GES-CEPHE']);
async function pjSifirla(sor = true) {
  const r = !sor ? 'ok' : await askDlg('Projeyi sıfırla', 'Çizimdeki tüm masalar ve GES nesneleri, yerleşim seçenekleri, düzenlemeler ve hesap sonuçları (paftalar, kontrol, keşif, teklif, kayıtlı son proje) silinecek. Arazi sınırı ve form değerleri kalır. Çizimdeki silme Geri al ile döner; hesap sonuçları dönmez.', [['Sıfırla', 'ok', 'primary'], ['Vazgeç', null, 'ghost']]);
  if (r !== 'ok') return;
  if (S.cmd) cancelCmd();
  if (PJ.srcDoc) pjBack();
  const sil = []; for (const it of S.doc.items.values()) if (/^GES-/i.test(it.layer) && !GES_KORU.has(String(it.layer).toUpperCase())) sil.push([it, null]);
  if (sil.length) { replaceItems(sil, 'proje sıfırla'); V().sel.clear(); renderLayers(); }
  PJ.again = false; PJ.res = null; PJ.files = null; PJ.pdf = null; PJ.param = null; PJ.t = null; PJ.cur = null; PJ.dm = null;
  PJ.alt = []; PJ.aktif = null; PJ.revNo = 0; PJ.revNot = null; PJ.duzNo = 0; G.last = null;
  pjDuzenSifirla();
  try { const db = await pjIdb(); db.transaction('proje', 'readwrite').objectStore('proje').delete('son'); } catch (e) { console.warn('arşiv', e); }
  for (const id of ['g-result', 'st-son', 'p-back']) { const el = gv(id); if (el) el.hidden = true; }
  const po = gv('p-open'); if (po) po.disabled = true;
  const dl = gv('pjdlg'); if (dl && dl.open) dl.close();
  pjSave(); redraw();
  msg('Proje sıfırlandı: ' + sil.length + ' çizim nesnesi ve tüm hesaplar silindi.', 'res');
}
// yazılı düzenleme: "TM2'yi kuzeye 50 m taşı", "trafo 3 batıya 30 m", "TR1 INV3 güneye 20 m", "2. yolu kaldır", "yol 3 sil"
const YON = { kuzey: [0, 1], güney: [0, -1], doğu: [1, 0], batı: [-1, 0] };
function pjDuzenCoz(T) {
  const yap = []; const N = pjNes(); if (!N) return yap;
  const dir = (s) => { for (const k in YON) if (s.startsWith(k)) return YON[k]; return null; };
  for (const m of T.matchAll(/(?:tm|trafo)\s*-?\s*(\d+)\D{0,25}?(kuzey|güney|doğu|batı)\S*\D{0,12}?(\d+(?:\.\d+)?)\s*m/g)) {
    const tm = N.tm.find((t) => t.ad === 'TM' + m[1]); const d = dir(m[2]); if (!tm || !d) continue; const L = parseFloat(m[3]);
    const to = [tm.x + d[0] * L, tm.y + d[1] * L]; pjTasiKaydet(PJ.duzen.tm, [tm.x, tm.y], to); tm.x = to[0]; tm.y = to[1]; yap.push(tm.ad + ' ' + m[2] + ' ' + L + ' m');
  }
  for (const m of T.matchAll(/tr\s*(\d+)\D{0,8}inv\s*(\d+)\D{0,25}?(kuzey|güney|doğu|batı)\S*\D{0,12}?(\d+(?:\.\d+)?)\s*m/g)) {
    const ad = 'TR' + m[1] + '-ACB1-INV' + m[2]; const iv = N.inv.find((t) => t.ad === ad); const d = dir(m[3]); if (!iv || !d) continue; const L = parseFloat(m[4]);
    const to = [iv.x + d[0] * L, iv.y + d[1] * L]; pjTasiKaydet(PJ.duzen.inv, [iv.x, iv.y], to); iv.x = to[0]; iv.y = to[1]; yap.push(ad + ' ' + m[3] + ' ' + L + ' m');
  }
  for (const m of T.matchAll(/(?:(\d+)\.?\s*(?:iç\s*)?yol\S*|yol\s*(\d+))\D{0,8}(kaldır|sil|iptal)/g)) {
    const no = +(m[1] || m[2]); const y = (N.yol || []).find((r) => r.no === no); if (!y) continue;
    const c = y.pts[Math.floor(y.pts.length / 2)]; const c2 = y.pts.length > 1 ? [(y.pts[0][0] + y.pts[y.pts.length - 1][0]) / 2, (y.pts[0][1] + y.pts[y.pts.length - 1][1]) / 2] : c;
    PJ.duzen.silYol.push(c2); yap.push('iç yol ' + no + ' kaldır');
  }
  if (yap.length) { pjSave(); pjDuzenBilgi(); }
  return yap;
}
Object.assign(ALIAS, { GTMTASI: 'GTMTASI', TRAFOTASI: 'GTMTASI', TMTASI: 'GTMTASI', GINVTASI: 'GINVTASI', INVTASI: 'GINVTASI', GYOLCIZ: 'GYOLCIZ', YOLCIZ: 'GYOLCIZ', GYOLSIL: 'GYOLSIL', YOLSIL: 'GYOLSIL', GDUZCIZ: 'GDUZCIZ', YENIDENCIZ: 'GDUZCIZ', GSIFIRLA: 'GSIFIRLA', SIFIRLA: 'GSIFIRLA' });
CMD.GSIFIRLA = async () => pjSifirla();
Object.assign(LABEL, { GTMTASI: 'TRAFO TAŞI', GINVTASI: 'İNVERTER TAŞI', GYOLCIZ: 'YOL ÇİZ', GYOLSIL: 'YOL SİL', GDUZCIZ: 'DÜZENLEMEYLE YENİDEN ÇİZ', GSIFIRLA: 'PROJEYİ SIFIRLA' });
function pjDuzenInit() {
  gv('p-tmtasi').onclick = () => runCommand('GTMTASI'); gv('p-invtasi').onclick = () => runCommand('GINVTASI');
  gv('p-yolciz').onclick = () => runCommand('GYOLCIZ'); gv('p-yolsil').onclick = () => runCommand('GYOLSIL');
  gv('p-duzcalis').onclick = () => pjDuzenCiz(); gv('p-duzsif').onclick = pjSifirla; pjDuzenBilgi();
}

// ---- Açılan yerleşim paftasındaki (01 GENEL) inverter ve köşkler tasarım nesnesine çevrilir: sol menüdeki tasarım
// araçları (DC ata / DC oto / AC kablo / AC oto …) bunları tanır; köşk "Trafo ekle" aracının bloğuyla gösterilir.
function pjPaftaTani() {
  if (!S.doc) return 0; const D = S.doc, it = [...D.items.values()], up = (x) => String(x.layer).toUpperCase();
  if (it.some((x) => x.ges && (x.ges.tip === 'inv' || x.ges.tip === 'tm'))) return 0;
  const yaz = it.filter((x) => x.t === 'text' || x.t === 'mtext');
  const inv = it.filter((x) => x.t === 'circle' && up(x) === 'GES-INV');
  const ky = yaz.filter((t) => up(t) === 'GES-TM' && /^(TR-?\d+|TM-?\d+|DM)/i.test(String(t.s).trim()));
  if (!inv.length && !ky.length) return 0;
  const ang = gnum('g-ang', 0) * Math.PI / 180, oz = (PJ.aktif && PJ.aktif.oz) || (PJ.res && PJ.res.ozet) || {}, sil = new Set(), yeni = [];
  const yerlestir = (o, c) => { const b = itemBB(D, o); const ox = (b[0] + b[2]) / 2 - o.M[3], oy = (b[1] + b[3]) / 2 - o.M[7]; o.M = mMul(mT(c[0] - ox, c[1] - oy), mRz(ang)); _bbCache.delete(o); return o; };
  const ekle = (tip, c, g) => { const T = TS[tip]; const v = {}; for (const [k, , f] of T.alan) v[k] = f(); Object.assign(v, g, { tip }); D.addLayer(T.kat, T.renk);
    const B = tsBlok(tip, v); yeni.push(yerlestir({ id: newId(), t: 'insert', layer: T.kat, c: 256, lt: '', block: B.ad, M: mMul(mT(0, 0), mRz(ang)), ap: [], ges: v }, c)); };
  const etk = (c) => { let b = null, bd = 8; for (const t of yaz) if (up(t) === 'GES-INV') { const d = Math.hypot(t.x - c[0], t.y - c[1]); if (d < bd) { bd = d; b = t; } } return b; };
  const L = inv.map((ci) => { const t = etk([ci.cx, ci.cy]); const m = t && String(t.s).match(/(?:TR(\d+)-)?(?:ACB\d+-)?INV(\d+)/i); return { ci, t, k: m ? [+(m[1] || 1), +m[2]] : [99, 0] }; }).sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1]);
  L.forEach((o, i) => { sil.add(o.ci); if (o.t) sil.add(o.t); ekle('inv', [o.ci.cx, o.ci.cy], { no: i + 1, kw: oz.inv_kw || pn('p-inv') || 100 }); });
  const tmPl = it.filter((x) => x.t === 'pline' && up(x) === 'GES-TM').map((x) => ({ x, b: itemBB(D, x) })).filter((o) => o.b && isFinite(o.b[0]));
  let tn = 0;
  for (const t of ky) {
    const yakin = tmPl.filter((o) => Math.hypot((o.b[0] + o.b[2]) / 2 - t.x, (o.b[1] + o.b[3]) / 2 - t.y) < 15);
    if (!yakin.length) continue;
    const dis = yakin.reduce((a, o) => ((o.b[2] - o.b[0]) * (o.b[3] - o.b[1]) > (a.b[2] - a.b[0]) * (a.b[3] - a.b[1]) ? o : a));
    const bb = dis.b, c = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
    for (const x of it) if (up(x) === 'GES-TM' && !sil.has(x)) { const b = x.t === 'text' || x.t === 'mtext' ? [x.x, x.y, x.x, x.y] : itemBB(D, x); if (b && b[0] >= bb[0] - 2 && b[2] <= bb[2] + 2 && b[1] >= bb[1] - 2.5 && b[3] <= bb[3] + 2.5) sil.add(x); }
    sil.add(t);
    const s = String(t.s).trim(); let nh = null;
    for (const x of yaz) if (up(x) === 'GES-TM') { const m = String(x.s).match(/(\d+)\s*OG hücre/i); if (m && x.x >= bb[0] - 2 && x.x <= bb[2] + 2 && x.y >= bb[1] - 3 && x.y <= bb[3] + 3) nh = +m[1]; }
    if (/^DM/i.test(s)) ekle('dm', c, nh ? { hucre: nh } : {});
    else { tn++; const kva = +((s.match(/(\d{3,5})\s*kVA/i) || [])[1]) || (oz.tr_kva && oz.tr_kva[tn - 1]) || pn('p-trafo') || 1250; ekle('tm', c, { no: tn, kva, hucre: nh || (/\+\s*DM/i.test(s) ? 5 : 3) }); }
  }
  if (!yeni.length) return 0;
  replaceItems([...[...sil].map((x) => [x, null]), ...yeni.map((n) => [null, n])], 'yerleşim nesneleri'); renderLayers();   // form alanlarına yazılmaz: seçenek, kullanıcı değeri değildir
  return yeni.length;
}
