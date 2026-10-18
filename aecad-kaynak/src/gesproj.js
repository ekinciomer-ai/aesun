// ---- GES project: AeCAD -> GES-ÇİZ (Pyodide worker) -> paftalar, kontrol, keşif, teklif ----
const PJ = { worker: null, seq: 0, busy: false, again: false, res: null, files: null, srcDoc: null, dm: null, cur: null };
const PKEY = 'aecad.proje.v1', FKEY = 'aecad.fiyat.v1';
const PJ_IDS = ['p-masa', 'p-mwp', 'p-ratio', 'p-trafo', 'p-inv', 'p-kod', 'p-ad', 'p-yat', 'p-yer', 'p-mue', 'p-rev', 'p-sev', 'p-tip', 'p-voc', 'p-vmp', 'p-isc', 'p-imp', 'p-kvoc', 'p-tmin', 'p-invm', 'p-mppt', 'p-mppta', 'p-strm', 'p-strinv', 'p-invtr', 'p-trg', 'p-sebeke', 'p-ogkv', 'p-dck', 'p-ack', 'p-ackes', 'p-ogk', 'p-cekme', 'p-taraf', 'p-dcmax', 'p-acik', 'p-aks', 'p-aksa', 'p-pdf2', 'p-icyol', 'p-icw', 'p-icar', 'p-cyol', 'p-cpar', 'p-cdig'];

