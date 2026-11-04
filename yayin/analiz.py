#!/usr/bin/env python3
"""Yayın analizi ve yol haritası motoru (GitHub Actions'ta her çalışmada; bilgisayar ve Claude gerekmez).

Girdi : docs/yayin/yayin.json (kayıtlar), docs/yayin/gecmis.json (günlük izlenme ölçümleri)
Çıktı : docs/yayin/analiz.json  → Portal → Yayın Takibi → "Yol haritası" kutusu
        Bu dosya ÜRETİM İÇİN BAĞLAYICIDIR: Claude, Antigravity ve CutkodA sunucusu
        yeni içerik üretmeden/planlamadan önce 'plan' ve 'eylemler' alanına uyar (YAYIN_TAKIBI.md).

Ölçü  : Her Short'un yayından sonraki ilk ~48 saatteki izlenmesi (Shorts izlenmesinin çoğu bu sürede gelir).
Karar : kanal × seri bazında; eşikler kanalın kendi en iyi videolarına göre (sabit sayı değil).
"""
import json, os, re, statistics
from datetime import datetime, timedelta, timezone

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "yayin")
TZ = timezone(timedelta(hours=3))
GUNLUK_KOTA = {"Antik Stüdyo": 4, "Ancient Studio": 3}   # günde en fazla Short (YouTube), kanal başına
MIN_ORNEK = 3          # karar için en az bu kadar ölçülmüş video
OLGUN_SAAT = 40        # bu yaştan küçük video "erken" sayılır, karara katılmaz


def yukle(ad, bos):
    try:
        return json.load(open(os.path.join(KOK, ad), encoding="utf-8"))
    except Exception:
        return bos


