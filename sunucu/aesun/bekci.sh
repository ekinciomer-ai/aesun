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

# 2) iş çalıştırıcı + işler + müşteri toplayıcı
dj=$(docker exec aesun-isler cat /veri/durum.json 2>/dev/null)
echo "$dj" > $D/.isler_durum.json 2>/dev/null
docker exec aesun-musteri cat /musteri/durum.json > $D/.musteri_durum.json 2>/dev/null || true
ij=$(docker exec aesun-isler cat /veri/epias-ptf/n8n/is_hatalari.json 2>/dev/null)
nabiz=$(echo "$dj" | python3 -c "import json,sys;print(json.load(sys.stdin).get('nabiz',''))" 2>/dev/null)
etkin=$(echo "$dj" | python3 -c "import json,sys;print(json.load(sys.stdin).get('etkin'))" 2>/dev/null)
cn=$(docker exec aesun-isler date -Iseconds 2>/dev/null)   # kapsayıcının kendi saati (saat dilimi farkı olmasın)
na=$(python3 -c "import sys,datetime as d;a,b=sys.argv[1:];print(int((d.datetime.fromisoformat(a).replace(tzinfo=None)-d.datetime.fromisoformat(b).replace(tzinfo=None)).total_seconds()))" "$cn" "$nabiz" 2>/dev/null || echo 999999)
[ "$na" -gt 300 ] && sorun_isler="nabız ${na} sn önce"
# çalışan zamanlayıcının gerçekten tanımladığı işler (kapsayıcı eski sürümdeyse bekçi olmayan işi "gecikti" sayıp
# kapsayıcıyı boş yere yeniden başlatmasın — 25.10: "Portal denetimi" yüzünden 24 saatte 18 yeniden başlatma)
tanimli=$(docker exec -w /app aesun-isler python -c "import json,zamanlayici as z;print(json.dumps([i[0] for i in z.ISLER],ensure_ascii=False))" 2>/dev/null || echo '')
isler_json=$(echo "$ij" | TANIMLI="$tanimli" python3 -c "
import json,os,sys,datetime as dt
LIM={'Bildirimler':40,'Veri arşivi':130,'Durum analizi':130,'İzleme özeti':70,'Portal denetimi':70}   # iki tur kaçırınca
try: tan=json.loads(os.environ.get('TANIMLI') or 'null')
except Exception: tan=None
try: d=json.load(sys.stdin).get('isler',{})
except Exception: d={}
now=dt.datetime.now(dt.timezone.utc); out={}
for ad in (tan or []):
    LIM.setdefault(ad,130)                      # yeni eklenen iş: bekçi listesi güncellenmese de izlenir
for ad,lim in LIM.items():
    s=(d.get(ad) or {}).get('son')
    dk=round((now-dt.datetime.fromisoformat(s)).total_seconds()/60) if s else None
    eksik=tan is not None and ad not in tan     # zamanlayıcıda yok: onarımla düzelmez (isler_guncelle gerekir)
    out[ad]={'son':s,'dk':dk,'sinir_dk':lim,'kod':(d.get(ad) or {}).get('son_kod'),'gec':dk is not None and dk>lim and not eksik,'eksik':eksik,'hic':dk is None}   # hiç çalışmamış yeni iş: yeniden başlatma sebebi değil
print(json.dumps(out,ensure_ascii=False))" 2>/dev/null || echo '{}')
eksik_is=$(echo "$isler_json" | python3 -c "import json,sys;print(', '.join(k for k,v in json.load(sys.stdin).items() if v.get('eksik')))" 2>/dev/null)
[ -n "$eksik_is" ] && ayrinti+=("zamanlayıcıda tanımsız iş: $eksik_is — sunucu işlemi isler_guncelle gerekli (yeniden başlatma çözmez)")
gec=$(echo "$isler_json" | python3 -c "import json,sys;print(', '.join(k for k,v in json.load(sys.stdin).items() if v['gec']))" 2>/dev/null)
[ "$etkin" = "True" ] && [ -n "$gec" ] && sorun_isler="${sorun_isler:+$sorun_isler; }gecikti: $gec"
pidsI=$(docker stats --no-stream --format '{{.PIDs}}' aesun-isler 2>/dev/null || echo 0)
[ "${pidsI:-0}" -gt 300 ] && sorun_isler="${sorun_isler:+$sorun_isler; }süreç $pidsI"

# 2b) veri bütünlüğü (onarım yok, yalnız bildirilir): saatlik cihaz arşivi, günlük maliyet, F2Pool günlük gelir
ay=$(date -u +%Y-%m)
veri_json=$( { docker exec aesun-isler cat /veri/epias-ptf/arsiv_cihaz_$ay.json 2>/dev/null; echo; echo '#AYRAC#'; docker exec aesun-isler cat /veri/epias-ptf/n8n/maden_maliyet.json 2>/dev/null; echo; echo '#AYRAC#'; docker exec aesun-isler cat /veri/epias-ptf/arsiv_f2pool_gelir.json 2>/dev/null; } | python3 -c "
import sys,json,datetime as dt
p=sys.stdin.read().split('#AYRAC#'); j=[]
for x in p:
    try: j.append(json.loads(x))
    except Exception: j.append(None)
ars,mal,gel=(j+[None,None,None])[:3]
tr=dt.datetime.utcnow()+dt.timedelta(hours=3); dun=(tr-dt.timedelta(days=1)).strftime('%Y-%m-%d'); s=[]
if ars:
    son=max(ars); yas=round((dt.datetime.utcnow()-dt.datetime.fromisoformat(son)).total_seconds()/3600,1)
    if yas>6: s.append(f'cihaz arşivi {yas} saat geride (son {son})')
else: s.append('cihaz arşivi okunamadı')
m=(mal or {}).get('gun',{})
if tr.hour>=6 and dun not in m: s.append(f'{dun} enerji maliyeti hesaplanmadı')
if tr.hour>=5 and dun not in (gel or {}): s.append(f'{dun} F2Pool günlük geliri arşive girmedi')   # havuz günü 03:00'te kapanır; arşiv 03:05/04:05'te alır
print(json.dumps({'sorun':'; '.join(s) or None},ensure_ascii=False))" 2>/dev/null || echo '{"sorun":"veri denetimi çalışmadı"}')

# 2b+) cPanel köprüsü (n8n ve portal oradan okur): PHP çalışıyor mu? Anahtarsız istek 401 dönmeli; 5xx = PHP hatası (18 Eki: PHP 7.2'ye düştü)
kk=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 'https://portal.aksarayenerji.net/api/veri.php?a=oku&yol=n8n/pi_nabiz.json')
pk=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 'https://portal.aksarayenerji.net/api/portal.php')
if [ "${kk:0:1}" = "5" ] || [ "${pk:0:1}" = "5" ] || [ "$kk" = "000" ]; then
  veri_json=$(echo "$veri_json" | python3 -c "import json,sys;d=json.load(sys.stdin);m='cPanel köprüsü hata veriyor (veri.php $kk, portal.php $pk) — n8n ve portal girişi etkilenir';d['sorun']=(d.get('sorun')+'; '+m) if d.get('sorun') else m;print(json.dumps(d,ensure_ascii=False))")
