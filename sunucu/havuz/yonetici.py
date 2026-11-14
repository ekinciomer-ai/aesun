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
KANALLAR = {"TR": "Antik Stüdyo", "EN": "Ancient Studio", "ES": "Estudio Antiguo", "KZ_TR": "Kozmos Lab TR", "KZ_EN": "Kozmos Lab", "OD": "Ömür Dediğin"}
PLATFORMLAR = {"youtube", "tiktok", "instagram"}
# Odak dönemi (12 Ara 2026'ya kadar): Antik Stüdyo yalnız bu seriler
ODAK_SON = "2026-12-12"
ODAK_SERI = {"Gündem + Tarih", "Tablo Serisi", "Tarihi Magazin", "Spor + Tarih"}
TEKRAR_GUN = 14


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
        engel += [f"kalite: {e}" for e in kk.get("engel", [])]
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
    it["durum"] = "onaylandi" if karar == "evet" else "reddedildi"
    it["onay"] = {"karar": karar, "zaman": simdi(), "not": notu}
    olay(it, f"Ömer kararı: {karar}" + (f" · {notu}" if notu else ""))
    kaydet(idx); print(f"NOT: {kod}: {it['durum']}"); return 0


def yonlendir():
    """Onaylananların videosunu platform kuyruklarının okuduğu yerlere kopyalar, kuyruk kartlarını yazdırır."""
    idx = yukle(); cikti = []
    for kod, it in idx.items():
        if it.get("durum") != "onaylandi":
            continue
        k = it["kart"]; pl = set(k.get("platformlar", []))
        if not k.get("yayin_zamani"):
            print(f"NOT: {kod}: yayın zamanı yok, yönlendirilmedi (onay kararına yayin_zamani ekleyin)"); continue
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
             "amac": v["kart"].get("amac"), "yayin_zamani": v["kart"].get("yayin_zamani"), "sure_sn": v.get("kontrol", {}).get("olcum", {}).get("sure_sn"),
             "engel": v.get("kontrol", {}).get("engel"), "uyari": v.get("kontrol", {}).get("uyari"), "teslim": v.get("teslim")} for k, v in idx.items()]
    if js:
        print("===HAVUZ==="); print(json.dumps(ozet, ensure_ascii=False)); print("===SON===")
    for o in ozet:
        print(f"NOT: {o['kod']} · {o['durum']} · {o['kanal']} · {o['seri']} · {o['baslik']}")
    if not ozet: print("NOT: havuz boş")
    return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(0)
    k = a[0]
    sys.exit({"teslim": lambda: teslim(a[1]), "onay": lambda: onay(a[1], a[2], *(a[3:5])), "yonlendir": yonlendir,
              "esitle": esitle, "durum": lambda: durum("--json" in a)}[k]())
