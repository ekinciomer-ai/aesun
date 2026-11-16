"""Seri Kasım 5 (17 Kas 2026, Ömer: bilgi videosu yerine "biz çizelim, komik olsun"). "Mona Lisa'ya kaş çizdik" kalıbı.
Yayın saatini Yükleme Yöneticisi belirler. Her satır: (metin, görsel_adı, [küçük, büyük, büyük2])."""
import importlib.util, os
_s = importlib.util.spec_from_file_location("taslak_bolumler", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "seri_taslak", "bolumler.py"))
_m = importlib.util.module_from_spec(_s); _s.loader.exec_module(_m)
B, UGUR = _m.B, _m.UGUR

BOLUMLER = [
    B("AS_TB_SUTCU_CIZDIK", "tablo", "tr", "TR", "Tablo Serisi", "2026-11-23T18:00:00+03:00",
      "Vermeer'in sildiklerini geri çizdik 🫖🖼️ #shorts",
      "Vermeer Sütçü Kız'dan bir testi askısıyla bir sepeti silmiş (Rijksmuseum, 2022). Biz geri çizdik... sonra biraz abarttık. Sence hangisi daha güzel?",
      ["sütçü kız", "vermeer", "tablo", "sanat", "mizah", "çay", "simit", "antik stüdyo", "shorts"],
      "Rijksmuseum, 8 Eylül 2022 açıklaması: Sütçü Kız'da boyanın altında testi askısı ve söğüt dalından sepet bulundu. Eski hâl ve 'bizim evde' hâli yapay zekâ ile yapılmış mizahi canlandırmadır.",
      [("Vermeer bu tablodan iki şey sildi. Biz geri çizdik!", "vermeer_sutcu", ["SÜTÇÜ KIZ", "SİLİNENİ", "GERİ ÇİZDİK"]),
       ("Önce duvara testi askısını astık. Vermeer çok kalabalık olur diye silmiş.", "vermeer_eski", ["1. ADIM", "TESTİ", "ASKISI"]),
       ("Sonra yere söğüt sepetini koyduk.", "vermeer_eski", ["2. ADIM", "SÖĞÜT", "SEPET"]),
       ("Madem başladık... bir de bizim evdeki gibi yapalım.", "vermeer_turk", ["3. ADIM", "BİZİM", "EVDE OLSA"]),
       ("Süt yerine demli çay, ekmek yerine simit, köşede semaver.", "vermeer_turk", ["SÜT YERİNE", "DEMLİ", "ÇAY"]),
       ("Sence hangisi daha güzel: Vermeer'inki mi, bizimki mi? Yorumlara yaz!", "vermeer_turk", ["SENCE?", "VERMEER", "Mİ BİZ Mİ?"])],
      voice=UGUR, kanal_etiket="ANTİK STÜDYO"),
]
_V = [([0.0, 0.0, 1.0, 1.0], [0.15, 0.0, 0.9, 1.0]),
      ([0.45, 0.0, 1.0, 0.75], [0.55, 0.05, 1.0, 0.6]),
      ([0.35, 0.35, 1.0, 1.0], [0.55, 0.55, 1.0, 1.0]),
      ([0.0, 0.0, 1.0, 1.0], [0.15, 0.0, 0.9, 1.0]),
      ([0.1, 0.35, 0.6, 0.85], [0.6, 0.6, 1.0, 1.0]),
      ([0.0, 0.0, 1.0, 1.0], [0.0, 0.0, 1.0, 1.0])]
for _i, _sc in enumerate(BOLUMLER[0]["sahneler"]):
    _sc["odak"], _sc["odak2"] = _V[_i]