fi

# 2c) güneş fırsat bedeli birimleri fatura sisteminden (gesfin): Sera2 satış faturası "elektrik üretim bedeli" ve "sistem kullanım bedeli"
#     6 saatte bir n8n/tarife_birim.json olarak iş klonuna yazılır; Veri arşivi işi (git add -A) depoya işler. Yalnız birim fiyat (tutar/kimlik yok).
tf=$D/.tarife_son; if [ $(( simdi - $(cat $tf 2>/dev/null || echo 0) )) -gt 21600 ]; then
  TQ="select json_build_object('kaynak','fatura sistemi (gesfin) · Sera2 GES satış faturaları','guncellendi',to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD\"T\"HH24:MI:SS'),
     'not','ay = fatura tarihinin ayı; birim TL/kWh KDV hariç','aylar',(select json_object_agg(ay, j) from (select ay, json_object_agg(tur, f) j from (
       select distinct on (to_char(i.invoice_date,'YYYY-MM'), case when k.description ilike '%sistem kullan%' then 'skb' else 'uretim_bedeli' end)
         to_char(i.invoice_date,'YYYY-MM') ay, case when k.description ilike '%sistem kullan%' then 'skb' else 'uretim_bedeli' end tur, k.unit_price f
       from invoices i join invoice_items k on k.invoice_id=i.id join facilities fa on fa.installation_number=i.installation_number
       where i.duplicate_of_invoice_id is null and i.invoice_type='SATIS' and fa.name ilike 'Sera2%' and k.unit_price > 0 and k.unit_price < 20
         and (k.description ilike '%sistem kullan%' or k.description ilike '%üretim bedeli%' or k.description ilike '%uretim bedeli%')
       order by 1, 2, k.quantity desc nulls last) a group by ay) b))"
  tj=$(docker exec gesfin-db psql -U gesfin -d gesfin -At -c "$TQ" 2>/dev/null)
  if echo "$tj" | python3 -c "import json,sys;d=json.load(sys.stdin);assert d['aylar']" 2>/dev/null; then
    echo "$tj" > /tmp/tarife_birim.json && docker cp /tmp/tarife_birim.json aesun-isler:/veri/epias-ptf/n8n/tarife_birim.json >/dev/null 2>&1 && echo $simdi > $tf
    rm -f /tmp/tarife_birim.json
  fi
