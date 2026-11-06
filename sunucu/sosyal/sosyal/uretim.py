"""Üretim akışı: araştırma → fikir (birden çok motor aynı anda) → yazım → eleştiri → düzeltme → denetim.
Sohbet kapanınca öğrenilenler hafızaya damıtılır, sohbet metni silinir (önce arşive)."""
import json
import re
from concurrent.futures import ThreadPoolExecutor

from . import arac, ayarlar, denetim, kaynaklar, motorlar
from .hafiza import Hafiza

KIMLIK = ("Sen bir sosyal medya içerik stüdyosunun ekibindesin. Birden çok yapay zekâ birlikte çalışıyor; "
          "her biri bir görevi üstlenir. Kullanıcının kaynak dosyalarındaki kurallar ve hafızadaki "
          "tercih/yasaklar her şeyin üstündedir. Doğrulanmamış bilgi kesin bilgi gibi yazılmaz.")

CIKTI_VIDEO = """Cevabı tam olarak şu bölümlerle yaz (Markdown, her bölüm '## ' ile başlar):
## Başlık
## İlk kare
(ekranda ilk saniyede görünen BÜYÜK HARF kanca yazısı)
## Metin
(seslendirme metni; kısa, düz cümleler)
## Sahneler
(numaralı; her sahne: süre, ne görünüyor, kamera/hareket ve İngilizce görsel istemi. İstemler 'No text, no letters, no logos, no watermark' ile biter)
## Açıklama
(yapay zekâ/klon ses notu dahil)
## Etiketler
## Kaynaklar
(her iddia için kaynak; emin olunmayanı '(doğrulanacak)' diye işaretle)
## Yayın saati önerisi
## Doğrulanacaklar
(yayından önce ikinci kez kontrol edilmesi gereken tarih ve rakamlar)"""

CIKTI_METIN = """Cevabı tam olarak şu bölümlerle yaz (Markdown, her bölüm '## ' ile başlar):
## Başlık
## Metin
(gönderinin kendisi)
## Görsel
(görsel/kart önerisi ve İngilizce görsel istemi, 'No text, no letters, no logos, no watermark' ile biter)
## Etiketler
## Kaynaklar
## Doğrulanacaklar"""


class UretimHatasi(Exception):
    pass


