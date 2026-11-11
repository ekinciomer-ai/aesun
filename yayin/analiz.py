#!/usr/bin/env python3
"""Yayın analizi ve yol haritası motoru (GitHub Actions'ta her çalışmada; bilgisayar ve Claude gerekmez).

Girdi : docs/yayin/yayin.json (kayıtlar), docs/yayin/gecmis.json (günlük izlenme ölçümleri), docs/yayin/analitik.json
Çıktı : docs/yayin/analiz.json  → Portal → Yayın Takibi → "Yol haritası" kutusu
        Bu dosya ÜRETİM İÇİN BAĞLAYICIDIR: Claude, Antigravity ve CutkodA sunucusu
        yeni içerik üretmeden/planlamadan önce 'plan', 'takvim_aciklari', 'kopru_onerileri' ve 'eylemler' alanına uyar (YAYIN_TAKIBI.md).

Ölçü  : Her Short'un yayından sonraki ilk ~48 saatteki izlenmesi (Shorts izlenmesinin çoğu bu sürede gelir)
        + YouTube Analytics izlenme yüzdesi (averageViewPercentage) + kaydırmadan izleme oranı (engagedViews/views).
Karar : kanal × seri bazında; eşikler kanalın kendi en iyi videolarına göre (sabit sayı değil).
"""
import json, os, re, statistics
from datetime import datetime, timedelta, timezone

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "yayin")
TZ = timezone(timedelta(hours=3))
GUNLUK_KOTA = {
    "Antik Stüdyo": 4,
    "Ancient Studio": 3,
    "Estudio Antiguo": 3,
    "Kozmos Lab TR": 2,
    "Kozmos Lab": 2,
}  # günde en fazla Short (YouTube), kanal başına
KANAL_NORMAL = {
    "Kozmos Lab TR (@kozmoslabtr)": "Kozmos Lab TR",
    "Kozmos Lab (@kozmoslab)": "Kozmos Lab",
}
SERI_NORMAL = {"Did You Know?": "Did you know?"}
MIN_ORNEK = 3          # karar için en az bu kadar ölçülmüş video
OLGUN_SAAT = 40        # bu yaştan küçük video "erken" sayılır, karara katılmaz

KOPRU_KONULARI = [
    ("piri", ["piri reis", "hürmüz", "hormuz"]),
    ("bogaz", ["boğaz", "kızıldeniz", "red sea", "babülmendep", "don-volga", "caspian", "bosphorus", "70 gemi", "70 warships", "70 barcos", "süveyş", "suez", "cinco mares", "sea gates"]),
    ("tablo", ["tablo", "painting", "cuadro", "mona lisa", "çığlık", "scream", "venüs", "venus", "gece devriyesi", "night watch", "rembrandt", "van gogh", "inci küpeli", "pearl earring", "amerikan gotiği", "american gothic", "prado", "dalga", "wave", "akşam yemeği", "supper", "kaplumbağa", "tortoise"]),
    ("gunes", ["kum", "sand", "güneş panel", "solar panel"]),
    ("ruzgar", ["rüzgâr türbin", "ruzgar turbin", "wind turbine"]),
    ("tuna", ["tuna", "plevne"]),
]


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
    b = re.sub(r"#\S+", "", (b or "").lower()).split("|")[0]
    b = re.sub(r"\((kopya|eski yükleme)\)", "", b)
    return re.sub(r"[^\wçğıöşüáéíóúñ ]+", "", b).strip()


def konu_etiketleri(baslik):
    bl = (baslik or "").lower()
    return {ad for ad, anahtarlar in KOPRU_KONULARI if any(k in bl for k in anahtarlar)}


