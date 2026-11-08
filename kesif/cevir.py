"""Keşif kataloğundaki araç açıklamalarını Türkçeye çevirir (docs/kesif/katalog.json üzerinde, yerinde).

- Ücretsiz ve yerel: Helsinki-NLP opus-mt (CC-BY 4.0) modelleri GitHub makinesinde çalışır; dışarıya metin gönderilmez.
- Önbellek: kesif/ceviri_tr.json {orijinal: türkçe}. Her gün yalnız yeni açıklamalar çevrilir.
- Orijinal metin kayıtta "a_en" alanında kalır (sayfa aramada ve ayrıntıda kullanır).
- Türkçe yazılmış açıklamalara (öneriler) dokunulmaz.
- Çince açıklama: içinde İngilizce bölüm varsa o çevrilir, yoksa önce İngilizceye sonra Türkçeye.
Kullanım: python3 kesif/cevir.py [--sinir N]   (N: bu çalıştırmada en çok kaç yeni açıklama; varsayılan sınırsız)
"""
import json, os, re, sys, time

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KATALOG = os.path.join(KOK, "docs", "kesif", "katalog.json")
ONBELLEK = os.path.join(KOK, "kesif", "ceviri_tr.json")
TR_HARF = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
CJK = re.compile(r"[぀-ヿ一-鿿가-힯]")
# Makine çevirisinin bilinen tuhaflıkları için düzeltme sözlüğü (çeviriden SONRA uygulanır)
DUZELT = [
    (r"\b([Üü])cretsiz (?:bir )?(aylık |yıllık )?katman(?:a sahip|ına sahip|ı|la|lı|a)?\b", r"\1cretsiz \2kullanım planlı"),
    (r"\bkatman(?:a sahip|ı)? \b(?=ücretsiz)", ""),
    (r"\bkazıyın\b", "veri toplayın"), (r"\bkazıma\b", "veri toplama"), (r"\bkazımalar\b", "veri toplamalar"),
    (r"\bsürün,", "tarayın,"), (r"\bişaretleme\b", "Markdown"), (r"\b[Mm]etadata\b", "üst veri"),
    (r"\bAI'(?:dan|den) ", "yapay zekâdan "), (r"\bajansl", "etkenl"), (r"\bTTS\b", "seslendirme (TTS)"),
    (r"\bkendi kendine barındırılan\b", "kendi sunucumuzda çalışan"), (r"\bkendinden barındırılan\b", "kendi sunucumuzda çalışan"),
]


def turkce_mi(s):
    return bool(TR_HARF.search(s)) and not CJK.search(s)


def ingilizce_parca(s):
    """Karışık (Çince+İngilizce) açıklamadaki en uzun İngilizce bölüm."""
    parcalar = re.split(r"\s*[|／/｜—–]\s*|[。！？]", s)
    adaylar = [p.strip() for p in parcalar if len(p.strip()) >= 20 and not CJK.search(p)]
    return max(adaylar, key=len) if adaylar else None


def _ai(m):
    onceki = m.group(1) or ""
    # "Mistral AI", "Stability AI" gibi özel adlara dokunma: önceki kelime büyük harfle başlıyorsa olduğu gibi bırak
    if onceki and onceki[0].isupper() and onceki.lower() not in ("için", "ve", "bir"):
        return m.group(0)
    return (onceki + " " if onceki else "") + "yapay zekâ"


def duzelt(t):
    t = re.sub(r"(?:(\S+) )?\bAI\b(?= destekli| ajan| kodlama| model| araç| tabanlı| ile| tarafından| video| görsel)", _ai, t)
    for a, b in DUZELT:
        t = re.sub(a, b, t)
    return re.sub(r"\s{2,}", " ", t).strip()


def main():
    sinir = int(sys.argv[sys.argv.index("--sinir") + 1]) if "--sinir" in sys.argv else None
    kat = json.load(open(KATALOG, encoding="utf-8"))
    try:
        onb = json.load(open(ONBELLEK, encoding="utf-8"))
    except Exception:
        onb = {}

    gerek = []
    for x in kat["kayit"]:
        orj = x.get("a_en") or x.get("a") or ""
        if not orj or x.get("k") == "oneri" or turkce_mi(orj):
            continue
        if orj not in onb and orj not in gerek:
            gerek.append(orj)
    if sinir is not None:
        gerek = gerek[:sinir]
    print(f"çevrilecek yeni açıklama: {len(gerek)} (önbellekte {len(onb)})")

    if gerek:
        from transformers import MarianMTModel, MarianTokenizer

        def yukle(ad):
            return MarianTokenizer.from_pretrained(ad), MarianMTModel.from_pretrained(ad)

        def cevir(tm, metinler, bs=24):
            tok, m = tm
            s = []
            for i in range(0, len(metinler), bs):
                b = tok(metinler[i:i + bs], return_tensors="pt", padding=True, truncation=True, max_length=200)
                s += tok.batch_decode(m.generate(**b, num_beams=3, max_new_tokens=220), skip_special_tokens=True)
                if (i // bs) % 10 == 0:
                    print(f"  {min(i + bs, len(metinler))}/{len(metinler)}", flush=True)
            return s

        ara = {}
        zh_gerek = []
        for o in gerek:
            if CJK.search(o):
                p = ingilizce_parca(o)
                if p:
                    ara[o] = p
                else:
                    zh_gerek.append(o)
            else:
                ara[o] = o
        if zh_gerek:
            zh = yukle("Helsinki-NLP/opus-mt-zh-en")
            for o, e in zip(zh_gerek, cevir(zh, zh_gerek)):
                ara[o] = e
        t0 = time.time()
        en = yukle("Helsinki-NLP/opus-mt-tc-big-en-tr")
        sira = list(ara)
        for o, t in zip(sira, cevir(en, [ara[o] for o in sira])):
            onb[o] = duzelt(t)
        print(f"çeviri süresi: {time.time() - t0:.0f} sn")
        json.dump(onb, open(ONBELLEK, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)

    n = 0
    for x in kat["kayit"]:
        orj = x.get("a_en") or x.get("a") or ""
        if orj in onb:
            x["a_en"], x["a"] = orj, onb[orj]
            n += 1
    kat["ceviri"] = {"kaynak": "Helsinki-NLP opus-mt (CC-BY 4.0), makine çevirisi", "turkce": n}
    json.dump(kat, open(KATALOG, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"Türkçe açıklamalı kayıt: {n}/{len(kat['kayit'])}")


if __name__ == "__main__":
    main()
