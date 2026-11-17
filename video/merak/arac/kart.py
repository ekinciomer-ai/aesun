"""Kuyruktaki senaryodan Yükleme Yöneticisi teslim kartı yazar: python3 kart.py <senaryo.json> <cikti_klasoru>"""
import json, sys, os
S = json.load(open(sys.argv[1], encoding="utf-8")); Y = S["yayin"]; kod = S["kod"]
kart = {
    "kod": kod, "kanal": S.get("kanal", "KZ_TR"), "platformlar": S.get("platformlar", ["youtube"]), "format": "Short",
    "seri": "Merak Lab", "dil": "tr", "kategori": "27", "sentetik": True, "ekran_yazisi": "tasarim", "ureten": "Claude",
    "hedef_kitle": "Türkiye, 16-45, bilim/teknoloji/enerji meraklıları",
    "konu": S.get("konu") or Y["baslik"],
    "grup": "KZ_MRK",
    "amac": S.get("amac", "Merak Lab serisi: soru kancası + 3D mekanizma + adım adım hesap + net cevap (chionglab formatının Kozmos Lab uyarlaması). Ölçüt: izlemeyi seçme ≥%55, ortalama izleme ≥%70, yorum sayısı."),
    "baslik": Y["baslik"], "aciklama": Y["aciklama"], "etiketler": Y.get("etiketler", []),
    "kaynaklar": S["kaynaklar"],
    "lisans": {"muzik": "özgün, kodla sentez (numpy) atmosfer + efektler, telif yok",
               "gorsel": "kodla üretilmiş özgün 3D animasyon (three.js); gezegen dokuları kodla üretildi (kara maskesi: global-land-mask/GLOBE, kamu malı veri)",
               "ses": "Google TTS (gTTS, Türkçe), yapay zekâ sesi"},
    "kaynak_dosya": f"/opt/aesun/video_bekleyen/{kod}.mp4",
    "kaynak_url": f"https://raw.githubusercontent.com/ekinciomer-ai/aesun/video-onizleme/{kod}.mp4",
}
os.makedirs(sys.argv[2], exist_ok=True)
json.dump(kart, open(os.path.join(sys.argv[2], f"{kod}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("kart:", kod)