def main():
    j = yukle("yayin.json", {"kayitlar": []})
    gun = yukle("gecmis.json", {"gunler": {}}).get("gunler", {})
    simdi = datetime.now(TZ)
    K = j.get("kayitlar", [])

    # 1) Video başına ilk 48 saat izlenmesi (Short + Video)
    vids = []
    for x in K:
        if x.get("platform") != "YouTube" or x.get("durum") != "Yayında" or not x.get("vid"):
            continue
        t = zaman(x)
        if not t:
            continue
        kanal = KANAL_NORMAL.get(x.get("kanal"), x.get("kanal"))
        seri = SERI_NORMAL.get(x.get("seri"), x.get("seri") or "?")
        yas = (simdi - t).total_seconds() / 3600
        hedef = (t + timedelta(hours=48)).strftime("%Y-%m-%d")
        g48 = next((gun[d][x["vid"]] for d in sorted(gun) if d >= hedef and x["vid"] in gun[d]), None)
        olcu = g48 if g48 is not None else (x.get("izlenme") or 0)
        vids.append(dict(
            vid=x["vid"], kanal=kanal, seri=seri, tur=x.get("tur") or "Short",
            baslik=x.get("baslik", ""), tarih=x["tarih"], saat=x.get("saat") or "", yas=round(yas),
            i48=olcu, toplam=x.get("izlenme") or 0, olgun=yas >= OLGUN_SAAT,
            yuzde=x.get("izlenme_yuzde"), tutma_yz=x.get("tutma_yuzdesi"), abone=x.get("abone_kazanc"),
        ))

    # 2) Kanal eşikleri: "tuttu" = kanalın en iyi 3 Short'unun ortalamasının %20'si
    esik = {}
    for kanal in {v["kanal"] for v in vids} | set(GUNLUK_KOTA):
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
        tyz = [v["tutma_yz"] for v in L if v.get("tutma_yz") is not None]
        kayit = dict(
            kanal=kanal, seri=seri, karar=karar, neden=neden, olculen=n, erken=len(erken),
            medyan_48sa=med, tutma_orani=oran,
            izlenme_yuzde=(round(statistics.median(yz)) if yz else None),
            en_iyi=(en_iyi and {"baslik": en_iyi["baslik"], "i48": en_iyi["i48"]}),
        )
        if tyz:
            kayit["kaydirmadan_izleme_yuzde"] = round(statistics.median(tyz))
        seriler.append(kayit)

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

    # 5) Saat performansı (yalnız olgun Short'lar)
    saatler = {}
    for v in vids:
        if v["tur"] == "Short" and v["olgun"] and v["saat"]:
            saatler.setdefault(v["kanal"], {}).setdefault(v["saat"][:2] + ":00", []).append(v["i48"])
    saat_tablo = {k: {h: {"n": len(a), "medyan": round(statistics.median(a))} for h, a in sorted(d.items())} for k, d in saatler.items()}

    # 6) Yapılacak işler (sunucu ve ajanlar uygular) + gerçek kanal verisi
    eylemler = []
    an = yukle("analitik.json", {})
    try:
        taze = (simdi - datetime.fromisoformat(an["zaman"])).total_seconds() < 36 * 3600
    except Exception:
        taze = False
    kaynak = []
    if taze:   # sunucunun YouTube'dan okuduğu gerçek durum
        for kanal, kd in an.get("kanallar", {}).items():
            kanal = KANAL_NORMAL.get(kanal, kanal)
            for vid, v in kd.get("videolar", {}).items():
                if v.get("durum") == "public" or v.get("publishAt"):
                    sure = v.get("sure") or ""
                    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", sure)
                    sn = (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else 0
                    t_raw = v.get("publishedAt") if v.get("durum") == "public" else v.get("publishAt")
                    try:
                        t_ist = datetime.fromisoformat(t_raw.replace("Z", "+00:00")).astimezone(TZ) if t_raw else None
                    except Exception:
                        t_ist = None
                    kaynak.append({
                        "platform": "YouTube", "kanal": kanal, "vid": vid, "baslik": v.get("baslik") or "",
                        "tur": "Short" if sn <= 180 else "Video", "izlenme": v.get("izlenme") or 0, "sn": sn,
                        "durum": "Yayında" if v.get("durum") == "public" else "Planlı",
                        "tarih": t_ist.strftime("%Y-%m-%d") if t_ist else (t_raw or "")[:10],
                        "saat": t_ist.strftime("%H:%M") if t_ist else (t_raw or "")[11:16],
                        "izlenme_yuzde": v.get("izlenme_yuzde"),
                    })
    else:
        for x in K:
            y = dict(x)
            y["kanal"] = KANAL_NORMAL.get(y.get("kanal"), y.get("kanal"))
            kaynak.append(y)

    # Kopya (tekrar) tespiti: sabit //4 kutusu yerine <=5 sn süre yakınlığı (ör. 43 sn ve 44 sn kopyaları da yakalar)
    baslik_grup = {}
    for x in kaynak:
        if x.get("platform") == "YouTube" and x.get("durum") in ("Yayında", "Planlı") and x.get("vid"):
            nb = normal(x.get("baslik", ""))
            if nb:
                baslik_grup.setdefault((x.get("kanal"), x.get("tur"), nb), {})[x["vid"]] = x
    for (kanal, _, _), G in baslik_grup.items():
        adaylar = list(G.values())
        if len(adaylar) <= 1:
            continue
        islenen = set()
        for i, a in enumerate(adaylar):
            if a["vid"] in islenen:
                continue
            kume = [a]
            for b in adaylar[i + 1:]:
                if b["vid"] in islenen:
                    continue
                if not a.get("sn") or not b.get("sn") or abs((a.get("sn") or 0) - (b.get("sn") or 0)) <= 5:
                    kume.append(b)
            if len(kume) > 1:
                for u in kume:
                    islenen.add(u["vid"])
                # Yayında olan ve izlenmesi yüksek olan (eşitse ilk yüklenen) asıl video kalır
                L = sorted(kume, key=lambda x: (x.get("durum") != "Yayında", -(x.get("izlenme") or 0), x.get("tarih") or "9", x.get("saat") or ""))
                for x in L[1:]:
                    eylemler.append({
                        "tur": "GİZLE", "kanal": kanal, "vid": x["vid"], "kalan": L[0]["vid"], "baslik": x["baslik"],
                        "neden": f"tekrar: asıl video {L[0]['vid']} ({L[0].get('izlenme', 0)} izl) kalır, bu kopya Gizli'ye alınır (silme yok)",
                    })

    for x in K:
        t = zaman(x) if x.get("tarih") else None
        if x.get("durum") == "Planlı" and t and simdi > t + timedelta(hours=2):
            eylemler.append({"tur": "KONTROL", "kanal": KANAL_NORMAL.get(x.get("kanal"), x.get("kanal")), "platform": x.get("platform"), "vid": x.get("vid", ""),
                             "baslik": x.get("baslik"), "neden": f"{x['tarih']} {x.get('saat','')} planlıydı, hâlâ yayında görünmüyor"})
    for kanal, p in plan.items():
        for seri in p["durdurulan"]:
            for x in K:
                t = zaman(x) if x.get("tarih") else None
                kn = KANAL_NORMAL.get(x.get("kanal"), x.get("kanal"))
                if kn == kanal and x.get("seri") == seri and x.get("durum") in ("Planlı", "Taslak") and t and t > simdi:
                    eylemler.append({"tur": "ERTELE", "kanal": kanal, "vid": x.get("vid", ""), "baslik": x.get("baslik"),
                                     "neden": f"'{seri}' serisi durduruldu; bu slotu {', '.join(p['seri_dagilimi']) or 'en iyi seri'} kullanır"})

    # Prime-time saat optimizasyonu (SAAT_KAYDIR): yalnız ileri tarihli planlı Short'ları verisi kanıtlanmış ana saate taşır
    planli_slotlar = {(x.get("kanal"), x.get("tarih"), (x.get("saat") or "")[:2]) for x in kaynak if x.get("durum") == "Planlı"}
    for x in kaynak:
        if x.get("platform") != "YouTube" or x.get("tur") != "Short" or x.get("durum") != "Planlı" or not x.get("vid"):
            continue
        try:
            dt_mevcut = datetime.strptime(f"{x['tarih']} {x['saat']}", "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
        except Exception:
            continue
        if dt_mevcut <= simdi + timedelta(hours=2):
            continue
        if x.get("kanal") == "Kozmos Lab TR" and x.get("saat") == "13:00":
            if ("Kozmos Lab TR", x["tarih"], "19") not in planli_slotlar:
                planli_slotlar.add(("Kozmos Lab TR", x["tarih"], "19"))
                eylemler.append({
                    "tur": "SAAT_KAYDIR", "kanal": "Kozmos Lab TR", "vid": x["vid"], "baslik": x["baslik"],
                    "yeni_publishAt": f"{x['tarih']}T19:00:00+03:00",
                    "neden": "13:00 slotu (medyan 68) → 19:00 prime-time slotuna (medyan 903) taşındı",
                })
        elif x.get("kanal") == "Ancient Studio" and x.get("saat") == "23:00":
            ertesi = (dt_mevcut + timedelta(days=1)).strftime("%Y-%m-%d")
            if ("Ancient Studio", ertesi, "00") not in planli_slotlar:
                planli_slotlar.add(("Ancient Studio", ertesi, "00"))
                eylemler.append({
                    "tur": "SAAT_KAYDIR", "kanal": "Ancient Studio", "vid": x["vid"], "baslik": x["baslik"],
                    "yeni_publishAt": f"{ertesi}T00:00:00+03:00",
                    "neden": "23:00 slotu → ABD/İngiltere prime-time 00:00 TR slotuna (medyan 902) taşındı",
                })

    # 6b) Önümüzdeki 72 saat takvim & kota açıkları
    takvim_aciklari = []
    uc_gun = [(simdi + timedelta(days=g)).strftime("%Y-%m-%d") for g in range(3)]
    for kanal, kota in GUNLUK_KOTA.items():
        for g_str in uc_gun:
            gun_short = [x for x in kaynak if x.get("kanal") == kanal and x.get("tur") == "Short"
                         and x.get("durum") in ("Yayında", "Planlı") and x.get("tarih") == g_str]
            eksik = kota - len(gun_short)
            ozel_uyari = []
            if kanal == "Antik Stüdyo":
                saat_19 = any((x.get("saat") or "").startswith("19:") for x in gun_short)
                if not saat_19:
                    ozel_uyari.append("19:00 Gündem+Tarih slotu BOŞ")
            elif kanal == "Ancient Studio" and g_str > uc_gun[0]:
                saat_00 = any((x.get("saat") or "").startswith(("00:", "23:")) for x in gun_short)
                if not saat_00:
                    ozel_uyari.append("00:00/23:00 ana slot BOŞ")
            if eksik > 0 or ozel_uyari:
                takvim_aciklari.append({
                    "kanal": kanal, "tarih": g_str, "planli_short": len(gun_short), "hedef_kota": kota,
                    "eksik": max(0, eksik),
                    "uyari": ", ".join(ozel_uyari) if ozel_uyari else f"{eksik} Short slotu boş",
                })

    # 6c) Uzun videolar + Shorts → Uzun Video ("İlgili Video / Related Video") köprü önerileri
    uzun_videolar = [x for x in kaynak if x.get("platform") == "YouTube" and x.get("tur") == "Video" and x.get("durum") in ("Yayında", "Planlı")]
    kopru_onerileri = []
    for uv in sorted(uzun_videolar, key=lambda x: (x.get("kanal") or "", -(x.get("izlenme") or 0))):
        u_etiket = konu_etiketleri(uv.get("baslik", ""))
        if not u_etiket:
            continue
        aday_shorts = [
            s for s in kaynak
            if s.get("kanal") == uv.get("kanal") and s.get("tur") == "Short" and s.get("durum") in ("Yayında", "Planlı")
            and (konu_etiketleri(s.get("baslik", "")) & u_etiket)
        ]
        aday_shorts.sort(key=lambda s: -(s.get("izlenme") or 0))
        if aday_shorts:
            kopru_onerileri.append({
                "kanal": uv["kanal"],
                "uzun_vid": uv["vid"],
                "uzun_baslik": uv["baslik"],
                "uzun_durum": uv["durum"],
                "uzun_izlenme": uv.get("izlenme", 0),
                "baglanacak_shortlar": [
                    {"vid": s["vid"], "baslik": s["baslik"], "izlenme": s.get("izlenme", 0), "durum": s["durum"]}
                    for s in aday_shorts[:5]
                ],
                "etki": "YouTube Studio → Shorts → 'İlgili Video (Related Video)' alanından bu uzun videoya bağlayın",
            })

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
        ty = [v["tutma_yz"] for v in vids if v["kanal"] == kanal and v["tur"] == "Short" and v.get("tutma_yz") is not None]
        if ty:
            ort_ty = round(statistics.mean(ty))
            bulgular.append(f"{kanal}: Shorts kaydırmadan izleme oranı (Viewed vs Swiped) ortalama %{ort_ty} (hedef ≥%70).")

    uzun_yayinda = [u for u in uzun_videolar if u.get("durum") == "Yayında"]
    if uzun_yayinda:
        ort_uzun = round(statistics.median([u.get("izlenme") or 0 for u in uzun_yayinda]))
        bulgular.append(f"Uzun videolar ({len(uzun_yayinda)} yayında): medyan {ort_uzun} izlenme → özel kapak (telefon doğrulaması) ve Shorts 'İlgili Video' köprüsü ({len(kopru_onerileri)} eşleşme hazır) kritik.")

    tr_19_bos = [t["tarih"] for t in takvim_aciklari if t["kanal"] == "Antik Stüdyo" and "19:00" in t["uyari"]]
    if tr_19_bos:
        bulgular.append(f"TAKViM UYARISI · Antik Stüdyo 19:00 Gündem+Tarih slotu şu günlerde boş: {', '.join(tr_19_bos)}.")

    ust = sorted([v for v in vids if v["tur"] == "Short" and v["olgun"]], key=lambda v: -v["i48"])
    # TikTok: hesap 7 günlük izlenmesi (tt_istatistik.yml yazar). Dağıtım yoksa yeni planlama durur, mevcut planlılar kalır.
    tt = j.get("tiktok") or {}; tt_izl = 0
    try: tt_izl = int(str((tt.get("hesap_7g") or {}).get("izlenme_7g", "0")).replace(".", "").replace(",", "") or 0)
    except Exception: pass
    tt_yay = [x for x in j["kayitlar"] if x.get("platform") == "TikTok" and x.get("durum") == "Yayında"]
    if tt and tt_izl < 200 and len(tt_yay) >= 5:
        tiktok = {"karar": "DURDUR (yeni planlama)", "izlenme_7g": tt_izl, "yayinda": len(tt_yay), "okuma": tt.get("okuma"),
                  "sebep": "Hesap 7 günde %d izlenme, %d yayında video → TikTok 'Senin İçin' dağıtımı yok (uyarı/kısıtlama bildirimi yok, videolar herkese açık). Bu boşluğa 3/gün göndermek hesabın 'etkileşimsiz' geçmişini büyütür." % (tt_izl, len(tt_yay)),
                  "kosul": "7 günlük izlenme 200'ü geçince DENE (günde 1); 1.000'i geçince plan YouTube ile aynı kotaya çıkar.",
                  "sunucudan_yapilamayan": "Hesabın ilk dağıtıma girmesi için telefondaki TikTok uygulamasından birkaç gün izleme/beğeni/takip ve 1 videonun uygulamadan yüklenmesi gerekir; bu sunucudan yapılamaz."}
    else:
        tiktok = {"karar": "SÜRDÜR" if tt else "VERİ YOK", "izlenme_7g": tt_izl, "yayinda": len(tt_yay), "okuma": tt.get("okuma")}
    out = {
        "tiktok": tiktok,
        "olusturma": simdi.isoformat(timespec="minutes"),
        "aciklama": "Otomatik yol haritası. Üretim/planlama yapan her ajan (Claude, Antigravity, CutkodA) önce buna uyar.",
        "kurallar": [
            "Günlük Short kotası aşılmaz; seri dağılımı 'plan' alanındaki gibidir.",
            "DURDUR kararındaki seriden yeni video üretilmez/planlanmaz; ERTELE eylemindeki planlar bu seriden çıkarılır, slota dağılımdaki ilk seri konur.",
            "DEĞİŞTİR kararındaki seride sıradaki videolar yeni kanca ve daha tanınmış konu ile üretilir (en iyi giden başlık örnek alınır).",
            "Aynı içerik bir kanalda iki kez açık kalmaz (GİZLE eylemi: silme yok, Gizli'ye alınır).",
            "Tablo serisinde sıralama: önce dünyaca tanınan eserler; az bilinen eser araya en fazla 3 günde bir girer.",
            "Her gün 19:00 Gündem + Tarih Short'u boş bırakılmaz (TR).",
            "YERELLEŞTİRME (kalıcı, 6 Kas 2026): her bölüm kanalının izleyicisine göre yapılır — TR: Türkiye (değerler, gündem/siyaset, spor, alışkanlıklar, kültür, etkileşim, özel günler); EN: İngiltere/ABD ya da genel dünya; ES: İspanya + Latin Amerika. Fotoğraf, video, ses, müzik ve metin tamamı o izleyiciye göre; bir sürümde başka ülkenin ayrıntısı olmaz.",
            "TikTok: 'tiktok.karar' DURDUR ise yeni TikTok planı yapılmaz (mevcut planlılar silinmez); karar hesap izlenmesine göre otomatik değişir.",
            "Başlık kalıbı: tek merak sorusu + emoji ('X neden Y? 😨', 'Gerçekte ne oldu?'); kanıtı: kanalın tutan Short'ları ve ABD'de Zack D. Films (29 M abone) aynı kalıpla büyüdü.",
            "İlk kare & döngü kuralı: Shorts'larda ilk 0.25 sn siyah ekran (fade-in) ve sonda uzun sessizlik/kararma KULLANILMAZ; ilk kare doğrudan parlak görsel kancayla başlar ve kesintisiz döngü (loop) yapar.",
            "Uzun–Kısa köprüsü: Her uzun belgesel video, aynı konudaki Short videolarına YouTube Studio 'İlgili Video (Related Video)' alanından bağlanır ('kopru_onerileri' listesi).",
            "Telif/marka: kulüp ve marka armaları/logoları, maç ve TV görüntüsü, UEFA/FIFA logo ve marşları, hazır müzik KULLANILMAZ. Kulüp adları ve takım renkleri serbest; müzik kanalın kendi üretimi ya da lisanslı olur.",
            "POV denemesi: trajedi/soykırım/savaş kurbanı POV'u YASAK (tepki ve topluluk kuralı riski); günlük yaşam, meslek, tuhaf adetler serbest. Görsellerde dönem doğruluğu kontrol edilir (ör. Roma binaları renkliydi).",
        ],
        "yeni_seri_denemeleri": [
            {"seri": "POV Tarih", "kanallar": ["Ancient Studio", "Antik Stüdyo"], "kota": "kanal başına günde 1 (DENE payından)",
             "kalip": "POV: 1750'de Paris'te bir perukçu olarak uyanıyorsun… (ilk 2 sn: tuhaf detay; sonda: gerçek mi efsane mi?)",
             "kanit": "TikTok #HistoryAI POV akımı on milyonlarca izlenme; kanalda en yakın format Tarihi Magazin (Fare: 3 saatte 328)",
             "basari": "3 bölümden sonra analiz motoru ARTIR/DURDUR kararını kendisi verir"},
            {"seri": "Neden? (tek soru)", "kanallar": ["Ancient Studio"], "kota": "Gündem + Tarih payının içinde",
             "kalip": "Why did Romans… ? / Why was … banned? — 30-45 sn, tek soru tek cevap",
             "kanit": "Zack D. Films (ABD) bu kalıpla 81 milyar izlenme; Antik Stüdyo'nun tutan Short'ları da soru başlıklı",
             "basari": "EN kanal Gündem + Tarih ARTIR kararında; aynı ölçüyle izlenir"},
        ],
        "plan": plan, "seriler": seriler, "esikler": esik, "saatler": saat_tablo,
        "takvim_aciklari": takvim_aciklari,
        "kopru_onerileri": kopru_onerileri,
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
