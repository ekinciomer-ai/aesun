#!/bin/bash
# Davalar GÜNCELLE (katmerli/append): mevcut bir davaya YENİ evrak ekler (hiçbir evrak silinmez),
# 'son gelen' + yeni_sayi + güncelleme etiketlerini yazar ve grup notlarını (yorumlar/bekleyen/brifing) kurar.
# islem_davalar_ekle.sh yeni DAVA ekler; bu betik MEVCUT davaya evrak ekler ve notları yazar.
# Paket: gizli epias-ptf 'gecici-davalar-guncelle' dalında, sunucu açık anahtarıyla sarılı (ekle ile aynı sarmalama).
#   guncelle/islem.json : {"evrak_ekle":{"<kalıp>":{"klasor","evraklar":[...],"son":[...],"yeni_sayi","guncelleme"}},
#                          "evrak":{eid:{tur}}, "notlar":["<gkod>_<ad>",...], "guncel":"..."}
#   guncelle/e/<eid>.<tur>      : yeni evrakların açık metni
#   guncelle/not/<gkod>_<ad>.md : grup notu markdown (sunum/<gkod>_<ad>.sifreli olur; davalar.py /davalar=sunum okur)
# Açık metin host diskine yazılmaz; çözme/şifreleme yalnız aesun kullanıcısı (1001) + anahtar ağsız kapsayıcıda.
set -euo pipefail
DAL=gecici-davalar-guncelle; D=/opt/aesun/ozel/davalar; S="$D/sunum"
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA önce davalar_kur çalışmalı"; exit 1; }
[ -f "$S/dizin.sifreli" ] || { echo "NOT: HATA mevcut dizin yok"; exit 1; }
T=$(mktemp -d /root/davalar_guncelle.XXXXXX); trap 'rm -rf "$T"' EXIT
C=$(docker ps --format '{{.Names}}' | grep -E '^aesun[-_]isler' | head -1)
[ -n "$C" ] || { echo "NOT: HATA aesun-isler kapsayıcısı yok"; exit 1; }
mkdir -p "$T/d"
timeout 1500 docker exec -e GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20' -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git fetch -q --depth 1 origin $DAL:refs/remotes/origin/$DAL" </dev/null > "$T/fetch.log" 2>&1 || { echo "NOT: HATA geçici dal çekilemedi: $(tail -3 "$T/fetch.log" | tr '\n' ' ' | sed -E 's#https?://[^ ]*#URL#g' | cut -c1-300)"; exit 1; }
timeout 600 docker exec "$C" sh -c "cd /veri/epias-ptf && git archive refs/remotes/origin/$DAL gecici" </dev/null | tar xf - -C "$T/d"
G="$T/d/gecici"; echo "NOT: $(ls "$G" | wc -l) parça alındı"
cat "$G"/p_* > "$T/a.enc"
J=$(base64 -d "$G/anahtar.sarili" | openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256)
K=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["k"])'); IV=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["iv"])'); SHA=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["sha"])'); unset J
openssl enc -d -aes-256-cbc -K "$K" -iv "$IV" -in "$T/a.enc" -out "$T/a.tgz"; unset K IV
[ "$(sha256sum "$T/a.tgz" | cut -d' ' -f1)" = "$SHA" ] || { echo "NOT: HATA paket bozuk"; exit 1; }
mkdir -p "$T/ac"; tar xzf "$T/a.tgz" -C "$T/ac"; rm -f "$T/a.tgz"
[ -f "$T/ac/guncelle/islem.json" ] || { echo "NOT: HATA islem.json yok"; exit 1; }
cat > "$T/g.py" <<'P'
import os, json
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
key = Path("/k").read_bytes()[:32]; a = AESGCM(key)
def coz(p): b = Path(p).read_bytes(); return a.decrypt(b[:12], b[12:], None)
def sif(b): n = os.urandom(12); return n + a.encrypt(n, b, None)
S = Path("/sunum"); G = Path("/ac/guncelle")
islem = json.loads((G / "islem.json").read_text())
dizin = json.loads(coz(S / "dizin.sifreli"))
dizin.setdefault("davalar", []); dizin.setdefault("evrak", {})
ozet = {"evrak_ekle": [], "not": [], "bulunamadi": []}
for kalip, info in (islem.get("evrak_ekle") or {}).items():
    hedef = None
    for d in dizin["davalar"]:
        if kalip and kalip in (str(d.get("esas","")) + " " + str(d.get("baslik",""))):
            hedef = d; break
    if hedef is None:
        ozet["bulunamadi"].append(kalip); continue
    kad = info.get("klasor") or "Yeni Evraklar"
    kl = None
    for k in hedef.setdefault("klasorler", []):
        if k.get("ad") == kad: kl = k; break
    if kl is None:
        kl = {"ad": kad, "evraklar": []}; hedef["klasorler"].insert(0, kl)
    mevcut_id = {e.get("id") for e in kl.get("evraklar", [])}
    eklendi = 0
    for e in info.get("evraklar", []):
        if e.get("id") in mevcut_id: continue
        kl.setdefault("evraklar", []).append(e); mevcut_id.add(e.get("id")); eklendi += 1
    if info.get("son") is not None: hedef["son"] = info["son"]
    if info.get("yeni_sayi") is not None: hedef["yeni_sayi"] = info["yeni_sayi"]
    if info.get("guncelleme"): hedef["guncelleme"] = info["guncelleme"]
    ozet["evrak_ekle"].append(f"{kalip}->{hedef.get('baslik','')}: +{eklendi} evrak ({kad})")
dizin["evrak"].update(islem.get("evrak") or {})
if islem.get("guncel"): dizin["guncel"] = islem["guncel"]
ed = G / "e"
if ed.is_dir():
    (S / "e").mkdir(exist_ok=True)
    for f in ed.iterdir():
        eid = f.name.split(".")[0]
        (S / "e" / (eid + ".sifreli")).write_bytes(sif(f.read_bytes()))
nd = G / "not"
for ad in (islem.get("notlar") or []):
    mf = nd / (ad + ".md")
    if mf.is_file():
        (S / (ad + ".sifreli")).write_bytes(sif(mf.read_bytes())); ozet["not"].append(ad)
tmp = S / "dizin.sifreli.yeni"
tmp.write_bytes(sif(json.dumps(dizin, ensure_ascii=False).encode()))
try: (S / "dizin.sifreli").replace(S / "dizin.sifreli.onceki")
except Exception: pass
tmp.replace(S / "dizin.sifreli")
ozet["toplam_dava"] = len(dizin["davalar"]); ozet["toplam_evrak"] = len(dizin["evrak"])
print(json.dumps(ozet, ensure_ascii=False))
P
chmod -R a+rX "$T/ac" "$T/g.py"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
OUT=$(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$S":/sunum -v "$T/ac":/ac:ro -v "$T/g.py":/g.py:ro "$IMG" python /g.py)
echo "NOT: guncelle sonucu $OUT"
rm -rf "$T/ac"
chown -R 1001:1001 "$S"; chmod 700 "$S" "$S/e"
docker restart aesun-api >/dev/null && sleep 6
echo "NOT: yetkisiz istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/dizin) (401 beklenir)"
timeout 300 docker exec -e GIT_SSH_COMMAND="ssh -o BatchMode=yes" -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git push -q origin --delete $DAL; git update-ref -d refs/remotes/origin/$DAL" >/dev/null 2>&1 && echo "NOT: geçici dal silindi" || echo "NOT: UYARI geçici dal silinemedi"
