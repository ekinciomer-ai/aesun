"""Merak senaryosundan sunucu seslendirme iş dosyası yazar: video başına TEK Gemini isteği (kota: günde ~10 istek/anahtar),
'canli' yönergesiyle cümleden cümleye ton değişir; parçalara bölme faster-whisper ile (video/ny/arac/hizala.py).
gTTS/edge-tts kullanılmaz. python3 ses_isi.py <senaryo.json> <is.json>"""
import json, sys
S = json.load(open(sys.argv[1], encoding="utf-8"))
metin = " ".join(p["metin"].strip() for p in S["parcalar"])
json.dump({"kod": S["kod"], "motor": "gemini", "ses": S.get("ses", "puck"), "oto_ton": False,
           "parcalar": [{"ad": "tam", "metin": f"[{S.get('ton', 'canli')}] {metin}"}]},
          open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ses işi:", S["kod"], "tek istek,", len(metin.split()), "kelime,", S.get("ses", "puck"))
