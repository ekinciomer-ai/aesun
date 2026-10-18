#!/bin/bash
# AEMonitoring · ns1 sistem bekçisi (systemd zamanlayıcısı, 5 dk'da bir, root).
# Denetler: merkez API (eşitleme tazeliği), iş çalıştırıcı (nabız), işlerin zamanında çalışması
# (Bildirimler 15 dk → 40 dk sınır; Veri arşivi ve Durum analizi 1 sa → 130 dk sınır), kapsayıcı süreç sayısı.
# Sorun görürse ilgili kapsayıcıyı yeniden başlatır (aynı kapsayıcıya 30 dk'da en çok bir).
# Durum: /opt/aesun/bekci_durum.json → API /v1/bekci (herkese açık özet; sır içermez). Günlük: /var/log/aesun-bekci.log
set -u
D=/opt/aesun; DURUM=$D/bekci_durum.json; LOG=/var/log/aesun-bekci.log
simdi=$(date +%s); iso=$(date -Iseconds)
log() { echo "$(date '+%F %T') $*" >> $LOG; }

sorun_api=""; sorun_isler=""; ayrinti=()

# 1) merkez API
s=$(docker exec aesun-api python -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/v1/saglik',timeout=10).read().decode())" 2>/dev/null)
es=$(echo "$s" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('esitleme_sn_once') if d.get('esitleme_sn_once') is not None else 999999)" 2>/dev/null || echo 999999)
if [ "$es" -gt 600 ]; then sorun_api="eşitleme ${es} sn önce"; fi
pidsA=$(docker stats --no-stream --format '{{.PIDs}}' aesun-api 2>/dev/null || echo 0)
[ "${pidsA:-0}" -gt 300 ] && sorun_api="${sorun_api:+$sorun_api; }süreç $pidsA"

# 2) iş çalıştırıcı + işler
dj=$(docker exec aesun-isler cat /veri/durum.json 2>/dev/null)
ij=$(docker exec aesun-isler cat /veri/epias-ptf/n8n/is_hatalari.json 2>/dev/null)
nabiz=$(echo "$dj" | python3 -c "import json,sys;print(json.load(sys.stdin).get('nabiz',''))" 2>/dev/null)
etkin=$(echo "$dj" | python3 -c "import json,sys;print(json.load(sys.stdin).get('etkin'))" 2>/dev/null)
cn=$(docker exec aesun-isler date -Iseconds 2>/dev/null)   # kapsayıcının kendi saati (saat dilimi farkı olmasın)
na=$(python3 -c "import sys,datetime as d;a,b=sys.argv[1:];print(int((d.datetime.fromisoformat(a).replace(tzinfo=None)-d.datetime.fromisoformat(b).replace(tzinfo=None)).total_seconds()))" "$cn" "$nabiz" 2>/dev/null || echo 999999)
[ "$na" -gt 300 ] && sorun_isler="nabız ${na} sn önce"
isler_json=$(echo "$ij" | python3 -c "
import json,sys,datetime as dt
LIM={'Bildirimler':40,'Veri arşivi':130,'Durum analizi':130}   # iki tur kaçırınca
try: d=json.load(sys.stdin).get('isler',{})
except Exception: d={}
now=dt.datetime.now(dt.timezone.utc); out={}
for ad,lim in LIM.items():
    s=(d.get(ad) or {}).get('son')
    dk=round((now-dt.datetime.fromisoformat(s)).total_seconds()/60) if s else None
    out[ad]={'son':s,'dk':dk,'sinir_dk':lim,'kod':(d.get(ad) or {}).get('son_kod'),'gec':dk is None or dk>lim}
print(json.dumps(out,ensure_ascii=False))" 2>/dev/null || echo '{}')
gec=$(echo "$isler_json" | python3 -c "import json,sys;print(', '.join(k for k,v in json.load(sys.stdin).items() if v['gec']))" 2>/dev/null)
[ "$etkin" = "True" ] && [ -n "$gec" ] && sorun_isler="${sorun_isler:+$sorun_isler; }gecikti: $gec"
pidsI=$(docker stats --no-stream --format '{{.PIDs}}' aesun-isler 2>/dev/null || echo 0)
[ "${pidsI:-0}" -gt 300 ] && sorun_isler="${sorun_isler:+$sorun_isler; }süreç $pidsI"

# 3) onarım (30 dk'da en çok bir / kapsayıcı)
onar() {  # $1 kapsayıcı  $2 neden
  f=$D/.bekci_son_$1; son=$(cat $f 2>/dev/null || echo 0)
  if [ $(( simdi - son )) -lt 1800 ]; then ayrinti+=("$1: bekleniyor (son onarım $(( (simdi-son)/60 )) dk önce)"); return; fi
  echo $simdi > $f; log "ONARIM $1: $2"
  if docker restart -t 20 $1 >/dev/null 2>&1; then ayrinti+=("$1 yeniden başlatıldı: $2"); echo "$iso|$1|$2" >> $D/bekci_onarim.log
  else ayrinti+=("$1 yeniden başlatılamadı: $2"); fi
}
[ -n "$sorun_api" ] && onar aesun-api "$sorun_api"
[ -n "$sorun_isler" ] && onar aesun-isler "$sorun_isler"

onarim24=$(awk -F'|' -v t="$(date -d '-24 hours' -Iseconds)" '$1>t' $D/bekci_onarim.log 2>/dev/null | wc -l)
son_onarim=$(tail -1 $D/bekci_onarim.log 2>/dev/null)
python3 - "$DURUM" "$iso" "$sorun_api" "$sorun_isler" "$es" "$na" "$pidsA" "$pidsI" "$onarim24" "$son_onarim" "$isler_json" "${ayrinti[@]+"${ayrinti[@]}"}" <<'PY'
import json, sys
p, iso, sa, si, es, na, pa, pi, o24, son, isler, *ayr = sys.argv[1:]
d = {"t": iso, "durum": "sorun" if (sa or si) else "iyi",
     "api": {"sorun": sa or None, "esitleme_sn": int(es), "surec": int(pa or 0)},
     "isler": {"sorun": si or None, "nabiz_sn": int(na), "surec": int(pi or 0), "is": json.loads(isler or "{}")},
     "onarim_24s": int(o24), "son_onarim": son or None, "bu_tur": ayr}
open(p + ".tmp", "w").write(json.dumps(d, ensure_ascii=False)); import os; os.replace(p + ".tmp", p)
PY
docker cp $DURUM aesun-api:/veri/bekci_ns1.json >/dev/null 2>&1 || true
[ -n "$sorun_api$sorun_isler" ] && log "sorun: api=[$sorun_api] isler=[$sorun_isler]"
exit 0
