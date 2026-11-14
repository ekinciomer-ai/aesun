#!/bin/bash
# Antik Stüdyo B01 "Keops'un tepesi kayıp" — ses (ElevenLabs, sunucudaki anahtar, yazdırılmaz) + kodla müzik + kodla film stilleri.
# YAYINLAMAZ. Yalnız önizleme üretir. Tampon kapsayıcıda çalışır (tampon-video15:2), başka sisteme dokunmaz.
set -u
KOK=/opt/tampon/antik_b01; IMAJ=tampon-video15:2
mkdir -p $KOK/ses $KOK/cikti /opt/tampon/disari
cp sunucu/antik_b01/* $KOK/
# 1) Ses: parça başına bir kez üretilir (önbellek: metin değişmedikçe tekrar harcanmaz)
K=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$K" ] || { echo "NOT: HATA ElevenLabs anahtarı yok"; exit 1; }
python3 - "$K" "$KOK" <<'PY'
import json, sys, os, base64, hashlib, urllib.request, urllib.error
K, kok = sys.argv[1], sys.argv[2]; j = json.load(open(f"{kok}/metin.json", encoding="utf-8"))
for i, metin in enumerate(j["parcalar"], 1):
    h = hashlib.sha1((j["voice_id"]+j["model"]+json.dumps(j["ayar"])+metin).encode()).hexdigest()[:10]
    mp3, js, hf = f"{kok}/ses/p{i}.mp3", f"{kok}/ses/p{i}.json", f"{kok}/ses/p{i}.hash"
    if os.path.exists(mp3) and os.path.exists(hf) and open(hf).read() == h: print(f"NOT: ses p{i} önbellekten"); continue
    govde = {"text": metin, "model_id": j["model"], "voice_settings": j["ayar"]}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{j['voice_id']}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(govde).encode(), headers={"xi-api-key": K, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as r: d = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"NOT: HATA ses p{i} HTTP {e.code} {e.read().decode('utf-8','replace')[:160]}"); sys.exit(1)
    open(mp3, "wb").write(base64.b64decode(d["audio_base64"])); json.dump(d["alignment"], open(js, "w"), ensure_ascii=False); open(hf, "w").write(h)
    print(f"NOT: ses p{i} üretildi ({len(metin)} karakter)")
try:
    with urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/user/subscription", headers={"xi-api-key": K}), timeout=30) as r:
        d = json.load(r); print(f"NOT: ElevenLabs kalan karakter: {d.get('character_limit',0)-d.get('character_count',0)} / {d.get('character_limit')}")
except Exception: pass
PY
[ $? -eq 0 ] || exit 1
chown -R 1500:1500 $KOK
RUN="docker run --rm --memory 4096m --cpus 3 --pids-limit 2048 --shm-size 1g --security-opt no-new-privileges --cap-drop ALL -e HOME=/work/.home -e NPM_CONFIG_UPDATE_NOTIFIER=false -v $KOK:/work -e PLAYWRIGHT_BROWSERS_PATH=/pwc -v /opt/tampon/video15/.home/.cache/ms-playwright:/pwc:ro -v /opt/tampon/video15/pwkayit/node_modules:/work/node_modules:ro -w /work $IMAJ"
# 2) Zaman, müzik, ses karışımı, görüntü, birleştirme
$RUN timeout 2400 bash calis.sh > $KOK/is.log 2>&1
k=$?; grep -E 'zaman tamam|muzik tamam|kayıt bitti|bitti|Error|error' $KOK/is.log | tail -8 | sed 's/^/NOT: /'
[ $k -eq 0 ] || { tail -15 $KOK/is.log | sed 's/^/NOT: [hata] /'; exit 1; }
for f in $KOK/cikti/*.mp4; do echo "NOT: ÇIKTI $(basename $f) $(du -h $f | cut -f1)"; done
# kalite: ses seviyesi ve siyah kare kontrolü
docker run --rm -v $KOK:/work $IMAJ bash -c "ffmpeg -hide_banner -i /work/cikti/antik_b01_1080.mp4 -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1; ffmpeg -hide_banner -i /work/cikti/antik_b01_1080.mp4 -vf blackdetect=d=0.5:pic_th=0.95 -an -f null - 2>&1 | grep -c black_start" | sed 's/^/NOT: kalite: /'
echo "ONIZLEME_BASLA antik_b01_480.mp4"; base64 -w 4000 $KOK/cikti/antik_b01_480.mp4; echo "ONIZLEME_BITTI"
