#!/usr/bin/env python3
"""AEMonitoring · Kompanzasyon — reaktif enerji oranlarını sınır içinde tutan otomasyon (Pi, 15 dk'da bir).

cihaz_yonetimi.py her tam çalıştırmada (5 dk) bunu ayrı süreç olarak başlatır; 14 dakikadan sık çalışmaz.

Döngü (her abone için):
  1. ÖLÇ    OSOS saatlik reaktif (2026_osos_reaktif.json: ri endüktif, rc kapasitif çekiş, kVArh) ve aktif çekiş
            (2026_osos_endeks.json); inverterlerin anlık reaktif gücü (FusionSolar / Sungrow).
  2. DEĞERLENDİR  Ay başından oran: endüktif = ri / çekiş, kapasitif = rc / çekiş. Sınır (yönetmelik) %20 / %15;
            hedef (emniyet payı) ve uyarı eşiği kompanzasyon.json'da. Son 7 günün eğilimiyle ay sonu tahmini.
  3. HESAPLA Saat profili (son 7 gün, saatin başlangıcına göre) → bu saatte inverterin ne kadar reaktif güç
            çekmesi (kapasitif fazlasını yok etmek için, "endüktif çalış") ya da vermesi (endüktif fazlası için,
            "kapasitif çalış") gerektiği. Ay oranı hedefi aştıysa bu saatlerde fazlanın tamamı sıfırlanmaya çalışılır.
            Komut uygulanıyorsa bir önceki saatin sonucu ile düzeltme (integral) yapılır.
  4. UYGULA  mod "otomatik" VE eyleyicinin yazma yolu doğrulanmışsa (kompanzasyon.json → yazici.<ad>.dogrulandi)
            komut n8n/kompanzasyon_komut.json kuyruğuna yazılır (en çok q_sinir_kvar, adım adim_kvar, 20 dk geçerli;
            veri bayatsa komut 0 = güç faktörü 1). Aksi halde yalnız "öneri" olarak kaydedilir; inverter ayarına
            dokunulmaz. Eyleyicisi olmayan abone (yalnız sayaç) için pano önerisi (kondansatör/reaktör kVAr) üretilir.
Çıktı: n8n/kompanzasyon_durum.json (panel › Kompanzasyon, Bildirimler › GES uyarısı).
Elle: python3 kompanzasyon.py [--kuru]   (--kuru: yazmaz, özet basar)
"""
import json, math, sys, time
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import AESUN, TR, gh, log, zaman

AYAR_YOL = "kompanzasyon.json"
DURUM_YOL = "n8n/kompanzasyon_durum.json"
KOMUT_YOL = "n8n/kompanzasyon_komut.json"
KARAR_YOL = "n8n/kompanzasyon_karar.json"        # n8n iş akışının hedef Q kararı (Pi okur, uygular)
DAMGA = AESUN / "kompanzasyon_son"

