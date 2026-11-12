#!/usr/bin/env python3
"""Kanca Bekçisi — Shorts'un ilk saniyesini (kancayı) izler. Sunucuda, bilgisayardan bağımsız çalışır.

İki sinyal:
  1) ERKEN SİNYAL (ilk saatler): videonun 1., 3. ve 24. saatteki izlenmesi, aynı kanalın son videolarının
     aynı saatteki ortancasıyla karşılaştırılır (yayin.json her 10 dakikada güncellenir).
  2) KESİN SİNYAL (24-48 saat): YouTube Analytics 'kaydırmadan izleme' oranı = engagedViews / views
     (analitik.json, günde 2 kez). Studio'daki "izlemeyi seçenler" oranıyla örtüşür (±%5).

Eşikler (Ömer, 12 Kas 2026): izlemeyi seçen ≥%55 İYİ · %45–55 ORTA · <%45 ZAYIF KANCA.
Çıktı: docs/yayin/kanca.json (özet + video listesi), docs/yayin/kanca_izlek.json (saat noktaları geçmişi).
Hiçbir şeyi yayınlamaz/değiştirmez; yalnız ölçer ve yazar.
"""
import json, os, statistics
from datetime import datetime, timedelta, timezone

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "yayin")
TZ = timezone(timedelta(hours=3))
NOKTALAR = (1, 3, 24)          # saat
PENCERE_SAAT = 1.5             # bir noktayı ancak bu süre içinde yakalarsak kaydederiz (geç ölçüm yanıltır)
IYI, ZAYIF = 55.0, 45.0
MIN_ORNEK = 5                  # erken sinyal için kanal başına en az bu kadar geçmiş ölçüm
MIN_IZLENME_TUTMA = 40         # bu kadar izlenmeden azsa oran güvenilmez


def oku(ad, bos):
    try:
        return json.load(open(os.path.join(KOK, ad), encoding="utf-8"))
    except Exception:
        return bos


