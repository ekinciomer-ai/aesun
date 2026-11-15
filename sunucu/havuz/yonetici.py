#!/usr/bin/env python3
"""YÜKLEME YÖNETİCİSİ · veri havuzu (/opt/aesun/havuz)

Tüm üretilen videolar buraya "kimlik kartı" ile teslim edilir; yüklemeden yalnız yönetici sorumludur.
Akış:  teslim → kontrol (kalite kapısı + kart + kurallar) → onay_bekliyor → (Ömer onayı) onaylandi
       → yonlendir: platform kuyruklarına (YouTube: /opt/aesun/video_bekleyen, TikTok: /opt/aesun/youtube/medya) → kuyrukta
       → esitle: platformun yükleme kaydında görülünce yayinda.
Kurallar: Ömer'in onayı olmadan hiçbir video kuyruğa gitmez. Silme yok (red/eski → arsiv durumu, dosya yerinde kalır).
Komutlar:
  yonetici.py teslim <kart.json>            kartı ve videoyu havuza alır, kontrol eder
  yonetici.py onay <kod> <evet|hayir> [not] [yayin_zamani] Ömer'in kararı (yalnız onay_bekliyor durumundaki işe)
  yonetici.py planla                        yayın planını yönetici kendisi yapar: zamanı olmayan işlere kanal saatine,
                                            günlük sınıra ve ara süreye göre ilk uygun saati verir (plan.json)
  yonetici.py yonlendir                     onaylananları platform kuyruklarına hazırlar, kuyruk kartlarını yazdırır
  yonetici.py esitle                        platform yükleme kayıtlarından durumu günceller
  yonetici.py durum [--json]                havuz özeti
"""
import hashlib, json, os, shutil, subprocess, sys
from datetime import datetime, timedelta, timezone

KOK = "/opt/aesun/havuz"
IST = timezone(timedelta(hours=3))
IDX = f"{KOK}/havuz.json"
GEREKLI = ["kod", "kanal", "platformlar", "format", "seri", "amac", "baslik", "aciklama", "dil", "sentetik", "kaynaklar", "lisans", "kaynak_dosya"]
KANALLAR = {"TR": "Antik Stüdyo", "EN": "Ancient Studio", "ES": "Estudio Antiguo", "KZ_TR": "Kozmos Lab TR", "KZ_EN": "Kozmos Lab", "OD": "Ömür Dediğin", "YR": "Yeraltı"}
PLATFORMLAR = {"youtube", "tiktok", "instagram"}
# Odak dönemi (12 Ara 2026'ya kadar): Antik Stüdyo yalnız bu seriler
ODAK_SON = "2026-12-12"
ODAK_SERI = {"Gündem + Tarih", "Tablo Serisi", "Tarihi Magazin", "Spor + Tarih"}
TEKRAR_GUN = 14
# Yayın kilidi (Ömer onayı 15.11.2026; Antik Stüdyo'da toplu yükleme hesabı keşiften düşürdü).
# Aynı kanal + platform için: günlük üst sınır ve iki yayın arası en az süre. Sınırı aşan video kuyruğa gitmez,
# "onaylandi" durumunda bekler ve bir sonraki uygun saat önerilir. Değerler /opt/aesun/havuz/sinirlar.json ile değiştirilebilir.
YENI_HESAP_GUN = 30          # hesap açılışından bu kadar gün "yeni hesap" sayılır
SINIR_YENI = 1               # yeni hesapta günlük en fazla video (platform başına)
SINIR_NORMAL = 3             # sonrasında günlük en fazla video (platform başına)
MIN_ARA_SAAT = 3             # aynı kanal + platformda iki yayın arası en az saat
SINIR_DOSYA = f"{KOK}/sinirlar.json"   # {"kanal": {"acilis": "YYYY-MM-DD", "gunluk": n, "ara_saat": n, "saatler": ["19:30"]}, "varsayilan": {...}}
# Plan saatleri (Türkiye saati): kitleye göre varsayılan yayın saatleri; sinirlar.json "saatler" ile değiştirilebilir.
PLAN_SAAT = {"OD": ["10:30", "20:30"], "KZ_TR": ["19:30", "12:30"], "KZ_EN": ["02:30", "21:30"], "TR": ["19:30", "13:00"],
             "EN": ["02:00", "22:00"], "ES": ["03:00", "23:00"], "YR": ["20:00", "13:00"]}
