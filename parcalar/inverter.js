// ===== İnverter analizi =====
const INV_KAYNAK = { sungrow: 'Sungrow', inavitas: 'Inavitas', fusionsolar: 'FusionSolar' };
const INV_CACHE = {};
let invSec = { santral: 'hepsi', yil: null, donem: 'son30' }, invYukleniyor = false;
async function invYilYukle(yil) {
  if (INV_CACHE[yil]) return INV_CACHE[yil];
  const r = await Promise.all(Object.keys(INV_KAYNAK).map(k => al('inverter/' + k + '_' + yil + '.json').catch(() => null)));
  return (INV_CACHE[yil] = r.filter(Boolean));
}
function invBirlestir(dosyalar) {
  const S = {};
  for (const f of dosyalar) for (const [id, s] of Object.entries(f.santraller || {})) {
    const key = f.kaynak + ':' + id;
    const t = S[key] || (S[key] = { key, kaynak: f.kaynak, id, ad: s.ad, kwp: s.kwp, gun: {}, ay: {}, inv: {} });
    if (s.kwp) t.kwp = s.kwp;
    Object.assign(t.gun, s.gun || {}); Object.assign(t.ay, s.ay || {});
    for (const [ik, iv] of Object.entries(s.inv || {})) {
      const ti = t.inv[ik] || (t.inv[ik] = { key: ik, ad: iv.ad, kwp: iv.kwp, gun: {}, ay: {} });
      if (iv.kwp) ti.kwp = iv.kwp;
      Object.assign(ti.gun, iv.gun || {}); Object.assign(ti.ay, iv.ay || {});
    }
  }
  return S;
}
const ayGunSay = m => { const [y, a] = m.split('-').map(Number); return new Date(Date.UTC(y, a, 0)).getUTCDate(); };
// Ay toplamı: günlük veri ayın tamamını (ya da dünü) kapsıyorsa günlerden, yoksa aylık tablodan
function ayToplam(o, m) {
  const gs = Object.keys(o.gun).filter(g => g.startsWith(m));
  const dun = gunEkle(bugunTR(), -1);
  const beklenen = m === dun.slice(0, 7) ? Number(dun.slice(8)) : ayGunSay(m);
  if (gs.length >= beklenen || o.ay[m] == null) return gs.length ? gs.reduce((t, g) => t + (+o.gun[g] || 0), 0) : null;
  return +o.ay[m];
}
function invDonem(yil, donem) {
  const dun = gunEkle(bugunTR(), -1);
  if (donem === 'son30') return { tip: 'gun', gunler: Array.from({ length: 30 }, (_, i) => gunEkle(dun, i - 29)), ad: 'Son 30 gün' };
  if (donem === 'yil') { const aylar = []; for (let a = 1; a <= 12; a++) { const m = yil + '-' + String(a).padStart(2, '0'); if (m <= dun.slice(0, 7)) aylar.push(m); } return { tip: 'ay', aylar, ad: yil + ' yılı' }; }
  const n = ayGunSay(donem), gunler = [];
  for (let d = 1; d <= n; d++) { const g = donem + '-' + String(d).padStart(2, '0'); if (g <= dun) gunler.push(g); }
  return { tip: 'gun', gunler, ad: AYLAR[Number(donem.slice(5)) - 1] + ' ' + donem.slice(0, 4) };
}
const birimKaydir = (gunler, n) => gunler.map(g => (Number(g.slice(0, 4)) + n) + g.slice(4)).filter(g => !g.endsWith('02-29'));
function seriTopla(o, D_) { return D_.tip === 'gun' ? D_.gunler.map(g => o.gun[g] == null ? null : +o.gun[g]) : D_.aylar.map(m => ayToplam(o, m)); }
const toplamN = a => a.reduce((t, v) => t + (v || 0), 0);
const medyan = a => { const b = a.filter(v => v != null && !isNaN(v)).sort((x, y) => x - y); if (!b.length) return null; const k = b.length >> 1; return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2; };
const enerji = v => v == null ? '—' : Math.abs(v) >= 1e6 ? say(v / 1e6, 2) + ' GWh' : Math.abs(v) >= 1e4 ? say(v / 1e3, 1) + ' MWh' : say(v) + ' kWh';
const invSirala = (a, b) => String(a.ad).localeCompare(String(b.ad), 'tr', { numeric: true });