VARSAYILAN = {
    "mod": "oneri",                                   # izle | oneri | otomatik
    "karar_kaynagi": "n8n",                           # n8n: hedef Q'yu n8n iş akışı verir (n8n/kompanzasyon_karar.json), Pi uygular · pi: Pi kendi hesaplar
    "sinir": {"enduktif": 0.20, "kapasitif": 0.15},   # yönetmelik: şebekeden çekilen aktif enerjiye oranla
    "hedef": {"enduktif": 0.12, "kapasitif": 0.08},   # otomasyonun tutmaya çalıştığı değer (emniyet payı)
    "uyari": {"enduktif": 0.16, "kapasitif": 0.12},   # bu oranı geçince bildirim
    "adim_kvar": 1.0,
    "en_az_aralik_dk": 15,
    "komut_gecerlilik_dk": 20,
    "veri_bayat_saat": 4,
    "aboneler": {
        "tekyildiz_2": {"ad": "Tekyıldız 2 (Sera-2)", "eyleyici": "fusionsolar", "tesis": "Sera-2", "logger": "NE=73686042", "ip": None, "q_sinir_kvar": 30},
        "tekyildiz_1": {"ad": "Tekyıldız 1 (Sera-1)", "eyleyici": "fusionsolar", "tesis": "Sera-1", "logger": "NE=59224706", "ip": None, "q_sinir_kvar": 30},
        "yilmaz_darilmaz": {"ad": "Yılmaz Darılmaz", "eyleyici": "sungrow", "santral": "5064453", "q_sinir_kvar": 20},
        "anka_mineral": {"ad": "Anka Mineral", "eyleyici": "sungrow", "santral": "5038906", "q_sinir_kvar": 20},
        "aksaray_enerji": {"ad": "Aksaray Enerji Üretim", "eyleyici": None},
        "aksaray_3": {"ad": "Aksaray 3", "eyleyici": None},
    },
    "smartlogger_ip": ["192.168.1.10", "192.168.1.181"],   # saha ağında bulunan Huawei SmartLogger'lar (15 Eki ağ keşfi)
    "yazici": {
        "modbus": {"dogrulandi": False, "birim": 0, "q_kayit": None, "q_tur": "I32", "q_kazanc": 10, "q_isaret": 1,
                   "not": "doğrudan SmartLogger (saha ağı, Modbus TCP 502). 502 kapalı: SmartLogger web › Modbus TCP etkinleştirilmeli; kayıt ve işaret denemeyle doğrulanacak"},
        "fusionsolar": {"dogrulandi": False, "not": "SmartLogger reaktif ayarı (21004 / 21013) okundu; yazma uç noktası ve gece Q desteği doğrulanmadı"},
        "sungrow": {"dogrulandi": False, "not": "iSolarCloud parametre yazma doğrulanmadı"},
    },
}


def birlestir(a, b):
    o = dict(a)
    for k, v in (b or {}).items():
        o[k] = birlestir(a[k], v) if isinstance(v, dict) and isinstance(a.get(k), dict) else v
    return o


def saat_index(h):
    """OSOS saat anahtarı saatin bitişidir ("01" = 00:00–01:00): saatin başlangıcı."""
    return (int(h) + 23) % 24


