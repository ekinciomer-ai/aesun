#!/bin/bash
# Davalar: MEVCUT sunuma EK yapar (merge) — hiçbir evrakı SİLMEZ, mevcut dizini sunucuda çözüp üstüne ekler.
# islem_davalar_yukle.sh komple değiştiriyordu; bu betik yalnız yeni dava/evrak ekler ve istenirse mevcut davalara grup etiketi yazar.
# Paket: gizli epias-ptf deposunun 'gecici-davalar-ekle' dalında, sunucu açık anahtarıyla şifreli (yukle ile aynı sarmalama).
#   ekle/dizin_ek.json : {"davalar":[...yeni davalar...], "evrak":{eid:{tur..}}, "grup_ata":{"<esas>":"<grup>"}, "guncel":"..."}
#   ekle/e/<eid>.<tur>  : yeni evrakların açık metni
# Açık metin host diskinde kalmaz (geçici klasör silinir); çözme ve şifreleme yalnız aesun-api kullanıcısı (1001) + anahtar konteyner içinde.
set -euo pipefail
DAL=gecici-davalar-ekle; D=/opt/aesun/ozel/davalar; S="$D/sunum"
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA önce davalar_kur çalışmalı"; exit 1; }
[ -f "$S/dizin.sifreli" ] || { echo "NOT: HATA mevcut dizin yok — ilk yüklemede islem_davalar_yukle kullanılır"; exit 1; }
T=$(mktemp -d /root/davalar_ekle.XXXXXX); trap 'rm -rf "$T"' EXIT
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
[ -f "$T/ac/ekle/dizin_ek.json" ] || { echo "NOT: HATA dizin_ek yok"; exit 1; }
# Merge+şifreleme konteyner içinde (anahtar + mevcut sunum + ek paket); açık dizin host diskine yazılmaz
cat > "$T/birlestir.py" <<'P'
import os, json
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
key = Path("/k").read_bytes()[:32]; a = AESGCM(key)
def coz(p):
    b = Path(p).read_bytes(); return a.decrypt(b[:12], b[12:], None)
def sifrele_bayt(b):
    n = os.urandom(12); return n + a.encrypt(n, b, None)
sunum = Path("/sunum"); ekle = Path("/ac/ekle")
# 1) mevcut dizini çöz
mevcut = json.loads(coz(sunum / "dizin.sifreli"))
mevcut.setdefault("davalar", []); mevcut.setdefault("evrak", {})
ek = json.loads((ekle / "dizin_ek.json").read_text())
# 2) mevcut davalara grup etiketi + grup kodu (esas/başlık içinde kalıp eşleşmesiyle; biçim farkına dayanıklı)
grup_ata = ek.get("grup_ata", {})   # {"<kalip>": {"grup": "...", "gkod": "..."}}
for d in mevcut["davalar"]:
    hedef = (str(d.get("esas", "")) + " " + str(d.get("baslik", "")))
    for kalip, info in grup_ata.items():
        if kalip and kalip in hedef:
            if info.get("grup"): d["grup"] = info["grup"]
            if info.get("gkod"): d["gkod"] = info["gkod"]
            break
# 3) yeni davaları ekle (esas'a göre tekilleştir; varsa güncelle, yoksa ekle)
esas_idx = {str(d.get("esas", "")): i for i, d in enumerate(mevcut["davalar"])}
eklenen = 0
for yeni in ek.get("davalar", []):
    e = str(yeni.get("esas", ""))
    if e and e in esas_idx:
        mevcut["davalar"][esas_idx[e]] = yeni   # aynı esas → güncelle
    else:
        mevcut["davalar"].append(yeni); eklenen += 1
# 4) evrak haritasını birleştir (yeni kazanır)
mevcut["evrak"].update(ek.get("evrak", {}))
if ek.get("guncel"): mevcut["guncel"] = ek["guncel"]
# 5) yeni evrakları şifrele (yalnız yeni; mevcut e/ dosyalarına DOKUNULMAZ)
yeni_ev = 0; ed = ekle / "e"
if ed.is_dir():
    (sunum / "e").mkdir(exist_ok=True)
    for f in ed.iterdir():
        eid = f.name.split(".")[0]
        (sunum / "e" / (eid + ".sifreli")).write_bytes(sifrele_bayt(f.read_bytes())); yeni_ev += 1
# 6) birleşik dizini atomik yaz (önce .yeni, sonra taşı; eski .onceki'ye)
tmp = sunum / "dizin.sifreli.yeni"
tmp.write_bytes(sifrele_bayt(json.dumps(mevcut, ensure_ascii=False).encode()))
try: (sunum / "dizin.sifreli").replace(sunum / "dizin.sifreli.onceki")
except Exception: pass
tmp.replace(sunum / "dizin.sifreli")
print(json.dumps({"eklenen_dava": eklenen, "yeni_evrak": yeni_ev, "toplam_dava": len(mevcut["davalar"]), "toplam_evrak": len(mevcut["evrak"])}))
P
chmod -R a+rX "$T/ac" "$T/birlestir.py"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
OUT=$(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$S":/sunum -v "$T/ac":/ac:ro -v "$T/birlestir.py":/b.py:ro "$IMG" python /b.py)
echo "NOT: merge sonucu $OUT"
rm -rf "$T/ac"
cp "$T/a.enc" "$D/ekle_paket_$(date +%Y%m%d_%H%M).enc"; cp "$G/anahtar.sarili" "$D/ekle_paket_$(date +%Y%m%d_%H%M).anahtar"; chmod 600 "$D"/ekle_paket_* 2>/dev/null || true
chown -R 1001:1001 "$S"; chmod 700 "$S" "$S/e"
docker restart aesun-api >/dev/null && sleep 6
echo "NOT: yetkisiz istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/dizin) (401 beklenir)"
timeout 300 docker exec -e GIT_SSH_COMMAND="ssh -o BatchMode=yes" -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git push -q origin --delete $DAL; git update-ref -d refs/remotes/origin/$DAL" >/dev/null 2>&1 && echo "NOT: geçici dal silindi" || echo "NOT: UYARI geçici dal silinemedi"