def zaman(x):
    try:
        return datetime.strptime(f"{x['tarih']} {x.get('saat') or '12:00'}", "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
    except Exception:
        return None


def normal(b):
    b = re.sub(r"#\S+", "", b.lower()).split("|")[0]
    b = re.sub(r"\((kopya|eski yükleme)\)", "", b)
    return re.sub(r"[^\wçğıöşü ]+", "", b).strip()


def main():
    j = yukle("yayin.json", {"kayitlar": []})
    gun = yukle("gecmis.json", {"gunler": {}}).get("gunler", {})
    simdi = datetime.now(TZ)
    K = j.get("kayitlar", [])

    # 1) Video başına ilk 48 saat izlenmesi
    vids = []
    for x in K:
        if x.get("platform") != "YouTube" or x.get("durum") != "Yayında" or not x.get("vid"):
            continue
        t = zaman(x)
        if not t:
            continue
        yas = (simdi - t).total_seconds() / 3600
        hedef = (t + timedelta(hours=48)).strftime("%Y-%m-%d")
        g48 = next((gun[d][x["vid"]] for d in sorted(gun) if d >= hedef and x["vid"] in gun[d]), None)
        olcu = g48 if g48 is not None else (x.get("izlenme") or 0)
        vids.append(dict(vid=x["vid"], kanal=x.get("kanal"), seri=x.get("seri") or "?", tur=x.get("tur") or "Short",
                         baslik=x.get("baslik", ""), tarih=x["tarih"], saat=x.get("saat") or "", yas=round(yas),
                         i48=olcu, toplam=x.get("izlenme") or 0, olgun=yas >= OLGUN_SAAT, yuzde=x.get("izlenme_yuzde")))

    # 2) Kanal eşikleri: "tuttu" = kanalın en iyi 3 Short'unun ortalamasının %20'si
    esik = {}
    for kanal in {v["kanal"] for v in vids}:
        s = sorted((v["i48"] for v in vids if v["kanal"] == kanal and v["tur"] == "Short" and v["olgun"]), reverse=True)
        esik[kanal] = max(50, round(statistics.mean(s[:3]) * 0.2)) if s else 50
    for v in vids:
        v["tuttu"] = v["i48"] >= esik.get(v["kanal"], 50)

    # 3) Kanal × seri kararları
    seriler = []
    for (kanal, seri) in sorted({(v["kanal"], v["seri"]) for v in vids if v["tur"] == "Short"}):
        L = [v for v in vids if v["kanal"] == kanal and v["seri"] == seri and v["tur"] == "Short" and v["olgun"]]
        erken = [v for v in vids if v["kanal"] == kanal and v["seri"] == seri and v["tur"] == "Short" and not v["olgun"]]
        n = len(L)
        med = round(statistics.median([v["i48"] for v in L])) if L else None
        oran = round(100 * sum(v["tuttu"] for v in L) / n) if n else None
        son3 = sorted(L, key=lambda v: (v["tarih"], v["saat"]))[-3:]
        if n < MIN_ORNEK:
            karar, neden = "DENE", f"{n} ölçülmüş video var, karar için en az {MIN_ORNEK} gerekli"
        elif oran >= 50:
            karar, neden = "ARTIR", f"videoların %{oran}'i tuttu (eşik {esik[kanal]} izlenme / 48 sa)"
        elif len(son3) == 3 and not any(v["tuttu"] for v in son3) and oran < 20:
            karar, neden = "DURDUR", f"son 3 videonun hiçbiri tutmadı, tutma oranı %{oran}"
        elif len(son3) == 3 and not any(v["tuttu"] for v in son3):
            karar, neden = "DEĞİŞTİR", f"son 3 video tutmadı (önceden tutanlar vardı): kanca/konu seçimini değiştir"
        else:
            karar, neden = "SÜRDÜR", f"tutma oranı %{oran}"
        en_iyi = max(L, key=lambda v: v["i48"]) if L else None
        yz = [v["yuzde"] for v in L if v.get("yuzde") is not None]
        seriler.append(dict(kanal=kanal, seri=seri, karar=karar, neden=neden, olculen=n, erken=len(erken),
                            medyan_48sa=med, tutma_orani=oran, izlenme_yuzde=(round(statistics.median(yz)) if yz else None),
                            en_iyi=(en_iyi and {"baslik": en_iyi["baslik"], "i48": en_iyi["i48"]})))

    # 4) Günlük slot dağıtımı (kota, puana göre): ARTIR 2 pay, SÜRDÜR/DENE 1, DEĞİŞTİR 1 (yeni kanca ile), DURDUR 0
    pay = {"ARTIR": 2, "SÜRDÜR": 1, "DENE": 1, "DEĞİŞTİR": 1, "DURDUR": 0}
    plan = {}
    for kanal, kota in GUNLUK_KOTA.items():
        S = sorted([s for s in seriler if s["kanal"] == kanal], key=lambda s: (-pay[s["karar"]], -(s["medyan_48sa"] or 0)))
        kalan, dag = kota, {}
        for s in S:
            if kalan <= 0:
                break
            k = min(pay[s["karar"]], kalan)
            if k:
                dag[s["seri"]] = k; kalan -= k
        plan[kanal] = {"gunluk_short_kotasi": kota, "seri_dagilimi": dag,
                       "durdurulan": [s["seri"] for s in S if s["karar"] == "DURDUR"]}

    # 5) Saat performansı (yalnız olgun TR/EN Short'lar)
    saatler = {}
    for v in vids:
        if v["tur"] == "Short" and v["olgun"] and v["saat"]:
            saatler.setdefault(v["kanal"], {}).setdefault(v["saat"][:2] + ":00", []).append(v["i48"])
    saat_tablo = {k: {h: {"n": len(a), "medyan": round(statistics.median(a))} for h, a in sorted(d.items())} for k, d in saatler.items()}

    # 6) Yapılacak işler (tarayıcısı olan ilk ajan yapar, sonra yayin.json'a işler)
    eylemler = []
    grup = {}
    an = yukle("analitik.json", {})
    try:
        taze = (simdi - datetime.fromisoformat(an["zaman"])).total_seconds() < 36 * 3600
    except Exception:
        taze = False
    kaynak = []
    if taze:   # sunucunun YouTube'dan okuduğu gerçek durum
        for kanal, kd in an.get("kanallar", {}).items():
            for vid, v in kd.get("videolar", {}).items():
                if v.get("durum") == "public" or v.get("publishAt"):
                    sure = v.get("sure") or ""
                    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", sure)
                    sn = (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else 0
                    t = v.get("publishedAt") if v.get("durum") == "public" else v.get("publishAt")
                    kaynak.append({"platform": "YouTube", "kanal": kanal, "vid": vid, "baslik": v.get("baslik") or "",
                                   "tur": "Short" if sn <= 180 else "Video", "izlenme": v.get("izlenme"), "sn": sn,
                                   "durum": "Yayında" if v.get("durum") == "public" else "Planlı",
                                   "tarih": (t or "")[:10], "saat": (t or "")[11:16]})
    else:
        kaynak = K
    for x in kaynak:
        if x.get("platform") == "YouTube" and x.get("durum") in ("Yayında", "Planlı") and x.get("vid"):
            g = grup.setdefault((x.get("kanal"), x.get("tur"), normal(x.get("baslik", "")), (x.get("sn") or 0) // 4), {})   # aynı başlık + aynı süre = tekrar
            g.setdefault(x["vid"], x)          # aynı vid tabloda iki kez yazılmışsa tek sayılır
    for (kanal, _, _, _), G in grup.items():
        L = list(G.values())
        if len(L) > 1:
            L = sorted(L, key=lambda x: (x.get("durum") != "Yayında", x.get("tarih") or "9", x.get("saat") or ""))   # yayındaki ilk yükleme kalır
            for x in L[1:]:
                eylemler.append({"tur": "GİZLE", "kanal": kanal, "vid": x["vid"], "kalan": L[0]["vid"], "baslik": x["baslik"],
                                 "neden": f"tekrar: ilk yüklenen {L[0]['vid']} kalır, bu kopya Gizli'ye alınır (silme yok)"})
    for x in K:
        t = zaman(x) if x.get("tarih") else None
        if x.get("durum") == "Planlı" and t and simdi > t + timedelta(hours=2):
            eylemler.append({"tur": "KONTROL", "kanal": x.get("kanal"), "platform": x.get("platform"), "vid": x.get("vid", ""),
                             "baslik": x.get("baslik"), "neden": f"{x['tarih']} {x.get('saat','')} planlıydı, hâlâ yayında görünmüyor"})
    for kanal, p in plan.items():
        for seri in p["durdurulan"]:
            for x in K:
                t = zaman(x) if x.get("tarih") else None
                if x.get("kanal") == kanal and x.get("seri") == seri and x.get("durum") in ("Planlı", "Taslak") and t and t > simdi:
                    eylemler.append({"tur": "ERTELE", "kanal": kanal, "vid": x.get("vid", ""), "baslik": x.get("baslik"),
                                     "neden": f"'{seri}' serisi durduruldu; bu slotu {', '.join(p['seri_dagilimi']) or 'en iyi seri'} kullanır"})

    # 7) Bulgular (insan diliyle, Ömer için)
    bulgular = []
    tg = sorted(gun)
    if len(tg) >= 3:
        def artis(a, b): return sum(max(0, gun[b][k] - gun[a].get(k, 0)) for k in gun[b])
        dun, once = artis(tg[-3], tg[-2]), (artis(tg[-4], tg[-3]) if len(tg) >= 4 else None)
        bulgular.append(f"Dün ({tg[-2]}) {dun} izlenme geldi" + (f"; bir önceki gün {once}." if once is not None else "."))
    for kanal in sorted({v["kanal"] for v in vids}):
        son = [v for v in vids if v["kanal"] == kanal and v["tur"] == "Short" and v["olgun"]]
        son = sorted(son, key=lambda v: (v["tarih"], v["saat"]))[-6:]
        if son:
            t = sum(v["tuttu"] for v in son)
            bulgular.append(f"{kanal}: son {len(son)} Short'tan {t} tanesi tuttu (eşik {esik[kanal]} izlenme / 48 sa).")
    for s in seriler:
        if s["karar"] in ("DURDUR", "DEĞİŞTİR", "ARTIR"):
            bulgular.append(f"{s['kanal']} · {s['seri']}: {s['karar']} — {s['neden']}.")
    for kanal, d in saat_tablo.items():
        iyi = [h for h, v in d.items() if v["n"] >= 2]
        if iyi:
            h = max(iyi, key=lambda h: d[h]["medyan"])
            bulgular.append(f"{kanal}: en iyi yayın saati şimdilik {h} (medyan {d[h]['medyan']} izlenme, {d[h]['n']} video).")

    for kanal in sorted({v["kanal"] for v in vids}):
        a = [v["yuzde"] for v in vids if v["kanal"] == kanal and v["tur"] == "Short" and v["olgun"] and v["tuttu"] and v.get("yuzde") is not None]
        b = [v["yuzde"] for v in vids if v["kanal"] == kanal and v["tur"] == "Short" and v["olgun"] and not v["tuttu"] and v.get("yuzde") is not None]
        if a and b:
            bulgular.append(f"{kanal}: tutan Short'lar ortalama %{round(statistics.mean(a))} izleniyor, tutmayanlar %{round(statistics.mean(b))}"
                            + (" → sorun ilk saniyelerde (kanca/kapak); izleyici videoyu bırakıyor." if statistics.mean(b) < statistics.mean(a) - 10
                               else " → izleyen bitiriyor; sorun dağıtımda (konu/başlık ilgisi), kanca değil."))
    ust = sorted([v for v in vids if v["tur"] == "Short" and v["olgun"]], key=lambda v: -v["i48"])
    out = {
        "olusturma": simdi.isoformat(timespec="minutes"),
        "aciklama": "Otomatik yol haritası. Üretim/planlama yapan her ajan (Claude, Antigravity, CutkodA) önce buna uyar.",
        "kurallar": [
            "Günlük Short kotası aşılmaz; seri dağılımı 'plan' alanındaki gibidir.",
            "DURDUR kararındaki seriden yeni video üretilmez/planlanmaz; ERTELE eylemindeki planlar bu seriden çıkarılır, slota dağılımdaki ilk seri konur.",
            "DEĞİŞTİR kararındaki seride sıradaki videolar yeni kanca ve daha tanınmış konu ile üretilir (en iyi giden başlık örnek alınır).",
            "Aynı içerik bir kanalda iki kez açık kalmaz (GİZLE eylemi: silme yok, Gizli'ye alınır).",
            "Tablo serisinde sıralama: önce dünyaca tanınan eserler; az bilinen eser araya en fazla 3 günde bir girer.",
            "Her gün 19:00 Gündem + Tarih Short'u boş bırakılmaz (TR).",
        ],
        "plan": plan, "seriler": seriler, "esikler": esik, "saatler": saat_tablo,
        "eylemler": eylemler, "bulgular": bulgular,
        "en_iyi": [{"kanal": v["kanal"], "baslik": v["baslik"], "i48": v["i48"]} for v in ust[:5]],
        "en_zayif": [{"kanal": v["kanal"], "baslik": v["baslik"], "i48": v["i48"]} for v in ust[-5:]],
    }
    yol = os.path.join(KOK, "analiz.json")
    eski = yukle("analiz.json", {})
    if {k: v for k, v in eski.items() if k != "olusturma"} != {k: v for k, v in out.items() if k != "olusturma"}:
        json.dump(out, open(yol, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("analiz.json güncellendi")
    else:
        print("analiz değişmedi")


if __name__ == "__main__":
    main()
