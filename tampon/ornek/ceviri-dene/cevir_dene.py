# Örnek açıklamaları opus-mt ile Türkçeye çevirir (Çince önce İngilizceye). Süre ve sonuç yazılır.
import json, os, re, sys, time
from transformers import MarianMTModel, MarianTokenizer
src = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]
def yukle(ad):
    return MarianTokenizer.from_pretrained(ad), MarianMTModel.from_pretrained(ad)
def cevir(tm, metinler, bs=16):
    tok, m = tm; s = []
    for i in range(0, len(metinler), bs):
        b = tok(metinler[i:i+bs], return_tensors="pt", padding=True, truncation=True, max_length=256)
        s += tok.batch_decode(m.generate(**b, num_beams=4, max_new_tokens=256), skip_special_tokens=True)
    return s
t0 = time.time()
cjk = [i for i, x in enumerate(src) if re.search(r"[一-鿿]", x)]
ara = list(src)
if cjk:
    zh = yukle("Helsinki-NLP/opus-mt-zh-en")
    for i, e in zip(cjk, cevir(zh, [src[i] for i in cjk])): ara[i] = e
t1 = time.time(); en = yukle("Helsinki-NLP/opus-mt-tc-big-en-tr"); t2 = time.time()
trs = cevir(en, ara); t3 = time.time()
json.dump({"model_yukleme_sn": round(t2 - t1, 1), "ceviri_sn": round(t3 - t2, 1), "adet": len(src),
           "sonuc": [{"orijinal": a, "ara_en": (b if b != a else None), "tr": c} for a, b, c in zip(src, ara, trs)]},
          open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(src)} çeviri, {t3-t2:.1f} sn (model yükleme {t2-t1:.1f} sn, çince ara adım {t1-t0:.1f} sn)")
