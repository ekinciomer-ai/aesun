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
  return L.map((a) => ({ ...a, durum: 'bekliyor' }));
}
function pjYerlesim() {
  if (!sinirOto()) { msg('Önce arazi sınırını girin: kapalı polyline çizin ya da KML/KMZ ekleyin.', 'err'); return; }
  if (PJ.busy) { msg('GES-ÇİZ çalışıyor; bitince yeniden deneyin.'); return; }
  formToPanel(); pjSave();
  let base; try { base = buildParam(); } catch (e) { msg('Parametre hatası: ' + e.message, 'err'); return; }
  PJ.alt = pjAltOner(base); PJ.revNo = 0;
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
  pjAltCiz();
  if (PJ.again) { PJ.again = false; const p = PJ.onay; PJ.onay = null; pjRun(p || undefined); return; }
  pjAltSirada();
}
function pjAltOnayla(a) {
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
  const mw = num(/(\d+(?:\.\d+)?)\s*mw/); if (mw !== null) { set.push(() => { gv('p-mwp').value = mw; }); yap.push('hedef ' + mw + ' MWp'); }
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
      const b2 = h('button', 'mini', 'Kablo planı'); b2.onclick = () => { const f = Object.keys(a.files).find((n) => /_04_/.test(n)); pjOpenPafta(f, false, a.files); PJ.aktif = a; pjDuzenBilgi(); gv('pjdlg').close(); };
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
