// ---- Başlangıç ekranı + Proje tarif sayfası ----
// Tarif sayfası kendi verisini tutmaz: her alan AeCAD'deki GES/Proje alanına (data-to) bağlıdır, tek veri kaynağı odur.
const TF = {
  sec: [
    { n: '1', h: 'Proje bilgileri', d: 'Tüm paftaların antedine (onaylı form: işin adı, pafta, proje sorumlusu firma, proje sahibi ve adresi, il/ilçe/mahalle/ada/parsel, güçler, çizen ve proje sorumlusu) ve proje kapağına yazılır.', f: ['p-ad', 'p-kod', 'p-rev', 'p-tarih', 'p-yat', 'p-yadr', 'p-il', 'p-ilce', 'p-mah', 'p-ada', 'p-parsel', 'p-firma', 'p-fadr', 'p-ftel', 'p-fmail', 'p-mue', 'p-mueu', 'p-oda', 'p-smm', 'p-cizen', 'p-cizu', 'p-sev', 'p-tip'] },
    { n: '2', h: 'Arazi', d: 'Bir ya da birden çok parsel ekleyin (KML/KMZ ya da köşe koordinatı). Bitişik parseller tek saha olarak birleştirilir; çitten çekme yalnız birleşik dış sınırda uygulanır, parseller arası ortak kenarda çekme yoktur. Önizlemede bir kenara tıklayarak cephesini seçin (genel → yol → komşu parsel → diğer); her tip kendi çekme mesafesini alır.', arazi: true, f: ['g-lat', 'p-cekme', 'p-cyol', 'p-cpar', 'p-cdig'] },
    { n: '3', h: 'Güç ve trafo', d: 'Boş bırakılan hedef güçte arazinin tamamı doldurulur. İnverter datasheet PDF\'i 4. bölümdeki Datasheet düğmesiyle yüklenir; AC güç, model, MPPT sayısı ve akımı buraya yazılır.', f: ['p-mwp', 'p-ratio', 'p-trafo', 'p-inv', 'p-invn', 'p-invm', 'p-invsin'] },
    { n: '4', h: 'Panel', d: 'Datasheet PDF yüklerseniz ölçü ve elektrik değerleri okunur. Boş alan datasheet değerini (gri) kullanır.', ds: true, f: ['g-model', 'g-p', 'g-L', 'g-W', 'p-voc', 'p-vmp', 'p-isc', 'p-imp', 'p-kvoc', 'p-tmin'] },
    { n: '5', h: 'Masa ve statik', d: 'Masa tipini seçin ya da sıra, sıra başına panel ve eğim açısını değiştirin. Statik proje verisi yoksa ayaklar panel kenarından 40 cm içeride, aks aralığı en fazla 2,40 m alınır.', masa: true, f: ['p-masa', 'g-ang', 'g-gap', 'g-align', 'g-valign', 'g-hrs', 'g-pitch', 'p-acik', 'p-icyol', 'p-icw', 'p-icar', 'p-aks', 'p-aksa', 'g-mrenk'] },
    { n: '6', h: 'Elektrik detayı', d: 'İsteğe bağlı. Boş alanlar esaslardaki varsayılanlarla hesaplanır (gri değerler).', det: true, f: ['p-mppt', 'p-mppta', 'p-strm', 'p-strinv', 'p-invtr', 'p-sebeke', 'p-ogkv', 'p-trg', 'p-dck', 'p-ack', 'p-ackes', 'p-ogk', 'p-dcmax', 'p-taraf'] },
    { n: '7', h: 'Çıktı', d: 'Paftalar DXF, etkileşimli HTML, metraj ve kontrol olarak üretilir.', f: ['p-pdf2'] },
  ],
};
function tfLabel(el) { const l = el.closest('label'); if (!l) return el.id; for (const n of l.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim(); return el.id; }
function tfBuild() {
  const body = gv('tf-body'); body.innerHTML = '';
  for (const s of TF.sec) {
    const sec = document.createElement(s.det ? 'details' : 'section'); sec.className = 'tf-sec';
    const hd = document.createElement(s.det ? 'summary' : 'div'); hd.className = 'tf-h'; hd.innerHTML = '<span class="tf-n"></span><div><h2></h2><p></p></div>';
    hd.querySelector('.tf-n').textContent = s.n; hd.querySelector('h2').textContent = s.h; hd.querySelector('p').textContent = s.d; sec.appendChild(hd);
    if (s.arazi) {
      const box = document.createElement('div'); box.className = 'tf-arazi';
      box.innerHTML = '<div class="tf-row"><button class="gb" id="tf-kml" type="button">KML / KMZ ekle (birden çok seçilebilir)</button><button class="gb" id="tf-pclr" type="button" hidden>Parselleri temizle</button><span class="gi" id="tf-binfo"></span></div>' +
        '<ul class="tf-plist" id="tf-plist"></ul>' +
        '<label class="gf tf-wide">Köşe koordinatları — her satıra bir köşe: Y (sağa) X (yukarı). Birden çok parsel için parseller arasına boş satır bırakın.<textarea id="tf-koor" rows="5" spellcheck="false" placeholder="512345.12  4234567.89&#10;512645.40  4234560.10&#10;…&#10;&#10;(2. parsel)&#10;512645.40  4234560.10&#10;…"></textarea></label>' +
        '<div class="tf-row"><label class="gf">Koordinat sistemi<select id="tf-crs"><option>ITRF96 / TM 3° DOM 27</option><option>ITRF96 / TM 3° DOM 30</option><option selected>ITRF96 / TM 3° DOM 33</option><option>ITRF96 / TM 3° DOM 36</option><option>ITRF96 / TM 3° DOM 39</option><option>ITRF96 / TM 3° DOM 42</option><option>ITRF96 / TM 3° DOM 45</option><option>WGS84 / UTM 35N</option><option>WGS84 / UTM 36N</option><option>WGS84 / UTM 37N</option><option>WGS84 / UTM 38N</option><option>ED50 / UTM 6°</option></select></label><button class="gb" id="tf-koorok" type="button">Koordinatları parsel olarak ekle</button></div>' +
        '<figure class="tf-prev" id="tf-prev"><svg id="tf-svg" role="img" aria-label="Arazi önizlemesi"></svg><figcaption id="tf-pcap"></figcaption></figure>';
      sec.appendChild(box);
    }
    if (s.ds) { const r = document.createElement('div'); r.className = 'tf-row'; r.innerHTML = '<button class="gb" id="tf-ds" type="button">Datasheet yükle (panel / inverter PDF)</button><label class="gf" id="tf-pcl-w" hidden>Güç sınıfı (Wp)<select id="tf-pcl"></select></label><span class="gi" id="tf-pinfo"></span>'; sec.appendChild(r); }
    if (s.masa) {
      const r = document.createElement('div'); r.className = 'tf-grid';
      r.innerHTML = '<label class="gf">Hazır tip<select id="tf-mpre"><option value="">— seçin —</option><option value="V,2,13">2V13 · 26 panel (TİP-1)</option><option value="V,2,14">2V14 · 28 panel</option><option value="V,2,12">2V12 · 24 panel</option><option value="V,2,26">2V26 · 52 panel</option><option value="V,2,28">2V28 · 56 panel</option><option value="V,1,26">1V26 · 26 panel</option><option value="V,1,28">1V28 · 28 panel</option><option value="V,3,13">3V13 · 39 panel</option><option value="H,4,13">4H13 · 52 panel</option><option value="H,3,20">3H20 · 60 panel</option></select></label>' +
        '<label class="gf">Panel yönü<select id="tf-mor"><option value="V">Dikey (V)</option><option value="H">Yatay (H)</option></select></label>' +
        '<label class="gf">Sıra sayısı<input id="tf-mrows" type="number" min="1" max="6" step="1"></label>' +
        '<label class="gf">Sıra başına panel<input id="tf-mper" type="number" min="1" max="60" step="1"></label>' +
        '<label class="gf">Eğim açısı (°)<input id="tf-mtilt" type="number" min="0" max="60" step="1"></label>' +
        '<label class="gf">Alt kenar (m)<input id="tf-mfront" type="number" min="0" step="0.05"></label>' +
        '<p class="gi tf-wide" id="tf-minfo"></p>';
      sec.appendChild(r);
    }
    const grid = document.createElement('div'); grid.className = 'tf-grid';
    for (const id of s.f) {
      const t = gv(id); if (!t) continue;
      const lab = document.createElement('label'); lab.className = 'gf' + (t.type === 'checkbox' ? ' ck' : '');
      let el;
      if (t.tagName === 'SELECT') { el = document.createElement('select'); }
      else { el = document.createElement('input'); el.type = t.type; if (t.step) el.step = t.step; el.inputMode = t.type === 'number' ? 'decimal' : ''; }
      el.dataset.to = id; el.id = 'tf-' + id;
      if (t.type === 'checkbox') { lab.append(el, document.createTextNode(' ' + (tfLabel(t) === id ? 'PDF pafta seti üret' : tfLabel(t)))); }
      else lab.append(document.createTextNode(tfLabel(t)), el);
      el.addEventListener('change', () => { if (t.type === 'checkbox') t.checked = el.checked; else t.value = el.value; t.dispatchEvent(new Event('change')); tfSync(); });
      grid.appendChild(lab);
    }
    sec.appendChild(grid); body.appendChild(sec);
  }
  gv('tf-kml').onclick = () => gv('g-kml').click();
  gv('tf-pclr').onclick = () => { G.parcels = []; parselBirlestir(); gesSave(); tfSync(); };
  gv('tf-ds').onclick = () => gv('g-ds').click();
  gv('tf-koorok').onclick = tfKoor;
  for (const id of ['tf-mor', 'tf-mrows', 'tf-mper', 'tf-mtilt', 'tf-mfront']) gv(id).addEventListener('change', tfMasaSet);
  gv('tf-mpre').onchange = () => { const v = gv('tf-mpre').value; if (!v) return; const [o, r, n] = v.split(','); gv('tf-mor').value = o; gv('tf-mrows').value = r; gv('tf-mper').value = n; tfMasaSet(); };
  gv('tf-pcl').onchange = () => { panelSinif(G.panel, +gv('tf-pcl').value); panelToForm(); tplUpdate(); renderTpl(); gesSave(); tfSync(); };
  let pt = null; gv('tf-koor').addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(tfPreview, 250); });
}
function tfSync() {
  if (typeof pjAutoHints === 'function') pjAutoHints();
  for (const el of document.querySelectorAll('#tf-body [data-to]')) {
    const t = gv(el.dataset.to); if (!t) continue;
    if (t.tagName === 'SELECT') { if (el.options.length !== t.options.length || [...el.options].some((o, i) => o.textContent !== t.options[i].textContent)) el.innerHTML = t.innerHTML; el.value = t.value; }
    else if (t.type === 'checkbox') el.checked = t.checked;
    else { if (document.activeElement !== el) el.value = t.value; el.placeholder = t.placeholder || ''; }
    el.disabled = !!t.disabled;
  }
  const bi = gv('tf-binfo'); if (bi) bi.textContent = G.bound ? gv('g-binfo').textContent + (G.boundCrs ? ' · ' + G.boundCrs : G.boundSrc === 'kml' ? ' · KML (WGS84/UTM ' + gv('g-zone').value + 'N)' : '') : 'Sınır yok.';
  const pi = gv('tf-pinfo'); if (pi) { const P = G.panel; pi.textContent = (P.model || '') + ' · ' + P.p + ' Wp · ' + P.L + '×' + P.W + ' mm' + (P.voc ? ' · Voc ' + P.voc + ' V' : ' · Voc/Isc yok'); }
  const P = G.panel, cw = gv('tf-pcl-w');
  if (cw) { const pw = P.powers && P.powers.length > 1 ? P.powers : null; cw.hidden = !pw; if (pw) { gv('tf-pcl').innerHTML = pw.map((w) => '<option value="' + w + '">' + w + ' Wp</option>').join(''); gv('tf-pcl').value = String(P.p); } }
  tfMasaGet(); tfCheck(); tfPreview();
}
// Seçili proje masası (p-masa) şablonunu tarif alanlarından günceller
function tfMasaSet() {
  const t = mainTpl(); if (!t) return;
  t.orient = gv('tf-mor').value; t.rows = Math.max(1, Math.min(6, Math.round(+gv('tf-mrows').value || t.rows)));
  t.per = Math.max(1, Math.min(60, Math.round(+gv('tf-mper').value || t.per))); t.tilt = Math.max(0, Math.min(60, +gv('tf-mtilt').value || 0));
  const f = parseFloat(gv('tf-mfront').value); if (isFinite(f) && f >= 0) t.front = f;
  const i = G.tpl.indexOf(t); renderTpl(); if (i >= 0) gv('p-masa').value = String(i); gesSave(); pitchUpdate(); pjSave(); tfSync();
}
function tfMasaGet() {
  const t = mainTpl(); if (!t || !gv('tf-mor')) return; const d = tplDims(t);
  if (document.activeElement !== gv('tf-mrows')) gv('tf-mrows').value = t.rows; if (document.activeElement !== gv('tf-mper')) gv('tf-mper').value = t.per;
  gv('tf-mor').value = t.orient; if (document.activeElement !== gv('tf-mtilt')) gv('tf-mtilt').value = t.tilt; if (document.activeElement !== gv('tf-mfront')) gv('tf-mfront').value = t.front;
  const key = t.orient + ',' + t.rows + ',' + t.per; gv('tf-mpre').value = [...gv('tf-mpre').options].some((o) => o.value === key) ? key : '';
  const a = pjAuto(); const spm = Math.round(a.masaMod / a.strMod);
  gv('tf-minfo').textContent = t.rows + t.orient + t.per + ' = ' + d.n + ' panel · ' + fmtNum(d.kwp, 2) + ' kWp · masa ' + fmtNum(d.len, 2) + ' × ' + fmtNum(d.depth, 2) + ' m (plan) · arka yükseklik ' + fmtNum(d.back, 2) + ' m · ' + a.aks + ' aks × ' + fmtNum(a.aksA, 2) + ' m · string ' + a.strMod + ' modül' + (spm > 1 ? ' (masada ' + spm + ' string)' : '') + (t.tilt < 10 || t.tilt > 40 ? ' · ⚠ eğim olağan aralığın (10–40°) dışında' : '');
}
function tfCheck() {
  const miss = [];
  if (!G.bound) miss.push('arazi sınırı');
  if (!pv('p-ad')) miss.push('işin adı');
  if (!(pn('p-voc') ?? G.panel.voc)) miss.push('panel Voc (datasheet)');
  const ok = gv('tf-ok'); const can = !gv('p-run').disabled || PJ.busy;
  gv('tf-miss').textContent = miss.length ? 'Eksik: ' + miss.join(', ') + '. Eksik değer "VERİ YOK" olarak raporlanır; arazi sınırı zorunlu.' : (can ? 'Bilgiler tamam. Proje esaslara göre çizilecek.' : gv('p-stage').textContent);
  ok.disabled = !G.bound || !can;
}
function tfParseRing(txt) {
  const pts = [];
  for (const l of txt.split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
    const nums = (l.match(/-?\d+(?:[.,]\d+)?/g) || []).map((s) => parseFloat(s.replace(',', '.'))).filter((v) => Math.abs(v) > 1000);
    if (nums.length < 2) continue; let [a, b] = nums.slice(-2); if (a > b) [a, b] = [b, a];   // Y (sağa) < X (yukarı) Türkiye'de
    pts.push([a, b]);
  }
  if (pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) pts.pop();
  return pts;
}
// boş satırla ayrılmış bloklar = ayrı parseller
function tfParse(txt) { return txt.split(/\n\s*\n/).map(tfParseRing).filter((r) => r.length >= 3); }
function tfPList() {
  const ul = gv('tf-plist'); if (!ul) return; ul.innerHTML = ''; const P = G.parcels || [];
  gv('tf-pclr').hidden = !P.length;
  P.forEach((q, i) => {
    const li = document.createElement('li'); const out = (G.parcelOut || []).includes(q.ad);
    li.className = out ? 'out' : '';
    li.innerHTML = '<b></b><span></span><button class="mini" type="button" aria-label="Parseli kaldır">×</button>';
    li.querySelector('b').textContent = q.ad;
    li.querySelector('span').textContent = fmtNum(Math.abs(polyArea(q.pts)) / 10000, 3) + ' ha · ' + q.pts.length + ' köşe · ' + (q.src === 'kml' ? 'KML' : (q.crs || 'koordinat')) + (out ? ' · bitişik değil' : '');
    li.querySelector('button').onclick = () => { parselSil(i); gesSave(); tfSync(); };
    ul.appendChild(li);
  });
}
// Önizleme: parseller (gri, numaralı), birleşik sınır (yeşil), çekme (kırmızı kesikli), yapıştırılan taslak (sarı)
function tfPreview() {
  const svg = gv('tf-svg'), cap = gv('tf-pcap'); if (!svg) return;
  tfPList();
  const draft = gv('tf-koor').value.trim() ? tfParse(gv('tf-koor').value) : [];
  const P = G.parcels || [];
  const rings = [...P.map((q) => q.pts), ...(G.bound && !P.length ? [G.bound] : []), ...draft];
  gv('tf-prev').classList.toggle('empty', !rings.length);
  if (!rings.length) { svg.innerHTML = ''; cap.textContent = 'KML/KMZ ekleyin ya da köşe koordinatlarını yapıştırın; parseller burada görünür.'; return; }
  const all = rings.flat(); const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0 || 1, h = y1 - y0 || 1;
  const W = 640, H = 300, pad = 26, k = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const ox = (W - w * k) / 2, oy = (H - h * k) / 2;
  const X = (p) => ox + (p[0] - x0) * k, Y = (p) => H - oy - (p[1] - y0) * k;
  const Pt = (p) => X(p).toFixed(1) + ',' + Y(p).toFixed(1);
  let s = '';
  if (G.bound) s += '<polygon class="pb" points="' + G.bound.map(Pt).join(' ') + '"/>';
  if (P.length > 1) P.forEach((q) => { const out = (G.parcelOut || []).includes(q.ad); s += '<polygon class="pp' + (out ? ' out' : '') + '" points="' + q.pts.map(Pt).join(' ') + '"/>'; const c = centroidOf(q.pts); s += '<text class="pn" x="' + X(c).toFixed(1) + '" y="' + Y(c).toFixed(1) + '">' + q.ad.replace(/[<&>]/g, '') + '</text>'; });
  const sb = pn('p-cekme') ?? 5;
  const cv = G.bound && cepheVar();
  if (cv) { try { for (const r of cepheIcHalkalar((p) => p, sb) || []) s += '<polygon class="pc" points="' + r.map(Pt).join(' ') + '"/>'; } catch (e) { /* ignore */ } }
  if (G.bound) for (const k of cepheKenarlar()) { const T = k.tip ? CEPHE_TIP[k.tip] : null; s += '<line class="ce" data-i="' + k.i + '" x1="' + X(k.a).toFixed(1) + '" y1="' + Y(k.a).toFixed(1) + '" x2="' + X(k.b).toFixed(1) + '" y2="' + Y(k.b).toFixed(1) + '" style="stroke:' + (T ? T.renk : 'transparent') + '"><title>Kenar ' + (k.i + 1) + ' · ' + fmtNum(k.L, 0) + ' m · ' + (T ? T.ad : 'genel') + ' — tıklayın: cephe değiştir</title></line>'; }
  if (!cv && G.bound && sb > 0) { try { const o = offsetItem({ id: -1, t: 'pline', cl: true, pts: G.bound.map((q) => [q[0], q[1], 0]) }, sb, centroidOf(G.bound)); if (o && o.pts) s += '<polygon class="pc" points="' + o.pts.map(Pt).join(' ') + '"/>'; } catch (e) { /* ignore */ } }
  for (const r of draft) s += '<polygon class="pb draft" points="' + r.map(Pt).join(' ') + '"/>';
  const tgt = w * 0.25, e = Math.pow(10, Math.floor(Math.log10(tgt))), m = [1, 2, 5, 10].find((v) => v * e >= tgt * 0.6) * e, L = m * k;
  s += '<g class="sc" transform="translate(' + (W - pad - L) + ',' + (H - 10) + ')"><path d="M0 -4V0H' + L.toFixed(1) + 'V-4"/><text x="' + (L / 2).toFixed(1) + '" y="-7">' + (m >= 1000 ? m / 1000 + ' km' : m + ' m') + '</text></g>';
  s += '<g class="na" transform="translate(' + (W - 18) + ',22)"><path d="M0 -12 6 6 0 2 -6 6Z"/><text y="18">K</text></g>';
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = s;
  svg.querySelectorAll('line.ce').forEach((el) => { el.onclick = () => { const i = +el.dataset.i, k = cepheKenarlar()[i], sira = [null, 'yol', 'parsel', 'diger']; cepheAta(i, sira[(sira.indexOf(k.tip) + 1) % sira.length]); }; });
  const parts = [];
  if (G.bound) { const top = P.reduce((t, q) => t + Math.abs(polyArea(q.pts)), 0); parts.push((P.length > 1 ? P.length + ' parsel · parseller toplamı ' + fmtNum(top / 10000, 3) + ' ha · birleşik saha ' : 'Saha ') + fmtNum(Math.abs(polyArea(G.bound)) / 10000, 3) + ' ha · ' + fmtNum(w, 0) + ' × ' + fmtNum(h, 0) + ' m' + (cv ? ' · ' + cepheOzet(sb) + ' (kırmızı kesikli: çekme sınırı)' : sb > 0 ? ' · kırmızı kesikli: ' + fmtNum(sb, 1) + ' m çekme (yalnız dış sınır)' : '') + ' · kenara tıklayın: cephe (yol / komşu parsel / diğer)'); }
  if ((G.parcelOut || []).length) parts.push('⚠ bitişik olmayan: ' + G.parcelOut.join(', ') + ' — proje en büyük birleşik alanda yapılır');
  if (draft.length) parts.push('sarı: yapıştırılan ' + draft.length + ' parsel, henüz eklenmedi — "Koordinatları parsel olarak ekle"');
  cap.textContent = parts.join(' · ');
}
function tfKoor() {
  const rings = tfParse(gv('tf-koor').value);
  if (!rings.length) { msg('En az 3 köşe gerekli (her satırda Y ve X).', 'err'); gv('tf-miss').textContent = 'Koordinat okunamadı: her satıra "Y X" yazın, en az 3 köşe; parseller arasında boş satır.'; return; }
  const crs = gv('tf-crs').value; const n0 = (G.parcels || []).length;
  if (n0 && G.boundSrc === 'kml' && !/UTM/.test(crs)) msg('⚠ KML parselleri UTM (WGS84) koordinatında; ' + crs + ' koordinatlarıyla aynı sahada birleşmez. Aynı koordinat sistemini kullanın.', 'err');
  const n = parselEkle(rings.map((r, i) => ({ pts: r, ad: 'K' + (n0 + i + 1) })), 'koordinat', crs);
  const z = (crs.match(/UTM (\d+)/) || [])[1]; if (z) gv('g-zone').value = z;
  const cy = G.bound.reduce((s, p) => s + p[1], 0) / G.bound.length; if (!z || !gv('g-lat').value) gv('g-lat').value = utm2lat(500000, cy, 36).toFixed(3);
  gv('tf-koor').value = ''; gesSave();
  msg('Koordinatlardan ' + n + ' parsel eklendi (' + crs + '). Toplam ' + G.parcels.length + ' parsel.', 'res'); tfSync();
}
function tfFresh() { if (!S.doc || (S.doc.isSample && !S.doc.undo.length)) blankDoc('Yeni proje'); }
function startShow(on) { gv('start').hidden = !on; document.body.classList.toggle('ovl', on || !gv('tarif').hidden); }
function tarifShow(on) {
  gv('tarif').hidden = !on; document.body.classList.toggle('ovl', on || !gv('start').hidden);
  if (on) { tfFresh(); tfSync(); gv('tarif').scrollTop = 0; } else { requestAnimationFrame(() => { S.view.resize(); redraw(); }); }
}
function toCad(ges) {
  startShow(false); tarifShow(false);
  if (ges) document.querySelector('.stab[data-tab="ges"]').click();
  else hosgeldin();
}
// Çizim modülü karşılama yazısı: tıklayınca (ya da bir tuşa basınca) kapanır
function hosgeldin() {
  if (gv('hosgeldin') || hosgeldin.goster) return; hosgeldin.goster = true;
  const d = document.createElement('div'); d.id = 'hosgeldin'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Hoş geldiniz');
  d.innerHTML = '<div class="hg-in"><h2>Çizim modülüne hoş geldiniz</h2><p>DWG/DXF açmak için üstteki <b>Aç</b> düğmesini kullanın ya da dosyayı buraya sürükleyin. Komut satırına L, PL, C, M yazabilir; GES sekmesinden arazi, masa ve proje adımlarına geçebilirsiniz.</p><small>Kapatmak için tıklayın</small></div>';
  const kapat = () => { d.remove(); document.removeEventListener('keydown', kapat, true); };
  d.onclick = kapat; document.addEventListener('keydown', kapat, true);
  (document.getElementById('stage') || document.body).appendChild(d);
}
function tarifInit() {
  tfBuild();
  gv('st-tarif').onclick = () => { startShow(false); tarifShow(true); };
  gv('st-cad').onclick = () => toCad(false);
  const dosyalar = () => { startShow(false); tarifShow(false); pjDialog('paftalar'); };
  gv('st-son-b').onclick = dosyalar; gv('bfiles').onclick = dosyalar;
  pjArsivOku();
  gv('bhome').onclick = () => { tarifShow(false); startShow(true); };
  gv('tf-back').onclick = () => { tarifShow(false); startShow(true); };
  gv('tf-cad').onclick = () => { pjSave(); toCad(true); };
  gv('tf-ok').onclick = () => { if (!G.bound) return; toCad(true); setTimeout(pjYerlesim, 60); };
  // KML/datasheet yüklemeleri GES panelindeki işlevlerle yapılır; bitince tarif sayfası tazelenir
  gv('g-kml').addEventListener('yuklendi', tfSync);
  gv('g-ds').addEventListener('change', () => { let n = 0; const t = setInterval(() => { tfSync(); if (++n > 20) clearInterval(t); }, 300); });
  new MutationObserver(() => { if (!gv('tarif').hidden) tfCheck(); }).observe(gv('p-stage'), { childList: true, characterData: true, subtree: true });
  startShow(true);
}
