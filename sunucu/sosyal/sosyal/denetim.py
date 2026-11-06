"""Yayın öncesi denetim: platform sınırları, YZ etiketi, kaynak, telif riski. Engel varsa içerik onaylanamaz."""
import re

PLATFORMLAR = {
    "youtube_shorts": {"ad": "YouTube Shorts", "baslik": 60, "kelime": (80, 130),
                       "kural": "30–45 sn dikey video, 90–120 kelime. Başlık en çok 60 karakter ve #shorts içerir."},
    "youtube_uzun": {"ad": "YouTube uzun video", "baslik": 100, "kelime": (1000, 1700),
                     "kural": "8–10 dk anlatım; bölümler, her bölüm bir soruyla biter."},
    "tiktok": {"ad": "TikTok", "baslik": 150, "kelime": (80, 140),
               "kural": "30–60 sn dikey video; ilk 1 saniyede yazılı kanca. Açıklama kısa, 3–5 etiket."},
    "instagram_reels": {"ad": "Instagram Reels", "baslik": 150, "kelime": (80, 140), "etiket": 8,
                        "kural": "30–60 sn dikey video; açıklamada bağlantı olmaz, 3–8 etiket."},
    "instagram_gonderi": {"ad": "Instagram gönderi/karusel", "baslik": 150, "kelime": (40, 300), "etiket": 8,
                          "kural": "Karusel: 5–8 kart, her kartta tek fikir; açıklama 2200 karakteri geçmez."},
    "x": {"ad": "X (Twitter)", "karakter": 280, "kelime": (5, 60),
          "kural": "Tek gönderi en çok 280 karakter; gerekiyorsa numaralı dizi (flood)."},
    "linkedin": {"ad": "LinkedIn", "karakter": 3000, "kelime": (60, 400),
                 "kural": "Profesyonel ton, ilk iki satır kanca, en çok 3 etiket."},
    "facebook": {"ad": "Facebook", "karakter": 5000, "kelime": (30, 400), "kural": "Sohbet tonunda, soru ile biter."},
}
DILLER = {"tr": "Türkçe", "en": "İngilizce", "es": "İspanyolca"}
TELIF = re.compile(r"\b(logo|arma|amblem|maç görüntüsü|mac goruntusu|ajans fotoğraf|basın fotoğraf|"
                   r"match footage|club crest|press photo|watermark)\b", re.I)
YZ = re.compile(r"yapay zek|\bYZ\b|\bAI\b|sentetik|synthetic|inteligencia artificial|\bIA\b", re.I)


def bolumler(metin: str) -> dict:
    """'## Başlık' biçimindeki bölümleri sözlüğe çevirir (anahtarlar küçük harf)."""
    b, ad = {}, "_"
    for satir in (metin or "").splitlines():
        m = re.match(r"^#{2,3}\s*(.+?)\s*:?\s*$", satir)
        if m:
            ad = m.group(1).strip().lower()
            b[ad] = ""
        else:
            b[ad] = b.get(ad, "") + satir + "\n"
    return {k: v.strip() for k, v in b.items()}


def _bul(b, *adlar):
    for k, v in b.items():
        if any(a in k for a in adlar):
            return v
    return ""


def denetle(metin: str, platform: str) -> dict:
    kural = PLATFORMLAR.get(platform, {})
    b = bolumler(metin)
    engel, uyari = [], []
    govde = _bul(b, "metin", "seslendirme", "gönderi", "gonderi", "script", "texto") or metin
    baslik = _bul(b, "başlık", "baslik", "title", "título")
    aciklama = _bul(b, "açıklama", "aciklama", "description", "descripción")
    kaynak = _bul(b, "kaynak", "source", "fuente")
    sahne = _bul(b, "sahne", "görsel", "gorsel", "scene", "escena")
    etiket = _bul(b, "etiket", "hashtag")

    if not govde.strip():
        engel.append("Metin bölümü boş.")
    kelime = len(re.findall(r"\w+", govde))
    alt, ust = kural.get("kelime", (0, 10 ** 6))
    if kelime and not (alt <= kelime <= ust):
        uyari.append(f"Metin {kelime} kelime; bu platform için {alt}–{ust} önerilir.")
    if kural.get("karakter") and len(govde) > kural["karakter"]:
        engel.append(f"Metin {len(govde)} karakter; sınır {kural['karakter']}.")
    ilk_satir = baslik.splitlines()[0] if baslik else ""
    if kural.get("baslik") and len(ilk_satir) > kural["baslik"]:
        uyari.append(f"Başlık {len(ilk_satir)} karakter; en çok {kural['baslik']} olmalı.")
    if platform == "youtube_shorts" and baslik and "#shorts" not in (baslik + aciklama + etiket).lower():
        uyari.append("#shorts etiketi yok.")
    if re.search(r"\b(TR|EN|ES)\b", ilk_satir):
        uyari.append("Başlıkta dil kısaltması (TR/EN/ES) olmamalı.")
    n_etiket = len(re.findall(r"#\w+", etiket + " " + aciklama))
    if kural.get("etiket") and n_etiket > kural["etiket"]:
        uyari.append(f"{n_etiket} etiket var; {kural['etiket']} ve altı önerilir.")
    if platform.startswith(("youtube", "tiktok", "instagram")) and not YZ.search(aciklama + metin[-600:]):
        uyari.append("Açıklamada yapay zekâ/sentetik içerik notu yok.")
    if not kaynak.strip() or re.search(r"doğrulanacak|dogrulanacak|kontrol et|\?\?", kaynak, re.I):
        uyari.append("Kaynaklar eksik ya da doğrulanmamış: her tarih ve rakam ikinci kez kontrol edilmeli.")
    if TELIF.search(sahne + " " + govde) and not re.search(r"no logos?|logo yok|logosuz", sahne, re.I):
        uyari.append("Görsel tarifinde telif riski olabilecek öğe (logo/arma/maç/ajans fotoğrafı) geçiyor.")
    if sahne and re.search(r"prompt|istem", sahne, re.I) and not re.search(r"no text", sahne, re.I):
        uyari.append("Görsel istemlerine 'No text, no letters, no logos, no watermark' eklenmeli.")
    return {"gecti": not engel, "engel": engel, "uyari": uyari, "kelime": kelime}
