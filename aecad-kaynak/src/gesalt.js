// ---- Aşama 1: yerleşim + alternatifler → kullanıcı revizyonu → onay → Aşama 2 (tüm proje bileşenleri) ----
// Alternatifler GES-ÇİZ'in kendisiyle hesaplanır (aynı esaslar); burada yalnız parametre farkı tanımlanır.
PJ.alt = []; PJ.altMod = false; PJ.altSeq = 0;
const kopya = (o) => JSON.parse(JSON.stringify(o));
function pitchFor(tilt) { const t = { ...mainTpl(), tilt }; const r = rowPitch(t, gnum('g-lat', 39), gv('g-hrs').value === 'manual' ? 3 : parseFloat(gv('g-hrs').value), gnum('g-ang', 0)); return isFinite(r.pitch) ? +r.pitch.toFixed(3) : null; }
function altEgim(base, t) {
  const p = kopya(base); p.masa.egim_derece = t; const pt = pitchFor(t); if (pt) { p.masa.pitch_m = pt; p.masa.sira_acikligi_m = null; }
  return { ad: 'Eğim ' + t + '°', acik: 'Masa eğimi ' + t + '°, sıra aralığı 21 Aralık gölgesine göre ' + (pt ? fmtNum(pt, 2) + ' m' : 'yeniden'), param: p,
    uygula: () => { mainTpl().tilt = t; renderTpl(); gesSave(); pitchUpdate(); } };
}
function pjAltOner(base) {
  const L = [{ ad: 'Mevcut', acik: 'Girilen bilgilerle (esaslar: iç yol ΔU %1, 5 m çekme)', param: kopya(base), uygula: () => {}, fark: (b) => b }];
  const t0 = base.masa.egim_derece;
  { const t1 = t0 > 20 ? 20 : 25; L.push({ ...altEgim(base, t1), fark: (b) => altEgim(b, t1).param }); }
  if (base.yol.ic_yol) { const p = kopya(base); p.yol.ic_yol = false; L.push({ ad: 'İç yolsuz', acik: 'Karşılaştırma: yalnız kenar servis yolu (daha çok masa, uzun AG kablo)', param: p, uygula: () => { gv('p-icyol').value = '0'; pjSave(); }, fark: (b) => { b.yol.ic_yol = false; return b; } }); }
  else { const p = kopya(base); p.yol.ic_yol = true; L.push({ ad: 'İç yollu', acik: 'K-G iç bakım yolları, aralık DC ΔU %1', param: p, uygula: () => { gv('p-icyol').value = '1'; pjSave(); }, fark: (b) => { b.yol.ic_yol = true; return b; } }); }
  const hz0 = (base.elektrik && base.elektrik.inverter_hiza) || 'trafo';
  for (const [k, ad, ac] of [['trafo', 'İnverter trafoya yakın', 'Her inverter DC sınırı içinde trafoya en yakın masa başında (AC kısa)'], ['orta', 'İnverter ortalı', 'İnverterler bloğun ortasındaki sıranın masa başında'], ['optimum', 'İnverter optimum', 'İnverter her blokta en kısa DC\'yi veren masa başında'], ['yol', 'İnverter yol kenarı', 'İnverterler servis yoluna / çite yakın masa başında']]) {
    if (k === hz0 || L.length >= 5) continue; const p = kopya(base); p.elektrik.inverter_hiza = k;
    L.push({ ad, acik: ac, param: p, uygula: () => { gv('p-invhiza').value = k; pjSave(); }, fark: (b) => { b.elektrik.inverter_hiza = k; return b; } });
  }
  return L.map((a) => ({ ...a, durum: 'bekliyor' }));
}
function pjYerlesim() {
  if (!sinirOto()) { msg('Önce arazi sınırını girin: kapalı polyline çizin ya da KML/KMZ ekleyin.', 'err'); return; }
  if (PJ.busy) { msg('GES-ÇİZ çalışıyor; bitince yeniden deneyin.'); return; }
  formToPanel(); pjSave();
  let base, Y; try { base = pjDuzenUygula(buildParam0()); Y = pjCizimYerlesim(); } catch (e) { msg('Parametre hatası: ' + e.message, 'err'); return; }
  PJ.alt = pjAltOner(base); PJ.revNo = 0;
  if (Y) {   // çizimdeki yerleşim (Arazi doldur / elle) ilk seçenek; diğerleri GES-ÇİZ önerisi, onaylanırsa çizime yazılır
    PJ.alt[0].ad = 'Otomatik'; PJ.alt[0].acik = 'GES-ÇİZ yerleşimi, girilen bilgilerle (onaylanırsa çizimdeki yerleşimin yerine geçer)';
    PJ.alt.unshift({ ad: 'Çizimdeki yerleşim', acik: Y.masa.length + ' masa' + (Y.inv.length ? ', ' + Y.inv.length + ' inverter' : '') + (Y.tm.length ? ', ' + Y.tm.length + ' trafo' : '') + ' (Arazi doldur / elle çizim)', param: pjCizimUygula(kopya(base), Y), uygula: () => {}, cizim: true, durum: 'bekliyor' });
  }
  pjDialog('yerlesim'); pjAltSirada();
}
function pjAltEkle(a) { PJ.alt.push({ ...a, durum: 'bekliyor' }); pjAltCiz(); pjAltSirada(); }
// Hız (kullanıcı 19.10.2026: büyük projelerde sistem çuvallamamalı): yerleşim seçenekleri paralel hesaplanır —
// her seçenek kendi Python işçisinde (çekirdek ve belleğe göre 1–4 işçi; Python ortamı her işçide bir kez yüklenir).
function pjYerHavuzN() { const c = navigator.hardwareConcurrency || 2, m = navigator.deviceMemory || 8; return Math.max(1, Math.min(6, c - 2, m >= 16 ? 6 : m >= 8 ? 4 : m >= 4 ? 2 : 1)); }   // 22 çekirdek / 32 GB → 6 seçenek aynı anda
function pjYerIsci(k) {
  PJ.yerHavuz = PJ.yerHavuz || []; let o = PJ.yerHavuz[k]; if (o && o.w) return o;
  o = PJ.yerHavuz[k] = { w: new Worker(new URL('gesciz-worker.js?v=__BUILD__', document.baseURI).href), alt: null };
  o.w.onmessage = (e) => {
    const m = e.data, a = o.alt; if (!a || m.id !== a.seq) return;
    if (m.stage) { a.asama = m.stage; pjAltCiz(); return; }
    o.alt = null; pjAltSonuc(m);
  };
  o.w.onerror = (e) => { const a = o.alt; o.alt = null; try { o.w.terminate(); } catch (x) { /* */ } o.w = null; if (a) pjAltSonuc({ id: a.seq, err: (e && e.message) || 'işçi hatası' }); };
  return o;
}
function pjAltSirada() {
  if (PJ.busy) return;
  const N = pjYerHavuzN();
  for (let k = 0; k < N; k++) {
    const o = pjYerIsci(k); if (o.alt) continue;
    const a = PJ.alt.find((x) => x.durum === 'bekliyor'); if (!a) break;
    a.durum = 'calisiyor'; a.t0 = performance.now(); PJ.seq++; a.seq = PJ.seq; o.alt = a;
    o.w.postMessage({ id: a.seq, base: new URL('./', document.baseURI).href, json: JSON.stringify(a.param), mode: 'yer' });
  }
  PJ.altMod = (PJ.yerHavuz || []).some((o) => o && o.alt);
  if (!PJ.altMod && !PJ.alt.some((x) => x.durum === 'bekliyor')) gv('p-stage').textContent = 'Yerleşim seçenekleri hazır. Birini onaylayın ya da revizyon yazın.';
  pjAltCiz();
}
function pjAltSonuc(m) {
  const a = PJ.alt.find((x) => x.seq === m.id); PJ.altMod = (PJ.yerHavuz || []).some((o) => o && o.alt);
  if (a) {
    if (m.err) { a.durum = 'hata'; a.hata = m.err; }
    else { a.durum = 'hazir'; a.oz = m.oz; a.kontrol = m.kontrol; a.metraj = m.metraj; a.uyari = m.uyari; a.files = m.files; a.nes = m.nes; a.sn = (performance.now() - a.t0) / 1000;
      if (PJ.alt.filter((x) => x.durum === 'hazir').length === 1 || a.duzen) { const f = Object.keys(a.files).find((n) => /_01_GENEL_/.test(n)); if (f) { pjOpenPafta(f, true, a.files); PJ.aktif = a; pjDuzenBilgi(); } }
      if (a.duzen) { PJ.duzenBitti = true; msg(a.ad + ' hazır ve açıldı: ' + a.oz.masa + ' masa, ' + a.oz.inverter + ' inverter, ' + a.oz.tm + ' trafo. Kablo planı Yerleşim seçeneklerinde.', 'res'); } }
  }
  pjAltCiz(); pjAutoHints();
  if (PJ.again && !PJ.altMod) { PJ.again = false; const p = PJ.onay; PJ.onay = null; pjRun(p || undefined); return; }
  if (!PJ.again) pjAltSirada();
}
// Onaylanan GES-ÇİZ seçeneği çizime yazılır: masa, inverter, trafo, DM (eski GES yerleşimi geri alınabilir şekilde değişir)
async function pjSecenekCizime(a) {
  const N = a.nes; if (!N || !N.masa || !N.masa.length) return true;
  if (PJ.srcDoc) pjBack();
  const D = S.doc, tipler = new Set(['inv', 'tm', 'dm', 'ac', 'og', 'dc', 'dcata', 'dcstr']);
  const eski = [...D.items.values()].filter((it) => (String(it.layer).toUpperCase() === 'GES-MASA' && (() => { const b = itemBB(D, it); return b && sinirIcinde([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]); })()) || (it.ges && tipler.has(it.ges.tip)) || String(it.layer).toUpperCase() === 'GES-DC-ATAMA');
  const ids = new Set(eski.map((it) => it.id)); for (const it of D.items.values()) if (it.gesEt && ids.has(it.gesEt)) eski.push(it);
  for (const id of G.fillIds || []) { const it = D.items.get(id); if (it && !eski.includes(it)) eski.push(it); }
  if (eski.length) {
    const r = await askDlg('Çizimdeki yerleşim değişecek', 'Onaylanan "' + a.ad + '" seçeneği çizime yazılacak: ' + N.masa.length + ' masa, ' + N.inv.length + ' inverter, ' + N.tm.length + ' trafo. Çizimdeki mevcut GES yerleşimi (' + eski.length + ' nesne: masa, inverter, trafo, kablolar) kaldırılır; Geri al ile döner.', [['Çizime yaz ve proje paftalarını üret', 'ok', 'primary'], ['Vazgeç', null, 'ghost']]);
    if (r !== 'ok') return false;
  }
  const ang = (a.param.masa.azimut_derece || 0) * Math.PI / 180, yeni = [];
  const yerlestir = (it, c) => { const b = itemBB(D, it); const ox = (b[0] + b[2]) / 2 - it.M[3], oy = (b[1] + b[3]) / 2 - it.M[7]; it.M = mMul(mT(c[0] - ox, c[1] - oy), mRz(ang)); _bbCache.delete(it); _drCache.delete(it); return it; };
  D.addLayer('GES-MASA', 5); D.layers.get('GES-MASA').c = masaRenk();
  const mb = makeTableBlock(mainTpl());
  for (const c of N.masa) yeni.push(yerlestir({ id: newId(), t: 'insert', layer: 'GES-MASA', c: 256, lt: '', block: mb, M: mMul(mT(0, 0), mRz(ang)), ap: [] }, c));
  const ekle = (tip, c, g) => { const T = TS[tip]; const v = {}; for (const [k, , f] of T.alan) v[k] = f(); Object.assign(v, g, { tip }); D.addLayer(T.kat, T.renk);
    const B = tsBlok(tip, v); yeni.push(yerlestir({ id: newId(), t: 'insert', layer: T.kat, c: 256, lt: '', block: B.ad, M: mMul(mT(0, 0), mRz(ang)), ap: [], ges: v }, c)); };
  N.inv.forEach((q, i) => ekle('inv', [q.x, q.y], { no: i + 1 }));
  N.tm.forEach((q, i) => ekle('tm', [q.x, q.y], { no: i + 1, kva: (a.oz && a.oz.tr_kva && a.oz.tr_kva[i]) || pn('p-trafo') || 1250 }));
  if (N.dm && !N.tm.some((q) => Math.hypot(q.x - N.dm.x, q.y - N.dm.y) < 15)) ekle('dm', [N.dm.x, N.dm.y], {});
  G.fillIds = [];
  replaceItems([...eski.map((it) => [it, null]), ...yeni.map((n) => [null, n])], 'yerleşim seçeneği çizime'); renderLayers();
  if (typeof cepheCiz === 'function') cepheCiz();
  if (typeof tsFormaYaz === 'function') tsFormaYaz();
  msg('"' + a.ad + '" çizime yazıldı: ' + N.masa.length + ' masa, ' + N.inv.length + ' inverter, ' + N.tm.length + ' trafo. Bundan sonra proje paftaları bu çizimden üretilir.', 'res');
  return true;
}
// Kullanıcı kuralı 19.10.2026: onay SON HALİ onaylar. Seçeneğin yerleşimi/kablo planı açılıp düzenlendiyse (masa, inverter, trafo taşıma,
// DC atama, DC string, AC/OG kanal) düzenlenmiş hal kaynak çizime aktarılır ve proje paftaları bu son halden üretilir; hesaplanan ilk hal değil.
async function pjPaftaDuzenAktar(a) {
  const P = S.doc, tipler = new Set(['inv', 'tm', 'dm', 'ac', 'og', 'dc', 'dcata', 'dcstr']);
  const gesMi = (D, it) => (String(it.layer).toUpperCase() === 'GES-MASA' && (() => { const b = itemBB(D, it); return b && isFinite(b[0]) && sinirIcinde([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]); })()) || (it.ges && tipler.has(it.ges.tip)) || String(it.layer).toUpperCase() === 'GES-DC-ATAMA';
  const sec = [...P.items.values()].filter((it) => gesMi(P, it)); const sid = new Set(sec.map((it) => it.id));
  for (const it of P.items.values()) if (it.gesEt && sid.has(it.gesEt) && !sid.has(it.id)) { sec.push(it); sid.add(it.id); }
  const nMasa = sec.filter((it) => String(it.layer).toUpperCase() === 'GES-MASA').length; if (!nMasa) return pjSecenekCizime(a);
  const say = (t) => sec.filter((it) => it.ges && it.ges.tip === t).length;
  const kopya = sec.map((it) => structuredClone(it)), bl = new Map();
  const blokTopla = (ad) => { if (!ad || bl.has(ad) || !P.blocks.has(ad)) return; const b = P.blocks.get(ad); bl.set(ad, structuredClone(b)); for (const e of b.ents || []) if (e.type === 'INSERT' && e.name) blokTopla(e.name); };
  for (const it of kopya) if (it.t === 'insert') blokTopla(it.block);
  pjBack(); const D = S.doc;
  const eski = [...D.items.values()].filter((it) => gesMi(D, it)); const eid = new Set(eski.map((it) => it.id));
  for (const it of D.items.values()) if (it.gesEt && eid.has(it.gesEt) && !eid.has(it.id)) eski.push(it);
  for (const id of G.fillIds || []) { const it = D.items.get(id); if (it && !eski.includes(it)) eski.push(it); }
  const r = await askDlg('Son hali onayla', '"' + a.ad + '" seçeneğinin düzenlenmiş son hali kaynak çizime yazılacak: ' + nMasa + ' masa, ' + say('inv') + ' inverter, ' + (say('tm') + say('dm')) + ' bina, ' + (say('dcata') + say('dcstr')) + ' DC atama/string, ' + say('ac') + ' AC, ' + say('og') + ' OG hattı.' + (eski.length ? ' Çizimdeki eski GES yerleşimi (' + eski.length + ' nesne) kaldırılır; Geri al ile döner.' : '') + ' Proje paftaları, metraj ve keşif bu son halden üretilir.', [['Son hali onayla ve projeyi üret', 'ok', 'primary'], ['Vazgeç', null, 'ghost']]);
  if (r !== 'ok') return false;
  for (const [ad, b] of bl) if (!D.blocks.has(ad)) D.blocks.set(ad, b);
  const m = new Map(); for (const it of kopya) { const n = newId(); m.set(it.id, n); m.set(String(it.id), n); it.id = n; }
  for (const it of kopya) {
    if (it.gesEt !== undefined && m.has(it.gesEt)) it.gesEt = m.get(it.gesEt);
    if (it.ges) for (const k of Object.keys(it.ges)) { const v = it.ges[k]; if ((typeof v === 'string' || typeof v === 'number') && k !== 'no' && m.has(v)) it.ges[k] = m.get(v); }
    if (!D.layers.has(it.layer)) D.addLayer(it.layer, P.layers.get(it.layer) ? P.layers.get(it.layer).c : 7);
  }
  G.fillIds = [];
  replaceItems([...eski.map((it) => [it, null]), ...kopya.map((n) => [null, n])], 'son hal onayı'); renderLayers();
  if (typeof cepheCiz === 'function') cepheCiz();
  if (typeof tsFormaYaz === 'function') tsFormaYaz();
  return true;
}
async function pjAltOnayla(a) {
  const duzenli = PJ.aktif === a && PJ.cur && /_0[14]_/.test(PJ.cur);
  if (duzenli) { if (!(await pjPaftaDuzenAktar(a))) return; }
  else if (!a.cizim && !(await pjSecenekCizime(a))) return;
  a.uygula(); pjSave(); PJ.onayAd = a.ad;
  let p; try { p = buildParam(); } catch (e) { msg('Parametre hatası: ' + e.message, 'err'); return; }   // son hal: kaynak çizimden okunur
  msg('Son hal onaylandı: ' + a.ad + (duzenli ? ' (düzenlemelerinizle)' : '') + '. Tek hat, topraklama, kablo, kanal detayı, metraj, keşif, teklif ve PDF bu çizimden hazırlanıyor…', 'res');
  gv('pjdlg').close();
  if (PJ.altMod) { PJ.onay = p; PJ.again = true; PJ.alt.forEach((x) => { if (x.durum === 'bekliyor') x.durum = 'iptal'; }); return; }
  PJ.alt.forEach((x) => { if (x.durum === 'bekliyor') x.durum = 'iptal'; });
  pjRun(p);
}
// Kullanıcı talimatı → form alanları (anlaşılan her madde uygulanır, anlaşılmayan bildirilir)
function pjRevizeCoz(txt) {
  const T = txt.toLocaleLowerCase('tr').replace(/,(\d)/g, '.$1'); const yap = [], set = [];
  const num = (re) => { const m = T.match(re); return m ? parseFloat(m[m.length - 1]) : null; };
  let v;
  const mt = T.match(/(\d)\s*([vh])\s*(\d{1,2})/i);
  if (mt) { const t = mainTpl(); set.push(() => { t.rows = +mt[1]; t.orient = mt[2].toUpperCase(); t.per = +mt[3]; renderTpl(); gesSave(); }); yap.push('masa ' + mt[1] + mt[2].toUpperCase() + mt[3]); }
  if ((v = num(/eğim\D{0,12}(\d{1,2}(?:\.\d)?)/)) !== null) { set.push(() => { mainTpl().tilt = v; renderTpl(); gesSave(); pitchUpdate(); }); yap.push('eğim ' + v + '°'); }
  const cek = num(/çekme\D{0,12}(\d+(?:\.\d+)?)/); if (cek !== null) { set.push(() => { gv('p-cekme').value = cek; }); yap.push('çekme ' + cek + ' m'); }
  const ac = num(/(?:sıra açıklığı|açıklık|sıra arası)\D{0,10}(\d+(?:\.\d+)?)/); if (ac !== null) { set.push(() => { gv('p-acik').value = ac; }); yap.push('sıra açıklığı ' + ac + ' m'); }
  const kwp = num(/(\d+(?:\.\d+)?)\s*kwp/), mw = kwp === null ? num(/(\d+(?:\.\d+)?)\s*mw/) : null; const hk = kwp !== null ? kwp : mw !== null ? mw * 1000 : null; if (hk !== null) { set.push(() => { gv('p-mwp').value = hk; }); yap.push('hedef ' + hk + ' kWp'); }
  const ia = num(/(\d{1,4})\s*(?:adet\s*)?inverter(?!\D{0,6}kw)/); if (ia !== null) { set.push(() => { gv('p-invn').value = ia; }); yap.push(ia + ' inverter'); }
  if (/tüm arazi|arazinin tamamı|sınırsız/.test(T)) { set.push(() => { gv('p-mwp').value = ''; }); yap.push('arazinin tamamı'); }
  const r = num(/dc\s*\/?\s*ac\D{0,8}(\d\.\d+)/); if (r !== null) { set.push(() => { gv('p-ratio').value = r; }); yap.push('DC/AC ' + r); }
  const tr = num(/trafo\D{0,15}(\d{3,5})/); if (tr !== null) { set.push(() => { const s = gv('p-trafo'); if (![...s.options].some((o) => +o.value === tr)) s.add(new Option(tr + ' kVA', tr)); s.value = tr; }); yap.push('trafo ' + tr + ' kVA'); }
  const inv = num(/inverter\D{0,15}(\d{2,4})\s*kw/) ?? num(/(\d{2,4})\s*kw\D{0,6}inverter/); if (inv !== null) { set.push(() => { gv('p-inv').value = inv; }); yap.push('inverter ' + inv + ' kW'); }
  if (/(iç )?yol(ları)?\s*(kapat|kaldır|olmasın|yok)|yolsuz/.test(T)) { set.push(() => { gv('p-icyol').value = '0'; }); yap.push('iç yol kapalı'); }
  else if (/iç yol\D{0,10}(aç|olsun|ekle)/.test(T)) { set.push(() => { gv('p-icyol').value = '1'; }); yap.push('iç yol açık'); }
  const yw = num(/yol\D{0,12}genişli\D{0,8}(\d+(?:\.\d+)?)/) ?? num(/(\d+(?:\.\d+)?)\s*m(?:etre)?(?:lik)?\s+(?:iç )?yol/); if (yw !== null) { set.push(() => { gv('p-icw').value = yw; }); yap.push('iç yol ' + yw + ' m'); }
  const ya = num(/yol\D{0,6}aralı\D{0,10}(\d+)/) ?? num(/(\d+)\s*m(?:etre)?(?:de|da)\s*bir\s*yol/); if (ya !== null) { set.push(() => { gv('p-icar').value = ya; }); yap.push('iç yol aralığı ' + ya + ' m'); }
  if (/tm\D{0,12}batı|trafo\D{0,12}batı/.test(T)) { set.push(() => { gv('p-taraf').value = 'bati'; }); yap.push('DM/TM batı'); }
  if (/tm\D{0,12}doğu|trafo\D{0,12}doğu/.test(T)) { set.push(() => { gv('p-taraf').value = 'dogu'; }); yap.push('DM/TM doğu'); }
  const az = num(/azimut\D{0,8}(-?\d{1,2})/); if (az !== null) { set.push(() => { gv('g-ang').value = az; }); yap.push('azimut ' + az + '°'); }
  return { yap, uygula: () => { set.forEach((f) => f()); pjAutoHints(); pjSave(); } };
}
function pjRevize() {
  const inp = gv('pj-rev'); const txt = inp.value.trim(); if (!txt) return;
  inp.value = ''; gesSohbet(txt); return;
  const r = pjRevizeCoz(txt);
  const dz = pjDuzenCoz(txt.toLocaleLowerCase('tr').replace(/,(\d)/g, '.$1'));
  if (dz.length && !r.yap.length) { inp.value = ''; PJ.revNot = 'Uygulandı: ' + dz.join(', ') + '. Yeniden çiziliyor.'; pjDuzenCiz(dz.join(', ')); return; }
  if (dz.length) r.yap.push(...dz);
  if (!r.yap.length) { PJ.revNot = null; gv('pj-revnot').textContent = 'Talimat anlaşılmadı. Örnek: "TM2 kuzeye 50 m", "TR1 INV3 doğuya 20 m", "2. yolu kaldır", "eğim 20", "2V14 masa", "çekme 4 m", "sıra açıklığı 4", "25 MWp", "trafo 4000", "inverter 330 kW", "iç yolları kaldır", "yol genişliği 6", "yol aralığı 150", "TM batı", "azimut 10".'; return; }
  r.uygula(); let p; try { p = buildParam(); } catch (e) { gv('pj-revnot').textContent = 'Parametre hatası: ' + e.message; return; }
  PJ.revNo = (PJ.revNo || 0) + 1; inp.value = '';
  PJ.revNot = 'Uygulandı: ' + r.yap.join(', ') + '. Revizyon ' + PJ.revNo + ' hesaplanıyor; sonuç tabloda.';
  pjAltEkle({ ad: 'Revizyon ' + PJ.revNo, acik: '"' + txt + '" → ' + r.yap.join(', '), param: p, uygula: () => r.uygula() });
}
function pjAltCiz() {
  if (PJ.tab !== 'yerlesim' || !gv('pjdlg').open) return;
  const box = gv('pj-body'); const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  box.innerHTML = '';
  if (PJ.aktif) box.appendChild(h('p', 'gi', 'Çizimde düzenlemek için bir satırda "Yerleşim"i açın; soldaki Trafo / İnverter / Yol araçlarıyla taşıyın ya da yol çizin, "Yeniden" ile son duruma göre masa, inverter, trafo ve kablolar yeniden yerleşir. Yazarak da düzenleyebilirsiniz (aşağıdaki kutu).'));
  box.appendChild(h('p', 'gi', 'Önce yerleşim çizilir ve alternatiflerle karşılaştırılır. Uygun olanı açıp düzenleyin, son halini onaylayın ya da talimat yazarak revize edin; onaydan sonra tek hat, topraklama, kablo planı, kanal detayı, kablo cetveli, metraj, keşif, teklif ve PDF hazırlanır.'));
  const t = h('table', 'kt alt'); t.innerHTML = '<thead><tr><th>Seçenek</th><th>Masa</th><th>DC MWp</th><th>İnverter adet × güç = toplam · trafo</th><th>İç yol</th><th>En uzun DC</th><th>En uzun AG</th><th>Yol geçişi</th><th>Kontrol</th><th></th></tr></thead>';
  const tb = h('tbody'); const P = G.panel;
  const hz = PJ.alt.filter((a) => a.durum === 'hazir'); const enIyi = hz.length ? hz.reduce((x, y) => (y.oz.masa > x.oz.masa ? y : x)) : null;
  for (const a of PJ.alt) {
    const tr = h('tr', a.durum + (a === PJ.aktif ? ' aktif' : '')); const ad = h('td'); ad.append(h('b', '', a.ad + (a === PJ.aktif ? ' · açık' : '')), h('small', '', a.acik)); tr.appendChild(ad);
    if (a.durum === 'hazir') {
      const o = a.oz; const dc = o.modul * P.p / 1e6, bad = a.kontrol.filter((k) => k.durum === '✖');
      const vals = [o.masa.toLocaleString('tr') + (a === enIyi && hz.length > 1 ? ' ★' : ''), fmtNum(dc, 3), (o.inv_kw ? o.inverter + ' × ' + fmtNum(o.inv_kw, 0) + ' kW = ' + fmtNum(o.ac_kw, 0) + ' kW' : o.inverter + ' inverter') + ' · ' + (o.tr_kva && o.tr_kva[0] ? o.tm + ' × ' + o.tr_kva[0] + ' kVA' : o.tm + ' trafo') + (o.cikis_kw && o.ac_kw > o.cikis_kw ? ' (çıkış ' + fmtNum(o.cikis_kw, 0) + ' kW)' : ''), o.ic_yol ? o.ic_yol + ' yol' : '—', fmtNum(o.dc_max, 0) + ' m (sınır ' + fmtNum(o.dc_lim, 0) + ')', fmtNum(o.ac_max, 0) + ' m', String(o.yol_gecis)];
      for (const v of vals) tr.appendChild(h('td', '', v));
      const kc = h('td', bad.length ? 'bad' : 'ok', bad.length ? bad.length + ' ✖' : '✔'); kc.title = bad.map((k) => k.kontrol + ': ' + k.deger).join('\n'); tr.appendChild(kc);
      const act = h('td', 'acts');
      const b1 = h('button', 'mini', 'Yerleşim'); b1.onclick = () => { const f = Object.keys(a.files).find((n) => /_01_/.test(n)); pjOpenPafta(f, false, a.files); PJ.aktif = a; pjDuzenBilgi(); gv('pjdlg').close(); msg('Açık yerleşim: ' + a.ad + '. Düzenlemek için GES sekmesi → Çizimde düzenle ya da soldaki Trafo / İnverter / Yol araçları.', 'note'); };
      const b2 = h('button', 'mini', 'Kablo planı'); b2.title = 'Yerleşim açılır; DC atama, DC string ve AC kanal tasarım araçlarıyla (DC oto, DC çiz, AC oto) çizilir';
      b2.onclick = async () => { const f = Object.keys(a.files).find((n) => /_01_/.test(n)); pjOpenPafta(f, false, a.files); PJ.aktif = a; pjDuzenBilgi(); gv('pjdlg').close(); await pjKabloOto(); };
      const b3 = h('button', 'mini ok', a === PJ.aktif && PJ.cur && /_0[14]_/.test(PJ.cur) ? 'Son hali onayla → projeyi tamamla' : 'Onayla → projeyi tamamla'); b3.title = 'Açıp düzenlediyseniz (taşıma, DC atama, kablo) düzenlenmiş son hal onaylanır ve proje bu halden üretilir'; b3.onclick = () => pjAltOnayla(a);
      act.append(b1, b2, b3); tr.appendChild(act);
    } else {
      const td = h('td', 'st', a.durum === 'calisiyor' ? 'Hesaplanıyor… (' + fmtNum((performance.now() - a.t0) / 1000, 0) + ' sn)' + (a.asama ? ' · ' + a.asama : '') : a.durum === 'bekliyor' ? 'Sırada' : a.durum === 'iptal' ? 'İptal (başka seçenek onaylandı)' : 'Hata: ' + (a.hata || ''));
      td.colSpan = 9; tr.appendChild(td);
    }
    tb.appendChild(tr);
  }
  t.appendChild(tb); const w = h('div', 'tw'); w.appendChild(t); box.appendChild(w);
  const rv = h('div', 'revbox');
  const sh = h('div', 'sohbet'); for (const m of PJ.sohbet.slice(-14)) sh.appendChild(h('div', 'sb ' + (m.kim === 'sen' ? 'sen' : 'cevap'), m.metin));
  if (!PJ.sohbet.length) sh.appendChild(h('div', 'sb cevap', 'Ne değiştirmek istediğinizi yazın; ör. "inverterleri trafoya yaklaştır", "eğim 20", "hizalama doğuya", "kabloları çiz". Neden sorusu da sorabilirsiniz: "inverter neden batıda?"'));
  rv.appendChild(sh);
  const sat = h('div', 'brow'); sat.innerHTML = '<input id="pj-rev" type="text" placeholder="Yazın: ör. inverterleri trafoya yaklaştır" style="flex:1"><button class="gb primary" id="pj-revb" type="button">Gönder</button>'; rv.appendChild(sat);
  const cips = h('div', 'brow'); for (const o of SOHBET_ORNEK.slice(0, 8)) { const c = h('button', 'mini', o); c.onclick = () => gesSohbet(o); cips.appendChild(c); } { const c = h('button', 'mini ok', '☰ Tüm komutlar'); c.onclick = (e) => { gv('pjdlg').close(); komutListe(e); }; cips.appendChild(c); } rv.appendChild(cips);
  box.appendChild(rv); requestAnimationFrame(() => { sh.scrollTop = sh.scrollHeight; });
  gv('pj-revb').onclick = pjRevize; gv('pj-rev').onkeydown = (e) => { if (e.key === 'Enter') pjRevize(); };
  if (PJ.alt.some((a) => a.durum === 'calisiyor')) { clearTimeout(PJ.altT); PJ.altT = setTimeout(pjAltCiz, 1000); }
}

