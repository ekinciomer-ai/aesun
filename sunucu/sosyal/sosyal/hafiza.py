"""Kalıcı hafıza (SQLite).

Kalıcı olanlar: yetenekler (öğrenilen teknik, tercih, yasak), içerik kayıtları, öğrenme günlüğü, oturum özetleri.
Geçici olan: sohbet mesajları. Oturum kapanınca öğrenilenler damıtılır, mesajlar arşive taşınır,
arşiv SOSYAL_SOHBET_ARSIV_GUN gün sonra kalıcı silinir.
"""
import json
import re
import sqlite3
import threading
from datetime import datetime, timedelta, timezone

from . import ayarlar

TZ = timezone(timedelta(hours=3))
_KILIT = threading.Lock()

SEMA = """
CREATE TABLE IF NOT EXISTS yetenekler(
  id INTEGER PRIMARY KEY, tur TEXT NOT NULL DEFAULT 'yetenek', ad TEXT NOT NULL UNIQUE, aciklama TEXT NOT NULL,
  ornek TEXT DEFAULT '', platform TEXT DEFAULT 'hepsi', guven REAL DEFAULT 0.6, kullanim INTEGER DEFAULT 0,
  aktif INTEGER DEFAULT 1, kaynak_oturum INTEGER, olusturma TEXT, guncelleme TEXT);
CREATE TABLE IF NOT EXISTS icerikler(
  id INTEGER PRIMARY KEY, oturum_id INTEGER, platform TEXT, dil TEXT, format TEXT, konu TEXT, metin TEXT,
  motorlar TEXT, puan INTEGER, notlar TEXT DEFAULT '', tarih TEXT);
CREATE TABLE IF NOT EXISTS oturumlar(
  id INTEGER PRIMARY KEY, platform TEXT, dil TEXT, format TEXT, konu TEXT, durum TEXT DEFAULT 'acik',
  olusturma TEXT, kapanis TEXT, ozet TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS mesajlar(
  id INTEGER PRIMARY KEY, oturum_id INTEGER NOT NULL, rol TEXT, asama TEXT, motor TEXT, icerik TEXT, ts TEXT);
CREATE TABLE IF NOT EXISTS arsiv_mesajlar(
  id INTEGER PRIMARY KEY, oturum_id INTEGER, veri TEXT, arsiv_ts TEXT, silinecek_ts TEXT);
CREATE TABLE IF NOT EXISTS gunluk(id INTEGER PRIMARY KEY, ts TEXT, olay TEXT, ayrinti TEXT);
"""


def simdi():
    return datetime.now(TZ).isoformat(timespec="seconds")


