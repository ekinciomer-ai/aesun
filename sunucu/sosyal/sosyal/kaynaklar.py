"""Kullanıcının verdiği MD dosyaları (kaynak klasörü). Her dosya başlıklarına göre bölümlere ayrılır.
Kural/telif/güvenlik bölümleri her üretimde yer alır; diğer bölümler konuya göre seçilir."""
import re
from pathlib import Path

from . import ayarlar

SABIT = re.compile(r"kural|yasak|telif|güvenlik|guvenlik|kesin|motto|metin|kararlaştır|konu seçimi", re.I)
BUTCE = 16000  # bağlama girecek kaynak metni üst sınırı (karakter)
HEDEF = "hedef_kitle.md"  # her üretimde: "Ortak" bölümü + seçilen dilin bölümü tam olarak (bütçe dışı)
ANIM = "animasyon_formatlari.md"  # animasyon format kütüphanesi: seçilen format tam olarak girer (bütçe dışı)


def _anim_bolumleri():
    yol = ayarlar.kaynak_dizin() / ANIM
    return bolumler(yol) if yol.exists() else []


def _sade(s):
    return re.sub(r"\s*\(.*?\)", "", s).replace("Format:", "").strip().lower()


def animasyon_formatlari():
    """Kütüphanedeki format adları (ekrandaki seçim listesi için)."""
    return [re.sub(r"\s*\(.*?\)", "", b["baslik"][len("Format:"):]).strip()
            for b in _anim_bolumleri() if b["baslik"].startswith("Format:")]


def animasyon_formati(format_: str, konu: str = ""):
    """Format bir animasyon formatıysa (ya da konu animasyon istiyorsa) ilgili bölümleri döndürür; değilse ''."""
    f = (format_ or "").lower()
    eslesen = [b for b in _anim_bolumleri() if b["baslik"].startswith("Format:") and _sade(b["baslik"]) in f]
    istendi = eslesen or "animasyon" in f or "animasyon" in (konu or "").lower()
    if not istendi:
        return ""
    ortak = [b for b in _anim_bolumleri() if b["baslik"] in ("Format seçimi", "Üretim paketi")]
    return "\n\n".join(b["metin"] for b in eslesen + ortak)


def hedef_kitle(dil: str) -> str:
    yol = ayarlar.kaynak_dizin() / HEDEF
    if not yol.exists():
        return ""
    s = [b["metin"] for b in bolumler(yol) if b["baslik"].lower().startswith("ortak") or b["baslik"].upper() == dil.upper()]
    giris = next((b["metin"] for b in bolumler(yol) if b["baslik"] == b["ust"]), "")
    return "\n\n".join([giris, *s]).strip()


def dosyalar():
    d = ayarlar.kaynak_dizin()
    return sorted(p for p in d.rglob("*.md") if p.name.lower() != "readme.md")


def liste():
    return [{"ad": p.name, "boyut": p.stat().st_size, "bolum": len(bolumler(p))} for p in dosyalar()]


def bolumler(yol: Path):
    metin = yol.read_text(encoding="utf-8", errors="ignore")
    metin = re.sub(r"\A---\n.*?\n---\n", "", metin, flags=re.S)  # ön bilgi (frontmatter)
    baslik = re.search(r"^# (.+)$", metin, re.M)
    ust = baslik.group(1).strip() if baslik else yol.stem
    parcalar = re.split(r"^(?=## )", metin, flags=re.M)
    sonuc = []
    for p in parcalar:
        p = p.strip()
        if not p:
            continue
        b = re.match(r"## (.+)", p)
        sonuc.append({"dosya": yol.name, "ust": ust, "baslik": b.group(1).strip() if b else ust, "metin": p})
    return sonuc


def baglam(konu: str, butce: int = BUTCE) -> str:
    hepsi = [b for p in dosyalar() if p.name not in (HEDEF, ANIM) for b in bolumler(p)]
    if not hepsi:
        return ""
    k = {w for w in re.findall(r"\w+", konu.lower()) if len(w) > 2}

    def puan(b):
        kelime = set(re.findall(r"\w+", (b["baslik"] + " " + b["metin"]).lower()))
        return len(k & kelime) / (1 + len(b["metin"]) / 3000)

    sabit = [b for b in hepsi if SABIT.search(b["baslik"])]
    diger = sorted((b for b in hepsi if b not in sabit), key=puan, reverse=True)
    secilen, toplam = [], 0
    for b in sabit + diger:
        parca = b["metin"][:5000]
        if toplam + len(parca) > butce:
            continue
        secilen.append(f"[{b['dosya']} › {b['baslik']}]\n{parca}")
        toplam += len(parca)
    return "\n\n".join(secilen)


def kaydet(ad: str, icerik: bytes) -> str:
    """Arayüzden yüklenen MD dosyasını kaynak klasörüne yazar. Aynı adlı dosya varsa eskisi .bak olarak saklanır."""
    temiz = re.sub(r"[^\w.\- ]", "_", Path(ad).name).strip() or "kaynak.md"
    if not temiz.lower().endswith(".md"):
        temiz += ".md"
    hedef = ayarlar.kaynak_dizin() / temiz
    if hedef.exists():
        hedef.replace(hedef.with_suffix(".md.bak"))
    hedef.write_bytes(icerik[:500_000])
    return temiz
