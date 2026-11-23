#!/bin/bash
# Ömer 22.11 19:59 "youtube'da yayınla": Vecihi İzinsiz ve Vecihi Nargin (TikTok'ta kuyrukta) YouTube'a da eklenir.
# Kanal kilit kurallarına uyan ilk uygun YouTube saati seçilir; TikTok planı değişmez. YouTube kartı satır satır (KART:).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import importlib.util, json, os, shutil
from datetime import datetime, timedelta
spec = importlib.util.spec_from_file_location("yon", "/opt/aesun/havuz/yonetici.py"); Y = importlib.util.module_from_spec(spec); spec.loader.exec_module(Y)
idx = Y.yukle()
for kod in ("AS_GT_VECIHI_IZINSIZ", "AS_GT_VECIHI_NARGIN"):
    idx = Y.yukle(); it = idx.get(kod)
    if not it: print(f"NOT: HATA {kod} yok"); continue
    k = it["kart"]
    if "youtube" in k.get("platformlar", []) and it.get("yt_zamani"):
        print(f"NOT: {kod}: YouTube zaten planlı ({it['yt_zamani']})"); continue
    planli = []
    for v in idx.values():
        z = Y.zaman_oku(v.get("yt_zamani") or v.get("kart", {}).get("yayin_zamani")) if v.get("durum") in ("kuyrukta", "yayinda", "onaylandi") else None
        if z and "youtube" in v["kart"].get("platformlar", []): planli.append((v["kart"].get("kanal"), "youtube", z))
    bas = datetime.now(Y.IST) + timedelta(minutes=90); sec = None
    for gun in range(21):
        for hm in sorted(Y.saatler_al(k["kanal"])):
            h, m = map(int, hm.split(":"))
            aday = (bas.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=gun)).replace(hour=h, minute=m)
            if aday < bas: continue
            if Y.kilit_kontrol(kod, dict(k, yayin_zamani=aday.isoformat(timespec="minutes")), "youtube", planli) is None:
                sec = aday; break
        if sec: break
    if not sec: print(f"NOT: HATA {kod}: 21 gün içinde uygun YouTube saati yok"); continue
    z = sec.isoformat(timespec="minutes")
    os.makedirs("/opt/aesun/video_bekleyen", exist_ok=True)
    shutil.copy2(it["dosya"], f"/opt/aesun/video_bekleyen/{kod}.mp4")
    yt = {"kod": kod, "kanal": k["kanal"], "baslik": k["baslik"], "aciklama": k["aciklama"], "etiketler": k.get("etiketler", []),
          "kategori": k.get("kategori", "27"), "publishAt": z, "sentetik": bool(k["sentetik"]), "seri": k["seri"], "tur": k["format"],
          "sunucu_video": f"{kod}.mp4", "ureten": k.get("ureten", "Claude"), "havuz": True, "ust_bant_izinli": True}
    k["platformlar"] = sorted(set(k.get("platformlar", [])) | {"youtube"}); it["yt_zamani"] = z
    Y.olay(it, f"Ömer 22.11 19:59: YouTube'a da eklendi · {sec:%d.%m %H:%M}")
    idx[kod] = it; Y.kaydet(idx)
    print(f"NOT: {kod}: YouTube {sec:%d.%m %H:%M}")
    print("KART:", json.dumps({"dosya": f"sunucu/yt_kuyruk/{kod}.json", "icerik": yt}, ensure_ascii=False))
PY
