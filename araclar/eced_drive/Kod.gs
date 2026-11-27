/**
 * EÇED P.T.D. → Google Drive alıcısı (Google Apps Script web uygulaması, ücretsiz, Ömer'in Google hesabında çalışır).
 * Tarayıcıdaki calistir.js dosyayı EÇED'den alır, 16 MB'lık parçalar halinde buraya yollar; burası Drive'a yazar.
 * Kurulum: BENIOKU.md. ANAHTAR, Proje Ayarları > Komut dosyası özellikleri'ne girilir (koda yazılmaz).
 */
const KLASOR_ADI = 'EÇED PTD Dosyaları';

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    const ozellik = PropertiesService.getScriptProperties();
    if (!p.k || p.k !== ozellik.getProperty('ANAHTAR')) return cik({ ok: false, hata: 'yetki' });
    const klasor = klasorId_(ozellik);
    if (p.tur === 'liste') {
      const adlar = [];
      const it = DriveApp.getFolderById(klasor).getFiles();
      while (it.hasNext()) adlar.push(it.next().getName());
      return cik({ ok: true, adlar: adlar });
    }
    if (p.tur === 'basla') {
      const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'post', contentType: 'application/json; charset=UTF-8',
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': 'application/pdf', 'X-Upload-Content-Length': String(p.boyut) },
        payload: JSON.stringify({ name: p.ad, parents: [klasor] }), muteHttpExceptions: true });
      const oturum = r.getHeaders()['Location'] || r.getHeaders()['location'];
      return cik(oturum ? { ok: true, oturum: oturum } : { ok: false, hata: 'oturum ' + r.getResponseCode() });
    }
    if (p.tur === 'parca') {
      const b = Utilities.base64Decode(p.veri);
      const r = UrlFetchApp.fetch(p.oturum, {
        method: 'put', contentType: 'application/pdf', payload: b, muteHttpExceptions: true,
        headers: { 'Content-Range': 'bytes ' + p.bas + '-' + (p.bas + b.length - 1) + '/' + p.boyut } });
      const kod = r.getResponseCode();
      return cik({ ok: kod === 308 || kod === 200 || kod === 201, kod: kod, bitti: kod === 200 || kod === 201 });
    }
    return cik({ ok: false, hata: 'tür' });
  } catch (h) {
    return cik({ ok: false, hata: String(h).slice(0, 200) });
  }
}

function klasorId_(ozellik) {
  let id = ozellik.getProperty('KLASOR');
  if (id) { try { DriveApp.getFolderById(id).getName(); return id; } catch (h) {} }
  const v = DriveApp.getFoldersByName(KLASOR_ADI);
  id = v.hasNext() ? v.next().getId() : DriveApp.createFolder(KLASOR_ADI).getId();
  ozellik.setProperty('KLASOR', id);
  return id;
}

function cik(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Kurulumda bir kez çalıştırılır: izinleri ister ve klasörü açar. */
function kurulum() { Logger.log(klasorId_(PropertiesService.getScriptProperties())); }
