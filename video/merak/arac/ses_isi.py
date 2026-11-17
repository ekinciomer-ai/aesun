"""Merak senaryosundan sunucu seslendirme iş dosyası yazar: TEK istek (kota korunur), onaylı Gemini sesi.
Bölme sonra faster-whisper ile yapılır (video/ny/arac/hizala.py). gTTS/edge-tts kullanılmaz.
python3 ses_isi.py <senaryo.json> <is.json>"""
import json, sys
S = json.load(open(sys.argv[1], encoding="utf-8"))
metin = " ".join(p["metin"].strip() for p in S["parcalar"])
json.dump({"kod": S["kod"], "motor": "gemini", "ses": S.get("ses", "puck"), "oto_ton": False,
           "parcalar": [{"ad": "tam", "metin": f"[{S.get('ton', 'normal')}] {metin}"}]},
          open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ses işi:", S["kod"], "tek parça,", len(metin.split()), "kelime,", S.get("ses", "puck"))