fi

# 3) onarım (30 dk'da en çok bir / kapsayıcı)
onar() {  # $1 kapsayıcı  $2 neden
  f=$D/.bekci_son_$1; son=$(cat $f 2>/dev/null || echo 0)
  if [ $(( simdi - son )) -lt 1800 ]; then ayrinti+=("$1: bekleniyor (son onarım $(( (simdi-son)/60 )) dk önce)"); return; fi
  # aynı kapsayıcı 6 saatte 3 kez yeniden başlatıldıysa ve sorun sürüyorsa yeniden başlatma işe yaramıyor: dur, elle bakılsın
  n6=$(awk -F'|' -v t="$(date -d '-6 hours' -Iseconds)" -v k="$1" '$1>t && $2==k' $D/bekci_onarim.log 2>/dev/null | wc -l)
  case "$2" in *nabız*|*süreç*|*eşitleme*) n6=0;; esac     # çalıştırıcı/API donmuşsa yeniden başlatma gerçekten çözer: sınırlama yok
  if [ "${n6:-0}" -ge 3 ]; then ayrinti+=("$1: 6 saatte $n6 yeniden başlatma sorunu çözmedi — onarım durduruldu, elle bakılmalı ($2)"); log "ONARIM DURDU $1: $2"; return; fi
  echo $simdi > $f; log "ONARIM $1: $2"
  if docker restart -t 20 $1 >/dev/null 2>&1; then ayrinti+=("$1 yeniden başlatıldı: $2"); echo "$iso|$1|$2" >> $D/bekci_onarim.log
  else ayrinti+=("$1 yeniden başlatılamadı: $2"); fi
}
yeni() { b=$(docker inspect -f '{{.State.StartedAt}}' $1 2>/dev/null); [ -n "$b" ] && [ $(( simdi - $(date -d "$b" +%s) )) -lt 240 ]; }   # yeni açıldıysa (4 dk) hüküm verme
if [ -n "$sorun_api" ] && yeni aesun-api; then ayrinti+=("aesun-api yeni başladı, bekleniyor"); sorun_api=""; fi
if [ -n "$sorun_isler" ] && yeni aesun-isler; then ayrinti+=("aesun-isler yeni başladı, bekleniyor"); sorun_isler=""; fi
[ -n "$sorun_api" ] && onar aesun-api "$sorun_api"
[ -n "$sorun_isler" ] && onar aesun-isler "$sorun_isler"

# 4) öğrenen tarama (normalde 15 dk; geciken dosya varsa her turda yenile) + tüm uçların duman testi (10 dk)
tt=$D/.tarama_son; tg=$(python3 -c "import json;print(len(json.load(open('$D/tarama_durum.json')).get('geciken') or []))" 2>/dev/null || echo 1)
if [ "$tg" -gt 0 ] || [ $(( simdi - $(cat $tt 2>/dev/null || echo 0) )) -gt 840 ]; then echo $simdi > $tt; timeout 600 python3 $D/bekci_tarama.py >/dev/null 2>&1 || true; fi
ut=$D/.uclar_son; if [ $(( simdi - $(cat $ut 2>/dev/null || echo 0) )) -gt 540 ] && [ -f $D/izleme/duman_testi.py ]; then echo $simdi > $ut
  timeout 300 python3 $D/izleme/duman_testi.py --json > $D/uclar_durum.json.tmp 2>/dev/null; mv -f $D/uclar_durum.json.tmp $D/uclar_durum.json; fi

