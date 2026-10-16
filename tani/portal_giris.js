const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const log = []; p.on('console', m => log.push(m.type() + ': ' + m.text().slice(0, 160))); p.on('pageerror', e => log.push('HATA: ' + e.message.slice(0, 160)));
  p.on('requestfailed', r => log.push('İSTEK BAŞARISIZ: ' + r.url().slice(0, 100) + ' ' + (r.failure() || {}).errorText));
  p.on('response', r => { if (r.status() >= 400) log.push('YANIT ' + r.status() + ' ' + r.url().slice(0, 100)); });
  await p.goto('https://portal.aksarayenerji.net/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const btn = await p.$$eval('button, a', xs => xs.map(x => x.textContent.trim()).filter(Boolean).slice(0, 15));
  console.log('::notice::düğmeler: ' + btn.join(' | ').slice(0, 300));
  // giriş penceresini aç ve sahte kullanıcı dene
  try {
    await p.evaluate(() => girisModal());
    await p.waitForTimeout(800);
    const inp = await p.$$('dialog input');
    console.log('::notice::giriş kutusu alanları: ' + inp.length);
    if (inp.length >= 2) { await inp[0].fill('yok_kullanici_test'); await inp[1].fill('x'); await p.keyboard.press('Enter'); await p.waitForTimeout(9000); }
    const t = await p.evaluate(() => (document.querySelector('dialog[open]') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 300));
    console.log('::notice::sonuç: ' + t);
  } catch (e) { console.log('::notice::giriş denemesi hata: ' + e.message.slice(0, 200)); }
  console.log('::notice::kayıt: ' + log.slice(0, 12).join(' ;; ').slice(0, 900));
  await b.close();
})();
