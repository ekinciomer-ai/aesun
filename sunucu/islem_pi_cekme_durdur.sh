#!/bin/bash
# Pi canli.py'nin her 20 sn'de bir git pull denemesini durdurur: portal canli.php'deki hedef_kod'u Pi'nin şu anki koduna eşitler.
# Neden (18.11): aesun'a ≈1,2 GB video/içerik girdi; canli.py 30 sn sınırla pull deniyor, hiç bitmiyor, Pi interneti saatte ≈4,4 GB indiriyor.
# Geri alma: bir sonraki cpanel_yukle çalıştırması hedef_kod'u yeniden ayarlar. Sunucuda hiçbir dosyayı değiştirmez.
U="https://portal.aksarayenerji.net/api/canli.php"
J=$(curl -fsS -m 20 "$U?s=9999999999") || { echo "NOT: HATA canli.php okunamadı"; exit 1; }
PI=$(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('son') or {}).get('pi_kod') or '')")
HEDEF=$(echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin).get('hedef_kod') or '')")
echo "NOT: önce hedef_kod=$HEDEF pi_kod=$PI"
echo "$PI" | grep -Eq '^[0-9a-f]{7,12}$' || { echo "NOT: HATA pi_kod alınamadı"; exit 1; }
curl -fsS -m 20 -o /dev/null "$U?hedef_kod=$PI&s=9999999999" || { echo "NOT: HATA hedef_kod yazılamadı"; exit 1; }
SONRA=$(curl -fsS -m 20 "$U?s=9999999999" | python3 -c "import json,sys;print(json.load(sys.stdin).get('hedef_kod') or '')")
echo "NOT: sonra hedef_kod=$SONRA"