PLAN_DOSYA = f"{KOK}/plan.json"


def simdi():
    return datetime.now(IST).isoformat(timespec="seconds")


def yukle():
    return json.load(open(IDX, encoding="utf-8")) if os.path.exists(IDX) else {}


def kaydet(d):
    # önce yedek, sonra atomik yazım (yanlış yazım geri alınabilsin)
    os.makedirs(f"{KOK}/yedek", exist_ok=True)
    if os.path.exists(IDX):
        shutil.copy(IDX, f"{KOK}/yedek/havuz_{datetime.now(IST).strftime('%Y%m%d_%H%M%S')}.json")
        ys = sorted(os.listdir(f"{KOK}/yedek"))
        for eski in ys[:-200]:
            os.remove(f"{KOK}/yedek/{eski}")
    tmp = IDX + ".tmp"
    json.dump(d, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, IDX)


def olay(it, metin):
    it.setdefault("gecmis", []).append({"zaman": simdi(), "olay": metin})


def sha(yol):
    h = hashlib.sha256()
    with open(yol, "rb") as f:
        for p in iter(lambda: f.read(1 << 20), b""):
            h.update(p)
    return h.hexdigest()


def kontrol(kart, dosya, idx):
    engel, uyari = [], []
    for a in GEREKLI:
        if kart.get(a) in (None, "", []):
            engel.append(f"kartta eksik alan: {a}")
    if kart.get("kanal") not in KANALLAR and not str(kart.get("kanal", "")).startswith("TT_"):
        engel.append(f"bilinmeyen kanal: {kart.get('kanal')}")
    if not set(kart.get("platformlar") or []) <= PLATFORMLAR:
        engel.append(f"bilinmeyen platform: {kart.get('platformlar')}")
    if kart.get("sentetik") is not True and kart.get("sentetik") is not False:
        engel.append("sentetik (yapay zekâ beyanı) true/false olmalı")
    lis = kart.get("lisans") or {}
    for a in ("muzik", "gorsel", "ses"):
        if not lis.get(a):
            engel.append(f"lisans bilgisi eksik: {a}")
    # kalite kapısı
    kk = {}
    try:
        r = subprocess.run(["python3", "/opt/aesun/kalite_kapisi.py", dosya], capture_output=True, text=True, timeout=900)
        kk = json.loads(r.stdout.strip().splitlines()[-1])
        kengel = kk.get("engel", [])
        # Ömer onayı (14.11.2026): kolaj/etiketli tasarımlarda (Vox kolaj vb.) ekran yazısı bilinçli tasarımdır.
        # Kart açıkça "ekran_yazisi": "tasarim" derse yalnız bu kontrol engel değil uyarı olur; diğer her şey aynen engeldir.
        if kart.get("ekran_yazisi") == "tasarim":
            tas = [e for e in kengel if "altyazı dışında yazı" in e]
            kengel = [e for e in kengel if e not in tas]
            uyari += [f"kalite (tasarım gereği, onayda gözle bakılmalı): {e}" for e in tas]
        engel += [f"kalite: {e}" for e in kengel]
        uyari += [f"kalite: {u}" for u in kk.get("uyari", [])]
    except Exception as e:
        engel.append(f"kalite kapısı çalışmadı: {str(e)[:80]}")
    o = kk.get("olcum", {})
    if kart.get("format") == "Short":
        if o.get("genislik") and o.get("yukseklik") and o["genislik"] >= o["yukseklik"]:
            engel.append("Short dikey (9:16) olmalı")
        if (o.get("sure_sn") or 0) > 180:
            engel.append("Short 3 dakikayı geçemez")
    # konu tekrarı (aynı kanal, son 14 gün, aynı konu anahtarı)
    konu = (kart.get("konu") or kart.get("baslik") or "").strip().lower()
    sinir = (datetime.now(IST) - timedelta(days=TEKRAR_GUN)).isoformat()
    for k, it in idx.items():
        if k == kart["kod"] or it.get("durum") in ("reddedildi", "arsiv"):
            continue
        ik = it.get("kart", {})
        if ik.get("kanal") == kart.get("kanal") and (ik.get("konu") or ik.get("baslik") or "").strip().lower() == konu and it.get("teslim", "") >= sinir:
            engel.append(f"14 gün içinde aynı konu: {k}")
    # odak dönemi
    if kart.get("kanal") in ("TR", "EN", "ES") and datetime.now(IST).strftime("%Y-%m-%d") <= ODAK_SON and kart.get("seri") not in ODAK_SERI:
        uyari.append(f"odak dönemi dışı seri ({kart.get('seri')}); izinli: {', '.join(sorted(ODAK_SERI))}")
    return engel, uyari, kk


