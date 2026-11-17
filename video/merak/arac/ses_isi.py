"""Merak senaryosundan sunucu seslendirme iş dosyası yazar: her parça kendi tonuyla (onaylı Gemini sesi, Kozmos Lab'ın ayrı anahtarı).
gTTS/edge-tts kullanılmaz. python3 ses_isi.py <senaryo.json> <is.json>"""
import json, sys
S = json.load(open(sys.argv[1], encoding="utf-8")); P = S["parcalar"]; n = len(P)
def ton(i, p):
    if p.get("ton"): return p["ton"]
    if i == 0: return "soru"                      # kanca: merak
    if i == n - 1: return "sakin"                 # samimi kapanış
    if any(e.get("tip") == "sayi" for e in p.get("ekran", [])): return "vurgu"   # sayı anı
    return "anlatici" if i % 2 else "heyecan"     # canlı anlatım, tekdüzeliği kır
json.dump({"kod": S["kod"], "motor": "gemini", "ses": S.get("ses", "puck"), "oto_ton": False,
           "parcalar": [{"ad": p["id"], "metin": f"[{ton(i, p)}] {p['metin']}"} for i, p in enumerate(P)]},
          open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ses işi:", S["kod"], n, "parça (parça başına ton),", S.get("ses", "puck"))
