# Ezgi ve Dede: kelimeler.json'dan sahne sınırlarını ve olay anlarını hesaplar → olaylar.json.
# Çizim (src/ezgi_dede) ve efekt sesleri (muzik/ezgi_ses.py) aynı dosyayı kullanır.
import json
K = json.load(open("public/ezgi_dede/kelimeler.json", encoding="utf-8"))
L = {}
for k in K:
    l = L.setdefault(k["c"], {"s": k["s"], "e": k["e"], "k": k["k"]}); l["e"] = k["e"]
s = lambda c: L[c]["s"]; e = lambda c: L[c]["e"]
SON = e(max(L)) + 3.2
sahneler = [("araba", 0, s(4)), ("ekmek", s(4), s(7)), ("gol", s(7), s(10)), ("cay", s(10) - 0.6, s(14)),
            ("selfie", s(14), e(16) + 0.2), ("simit", e(16) + 0.2, s(20)), ("gunbatimi", s(20), e(23)), ("kapanis", e(23), SON)]
# sahne başlangıçlarını bir öncekinin sonuna eşitle (boşluk kalmasın)
sh = []
for i, (ad, b, son) in enumerate(sahneler):
    b = sh[-1]["son"] if sh else 0
    sh.append({"ad": ad, "bas": round(b, 3), "son": round(son, 3)})
p2, p5, p8, p12, p15, p18, p21, p23 = (L[i] for i in (2, 5, 8, 12, 15, 18, 21, 23))
o = {
    "kasKalk": p2["e"] - 0.7,
    "yelekAc": p5["s"] + 0.15, "esya": [p5["s"] + 0.6 + i * 0.38 for i in range(4)], "avm": s(6) + 0.3,
    "kos": s(7), "kac": s(7) + 0.5, "tak": p8["s"] + 0.35, "dizil": p8["s"] + 0.6, "selam": p8["s"] + 1.9,
    "ufle": s(10) - 0.55, "yudum": s(10) - 0.1, "ezgiYudum": s(11) + 0.35, "yan": s(11) + 0.9, "pecete": p12["s"] + 0.1,
    "flas": [p15["s"] + 0.35, p15["s"] + 1.05, p15["s"] + 1.75], "reisGir": p15["s"] + 1.45,
    "kap": sh[5]["bas"] + 0.15, "firla": s(17) + 0.1, "dedeYudum": p18["s"] + 0.1, "yedek": p18["s"] + 0.8,
    "omuz": s(20) + 0.2, "dedeKonus": s(22), "sasir": p23["s"] + 0.1, "goz": p23["s"] + 1.0,
}
satirlar = [{"c": c, "s": round(v["s"], 3), "e": round(v["e"], 3), "k": v["k"]} for c, v in sorted(L.items())]
json.dump({"son": round(SON, 3), "sahneler": sh, "o": {k: (round(v, 3) if not isinstance(v, list) else [round(x, 3) for x in v]) for k, v in o.items()},
           "satirlar": satirlar}, open("public/ezgi_dede/olaylar.json", "w"), ensure_ascii=False, indent=1)
print("son", round(SON, 2), [(x["ad"], x["bas"], x["son"]) for x in sh])
