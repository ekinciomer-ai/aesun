#!/bin/bash
# Yalnız okur: Kozmos uzay arşivi durumu.
H=/var/kozmos/arsiv
echo "NOT: iş: $(systemctl is-active kozmos-arsiv 2>/dev/null) · disk boş $(df -h / | tail -1 | awk '{print $4}') · arşiv $(du -sh $H 2>/dev/null | cut -f1)"
[ -f $H/durum.json ] || { echo "NOT: durum dosyası yok"; exit 0; }
python3 - <<'P'
import json,collections
d=json.load(open("/var/kozmos/arsiv/durum.json")); m=json.load(open("/var/kozmos/arsiv/manifest.json"))
print(f"NOT: bitti={d.get('bitti')} · görsel {len(m)} · {d.get('toplam_gb')} GB · hata {len(d.get('hata',[]))} · şu an: {d.get('su_an','')[:120]}")
k=collections.Counter(x["kategori"] for x in m); print("NOT: kategoriler: "+", ".join(f"{a} {b}" for a,b in sorted(k.items())))
t=collections.Counter(t for x in m for t in x.get("turev",{})); print(f"NOT: 4K yatay {t.get('4k',0)} · dikey {t.get('dikey',0)}")
for x in sorted(m,key=lambda x:-x["genislik"]*x["yukseklik"])[:15]:
    print(f"NOT: {x['genislik']}x{x['yukseklik']} {x['bayt']//1048576}MB {x['kategori']} {x['baslik'][:50]} · {x['lisans'][:12]}")
for h in d.get("hata",[])[:10]: print("NOT: hata: "+h[:150])
P
