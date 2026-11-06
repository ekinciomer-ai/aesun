"""Tampon araçlarına iş gönderme (ses, video taslağı). Program yalnız kuyruğa iş yazar ve sonucu okur;
araçları sunucudaki işçi (arac/isci.py) yalıtılmış kapsayıcılarda çalıştırır."""
import json
import os
import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path

from . import ayarlar, denetim

IZINLI_DOSYA = {"ses.mp3", "video.mp4", "kaynaklar.json"}


def kok() -> Path:
    d = Path(os.getenv("SOSYAL_KUYRUK", str(ayarlar.veri_dizin() / "kuyruk")))
    (d / "bekleyen").mkdir(parents=True, exist_ok=True)
    (d / "cikti").mkdir(parents=True, exist_ok=True)
    return d


def seslendirme_metni(icerik: str) -> str:
    """İçeriğin '## Metin' bölümünü seslendirmeye hazırlar: köşeli/parantezli yönergeler ve Markdown atılır."""
    b = denetim.bolumler(icerik)
    m = next((v for k, v in b.items() if any(a in k for a in ("metin", "seslendirme", "script", "texto"))), "")
    m = re.sub(r"\[[^\]]*\]|\([^)]*(sn|saniye|sahne|müzik|ses efekti)[^)]*\)", "", m, flags=re.I)
    m = re.sub(r"[*_#>`]", "", m)
    return re.sub(r"\s+", " ", m).strip()


def araclar_durumu():
    try:
        return json.loads((kok() / "araclar.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


STIL_ON = ("2D cartoon illustration, vivid bright colors, clean bold outlines, expressive friendly characters, "
           "historically accurate clothing and setting for the era, vertical composition")
STIL_SON = "No text, no letters, no logos, no watermark."
CIZGI = re.compile(r"çizgi|animasyon|cartoon|anime|illüstrasyon|illustrasyon|çizim|karikatür|2d", re.I)


def otomatik_stil(icerik: dict) -> str:
    return "cizgi" if CIZGI.search(f"{icerik.get('konu', '')} {icerik.get('format', '')}") else "tarihi"


def sahne_istemleri(icerik_metni: str):
    """'## Sahneler' bölümündeki İngilizce görsel istemlerini ayıklar (stil önekleri sonra eklenir)."""
    b = denetim.bolumler(icerik_metni)
    sahne = next((v for k, v in b.items() if "sahne" in k or "scene" in k), "")
    l = []
    for satir in sahne.splitlines():
        m = re.search(r"(?:görsel istemi|ingilizce istem|image prompt|prompt|istem)\s*\**\s*[:：]\s*\**\s*(.+)", satir, re.I)
        if m:
            t = re.sub(r"[*_`]", "", m.group(1)).strip().strip('"')
            t = re.sub(r"\s*no text,? no letters.*$", "", t, flags=re.I).strip(" .")
            if len(t) > 15:
                l.append(t)
    return l


def cizim_istemi(sahne: str) -> str:
    return f"{STIL_ON}. {sahne}. {STIL_SON}"


def is_olustur(icerik: dict, tur: str, ses: str = "", terimler=None, konu_en: str = "", stil: str = "", istemler=None):
    if tur not in ("ses", "video"):
        raise ValueError("İş türü ses ya da video olmalı.")
    if icerik.get("dil") not in denetim.DILLER:
        raise ValueError("Dil desteklenmiyor.")
    if any(x["icerik_id"] == icerik["id"] and x["tur"] == tur and x["durum"] in ("bekliyor", "isleniyor") for x in isler(100)):
        raise ValueError(("Ses" if tur == "ses" else "Video") + " işi bu içerik için zaten sırada ya da hazırlanıyor.")
    metin = seslendirme_metni(icerik["metin"])
    if len(metin) < 20:
        raise ValueError("İçerikte seslendirilecek '## Metin' bölümü bulunamadı.")
    iid = f"{time.strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(3)}"
    j = {"id": iid, "tur": tur, "icerik_id": icerik["id"], "dil": icerik["dil"], "konu": icerik["konu"],
         "metin": metin, "ses": ses, "terimler": list(terimler or [])[:12], "konu_en": konu_en,
         "stil": stil if stil in ("cizgi", "tarihi") else "tarihi", "istemler": list(istemler or [])[:12],
         "zaman": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    hedef = kok() / "bekleyen" / f"{iid}.json"
    gecici = hedef.with_suffix(".tmp")
    gecici.write_text(json.dumps(j, ensure_ascii=False), encoding="utf-8")
    gecici.replace(hedef)
    return j


def isler(limit=30):
    k = kok()
    sonuc = []
    for f in sorted((k / "bekleyen").glob("*.json"), reverse=True):
        j = json.loads(f.read_text(encoding="utf-8"))
        sonuc.append({**_ozet(j), "durum": "bekliyor"})
    for d in sorted((k / "cikti").iterdir(), reverse=True)[:limit]:
        try:
            j = json.loads((d / "is.json").read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            j = {"id": d.name}
        try:
            durum = json.loads((d / "durum.json").read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            durum = {"durum": "isleniyor"}
        dosyalar = [x for x in durum.get("dosyalar", []) if x in IZINLI_DOSYA and (d / x).exists()]
        if durum.get("durum") == "bitti" and not (durum.get("kalite") or {}).get("gecti", True):
            durum["durum"] = "kapıdan geçmedi"
        sonuc.append({**_ozet(j), **{k_: durum.get(k_) for k_ in ("durum", "mesaj", "kalite", "lisans", "sure_sn", "basla", "gorsel_ozet")},
                      "dosyalar": dosyalar})
    return sonuc[:limit]


def _ozet(j):
    return {k: j.get(k) for k in ("id", "tur", "icerik_id", "dil", "konu", "ses", "zaman", "stil")}


def iptal(iid: str) -> bool:
    """Sıradaki işi iptal eder: silinmez, iptal/ klasörüne taşınır. Başlamış iş iptal edilemez."""
    if not re.fullmatch(r"[0-9]{14}_[0-9a-f]{6}", iid):
        return False
    k = kok()
    (k / "iptal").mkdir(exist_ok=True)
    try:
        (k / "bekleyen" / f"{iid}.json").replace(k / "iptal" / f"{iid}.json")
        return True
    except FileNotFoundError:
        return False


def dosya_yolu(iid: str, ad: str):
    if not re.fullmatch(r"[0-9]{14}_[0-9a-f]{6}", iid) or ad not in IZINLI_DOSYA:
        return None
    y = kok() / "cikti" / iid / ad
    return y if y.is_file() else None
