#!/bin/bash
# Salt okunur: "kuyrukta" durumundaki havuz işlerinin platform kuyruk kartlarını satır satır yazar (KART: <json>)
# ve onaylandi/kuyrukta işlerin durum+kilit bilgisini verir (DURUM:). Yönlendirme çıktısı günlükte kaybolursa kartları yeniden üretmek için.
python3 - <<'PY'
import json
idx = json.load(open("/opt/aesun/havuz/havuz.json", encoding="utf-8"))
TT = {"YR": "yr"}
for kod, it in sorted(idx.items()):
    d = it.get("durum")
    if d in ("onaylandi", "kuyrukta"):
        print("DURUM:", kod, "|", d, "|", it["kart"].get("yayin_zamani"), "|", it.get("kilit") or "")
    if d != "kuyrukta":
        continue
    k = it["kart"]; pl = set(k.get("platformlar", []))
    if "youtube" in pl:
        yt = {"kod": kod, "kanal": k["kanal"], "baslik": k["baslik"], "aciklama": k["aciklama"], "etiketler": k.get("etiketler", []),
              "kategori": k.get("kategori", "27"), "publishAt": k.get("yayin_zamani") or "", "sentetik": bool(k["sentetik"]),
              "seri": k["seri"], "tur": k["format"], "sunucu_video": f"{kod}.mp4", "ureten": k.get("ureten", "Claude"), "havuz": True}
        if k.get("ekran_yazisi") == "tasarim": yt["ust_bant_izinli"] = True
        print("KART:", json.dumps({"dosya": f"sunucu/yt_kuyruk/{kod}.json", "icerik": yt}, ensure_ascii=False))
    if "tiktok" in pl:
        tt = {"kod": kod, "metin": k.get("tiktok_metin") or k["baslik"], "planla": (k.get("yayin_zamani") or "")[:16], "sentetik": bool(k["sentetik"]), "havuz": True}
        if TT.get(k["kanal"]): tt["hesap"] = TT[k["kanal"]]
        print("KART:", json.dumps({"dosya": f"sunucu/tt_kuyruk/{kod}.json", "icerik": tt}, ensure_ascii=False))
PY