def teslim(kart_yol):
    kart = json.load(open(kart_yol, encoding="utf-8"))
    idx = yukle(); kod = kart.get("kod")
    if not kod:
        print("NOT: HATA kartta kod yok"); return 1
    if kod in idx and idx[kod].get("durum") not in ("kontrol_hatasi",):
        print(f"NOT: {kod} havuzda zaten var ({idx[kod]['durum']}), atlandı"); return 0
    src = kart.get("kaynak_dosya", "")
    if not os.path.isfile(src) and kart.get("kaynak_url"):
        try:
            import urllib.request
            os.makedirs(os.path.dirname(src) or ".", exist_ok=True)
            urllib.request.urlretrieve(kart["kaynak_url"], src + ".tmp"); os.replace(src + ".tmp", src)
            print(f"NOT: {kod}: video adresten indirildi")
        except Exception as e:
            print(f"NOT: HATA {kod}: video indirilemedi: {str(e)[:80]}")
    if not os.path.isfile(src):
        print(f"NOT: HATA {kod}: video bulunamadı: {src}"); return 1
    os.makedirs(f"{KOK}/video", exist_ok=True); os.makedirs(f"{KOK}/kart", exist_ok=True)
    hedef = f"{KOK}/video/{kod}.mp4"; shutil.copy2(src, hedef)
    if kart.get("kapak_dosya") and os.path.isfile(kart["kapak_dosya"]):
        shutil.copy2(kart["kapak_dosya"], f"{KOK}/video/{kod}{os.path.splitext(kart['kapak_dosya'])[1]}")
    json.dump(kart, open(f"{KOK}/kart/{kod}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    engel, uyari, kk = kontrol(kart, hedef, idx)
    it = idx.get(kod, {})
    it.update(kart=kart, dosya=hedef, sha256=sha(hedef), boyut=os.path.getsize(hedef), teslim=simdi(),
              kontrol={"engel": engel, "uyari": uyari, "olcum": kk.get("olcum", {})},
              durum="kontrol_hatasi" if engel else "onay_bekliyor")
    olay(it, f"teslim alındı · {'kontrol hatası: ' + '; '.join(engel) if engel else 'kontrolden geçti, onay bekliyor'}")
    idx[kod] = it; kaydet(idx)
    print(f"NOT: {kod}: {it['durum']}" + (f" · engel: {'; '.join(engel)}" if engel else "") + (f" · uyarı: {'; '.join(uyari)}" if uyari else ""))
    return 0


def onay(kod, karar, notu="", zaman=None):
    idx = yukle(); it = idx.get(kod)
    if not it:
        print(f"NOT: HATA {kod} havuzda yok"); return 1
    if it["durum"] != "onay_bekliyor":
        print(f"NOT: {kod} onay beklemiyor (durum: {it['durum']})"); return 1
    if zaman: it["kart"]["yayin_zamani"] = zaman
    elif karar == "evet" and it["kart"].get("plan_zamani") and not it["kart"].get("yayin_zamani"):
        it["kart"]["yayin_zamani"] = it["kart"]["plan_zamani"]
    it["durum"] = "onaylandi" if karar == "evet" else "reddedildi"
    it["onay"] = {"karar": karar, "zaman": simdi(), "not": notu}
    olay(it, f"Ömer kararı: {karar}" + (f" · {notu}" if notu else ""))
    kaydet(idx); print(f"NOT: {kod}: {it['durum']}"); return 0


def zaman_oku(s):
    try:
        t = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return (t if t.tzinfo else t.replace(tzinfo=IST)).astimezone(IST)
    except Exception:
        return None


def sinir_al(kanal):
    ayar = {}
    try:
        d = json.load(open(SINIR_DOSYA, encoding="utf-8"))
        ayar = {**d.get("varsayilan", {}), **d.get(kanal, {})}
    except Exception:
        pass
    ara = float(ayar.get("ara_saat", MIN_ARA_SAAT))
    if "gunluk" in ayar:
        return int(ayar["gunluk"]), ara, "ayar"
    acilis = zaman_oku(ayar.get("acilis")) if ayar.get("acilis") else None
    if acilis and datetime.now(IST) - acilis < timedelta(days=YENI_HESAP_GUN):
        return SINIR_YENI, ara, f"yeni hesap (açılış {acilis:%d.%m.%Y})"
    return SINIR_NORMAL, ara, "normal"


def saatler_al(kanal):
    try:
        d = json.load(open(SINIR_DOSYA, encoding="utf-8"))
        st = {**d.get("varsayilan", {}), **d.get(kanal, {})}.get("saatler")
        if st: return list(st)
    except Exception:
        pass
    return PLAN_SAAT.get(kanal, ["19:30"])


def planla(sessiz=False):
    """Yayın planını yönetici yapar. Zamanı olmayan onay_bekliyor/onaylandi işlere ilk uygun saati verir.
    onay_bekliyor → kart.plan_zamani (öneri; Ömer 'evet' derse yayın zamanı olur); onaylandi → yayin_zamani.
    Sıra: kart.sira (seri sırası) sonra teslim zamanı. Ömer'in verdiği zamanlara dokunmaz."""
    idx = yukle(); planli = []
    for it in idx.values():
        k = it.get("kart", {})
        z = zaman_oku(k.get("yayin_zamani")) if it.get("durum") in ("kuyrukta", "yayinda", "onaylandi") else None
        if z:
            for p in k.get("platformlar", []): planli.append((k.get("kanal"), p, z))
    bekleyen = [(kod, it) for kod, it in idx.items() if it.get("durum") in ("onay_bekliyor", "onaylandi") and not it["kart"].get("yayin_zamani")]
    bekleyen.sort(key=lambda x: (x[1]["kart"].get("kanal", ""), x[1]["kart"].get("sira", 999), x[1].get("teslim", "")))
    yarin = (datetime.now(IST) + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    plan = []
    for kod, it in bekleyen:
        k = it["kart"]; secilen = None
        for gun in range(60):
            for hm in sorted(saatler_al(k["kanal"])):
                h, m = map(int, hm.split(":"))
                aday = (yarin + timedelta(days=gun)).replace(hour=h, minute=m)
                dene = dict(k, yayin_zamani=aday.isoformat(timespec="minutes"))
                if all(kilit_kontrol(kod, dene, p, planli) is None for p in k.get("platformlar", [])):
                    secilen = aday; break
            if secilen: break
        if not secilen:
            continue
        zs = secilen.isoformat(timespec="minutes")
        for p in k.get("platformlar", []): planli.append((k["kanal"], p, secilen))
        if it["durum"] == "onaylandi":
            k["yayin_zamani"] = zs; olay(it, f"yönetici planı: yayın {secilen:%d.%m %H:%M}")
        else:
            if k.get("plan_zamani") != zs: olay(it, f"yönetici planı önerisi: {secilen:%d.%m %H:%M}")
            k["plan_zamani"] = zs
        plan.append({"kod": kod, "kanal": KANALLAR.get(k["kanal"], k["kanal"]), "durum": it["durum"], "zaman": zs, "baslik": k.get("baslik")})
    kaydet(idx)
    tum = sorted([{"kod": kd, "kanal": KANALLAR.get(v["kart"].get("kanal"), v["kart"].get("kanal")), "durum": v.get("durum"),
                   "zaman": v["kart"].get("yayin_zamani") or v["kart"].get("plan_zamani"), "baslik": v["kart"].get("baslik")}
                  for kd, v in idx.items() if v.get("durum") in ("onay_bekliyor", "onaylandi", "kuyrukta")], key=lambda x: str(x["zaman"]))
    json.dump({"guncelleme": simdi(), "plan": tum}, open(PLAN_DOSYA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if not sessiz:
        for p in tum: print(f"NOT: PLAN {str(p['zaman'])[:16]} · {p['kanal']} · {p['kod']} · {p['durum']} · {p['baslik']}")
    return 0


def kilit_kontrol(kod, k, platform, planli):
    """planli: [(kanal, platform, zaman)] kuyrukta/yayında olanlar. Uygunsa None, değilse (sebep, öneri) döner."""
    t = zaman_oku(k.get("yayin_zamani"))
    if not t:
        return ("yayın zamanı okunamadı", None)
    gunluk, ara, tur = sinir_al(k["kanal"])
    ayni = [z for (kn, p, z) in planli if kn == k["kanal"] and p == platform and z]

    def uygun(x):
        if sum(1 for z in ayni if z.date() == x.date()) >= gunluk:
            return f"{x:%d.%m} günü {platform} sınırı dolu ({gunluk}/gün, {tur})"
        for z in ayni:
            if abs((x - z).total_seconds()) < ara * 3600:
                return f"{z:%d.%m %H:%M} yayınına {ara:g} saatten yakın"
        return None

    sebep = uygun(t)
    if not sebep:
        return None
    oneri, neden = t, sebep
    for _ in range(24 * 60):  # en çok 60 gün ileri bak
        # gün sınırı doluysa ertesi gün aynı saat; yalnız ara süresi sorunuysa 1 saat ileri
        oneri += timedelta(days=1) if "sınırı dolu" in neden else timedelta(hours=1)
        neden = uygun(oneri)
        if not neden:
            break
    return (sebep, oneri.isoformat(timespec="minutes"))


def yonlendir():
    """Onaylananların videosunu platform kuyruklarının okuduğu yerlere kopyalar, kuyruk kartlarını yazdırır."""
    planla(sessiz=True)
    idx = yukle(); cikti = []
    planli = []
    for it in idx.values():
        if it.get("durum") in ("kuyrukta", "yayinda"):
            for p in it["kart"].get("platformlar", []):
                planli.append((it["kart"].get("kanal"), p, zaman_oku(it["kart"].get("yayin_zamani"))))
    for kod, it in sorted(idx.items(), key=lambda x: str(x[1].get("kart", {}).get("yayin_zamani") or "")):
        if it.get("durum") != "onaylandi":
            continue
        k = it["kart"]; pl = set(k.get("platformlar", []))
        if not k.get("yayin_zamani"):
            print(f"NOT: {kod}: yayın zamanı yok, yönlendirilmedi (onay kararına yayin_zamani ekleyin)"); continue
        kilit = [(p, kilit_kontrol(kod, k, p, planli)) for p in sorted(pl)]
        kilit = [(p, s) for p, s in kilit if s]
        if kilit:
            metin = "; ".join(f"{p}: {s[0]}" + (f" → öneri {s[1]}" if s[1] else "") for p, s in kilit)
            if it.get("kilit") != metin:
                it["kilit"] = metin; olay(it, f"yayın kilidi: bekletildi · {metin}")
            print(f"NOT: KİLİT {kod} bekletildi · {metin}"); continue
        it.pop("kilit", None)
        for p in pl:
            planli.append((k["kanal"], p, zaman_oku(k["yayin_zamani"])))
        if "youtube" in pl:
            os.makedirs("/opt/aesun/video_bekleyen", exist_ok=True)
            shutil.copy2(it["dosya"], f"/opt/aesun/video_bekleyen/{kod}.mp4")
            yt = {"kod": kod, "kanal": k["kanal"], "baslik": k["baslik"], "aciklama": k["aciklama"], "etiketler": k.get("etiketler", []),
                  "kategori": k.get("kategori", "27"), "publishAt": k.get("yayin_zamani") or "", "sentetik": bool(k["sentetik"]),
                  "seri": k["seri"], "tur": k["format"], "sunucu_video": f"{kod}.mp4", "ureten": k.get("ureten", "Claude"), "havuz": True}
            cikti.append({"platform": "youtube", "dosya": f"sunucu/yt_kuyruk/{kod}.json", "icerik": yt})
        if "tiktok" in pl:
            os.makedirs("/opt/aesun/youtube/medya", exist_ok=True)
            shutil.copy2(it["dosya"], f"/opt/aesun/youtube/medya/{kod}.mp4")
            tt = {"kod": kod, "metin": k.get("tiktok_metin") or k["baslik"], "planla": (k.get("yayin_zamani") or "")[:16], "sentetik": bool(k["sentetik"]), "havuz": True}
            cikti.append({"platform": "tiktok", "dosya": f"sunucu/tt_kuyruk/{kod}.json", "icerik": tt})
        it["durum"] = "kuyrukta"; olay(it, "platform kuyruklarına gönderildi: " + ", ".join(sorted(pl)))
    kaydet(idx)
    print("===YONLENDIR==="); print(json.dumps(cikti, ensure_ascii=False)); print("===SON===")
    return 0


def esitle():
    idx = yukle(); deg = 0
    def oku(y):
        try: return json.load(open(y, encoding="utf-8"))
        except Exception: return {}
    yt = oku("/opt/aesun/youtube/yuklenen_kuyruk.json"); tt = oku("/opt/aesun/tiktok/yuklenen.json")
    for kod, it in idx.items():
        if it.get("durum") != "kuyrukta":
            continue
        pl = set(it["kart"].get("platformlar", [])); bitti = {}
        if "youtube" in pl and kod in yt: bitti["youtube"] = yt[kod]
        if "tiktok" in pl and kod in tt: bitti["tiktok"] = tt[kod]
        if bitti:
            it["yayin"] = bitti
            if set(bitti) >= (pl & {"youtube", "tiktok"}):
                it["durum"] = "yayinda"; olay(it, "platform kayıtlarında görüldü: " + ", ".join(sorted(bitti))); deg += 1
    if deg: kaydet(idx)
    print(f"NOT: eşitleme: {deg} iş yayında olarak işaretlendi"); return 0


def durum(js=False):
    idx = yukle()
    ozet = [{"kod": k, "durum": v.get("durum"), "kanal": KANALLAR.get(v["kart"].get("kanal"), v["kart"].get("kanal")),
             "platformlar": v["kart"].get("platformlar"), "seri": v["kart"].get("seri"), "baslik": v["kart"].get("baslik"),
             "amac": v["kart"].get("amac"), "yayin_zamani": v["kart"].get("yayin_zamani"), "plan_zamani": v["kart"].get("plan_zamani"), "sure_sn": v.get("kontrol", {}).get("olcum", {}).get("sure_sn"),
             "engel": v.get("kontrol", {}).get("engel"), "uyari": v.get("kontrol", {}).get("uyari"), "kilit": v.get("kilit"), "teslim": v.get("teslim")} for k, v in idx.items()]
    if js:
        print("===HAVUZ==="); print(json.dumps(ozet, ensure_ascii=False)); print("===SON===")
    for o in ozet:
        print(f"NOT: {o['kod']} · {o['durum']} · {o['kanal']} · {o['seri']} · {o['baslik']}" + (f" · plan {str(o.get('plan_zamani'))[:16]}" if o.get('plan_zamani') and not o.get('yayin_zamani') else "") + (f" · KİLİT: {o['kilit']}" if o.get('kilit') else ""))
    if not ozet: print("NOT: havuz boş")
    return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(0)
    k = a[0]
    sys.exit({"teslim": lambda: teslim(a[1]), "onay": lambda: onay(a[1], a[2], *(a[3:5])), "yonlendir": yonlendir, "planla": planla,
              "esitle": esitle, "durum": lambda: durum("--json" in a)}[k]())
