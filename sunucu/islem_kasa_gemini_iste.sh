#!/bin/bash
# Kasaya "gemini_api_anahtar" beklenen kaydını ekler (değer içermez). Tonlu seslendirme (Gemini TTS) için.
F=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json
python3 - "$F" <<'PY'
import json, sys, os
f = sys.argv[1]; d = json.load(open(f)) if os.path.exists(f) else {}
d["gemini_api_anahtar"] = "Gemini API anahtarı (ücretsiz, kart istemez): console.cloud.google.com → Kanal Yonetim → 'Create Gemini API key'. Tonlu Türkçe seslendirme (Gemini TTS) için."
json.dump(d, open(f, "w"), ensure_ascii=False, indent=1); os.chown(f, 1001, 1001); os.chmod(f, 0o600)
print("NOT: kasada beklenen kayıt hazır: gemini_api_anahtar")
PY