// İnverter bazında günlük kıyas: inverterin (kWp başına) değeri / santralin o günkü medyanı, sonra inverterin kendi normaline bölünür
function invAnaliz(S, gunler) {
  const iv = Object.values(S.inv).sort(invSirala);
  const kwpVar = iv.length && iv.every(x => x.kwp);
  const norm = x => (v => v == null ? null : kwpVar ? v / x.kwp : v);
  const gunMed = {};
  for (const g of gunler) gunMed[g] = medyan(iv.map(x => norm(x)(x.gun[g])));
  return iv.map(x => {
    const n = norm(x);
    const oran = gunler.map(g => { const v = n(x.gun[g]), m = gunMed[g]; return v == null || !m ? null : v / m; });
    const normal = medyan(oran) || 1;
    const durma = gunler.filter((g, i) => gunMed[g] > 0 && x.gun[g] != null && oran[i] != null && oran[i] < 0.05).length;
    const top = toplamN(gunler.map(g => x.gun[g]));
    return { x, oran, normal, durma, top, veriGun: gunler.filter(g => x.gun[g] != null).length, hucre: oran.map(o => o == null ? null : o / normal) };
  });
}

function cubukGrafik(etiket, bu, onceki, adBu, adOnceki, birim) {
  const W = 852, H = 170, n = etiket.length;
  const max0 = Math.max(1, ...bu.filter(v => v != null), ...onceki.filter(v => v != null));
  const adim = Math.pow(10, Math.floor(Math.log10(max0))); const tavan = Math.ceil(max0 / adim) * adim;
  const y = v => H - v / tavan * H, gen = W / n, bw = Math.max(2, Math.min(28, gen * 0.62));
  let s = '<svg viewBox="0 0 900 214" width="100%" style="min-width:600px;display:block" role="img" aria-label="' + esc(adBu) + ' üretimi"><g font-family="Archivo, sans-serif" font-size="11" fill="#4A5A70">';
  for (let k = 0; k <= 3; k++) { const v = tavan * k / 3, yy = 8 + y(v); s += '<line x1="48" y1="' + yy + '" x2="900" y2="' + yy + '" stroke="' + (k ? '#E3E8EE' : '#B9C4D2') + '"/><text x="40" y="' + (yy + 4) + '" text-anchor="end">' + (birim === 'MWh' ? say(v / 1000) : say(v)) + '</text>'; }
  const adimE = Math.max(1, Math.ceil(n / 12));
  etiket.forEach((e, i) => { if (i % adimE === 0 || i === n - 1) s += '<text x="' + (48 + gen * i + gen / 2) + '" y="206" text-anchor="middle">' + esc(e) + '</text>'; });
  s += '</g><g transform="translate(48,8)">';
  for (let i = 0; i < n; i++) {
    const cx = gen * i + gen / 2;
    if (onceki[i] != null && onceki[i] > 0) s += '<line x1="' + (cx - bw / 2 - 1) + '" x2="' + (cx + bw / 2 + 1) + '" y1="' + y(onceki[i]) + '" y2="' + y(onceki[i]) + '" stroke="#10233F" stroke-width="2" stroke-linecap="round"/>';
    if (bu[i] != null && bu[i] > 0) { const h = H - y(bu[i]); s += '<path d="M' + (cx - bw / 2) + ',' + H + 'V' + (y(bu[i]) + Math.min(4, h)) + 'q0,-' + Math.min(4, h) + ' ' + Math.min(4, bw / 2) + ',-' + Math.min(4, h) + 'H' + (cx + bw / 2 - Math.min(4, bw / 2)) + 'q' + Math.min(4, bw / 2) + ',0 ' + Math.min(4, bw / 2) + ',' + Math.min(4, h) + 'V' + H + 'Z" fill="#2a78d6"/>'; }
    s += '<rect x="' + (gen * i) + '" y="0" width="' + gen + '" height="' + H + '" fill="transparent"><title>' + esc(etiket[i]) + ' · ' + adBu + ': ' + enerji(bu[i]) + (onceki.length ? ' · ' + adOnceki + ': ' + enerji(onceki[i]) : '') + '</title></rect>';
  }
  return s + '</g></svg>';
}
const lejant = (ogeler) => '<div style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:#4A5A70">' + ogeler.map(([ad, tip]) => '<span style="display:flex;align-items:center;gap:6px">' + (tip === 'cizgi' ? '<span style="width:14px;height:2px;background:#10233F"></span>' : '<span style="width:10px;height:10px;border-radius:2px;background:#2a78d6"></span>') + ad + '</span>').join('') + '</div>';
function isiRenk(h) {
  if (h == null) return '#F1F3F6';
  if (h < 0.05) return '#7A1A12';
  if (h < 0.6) return '#C4320A';
  if (h < 0.8) return '#EC7B3A';
  if (h < 0.9) return '#F6C27A';
  if (h < 0.97) return '#FBE6C2';
  return '#D9E6F5';
}

