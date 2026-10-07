#!/usr/bin/env python3
"""AEMonitoring · Madenci ısınma öğrenmesi (Pi, crontab ile dakikada bir).

Ne yapar:
  1) Örnek: GitHub'daki antminer_panel.json yenilendikçe her cihazın (çevrimiçi, uyku, hash, su sıcaklığı,
     çip sıcaklığı, çalışma süresi) değerlerini ~/.aesun/cihaz_iz/GÜN.jsonl dosyasına ekler (14 gün saklanır).
  2) Analiz (30 dakikada bir ya da --analiz): her "uyanış"ı bulur ve ölçer:
       - uyandırma anı (komut sonucu varsa o an, yoksa cihazın uyku/kapalıdan çıktığı ilk örnek)
       - suyun başlangıç sıcaklığı (su0) ve uyku/kapalı kalma süresi
       - ilk hash'e kadar geçen süre (ön ısıtma: Hydro cihaz suyu ~45 °C'ye ısıtana kadar hash vermez)
       - cihazın kendi normal hash'inin %90 / %95 / %99'una ulaşma süreleri
     Bu olaylardan model kurar:  t95 = a + b × max(0, 45 − su0)   (su soğuksa ısınma uzar)
     ve uyku süresine göre suyun ne kadar soğuduğunu (su0 medyanı) öğrenir.
  3) Geri besleme: sistemin verdiği her uyandırma komutunda, hedef saatte filo %95'e ulaşmış mı bakar.
     Kaçırdıysa emniyet payını 2 dk artırır; gereksiz erken kaldıysa 1 dk azaltır.
  Sonuç: epias-ptf/n8n/cihaz_ogrenme.json (panel ve cihaz_yonetimi.py buradan okur).

Elle:  python3 cihaz_ogrenme.py            (örnek al; 30 dk geçtiyse analiz)
       python3 cihaz_ogrenme.py --analiz   (hemen analiz et ve yaz)
"""
import argparse, json, statistics as ST, sys, time
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import AESUN, TOK, TR, gh, log, zaman  # noqa: E402

IZ = AESUN / "cihaz_iz"
YEREL = AESUN / "cihaz_ogrenme_yerel.json"
TAKVIM = AESUN / "cihaz_takvim.json"
DOSYA = "n8n/cihaz_ogrenme.json"
SU_HEDEF = 45.0            # Hydro cihazlar suyu bu civara ısıtınca hash vermeye başlıyor (6 Ekim verisi)
VARSAYILAN_MODEL = {       # 6 Ekim 2026 sabah uyanışından (27 cihaz) çıkarılan başlangıç değerleri
    "a": 4.0, "b": 0.55, "a_ilk": 1.5, "b_ilk": 0.45, "d99": 12.0,
    "sn_cihaz": 12.0, "emniyet_dk": 3.0,
}
GRID = list(range(0, 61, 2))   # ortalama ısınma eğrisi için dakika noktaları


# ---------------------------------------------------------------- örnekleme
def ornek_al():
    mad, _ = gh("antminer_panel.json")
    if not mad or not mad.get("timestamp"):
        return False
    IZ.mkdir(parents=True, exist_ok=True)
    son = IZ / "son_ts"
    if son.exists() and son.read_text().strip() == mad["timestamp"]:
        return False
    c = []
    for d in mad.get("devices") or []:
        c.append([d.get("suffix"), 1 if d.get("online") else 0, 1 if d.get("sleeping") else 0, d.get("hashrate_TH"),
                  d.get("temp_water"), d.get("temp_max"), d.get("elapsed_hours"), d.get("status"),
                  d.get("actual_worker") or d.get("f2pool_name"), d.get("target_hashrate_TH")])
    ts = zaman(mad["timestamp"])
    with open(IZ / (ts.strftime("%Y-%m-%d") + ".jsonl"), "a") as f:
        f.write(json.dumps({"ts": ts.isoformat(timespec="seconds"), "c": c}) + "\n")
    son.write_text(mad["timestamp"])
    for eski in IZ.glob("*.jsonl"):           # 14 günden eskiyi sil
        if eski.stem < (datetime.now(TR) - timedelta(days=14)).strftime("%Y-%m-%d"):
            eski.unlink()
    return True