// Kablo planı: tasarım araçlarının kendisiyle (aynı kurallar: DC 80 m / ΔU ataması, string gösterimi, tek ortak AC kanalı)
async function pjKabloOto() {
  if (!tsInverterler().length) { msg('Yerleşimde inverter yok.', 'err'); return; }
  busy('DC atanıyor…'); await tick();
  let R; try { R = tsDcOtoAta(false); tsDcAtaYaz(R.yeni); } finally { busy(null); }
  await CMD.GDCCIZ();
  if ([...S.doc.items.values()].some((it) => it.t === 'insert' && it.ges && it.ges.tip === 'tm')) { const v = {}; for (const [k, , f] of TS.ac.alan) v[k] = f(); await CMD.GACOTO(v); }
  msg('Kablo planı tasarım araçlarıyla çizildi: DC atama ' + R.yeni.size + ' masa' + (R.kalan.length ? ' (' + R.kalan.length + ' masa atanamadı)' : '') + ', DC stringler ve AC kanal. Proje paftaları bu çizimden üretilir.', 'res');
}

// Açık yerleşim sağ paneldeki ayarlarla (hizalama, sıra başlangıcı, sıra açısı, masa arası, çekme, sıra aralığı) yeniden hesaplanır
function pjAktifYenile() {
  const a = PJ.aktif; if (!a || !PJ.cur || !/_01_/.test(PJ.cur)) return false;
  if (a.cizim || !a.fark) { pjBack(); return false; }   // çizimdeki yerleşim: kaynak çizime dönülür, Arazi doldur yeniden yerleştirir
  clearTimeout(pjAktifYenile.t);
  pjAktifYenile.t = setTimeout(() => { let base; try { base = pjDuzenUygula(buildParam0()); } catch (e) { msg('Parametre hatası: ' + e.message, 'err'); return; }
    a.param = a.fark(kopya(base)); a.durum = 'bekliyor'; a.duzen = true; msg('"' + a.ad + '" yerleşimi yeni ayarlarla yeniden hesaplanıyor…', 'note'); pjAltSirada(); }, 350);
  return true;
}
// ---- Sohbet (kullanıcı kuralı 19.10.2026): komut satırına ya da revizyon kutusuna cümle yazılır; anlaşılan uygulanır,
// anlaşılmayan için ne yapılabileceği söylenir. Tek kaynak form alanları; yerleşim açıksa o yerleşim yeniden hesaplanır.
PJ.sohbet = PJ.sohbet || [];
const SOHBET_ORNEK = ['inverterleri trafoya yaklaştır', 'inverterleri ortala', '10 inverter', 'eğim 20', 'çekme 4 m', 'hizalama doğuya', 'sıra başlangıcı kuzeyden',
  'iç yolları kaldır', 'trafo 1600', 'TM batı', 'kabloları çiz', 'DC oto', 'AC oto', 'yerleşimi çiz', 'proje paftalarını oluştur'];
