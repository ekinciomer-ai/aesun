#!/usr/bin/env python3
"""AEMonitoring · Madenci cihaz yönetimi (Pi, crontab: 5 dakikada bir tam hesap, dakikada bir --tetik).

Kural:
  a) Güneş üretimi varken (FusionSolar Sera-1 + Sera-2 anlık güç > eşik) cihazlar ÇALIŞIR; PTF'ye bakılmaz.
  b) Üretim yokken: saatlik enerji maliyeti > saatlik BTC geliri ise cihazlar UYUR, aksi halde ÇALIŞIR.

Zamanlama (gerçek ısınma verisinden öğrenilir — cihaz_ogrenme.py):
  - Hydro cihazlar uyanınca önce suyu ~45 °C'ye ısıtır, sonra hash'e başlar. Su soğuksa ısınma uzar.
  - UYANDIRMA, kârlı saat başlamadan ÖNCE verilir: öncü süre, saat başlarken filo %95'te olacak şekilde
    dakika dakika maliyet/gelir hesabıyla seçilir (ısınma eğrisi + sıralı komut yayılımı) + emniyet payı.
    Emniyet payı, her uyandırmanın gerçekleşen sonucuna göre kendini ayarlar.
  - UYUTMA, zararlı saat başlarken verilir (sıralı yayılımın yarısı kadar önce).
  - KISA DURUŞ kontrolü: zararlı pencere kısa ise ve uyutup yeniden ısıtmanın kaybı (soğuyan su, ön ısıtma
    enerjisi, eksik hash) kazancı aşıyorsa cihazlar uyutulmaz.

Maliyet (cihaz başı, TL/saat) = [(PTF + YEKDEM) × komisyon × (1 + BTV) + dağıtım] / 1000 × cihaz_guc_kw   (KDV hariç; fatura birimleri)
Gelir   (cihaz başı, TL/saat) = hashprice (BTC / TH / gün, F2Pool son N gün) × cihaz_th / 24 × BTC/TL

Ayarlar ve mod: GitHub epias-ptf/cihaz_yonetimi.json
  mod: "izleme" (yalnız hesaplar, komut göndermez) | "otomatik" (antminer_commands.json'a yazar) | "kapali"
Durum, plan ve takvim: epias-ptf/n8n/cihaz_yonetimi_durum.json (panel buradan okur).

Elle:  python3 cihaz_yonetimi.py            (tam hesap)
       python3 cihaz_yonetimi.py --tetik    (yalnız zamanı gelen komutu gönderir; dakikada bir)
       python3 cihaz_yonetimi.py --mod otomatik|izleme|kapali
"""
import argparse, json, math, sys, time, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import AESUN, TOK, TR, bildirim_tetikle, gh, log, zaman  # noqa: E402
import cihaz_ogrenme as OG  # noqa: E402

YEREL = AESUN / "cihaz_yonetimi_yerel.json"
TAKVIM = AESUN / "cihaz_takvim.json"
ENLEM, BOYLAM = 38.37, 34.03          # Aksaray (güneş doğuş/batış tahmini)
VARSAYILAN = {
    "mod": "izleme",
    "cihaz_sayisi": 29,
    "cihaz_guc_kw": "oto",        # cihaz başı güç (kW); "oto": son antminer arşivindeki tahmini güç ortalaması
    "cihaz_th": "oto",            # cihaz başı hashrate (TH/s); "oto": cihazların son 7 gün çalışırkenki ortalaması
    "komisyon": 1.025,            # tedarikçi PTF + YEKDEM komisyonu (%2,5, Erkim)
    "btv": 0.01,                  # belediye tüketim vergisi (enerji bedeli üzerinden)
    "dagitim_tl_mwh": 1182.457,   # dağıtım bedeli (OG tek terim sanayi); KDV hesaba katılmaz (indirilir)
    "basabas_tolerans": 0.25,     # PTF, başabaş PTF'nin bu oran fazlasına kadar ise yine çalış (8 Eki kararı: %25)
    "uretim_esik_kw": 50,         # Sera-1 + Sera-2 anlık gücü bunun üstündeyse "üretim var"
    "hashprice_gun": 7,           # hashprice için son kaç günün F2Pool geliri
    "komut_arasi_dk": 15,         # aynı komut en erken bu kadar dakika sonra tekrarlanır
    "sirali_gecikme_sn": 10,      # cihazlar arasına konan gecikme (ani yük binmesin)
    "on_isitma": True,            # kârlı saatten önce öğrenilmiş süre kadar erken uyandır
    "kisa_durus_kontrol": True,   # uyutup ısıtmak zararlıysa kısa pencerede uyutma
    "en_fazla_oncu_dk": 60,
    "oncu_politika": "hazir",     # "hazir": saat başında filo %95'te olsun | "ekonomik": dakika bazlı kâr en yüksek
}


