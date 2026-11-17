#!/bin/bash
# Yükleme Yöneticisi → Yayın Takibi "İçerik Yöneticisi" sekmesi için SALT OKUNUR dışa aktarım.
# Hiçbir şeyi değiştirmez: havuz.json ve plan.json yalnız okunur; dosya yolu, açıklama, sır yazılmaz.
set -u
python3 - <<'PY'
import json, os
KOK = "/opt/aesun/havuz"
def oku(y, v):
    try: return json.load(open(y, encoding="utf-8"))
    except Exception: return v
idx = oku(f"{KOK}/havuz.json", {})
plan = oku(f"{KOK}/plan.json", {})
AD = {"TR": "Antik Stüdyo", "EN": "Ancient Studio", "ES": "Estudio Antiguo", "KZ_TR": "Kozmos Lab TR", "KZ_EN": "Kozmos Lab",
      "OD": "Ömür Dediğin", "YR": "Yolu Seç !", "NY": "Nasıl Yapıldı", "LM": "LVL MAX"}
out = []
for kod, it in idx.items():
    k = it.get("kart", {}); kt = it.get("kontrol", {})
    out.append({"kod": kod, "durum": it.get("durum"), "kanal_kod": k.get("kanal"), "kanal": AD.get(k.get("kanal"), k.get("kanal")),
                "platformlar": k.get("platformlar"), "format": k.get("format"), "seri": k.get("seri"), "amac": k.get("amac"),
                "baslik": k.get("baslik"), "yayin_zamani": k.get("yayin_zamani"), "plan_zamani": k.get("plan_zamani"),
                "bekletme": k.get("bekletme"), "sure_sn": kt.get("olcum", {}).get("sure_sn"), "engel": kt.get("engel") or [],
                "uyari": kt.get("uyari") or [], "kilit": it.get("kilit"), "teslim": it.get("teslim"),
                "onay": (it.get("onay") or {}).get("zaman"), "gecmis": (it.get("gecmis") or [])[-4:]})
print("===HAVUZ===")
print(json.dumps({"isler": out, "plan_guncelleme": plan.get("guncelleme")}, ensure_ascii=False))
print("===SON===")
print(f"NOT: havuz dışa aktarım: {len(out)} iş")
PY