function pjSave() { try { const o = {}; for (const id of PJ_IDS) { const el = gv(id); if (el) o[id] = el.type === 'checkbox' ? el.checked : el.value; } o.dm = PJ.dm; o.duzen = PJ.duzen; localStorage.setItem(PKEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
function pjLoad() { try { const o = JSON.parse(localStorage.getItem(PKEY) || 'null'); if (!o) return; for (const id of PJ_IDS) { const el = gv(id); if (el && o[id] !== undefined) { if (el.type === 'checkbox') el.checked = o[id]; else el.value = o[id]; } } PJ.dm = o.dm || null; if (o.duzen) PJ.duzen = o.duzen; } catch (e) { /* ignore */ } }
const pv = (id) => { const el = gv(id); if (!el) return null; const s = String(el.value).trim(); return s === '' ? null : s; };
const pn = (id) => { const s = pv(id); if (s === null) return null; const v = parseFloat(s.replace(',', '.')); return isFinite(v) ? v : null; };

function mainTpl() {
  const i = parseInt((gv('p-masa') || {}).value); if (G.tpl[i]) return G.tpl[i];
  return G.tpl.find((t) => t.rows === 2 && t.per === 13 && t.orient === 'V') || G.tpl[0] || tplFromForm();
}
function pjMasaList() {
  const sel = gv('p-masa'); if (!sel) return; const cur = sel.value; sel.innerHTML = '';
  G.tpl.forEach((t, i) => { const o = document.createElement('option'); o.value = i; o.textContent = t.rows + t.orient + t.per + ' · ' + t.tilt + '° · ' + t.rows * t.per + ' panel' + (t.orient === 'V' && t.rows === 2 && t.per === 13 && t.tilt === 25 ? ' (TİP-1)' : ''); sel.appendChild(o); });
  const def = G.tpl.findIndex((t) => t.rows === 2 && t.per === 13 && t.orient === 'V');
  sel.value = cur !== '' && G.tpl[cur] ? cur : String(def >= 0 ? def : 0);
}
// derived (simple mode) values; detay fields override when filled
function pjAuto() {
  const P = G.panel, tp = mainTpl(), d = tplDims(tp);
  const masaMod = tp.rows * tp.per;
  const vocC = P.voc ? (pn('p-voc') ?? P.voc) * (1 + (pn('p-kvoc') ?? P.kvoc ?? -0.30) / 100 * ((pn('p-tmin') ?? -25) - 25)) : null;   // Voc at Tmin
  const fits = (n) => !vocC || n * vocC <= 1500 * 0.98;                                          // ≥ %2 marj (esas D)
  const strMod = pn('p-strm') || (fits(masaMod) ? masaMod : fits(tp.per) ? tp.per : Math.floor(1500 * 0.98 / vocC));
  const strKwp = strMod * P.p / 1000;
  const invKw = pn('p-inv') || 300, ratio = pn('p-ratio') || 1.25, kva = pn('p-trafo') || 5750;
  const strInv = pn('p-strinv') || Math.max(1, Math.floor(ratio * invKw / strKwp));
  const invTr = pn('p-invtr') || Math.max(1, Math.floor(kva * 0.9 / invKw));   // trafo marjı ≥ %10
  const span = Math.max(0, d.len + 0.16 - 2 * LEG_IN); const nsp = Math.max(1, Math.ceil(span / LEG_MAX - 1e-9));
  const aks = pn('p-aks') || nsp + 1, aksA = pn('p-aksa') || +(span / nsp).toFixed(3);
  const mwp = pn('p-mwp'); const masaKwp = masaMod * P.p / 1000;
  return { tp, d, masaMod, strMod, strKwp, invKw, ratio, kva, strInv, invTr, aks, aksA, maxMasa: mwp ? Math.ceil(mwp * 1000 / masaKwp) : null, masaKwp };
}
function pjAutoHints() {
  if (!gv('p-strm')) return; const a = pjAuto();
  const set = (id, v) => { const el = gv(id); if (el) el.placeholder = 'oto: ' + v; };
  set('p-strm', a.strMod); set('p-strinv', a.strInv); set('p-invtr', a.invTr); set('p-aks', a.aks); set('p-aksa', a.aksA);
  const P = G.panel; set('p-voc', P.voc || '—'); set('p-vmp', P.vmp || '—'); set('p-isc', P.isc || '—'); set('p-imp', P.imp || '—'); set('p-kvoc', P.kvoc || '—');
  const spm = Math.round(a.masaMod / a.strMod);
  gv('p-auto').textContent = (spm > 1 ? '⚠ Seçili masada ' + spm + ' string var; GES-ÇİZ TİP-1 (1 masa = 1 string, 2V13) için kurgulanmıştır, inverter ve trafo sayısı şişebilir. · ' : '') + 'String ' + a.strMod + ' modül (' + fmtNum(a.strKwp, 2) + ' kWp) · inverter başına ≤ ' + a.strInv + ' string → DC/AC ≈ ' + fmtNum(a.strInv * a.strKwp / a.invKw, 2) + ' · trafo başına ≤ ' + a.invTr + ' inverter (' + fmtNum(a.invTr * a.invKw / a.kva * 100, 0) + ' % yük) · ' + (a.maxMasa ? 'hedef ' + a.maxMasa + ' masa' : 'arazinin tamamı') + ' · ayak ' + a.aks + ' aks × ' + fmtNum(a.aksA, 2) + ' m';
}
function buildParam() { return pjDuzenUygula(buildParam0()); }
function buildParam0() {
  const a = pjAuto(), P = G.panel, tp = a.tp;
  // sıra aralığı proje masasından (gölge hesabı); elle girildiyse o değer
  let pitch; if (gv('g-hrs').value === 'manual') pitch = gnum('g-pitch', 0); else { const r = rowPitch(tp, gnum('g-lat', 39), parseFloat(gv('g-hrs').value), gnum('g-ang', 0)); pitch = isFinite(r.pitch) ? r.pitch : null; }
  if (!pitch) pitch = parseFloat(gv('g-pitch').value) || 8.7;
  const fromKml = G.boundSrc === 'kml';
  const pc = { kolon: 2 * a.aks, kiris: a.aks, asik: 12, ruzgarlik: 12, payanda: a.aks, capraz: 12, orta_klemp: 2 * (tp.per - 1) * tp.rows, kenar_klemp: 4 * tp.rows, m12_civata: 140 };
  const statikVar = pn('p-aks') !== null;
  return {
    proje: { kod: pv('p-kod') || 'AECAD', isin_adi: pv('p-ad') || 'GES Projesi', proje_sahibi: pv('p-yat') || '', yatirimci: pv('p-yat') || '', il_ilce_ada_parsel: pv('p-yer') || '', cizen: 'AeCAD · GES-ÇİZ', revizyon: pv('p-rev') || 'R00', seviye: pv('p-sev') || 'teklif', enlem: gnum('g-lat', 39), tesis_tipi: pv('p-tip') || 'lisanssiz', muellif: pv('p-mue') || '', muellif_unvan: 'Elektrik Mühendisi' },
    parsel: { koordinat: (G.parcels && G.parcels.length > 1) ? G.parcels.map((q) => q.pts.map((p) => [+p[0].toFixed(3), +p[1].toFixed(3)])) : G.bound.map((p) => [+p[0].toFixed(3), +p[1].toFixed(3)]), koordinat_sistemi: G.boundCrs || (fromKml ? 'WGS84 / UTM ' + gnum('g-zone', 38) + 'N (KML)' : 'Çizim koordinatı (AeCAD)'), cekme_mesafesi_m: pn('p-cekme') ?? 5, cepheler: cepheParam(), max_masa: a.maxMasa, hedef_masa: null },
    modul: { en_mm: tp.orient === 'H' ? P.L : P.W, boy_mm: tp.orient === 'H' ? P.W : P.L, guc_wp: P.p, voc_v: pn('p-voc') ?? P.voc ?? null, vmp_v: pn('p-vmp') ?? P.vmp ?? null, isc_a: pn('p-isc') ?? P.isc ?? null, imp_a: pn('p-imp') ?? P.imp ?? null, voc_sicaklik_katsayi_pct: pn('p-kvoc') ?? P.kvoc ?? null, tmin_c: pn('p-tmin') ?? -25 },
    masa: { tip: tp.rows + tp.orient + tp.per, sira_sayisi: tp.rows, sira_modul: tp.per, modul_boslugu_mm: Math.round(tp.gx * 1000), egim_derece: tp.tilt, alt_kenar_m: tp.front, masa_arasi_m: gnum('g-gap', 0.5), pitch_m: +pitch.toFixed(3), sira_acikligi_m: pn('p-acik'), azimut_derece: gnum('g-ang', 0), aks_sayisi: a.aks, aks_araligi_m: a.aksA, parca_carpani: statikVar ? undefined : pc },
    yol: { ic_yol: (pv('p-icyol') || '1') === '1', ic_genislik_m: pn('p-icw') ?? 5, ic_aralik_m: pn('p-icar') },
    elektrik: { string_modul: a.strMod, string_inverter_max: a.strInv, inverter_tr: a.invTr, inverter_ac_kw: pn('p-inv'), dcac_hedef: pn('p-ratio') ?? 1.25, inverter_model: pv('p-invm') || '', trafo_kva: pn('p-trafo'), trafo_gerilim: pv('p-trg') || '33/0,8 kV Dy11 ONAN', sebeke_gerilim_kv: pn('p-sebeke'), og_gerilim_kv: pn('p-ogkv') ?? 33, mppt_sayisi: pn('p-mppt'), mppt_akim_a: pn('p-mppta'), dc_kablo: pv('p-dck') || 'H1Z2Z2-K 1x6', ac_kablo: pv('p-ack') || '3x300/150 NA2XY', ac_kesit_mm2: pn('p-ackes') ?? 300, og_kablo: pv('p-ogk') || '3x(1x120/16) NA2XSY 36 kV', tm_taraf: pv('p-taraf') || 'dogu', dm_konum: PJ.dm, dc_tek_yon_max_m: pn('p-dcmax') ?? 80 },
  };
}
function pjWorker() {
  if (PJ.worker) return PJ.worker;
  PJ.worker = new Worker(new URL('gesciz-worker.js?v=__BUILD__', document.baseURI).href);
  PJ.worker.onmessage = (e) => {
    const m = e.data; if (m.id !== PJ.seq) return;
    if (m.stage) { gv('p-stage').textContent = m.stage; if (!PJ.altMod) busy(m.stage); else pjAltCiz(); return; }
    if (PJ.altMod) { pjAltSonuc(m); return; }
    PJ.busy = false; busy(null); gv('p-run').disabled = false;
    if (m.err) { gv('p-stage').textContent = 'Hata: ' + m.err; msg('GES-ÇİZ hata: ' + m.err, 'err'); return; }
    const sec = ((performance.now() - PJ.t0) / 1000).toFixed(1);
    PJ.res = m.rapor; PJ.files = m.files; PJ.pdf = m.pdf; PJ.t = Date.now(); pjArsivYaz(); pjLinkler();
    const oz = m.rapor.ozet; const dc = (m.rapor.metraj.find((r) => /DC kurulu güç/.test(r.kalem)) || {}).miktar, ac = (m.rapor.metraj.find((r) => /AC kurulu güç/.test(r.kalem)) || {}).miktar;
    const bad = m.rapor.kontrol.filter((k) => k.durum === '✖').length;
    const sum = oz.masa + ' masa · ' + oz.modul.toLocaleString('tr') + ' modül · ' + oz.string + ' string · ' + oz.inverter + ' inverter · ' + oz.tm + ' trafo · DC ' + fmtNum((dc || 0) / 1000, 3) + ' MWp / AC ' + fmtNum((ac || 0) / 1000, 3) + ' MW (' + fmtNum(dc / ac, 2) + ') · ' + sec + ' sn';
    gv('p-stage').textContent = sum + (bad ? ' · ' + bad + ' kontrol ✖' : ' · tüm kontroller ✔');
    msg('GES-ÇİZ: ' + sum, 'res');
    for (const u of m.rapor.uyari) msg('⚠ ' + u, 'note');
    gv('p-open').disabled = false;
    // DC/AC target vs achieved: GES-ÇİZ forms inverter groups from geometry (A.1/A.4); suggest inverter size, never change it silently
    const hedef = PJ.param && (pn('p-ratio') || 1.25), olan = dc / ac, ni = oz.inverter;
    const sug = gv('p-sug'); sug.innerHTML = '';
    if (hedef && isFinite(olan) && Math.abs(olan - hedef) / hedef > 0.05 && ni) {
      const kw = dc / ni / hedef, std = [100, 110, 125, 150, 175, 185, 196, 200, 215, 225, 250, 300, 320, 330, 350]; const pick = std.reduce((a, b) => Math.abs(b - kw) < Math.abs(a - kw) ? b : a);
      const t = document.createElement('span'); t.textContent = 'Hedef DC/AC ' + fmtNum(hedef, 2) + ', elde edilen ' + fmtNum(olan, 2) + '. GES-ÇİZ inverter başına ortalama ' + fmtNum(oz.string / ni, 1) + ' string bağladı; hedef için inverter ≈ ' + fmtNum(kw, 0) + ' kW olmalı. ';
      const b = document.createElement('button'); b.className = 'mini'; b.textContent = 'İnverteri ' + pick + ' kW yap ve yeniden üret'; b.onclick = () => { gv('p-inv').value = pick; pjAutoHints(); pjSave(); pjRun(); };
      sug.append(t, b); sug.hidden = false;
    } else sug.hidden = true;
    const first = Object.keys(m.files).find((f) => /_01_GENEL_/.test(f)); if (first) pjOpenPafta(first, true);
    pjDialog('paftalar');
    if (PJ.again) { PJ.again = false; pjRun(); }
  };
  PJ.worker.onerror = (e) => { if (PJ.altMod) { const a = PJ.alt.find((x) => x.durum === 'calisiyor'); if (a) { a.durum = 'hata'; a.hata = e.message || 'Python hatası'; } PJ.altMod = false; pjAltCiz(); } PJ.busy = false; busy(null); gv('p-run').disabled = false; const t = 'GES-ÇİZ çalışırken durdu: ' + (e.message || 'Python hatası'); gv('p-stage').textContent = t; msg(t, 'err'); try { PJ.worker.terminate(); } catch (x) { /* ignore */ } PJ.worker = null; };
  return PJ.worker;
}
function pjRun(over) {
  if (!G.bound) { msg('Önce arazi sınırını seçin (3. adım).', 'err'); return; }
  formToPanel(); pjSave();
  if (PJ.busy || PJ.altMod) { PJ.again = true; return; }
  let param; try { param = over || buildParam(); } catch (e) { msg('Parametre hatası: ' + e.message, 'err'); return; }
  PJ.busy = true; PJ.t0 = performance.now(); PJ.seq++; gv('p-run').disabled = true;
  PJ.param = param;
  pjWorker().postMessage({ id: PJ.seq, base: new URL('./', document.baseURI).href, json: JSON.stringify(param), pdf: gv('p-pdf2').checked });
}
function pjOpenPafta(name, auto, dosyalar) {
  const f = (dosyalar || PJ.files || {})[name]; if (!f) return;
  if (!PJ.srcDoc) PJ.srcDoc = S.doc;
  const norm = parseDxf(decodeDxfBytes(f)); const doc = importNormalized(norm);
  const keep = G.bound; setDoc(doc, name.replace(/\.dxf$/i, '')); G.bound = keep; PJ.cur = name; gv('p-back').hidden = false;
  if (!auto) msg('Pafta açıldı: ' + name, 'res');
  document.querySelectorAll('.pf-row').forEach((r) => r.classList.toggle('on', r.dataset.f === name));
}
function pjBack() { if (!PJ.srcDoc) return; const d = PJ.srcDoc; PJ.srcDoc = null; PJ.cur = null; setDoc(d, d.name); gv('p-back').hidden = true; msg('Kaynak çizime dönüldü.'); }

// ---------- price list (reference: Gömce 3. tur ortalaması, USD, KDV hariç, 2026 — ges-proje-cizim §9) ----------
const FIYAT0 = {
  isc_panel: { ad: 'İşçilik (mekanik + elektrik montaj)', birim: '$/panel', v: 27.7 },
  hafriyat: { ad: 'Hafriyat (AG/OG kablo kanalı)', birim: '$/m kanal', v: 72.8 },
  dc_hendek: { ad: 'DC hendek (sıra geçişi)', birim: '$/m', v: null },
  panel_wp: { ad: 'PV modül tedariki', birim: '$/Wp', v: 0.168 },
  inverter: { ad: 'İnverter tedariki', birim: '$/adet', v: 6140 },
  salt_mva: { ad: 'AG/OG şalt (köşk + hücre + trafo + ADP)', birim: '$/MVA', v: 22708 },
  tasiyici: { ad: 'Taşıyıcı konstrüksiyon', birim: '$/masa', v: 849 },
  ac_kablo: { ad: 'AG kablo tedarik + çekim', birim: '$/m', v: 29.4 },
  dc_kablo: { ad: 'DC solar kablo tedarik', birim: '$/m', v: 1.18 },
  og_kablo: { ad: 'OG kablo (tek damar)', birim: '$/m', v: null },
  toprak: { ad: 'Topraklama şeridi', birim: '$/m', v: null },
  cit: { ad: 'Tel çit', birim: '$/m', v: null },
  cctv: { ad: 'Aydınlatma + CCTV direği', birim: '$/adet', v: null },
  genel: { ad: 'Konaklama / nakliye / diğer', birim: '%', v: 7.1 },
  kar: { ad: 'Kâr', birim: '%', v: 7.5 },
};
function fiyatlar() { let o = {}; try { o = JSON.parse(localStorage.getItem(FKEY) || '{}'); } catch (e) { /* ignore */ } const f = {}; for (const [k, d] of Object.entries(FIYAT0)) f[k] = { ...d, v: o[k] !== undefined ? o[k] : d.v }; return f; }
function fiyatKaydet(k, v) { let o = {}; try { o = JSON.parse(localStorage.getItem(FKEY) || '{}'); } catch (e) { /* ignore */ } o[k] = v; try { localStorage.setItem(FKEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
function msum(re) { return (PJ.res.metraj || []).filter((x) => re.test(x.kalem)).reduce((s, r) => s + (typeof r.miktar === 'number' ? r.miktar : (parseFloat(r.miktar) || 0)), 0); }
function trafoMva() { return (PJ.res.metraj || []).filter((x) => /^Trafo \d+ kVA/.test(x.kalem)).reduce((s, r) => s + (parseFloat(r.kalem.match(/^Trafo (\d+)/)[1]) * (parseFloat(r.miktar) || 0)) / 1000, 0); }
function trafoAd() { return (PJ.res.metraj || []).filter((x) => /^Trafo \d+ kVA/.test(x.kalem)).map((r) => r.miktar + ' × ' + r.kalem.match(/^Trafo (\d+)/)[1]).join(' + ') + ' kVA'; }
function mq(re) { const r = (PJ.res.metraj || []).find((x) => re.test(x.kalem)); return r ? (typeof r.miktar === 'number' ? r.miktar : parseFloat(String(r.miktar).split('+').reduce((s, t) => s + (parseFloat(t) || 0), 0))) : 0; }
function teklifSatirlar(mod) {
  const f = fiyatlar(), m = PJ.res.metraj; const P = G.panel;
  const modul = mq(/^PV modül/), masa = mq(/^Masa /), inv = mq(/^İnverter$/), trafoN = mq(/^Trafo .*kVA/);
  const trafoKva = PJ.param.elektrik.trafo_kva, dcm = mq(/^DC solar kablo/), agm = msum(/^AG kablo/), ogm = mq(/^OG tek damar/);
  const kanal = mq(/^AG\/OG kanal/), dch = mq(/^DC hendek/), ser = mq(/^Galvaniz şerit/), cit = mq(/^Tel çit/), cctv = mq(/^Aydınlatma \+ CCTV/);
  const L = [];
  const add = (k, q, birim, extra) => { const p = f[k]; L.push({ k, ad: p.ad + (extra || ''), miktar: q, birim, fiyat: p.v, fbirim: p.birim, tutar: p.v === null ? null : (k === 'panel_wp' ? q * P.p * p.v : k === 'salt_mva' ? q * p.v : q * p.v) }); };
  if (mod === 'epc') {
    add('panel_wp', modul, 'adet', ' (' + P.p + ' Wp)'); add('inverter', inv, 'adet'); add('salt_mva', trafoMva(), 'MVA', ' (' + trafoAd() + ')');
    add('tasiyici', masa, 'masa'); add('ac_kablo', agm, 'm'); add('dc_kablo', dcm, 'm'); add('og_kablo', ogm, 'm');
  }
  add('isc_panel', modul, 'panel'); add('hafriyat', kanal, 'm'); add('dc_hendek', dch, 'm');
  add('toprak', ser, 'm'); add('cit', cit, 'm'); add('cctv', cctv, 'adet');
  const ara = L.reduce((s, r) => s + (r.tutar || 0), 0);
  const ek = [];
  for (const k of ['genel', 'kar']) { const p = f[k]; ek.push({ k, ad: p.ad, miktar: p.v, birim: '%', fiyat: p.v, fbirim: '%', tutar: p.v === null ? null : ara * p.v / 100 }); }
  const top = ara + ek.reduce((s, r) => s + (r.tutar || 0), 0);
  const dcW = mq(/DC kurulu güç/) * 1000;
  return { L, ek, ara, top, wp: dcW ? top / dcW : 0, eksik: L.filter((r) => r.fiyat === null).map((r) => r.ad) };
}

// ---------- dialog ----------
// ---- son üretilen proje: tarayıcıda (IndexedDB) saklanır, başlıktaki "Proje dosyaları" ve başlangıç ekranından açılır ----
function pjIdb() { return new Promise((ok, no) => { try { const r = indexedDB.open('aecad', 1); r.onupgradeneeded = () => r.result.createObjectStore('proje'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } }); }
async function pjArsivYaz() {
  try { const db = await pjIdb(); const tx = db.transaction('proje', 'readwrite'); tx.objectStore('proje').put({ t: PJ.t, rapor: PJ.res, files: PJ.files, pdf: PJ.pdf, param: PJ.param }, 'son'); }
  catch (e) { console.warn('arşiv', e); }
}
async function pjArsivOku() {
  try { const db = await pjIdb(); const o = await new Promise((ok, no) => { const r = db.transaction('proje').objectStore('proje').get('son'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    if (o && o.files && !PJ.res) { PJ.res = o.rapor; PJ.files = o.files; PJ.pdf = o.pdf; PJ.param = o.param; PJ.t = o.t; gv('p-open').disabled = false; pjLinkler(); } }
  catch (e) { console.warn('arşiv', e); }
}
function pjLinkler() {
  if (!PJ.files) return; const ad = (PJ.param && PJ.param.proje && PJ.param.proje.isin_adi) || 'GES Projesi';
  const zm = new Date(PJ.t || Date.now()).toLocaleString('tr', { dateStyle: 'short', timeStyle: 'short' }); const n = Object.keys(PJ.files).length;
  const b = gv('bfiles'); b.hidden = false; b.title = ad + ' · ' + zm + ' · ' + n + ' dosya';
  const s = gv('st-son'); s.hidden = false; gv('st-son-t').textContent = ad + ' · ' + zm + ' · ' + n + ' dosya' + (Object.keys(PJ.files).some((f) => /\.pdf$/i.test(f)) ? ' (PDF dahil)' : '');
}
function pjDialog(tab) {
  if (tab === 'yerlesim') { const d = gv('pjdlg'); if (!d.open) d.showModal(); d.querySelectorAll('.ptab').forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); PJ.tab = tab; pjAltCiz(); return; }
  if (!PJ.res) { msg('Önce projeyi üretin.'); return; }
  const d = gv('pjdlg'); if (!d.open) d.showModal();
  d.querySelectorAll('.ptab').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  const box = gv('pj-body'); box.innerHTML = ''; PJ.tab = tab;
  const R = PJ.res, h = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
  if (tab === 'paftalar') {
    const list = h('div', 'pf-list');
    for (const name of Object.keys(PJ.files).sort()) {
      const r = h('div', 'pf-row'); r.dataset.f = name; if (name === PJ.cur) r.classList.add('on');
      const nm = h('span'); nm.textContent = name;
      const sz = h('small'); sz.textContent = (PJ.files[name].length / 1024).toFixed(0) + ' kB';
      const acts = h('span', 'pf-acts');
      if (/\.dxf$/i.test(name)) { const b = h('button', 'mini'); b.textContent = 'AeCAD\'de aç'; b.onclick = () => { pjOpenPafta(name); d.close(); }; acts.appendChild(b); }
      const dl = h('button', 'mini'); dl.textContent = 'İndir'; dl.onclick = () => pjSaveFile(name, PJ.files[name]); acts.appendChild(dl);
      r.append(nm, sz, acts); list.appendChild(r);
    }
    box.appendChild(list);
    const all = h('button', 'gb primary'); all.textContent = 'Tüm proje dosyaları (ZIP)'; all.onclick = () => pjSaveZip(); box.appendChild(all);
    const pdfs = Object.keys(PJ.files).filter((n) => /\.pdf$/i.test(n));
    for (const n of pdfs) { const b = h('button', 'gb primary'); b.textContent = 'PDF pafta seti indir (' + (PJ.files[n].length / 1048576).toFixed(1) + ' MB)'; b.onclick = () => pjSaveFile(n, PJ.files[n]); box.insertBefore(b, list); }
    if (!pdfs.length) { const n = h('p', 'gi'); n.textContent = PJ.pdf === false && gv('p-pdf2').checked ? 'PDF bu ortamda üretilemedi (PDF modülü yüklenemedi); DXF ve HTML üretildi.' : 'PDF kapalı: "PDF pafta seti üret" kutusunu işaretleyip yeniden üretin.'; box.appendChild(n); }
    { const n = h('p', 'gi'); n.textContent = 'DWG için DXF\'i AutoCAD\'de açıp DWG olarak kaydedin.'; box.appendChild(n); }
  }
  if (tab === 'kontrol') {
    const t = h('table', 'kt'); t.innerHTML = '<thead><tr><th>Durum</th><th>Kontrol</th><th>Değer</th><th>Esas</th></tr></thead>';
    const tb = h('tbody');
    for (const k of R.kontrol) { const tr = h('tr', k.durum === '✖' ? 'bad' : k.durum === '✔' ? 'ok' : 'na'); for (const v of [k.durum, k.kontrol, k.deger, k.esas || '']) { const td = h('td'); td.textContent = v; tr.appendChild(td); } tb.appendChild(tr); }
    t.appendChild(tb); const w = h('div', 'tw'); w.appendChild(t); box.appendChild(w);
    if (R.uyari.length) { const u = h('ul', 'uy'); for (const x of R.uyari) { const li = h('li'); li.textContent = x; u.appendChild(li); } const hh = h('h4'); hh.textContent = 'Uyarılar ve açık konular'; box.append(hh, u); }
  }
  if (tab === 'kesif') {
    const t = h('table', 'kt'); t.innerHTML = '<thead><tr><th>Grup</th><th>Kalem</th><th class="n">Miktar</th><th>Birim</th><th>Pafta</th><th>Hakediş kalemi</th></tr></thead>';
    const tb = h('tbody');
    for (const r of R.metraj) { const tr = h('tr'); [r.grup, r.kalem, typeof r.miktar === 'number' ? r.miktar.toLocaleString('tr', { maximumFractionDigits: 2 }) : r.miktar, r.birim, r.kaynak, r.hakedis || ''].forEach((v, i) => { const td = h('td', i === 2 ? 'n' : ''); td.textContent = v; tr.appendChild(td); }); tb.appendChild(tr); }
    t.appendChild(tb); const w = h('div', 'tw'); w.appendChild(t); box.appendChild(w);
    const b = h('button', 'gb'); b.textContent = 'Keşif cetveli (CSV, Excel)'; b.onclick = () => { const rows = [['Grup', 'Kalem', 'Miktar', 'Birim', 'Pafta', 'Hakediş kalemi'], ...R.metraj.map((r) => [r.grup, r.kalem, r.miktar, r.birim, r.kaynak, r.hakedis || ''])]; pjSaveFile((PJ.param.proje.kod) + '_KESIF.csv', csvBytes(rows)); }; box.appendChild(b);
  }
  if (tab === 'teklif') {
    const mode = PJ.tmode || 'iscilik';
    const sw = h('div', 'brow'); for (const [k, l] of [['iscilik', 'İşçilik teklifi'], ['epc', 'Anahtar teslim (EPC)']]) { const b = h('button', 'gb' + (mode === k ? ' primary' : '')); b.textContent = l; b.onclick = () => { PJ.tmode = k; pjDialog('teklif'); }; sw.appendChild(b); } box.appendChild(sw);
    const T = teklifSatirlar(mode);
    const t = h('table', 'kt'); t.innerHTML = '<thead><tr><th>Kalem</th><th class="n">Miktar</th><th>Birim</th><th class="n">Birim fiyat</th><th class="n">Tutar (USD)</th></tr></thead>';
    const tb = h('tbody'); const usd = (v) => v === null ? '—' : v.toLocaleString('tr', { maximumFractionDigits: 0 });
    const row = (r, pct) => { const tr = h('tr'); const a = h('td'); a.textContent = r.ad; const q = h('td', 'n'); q.textContent = pct ? '' : r.miktar.toLocaleString('tr', { maximumFractionDigits: 2 }); const u = h('td'); u.textContent = pct ? '' : r.birim;
      const pf = h('td', 'n'); const inp = h('input'); inp.type = 'number'; inp.step = 'any'; inp.className = 'pin'; inp.id = 'f-' + r.k; inp.value = r.fiyat === null ? '' : r.fiyat; inp.placeholder = 'girin'; inp.onchange = () => { fiyatKaydet(r.k, inp.value === '' ? null : parseFloat(inp.value)); pjDialog('teklif'); }; const fb = h('small'); fb.textContent = ' ' + r.fbirim; pf.append(inp, fb);
      const tt = h('td', 'n'); tt.textContent = usd(r.tutar); tr.append(a, q, u, pf, tt); tb.appendChild(tr); };
    for (const r of T.L) row(r); const sub = h('tr', 'sub'); sub.innerHTML = '<td colspan="4">Ara toplam</td><td class="n"></td>'; sub.lastChild.textContent = usd(T.ara); tb.appendChild(sub);
    for (const r of T.ek) row(r, true); const tot = h('tr', 'tot'); tot.innerHTML = '<td colspan="4">GENEL TOPLAM (KDV hariç)</td><td class="n"></td>'; tot.lastChild.textContent = usd(T.top) + ' $'; tb.appendChild(tot);
    t.appendChild(tb); const w = h('div', 'tw'); w.appendChild(t); box.appendChild(w);
    const n = h('p', 'gi'); n.textContent = 'Birim fiyatlar: Gömce GES 3. tur teklif ortalaması (USD, KDV hariç, 2026) referansıdır; düzenleyebilirsiniz, bu tarayıcıda saklanır. ' + fmtNum(T.wp, 3) + ' $/Wp' + (mode === 'epc' ? ' (referans GES 0,458 $/Wp, şalt/ENH hariç)' : '') + '. Boş fiyatlı kalemler toplama girmez' + (T.eksik.length ? ': ' + T.eksik.join(', ') : '') + '.';
    box.appendChild(n);
    const br = h('div', 'brow'); const b1 = h('button', 'gb'); b1.textContent = 'Teklif (CSV, Excel)'; b1.onclick = () => { const rows = [['Kalem', 'Miktar', 'Birim', 'Birim fiyat', 'Fiyat birimi', 'Tutar USD'], ...T.L.map((r) => [r.ad, r.miktar, r.birim, r.fiyat ?? '', r.fbirim, r.tutar ?? '']), ['Ara toplam', '', '', '', '', T.ara], ...T.ek.map((r) => [r.ad, '', '', r.fiyat ?? '', '%', r.tutar ?? '']), ['GENEL TOPLAM (KDV hariç)', '', '', '', '', T.top]]; pjSaveFile(PJ.param.proje.kod + '_TEKLIF.csv', csvBytes(rows)); };
    const b2 = h('button', 'gb primary'); b2.textContent = 'Teklif belgesi (HTML)'; b2.onclick = () => pjSaveFile(PJ.param.proje.kod + '_TEKLIF.html', new TextEncoder().encode(teklifHtml(T, mode)));
    br.append(b1, b2); box.appendChild(br);
  }
}
function csvBytes(rows) { const s = '﻿' + rows.map((r) => r.map((v) => { const t = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(';')).join('\r\n'); return new TextEncoder().encode(s); }
function teklifHtml(T, mode) {
  const p = PJ.param.proje, oz = PJ.res.ozet, esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const usd = (v) => v === null ? '—' : v.toLocaleString('tr', { maximumFractionDigits: 0 });
  const dc = mq(/DC kurulu güç/), ac = mq(/AC kurulu güç/);
  const rows = T.L.map((r) => `<tr><td>${esc(r.ad)}</td><td class=n>${r.miktar.toLocaleString('tr', { maximumFractionDigits: 2 })}</td><td>${esc(r.birim)}</td><td class=n>${r.fiyat ?? '—'} ${esc(r.fbirim)}</td><td class=n>${usd(r.tutar)}</td></tr>`).join('');
  const ek = T.ek.map((r) => `<tr><td>${esc(r.ad)} (%${r.fiyat ?? '—'})</td><td></td><td></td><td></td><td class=n>${usd(r.tutar)}</td></tr>`).join('');
  const uy = PJ.res.uyari.map((u) => `<li>${esc(u)}</li>`).join('') + PJ.res.kontrol.filter((k) => k.durum !== '✔').map((k) => `<li>${esc(k.durum)} ${esc(k.kontrol)}: ${esc(k.deger)}</li>`).join('');
  return `<!doctype html><html lang="tr"><meta charset="utf-8"><title>Teklif ${esc(p.kod)}</title><style>body{font:13px/1.5 Arial,sans-serif;color:#1d2126;max-width:820px;margin:28px auto;padding:0 20px}h1{font-size:20px;margin:0}h1 b{color:#d7262e}.k{color:#666}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border-bottom:1px solid #ddd;padding:6px 5px;text-align:left}th{background:#f3f3f3}.n{text-align:right;font-variant-numeric:tabular-nums}.tot td{font-weight:700;border-top:2px solid #1d2126}.oz{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 16px;margin:12px 0}.oz div span{color:#666;display:block;font-size:11px}ul{padding-left:18px}@media print{body{margin:0}}</style>
<h1>AKSARAY <b>ENERJİ</b></h1><div class=k>Aksaray Enerji San. ve Tic. Ltd. Şti. · ${new Date().toLocaleDateString('tr-TR')}</div>
<h2>${mode === 'epc' ? 'Anahtar Teslim GES Teklifi' : 'GES Montaj İşçiliği Teklifi'} · ${esc(p.isin_adi)}</h2>
<div class=oz><div><span>Proje kodu</span>${esc(p.kod)} ${esc(p.revizyon)}</div><div><span>Yer</span>${esc(p.il_ilce_ada_parsel) || '—'}</div><div><span>Yatırımcı</span>${esc(p.yatirimci) || '—'}</div>
<div><span>DC kurulu güç</span>${(dc / 1000).toLocaleString('tr', { maximumFractionDigits: 3 })} MWp</div><div><span>AC kurulu güç</span>${(ac / 1000).toLocaleString('tr', { maximumFractionDigits: 3 })} MWe</div><div><span>DC/AC</span>${(dc / ac).toFixed(2)}</div>
<div><span>Masa / modül</span>${oz.masa} / ${oz.modul.toLocaleString('tr')}</div><div><span>İnverter / trafo</span>${oz.inverter} / ${oz.tm}</div><div><span>Panel</span>${G.panel.p} Wp · ${esc(G.panel.model)}</div></div>
<table><thead><tr><th>Kalem</th><th class=n>Miktar</th><th>Birim</th><th class=n>Birim fiyat</th><th class=n>Tutar (USD)</th></tr></thead><tbody>${rows}<tr><td colspan=4>Ara toplam</td><td class=n>${usd(T.ara)}</td></tr>${ek}<tr class=tot><td colspan=4>GENEL TOPLAM (KDV hariç)</td><td class=n>${usd(T.top)} $</td></tr></tbody></table>
<p>Birim güç maliyeti: ${T.wp.toFixed(3)} $/Wp. Miktarlar GES-ÇİZ ${esc(PJ.res.surum)} ön metrajıdır (${esc(p.seviye)} seviyesi); kesin metraj uygulama projesiyle güncellenir. Fiyatlara KDV dahil değildir.</p>
${uy ? `<h3>Açık konular</h3><ul>${uy}</ul>` : ''}</html>`;
}
async function pjSaveFile(name, bytes) {
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  const okExt = /\.(csv|html|pdf|json|txt|zip)$/i.test(name);
  if (dl) {
    try { if (okExt) await dl.save({ filename: name, data: new Blob([bytes]) }); else await dl.save({ filename: name + '.zip', data: zipMulti([[name, bytes]]) }); msg(name + ' kaydedildi.', 'res'); }
    catch (e) { msg(e && e.code === 'declined' ? 'Kaydetme iptal edildi.' : 'Kaydedilemedi: ' + (e && (e.message || e.code)), e && e.code === 'declined' ? '' : 'err'); }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes])); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
function pjSaveZip() { const files = Object.entries(PJ.files); files.push([PJ.param.proje.kod + '_parametre.json', new TextEncoder().encode(JSON.stringify(PJ.param, null, 1))]); pjSaveFile(PJ.param.proje.kod + '_' + (PJ.param.proje.revizyon || 'R00') + '.zip', zipMulti(files)); }
function zipMulti(files) {
  const parts = [], cen = []; let off = 0;
  for (const [name, data] of files) {
    const nm = new TextEncoder().encode(name), crc = crc32(data), n = data.length;
    const lh = new Uint8Array(30 + nm.length), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true); dv.setUint32(14, crc, true); dv.setUint32(18, n, true); dv.setUint32(22, n, true); dv.setUint16(26, nm.length, true); lh.set(nm, 30);
    const ch = new Uint8Array(46 + nm.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint32(16, crc, true); cv.setUint32(20, n, true); cv.setUint32(24, n, true); cv.setUint16(28, nm.length, true); cv.setUint32(42, off, true); ch.set(nm, 46);
    parts.push(lh, data); cen.push(ch); off += lh.length + n;
  }
  const csz = cen.reduce((s, c) => s + c.length, 0); const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, csz, true); ev.setUint32(16, off, true);
  return new Blob([...parts, ...cen, end], { type: 'application/zip' });
}
CMD.GDM = async () => { const p = await getPoint('DM (dağıtım merkezi / ENH bağlantı) konumunu gösterin:'); if (!Array.isArray(p)) return; PJ.dm = [+p[0].toFixed(3), +p[1].toFixed(3)]; gv('p-dmtxt').textContent = 'DM: ' + PJ.dm.join(', '); pjSave(); msg('DM konumu: ' + PJ.dm.join(', '), 'res'); if (PJ.res) pjRun(); };
Object.assign(ALIAS, { GDM: 'GDM', PROJE: 'GPROJ', GPROJ: 'GPROJ' }); Object.assign(LABEL, { GDM: 'DM KONUMU', GPROJ: 'GES PROJE' });
CMD.GPROJ = async () => pjRun();
function pjInit() {
  fetch(new URL('py/pyodide-lock.json', document.baseURI).href, { method: 'HEAD', cache: 'no-store' }).then((r) => { if (!r.ok) throw 0; }).catch(() => {
    gv('p-run').disabled = true; gv('p-stage').textContent = 'Proje üretimi (GES-ÇİZ) bu sayfada çalışmaz: portal.aksarayenerji.net/aecad adresinde ve yerel AeCAD paketinde çalışır.'; gv('p-stage').classList.add('sug'); });
  pjMasaList(); pjLoad(); pjMasaList(); pjAutoHints(); if (PJ.dm) gv('p-dmtxt').textContent = 'DM: ' + PJ.dm.join(', ');
  gv('p-run').onclick = pjYerlesim; gv('p-open').onclick = () => pjDialog('paftalar'); gv('p-back').onclick = pjBack; gv('p-dm').onclick = () => runCommand('GDM');
  let t = null;
  for (const id of PJ_IDS) { const el = gv(id); if (!el) continue; el.addEventListener('change', () => { pjAutoHints(); pjSave(); if (PJ.res && id !== 'p-pdf2' && gv('tarif').hidden) { clearTimeout(t); t = setTimeout(() => { gv('p-stage').textContent = 'Bilgiler değişti — "Yerleşimi çiz ve seçenekleri karşılaştır" ile yeniden hesaplayın.'; }, 300); } }); }
  document.querySelectorAll('.ptab').forEach((b) => b.onclick = () => pjDialog(b.dataset.t));
  gv('pj-close').onclick = () => gv('pjdlg').close();
}
