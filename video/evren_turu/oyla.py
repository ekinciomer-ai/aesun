"""80 Günde Evren Turu - yorum oylarını sayar, bir sonraki durağı belirler.
Kaynak: docs/yayin/yayin.json (yayin/guncelle.py 10 dk'da bir doldurur).
Kural: A / B / C yazan yorumlar sayılır (TR+EN birlikte, kişi başı 1 oy, son oyu geçerli).
C = "Akışına bırak" = ana rotadaki sıradaki durak. Toplam oy eşiğin altındaysa
ya da en yüksek oy berabereyse yine C uygulanır.
Kullanım: python3 oyla.py <gun>          (sadece gösterir)
          python3 oyla.py <gun> --kaydet (sonucu rota.json'a yazar)"""
import json, os, re, sys

KOK = os.path.dirname(os.path.abspath(__file__))
YAYIN = os.path.join(KOK, "..", "..", "docs", "yayin", "yayin.json")
ROTA = os.path.join(KOK, "rota.json")
KANALLAR = {"Kozmos Lab TR", "Kozmos Lab EN"}
DESEN = re.compile(r"^\s*[\(\[]?\s*([ABC])\s*[\)\]\.:!-]?(\s|$)", re.I)


def siradaki(rota):
    gidilen = {b["sonuc"] for b in rota["bolumler"] if b.get("sonuc")} | {rota["ana_rota"][0]}
    return next((d for d in rota["ana_rota"] if d not in gidilen), rota["ana_rota"][-1])


def say(gun, kaydet=False):
    rota = json.load(open(ROTA, encoding="utf-8"))
    b = next(x for x in rota["bolumler"] if x["gun"] == gun)
    yorumlar = json.load(open(YAYIN, encoding="utf-8")).get("yorumlar", [])
    oy = {}
    for y in sorted(yorumlar, key=lambda y: y["zaman"]):
        if y.get("kanal") not in KANALLAR or y.get("vid") not in b["vid"]:
            continue
        m = DESEN.match(y.get("metin", ""))
        if m:
            oy[y.get("yazar")] = m.group(1).upper()
    sayim = {k: sum(1 for v in oy.values() if v == k) for k in "ABC"}
    toplam = sum(sayim.values())
    en = max(sayim.values()) if toplam else 0
    kazanan = [k for k, v in sayim.items() if v == en]
    if toplam < rota["esik_oy"]:
        secim, neden = "C", f"oy az ({toplam} < {rota['esik_oy']}) - rotamızda devam"
    elif len(kazanan) > 1:
        secim, neden = "C", "beraberlik - rotamızda devam"
    else:
        secim, neden = kazanan[0], "izleyici seçti"
    durak = siradaki(rota) if secim == "C" else b[secim]
    print(json.dumps({"gun": gun, "oylar": sayim, "toplam": toplam, "secim": secim,
                      "durak": durak, "neden": neden}, ensure_ascii=False))
    if kaydet:
        b["sonuc"] = durak
        json.dump(rota, open(ROTA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    say(int(sys.argv[1]), "--kaydet" in sys.argv)