def ornekleri_oku(gun=4):
    """{suffix: [satır, ...]} — satır: dict(ts, on, sl, h, su, t, el, st, w, tg)"""
    cihaz = {}
    sinir = (datetime.now(TR) - timedelta(days=gun)).strftime("%Y-%m-%d")
    for f in sorted(IZ.glob("*.jsonl")):
        if f.stem < sinir:
            continue
        for s in f.read_text().splitlines():
            try:
                o = json.loads(s)
            except Exception:
                continue
            ts = zaman(o["ts"])
            for x in o["c"]:
                x = list(x) + [None] * (10 - len(x))
                cihaz.setdefault(x[0], []).append({"ts": ts, "on": x[1], "sl": x[2], "h": x[3], "su": x[4], "t": x[5],
                                                    "el": x[6], "st": x[7], "w": x[8], "tg": x[9]})
    for v in cihaz.values():
        v.sort(key=lambda r: r["ts"])
    return cihaz


# ---------------------------------------------------------------- olay çıkarımı
def _hashliyor(r):
    return bool(r["on"]) and not r["sl"] and (r["h"] or 0) > 0


def _ref_hash(rs):
    """Cihazın normal hash'i: açılıştan ≥1 saat sonraki örneklerin medyanı; yoksa hedef hash."""
    v = sorted(r["h"] for r in rs if _hashliyor(r) and (r["el"] or 0) >= 1.0)
    if len(v) >= 5:
        return v[len(v) // 2]
    tg = [r["tg"] for r in rs if r.get("tg")]
    return tg[-1] if tg else None


def _komut_zamanlari(sonuclar):
    """{suffix: [wake zamanı, ...]} — altminer komut sonuçlarından (başarılı olanlar)."""
    z = {}
    for k in (sonuclar or {}).get("results") or []:
        if k.get("action") != "wake":
            continue
        for r in k.get("results") or []:
            if r.get("ok") and r.get("time"):
                try:
                    z.setdefault(int(r["suffix"]), []).append(zaman(r["time"]))
                except Exception:
                    pass
    return z


def olaylari_bul(cihaz, sonuclar=None):
    kz = _komut_zamanlari(sonuclar)
    olaylar = []
    for s, rs in cihaz.items():
        ref = _ref_hash(rs)
        if not ref:
            continue
        for i in range(2, len(rs)):
            r = rs[i]
            if not _hashliyor(r) or _hashliyor(rs[i - 1]) or _hashliyor(rs[i - 2]):
                continue                       # en az 2 örnek hash'siz olmalı (tek örnek sapması olay değil)
            if (r["ts"] - rs[i - 1]["ts"]) > timedelta(minutes=6):
                continue                       # veri boşluğu: başlangıç anı bilinemez
            # Geriye doğru: ön ısıtma (su yükseliyor / çevrimiçi ama hash 0) örneklerini topla
            j = i - 1
            while j > 0:
                a, b = rs[j - 1], rs[j]
                if (b["ts"] - a["ts"]) > timedelta(minutes=6) or _hashliyor(a) or not a["on"]:
                    break
                if a["sl"] and not (a["su"] or 0):          # komutla uyku (su okunmuyor)
                    break
                if a["su"] and b["su"] and a["su"] > b["su"] + 0.5:   # su soğuyor = uyku, ısınma değil
                    break
                j -= 1
            t0 = rs[j]["ts"]
            yontem = "örnek"
            if j > 0 and (not rs[j - 1]["on"] or rs[j - 1]["sl"]):
                t0 = rs[j - 1]["ts"] + (rs[j]["ts"] - rs[j - 1]["ts"]) / 2   # geçiş iki örneğin ortasında
            for kt in kz.get(int(s), []):                     # komut sonucu varsa kesin an
                if rs[j]["ts"] - timedelta(minutes=10) <= kt <= r["ts"]:
                    t0, yontem = kt, "komut"
            # kapalı/uykuda kalma süresi: son hash'li örnekten t0'a
            onceki = next((x["ts"] for x in reversed(rs[:j]) if _hashliyor(x)), None)
            kapali_saat = round((t0 - onceki).total_seconds() / 3600, 2) if onceki else None
            su0 = next((x["su"] for x in rs[j:i + 1] if x["su"]), None)
            # ilerisi: oranlar
            ilk = (r["ts"] - t0).total_seconds() / 60
            esik = {0.9: None, 0.95: None, 0.99: None}
            egri = {}
            son_dk = None
            for x in rs[i:]:
                dk = (x["ts"] - t0).total_seconds() / 60
                if dk > 75:
                    break
                if not x["on"] or x["sl"]:
                    break                               # tekrar uyudu/kapandı
                son_dk = dk
                f = (x["h"] or 0) / ref
                for e in esik:
                    if esik[e] is None and f >= e:
                        esik[e] = round(dk, 1)
                egri[round(dk, 1)] = round(min(f, 1.1), 3)
            if son_dk is None or (son_dk < 30 and esik[0.95] is None):
                continue                               # yeterli takip yok
            olaylar.append({
                "cihaz": int(s), "w": r.get("w"), "t0": t0.isoformat(timespec="seconds"), "yontem": yontem,
                "su0": su0, "kapali_saat": kapali_saat, "ref": round(ref, 1),
                "t_ilk": round(ilk, 1), "t90": esik[0.9], "t95": esik[0.95], "t99": esik[0.99],
                "egri": [[k, v] for k, v in sorted(egri.items())],
            })
    return olaylar


# ---------------------------------------------------------------- model
def _dogru(xs, ys, a0, b0):
    """En küçük kareler y = a + b·x (a, b ≥ 0); az veri varsa varsayılan."""
    if len(xs) < 4 or len(set(xs)) < 2:
        return a0, b0
    mx, my = ST.mean(xs), ST.mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx if sxx else 0
    b = min(max(b, 0.0), 2.0)
    a = max(my - b * mx, 0.0)
    return round(a, 2), round(b, 3)


def model_kur(olaylar, eski=None):
    m = {**VARSAYILAN_MODEL, **{k: v for k, v in (eski or {}).items() if k in ("emniyet_dk", "sn_cihaz")}}
    ok = [o for o in olaylar if o.get("su0") and o.get("t95") is not None]
    xs = [max(0.0, SU_HEDEF - o["su0"]) for o in ok]
    m["a"], m["b"] = _dogru(xs, [o["t95"] for o in ok], VARSAYILAN_MODEL["a"], VARSAYILAN_MODEL["b"])
    m["a_ilk"], m["b_ilk"] = _dogru(xs, [o["t_ilk"] for o in ok], VARSAYILAN_MODEL["a_ilk"], VARSAYILAN_MODEL["b_ilk"])
    # filo için sapma payı: gözlenen t95 − model tahmini farklarının %80'liği (yavaş cihazlar da hazır olsun)
    art = sorted(o["t95"] - (m["a"] + m["b"] * max(0.0, SU_HEDEF - o["su0"])) for o in ok)
    m["p80_ek"] = round(max(0.0, art[int(len(art) * 0.8)]), 1) if len(art) >= 5 else 2.0
    d = [o["t99"] - o["t95"] for o in olaylar if o.get("t99") is not None and o.get("t95") is not None]
    if len(d) >= 4:
        m["d99"] = round(ST.median(d), 1)
    # uyku süresine göre su0 (soğuma) — kovalar
    m["su0_kova"] = {}
    for ad, lo, hi in KOVALAR:
        v = [o["su0"] for o in olaylar if o.get("su0") and o.get("kapali_saat") is not None and lo <= o["kapali_saat"] < hi]
        if v:
            m["su0_kova"][ad] = {"medyan": round(ST.median(v), 1), "min": min(v), "n": len(v)}
    v = [o["su0"] for o in olaylar if o.get("su0")]
    m["su0_genel"] = round(ST.median(v), 1) if v else 30.0
    m["n"] = len(olaylar)
    m["n_model"] = len(ok)
    return m


KOVALAR = [("<1 sa", 0, 1), ("1–4 sa", 1, 4), ("4–12 sa", 4, 12), (">12 sa", 12, 1e9)]


def su_tahmin(m, kapali_saat=None, canli_su=None):
    """Uyandırma anında beklenen su sıcaklığı. Canlı okuma (uyuyan cihazlardan) en iyisidir;
    yoksa uyku süresinin kovası (min ile medyanın ortası — temkinli); kova boşsa en yakın DAHA UZUN kova
    (daha soğuk = daha temkinli), o da yoksa en yakın kısa kova; hiçbiri yoksa genel medyan."""
    if canli_su:
        return float(canli_su), "canlı (uyuyan cihazlar)"
    kv = m.get("su0_kova") or {}
    if kapali_saat is not None:
        i = next(i for i, (_, lo, hi) in enumerate(KOVALAR) if lo <= kapali_saat < hi)
        sira = [i] + list(range(i + 1, len(KOVALAR))) + list(range(i - 1, -1, -1))
        for j in sira:
            ad = KOVALAR[j][0]
            k = kv.get(ad)
            if k:
                return round((k["medyan"] + k["min"]) / 2, 1), f"öğrenilmiş ({ad} uyku, {k['n']} olay)"
    return float(m.get("su0_genel", 30.0)), "genel medyan"


def isinma(m, su0, filo=False):
    """Beklenen süreler (dk): ilk hash, %95, %99. filo=True: yavaş cihazlar için %80'lik sapma payı eklenir."""
    x = max(0.0, SU_HEDEF - su0)
    ek = m.get("p80_ek", 0.0) if filo else 0.0
    t_ilk = m["a_ilk"] + m["b_ilk"] * x + ek / 2
    t95 = max(m["a"] + m["b"] * x + ek, t_ilk + 1)
    return {"t_ilk": round(t_ilk, 1), "t95": round(t95, 1), "t99": round(t95 + m["d99"], 1)}


def oran(m, su0, dk, filo=True):
    """Uyandırmadan dk dakika sonra beklenen hash oranı (0..1)."""
    s = isinma(m, su0, filo)
    if dk < s["t_ilk"]:
        return 0.0
    if dk < s["t95"]:
        return 0.75 + 0.20 * (dk - s["t_ilk"]) / max(s["t95"] - s["t_ilk"], 0.1)
    if dk < s["t99"]:
        return 0.95 + 0.04 * (dk - s["t95"]) / max(s["t99"] - s["t95"], 0.1)
    return 1.0


def ortalama_egri(olaylar):
    out = []
    for g in GRID:
        v = []
        for o in olaylar:
            e = o.get("egri") or []
            if not e or e[-1][0] < g:
                continue
            onc = [p for p in e if p[0] <= g]
            v.append(onc[-1][1] if onc else 0.0)
        out.append([g, round(ST.median(v), 3) if v else None, len(v)])
    return out


# ---------------------------------------------------------------- geri besleme (isabet)
def isabet_degerlendir(cihaz, m, yerel):
    """Takvimdeki uyandırmalar: hedef anda (saat başı) uyandırılan cihazların toplam hash'i normalin %95'ine ulaşmış mı?"""
    if not TAKVIM.exists():
        return []
    tk = json.loads(TAKVIM.read_text())
    yeni = []
    bakilan = set(yerel.get("isabet_bakilan") or [])
    simdi = datetime.now(TR)
    for u in tk.get("gonderilen") or []:
        if u.get("eylem") != "wake" or not u.get("hedef") or u["hedef"] in bakilan:
            continue
        hedef = zaman(u["hedef"])
        if simdi < hedef + timedelta(minutes=20):
            continue
        top_h = top_ref = 0.0
        hazir = None
        for s, rs in cihaz.items():
            ref = _ref_hash(rs)
            yak = [r for r in rs if abs((r["ts"] - hedef).total_seconds()) <= 120]
            if not ref or not yak or not yak[0]["on"]:
                continue
            top_h += yak[0]["h"] or 0
            top_ref += ref
        if top_ref <= 0:
            bakilan.add(u["hedef"])
            continue
        # filo %95'e ne zaman ulaştı?
        zamanlar = sorted({r["ts"] for rs in cihaz.values() for r in rs if zaman(u["t_komut"]) <= r["ts"] <= hedef + timedelta(minutes=30)})
        for t in zamanlar:
            hh = sum((next((r["h"] or 0 for r in rs if r["ts"] == t), 0)) for rs in cihaz.values())
            if hh >= 0.95 * top_ref:
                hazir = t
                break
        f = top_h / top_ref
        sonuc = {"hedef": u["hedef"], "t_komut": u["t_komut"], "oran_hedefte": round(f, 3),
                 "hazir": hazir.isoformat(timespec="seconds") if hazir else None,
                 "erken_dk": round((hedef - hazir).total_seconds() / 60, 1) if hazir else None}
        if f < 0.95:
            m["emniyet_dk"] = min(20.0, m["emniyet_dk"] + 2)
            sonuc["ayar"] = "+2 dk (geç kaldı)"
        elif sonuc["erken_dk"] is not None and sonuc["erken_dk"] > 8:
            m["emniyet_dk"] = max(0.0, m["emniyet_dk"] - 1)
            sonuc["ayar"] = "−1 dk (gereğinden erken)"
        else:
            sonuc["ayar"] = "tamam"
        yeni.append(sonuc)
        bakilan.add(u["hedef"])
    yerel["isabet_bakilan"] = sorted(bakilan)[-200:]
    return yeni


def komut_hizi(sonuclar, eski):
    v = []
    for k in (sonuclar or {}).get("results") or []:
        try:
            if k.get("success_count") and k.get("total", 0) > 3:
                v.append((zaman(k["executed_at"]) - zaman(k["started_at"])).total_seconds() / k["total"])
        except Exception:
            pass
    return round(ST.median(v), 1) if v else eski


# ---------------------------------------------------------------- f2pool saatlik arşivden mevsimsel ilk saat verimi
def f2pool_ilk_saat():
    simdi = datetime.now(TR)
    H = {}
    y, a_ = simdi.year, simdi.month
    for i in range(0, 6):
        ay = f"{y}-{a_:02d}"
        y, a_ = (y, a_ - 1) if a_ > 1 else (y - 1, 12)
        d, _ = gh(f"arsiv_cihaz_{ay}.json")
        H.update(d or {})
    ks = sorted(H)
    ay_oran = {}
    for i in range(2, len(ks) - 4):
        for w, v in (H[ks[i]] or {}).items():
            p1 = (H[ks[i - 1]].get(w) or {}).get("h", 0)
            p2 = (H[ks[i - 2]].get(w) or {}).get("h", 0)
            if p1 == 0 and p2 == 0 and v.get("h", 0) > 0:
                nx = [(H[ks[j]].get(w) or {}).get("h", 0) for j in range(i + 1, i + 4)]
                if min(nx) > 0:
                    ay_oran.setdefault(ks[i][:7], []).append(v["h"] / ST.median(nx))
    return {a: {"medyan": round(ST.median(v), 2), "n": len(v)} for a, v in sorted(ay_oran.items())}


# ---------------------------------------------------------------- ana
def analiz(zorla=False):
    yerel = json.loads(YEREL.read_text()) if YEREL.exists() else {}
    if not zorla and time.time() - yerel.get("son_analiz", 0) < 1800:
        return
    eski, sha = gh(DOSYA)
    eski = eski or {}
    cihaz = ornekleri_oku(gun=4)
    sonuclar, _ = gh("antminer_command_results.json")
    yeni = olaylari_bul(cihaz, sonuclar)
    # birleştir (aynı cihaz + aynı dakika = aynı olay)
    tum = {f"{o['cihaz']}|{o['t0'][:16]}": o for o in eski.get("olaylar") or []}
    for o in yeni:
        tum[f"{o['cihaz']}|{o['t0'][:16]}"] = o
    olaylar = sorted(tum.values(), key=lambda o: o["t0"])[-400:]
    m = model_kur(olaylar, eski.get("model"))
    m["sn_cihaz"] = komut_hizi(sonuclar, m.get("sn_cihaz", VARSAYILAN_MODEL["sn_cihaz"]))
    isabet = (eski.get("isabet") or []) + isabet_degerlendir(cihaz, m, yerel)
    f2 = eski.get("f2pool_ilk_saat")
    if zorla or not f2 or time.time() - yerel.get("son_f2", 0) > 6 * 3600:
        try:
            f2 = f2pool_ilk_saat()
            yerel["son_f2"] = time.time()
        except Exception as e:
            log("f2pool ilk saat hesaplanamadı:", e)
    ornek = {f"{su}°C": isinma(m, su, filo=True) for su in (20, 25, 30, 35, 40, 45)}
    cikti = {
        "guncellendi": datetime.now(TR).isoformat(timespec="seconds"),
        "model": m, "ornek_isinma": ornek, "ortalama_egri": ortalama_egri(olaylar),
        "olaylar": olaylar, "isabet": isabet[-100:], "f2pool_ilk_saat": f2,
        "aciklama": "t95 = a + b × max(0, 45 − su0) dk; su0 = uyandırma anındaki su sıcaklığı. "
                    "Öncü süre = t95 + sıralı komut yayılımı + emniyet payı (isabete göre kendini ayarlar).",
    }
    if {k: v for k, v in cikti.items() if k != "guncellendi"} != {k: v for k, v in eski.items() if k != "guncellendi"}:
        gh(DOSYA, cikti, sha, f"ısınma öğrenmesi: {len(olaylar)} olay, emniyet {m['emniyet_dk']} dk")
    yerel["son_analiz"] = time.time()
    YEREL.parent.mkdir(parents=True, exist_ok=True)
    YEREL.write_text(json.dumps(yerel))
    log(f"analiz: {len(yeni)} yeni/{len(olaylar)} toplam olay; t95 = {m['a']} + {m['b']}×(45−su0); "
        f"emniyet {m['emniyet_dk']} dk; {m['sn_cihaz']} sn/cihaz")


# ---------------------------------------------------------------- saatlik saha özeti (panel: anlık gerçekleşen maliyet / gelir)
JTH = {"S21e Hyd": 17.5, "S19 XP+ Hyd": 21.5, "S19e XP Hyd": 34.5}   # J/TH: antminer arşivindeki güç tahmini / hash (plan ile aynı kaynak)
ISINMA_KW = 1.0     # ön ısıtmada (açık, hash yok) cihaz başına varsayılan çekiş; pompa + ısıtma
SAATLIK = "n8n/saha_saatlik.json"


def saatlik_yaz(zorla=False):
    """Son 2 günün örneklerinden saat saat: ortalama toplam hash (TH/s), ortalama filo gücü (kW), çalışan/ısınan/uyuyan sayısı.
    Panel bunu PTF+YEKDEM ve hashprice ile çarpıp saatlik gerçekleşen enerji maliyeti ve BTC gelirini (₺/saat) çizer."""
    son = AESUN / "saatlik_son"
    simdi = datetime.now(TR)
    if not zorla and son.exists() and time.time() - son.stat().st_mtime < 290:
        return
    kim = {}
    try:
        kf = AESUN / "cihaz_kimlik.json"
        if not kf.exists() or time.time() - kf.stat().st_mtime > 6 * 3600:
            k, _ = gh("n8n/cihaz_kimlik.json")
            if k:
                kf.write_text(json.dumps(k))
        kim = json.loads(kf.read_text()) if kf.exists() else {}
    except Exception:
        pass
    satirlar = {}
    sinir = (simdi - timedelta(days=2)).strftime("%Y-%m-%d")
    for f in sorted(IZ.glob("*.jsonl")):
        if f.stem < sinir:
            continue
        for s_ in f.read_text().splitlines():
            try:
                o = json.loads(s_)
            except Exception:
                continue
            ts = zaman(o["ts"])
            th = kw = 0.0
            cal = isi = uy = ulas = 0
            for x in o["c"]:
                x = list(x) + [None] * (10 - len(x))
                on, sl, h, w = x[1], x[2], x[3] or 0, str(x[8] or "").split(".")[-1]
                if not (on or sl):
                    continue
                ulas += 1
                if sl:
                    uy += 1
                elif h > 0:
                    cal += 1
                    th += h
                    kw += h * JTH.get((kim.get(w) or {}).get("model"), 17.5) / 1000
                else:
                    isi += 1
                    kw += ISINMA_KW
            k = ts.strftime("%Y-%m-%d %H")
            r = satirlar.setdefault(k, {"n": 0, "th": 0.0, "kw": 0.0, "cal": 0, "isi": 0, "uy": 0, "ulas": 0, "ilk": ts, "son": ts})
            r["n"] += 1; r["th"] += th; r["kw"] += kw; r["cal"] += cal; r["isi"] += isi; r["uy"] += uy; r["ulas"] += ulas
            r["son"] = max(r["son"], ts); r["ilk"] = min(r["ilk"], ts)
    saat = {}
    for k, r in sorted(satirlar.items()):
        n = r["n"]
        if r["ulas"] / n < 1:        # toplayıcı cihazlara ulaşamamış: veri yok (sıfır değil)
            continue
        saat[k] = {"n": n, "th": round(r["th"] / n, 1), "kw": round(r["kw"] / n, 2), "calisan": round(r["cal"] / n, 1),
                   "isinan": round(r["isi"] / n, 1), "uyuyan": round(r["uy"] / n, 1), "ulasilan": round(r["ulas"] / n, 1),
                   "ilk": r["ilk"].strftime("%H:%M"), "son": r["son"].strftime("%H:%M")}
    if not saat:
        return
    _, sha = gh(SAATLIK)
    gh(SAATLIK, {"guncellendi": simdi.isoformat(timespec="seconds"), "jth": JTH, "isinma_kw": ISINMA_KW, "saat": saat}, sha,
       "Saha saatlik " + simdi.strftime("%H:%M"))
    son.write_text(simdi.isoformat())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--analiz", action="store_true")
    x = ap.parse_args()
    if not TOK:
        sys.exit("GITHUB_TOKEN yok (~/.aesun/osos.env)")
    try:
        ornek_al()
    except Exception as e:
        log("örnek alınamadı:", e)
    # saatlik saha özeti artık epias-ptf GitHub Actions'ta (saha_saatlik.yml); saatlik_yaz() elle kullanım için duruyor
    analiz(zorla=x.analiz)
