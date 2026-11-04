#!/bin/bash
# Tampon bölge: açık kaynak SESLENDİRME denemesi (bilgisayar ve ücretli servis gerekmez).
#  - Chatterbox Multilingual (resemble-ai/chatterbox, MIT): Türkçe + İngilizce, ses klonlama yapabilir.
#  - Piper (yerel, hızlı): Türkçe/İngilizce hazır sesler (ses dosyalarının lisansı ayrıca yazdırılır).
# Yalıtılmış kapsayıcı (--rm), port açmaz, sır okumaz, diğer uygulamalara dokunmaz. Yer: /opt/tampon/ses
# Çıktı: /opt/tampon/ses/cikti/*.mp3 → iş akışı bunları docs/tampon/ses/ altına alır (dinlemek için).
set -u
KOK=/opt/tampon/ses; IMAJ=tampon-ses:1
mkdir -p "$KOK/cikti" "$KOK/onbellek"; rm -f "$KOK/cikti/"*
BOS_GB=$(df -BG / | tail -1 | awk '{gsub("G","",$4); print $4}')
[ "${BOS_GB:-0}" -lt 10 ] && { echo "NOT: HATA disk boş alanı 10 GB altında"; exit 1; }
TOPLAM_MB=$(free -m | awk '/Mem/{print $2}'); BELLEK_MB=$(( TOPLAM_MB / 2 )); [ $BELLEK_MB -gt 8192 ] && BELLEK_MB=8192
CEKIRDEK=$(( $(nproc) / 2 )); [ $CEKIRDEK -lt 1 ] && CEKIRDEK=1
echo "NOT: sunucu $(nproc) çekirdek, tampon sınırı ${BELLEK_MB} MB / ${CEKIRDEK} çekirdek, disk boş ${BOS_GB} GB"

cat > "$KOK/Dockerfile" <<'EOF'
FROM python:3.11-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir chatterbox-tts piper-tts
RUN useradd -m -u 1501 tampon
USER tampon
WORKDIR /work
EOF
docker build -q -t "$IMAJ" "$KOK" >/dev/null 2>"$KOK/build.err" || { echo "NOT: HATA imaj: $(tail -4 "$KOK/build.err" | tr '\n' ' ' | cut -c1-300)"; exit 1; }
echo "NOT: imaj hazır ($(docker image inspect "$IMAJ" --format '{{.Size}}' | awk '{printf "%.1f GB", $1/1e9}'))"
chown -R 1501:1501 "$KOK"

cat > "$KOK/dene.py" <<'EOF'
import os, sys, time, subprocess, json, urllib.request
OUT = "/work/cikti"; os.environ.setdefault("HF_HOME", "/work/onbellek")
TR = ("Beşiktaş tarihinde ilk kez bir İskoç takımıyla karşılaşıyor. Yarın akşam saat yirmi üçte, Glasgow'daki Celtic Park'ta. "
      "Celtic'i 1887'de bir din adamı, şehrin yoksul çocuklarına yemek parası toplamak için kurdu. Sizce skor ne olur?")
EN = ("Celtic have never faced Beşiktaş. Until tomorrow night at Celtic Park. "
      "Celtic were founded in 1887 by a priest, to feed the poor children of Glasgow's East End. What's your score prediction?")
sonuc = {}
def mp3(wav, ad):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5", "-b:a", "96k", f"{OUT}/{ad}.mp3"], check=True)
    os.remove(wav)
# 1) Piper (hızlı)
try:
    base = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/"
    for ad, yol, metin in (("piper_tr_fahrettin", "tr/tr_TR/fahrettin/medium/tr_TR-fahrettin-medium", TR),
                           ("piper_tr_dfki", "tr/tr_TR/dfki/medium/tr_TR-dfki-medium", TR),
                           ("piper_en_ryan", "en/en_US/ryan/high/en_US-ryan-high", EN)):
        m = f"/work/onbellek/{ad}.onnx"
        for uz in ("", ".json"):
            if not os.path.exists(m + uz):
                urllib.request.urlretrieve(base + yol + ".onnx" + uz, m + uz)
        kart = base + os.path.dirname(yol) + "/MODEL_CARD"
        try: lis = [l for l in urllib.request.urlopen(kart, timeout=20).read().decode().splitlines() if "icense" in l][:2]
        except Exception: lis = ["?"]
        t = time.time()
        subprocess.run(["python", "-m", "piper", "-m", m, "-f", f"{OUT}/{ad}.wav", "--", metin], check=True, capture_output=True)
        mp3(f"{OUT}/{ad}.wav", ad); sonuc[ad] = {"sure_sn": round(time.time() - t, 1), "lisans": " ".join(lis)[:120]}
except Exception as e:
    sonuc["piper_hata"] = f"{type(e).__name__}: {e}"[:200]
# 2) Chatterbox Multilingual (MIT)
try:
    import torch, torchaudio
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    torch.set_num_threads(max(1, os.cpu_count() or 1))
    t = time.time(); model = ChatterboxMultilingualTTS.from_pretrained(device="cpu"); sonuc["chatterbox_yukleme_sn"] = round(time.time() - t, 1)
    for ad, metin, dil, ek in (("chatterbox_tr", TR, "tr", {}), ("chatterbox_tr_vurgulu", TR, "tr", {"exaggeration": 0.7, "cfg_weight": 0.3}),
                               ("chatterbox_en", EN, "en", {})):
        t = time.time(); wav = model.generate(metin, language_id=dil, **ek)
        torchaudio.save(f"{OUT}/{ad}.wav", wav, model.sr); mp3(f"{OUT}/{ad}.wav", ad)
        sonuc[ad] = {"sure_sn": round(time.time() - t, 1)}
except Exception as e:
    sonuc["chatterbox_hata"] = f"{type(e).__name__}: {e}"[:300]
json.dump(sonuc, open(f"{OUT}/sonuc.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(sonuc, ensure_ascii=False))
EOF
chown 1501:1501 "$KOK/dene.py"
timeout 2400 docker run --rm --name tampon-ses --memory ${BELLEK_MB}m --cpus ${CEKIRDEK} --pids-limit 512 \
  --security-opt no-new-privileges --cap-drop ALL -v "$KOK":/work "$IMAJ" python /work/dene.py > "$KOK/dene.log" 2>&1
echo "NOT: deneme çıkış kodu $? · $(tail -1 "$KOK/dene.log" | cut -c1-600)"
ls -la "$KOK/cikti" | sed 's/^/NOT: /'
