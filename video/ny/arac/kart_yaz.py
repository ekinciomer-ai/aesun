# Yükleme Yöneticisi teslim kartı: python3 kart_yaz.py <KOD> <çıktı.json>
# Bilgiler konular/<KOD>.json → "yayin" bloğundan (baslik, aciklama, etiketler, tiktok_metin, amac, platformlar).
import json, sys, os, datetime
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
kod, out = sys.argv[1], sys.argv[2]
k = json.load(open(f"{KOK}/konular/{kod}.json", encoding="utf-8")); y = k.get("yayin", {})
meta = {}
try: meta = json.load(open(f"{KOK}/ses/{kod}/meta.json"))
except Exception: pass
kaynak = list(k.get("kaynaklar", [])) + ["Harita: Natural Earth (kamu malı), geoBoundaries (CC BY 4.0); yükselti: AWS Terrain Tiles (SRTM/GMTED açık veri)"]
aciklama = y.get("aciklama") or k.get("baslik_bant", "")
aciklama += "\n\n📚 Kaynaklar: " + "; ".join(kaynak) + "\n\n🎨 Animasyon kodla üretilmiştir. Seslendirme yapay zekâ sesidir (Google Gemini), müzik ve efektler özgündür."
kart = {
    "kod": kod, "kanal": "NY", "platformlar": y.get("platformlar", ["youtube"]), "format": "Short",
    "seri": k.get("seri", "Nasıl Yapıldı"), "dil": "tr", "kategori": "27", "sentetik": True, "ekran_yazisi": "tasarim",
    "lisans": {"muzik": "özgün, kodla sentez (telif yok)", "gorsel": "kodla 3D (three.js); harita Natural Earth + geoBoundaries CC BY 4.0, yükselti AWS Terrain Tiles",
               "ses": f"Google Gemini TTS ({meta.get('ses', 'Charon')})", "font": "Montserrat (OFL)"},
    "uretim": {"arac": "Nasıl Yapıldı 3D motoru (video/ny)", "tarih": datetime.date.today().isoformat(), "oturum": "otomatik günlük üretim"},
    "ureten": "Claude", "yayin_zamani": "",
    "konu": k.get("baslik_bant", ""), "amac": y.get("amac", "Nasıl Yapıldı kısa video: merak uyandıran bilgi/soru, yorum etkileşimi"),
    "baslik": y.get("baslik") or k.get("baslik_bant", kod), "aciklama": aciklama,
    "etiketler": y.get("etiketler", ["türkiye", "bilgi", "shorts"]), "tiktok_metin": y.get("tiktok_metin", y.get("baslik", "")),
    "kaynaklar": kaynak, "kaynak_dosya": f"/opt/aesun/video_bekleyen/{kod}_kaynak.mp4",
}
json.dump(kart, open(out, "w"), ensure_ascii=False, indent=1)
print("kart", out)