def abone_analiz(ab, rk, en, a, simdi):
    veri, ender = (rk.get("veri") or {}), ((en or {}).get("veri") or {})
    ay = simdi.strftime("%Y-%m")
    gunler = sorted(g for g in veri if g.startswith(ay))
    S = {"cekis": 0.0, "ri": 0.0, "rc": 0.0}
    son = None
    for g in gunler:
        for h, x in veri[g].items():
            y = (ender.get(g) or {}).get(h)
            if y is None:
                continue                                   # aktif ölçümü olmayan saat orana katılmaz
            S["cekis"] += y.get("cekis") or 0
            S["ri"] += x.get("ri") or 0
            S["rc"] += x.get("rc") or 0
            son = max(son or "", f"{g} {h}")
    # son 7 gün profili (saatin başlangıcına göre) ve günlük ortalama
    p = {k: [0.0] * 24 for k in ("cekis", "ri", "rc")}
    n = [0] * 24
    g7 = sorted(veri)[-8:-1] if len(veri) > 1 else sorted(veri)    # bugünü (yarım gün) dışarıda bırak
    for g in g7:
        for h, x in veri[g].items():
            y = (ender.get(g) or {}).get(h)
            if y is None:
                continue
            i = saat_index(h)
            p["cekis"][i] += y.get("cekis") or 0
            p["ri"][i] += x.get("ri") or 0
            p["rc"][i] += x.get("rc") or 0
            n[i] += 1
    prof = {k: [round(v[i] / n[i], 2) if n[i] else 0.0 for i in range(24)] for k, v in p.items()}
    gun = {k: sum(prof[k]) for k in prof}
    # ay sonu tahmini
    son_gun = (simdi.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    kalan = max(0, (son_gun.date() - simdi.date()).days) + (24 - simdi.hour) / 24
    T = {k: S[k] + gun[k] * kalan for k in S}
    oran = lambda r, c: round(r / c, 4) if c > 0 else None
    o = {"cekis": round(S["cekis"], 1), "ri": round(S["ri"], 1), "rc": round(S["rc"], 1),
         "enduktif": oran(S["ri"], S["cekis"]), "kapasitif": oran(S["rc"], S["cekis"]),
         "tahmin_enduktif": oran(T["ri"], T["cekis"]), "tahmin_kapasitif": oran(T["rc"], T["cekis"]),
         "gun": len(gunler), "son_veri": son}
    durum = {}
    for t in ("enduktif", "kapasitif"):
        v, tv = o[t], o["tahmin_" + t]
        durum[t] = ("yok" if v is None else "asim" if v > a["sinir"][t] else
                    "dikkat" if v > a["uyari"][t] or (tv or 0) > a["sinir"][t] else "iyi")
    # son 24 saat (panel grafiği)
    son24 = []
    for g in sorted(veri)[-2:]:
        for h in sorted(veri[g]):
            y = (ender.get(g) or {}).get(h) or {}
            x = veri[g][h]
            son24.append({"t": f"{g} {h}", "cekis": round(y.get("cekis") or 0, 2), "ri": round(x.get("ri") or 0, 2), "rc": round(x.get("rc") or 0, 2)})
    return o, durum, prof, son24[-24:]


def q_plani(o, prof, a):
    """Saat başına inverter reaktif hedefi (kVAr). +: endüktif çalış (kapasitif fazlasını sıfırla), −: kapasitif çalış."""
    he, hk = a["hedef"]["enduktif"], a["hedef"]["kapasitif"]
    sifirla_k = (o.get("tahmin_kapasitif") or 0) > hk or (o.get("kapasitif") or 0) > hk
    sifirla_e = (o.get("tahmin_enduktif") or 0) > he or (o.get("enduktif") or 0) > he
    plan = []
    for i in range(24):
        c, ri, rc = prof["cekis"][i], prof["ri"][i], prof["rc"][i]
        q_al = rc if sifirla_k else max(0.0, rc - hk * c)
        q_ver = ri if sifirla_e else max(0.0, ri - he * c)
        plan.append(round(q_al - q_ver, 2))
    return plan, sifirla_k, sifirla_e


def inverter_q(fs, sg, cfg):
    """Abonenin inverterlerinin şu anki toplam reaktif gücü (kVAr, inverter işaretiyle) ve aktif gücü."""
    if cfg.get("eyleyici") == "fusionsolar":
        inv = [v for v in ((fs or {}).get("invertorler") or {}).values() if v.get("tesis") == cfg.get("tesis")]
        return (round(sum(v.get("reaktif_kvar") or 0 for v in inv), 2), round(sum(v.get("guc_kw") or 0 for v in inv), 1), len(inv), (fs or {}).get("guncelleme"))
    if cfg.get("eyleyici") == "sungrow":
        inv = list((((sg or {}).get("santraller") or {}).get(str(cfg.get("santral"))) or {}).values())
        return (round(sum((x.get("v") or {}).get("25") or 0 for x in inv) / 1000, 2), round(sum((x.get("v") or {}).get("24") or 0 for x in inv) / 1000, 1), len(inv), (sg or {}).get("guncelleme"))
    return None, None, 0, None


def main(kuru=False):
    simdi = datetime.now(TR)
    ayar0, ayar_sha = gh(AYAR_YOL)
    a = birlestir(VARSAYILAN, ayar0 or {})
    yil = simdi.year
    rk, _ = gh(f"{yil}_osos_reaktif.json")
    en, _ = gh(f"{yil}_osos_endeks.json")
    fs, _ = gh("n8n/fusionsolar_son.json")
    sg, _ = gh("n8n/sungrow_detay.json")
    eski, sha = gh(DURUM_YOL)
    eski = eski or {}
    duz = dict(eski.get("duzeltme") or {})
    olaylar = list(eski.get("olaylar") or [])
    kuyruk, k_sha = gh(KOMUT_YOL) if a["mod"] == "otomatik" else (None, None)
    # n8n kararı: "AEMonitoring · Kompanzasyon" iş akışı 15 dk'da bir hedef Q yazar. Bayat/yoksa Pi güvenli konuma (0) geçer.
    n8k, n8_taze = None, False
    if a.get("karar_kaynagi") == "n8n":
        try:
            n8k, _ = gh(KARAR_YOL)
            n8_taze = bool(n8k) and (simdi - zaman(n8k["guncellendi"])) <= timedelta(minutes=float(n8k.get("gecerli_dk") or 20) + 10)
        except Exception as e:
            log("n8n kararı okunamadı:", e)
    kuyruk = kuyruk or {"komutlar": []}
    yeni_komut = False
    h_simdi = simdi.hour
    erisim = erisim_yokla(a, eski)
    mb = a["yazici"].get("modbus") or {}
    sonuc = {}
    for ab, cfg in a["aboneler"].items():
        r = ((rk or {}).get("aboneler") or {}).get(ab)
        if not r:
            continue
        o, durum, prof, son24 = abone_analiz(ab, r, (en or {}).get(ab), a, simdi)
        plan, sk, se = q_plani(o, prof, a)
        try:
            bayat = not o["son_veri"] or (simdi - zaman(o["son_veri"][:10] + "T" + o["son_veri"][11:13] + ":00")) > timedelta(hours=a["veri_bayat_saat"])
        except Exception:
            bayat = True
        ey = cfg.get("eyleyici")
        q_olc, p_olc, n_inv, q_ts = inverter_q(fs, sg, cfg)
        # yazma yolu: 1) doğrudan SmartLogger Modbus (saha ağı) 2) uzaktan FusionSolar 3) yok (öneri)
        yol = ("modbus" if ey == "fusionsolar" and mb.get("dogrulandi") and cfg.get("ip") else
               ey if ey and (a["yazici"].get(ey) or {}).get("dogrulandi") else None)
        yaz = a["mod"] == "otomatik" and yol
        # geri besleme: komut uygulanıyorsa son tam saatte kalan fazlaya göre düzelt
        d = float(duz.get(ab) or 0)
        if yaz and son24:
            x = son24[-1]
            kalan_k = x["rc"] - a["hedef"]["kapasitif"] * x["cekis"]
            kalan_e = x["ri"] - a["hedef"]["enduktif"] * x["cekis"]
            d += 0.5 * (max(0, kalan_k) - max(0, kalan_e))
        else:
            d = 0.0
        qs = float(cfg.get("q_sinir_kvar") or 0)
        d = max(-qs, min(qs, d))
        duz[ab] = round(d, 2)
        q = 0.0 if bayat else plan[h_simdi] + d
        adim = a["adim_kvar"] or 1
        q = max(-qs, min(qs, round(q / adim) * adim)) if ey else round(q, 1)
        n8_not = None
        if a.get("karar_kaynagi") == "n8n" and ey == "fusionsolar":
            km = next((x for x in ((n8k or {}).get("komutlar") or []) if x.get("abone") == ab), None)
            if n8_taze and km and km.get("uygula"):
                q = max(-qs, min(qs, round(float(km.get("q_kvar") or 0) / adim) * adim))
                n8_not = f"n8n kararı ({n8k.get('guncellendi', '')[11:16]})"
            elif yaz:
                q = 0.0
                n8_not = "n8n kararı yok ya da bayat → güvenli konum (Q = 0)"
        yon = "endüktif" if q > 0 else "kapasitif" if q < 0 else "nötr (cosφ 1)"
        neden = []
        if n8_not:
            neden.append(n8_not)
        if bayat:
            neden.append("OSOS verisi bayat → güvenli konum (Q = 0)")
        if sk:
            neden.append("kapasitif ay oranı/tahmini hedefin üstünde: kapasitif çekiş sıfırlanıyor")
        if se:
            neden.append("endüktif ay oranı/tahmini hedefin üstünde: endüktif çekiş sıfırlanıyor")
        gece = [i for i in range(24) if abs(plan[i]) >= adim and (prof["cekis"][i] > 0 or prof["rc"][i] > 0) and i in (0, 1, 2, 3, 4, 5, 19, 20, 21, 22, 23)]
        oneri = {"saat": f"{h_simdi:02d}:00", "q_kvar": q, "yon": yon, "neden": "; ".join(neden) or "saat profiline göre"}
        # eyleyicisi yoksa sabit pano önerisi (gece ortalaması)
        pano = None
        if not ey:
            gq = [plan[i] for i in (0, 1, 2, 3, 4, 21, 22, 23)]
            ort = sum(gq) / len(gq)
            if abs(ort) >= 1:
                pano = (f"≈{math.ceil(abs(ort))} kVAr sabit " + ("şönt reaktör (kapasitif fazlası)" if ort > 0 else "kondansatör kademesi (endüktif fazlası)")
                        + " — kompanzasyon panosu/rölesi sahada kontrol edilmeli")
        eylem = "yok"
        if yaz:
            onceki = (eski.get("aboneler") or {}).get(ab, {}).get("komut") or {}
            gecen = (simdi - zaman(onceki["t"])).total_seconds() / 60 if onceki.get("t") else 1e9
            if abs(q - (onceki.get("q_kvar") or 0)) >= adim or gecen >= a["komut_gecerlilik_dk"] - 5:
                if (gecen >= a["en_az_aralik_dk"] or abs(q - (onceki.get("q_kvar") or 0)) >= adim) and yol == "modbus":
                    import smartlogger
                    try:
                        geri = smartlogger.q_yaz(cfg["ip"], q * float(mb.get("q_isaret", 1)), dict(mb, tesis=cfg.get("tesis")), qs)
                        eylem = "modbus"
                        olaylar.append({"t": simdi.strftime("%Y-%m-%d %H:%M"), "abone": ab, "olay": f"Modbus: Q {q:+.0f} kVAr yazıldı (geri okunan {geri:+.1f})"})
                    except Exception as e:
                        eylem = "hata"
                        olaylar.append({"t": simdi.strftime("%Y-%m-%d %H:%M"), "abone": ab, "olay": f"Modbus yazma hatası: {str(e)[:120]}"})
                elif gecen >= a["en_az_aralik_dk"] or abs(q - (onceki.get("q_kvar") or 0)) >= adim:
                    k = {"id": f"{ab}-{simdi:%Y%m%d%H%M}", "t": simdi.isoformat(timespec="seconds"), "abone": ab, "eyleyici": ey,
                         "logger": cfg.get("logger"), "santral": cfg.get("santral"), "q_kvar": q, "yon": yon,
                         "gecerli_dk": a["komut_gecerlilik_dk"], "durum": "bekliyor"}
                    kuyruk["komutlar"] = ([x for x in kuyruk["komutlar"] if x.get("abone") != ab or x.get("durum") != "bekliyor"] + [k])[-50:]
                    yeni_komut = True
                    eylem = "komut"
            komut = {"t": simdi.isoformat(timespec="seconds"), "q_kvar": q, "yol": yol} if eylem in ("komut", "modbus") else onceki
        else:
            komut = None
            eylem = "öneri" if a["mod"] != "izle" else "izle"
        sonuc[ab] = {"ad": cfg.get("ad", ab), "eyleyici": ey, "yazma": bool(yaz), "yol": yol, "ay": o, "durum": durum, "profil": prof,
                     "plan_kvar": plan, "son24": son24, "oneri": oneri, "pano": pano, "eylem": eylem, "komut": komut,
                     "olcum": {"q_kvar": q_olc, "p_kw": p_olc, "inverter": n_inv, "ts": q_ts},
                     "gece_saat": gece}
        # olay: durum değişimi
        ed = ((eski.get("aboneler") or {}).get(ab) or {}).get("durum") or {}
        for t in ("enduktif", "kapasitif"):
            if ed.get(t) and ed.get(t) != durum[t]:
                olaylar.append({"t": simdi.strftime("%Y-%m-%d %H:%M"), "abone": ab, "olay": f"{t} {ed[t]} → {durum[t]}",
                                "oran": o[t], "tahmin": o["tahmin_" + t]})
        eo = (((eski.get("aboneler") or {}).get(ab) or {}).get("oneri") or {}).get("q_kvar")
        if ey and eo is not None and abs((eo or 0) - q) >= 3:
            olaylar.append({"t": simdi.strftime("%Y-%m-%d %H:%M"), "abone": ab, "olay": f"hedef Q {eo:+.0f} → {q:+.0f} kVAr ({eylem})"})
    cikti = {"guncellendi": simdi.isoformat(timespec="seconds"), "surum": 1, "mod": a["mod"],
             "sinir": a["sinir"], "hedef": a["hedef"], "uyari": a["uyari"],
             "yazici": a["yazici"], "erisim": erisim, "aboneler": sonuc, "duzeltme": duz, "olaylar": olaylar[-100:],
             "ozet": {t: {k: v["durum"][t] for k, v in sonuc.items()} for t in ("enduktif", "kapasitif")}}
    if kuru:
        for ab, v in sonuc.items():
            print(f"{ab:16} end %{(v['ay']['enduktif'] or 0)*100:5.1f} ({v['durum']['enduktif']:6}) kap %{(v['ay']['kapasitif'] or 0)*100:5.1f} ({v['durum']['kapasitif']:6}) "
                  f"tahmin e%{(v['ay']['tahmin_enduktif'] or 0)*100:4.1f} k%{(v['ay']['tahmin_kapasitif'] or 0)*100:4.1f} · Q {v['oneri']['q_kvar']:+.0f} {v['oneri']['yon']} · {v['eylem']} · {v['pano'] or ''}")
        return cikti
    gh(DURUM_YOL, cikti, sha, f"kompanzasyon {simdi:%H:%M} ({a['mod']})")
    if yeni_komut:
        kuyruk["guncellendi"] = simdi.isoformat(timespec="seconds")
        gh(KOMUT_YOL, kuyruk, k_sha, f"kompanzasyon komutu {simdi:%H:%M}")
    if ayar0 is None:
        try:
            gh(AYAR_YOL, VARSAYILAN, None, "kompanzasyon ayarı (varsayılan)")
        except Exception as e:
            log("kompanzasyon ayarı yazılamadı:", e)
    return cikti


def erisim_yokla(a, eski, dk=60):
    """Saatte bir YALNIZ OKUMA: SmartLogger'lara doğrudan erişim (443 / 502) — sonuç durum dosyasında "erisim"."""
    e = dict(eski.get("erisim") or {})
    try:
        son = zaman(e["t"]) if e.get("t") else None
    except Exception:
        son = None
    if son and datetime.now(TR) - son < timedelta(minutes=dk):
        return e
    try:
        import smartlogger
        return {"t": datetime.now(TR).isoformat(timespec="seconds"), "smartlogger": smartlogger.yokla(a.get("smartlogger_ip") or [])}
    except Exception as x:
        return {"t": datetime.now(TR).isoformat(timespec="seconds"), "hata": str(x)[:200]}


def zamani_geldi(dk=14):
    try:
        return time.time() - DAMGA.stat().st_mtime >= dk * 60
    except FileNotFoundError:
        return True


if __name__ == "__main__":
    if "--kuru" in sys.argv:
        main(kuru=True)
    else:
        DAMGA.parent.mkdir(parents=True, exist_ok=True)
        DAMGA.touch()
        try:
            main()
            log("kompanzasyon tamam")
        except Exception as e:
            log("kompanzasyon hatası:", e)
            raise