def _json_bul(metin):
    m = re.search(r"\{.*\}", metin or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


class Studyo:
    def __init__(self, hafiza=None):
        self.h = hafiza or Hafiza()
        self.m = motorlar.hepsi()

    # ---- motor seçimi
    def durum(self):
        return {"motorlar": [x.bilgi() for x in self.m.values()], "roller": ayarlar.roller(),
                "kaynaklar": kaynaklar.liste(), "sayilar": self.h.sayilar(),
                "platformlar": [[k, v["ad"]] for k, v in denetim.PLATFORMLAR.items()],
                "diller": [[k, v] for k, v in denetim.DILLER.items()]}

    def _hazir(self, rol):
        return [self.m[a] for a in ayarlar.roller().get(rol, []) if a in self.m and self.m[a].hazir()]

    def _cagir(self, rol, sistem, mesaj, haric=(), sicaklik=0.7, ara=False):
        adaylar = [x for x in self._hazir(rol) if x.ad not in haric] or self._hazir(rol)
        hatalar = []
        for mt in adaylar:
            try:
                return mt.ad, mt.yaz(sistem, mesaj, sicaklik, ara=ara and mt.arama)
            except motorlar.MotorHatasi as e:
                hatalar.append(f"{mt.ad}: {e}")
                self.h.gunluk("motor_hatasi", f"{rol} · {mt.ad} · {e}")
        raise UretimHatasi(f"'{rol}' görevi için çalışan motor yok. " + " | ".join(hatalar))

    # ---- bağlam: her yeni sohbet buradan başlar (kaynak MD + hafıza)
    def baglam(self, o, say=False):
        konu_metni = f"{o['format']} {o['konu']} {o['platform']}"
        yet = self.h.ilgili_yetenekler(o["platform"], konu_metni, say=say)
        bas = {"yasak": "YASAK", "tercih": "TERCİH", "yetenek": "YETENEK"}
        satir = [f"- [{bas[y['tur']]}] {y['ad']}: {y['aciklama']}" + (f" (örnek: {y['ornek']})" if y["ornek"] else "")
                 for y in yet]
        son = [f"- {x['tarih'][:10]} {x['platform']}: {x['konu']}" for x in self.h.icerikler(12)]
        kural = denetim.PLATFORMLAR.get(o["platform"], {})
        parca = [KIMLIK,
                 f"PLATFORM: {kural.get('ad', o['platform'])}. {kural.get('kural', '')}",
                 f"DİL: {denetim.DILLER.get(o['dil'], o['dil'])}. Başka dile çeviri değil, o ülkenin açısıyla uyarlama yap.",
                 f"FORMAT: {o['format'] or 'serbest'}"]
        kb = kaynaklar.baglam(konu_metni)
        if kb:
            parca.append("KULLANICININ KAYNAK DOSYALARI (bağlayıcı):\n" + kb)
        if satir:
            parca.append("HAFIZA: önceki sohbetlerden öğrenilenler (uygula):\n" + "\n".join(satir))
        if son:
            parca.append("SON İÇERİKLER (aynı konuyu/açıyı tekrar etme):\n" + "\n".join(son))
        return "\n\n".join(parca)

    def _sistem(self, gorev, o, ek=""):
        return f"GÖREV: {gorev}\n{ek}\n\n{self.baglam(o)}"

    def _cikti(self, o):
        return CIKTI_VIDEO if o["platform"] in ("youtube_shorts", "youtube_uzun", "tiktok", "instagram_reels") \
            else CIKTI_METIN

    def _oturum(self, oid):
        o = self.h.oturum(oid)
        if not o:
            raise UretimHatasi("Sohbet bulunamadı.")
        if o["durum"] != "acik":
            raise UretimHatasi("Bu sohbet kapandı; yeni sohbet açın.")
        return o

    # ---- akış
    def oturum_ac(self, platform, dil, format_, konu):
        if platform not in denetim.PLATFORMLAR:
            raise UretimHatasi("Bilinmeyen platform.")
        if not konu.strip():
            raise UretimHatasi("Konu boş olamaz.")
        oid = self.h.oturum_ac(platform, dil, format_.strip(), konu.strip())
        self.h.mesaj_ekle(oid, "kullanici", "istek", "", f"KONU: {konu.strip()}\nFORMAT: {format_}")
        return oid

    def uret(self, oid, arastir=True):
        o = self._oturum(oid)
        self.baglam(o, say=True)  # kullanılan yeteneklerin sayacı sohbet başına bir kez artar
        istek = f"KONU: {o['konu']}\nFORMAT: {o['format'] or 'serbest'}"
        # 1. araştırma (web araması yapabilen motorla)
        arastirma = ""
        if arastir and self._hazir("arastirma"):
            try:
                ad, arastirma = self._cagir(
                    "arastirma", self._sistem("ARAŞTIRMA", o, "Konu hakkında az bilinen, doğrulanmış bilgileri "
                                              "maddeler halinde çıkar. Her maddeye kaynak adresi ekle. Tartışmalı "
                                              "olanları ayrıca işaretle."), istek, sicaklik=0.2, ara=True)
                self.h.mesaj_ekle(oid, "yz", "arastirma", ad, arastirma)
            except UretimHatasi as e:
                self.h.mesaj_ekle(oid, "sistem", "uyari", "", str(e))
        # 2. fikir: hazır motorlar aynı anda
        fikir_sis = self._sistem("FİKİR", o, "3 farklı açı öner. Her biri: kanca cümlesi (ilk 3 saniye), "
                                 "neden dikkat çeker, tersine çevrilen bilinen bilgi. Kısa yaz.")
        fikir_mesaj = istek + ("\n\nARAŞTIRMA NOTLARI:\n" + arastirma if arastirma else "")
        fikirciler = self._hazir("fikir")[:3]
        fikirler = []
        with ThreadPoolExecutor(max_workers=3) as hav:
            isler = {hav.submit(m.yaz, fikir_sis, fikir_mesaj, 0.9): m for m in fikirciler}
            for is_, m in isler.items():
                try:
                    f = is_.result()
                    fikirler.append(f"[{m.ad}]\n{f}")
                    self.h.mesaj_ekle(oid, "yz", "fikir", m.ad, f)
                except motorlar.MotorHatasi as e:
                    self.h.gunluk("motor_hatasi", f"fikir · {m.ad} · {e}")
        # 3. yazım
        yaz_mesaj = (fikir_mesaj + "\n\nEKİBİN FİKİRLERİ:\n" + "\n\n".join(fikirler) +
                     "\n\nEn güçlü açıyı seç (gerekirse birleştir) ve tam içeriği yaz.\n\n" + self._cikti(o))
        yazar, taslak = self._cagir("yazar", self._sistem("YAZAR", o), yaz_mesaj)
        self.h.mesaj_ekle(oid, "yz", "taslak", yazar, taslak)
        # 4. eleştiri (mümkünse farklı bir motor)
        try:
            el_ad, elestiri = self._cagir(
                "elestirmen", self._sistem("ELEŞTİRMEN", o, "Taslağı kaynak dosyalardaki kurallara, hafızadaki "
                                           "tercih/yasaklara ve platform kurallarına göre denetle. Yanlış ya da "
                                           "kaynaksız iddiaları, zayıf kancayı, telif riskini madde madde yaz. "
                                           "Yalnız düzeltme listesi ver."), taslak, haric=(yazar,), sicaklik=0.3)
            self.h.mesaj_ekle(oid, "yz", "elestiri", el_ad, elestiri)
            # 5. düzeltme
            _, son = self._cagir("yazar", self._sistem("YAZAR", o),
                                 f"TASLAK:\n{taslak}\n\nELEŞTİRİ:\n{elestiri}\n\nEleştiriyi uygula ve içeriğin son "
                                 f"halini aynı bölümlerle yaz.\n\n{self._cikti(o)}", haric=())
        except UretimHatasi:
            el_ad, elestiri, son = "", "", taslak
        self.h.mesaj_ekle(oid, "yz", "son", yazar, son)
        return self.oturum_ozeti(oid)

    def geri_bildirim(self, oid, metin):
        o = self._oturum(oid)
        onceki = self.h.son_mesaj(oid, "son")
        if not onceki:
            raise UretimHatasi("Önce içerik üretin.")
        self.h.mesaj_ekle(oid, "kullanici", "geri_bildirim", "", metin)
        ad, son = self._cagir("yazar", self._sistem("YAZAR", o),
                              f"MEVCUT İÇERİK:\n{onceki['icerik']}\n\nKULLANICININ İSTEĞİ:\n{metin}\n\n"
                              f"İsteği uygula, içeriğin tamamını aynı bölümlerle yeniden yaz.\n\n{self._cikti(o)}")
        self.h.mesaj_ekle(oid, "yz", "son", ad, son)
        return self.oturum_ozeti(oid)

    def elle_paket(self, oid):
        """Claude (ya da API'si olmayan başka bir yapay zekâ) için kopyalanacak tam paket."""
        o = self._oturum(oid)
        onceki = self.h.son_mesaj(oid, "son")
        notlar = "\n\n".join(f"[{m['asama']} · {m['motor']}]\n{m['icerik']}" for m in self.h.mesajlar(oid)
                             if m["asama"] in ("arastirma", "fikir", "elestiri", "geri_bildirim"))
        gorev = ("Mevcut içeriği ekibin notlarına göre iyileştir." if onceki else "İçeriği yaz.")
        return (f"{self._sistem('YAZAR', o)}\n\n---\nKONU: {o['konu']}\n\nEKİP NOTLARI:\n{notlar or '-'}\n\n"
                + (f"MEVCUT İÇERİK:\n{onceki['icerik']}\n\n" if onceki else "") + f"{gorev}\n\n{self._cikti(o)}")

    def elle_yanit(self, oid, metin, motor="claude-elle"):
        self._oturum(oid)
        if not metin.strip():
            raise UretimHatasi("Cevap boş.")
        self.h.mesaj_ekle(oid, "yz", "son", motor, metin.strip())
        return self.oturum_ozeti(oid)

    def onayla(self, oid, puan=None, notlar=""):
        o = self._oturum(oid)
        son = self.h.son_mesaj(oid, "son")
        if not son:
            raise UretimHatasi("Onaylanacak içerik yok.")
        d = denetim.denetle(son["icerik"], o["platform"])
        if not d["gecti"]:
            raise UretimHatasi("Denetimden geçmedi: " + "; ".join(d["engel"]))
        kullanilan = sorted({m["motor"] for m in self.h.mesajlar(oid) if m["motor"]})
        iid = self.h.icerik_kaydet(oid, o["platform"], o["dil"], o["format"], o["konu"], son["icerik"],
                                   ",".join(kullanilan), puan, notlar)
        self.h.mesaj_ekle(oid, "kullanici", "onay", "", f"İçerik onaylandı. Puan: {puan or '-'}. Not: {notlar or '-'}")
        return iid

    # ---- kapanış: öğren, kaydet, sohbeti sil
    def kapat(self, oid):
        o = self._oturum(oid)
        msj = self.h.mesajlar(oid)
        dokum, toplam = [], 0
        for m in msj:
            etiket = "GERİ BİLDİRİM" if m["asama"] == "geri_bildirim" else f"{m['asama'].upper()} ({m['motor'] or m['rol']})"
            parca = f"{etiket}: {m['icerik'][:1500]}"
            if toplam + len(parca) > 24000:
                break
            dokum.append(parca)
            toplam += len(parca)
        mevcut = ", ".join(y["ad"] for y in self.h.yetenekler(sadece_aktif=True))[:3000]
        sistem = ("GÖREV: DAMITMA\nAşağıdaki içerik üretim sohbetinden, gelecekteki sohbetlerde işe yarayacak kalıcı "
                  "dersleri çıkar. YALNIZ JSON döndür:\n"
                  '{"ozet":"2 cümle","yetenekler":[{"tur":"yetenek|tercih|yasak","ad":"kısa ad","aciklama":"ne zaman '
                  've nasıl uygulanır","ornek":"kısa örnek","platform":"' + o["platform"] + ' ya da hepsi"}]}\n'
                  "Kurallar: Kullanıcının düzeltmeleri ve istekleri 'tercih' ya da 'yasak'tır. İşe yarayan kanca, yapı, "
                  "ton kalıpları 'yetenek'tir. Yalnız bu sohbete özgü ayrıntıyı (tek bir konunun bilgisi) yazma. "
                  "En çok 8 madde. Şifre, anahtar, kişisel veri yazma.\nMEVCUT KAYITLAR (aynısını ekleme, "
                  f"gerekirse aynı adla güncelle): {mevcut or '-'}")
        ogrenilen, ozet = [], ""
        try:
            ad, cevap = self._cagir("damitici", sistem, f"PLATFORM: {o['platform']} · KONU: {o['konu']}\n\n" +
                                    "\n\n".join(dokum), sicaklik=0.2)
            j = _json_bul(cevap) or {}
            ozet = str(j.get("ozet", ""))[:600]
            for y in (j.get("yetenekler") or [])[:8]:
                if isinstance(y, dict) and self.h.yetenek_ekle(y.get("tur", "yetenek"), str(y.get("ad", "")),
                                                                str(y.get("aciklama", "")), str(y.get("ornek", "")),
                                                                str(y.get("platform", "hepsi")), oid):
                    ogrenilen.append(f"[{y.get('tur')}] {y.get('ad')}")
        except UretimHatasi as e:
            self.h.gunluk("damitma_hatasi", str(e))
        # Motor çalışmasa da kullanıcının düzeltmeleri kaybolmaz.
        if not ogrenilen:
            for m in msj:
                if m["asama"] == "geri_bildirim":
                    if self.h.yetenek_ekle("tercih", "Düzeltme: " + m["icerik"][:70], m["icerik"], "",
                                           o["platform"], oid):
                        ogrenilen.append("[tercih] " + m["icerik"][:70])
        ozet = ozet or f"{o['platform']} · {o['konu']}"
        silinen = self.h.oturum_kapat(oid, ozet)
        self.h.gunluk("oturum_kapandi", f"#{oid} {o['platform']} · {o['konu']}\nÖğrenilen: "
                      f"{'; '.join(ogrenilen) or 'yeni ders yok'}\n{silinen} mesaj silindi.")
        self.hafiza_disa_aktar()
        return {"ozet": ozet, "ogrenilen": ogrenilen, "silinen_mesaj": silinen, "arsiv_gun": ayarlar.arsiv_gun()}

    # ---- tampon araçları (ses, video taslağı)
    def arac_isi(self, iid, tur, ses=""):
        ic = self.h.icerik(iid)
        if not ic:
            raise UretimHatasi("İçerik bulunamadı.")
        terimler = []
        if tur == "video":
            metin = arac.seslendirme_metni(ic["metin"])
            sahne = denetim.bolumler(ic["metin"]).get("sahneler", "")
            try:
                _, c = self._cagir("fikir", "GÖREV: GÖRSEL ARAMA\nKısa bir video için Wikimedia Commons arama terimleri "
                                   "yaz. Her 1-2 cümleye bir terim, İngilizce, 2-4 kelime; tarihi tablo, gravür, harita, "
                                   "el yazması ya da gerçek yer/nesne hedefle. Soyut kelime kullanma. YALNIZ JSON liste "
                                   'döndür: ["...", "..."]', f"KONU: {ic['konu']}\nCÜMLELER:\n{metin}\nSAHNELER:\n{sahne}",
                                   sicaklik=0.2)
                m = re.search(r"\[.*\]", c, re.S)
                terimler = [str(x) for x in json.loads(m.group(0))] if m else []
            except (UretimHatasi, json.JSONDecodeError):
                terimler = []
            terimler = terimler or [ic["konu"]]
        try:
            j = arac.is_olustur(ic, tur, ses, terimler)
        except ValueError as e:
            raise UretimHatasi(str(e)) from None
        self.h.gunluk("arac_isi", f"{tur} · içerik #{iid} · {ic['konu']} · iş {j['id']}")
        return j

    def hafiza_disa_aktar(self):
        yol = ayarlar.veri_dizin() / "HAFIZA.md"
        yol.write_text(self.h.markdown(), encoding="utf-8")
        return yol

    def oturum_ozeti(self, oid):
        o = self.h.oturum(oid)
        msj = self.h.mesajlar(oid)
        son = next((m for m in reversed(msj) if m["asama"] == "son"), None)
        return {"oturum": o, "mesajlar": msj, "son": son["icerik"] if son else "",
                "son_motor": son["motor"] if son else "",
                "denetim": denetim.denetle(son["icerik"], o["platform"]) if son else None}
