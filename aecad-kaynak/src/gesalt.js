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
  const L = [{ ad: 'Mevcut', acik: 'Girilen bilgilerle (esaslar: iç yol ΔU %1, 5 m çekme)', param: kopya(base), uygula: () => {} }];
  const t0 = base.masa.egim_derece;
  L.push(altEgim(base, t0 > 20 ? 20 : 25));
  if (base.yol.ic_yol) { const p = kopya(base); p.yol.ic_yol = false; L.push({ ad: 'İç yolsuz', acik: 'Karşılaştırma: yalnız kenar servis yolu (daha çok masa, uzun AG kablo)', param: p, uygula: () => { gv('p-icyol').value = '0'; pjSave(); } }); }
  else { const p = kopya(base); p.yol.ic_yol = true; L.push({ ad: 'İç yollu', acik: 'K-G iç bakım yolları, aralık DC ΔU %1', param: p, uygula: () => { gv('p-icyol').value = '1'; pjSave(); } }); }
  const hz0 = (base.elektrik && base.elektrik.inverter_hiza) || 'yol';
  for (const [k, ad, ac] of [['orta', 'İnverter ortalı', 'İnverterler bloğun ortasındaki sıranın masa başında'], ['optimum', 'İnverter optimum', 'İnverter her blokta en kısa DC\'yi veren masa başında'], ['yol', 'İnverter yol kenarı', 'İnverterler servis yoluna / çite yakın masa başında']]) {
    if (k === hz0 || L.length >= 5) continue; const p = kopya(base); p.elektrik.inverter_hiza = k;
    L.push({ ad, acik: ac, param: p, uygula: () => { gv('p-invhiza').value = k; pjSave(); } });
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
function pjAltSirada() {
  if (PJ.altMod || PJ.busy) return;
  const a = PJ.alt.find((x) => x.durum === 'bekliyor'); if (!a) { gv('p-stage').textContent = 'Yerleşim seçenekleri hazır. Birini onaylayın ya da revizyon yazın.'; pjAltCiz(); return; }
  a.durum = 'calisiyor'; a.t0 = performance.now(); PJ.altMod = true; PJ.seq++; a.seq = PJ.seq; pjAltCiz();
  pjWorker().postMessage({ id: PJ.seq, base: new URL('./', document.baseURI).href, json: JSON.stringify(a.param), mode: 'yer' });
}
function pjAltSonuc(m) {
  const a = PJ.alt.find((x) => x.seq === m.id); PJ.altMod = false;
  if (a) {
    if (m.err) { a.durum = 'hata'; a.hata = m.err; }
    else { a.durum = 'hazir'; a.oz = m.oz; a.kontrol = m.kontrol; a.metraj = m.metraj; a.uyari = m.uyari; a.files = m.files; a.nes = m.nes; a.sn = (performance.now() - a.t0) / 1000;
      if (PJ.alt.filter((x) => x.durum === 'hazir').length === 1 || a.duzen) { const f = Object.keys(a.files).find((n) => /_01_GENEL_/.test(n)); if (f) { pjOpenPafta(f, true, a.files); PJ.aktif = a; pjDuzenBilgi(); } }
      if (a.duzen) { PJ.duzenBitti = true; msg(a.ad + ' hazır ve açıldı: ' + a.oz.masa + ' masa, ' + a.oz.inverter + ' inverter, ' + a.oz.tm + ' trafo. Kablo planı Yerleşim seçeneklerinde.', 'res'); } }
  }
  pjAltCiz(); pjAutoHints();
  if (PJ.again) { PJ.again = false; const p = PJ.onay; PJ.onay = null; pjRun(p || undefined); return; }
  pjAltSirada();
}
// Onaylanan GES-ÇİZ seçeneği çizime yazılır: masa, inverter, trafo, DM (eski GES yerleşimi geri alınabilir şekilde değişir)
async function pjSecenekCizime(a) {
  const N = a.nes; if (!N || !N.masa || !N.masa.length) return true;
  if (PJ.srcDoc) pjBack();
  const D = S.doc, tipler = new Set(['inv', 'tm', 'dm', 'ac', 'og', 'dc', 'dcata', 'dcstr']);
  const eski = [...D.items.values()].filter((it) => (String(it.layer).toUpperCase() === 'GES-MASA' && (() => { const b = itemBB(D, it); return b && pointInPoly([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], G.bound); })()) || (it.ges && tipler.has(it.ges.tip)) || String(it.layer).toUpperCase() === 'GES-DC-ATAMA');
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
async function pjAltOnayla(a) {
  if (!a.cizim && !(await pjSecenekCizime(a))) return;
  a.uygula(); pjSave(); PJ.onayAd = a.ad;
  msg('Onaylanan yerleşim: ' + a.ad + '. Tek hat, topraklama, kablo, kanal detayı, metraj, keşif, teklif ve PDF hazırlanıyor…', 'res');
  gv('pjdlg').close();
  if (PJ.altMod) { PJ.onay = a.param; PJ.again = true; PJ.alt.forEach((x) => { if (x.durum === 'bekliyor') x.durum = 'iptal'; }); return; }
  PJ.alt.forEach((x) => { if (x.durum === 'bekliyor') x.durum = 'iptal'; });
  pjRun(a.param);
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
  box.appendChild(h('p', 'gi', 'Önce yerleşim çizilir ve alternatiflerle karşılaştırılır. Uygun olanı onaylayın ya da talimat yazarak revize edin; onaydan sonra tek hat, topraklama, kablo planı, kanal detayı, kablo cetveli, metraj, keşif, teklif ve PDF hazırlanır.'));
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
      const b3 = h('button', 'mini ok', 'Onayla → projeyi tamamla'); b3.onclick = () => pjAltOnayla(a);
      act.append(b1, b2, b3); tr.appendChild(act);
    } else {
      const td = h('td', 'st', a.durum === 'calisiyor' ? 'Hesaplanıyor… (' + fmtNum((performance.now() - a.t0) / 1000, 0) + ' sn)' : a.durum === 'bekliyor' ? 'Sırada' : a.durum === 'iptal' ? 'İptal (başka seçenek onaylandı)' : 'Hata: ' + (a.hata || ''));
      td.colSpan = 9; tr.appendChild(td);
    }
    tb.appendChild(tr);
  }
  t.appendChild(tb); const w = h('div', 'tw'); w.appendChild(t); box.appendChild(w);
  const rv = h('div', 'revbox');
  rv.innerHTML = '<label class="gf">Revizyon talimatı<input id="pj-rev" type="text" placeholder="ör. TM2 kuzeye 50 m, TR1 INV3 doğuya 20 m, 2. yolu kaldır, eğim 20, 25 MWp"></label><button class="gb" id="pj-revb" type="button">Revize et ve çiz</button><p class="gi" id="pj-revnot"></p>';
  box.appendChild(rv);
  const not = PJ.revNot; if (not) gv('pj-revnot').textContent = not;
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
