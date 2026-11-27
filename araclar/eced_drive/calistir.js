/* EÇED P.T.D. → Drive aktarıcısı. eced.csb.gov.tr sekmesinde çalışır (site yalnız Türkiye'den açılır).
 * Ayar (bir kez): localStorage 'eced_url' = Apps Script web uygulaması adresi, 'eced_k' = ANAHTAR.
 * Kaldığı yerden devam eder: Drive'da adı "<no>_" ile başlayan dosyalar atlanır. Sağ üstte durum paneli. */
(async () => {
  if (window.__ecedCalisiyor) return alert('Aktarım zaten çalışıyor');
  if (location.host !== 'eced.csb.gov.tr') return alert('Bu betik eced.csb.gov.tr sayfasında çalışır');
  const URL_ = localStorage.getItem('eced_url'), K = localStorage.getItem('eced_k');
  if (!URL_ || !K) return alert('Ayar eksik: eced_url / eced_k');
  window.__ecedCalisiyor = true;
  const PARCA = 16 * 1024 * 1024, uyu = ms => new Promise(r => setTimeout(r, ms));
  const pn = document.createElement('div');
  pn.style.cssText = 'position:fixed;top:8px;right:8px;z-index:2147483647;background:#111;color:#0f0;font:13px monospace;padding:10px 12px;border-radius:8px;max-width:440px;white-space:pre-wrap;box-shadow:0 2px 12px #0008';
  document.body.appendChild(pn);
  const S = { tamam: 0, atlandi: 0, hata: {}, bayt: 0, son: '', simdi: '', bas: Date.now(), dur: false };
  const dugme = document.createElement('button'); dugme.textContent = 'Durdur';
  dugme.onclick = () => { S.dur = true; dugme.textContent = 'duruyor…'; };
  const yaz = () => {
    const dk = (Date.now() - S.bas) / 60000, gb = S.bayt / 1e9;
    pn.textContent = `EÇED → Drive\n${S.tamam + S.atlandi}/${S.toplam || '?'} proje (bu oturum ${S.tamam}, önceden ${S.atlandi})\n` +
      `${gb.toFixed(2)} GB · ${(S.bayt / 1e6 / Math.max(dk, 0.1)).toFixed(1)} MB/dk · hata ${Object.keys(S.hata).length}\nŞimdi: ${S.simdi}\nSon: ${S.son.slice(0, 80)}\n`;
    pn.appendChild(dugme);
  };
  const api = async (o) => {
    for (let d = 0; d < 5; d++) {
      try {
        const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...o, k: K }) });
        const j = await r.json(); if (j.ok) return j; if (j.hata === 'yetki') throw new Error('yetki'); throw new Error(j.hata || ('kod ' + j.kod));
      } catch (h) { if (String(h).includes('yetki') || d === 4) throw h; await uyu(5000 * (d + 1)); }
    }
  };
  const b64 = async (blob) => { const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const temiz = s => s.replace(/[\\/:*?"<>|\t\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  try {
    const ids = (await (await fetch('https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/araclar/eced_drive/ids.txt')).text()).split(/\s+/).filter(Boolean);
    S.toplam = ids.length;
    const varOlan = new Set((await api({ tur: 'liste' })).adlar.map(a => a.split('_')[0]));
    yaz();
    for (const id of ids) {
      if (S.dur) break;
      if (varOlan.has(id)) { S.atlandi++; continue; }
      S.simdi = id; yaz();
      for (let den = 0; den < 3; den++) {
        try {
          const doc = new DOMParser().parseFromString(await (await fetch('/jsp/ek1/' + id)).text(), 'text/html');
          const proje = temiz(doc.querySelector('table tbody tr td')?.textContent || 'proje').slice(0, 90);
          const ll = [...doc.querySelectorAll('a[onclick*="dosyaGoster"]')].map(a => a.getAttribute('onclick').match(/window\.open\('([^']+)'/)[1]);
          if (!ll.length) throw new Error('dosya yok');
          for (let k = 0; k < ll.length; k++) {
            const u = new URL(ll[k], location.origin + '/jsp/ek1/');
            const orj = temiz(u.searchParams.get('orjinalAd') || 'dosya.pdf');
            let ad = `${id}_${proje}${ll.length > 1 ? '_' + (k + 1) : ''}_${orj}`.slice(0, 200); if (!/\.pdf$/i.test(ad)) ad += '.pdf';
            S.simdi = `${id} indiriliyor`; yaz();
            const r = await fetch(u); if (!r.ok) throw new Error('http ' + r.status);
            const blob = await r.blob(); if (blob.size < 1000) throw new Error('küçük ' + blob.size);
            const { oturum } = await api({ tur: 'basla', ad, boyut: blob.size });
            for (let bas = 0; bas < blob.size; bas += PARCA) {
              S.simdi = `${id} Drive'a ${Math.round(bas / blob.size * 100)}% (${(blob.size / 1e6).toFixed(0)} MB)`; yaz();
              await api({ tur: 'parca', oturum, bas, boyut: blob.size, veri: await b64(blob.slice(bas, bas + PARCA)) });
            }
            S.bayt += blob.size; S.son = ad;
          }
          S.tamam++; delete S.hata[id]; varOlan.add(id); break;
        } catch (h) { S.hata[id] = String(h).slice(0, 100); if (String(h).includes('yetki')) throw h; await uyu(20000); }
      }
      localStorage.setItem('eced_durum', JSON.stringify({ ...S, t: new Date().toISOString() })); yaz();
    }
    S.simdi = S.dur ? 'DURDURULDU' : 'BİTTİ'; yaz();
  } catch (h) { S.simdi = 'HATA: ' + h; yaz(); }
  localStorage.setItem('eced_durum', JSON.stringify({ ...S, t: new Date().toISOString() }));
  window.__ecedCalisiyor = false;
})();