def ayar_oku():
    a, _ = gh("cihaz_yonetimi.json")
    if a is None:
        a = dict(VARSAYILAN)
        gh("cihaz_yonetimi.json", a, None, "cihaz yönetimi: varsayılan ayarlar (izleme modu)")
        return a
    return {**VARSAYILAN, **a}


def hashprice(gelir, n):
    gunler = sorted(g for g in gelir if g[:1].isdigit() and gelir[g].get("hash_rate"))[-n:]
    v = [gelir[g]["btc"] / gelir[g]["hash_rate"] for g in gunler if gelir[g]["hash_rate"] > 0]
    return (sum(v) / len(v) if v else None), (gunler[0] if gunler else None), (gunler[-1] if gunler else None)


def cihaz_th_hesapla(a, mad, simdi):
    """Cihaz başı hashrate: ayarda sayı varsa o; "oto" ise F2Pool saatlik arşivinden (son 7 gün, çalıştığı saatler)
    cihaz ortalamalarının medyanı; arşiv yoksa sahadaki çalışan cihazların anlık ortalaması; o da yoksa 300."""
    if isinstance(a.get("cihaz_th"), (int, float)):
        return float(a["cihaz_th"]), "ayar"
    sinir = (simdi - timedelta(days=7)).astimezone(timezone.utc).strftime("%Y-%m-%dT%H")
    toplam = {}
    for ay in sorted({simdi.strftime("%Y-%m"), (simdi - timedelta(days=7)).strftime("%Y-%m")}):
        d, _ = gh(f"arsiv_cihaz_{ay}.json")
        for k, v in (d or {}).items():
            if k.replace(" ", "T")[:13] < sinir:
                continue
            for c, x in (v or {}).items():
                h = float((x or {}).get("h") or 0)
                if h > 0:
                    t = toplam.setdefault(c, [0.0, 0])
                    t[0] += h
                    t[1] += 1
    ort = sorted(t[0] / t[1] for t in toplam.values() if t[1] >= 6)
    if ort:
        return round(ort[len(ort) // 2], 1), f"F2Pool son 7 gün, {len(ort)} cihaz medyanı"
    canli = [float(d.get("hashrate_TH") or 0) for d in (mad or {}).get("devices") or [] if d.get("online") and not d.get("sleeping") and d.get("hashrate_TH")]
    if canli:
        canli.sort()
        return round(canli[len(canli) // 2], 1), f"sahadaki {len(canli)} çalışan cihaz"
    return 300.0, "varsayılan"


def cihaz_guc_hesapla(a, simdi):
    if isinstance(a.get("cihaz_guc_kw"), (int, float)):
        return float(a["cihaz_guc_kw"]), "ayar"
    y, a_ = simdi.year, simdi.month
    for i in range(0, 6):
        ay = f"{y}-{a_:02d}"
        y, a_ = (y, a_ - 1) if a_ > 1 else (y - 1, 12)
        d, _ = gh(f"arsiv_antminer_{ay}.json")
        if d:
            k = sorted(d)[-1]
            c = (d[k] or {}).get("cihazlar") or {}
            v = [float(x.get("guc_tahmini")) for x in c.values() if x.get("guc_tahmini")]
            if v:
                return round(sum(v) / len(v), 2), f"antminer arşivi {k}, {len(v)} cihaz ortalaması"
    return 6.0, "varsayılan"


def birim_maliyet(ptf, yekdem, a):
    """Şebekeden 1 MWh'in KDV hariç bedeli (TL/MWh): fatura formülü."""
    return (ptf + yekdem) * a["komisyon"] * (1 + a["btv"]) + a["dagitim_tl_mwh"]


def basabas_ptf(gelir, yekdem, a):
    """Cihazın saatlik gelirine denk gelen PTF (TL/MWh)."""
    return (gelir / a["cihaz_guc_kw"] * 1000 - a["dagitim_tl_mwh"]) / (a["komisyon"] * (1 + a["btv"])) - yekdem


def karar_ver(uretim, ptf, yekdem, a, hp, btc_try):
    maliyet = birim_maliyet(ptf, yekdem, a) / 1000 * a["cihaz_guc_kw"] if ptf is not None else None
    gelir = hp * a["cihaz_th"] / 24 * btc_try if hp and btc_try else None
    if uretim:
        return "calis", "güneş üretimi var", maliyet, gelir
    if maliyet is None or gelir is None:
        return None, "PTF ya da gelir verisi yok", maliyet, gelir
    bb = basabas_ptf(gelir, yekdem, a)
    tol = a.get("basabas_tolerans") or 0
    esik = bb * (1 + tol) if bb > 0 else bb
    if ptf > esik:
        return "uyut", f"PTF {ptf:.0f} > eşik {esik:.0f} (başabaş {bb:.0f} +%{tol * 100:.0f}) · maliyet {maliyet:.0f} ₺ / gelir {gelir:.0f} ₺", maliyet, gelir
    return "calis", (f"PTF {ptf:.0f} ≤ eşik {esik:.0f} (başabaş {bb:.0f} +%{tol * 100:.0f})" + (" · zararına ama tolerans içinde" if maliyet > gelir else "")
                     + f" · maliyet {maliyet:.0f} ₺ / gelir {gelir:.0f} ₺"), maliyet, gelir


def gunes_saatleri(gun):
    """Aksaray için doğuş/batış (TR saati, ondalık). Basit NOAA yaklaşımı."""
    n = gun.timetuple().tm_yday
    g = 2 * math.pi / 365 * (n - 1)
    dek = 0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g)
    eq = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g) - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    la = math.radians(ENLEM)
    ha = math.degrees(math.acos(math.cos(math.radians(90.833)) / (math.cos(la) * math.cos(dek)) - math.tan(la) * math.tan(dek)))
    oglen = (720 - 4 * BOYLAM - eq) / 60 + 3
    return oglen - ha / 15, oglen + ha / 15


# ---------------------------------------------------------------- zamanlama
def dakika_fiyat(plan):
    """{saat başı datetime: (maliyet, gelir)} cihaz başı TL/saat."""
    return {p["_t"]: (p["maliyet"], p["gelir"]) for p in plan}


def _deger(fiyat, bas, bit, w, m, su0, yay):
    """[bas, bit) aralığında, w anında uyandırılan cihazın kârı (TL). Uyandırmadan önce 0; sonra tam güç maliyeti,
    gelir ısınma oranıyla. Sıralı komut yayılımı yay dk: ortalama cihaz yay/2 dk geç başlar."""
    top = 0.0
    t = bas
    while t < bit:
        s = t.replace(minute=0, second=0, microsecond=0)
        mal, gel = fiyat.get(s, (None, None))
        if mal is None or gel is None:
            return None
        if t >= w:
            top += (gel * OG.oran(m, su0, (t - w).total_seconds() / 60 - yay / 2) - mal) / 60
        t += timedelta(minutes=1)
    return top


def oncu_sec(fiyat, B, m, su0, yay, en_fazla):
    """B anında başlayan kârlı pencere için en iyi uyandırma öncü süresi (dk) ve beklenen kâr."""
    en, en_L = None, None
    for L in range(0, int(en_fazla) + 1):
        v = _deger(fiyat, B - timedelta(minutes=en_fazla), B + timedelta(minutes=60), B - timedelta(minutes=L), m, su0, yay)
        if v is None:
            break
        if en is None or v > en + 1e-6:
            en, en_L = v, L
    if en_L is None:                       # fiyat yoksa: model süresi kadar
        s = OG.isinma(m, su0, filo=True)
        return int(round(s["t95"] + yay / 2)), None
    return en_L, en


def takvim_kur(plan, m, a, simdi, filo, canli_su):
    """Saatlik kararlardan dakika hassasiyetinde komut takvimi üretir. plan[0] = içinde bulunulan saat."""
    fiyat = dakika_fiyat(plan)
    n = filo["calisan"] + filo["uyuyan"] or a.get("cihaz_sayisi", 29)
    yay = n * (a["sirali_gecikme_sn"] + 2) / 60 if a["sirali_gecikme_sn"] else n * m.get("sn_cihaz", 12) / 60
    yay = max(yay, n * m.get("sn_cihaz", 12) / 60)
    k = [p["karar"] for p in plan]
    notlar = {}
    # 1) kısa duruş: [i, j) uyut penceresi, j'de calis
    if a.get("kisa_durus_kontrol"):
        i = 0
        while i < len(k):
            if k[i] != "uyut":
                i += 1
                continue
            j = i
            while j < len(k) and k[j] == "uyut":
                j += 1
            if j >= len(k) or k[j] != "calis":
                break
            B1, B2 = plan[i]["_t"], plan[j]["_t"]
            simdi_uyuyor = i == 0 and filo["uyuyan"] > filo["calisan"]       # filonun çoğu uyuyorsa "uyuyor" say
            if not simdi_uyuyor:
                bas = max(B1, simdi)
                kapali_saat = (B2 - bas).total_seconds() / 3600
                su0, _ = OG.su_tahmin(m, kapali_saat)
                if a.get("oncu_politika") == "ekonomik":
                    L, _ = oncu_sec(fiyat, B2, m, su0, yay, a["en_fazla_oncu_dk"])
                else:
                    L = math.ceil(OG.isinma(m, su0, filo=True)["t95"] + yay)
                w = B2 - timedelta(minutes=min(L + m.get("emniyet_dk", 0), a["en_fazla_oncu_dk"]))
                bit = B2 + timedelta(minutes=60)
                uyut_v = _deger(fiyat, bas, bit, max(w, bas), m, su0, yay)
                calis_v = _deger(fiyat, bas, bit, bas - timedelta(hours=2), m, 99.0, 0)   # zaten sıcak, tam hash
                # plan "uyut" diyor; ancak uyutmak açıkça (cihaz başı 0,5 ₺'den fazla) daha kötüyse çalıştır (eşitlikte uyut)
                if uyut_v is not None and calis_v is not None and uyut_v < calis_v - 0.5:
                    for x in range(i, j):
                        k[x] = "calis"
                        notlar[x] = (f"kısa duruş kârsız: uyutmak {uyut_v:.0f} ₺, çalışmak {calis_v:.0f} ₺ "
                                     f"(cihaz başı; su ~{su0:.0f} °C'ye düşer, {L} dk önce uyandırma gerekir)")
            i = j
    # 2) geçişler
    anahtar = []
    for x in range(1, len(k)):
        if k[x] is None or k[x - 1] is None or k[x] == k[x - 1]:
            continue
        B = plan[x]["_t"]
        if k[x] == "uyut":
            t = B - timedelta(minutes=yay / 2)
            anahtar.append({"t_komut": t, "eylem": "sleep", "hedef": B, "neden": f"{B:%H}:00 zararlı saat", "oncu_dk": round(yay / 2, 1)})
        else:
            # pencere ne kadar uyuyacak? (geriye doğru uyut saatleri)
            y = x - 1
            while y > 0 and k[y - 1] == "uyut":
                y -= 1
            bas_uyku = max(plan[y]["_t"], simdi) if not (y == 0 and filo["uyuyan"] > filo["calisan"]) else None
            canli = canli_su if (y == 0 and canli_su) else None
            kapali_saat = (B - bas_uyku).total_seconds() / 3600 if bas_uyku else None
            su0, su_kaynak = OG.su_tahmin(m, kapali_saat, canli)
            s = OG.isinma(m, su0, filo=True)
            L_eko, _ = oncu_sec(fiyat, B, m, su0, yay, a["en_fazla_oncu_dk"])
            L_hazir = math.ceil(s["t95"] + yay)            # son cihaz da saat başında %95'te
            if not a.get("on_isitma"):
                L = 0
            elif a.get("oncu_politika") == "ekonomik":
                L = L_eko + m.get("emniyet_dk", 0)
            else:
                L = L_hazir + m.get("emniyet_dk", 0)
            L = min(L, a["en_fazla_oncu_dk"])
            # iki politikanın kâr farkı (filo, TL): ön ısıtmanın bedeli
            pen = (B - timedelta(minutes=a["en_fazla_oncu_dk"]), B + timedelta(minutes=60))
            v_sec = _deger(fiyat, *pen, B - timedelta(minutes=L), m, su0, yay)
            v_eko = _deger(fiyat, *pen, B - timedelta(minutes=L_eko), m, su0, yay)
            fark = round((v_eko - v_sec) * n, 1) if v_sec is not None and v_eko is not None else None
            anahtar.append({"t_komut": B - timedelta(minutes=L), "eylem": "wake", "hedef": B, "oncu_dk": round(L, 1),
                            "oncu_hazir_dk": L_hazir, "oncu_ekonomik_dk": L_eko, "politika": a.get("oncu_politika"),
                            "on_isitma_bedeli_tl": fark,
                            "su_tahmin": su0, "su_kaynak": su_kaynak, "t95_tahmin": s["t95"],
                            "neden": f"{B:%H}:00 kârlı saat; su ~{su0:.0f} °C → %95 hash {s['t95']:.0f} dk + yayılım {yay:.0f} dk"
                                     f" + emniyet {m.get('emniyet_dk', 0):.0f} dk"})
    # geçişler sıralı kalsın (bir önceki geçişten önce olamaz)
    for x in range(1, len(anahtar)):
        if anahtar[x]["t_komut"] < anahtar[x - 1]["t_komut"]:
            anahtar[x]["t_komut"] = anahtar[x - 1]["t_komut"]
    # 3) şu an olması gereken durum
    istenen = k[0]
    gecerli = None
    for s_ in anahtar:
        if s_["t_komut"] <= simdi:
            istenen = "uyut" if s_["eylem"] == "sleep" else "calis"
            gecerli = s_
    return k, notlar, anahtar, istenen, gecerli, yay


def komut_gonder(eylem, a, neden, hedefler="all"):
    kom, sha = gh("antminer_commands.json")
    kom = kom or {"commands": []}
    cmd = {"id": str(uuid.uuid4())[:8], "action": eylem, "targets": hedefler, "delay_sec": a["sirali_gecikme_sn"],
           "sort_by": None, "issued_at": datetime.now().isoformat(), "issued_by": "otomatik (cihaz yönetimi)"}
    kom["commands"] = (kom.get("commands") or [])[-49:] + [cmd]
    kom["updated_at"] = cmd["issued_at"]
    gh("antminer_commands.json", kom, sha, f"otomatik {eylem}: {neden}")
    return cmd["id"]


def tk_oku():
    return json.loads(TAKVIM.read_text()) if TAKVIM.exists() else {}


def tk_yaz(tk):
    TAKVIM.parent.mkdir(parents=True, exist_ok=True)
    TAKVIM.write_text(json.dumps(tk, ensure_ascii=False, default=str))


def tekrar_mi(eylem, a):
    yerel = json.loads(YEREL.read_text()) if YEREL.exists() else {}
    son = yerel.get("son_komut") or {}
    return son.get("action") == eylem and (time.time() - son.get("t", 0)) < a["komut_arasi_dk"] * 60


def son_komut_kaydet(eylem, cid):
    yerel = json.loads(YEREL.read_text()) if YEREL.exists() else {}
    yerel["son_komut"] = {"action": eylem, "t": time.time(), "id": cid}
    YEREL.parent.mkdir(parents=True, exist_ok=True)
    YEREL.write_text(json.dumps(yerel))


def tetik():
    """Dakikada bir: takvimde zamanı gelmiş ve henüz gönderilmemiş geçiş varsa gönderir (yalnız otomatik modda)."""
    simdi = datetime.now(TR)
    if simdi.minute % 5 == 0:
        return                                   # tam çalıştırmanın dakikası: kilidi ona bırak (cron yarışı)
    tk = tk_oku()
    if tk.get("mod") != "otomatik" or not tk.get("filo_taze"):
        return
    if simdi - zaman(tk.get("olusturuldu", "2000-01-01T00:00:00+03:00")) > timedelta(minutes=20):
        return                                   # takvim eski: tam hesap çalışmıyor demek, kör komut verme
    gonderilen = {g["anahtar"] for g in tk.get("gonderilen") or []}
    for s in tk.get("anahtarlar") or []:
        t = zaman(s["t_komut"])
        anahtar = f"{s['eylem']}|{s['hedef']}"
        if anahtar in gonderilen or not (t <= simdi < t + timedelta(minutes=10)):
            continue
        if s["eylem"] == "sleep" and tk.get("uretim"):
            continue                             # son tam hesapta güneş üretimi vardı: uyutma, tam hesap karar versin
        if tekrar_mi(s["eylem"], {"komut_arasi_dk": tk.get("komut_arasi_dk", 15)}):
            continue
        cid = komut_gonder(s["eylem"], tk["ayar_ozet"], s["neden"])
        son_komut_kaydet(s["eylem"], cid)
        tk.setdefault("gonderilen", []).append({"anahtar": anahtar, "eylem": s["eylem"], "hedef": s["hedef"],
                                               "t_komut": simdi.isoformat(timespec="seconds"), "id": cid, "kim": "tetik"})
        tk["gonderilen"] = tk["gonderilen"][-100:]
        tk_yaz(tk)
        log("TETİK", s["eylem"], "→", s["hedef"], "-", s["neden"])


def calistir():
    if not TOK:
        sys.exit("GITHUB_TOKEN yok (~/.aesun/osos.env)")
    a = ayar_oku()
    simdi = datetime.now(TR)
    if a["mod"] == "kapali":
        tk = tk_oku()
        tk["mod"] = "kapali"
        tk_yaz(tk)
        log("mod kapalı, çıkılıyor")
        return
    ep, _ = gh("n8n/epias_gecmis.json")
    fs, _ = gh("n8n/fusionsolar_son.json")
    gelir, _ = gh("arsiv_f2pool_gelir.json")
    fiyat, _ = gh("arsiv_btc_fiyat.json")
    mad, _ = gh("antminer_panel.json")
    og, _ = gh(OG.DOSYA)
    m = {**OG.VARSAYILAN_MODEL, **((og or {}).get("model") or {})}
    th, th_kaynak = cihaz_th_hesapla(a, mad, simdi)
    kw, kw_kaynak = cihaz_guc_hesapla(a, simdi)
    a = {**a, "cihaz_th": th, "cihaz_th_kaynak": th_kaynak, "cihaz_guc_kw": kw, "cihaz_guc_kaynak": kw_kaynak}

    def ptf_al(t):
        g = (ep or {}).get("ptf", {}).get(t.strftime("%Y-%m-%d")) or []
        return g[t.hour] if len(g) > t.hour and g[t.hour] is not None else None

    def yekdem_al(t):
        y = (ep or {}).get("yekdem", {}).get(t.strftime("%Y-%m")) or {}
        return y.get("gercek") if y.get("gercek") is not None else y.get("ongoru")

    fg = (fiyat or {}).get("gun", {})
    son_fg = max((g for g in fg if fg[g].get("try")), default=None)
    btc_try = fg[son_fg]["try"] if son_fg else None
    hp, hp_bas, hp_son = hashprice(gelir or {}, a["hashprice_gun"])
    # Güneş üretimi: FusionSolar anlık güç (en çok 30 dk eski)
    uretim_kw, fs_taze, fs_ts = None, False, None
    if fs:
        try:
            ts = fs_ts = zaman(fs.get("guncelleme"))
            fs_taze = (simdi - ts) < timedelta(minutes=30)
            uretim_kw = sum(float(t.get("anlik_guc_kw") or 0) for t in (fs.get("tesisler") or {}).values())
        except Exception:
            pass
    uretim = (uretim_kw or 0) > a["uretim_esik_kw"] if fs_taze else None
    ptf, yekdem = ptf_al(simdi), yekdem_al(simdi)
    if uretim is None:
        karar, neden, maliyet, gel = None, "FusionSolar verisi eski ya da yok (değişiklik yapılmaz)", None, None
    else:
        karar, neden, maliyet, gel = karar_ver(uretim, ptf, yekdem or 0, a, hp, btc_try)
    # Mevcut cihaz durumu
    cihazlar = (mad or {}).get("devices") or []
    ulasilan = [d for d in cihazlar if d.get("online") or d.get("sleeping")]
    # çalışan: açık, uykuda değil ve hash veriyor ya da havuza bağlı (ısınan). Açılışta takılı kalan, worker'ı ve hash'i
    # olmayan cihazlar (7 Eki .101/.105/.115) sayılmaz; yoksa filo uyurken "çalışıyor" sanılıp herkes uyandırılıyordu.
    calisan = sum(1 for d in cihazlar if d.get("online") and not d.get("sleeping") and ((d.get("hashrate_TH") or 0) > 0 or d.get("actual_worker")))
    uyuyan = sum(1 for d in cihazlar if d.get("sleeping"))
    canli_su = [d.get("temp_water") for d in cihazlar if d.get("sleeping") and d.get("temp_water")]
    canli_su = round(sum(canli_su) / len(canli_su), 1) if canli_su else None
    try:
        mad_taze = (simdi - zaman((mad or {}).get("timestamp", ""))) < timedelta(minutes=15)
    except Exception:
        mad_taze = False
    filo = {"calisan": calisan, "uyuyan": uyuyan}
    # Saatlik plan: bu saattan yarının sonuna kadar (en az 30 saat; güneş: bugünün gerçekleşen profili, ileri saatler için doğuş/batış)
    saatlik = {}
    for v in ((fs or {}).get("saatlik_bugun") or {}).values():
        for s_, kk in (v or {}).items():
            try:
                saatlik[int(str(s_)[:2])] = saatlik.get(int(str(s_)[:2]), 0) + float(kk or 0)
            except Exception:
                pass
    plan = []
    for i in range(max(30, 48 - simdi.hour)):
        t = (simdi + timedelta(hours=i)).replace(minute=0, second=0, microsecond=0)
        p, y = ptf_al(t), yekdem_al(t)
        if i == 0 and uretim is not None:
            gunes, gk = uretim, "anlık"
        elif t.date() == simdi.date() and t.hour < simdi.hour and t.hour in saatlik:
            gunes, gk = saatlik[t.hour] > a["uretim_esik_kw"], "gerçekleşen"
        else:
            dog, bat = gunes_saatleri(t)
            gunes, gk = (dog + 1.0) <= t.hour and (t.hour + 1) <= (bat - 1.0), "doğuş/batış"
        kk, n, mm, g = karar_ver(gunes, p, y or 0, a, hp, btc_try)
        if i == 0 and karar is None and uretim is None:
            kk = None
        plan.append({"_t": t, "t": t.strftime("%Y-%m-%d %H:00"), "ptf": p, "yekdem": y, "gunes_tahmini": gunes,
                     "gunes_kaynak": gk, "maliyet": mm, "gelir": g, "karar": kk})
    # Takvim (öğrenilmiş ısınma ile)
    k2, notlar, anahtar, istenen, gecerli, yay = takvim_kur(plan, m, a, simdi, filo, canli_su)
    # Güneş kuralı önceliklidir: takvim (doğuş/batış tahmini) "uyut" dese de anlık üretim eşiğin üstündeyse uyutma.
    # (8 Eki 16:55: takvim 17:00'yi zararlı saydı ve uyuttu, 435 kW üretim varken 17:00'de yeniden uyandırıldı.)
    if uretim and istenen == "uyut":
        istenen, gecerli = "calis", None
    for i, p in enumerate(plan):
        p["karar_ham"] = p["karar"]
        p["karar"] = k2[i]
        if i in notlar:
            p["not"] = notlar[i]
    # Eylem: şu an olması gereken durum ile filo durumu farklıysa
    tk = tk_oku()
    gonderilen = tk.get("gonderilen") or []
    eylem, eylem_not = None, ""
    if istenen and mad_taze and ulasilan:
        if istenen == "uyut" and calisan > 0:
            eylem = "sleep"
        elif istenen == "calis" and uyuyan > 0:
            eylem = "wake"
    elif istenen and not (mad_taze and ulasilan):
        eylem_not = "cihaz durumu okunamıyor (toplayıcı saha ağında değil ya da veri eski)"
    takip = None
    if eylem and gecerli and f"{eylem}|{gecerli['hedef'].isoformat(timespec='seconds')}" in {g["anahtar"] for g in gonderilen}:
        # Bu geçiş için komut gitti. Uymayan cihaz kaldıysa yalnız onlara yeniden gönder (en çok 3 kez):
        #   uyut: komuttan 8 dk sonra hâlâ hash veren; çalış: hedef saatten 15 dk sonra hâlâ uykuda olan
        #   (uyanan Hydro cihaz ön ısıtmada "uyku" görünür, bu yüzden uyandırmada bekleme uzun)
        an = f"{eylem}|{gecerli['hedef'].isoformat(timespec='seconds')}"
        gk = [g for g in gonderilen if g["anahtar"] == an]
        son_t = max(zaman(g["t_komut"]) for g in gk)
        if eylem == "sleep":
            uymayan = [d["suffix"] for d in cihazlar if d.get("online") and not d.get("sleeping") and (d.get("hashrate_TH") or 0) > 0]
            vakit = simdi - son_t >= timedelta(minutes=8)
        else:
            uymayan = [d["suffix"] for d in cihazlar if d.get("sleeping")]
            vakit = simdi >= gecerli["hedef"] + timedelta(minutes=15) and simdi - son_t >= timedelta(minutes=10)
        if uymayan and vakit and len(gk) <= 3:
            takip = sorted(uymayan)
            eylem_not = f"{len(takip)} cihaz komuta uymadı, yalnız onlara yeniden gönderiliyor ({len(gk)}. tekrar)"
        else:
            eylem_not = ("komut gönderildi, cihazlar ısınıyor/geçişte" if not uymayan or not vakit else
                         f"{len(uymayan)} cihaz 3 tekrara rağmen uymadı: " + ", ".join(map(str, sorted(uymayan))))
            eylem = None
    # Zıt komut kilidi: son 30 dk içinde bir geçiş komutu gittiyse, tersini ancak o komuttan SONRA gelmiş güneş verisi
    # gerektiriyorsa gönder. (7 Eki 18:03 uyut → 18:05 17:51 tarihli 103 kW verisiyle çalıştır gidip gelmesini önler.)
    if eylem and gonderilen:
        sk = max(gonderilen, key=lambda g: g["t_komut"])
        skt = zaman(sk["t_komut"])
        if sk["eylem"] != eylem and simdi - skt < timedelta(minutes=30) and not (fs_ts and fs_ts > skt):
            eylem_not = (f"{sk['t_komut'][11:16]}'de {('uyut' if sk['eylem'] == 'sleep' else 'çalıştır')} gönderildi; "
                         "tersi için daha yeni güneş verisi bekleniyor")
            eylem = None
    if eylem and not takip and tekrar_mi(eylem, a):
        eylem_not = f"aynı komut {a['komut_arasi_dk']} dk içinde gönderilmişti, bekleniyor"
        eylem = None
    gonderildi = False
    neden_eylem = (gecerli or {}).get("neden") or neden
    if eylem and a["mod"] == "otomatik":
        cid = komut_gonder(eylem, a, neden_eylem + (" (tekrar: " + ",".join(map(str, takip)) + ")" if takip else ""), takip or "all")
        son_komut_kaydet(eylem, cid)
        hedef = (gecerli or {}).get("hedef") or simdi.replace(minute=0, second=0, microsecond=0)
        gonderilen.append({"anahtar": f"{eylem}|{hedef.isoformat(timespec='seconds')}", "eylem": eylem,
                           "hedef": hedef.isoformat(timespec="seconds"), "t_komut": simdi.isoformat(timespec="seconds"),
                           "id": cid, "kim": "tekrar" if takip else "tam", "hedefler": takip or "all"})
        gonderildi = True
        log("KOMUT", eylem, "-", neden_eylem)
    elif eylem:
        eylem_not = "izleme modu: komut gönderilmedi"
    # takvimi yerel dosyaya yaz (tetik buradan okur)
    anahtar_j = [{**s_, "t_komut": s_["t_komut"].isoformat(timespec="seconds"), "hedef": s_["hedef"].isoformat(timespec="seconds")} for s_ in anahtar]
    tk = {"olusturuldu": simdi.isoformat(timespec="seconds"), "mod": a["mod"], "filo_taze": bool(mad_taze and ulasilan),
          "uretim": bool(uretim),
          "komut_arasi_dk": a["komut_arasi_dk"], "ayar_ozet": {"sirali_gecikme_sn": a["sirali_gecikme_sn"]},
          "anahtarlar": anahtar_j, "gonderilen": gonderilen[-100:]}
    tk_yaz(tk)
    for p in plan:
        p.pop("_t", None)
    basabas = None
    if hp and btc_try:
        g1 = hp * a["cihaz_th"] / 24 * btc_try
        basabas = basabas_ptf(g1, yekdem or 0, a)
    sonraki_uyan = next((s_ for s_ in anahtar_j if s_["eylem"] == "wake"), None)
    durum, sha = gh("n8n/cihaz_yonetimi_durum.json")
    durum = durum or {}
    gec = durum.get("gecmis") or []
    if gonderildi or durum.get("karar") != karar or durum.get("istenen") != istenen:
        gec.append({"t": simdi.strftime("%Y-%m-%d %H:%M"), "karar": karar, "istenen": istenen, "eylem": eylem or "-",
                    "neden": neden_eylem, "not": eylem_not, "gonderildi": gonderildi, "mod": a["mod"]})
    yeni = {
        "guncellendi": simdi.isoformat(timespec="seconds"), "mod": a["mod"], "ayarlar": a,
        "uretim_kw": uretim_kw, "uretim": uretim, "fs_taze": fs_taze, "ptf": ptf, "yekdem": yekdem,
        "btc_try": btc_try, "btc_tarih": son_fg, "hashprice_btc_th_gun": hp, "hashprice_aralik": [hp_bas, hp_son],
        "maliyet_tl_saat": maliyet, "gelir_tl_saat": gel, "basabas_ptf": basabas,
        "esik_ptf": (basabas * (1 + (a.get("basabas_tolerans") or 0)) if basabas and basabas > 0 else basabas),
        "karar": karar, "neden": neden, "istenen": istenen, "eylem": eylem, "eylem_not": eylem_not, "gonderildi": gonderildi,
        "cihaz": {"toplam": len(cihazlar), "ulasilan": len(ulasilan), "calisan": calisan, "uyuyan": uyuyan, "taze": mad_taze,
                  "su_uyuyan": canli_su},
        "zamanlama": {"model": {k_: m.get(k_) for k_ in ("a", "b", "a_ilk", "b_ilk", "d99", "p80_ek", "emniyet_dk", "sn_cihaz", "n")},
                      "yayilim_dk": round(yay, 1), "sonraki_uyandirma": sonraki_uyan, "takvim": anahtar_j[:12]},
        "plan": plan, "gecmis": gec[-200:],
    }
    kiyas = {k_: v for k_, v in yeni.items() if k_ != "guncellendi"}
    eski = {k_: v for k_, v in durum.items() if k_ != "guncellendi"}
    if kiyas != eski or (simdi - zaman(durum.get("guncellendi", "2000-01-01T00:00:00+03:00"))) > timedelta(minutes=30):
        gh("n8n/cihaz_yonetimi_durum.json", yeni, sha, f"cihaz yönetimi: {istenen or '-'} ({a['mod']})")
    su = f" sonraki uyandırma {sonraki_uyan['t_komut'][11:16]}→{sonraki_uyan['hedef'][11:16]} ({sonraki_uyan['oncu_dk']} dk önce)" if sonraki_uyan else ""
    log(f"mod={a['mod']} üretim={uretim_kw} kW ptf={ptf} karar={karar} istenen={istenen} cihaz {calisan}/{uyuyan} "
        f"eylem={eylem or '-'} {eylem_not}{su}")


def mod_degistir(mod):
    a, sha = gh("cihaz_yonetimi.json")
    a = {**VARSAYILAN, **(a or {})}
    a["mod"] = mod
    gh("cihaz_yonetimi.json", a, sha, f"cihaz yönetimi: mod {mod}")
    print("mod:", mod)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mod", choices=["izleme", "otomatik", "kapali"])
    ap.add_argument("--tetik", action="store_true")
    x = ap.parse_args()
    import signal, socket
    socket.setdefaulttimeout(60)            # ağ kesilirse (DNS dahil) sonsuza dek bekleme
    signal.alarm(50 if x.tetik else 240)    # takılan çalıştırma kilidi tutup sonrakileri engellemesin
    if x.mod:
        mod_degistir(x.mod)
    elif x.tetik:
        tetik()
    else:
        try:
            import altminer_ip_ekle
            altminer_ip_ekle.uygula(log)
        except Exception as e:
            log("altminer IP ekleme hatası:", e)
        try:
            import surec_yenile
            surec_yenile.uygula(log)
        except Exception as e:
            log("süreç yenileme hatası:", e)
        try:
            calistir()
        finally:
            try:
                if bildirim_tetikle():
                    log("bildirimler tetiklendi")
            except Exception as e:
                log("bildirim tetikleme hatası:", e)
