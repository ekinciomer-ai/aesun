#!/bin/bash
# Davalar → grup filmi: API'yi günceller, videoyu gizli epias-ptf deposunun geçici dalından alır (sunucu açık anahtarıyla sarılı),
# dava anahtarıyla 1 MiB'lık AES-256-GCM parçalara bölüp /opt/aesun/ozel/davalar/sunum/film/<gkod>__<fid>/ altına koyar.
# Grup listesine (film/<gkod>.sifreli) ekler. Açık video diske kalmaz (geçici klasör iş sonunda silinir). Geçici dal silinir.
set -euo pipefail
DAL=gecici-davalar-film; D=/opt/aesun/ozel/davalar
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA dava anahtarı yok"; exit 1; }
bash sunucu/islem_api_guncelle.sh || { echo "NOT: HATA API güncellenemedi, film yüklenmedi"; exit 1; }
T=$(mktemp -d /root/davalar_film.XXXXXX); trap 'rm -rf "$T"' EXIT
C=$(docker ps --format '{{.Names}}' | grep -E '^aesun[-_]isler' | head -1)
[ -n "$C" ] || { echo "NOT: HATA aesun-isler kapsayıcısı yok"; exit 1; }
mkdir -p "$T/d"
timeout 900 docker exec -e GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20' -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git fetch -q --depth 1 origin $DAL:refs/remotes/origin/$DAL" </dev/null > "$T/fetch.log" 2>&1 || { echo "NOT: HATA geçici dal çekilemedi: $(tail -3 "$T/fetch.log" | tr '\n' ' ' | sed -E 's#https?://[^ ]*#URL#g' | cut -c1-300)"; exit 1; }
timeout 600 docker exec "$C" sh -c "cd /veri/epias-ptf && git archive refs/remotes/origin/$DAL gecici" </dev/null | tar xf - -C "$T/d"
S="$T/d/gecici"
J=$(base64 -d "$S/anahtar.sarili" | openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256)
jv(){ printf '%s' "$J" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
K=$(jv k); IV=$(jv iv); SHA=$(jv sha); GK=$(jv gkod); FID=$(jv fid); unset J
[[ "$GK" =~ ^[a-z0-9_]{1,30}$ && "$FID" =~ ^[a-z0-9_]{1,40}$ ]] || { echo "NOT: HATA geçersiz ad"; exit 1; }
mkdir -p "$T/ac" "$T/yeni"
cp "$S/meta.json" "$T/ac/meta.json"; cat "$S"/video.enc.* > "$T/v.enc"; rm -rf "$S"
openssl enc -d -aes-256-cbc -K "$K" -iv "$IV" -in "$T/v.enc" -out "$T/ac/video.mp4"; unset K IV; rm -f "$T/v.enc"
[ "$(sha256sum "$T/ac/video.mp4" | cut -d' ' -f1)" = "$SHA" ] || { echo "NOT: HATA video bozuk"; exit 1; }
cat > "$T/s.py" <<'P'
import os, json
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
a = AESGCM(Path("/k").read_bytes()[:32])
def sif(b): n = os.urandom(12); return n + a.encrypt(n, b, None)
gk, fid = os.environ["GK"], os.environ["FID"]
m = json.loads(Path("/ac/meta.json").read_text())
v = Path("/ac/video.mp4"); boy = v.stat().st_size; out = Path("/yeni") / f"{gk}__{fid}"; out.mkdir(parents=True)
with v.open("rb") as f:
    i = 0
    while True:
        b = f.read(1 << 20)
        if not b: break
        (out / f"{i:05d}.sifreli").write_bytes(sif(b)); i += 1
kayit = {"fid": fid, "baslik": m["baslik"], "aciklama": m.get("aciklama", ""), "tarih": m["tarih"], "sure": m.get("sure", ""), "boy": boy, "parca": i}
(out / "meta.sifreli").write_bytes(sif(json.dumps(kayit, ensure_ascii=False).encode()))
liste = {"filmler": []}
eski = Path("/eski") / f"{gk}.sifreli"
if eski.is_file():
    b = eski.read_bytes(); liste = json.loads(a.decrypt(b[:12], b[12:], None))
liste["filmler"] = [x for x in liste["filmler"] if x["fid"] != fid] + [kayit]
(Path("/yeni") / f"{gk}.sifreli").write_bytes(sif(json.dumps(liste, ensure_ascii=False).encode()))
print(fid, i, boy)
P
mkdir -p "$D/sunum/film"; chown 1001:1001 "$D/sunum/film"; chmod 700 "$D/sunum/film"
chown -R 1001:1001 "$T/yeni"; chmod 755 "$T"; chmod -R a+rX "$T/ac" "$T/s.py"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
docker run --rm --network none --user 1001 -e GK="$GK" -e FID="$FID" -v "$D/anahtar.bin":/k:ro -v "$T/ac":/ac:ro -v "$T/yeni":/yeni -v "$D/sunum/film":/eski:ro -v "$T/s.py":/s.py:ro "$IMG" python /s.py
rm -rf "$T/ac"
[ -d "$D/sunum/film/${GK}__${FID}" ] && mv "$D/sunum/film/${GK}__${FID}" "$T/onceki_film"
[ -f "$D/sunum/film/$GK.sifreli" ] && cp -p "$D/sunum/film/$GK.sifreli" "$D/film_${GK}.onceki.sifreli"
mv "$T/yeni/${GK}__${FID}" "$D/sunum/film/"
install -o 1001 -g 1001 -m 600 "$T/yeni/$GK.sifreli" "$D/sunum/film/$GK.sifreli"
chown -R 1001:1001 "$D/sunum/film"; chmod 700 "$D/sunum/film/${GK}__${FID}"; chmod 600 "$D/sunum/film/${GK}__${FID}"/*
echo "NOT: film yüklendi: $GK/$FID ($(du -sh "$D/sunum/film/${GK}__${FID}" | cut -f1), şifreli parçalar)"
echo "NOT: yetkisiz istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/grup/$GK/filmler) (401 beklenir)"
timeout 300 docker exec -e GIT_SSH_COMMAND="ssh -o BatchMode=yes" -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git push -q origin --delete $DAL; git update-ref -d refs/remotes/origin/$DAL" >/dev/null 2>&1 && echo "NOT: geçici dal silindi" || echo "NOT: UYARI geçici dal silinemedi"