async function cizInverter() {
  const dun = gunEkle(bugunTR(), -1);
  if (!invSec.yil) invSec.yil = Number(dun.slice(0, 4));
  document.getElementById('baslik').textContent = 'İnverter analizi';
  document.getElementById('altBaslik').textContent = 'Geçmiş veri yükleniyor…';
  const ic = document.getElementById('icerik');
  if (!INV_CACHE[invSec.yil]) ic.innerHTML = '<div class="panel"><p class="k">Geçmiş veri yükleniyor…</p></div>';
  const ilkYil = invSec.donem === 'son30' ? Number(gunEkle(dun, -29).slice(0, 4)) : invSec.yil;
  const yillar = [...new Set([ilkYil, invSec.yil])];
  const [buD, oncD] = await Promise.all([Promise.all(yillar.map(invYilYukle)).then(a => a.flat()), Promise.all(yillar.map(y => invYilYukle(y - 1))).then(a => a.flat())]);
  if (!location.hash.startsWith('#inverter')) return;
  const S = invBirlestir(buD), SO = invBirlestir(oncD);
  const liste = Object.values(S).sort((a, b) => a.kaynak.localeCompare(b.kaynak) || String(a.ad).localeCompare(String(b.ad), 'tr'));
  if (invSec.santral !== 'hepsi' && !S[invSec.santral]) invSec.santral = 'hepsi';
  const Dn = invDonem(invSec.yil, invSec.donem);
  const Do = Dn.tip === 'gun' ? { tip: 'gun', gunler: birimKaydir(Dn.gunler, -1) } : { tip: 'ay', aylar: Dn.aylar.map(m => (Number(m.slice(0, 4)) - 1) + m.slice(4)) };
  const etiket = Dn.tip === 'gun' ? Dn.gunler.map(tarihK) : Dn.aylar.map(m => AYK[Number(m.slice(5)) - 1]);
  const secili = invSec.santral === 'hepsi' ? liste : [S[invSec.santral]];

  // Kontroller
  const ilk = 2022, yilOps = []; for (let y = Number(dun.slice(0, 4)); y >= ilk; y--) yilOps.push('<option' + (y === invSec.yil ? ' selected' : '') + '>' + y + '</option>');
  const donOps = ['<option value="son30"' + (invSec.donem === 'son30' ? ' selected' : '') + '>Son 30 gün</option>', '<option value="yil"' + (invSec.donem === 'yil' ? ' selected' : '') + '>Tüm yıl</option>'];
  for (let a = 12; a >= 1; a--) { const m = invSec.yil + '-' + String(a).padStart(2, '0'); if (m <= dun.slice(0, 7)) donOps.push('<option value="' + m + '"' + (invSec.donem === m ? ' selected' : '') + '>' + AYLAR[a - 1] + '</option>'); }
  document.getElementById('kontrol').innerHTML = '<label class="k" style="display:flex;align-items:center;gap:8px">Santral <select onchange="invSec.santral=this.value;cizInverter()"><option value="hepsi">Tümü</option>' + liste.map(s => '<option value="' + esc(s.key) + '"' + (s.key === invSec.santral ? ' selected' : '') + '>' + esc(s.ad) + ' (' + INV_KAYNAK[s.kaynak] + ')</option>').join('') + '</select></label>'
    + '<label class="k" style="display:flex;align-items:center;gap:8px">Yıl <select onchange="invSec.yil=Number(this.value);if(invSec.donem!==\'son30\'&&invSec.donem!==\'yil\')invSec.donem=\'yil\';cizInverter()">' + yilOps.join('') + '</select></label>'
    + '<label class="k" style="display:flex;align-items:center;gap:8px">Dönem <select onchange="invSec.donem=this.value;cizInverter()">' + donOps.join('') + '</select></label>'
    + '<button class="btn" type="button" onclick="invCsv()">CSV indir</button>';
  document.getElementById('altBaslik').textContent = Dn.ad + (Dn.tip === 'gun' && Dn.gunler.length ? ' (' + tarihK(Dn.gunler[0]) + '–' + tarihK(Dn.gunler[Dn.gunler.length - 1]) + ')' : '') + '. Günlük üretim platformların geçmiş kayıtlarından, kWh.';

  if (!liste.length) { ic.innerHTML = '<div class="panel"><p class="k">Bu yıl için geçmiş veri yok.</p></div>'; return; }
  const seri = secili.map(s => seriTopla(s, Dn));
  const bu = etiket.map((_, i) => seri.some(sr => sr[i] != null) ? toplamN(seri.map(sr => sr[i])) : null);
  const seriO = secili.map(s => SO[s.key] ? seriTopla(SO[s.key], Do) : Do[Do.tip === 'gun' ? 'gunler' : 'aylar'].map(() => null));
  const onceki = etiket.map((_, i) => seriO.some(sr => sr[i] != null) ? toplamN(seriO.map(sr => sr[i])) : null);
  const top = toplamN(bu), topO = toplamN(onceki), kwp = toplamN(secili.map(s => s.kwp));
  const enIyi = bu.reduce((b, v, i) => v != null && (b < 0 || v > bu[b]) ? i : b, -1);
  // geçen yılla kıyas yalnız her iki yılda da verisi olan birimler üzerinden
  const ortak = bu.map((v, i) => v != null && onceki[i] != null);
  const buOrt = toplamN(bu.filter((_, i) => ortak[i])), oncOrt = toplamN(onceki.filter((_, i) => ortak[i]));
  const fark = oncOrt > 0 ? (buOrt / oncOrt - 1) * 100 : null;

  // İnverter analizleri (günlük dönemlerde)
  const gunlerAn = Dn.tip === 'gun' ? Dn.gunler : (() => { const a = []; for (const m of Dn.aylar) for (let d = 1; d <= ayGunSay(m); d++) { const g = m + '-' + String(d).padStart(2, '0'); if (g <= dun) a.push(g); } return a; })();
  const analiz = {}; let sorunlu = 0;
  for (const s of secili) { analiz[s.key] = invAnaliz(s, gunlerAn); sorunlu += analiz[s.key].filter(a => a.durma > 0 || (a.hucre.slice(-7).filter(h => h != null).length >= 3 && medyan(a.hucre.slice(-7)) < 0.9)).length; }

  const kart = (ad, deger, alt) => '<div class="panel" style="padding:16px 18px;gap:4px"><div class="k">' + ad + '</div><div class="num" style="font-size:24px;font-weight:700">' + deger + '</div>' + (alt ? '<div class="k">' + alt + '</div>' : '') + '</div>';
  const kartlar = '<div class="kartlar5">'
    + kart('Dönem üretimi', enerji(top), secili.length > 1 ? secili.length + ' santral' : esc(secili[0].ad))
    + kart('Özgül verim', kwp ? say(top / kwp, 1) + ' <span style="font-size:13px;font-weight:500;color:#4A5A70">kWh/kWp</span>' : '—', kwp ? say(kwp) + ' kWp kurulu' : 'Kurulu güç bilinmiyor')
    + kart('Geçen yıla göre', fark == null ? '—' : (fark >= 0 ? '+' : '') + say(fark, 1) + '%', fark == null ? 'Geçen yıl verisi yok' : 'Aynı ' + (Dn.tip === 'gun' ? 'günler' : 'aylar') + ': ' + enerji(oncOrt))
    + kart('En iyi ' + (Dn.tip === 'gun' ? 'gün' : 'ay'), enIyi < 0 ? '—' : enerji(bu[enIyi]), enIyi < 0 ? '' : etiket[enIyi])
    + kart('Dikkat isteyen inverter', String(sorunlu), 'Duran ya da son 7 günde normalinin %10 altında')
    + '</div>';
  const grafikH = '<section class="panel"><div class="bas"><h2>' + (Dn.tip === 'gun' ? 'Günlük' : 'Aylık') + ' üretim</h2>' + lejant([[Dn.tip === 'gun' ? Dn.ad : String(invSec.yil), 'cubuk'], ['Geçen yıl aynı ' + (Dn.tip === 'gun' ? 'gün' : 'ay'), 'cizgi']]) + '</div><div style="overflow-x:auto">' + cubukGrafik(etiket, bu, onceki, Dn.tip === 'gun' ? 'Bu dönem' : String(invSec.yil), 'Geçen yıl', Dn.tip === 'ay' ? 'MWh' : 'kWh') + '</div><div class="k">Eksen ' + (Dn.tip === 'ay' ? 'MWh' : 'kWh') + '. Çubuğun üstüne gelince değerler görünür.</div></section>';

  let govde = '';
  if (invSec.santral === 'hepsi') {
    const satir = liste.map((s, i) => {
      const t = toplamN(seri[i]), o = SO[s.key] ? toplamN(seriO[i].filter((_, j) => seri[i][j] != null)) : 0, tt = toplamN(seri[i].filter((_, j) => seriO[i][j] != null));
      const f = o > 0 ? (tt / o - 1) * 100 : null, an = analiz[s.key], ds = an.filter(a => a.durma > 0).length;
      return '<tr style="cursor:pointer" onclick="invSec.santral=\'' + esc(s.key) + '\';cizInverter()"><td class="sol"><a href="javascript:void 0">' + esc(s.ad) + '</a></td><td class="sol">' + INV_KAYNAK[s.kaynak] + '</td><td>' + (s.kwp ? say(s.kwp) : '—') + '</td><td>' + say(t) + '</td><td>' + (s.kwp ? say(t / s.kwp, 1) : '—') + '</td><td>' + (f == null ? '—' : (f >= 0 ? '+' : '') + say(f, 1) + '%') + '</td><td>' + an.length + '</td><td' + (ds ? ' style="color:#B42318;font-weight:600"' : '') + '>' + ds + '</td></tr>';
    }).join('');
    govde += '<section class="panel"><h2>Santraller</h2><div class="tablo-kutu"><table class="tb"><thead><tr><th class="sol">Santral</th><th class="sol">Platform</th><th>kWp</th><th>Üretim (kWh)</th><th>kWh/kWp</th><th>Geçen yıla göre</th><th>İnverter</th><th>Duran inverter</th></tr></thead><tbody>' + satir + '<tr class="top"><td class="sol">Toplam</td><td></td><td>' + say(kwp) + '</td><td>' + say(top) + '</td><td>' + (kwp ? say(top / kwp, 1) : '—') + '</td><td>' + (fark == null ? '—' : (fark >= 0 ? '+' : '') + say(fark, 1) + '%') + '</td><td>' + toplamN(liste.map(s => analiz[s.key].length)) + '</td><td></td></tr></tbody></table></div><div class="k">Santral adına tıklayınca inverter ayrıntısı açılır.</div></section>';
    // Yıllık rapor matrisi
    const aylar = invDonem(invSec.yil, 'yil').aylar;
    const mat = liste.map(s => aylar.map(m => ayToplam(s, m)));
    govde += '<section class="panel"><div class="bas"><h2>' + invSec.yil + ' aylık üretim raporu</h2><span class="k">kWh</span></div><div class="tablo-kutu"><table class="tb"><thead><tr><th class="sol">Ay</th>' + liste.map(s => '<th>' + esc(s.ad) + '</th>').join('') + '<th>Toplam</th></tr></thead><tbody>'
      + aylar.map((m, j) => '<tr><td class="sol">' + AYLAR[Number(m.slice(5)) - 1] + '</td>' + mat.map(r => '<td' + (r[j] == null ? ' class="sifir"' : '') + '>' + (r[j] == null ? '' : say(r[j])) + '</td>').join('') + '<td><b>' + say(toplamN(mat.map(r => r[j]))) + '</b></td></tr>').join('')
      + '<tr class="top"><td class="sol">Toplam</td>' + mat.map(r => '<td>' + say(toplamN(r)) + '</td>').join('') + '<td>' + say(toplamN(mat.flat())) + '</td></tr></tbody></table></div><div class="k">Boş hücre: o ayın verisi yok (santral henüz kurulmamış ya da geçmiş henüz çekilmedi).</div></section>';
  } else {
    const s = secili[0], an = analiz[s.key], kwpVar = an.length && an.every(a => a.x.kwp);
    const medTop = medyan(an.map(a => kwpVar ? a.top / a.x.kwp : a.top));
    const son = gunlerAn.slice(-30);
    const satir = an.map(a => {
      const deger = kwpVar ? a.top / a.x.kwp : a.top, kiyas = medTop ? (deger / medTop - 1) * 100 : null;
      const son7 = medyan(a.hucre.slice(-7));
      const durum = a.veriGun === 0 ? ['Veri yok', '#4A5A70'] : a.durma > 0 && a.hucre[a.hucre.length - 1] != null && a.hucre[a.hucre.length - 1] < 0.05 ? ['Duruyor', '#B42318'] : a.durma > 0 ? ['Durma yaşadı', '#9A5B00'] : son7 != null && son7 < 0.9 ? ['Düşük', '#9A5B00'] : ['Normal', '#1E7A3C'];
      const sp = son.some(g => a.x.gun[g] != null) ? spark(son.map(g => +a.x.gun[g] || 0), '#2a78d6', a.x.ad + ' günlük üretim') : '';
      return '<tr><td class="sol"><b>' + esc(a.x.ad) + '</b></td>' + (kwpVar ? '<td>' + say(a.x.kwp, 1) + '</td>' : '') + '<td>' + say(a.top) + '</td>' + (kwpVar ? '<td>' + say(deger, 1) + '</td>' : '') + '<td>' + (kiyas == null ? '—' : (kiyas >= 0 ? '+' : '') + say(kiyas, 1) + '%') + '</td><td>' + a.durma + '</td><td class="sol" style="color:' + durum[1] + ';font-weight:600">' + durum[0] + '</td><td style="width:140px">' + sp + '</td></tr>';
    }).join('');
    govde += '<section class="panel"><div class="bas"><h2>İnverterler · ' + esc(s.ad) + '</h2><span class="k">' + an.length + ' inverter</span></div><div class="tablo-kutu"><table class="tb"><thead><tr><th class="sol">İnverter</th>' + (kwpVar ? '<th>DC kWp</th>' : '') + '<th>Üretim (kWh)</th>' + (kwpVar ? '<th>kWh/kWp</th>' : '') + '<th>Medyana göre</th><th>Durma günü</th><th class="sol">Durum</th><th class="sol">Son 30 gün</th></tr></thead><tbody>' + satir + '</tbody></table></div><div class="k">' + (kwpVar ? 'Kıyas kWp başına üretimle yapılır.' : 'Platform inverter gücünü vermediği için kıyas, santralin medyan inverterine göre üretimdir; farklı güçteki inverterler kalıcı olarak farklı görünebilir.') + ' Durma günü: santral üretirken inverterin neredeyse hiç üretmediği gün.</div></section>';
    // Isı haritası
    const hg = Dn.tip === 'gun' ? Dn.gunler : gunlerAn.slice(-62);
    const ix = hg.map(g => gunlerAn.indexOf(g));
    const hw = Math.max(8, Math.min(26, Math.floor(820 / Math.max(1, hg.length))));
    let isi = '<div style="overflow-x:auto"><table style="border-collapse:separate;border-spacing:2px;font-size:12px"><thead><tr><th></th>' + hg.map((g, i) => '<th style="font-weight:500;color:#4A5A70;width:' + hw + 'px;text-align:center">' + (i % Math.max(1, Math.ceil(hg.length / 16)) === 0 ? Number(g.slice(8)) : '') + '</th>').join('') + '</tr></thead><tbody>';
    for (const a of an) isi += '<tr><th style="text-align:right;padding-right:8px;font-weight:600;white-space:nowrap">' + esc(a.x.ad) + '</th>' + ix.map((k, j) => { const h = a.hucre[k], v = a.x.gun[hg[j]]; return '<td style="width:' + hw + 'px;height:18px;border-radius:3px;background:' + isiRenk(h) + '" title="' + esc(a.x.ad) + ' · ' + tarihK(hg[j]) + ': ' + (v == null ? 'veri yok' : say(v) + ' kWh · normalinin %' + say((h || 0) * 100)) + '"></td>'; }).join('') + '</tr>';
    isi += '</tbody></table></div>';
    const lej = [['#D9E6F5', 'Normal (≥ %97)'], ['#FBE6C2', '%90–97'], ['#F6C27A', '%80–90'], ['#EC7B3A', '%60–80'], ['#C4320A', '< %60'], ['#7A1A12', 'Durdu'], ['#F1F3F6', 'Veri yok']];
    govde += '<section class="panel"><div class="bas"><h2>Günlük performans haritası</h2><span class="k">' + (Dn.tip === 'gun' ? Dn.ad : 'Son ' + hg.length + ' gün') + '</span></div>' + isi + '<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#4A5A70">' + lej.map(([r, ad]) => '<span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:' + r + '"></span>' + ad + '</span>').join('') + '</div><div class="k">Her hücre, inverterin o günkü üretiminin santraldeki medyan invertere oranının, inverterin dönem içindeki olağan oranına bölünmesidir. Bulutlu günler bütün inverterleri birlikte etkilediği için haritayı bozmaz; tek bir inverterdeki düşüş öne çıkar.</div></section>';
    // Aylık inverter raporu
    const aylar = invDonem(invSec.yil, 'yil').aylar;
    govde += '<section class="panel"><div class="bas"><h2>' + invSec.yil + ' aylık inverter raporu</h2><span class="k">kWh</span></div><div class="tablo-kutu"><table class="tb"><thead><tr><th class="sol">İnverter</th>' + aylar.map(m => '<th>' + AYK[Number(m.slice(5)) - 1] + '</th>').join('') + '<th>Toplam</th></tr></thead><tbody>'
      + an.map(a => { const r = aylar.map(m => ayToplam(a.x, m)); return '<tr><td class="sol"><b>' + esc(a.x.ad) + '</b></td>' + r.map(v => '<td' + (v == null ? ' class="sifir"' : '') + '>' + (v == null ? '' : say(v)) + '</td>').join('') + '<td><b>' + say(toplamN(r)) + '</b></td></tr>'; }).join('')
      + '<tr class="top"><td class="sol">Santral</td>' + aylar.map(m => '<td>' + say(ayToplam(s, m)) + '</td>').join('') + '<td>' + say(toplamN(aylar.map(m => ayToplam(s, m)))) + '</td></tr></tbody></table></div></section>';
  }
  const kapsam = liste.map(s => { const g = Object.keys(s.gun).filter(k => s.gun[k] > 0).sort(); return esc(s.ad) + ': ' + (g.length ? tarihK(g[0]) + ' ' + g[0].slice(0, 4) + '–' + tarihK(g[g.length - 1]) : 'günlük veri yok'); }).join(' · ');
  ic.innerHTML = '<div style="display:flex;flex-direction:column;gap:20px">' + kartlar + grafikH + govde + '<div class="k">Bu yıldaki günlük veri kapsamı: ' + kapsam + '. Sungrow ve Inavitas geçmişi n8n tarafından her gece güncellenir; FusionSolar inverter günlükleri 5 Ekim 2026\'dan itibaren toplanıyor.</div></div>';
  document.getElementById('kaynakNot').textContent = 'Veri: Sungrow · Inavitas · FusionSolar geçmişi';
}
function invCsv() {
  const dun = gunEkle(bugunTR(), -1);
  const Dn = invDonem(invSec.yil, invSec.donem);
  const gunler = Dn.tip === 'gun' ? Dn.gunler : (() => { const a = []; for (const m of Dn.aylar) for (let d = 1; d <= ayGunSay(m); d++) { const g = m + '-' + String(d).padStart(2, '0'); if (g <= dun) a.push(g); } return a; })();
  const yillar = [...new Set(gunler.map(g => Number(g.slice(0, 4))))];
  const S = invBirlestir(yillar.flatMap(y => INV_CACHE[y] || []));
  const secili = invSec.santral === 'hepsi' ? Object.values(S) : [S[invSec.santral]].filter(Boolean);
  const satir = ['tarih;platform;santral;inverter;kwh'];
  for (const s of secili) for (const g of gunler) { if (s.gun[g] != null) satir.push([g, INV_KAYNAK[s.kaynak], s.ad, 'SANTRAL', String(s.gun[g]).replace('.', ',')].join(';')); for (const iv of Object.values(s.inv).sort(invSirala)) if (iv.gun[g] != null) satir.push([g, INV_KAYNAK[s.kaynak], s.ad, iv.ad, String(iv.gun[g]).replace('.', ',')].join(';')); }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + satir.join('\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = 'inverter_' + (invSec.santral === 'hepsi' ? 'tum' : invSec.santral.replace(/[^\w]+/g, '_')) + '_' + invSec.donem + '.csv';
  a.click();
}