onarim24=$(awk -F'|' -v t="$(date -d '-24 hours' -Iseconds)" '$1>t' $D/bekci_onarim.log 2>/dev/null | wc -l)
son_onarim=$(tail -1 $D/bekci_onarim.log 2>/dev/null)
python3 - "$DURUM" "$iso" "$sorun_api" "$sorun_isler" "$es" "$na" "$pidsA" "$pidsI" "$onarim24" "$son_onarim" "$isler_json" "$veri_json" "${ayrinti[@]+"${ayrinti[@]}"}" <<'PY'
import json, sys
p, iso, sa, si, es, na, pa, pi, o24, son, isler, veri, *ayr = sys.argv[1:]
veri = json.loads(veri or "{}")
def oku(f, v):
    try: return json.load(open(f))
    except Exception: return v
tar = oku("/opt/aesun/tarama_durum.json", {})
try: sure = {k: v.get("sn") for k, v in (json.loads(open("/opt/aesun/.isler_durum.json").read()).get("isler") or {}).items()}   # iş süreleri (hız bekçisi)
except Exception: sure = {}
ucl = [u for u in oku("/opt/aesun/uclar_durum.json", []) if not u.get("ok")]
tarama = {"t": tar.get("t"), "izlenen": tar.get("izlenen"), "hata": tar.get("hata"), "geciken": tar.get("geciken") or []}
uclar = {"kalan": ucl, "sorun": "; ".join(f"{u['ad']}: {u['neden']}" for u in ucl) or None,
         "hiz": [{"ad": u.get("ad"), "ok": u.get("ok"), "ms": u.get("ms")} for u in oku("/opt/aesun/uclar_durum.json", [])]}   # hız bekçisi
mus = oku("/opt/aesun/.musteri_durum.json", {})
# Kapasite (Denetçi 'Veri Akışı → Kapasite'): disk, bellek, docker birimleri (birimler saatte bir ölçülür)
import shutil, subprocess, time, os
kap = {}
try:
    du = shutil.disk_usage("/"); kap["disk"] = {"toplam": du.total, "dolu": du.used, "bos": du.free}
except Exception: pass
try:
    mi = {a.split(":")[0]: int(a.split()[1]) * 1024 for a in open("/proc/meminfo").read().splitlines() if a.split()[1:]}
    kap["ram"] = {"toplam": mi.get("MemTotal"), "bos": mi.get("MemAvailable"), "takas_toplam": mi.get("SwapTotal"), "takas_bos": mi.get("SwapFree")}
    kap["yuk"] = open("/proc/loadavg").read().split()[0]; kap["cekirdek"] = os.cpu_count()
except Exception: pass
bf = "/opt/aesun/.birim_boyut.json"; bb = oku(bf, {})
if time.time() - bb.get("t", 0) > 3600:
    bir = {}
    for ad in ("aesun_veri", "aesun_isler", "aesun_musteri"):
        yol = f"/var/lib/docker/volumes/{ad}/_data"
        if os.path.isdir(yol):
            try: bir[ad] = int(subprocess.run(["du", "-sb", yol], capture_output=True, text=True, timeout=120).stdout.split()[0])
            except Exception: pass
    bb = {"t": int(time.time()), "birim": bir}
    try: open(bf, "w").write(json.dumps(bb))
    except Exception: pass
kap["birim"] = bb.get("birim", {})
d = {"t": iso, "durum": "sorun" if (sa or si or veri.get("sorun") or tarama["geciken"] or uclar["sorun"]) else "iyi",
     "api": {"sorun": sa or None, "esitleme_sn": int(es), "surec": int(pa or 0)},
     "isler": {"sorun": si or None, "nabiz_sn": int(na), "surec": int(pi or 0), "is": json.loads(isler or "{}"), "sure_sn": sure},
     "musteri": {"zaman": mus.get("zaman"), "santral_sayisi": mus.get("santral_sayisi"), "tur_sn": mus.get("tur_sn"), "hatalar": mus.get("hatalar")},
     "veri": veri, "kapasite": kap, "tarama": tarama, "uclar": uclar, "onarim_24s": int(o24), "son_onarim": son or None, "bu_tur": ayr}
open(p + ".tmp", "w").write(json.dumps(d, ensure_ascii=False)); import os; os.replace(p + ".tmp", p)
PY
docker cp $DURUM aesun-api:/veri/bekci_ns1.json >/dev/null 2>&1 || true
[ -n "$sorun_api$sorun_isler" ] && log "sorun: api=[$sorun_api] isler=[$sorun_isler]"
# 5) şef: bekçilerin bulduğunu çözer (sef.py), sonucu n8n/sef.json'a yazar
[ -f $D/sef.py ] && timeout 600 python3 $D/sef.py >> /var/log/aesun-sef.log 2>&1 || true
exit 0