def yaz(ad, veri):
    json.dump(veri, open(os.path.join(KOK, ad), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def main():
    simdi = datetime.now(TZ)
    kayitlar = oku("yayin.json", {"kayitlar": []})["kayitlar"]
    an = oku("analitik.json", {}).get("kanallar", {})
    izlek = oku("kanca_izlek.json", {"aciklama": "Kanca Bekçisi saat noktaları (1/3/24 sa izlenme)", "videolar": {}})
    V = izlek["videolar"]

    # Analytics bilgisi: vid -> (yayın zamanı, kaydırmadan izleme %, izlenme yüzdesi)
    av = {}
    for kanal, c in an.items():
        for vid, x in (c.get("videolar") or {}).items():
            av[vid] = x

    shorts = [x for x in kayitlar if x.get("platform") == "YouTube" and x.get("tur") == "Short"
              and x.get("durum") == "Yayında" and x.get("vid")]
    for x in shorts:
        vid = x["vid"]
        pa = (av.get(vid) or {}).get("publishedAt")
        try:
            yayin = datetime.fromisoformat(pa.replace("Z", "+00:00")).astimezone(TZ) if pa else \
                datetime.strptime(f"{x['tarih']} {x.get('saat') or '00:00'}", "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
        except Exception:
            continue
        yas = (simdi - yayin).total_seconds() / 3600
        if yas < 0 or yas > 24 * 21:
            continue
        k = V.setdefault(vid, {"kanal": x.get("kanal"), "seri": x.get("seri"), "baslik": x.get("baslik"),
                               "yayin": yayin.isoformat(timespec="minutes"), "n": {}})
        k.update(kanal=x.get("kanal"), seri=x.get("seri"), baslik=x.get("baslik"))
        for n in NOKTALAR:
            if str(n) not in k["n"] and n <= yas <= n + PENCERE_SAAT and isinstance(x.get("izlenme"), int):
                k["n"][str(n)] = x["izlenme"]
        k["son_izlenme"] = x.get("izlenme")
        a = av.get(vid) or {}
        if a.get("tutma_yuzdesi") is not None:
            k["tutma"] = a["tutma_yuzdesi"]
            k["an_izlenme"] = a.get("an_izlenme")
        if a.get("izlenme_yuzde") is not None:
            k["izlenme_yuzde"] = a["izlenme_yuzde"]
    # 21 günden eski kayıtları temizle (dosya büyümesin)
    for vid in [v for v, k in V.items() if datetime.fromisoformat(k["yayin"]) < simdi - timedelta(days=21)]:
        V.pop(vid)

    # Kanal normları: her saat noktasında son 20 videonun ortancası
    norm = {}
    for kanal in {k["kanal"] for k in V.values()}:
        for n in NOKTALAR:
            ornek = [k["n"][str(n)] for k in sorted(V.values(), key=lambda k: k["yayin"], reverse=True)
                     if k["kanal"] == kanal and str(n) in k["n"]][:20]
            if len(ornek) >= MIN_ORNEK:
                norm[(kanal, n)] = statistics.median(ornek)

    liste = []
    for vid, k in V.items():
        yas = (simdi - datetime.fromisoformat(k["yayin"])).total_seconds() / 3600
        durum, neden = "ÖLÇÜLÜYOR", ""
        t, ai = k.get("tutma"), k.get("an_izlenme") or 0
        if t is not None and ai >= MIN_IZLENME_TUTMA:
            if t >= IYI:
                durum, neden = "İYİ", f"izlemeyi seçen %{t:g}"
            elif t >= ZAYIF:
                durum, neden = "ORTA", f"izlemeyi seçen %{t:g} (hedef ≥%{IYI:g})"
            else:
                durum, neden = "ZAYIF KANCA", f"izlemeyi seçen yalnız %{t:g}; izleyici ilk saniyede kaydırıyor"
        else:
            son = max((n for n in NOKTALAR if str(n) in k["n"]), default=None)
            if son is not None and (k["kanal"], son) in norm and norm[(k["kanal"], son)] > 0:
                oran = k["n"][str(son)] / norm[(k["kanal"], son)]
                if oran < 0.4:
                    durum, neden = "ZAYIF BAŞLANGIÇ", f"{son}. saatte {k['n'][str(son)]} izlenme; kanal normu {norm[(k['kanal'], son)]:g} (%{oran*100:.0f})"
                elif oran > 1.5:
                    durum, neden = "GÜÇLÜ BAŞLANGIÇ", f"{son}. saatte {k['n'][str(son)]} izlenme; kanal normunun {oran:.1f} katı"
                else:
                    durum, neden = "NORMAL", f"{son}. saatte {k['n'][str(son)]} izlenme (norm {norm[(k['kanal'], son)]:g})"
        liste.append({"vid": vid, "kanal": k["kanal"], "seri": k.get("seri"), "baslik": k.get("baslik"), "yayin": k["yayin"],
                      "yas_saat": round(yas, 1), "izlenme": k.get("son_izlenme"), "saat_noktalari": k["n"],
                      "tutma": t, "durum": durum, "neden": neden})
    liste.sort(key=lambda r: r["yayin"], reverse=True)

    # Seri özeti: son 5 ölçülmüş videonun ortanca tutma oranı
    seri = {}
    for r in liste:
        if r["tutma"] is not None and (V[r["vid"]].get("an_izlenme") or 0) >= MIN_IZLENME_TUTMA:
            seri.setdefault((r["kanal"], r["seri"]), []).append(r["tutma"])
    seri_ozet = [{"kanal": kn, "seri": s, "son_video": len(L[:5]), "ortanca_tutma": round(statistics.median(L[:5]), 1),
                  "durum": "İYİ" if statistics.median(L[:5]) >= IYI else "ORTA" if statistics.median(L[:5]) >= ZAYIF else "ZAYIF"}
                 for (kn, s), L in seri.items()]
    seri_ozet.sort(key=lambda r: (r["kanal"] or "", -r["ortanca_tutma"]))

    son24 = [r for r in liste if r["yas_saat"] <= 30]
    ozet = []
    for r in son24:
        if r["durum"] in ("ZAYIF KANCA", "ZAYIF BAŞLANGIÇ", "GÜÇLÜ BAŞLANGIÇ"):
            ozet.append(f"{r['durum']} · {r['kanal']} · {(r['baslik'] or '')[:50]} — {r['neden']}")
    for s in seri_ozet:
        if s["durum"] == "ZAYIF" and s["son_video"] >= 3:
            ozet.append(f"SERİ UYARISI · {s['kanal']} · {s['seri']}: son {s['son_video']} videoda izlemeyi seçen ortanca %{s['ortanca_tutma']:g} — kanca yenilenmeli")

    yaz("kanca_izlek.json", izlek)
    yaz("kanca.json", {"olusturma": simdi.isoformat(timespec="minutes"),
                       "aciklama": "Kanca Bekçisi: Shorts ilk saniye performansı. ≥%55 İYİ, %45–55 ORTA, <%45 ZAYIF. Erken sinyal 1/3/24. saat izlenmesi kanal normuyla.",
                       "esikler": {"iyi": IYI, "zayif": ZAYIF}, "ozet": ozet, "seriler": seri_ozet, "videolar": liste[:120]})
    print(f"kanca.json güncellendi: {len(liste)} video, {len(ozet)} uyarı")


if __name__ == "__main__":
    main()
