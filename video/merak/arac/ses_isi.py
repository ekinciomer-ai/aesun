"""Merak senaryosundan sunucu seslendirme kuyruğu iş dosyası yazar (Gemini, onaylı ses kütüphanesi; gTTS/edge-tts kullanılmaz).
python3 ses_isi.py <senaryo.json> <is.json>"""
import json, sys
S = json.load(open(sys.argv[1], encoding="utf-8"))
ton = {0: "soru"}  # kanca soru tonuyla; gerisi otomatik ton
parcalar = []
for i, p in enumerate(S["parcalar"]):
    t = p.get("ton") or ("soru" if i == 0 else "heyecan" if i == len(S["parcalar"]) - 1 else "anlatici")
    parcalar.append({"ad": p["id"], "metin": f"[{t}] {p['metin']}"})
json.dump({"kod": S["kod"], "motor": "gemini", "ses": S.get("ses", "puck"), "oto_ton": True, "parcalar": parcalar},
          open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ses işi:", S["kod"], len(parcalar), "parça,", S.get("ses", "puck"))