class Hafiza:
    def __init__(self, yol=None):
        self.yol = str(yol or ayarlar.veri_dizin() / "hafiza.db")
        with self._baglan() as b:
            b.executescript(SEMA)

    def _baglan(self):
        b = sqlite3.connect(self.yol, timeout=15)
        b.row_factory = sqlite3.Row
        b.execute("PRAGMA journal_mode=WAL")
        return b

    def _calis(self, sql, p=()):
        with _KILIT, self._baglan() as b:
            c = b.execute(sql, p)
            return c.lastrowid

    def _oku(self, sql, p=()):
        with self._baglan() as b:
            return [dict(r) for r in b.execute(sql, p).fetchall()]

    def gunluk(self, olay, ayrinti=""):
        self._calis("INSERT INTO gunluk(ts,olay,ayrinti) VALUES(?,?,?)", (simdi(), olay, str(ayrinti)[:4000]))

    # ---- oturumlar ve geçici mesajlar
    def oturum_ac(self, platform, dil, format_, konu):
        return self._calis("INSERT INTO oturumlar(platform,dil,format,konu,olusturma) VALUES(?,?,?,?,?)",
                           (platform, dil, format_, konu, simdi()))

    def oturum(self, oid):
        r = self._oku("SELECT * FROM oturumlar WHERE id=?", (oid,))
        return r[0] if r else None

    def oturumlar(self, durum=None, limit=30):
        if durum:
            return self._oku("SELECT * FROM oturumlar WHERE durum=? ORDER BY id DESC LIMIT ?", (durum, limit))
        return self._oku("SELECT * FROM oturumlar ORDER BY id DESC LIMIT ?", (limit,))

    def mesaj_ekle(self, oid, rol, asama, motor, icerik):
        return self._calis("INSERT INTO mesajlar(oturum_id,rol,asama,motor,icerik,ts) VALUES(?,?,?,?,?,?)",
                           (oid, rol, asama, motor, icerik, simdi()))

    def mesajlar(self, oid):
        return self._oku("SELECT * FROM mesajlar WHERE oturum_id=? ORDER BY id", (oid,))

    def son_mesaj(self, oid, asama):
        r = self._oku("SELECT * FROM mesajlar WHERE oturum_id=? AND asama=? ORDER BY id DESC LIMIT 1", (oid, asama))
        return r[0] if r else None

    def oturum_kapat(self, oid, ozet):
        """Mesajları arşive taşır ve aktif tablodan siler. Arşiv süre dolunca temizle() ile silinir."""
        msj = self.mesajlar(oid)
        gun = ayarlar.arsiv_gun()
        with _KILIT, self._baglan() as b:
            if msj and gun > 0:
                b.execute("INSERT INTO arsiv_mesajlar(oturum_id,veri,arsiv_ts,silinecek_ts) VALUES(?,?,?,?)",
                          (oid, json.dumps(msj, ensure_ascii=False), simdi(),
                           (datetime.now(TZ) + timedelta(days=gun)).isoformat(timespec="seconds")))
            b.execute("DELETE FROM mesajlar WHERE oturum_id=?", (oid,))
            b.execute("UPDATE oturumlar SET durum='kapandi', kapanis=?, ozet=? WHERE id=?", (simdi(), ozet, oid))
        return len(msj)

    def temizle(self):
        """Süresi dolan arşivlenmiş sohbetleri kalıcı siler."""
        with _KILIT, self._baglan() as b:
            n = b.execute("DELETE FROM arsiv_mesajlar WHERE silinecek_ts < ?", (simdi(),)).rowcount
        if n:
            self.gunluk("arsiv_temizlik", f"{n} eski sohbet kalıcı silindi")
        return n

    # ---- yetenekler
    def yetenek_ekle(self, tur, ad, aciklama, ornek="", platform="hepsi", oid=None):
        """Aynı adlı (ya da çok benzer) kayıt varsa güncellenir ve güveni artar; yoksa yeni eklenir."""
        tur = tur if tur in ("yetenek", "tercih", "yasak") else "yetenek"
        ad, aciklama = ad.strip()[:120], aciklama.strip()[:1500]
        if not ad or not aciklama:
            return None
        var = self._benzer(ad)
        if var:
            self._calis("UPDATE yetenekler SET aciklama=?, ornek=CASE WHEN ?<>'' THEN ? ELSE ornek END, "
                        "guven=MIN(1.0, guven+0.1), aktif=1, guncelleme=? WHERE id=?",
                        (aciklama, ornek, ornek[:1500], simdi(), var["id"]))
            return var["id"]
        return self._calis("INSERT INTO yetenekler(tur,ad,aciklama,ornek,platform,kaynak_oturum,olusturma,guncelleme) "
                           "VALUES(?,?,?,?,?,?,?,?)", (tur, ad, aciklama, ornek[:1500], platform or "hepsi", oid,
                                                       simdi(), simdi()))

    def _benzer(self, ad):
        k = _kelimeler(ad)
        for y in self._oku("SELECT id, ad FROM yetenekler"):
            if y["ad"].lower() == ad.lower():
                return y
            ky = _kelimeler(y["ad"])
            if k and ky and len(k & ky) / len(k | ky) >= 0.75:
                return y
        return None

    def yetenekler(self, sadece_aktif=False):
        w = "WHERE aktif=1" if sadece_aktif else ""
        return self._oku(f"SELECT * FROM yetenekler {w} ORDER BY tur, guven DESC, kullanim DESC")

    def yetenek_guncelle(self, yid, **alan):
        izinli = {k: v for k, v in alan.items() if k in ("aktif", "aciklama", "ad", "tur", "platform", "ornek")}
        if not izinli:
            return
        sql = ", ".join(f"{k}=?" for k in izinli)
        self._calis(f"UPDATE yetenekler SET {sql}, guncelleme=? WHERE id=?", (*izinli.values(), simdi(), yid))

    def ilgili_yetenekler(self, platform, metin, limit=15, say=False):
        """Tercih ve yasaklar hep gelir; teknikler platform ve konuyla örtüşmeye göre seçilir."""
        hepsi = self.yetenekler(sadece_aktif=True)
        sabit = [y for y in hepsi if y["tur"] in ("tercih", "yasak")]
        k = _kelimeler(metin + " " + platform)

        def puan(y):
            p = len(k & _kelimeler(y["ad"] + " " + y["aciklama"])) + y["guven"] * 2
            if y["platform"] in (platform, "hepsi"):
                p += 2
            return p
        teknik = sorted((y for y in hepsi if y["tur"] == "yetenek"), key=puan, reverse=True)[:limit]
        secilen = sabit[:25] + teknik
        if secilen and say:
            self._calis(f"UPDATE yetenekler SET kullanim=kullanim+1 WHERE id IN ({','.join('?' * len(secilen))})",
                        [y["id"] for y in secilen])
        return secilen

    # ---- içerik kayıtları
    def icerik_kaydet(self, oid, platform, dil, format_, konu, metin, motorlar, puan=None, notlar=""):
        return self._calis("INSERT INTO icerikler(oturum_id,platform,dil,format,konu,metin,motorlar,puan,notlar,tarih) "
                           "VALUES(?,?,?,?,?,?,?,?,?,?)",
                           (oid, platform, dil, format_, konu, metin, motorlar, puan, notlar, simdi()))

    def icerikler(self, limit=50):
        return self._oku("SELECT * FROM icerikler ORDER BY id DESC LIMIT ?", (limit,))

    def icerik_puanla(self, iid, puan, notlar=""):
        self._calis("UPDATE icerikler SET puan=?, notlar=? WHERE id=?", (puan, notlar, iid))

    def gunluk_listesi(self, limit=50):
        return self._oku("SELECT * FROM gunluk ORDER BY id DESC LIMIT ?", (limit,))

    def sayilar(self):
        s = {}
        for t in ("yetenekler", "icerikler", "oturumlar", "arsiv_mesajlar"):
            s[t] = self._oku(f"SELECT COUNT(*) n FROM {t}")[0]["n"]
        return s

    def markdown(self):
        """Hafızanın okunur özeti: Claude ya da başka bir yapay zekâ yeni sohbete bunu okuyarak başlar."""
        st = ["# Sosyal Stüdyo hafızası", f"_Güncelleme: {simdi()}_", ""]
        adlar = {"yasak": "Yasaklar", "tercih": "Kullanıcı tercihleri", "yetenek": "Öğrenilen yetenekler"}
        y = self.yetenekler(sadece_aktif=True)
        for tur in ("yasak", "tercih", "yetenek"):
            grup = [x for x in y if x["tur"] == tur]
            if grup:
                st.append(f"## {adlar[tur]}")
                for x in grup:
                    st.append(f"- **{x['ad']}** ({x['platform']}, güven {x['guven']:.1f}): {x['aciklama']}")
                st.append("")
        ic = self.icerikler(20)
        if ic:
            st.append("## Son içerikler (tekrar etme)")
            for x in ic:
                p = f" · puan {x['puan']}" if x["puan"] else ""
                st.append(f"- {x['tarih'][:10]} · {x['platform']}/{x['dil']} · {x['format'] or '-'} · {x['konu']}{p}")
        return "\n".join(st) + "\n"


def _kelimeler(s):
    return {w for w in re.findall(r"\w+", (s or "").lower()) if len(w) > 2}