function sohbetYaz(kim, metin) {
  PJ.sohbet.push({ kim, metin, t: Date.now() }); if (PJ.sohbet.length > 80) PJ.sohbet.shift();
  msg((kim === 'sen' ? '› ' : '◆ ') + metin, kim === 'sen' ? 'sen' : 'cevap');
  if (PJ.tab === 'yerlesim' && gv('pjdlg') && gv('pjdlg').open) pjAltCiz();
}
function sohbetNiyet(T) {
  const yap = [], set = [], is = [];
  const hz = (k, ad) => { set.push(() => { gv('p-invhiza').value = k; }); yap.push('inverter yerleşimi: ' + ad); };
  if (/inverter\D{0,40}(trafo|tm|köşk|kösk)\D{0,20}(yakın|yaklaş|tarafa|tarafına|doğru|yanına)|trafoya yaklaş|ac(?: kablo)?\D{0,10}(kısalt|kısa)/.test(T)) hz('trafo', 'trafoya yakın (DC ≤ sınır)');
  else if (/inverter\D{0,30}(ortala|ortalı|ortaya|orta)/.test(T)) hz('orta', 'ortalı');
  else if (/inverter\D{0,30}(yol|çit|kenar)/.test(T)) hz('yol', 'servis yolu / çit kenarı');
  else if (/inverter\D{0,30}(optimum|en kısa dc)/.test(T)) hz('optimum', 'optimum (en kısa DC)');
  const al = /hizala\S*\D{0,12}(doğu|batı|orta|opt)/.exec(T);
  if (al) { const v = { doğu: 'right', batı: 'left', orta: 'center', opt: 'opt' }[al[1]]; set.push(() => { gv('g-align').value = v; }); yap.push('hizalama ' + al[1]); }
  const va = /(sıra başlangıc\S*|sıralar)\D{0,12}(kuzey|güney|orta)/.exec(T);
  if (va) { const v = { kuzey: 'north', güney: 'south', orta: 'center' }[va[2]]; set.push(() => { gv('g-valign').value = v; }); yap.push('sıra başlangıcı ' + va[2]); }
  if (/kablo\S*\s*(çiz|planı)|kablo planı/.test(T)) is.push(['kablo planı', async () => { if (!tsInverterler().length) return 'Açık yerleşimde inverter yok; önce "yerleşimi çiz" deyin ve bir seçeneği açın.'; await pjKabloOto(); return null; }]);
  else {
    if (/alt\s*\/?\s*üst string|üst\s*\/?\s*alt string/.test(T)) { set.push(() => { gv('p-strtip').value = 'altust'; }); yap.push('string düzeni alt/üst'); }
  else if (/tek masa tek string/.test(T)) { set.push(() => { gv('p-strtip').value = 'tek'; }); yap.push('string düzeni tek masa'); }
  if (/\bdc\s*(oto|ata|otomatik)/.test(T)) is.push(['DC otomatik atama', async () => { await CMD.GDCOTO(); return null; }]);
    if (/\bac\s*(oto|otomatik)|ac kablo\S*\s*çiz/.test(T)) is.push(['AC otomatik', async () => { await CMD.GACOTO(); return null; }]);
  }
  // sabit komut (kullanıcı 19.10.2026): "toplam trafo gücünü 1600 kVA'nın katları yap, yerleşimi tekrar yap"
  const kat = /(\d{3,5})\s*kva\S*\s*(?:'?n[ıi]n\s*)?katlar/.exec(T);
  let ozel = false;
  if (kat) { ozel = true; const kva = +kat[1];
    is.push(['trafo ' + kva + ' kVA katları + yerleşim', async () => { const s_ = gv('p-trafo'); if (![...s_.options].some((o) => +o.value === kva)) s_.add(new Option(kva + ' kVA', kva)); s_.value = kva; const it = gv('p-invtr'); if (it) it.value = ''; pjAutoHints(); pjSave(); if (typeof tfSync === 'function') tfSync();
      const a_ = pjAuto(); pjYerlesim(); return 'Trafo birimi ' + kva + ' kVA: TR başına en çok ' + a_.invTr + ' inverter (' + fmtNum(a_.invTr * a_.invKw, 0) + ' kW, %10 marj); trafo adedi inverter sayısından çıkar, toplam trafo gücü ' + kva + ' kVA\'nın katı. Yerleşim seçenekleri yeniden hesaplanıyor.'; }]); }
  else if (/yerleşim\S*\s*(tekrar|yeniden)/.test(T)) is.push(['yerleşim seçenekleri', async () => { pjYerlesim(); return null; }]);
  if (/son\s*hal|onayla|onay ver|projeyi (yeniden )?üret|yeniden hesapla/.test(T)) is.push(['son hali onayla', async () => { await pjSonHalOnayla(); return null; }]);
  if (/arazi\S*\s*doldur/.test(T)) is.push(['arazi doldur', async () => { if (PJ.srcDoc) pjBack(); await CMD.GFILL(); return null; }]);
  if (/yerleşim\S*\s*(çiz|seçenek|karşılaştır)|seçenekleri/.test(T)) is.push(['yerleşim seçenekleri', async () => { pjYerlesim(); return null; }]);
  if (/(proje|pafta)\S*\s*(oluştur|üret|çiz|hazırla)/.test(T)) is.push(['proje paftaları', async () => { pjRun(); return null; }]);
  return { yap, set, is, ozel };
}
function sohbetNeden(T) {
  if (!/neden|niye|niçin|mantığı|amacı/.test(T)) return null;
  const hz = (gv('p-invhiza') || {}).value || 'trafo';
  if (/inverter/.test(T)) return 'İnverter yeri "' + ({ trafo: 'trafoya yakın', yol: 'servis yolu / çit kenarı', orta: 'ortalı', optimum: 'optimum' }[hz] || hz) + '" kuralıyla seçiliyor. "Trafoya yakın"da her inverter, bloğundaki en uzun DC tek yön ' + (pn('p-dcmax') || 80) + ' m sınırını aşmayan en trafoya yakın masa başına konur; AC kısalır, DC payı kullanılır. Değiştirmek için: "inverterleri trafoya yaklaştır", "inverterleri ortala", "inverterleri yol kenarına al".';
  if (/trafo|köşk|tm/.test(T)) return 'Trafo (köşk) yeri: servis yolu / iç yol kenarında, inverter grubunun ortasına yakın ve bina gölgesinin (21 Aralık) en az masa kaybettirdiği nokta. Taşımak için "TM1 kuzeye 30 m" yazın ya da Trafo + aracıyla çizin.';
  if (/kablo|kanal/.test(T)) return 'AC kablolar tek ortak kanalda, en az kırıkla ve masa altından geçmeden ADP\'ye gider; kanal genişliği geçen devre sayısıyla kademeli artar. DC stringler masa içinde çizilir, atama 80 m / ΔU kuralına göre.';
  return null;
}
async function gesSohbet(metin) {
  const txt = String(metin || '').trim(); if (!txt) return;
  sohbetYaz('sen', txt);
  const T = txt.toLocaleLowerCase('tr').replace(/,(\d)/g, '.$1');
  const ned = sohbetNeden(T);
  const n = sohbetNiyet(T), r = pjRevizeCoz(txt), dz = pjDuzenCoz(T);
  if (n.ozel) { r.yap.length = 0; n.is = n.is.filter((x) => x[0] !== 'yerleşim seçenekleri'); }
  const ayar = [...n.yap, ...r.yap], hepsi = [...ayar, ...dz, ...n.is.map((x) => x[0])];
  if (!hepsi.length) {
    sohbetYaz('cevap', (ned ? ned + ' ' : 'Bunu bir işleme çeviremedim. ') + (ned ? '' : 'Yapabildiklerim: ayar değiştirmek (' + SOHBET_ORNEK.slice(0, 9).map((s) => '"' + s + '"').join(', ') + '), taşımak ("TM1 kuzeye 30 m", "TR1 INV3 doğuya 20 m"), işlem başlatmak ("kabloları çiz", "DC oto", "AC oto", "yerleşimi çiz", "proje paftalarını oluştur"). Tüm kalıplar komut satırındaki ☰ Komutlar listesinde; tıklayarak seçebilirsiniz.'));
    return;
  }
  if (ned) sohbetYaz('cevap', ned);
  n.set.forEach((f) => f()); if (r.yap.length) r.uygula(); pjAutoHints(); pjSave(); if (typeof tfSync === 'function') tfSync();
  if (ayar.length || dz.length) {
    const a = PJ.aktif;
    if (a && a.fark && !a.cizim && PJ.cur && /_01_/.test(PJ.cur)) { pjAktifYenile(); sohbetYaz('cevap', 'Uygulandı: ' + [...ayar, ...dz].join(', ') + '. Açık yerleşim "' + a.ad + '" yeni ayarlarla yeniden hesaplanıyor.'); }
    else if (PJ.alt && PJ.alt.length) { let p; try { p = buildParam(); } catch (e) { sohbetYaz('cevap', 'Parametre hatası: ' + e.message); return; }
      PJ.revNo = (PJ.revNo || 0) + 1; pjAltEkle({ ad: 'Revizyon ' + PJ.revNo, acik: '"' + txt + '" → ' + [...ayar, ...dz].join(', '), param: p, uygula: () => {}, fark: (b) => b });
      sohbetYaz('cevap', 'Uygulandı: ' + [...ayar, ...dz].join(', ') + '. "Revizyon ' + PJ.revNo + '" seçenek olarak hesaplanıyor; bitince Yerleşim seçeneklerinde.'); }
    else sohbetYaz('cevap', 'Ayarlandı: ' + [...ayar, ...dz].join(', ') + '. "yerleşimi çiz" ya da "proje paftalarını oluştur" dediğinizde bu ayarlarla çizilir.');
  }
  for (const [ad, f] of n.is) { sohbetYaz('cevap', ad + ' başlatıldı.'); try { const m = await f(); if (m) sohbetYaz('cevap', m); } catch (e) { sohbetYaz('cevap', ad + ' yapılamadı: ' + (e.message || e)); } }
}

// ---- Komut listesi (kullanıcı kuralı 19.10.2026): tanınan kalıplar tıklanabilir listede. Sayılı kalıp tıklanınca komut satırına
// yazılır ve sayı seçili gelir (değiştirip Enter); sayısız kalıp tıklanınca hemen uygulanır.
const KOMUT_LISTE = [
  ['İşlem', ['arazi doldur', 'yerleşimi çiz ve seçenekleri karşılaştır', 'kabloları çiz', 'DC oto', 'AC oto', 'son hali onayla', 'proje paftalarını oluştur']],
  ['İnverter', ['inverterleri trafoya yaklaştır', 'inverterleri ortala', 'inverterleri yol kenarına al', 'inverter optimum', '{10} inverter', 'inverter {125} kW', 'TR{1} INV{3} doğuya {20} m', 'TR{1} INV{3} batıya {20} m', 'TR{1} INV{3} kuzeye {20} m', 'TR{1} INV{3} güneye {20} m']],
  ['Trafo / DM', ['toplam trafo gücünü 1600 kVA\'nın katları yap, yerleşimi tekrar yap', 'toplam trafo gücünü 2000 kVA\'nın katları yap, yerleşimi tekrar yap', 'trafo {1600}', 'TM{1} kuzeye {30} m', 'TM{1} güneye {30} m', 'TM{1} doğuya {30} m', 'TM{1} batıya {30} m', 'TM batı', 'TM doğu']],
  ['Masa ve yerleşim', ['eğim {20}', '{2}V{13} masa', 'çekme {4} m', 'sıra açıklığı {4}', 'azimut {10}', '{25} MWp', 'arazinin tamamı', 'DC/AC {1.25}', 'hizalama doğu', 'hizalama batı', 'hizalama orta', 'hizalama opt', 'sıra başlangıcı kuzey', 'sıra başlangıcı güney', 'sıra başlangıcı orta']],
  ['Yollar', ['iç yolları kaldır', 'iç yol aç', 'yol genişliği {6}', 'yol aralığı {150}', '{2}. yolu kaldır']],
  ['String', ['alt/üst string', 'tek masa tek string']],
  ['Soru', ['inverter neden burada', 'trafo neden burada', 'kablo neden böyle']],
];
function komutListe(ev) {
  if (ev) ev.stopPropagation();
  let p = gv('komutpop'); if (p) { p.remove(); return; }
  p = document.createElement('div'); p.id = 'komutpop'; p.className = 'komutpop';
  const ara = document.createElement('input'); ara.placeholder = 'Ara…'; ara.className = 'kara'; p.appendChild(ara);
  const govde = document.createElement('div'); p.appendChild(govde);
  const kapat = () => { p.remove(); document.removeEventListener('mousedown', dis, true); };
  const dis = (e) => { if (!p.contains(e.target) && e.target.id !== 'bkomut') kapat(); };
  const ciz = () => {
    govde.innerHTML = ''; const q = ara.value.toLocaleLowerCase('tr').trim();
    for (const [baslik, ls] of KOMUT_LISTE) {
      const uy = ls.filter((k) => !q || k.replace(/[{}]/g, '').toLocaleLowerCase('tr').includes(q) || baslik.toLocaleLowerCase('tr').includes(q)); if (!uy.length) continue;
      const hd = document.createElement('div'); hd.className = 'khd'; hd.textContent = baslik; govde.appendChild(hd);
      for (const k of uy) {
        const b = document.createElement('button'); b.className = 'kit'; const duz = k.replace(/[{}]/g, '');
        b.innerHTML = k.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\{([^}]*)\}/g, '<i>$1</i>');
        b.title = /\{/.test(k) ? 'Komut satırına yazılır; sayıyı değiştirip Enter' : 'Hemen uygulanır';
        b.onclick = () => {
          kapat();
          if (!/\{/.test(k)) { gesSohbet(duz); return; }
          const inp = gv('cmd'); inp.value = duz; inp.focus(); const i0 = k.indexOf('{'), i1 = k.indexOf('}'); inp.setSelectionRange(i0, i1 - 1);
        };
        govde.appendChild(b);
      }
    }
  };
  ara.oninput = ciz; ara.onkeydown = (e) => { if (e.key === 'Escape') kapat(); if (e.key === 'Enter') { const b = govde.querySelector('.kit'); if (b) b.click(); } };
  ciz(); (gv('bkomut').closest('.cmdbox') || document.body).appendChild(p); ara.focus();
  document.addEventListener('mousedown', dis, true);
}
(function () { const bag = () => { const b = gv('bkomut'); if (b) b.onclick = komutListe; }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bag); else bag(); })();
