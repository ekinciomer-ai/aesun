"""Büyüme Paketi (Kasım prime-time boşluklarını dolduran yüksek tutma oranlı Shorts üretim betiği).
Kullanım:
  python3 uret.py ses <ses_json_klasoru>           -> ElevenLabs ses istek JSON dosyalarını üretir
  python3 uret.py sahne <ham_gorsel> <ses_cikti> <render_out> -> Ambiyans + motor.py sahne JSON dosyalarını üretir
  python3 uret.py kuyruk <ham_gorsel> <render_out> <yt_kuyruk_out> -> YouTube yükleme kuyruğu paketini hazırlar
"""
import json, os, shutil, subprocess, sys

KOK = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(KOK, "icerik", "arac"))
import tr_sayi

VOICE_ID = "u2ZPme1hNaHzZRbw9S82"
TUM = [0.0, 0.0, 1.0, 1.0]

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bolumler import BOLUMLER as _TUM
_GRUP = os.environ.get("GRUP", "")
BOLUMLER = [b for b in _TUM if not _GRUP or b["grup"] == _GRUP]

NOTLAR = {
    "tr": "Not: Görseller kamu malı ya da serbest lisanslı fotoğraf/eserlerdir; seslendirme yapay zekâ ile yapılmıştır.",
    "en": "Note: images are public domain or freely licensed (Wikimedia Commons); narration uses an AI clone of my own voice.",
    "es": "Nota: las imágenes son obras y fotografías de dominio público o con licencia libre; la narración está generada con IA.",
}
SORULAR = {
    "tr": "Sen ne düşünüyorsun? Yorumlara yaz 👇",
    "en": "What do you think? Tell us in the comments 👇",
    "es": "¿Cuál de estas palabras usas más? Te leo en comentarios 👇",
}
ALT_BANT = {
    "tr": "Görseller: kamu malı / Wikimedia Commons · Ses: yapay zekâ ile klonlanmış ses",
    "en": "Images: public domain / Wikimedia Commons · Voice: AI clone",
    "es": "Imágenes: dominio público / Wikimedia Commons · Voz: clonada con IA",
}


def gorsel_bul(ham_dizin, ad):
    for ext in (".jpg", ".png", ".JPG", ".jpeg"):
        p = os.path.join(ham_dizin, ad + ext)
        if os.path.exists(p):
            return p
    return None


def ana():
    komut = sys.argv[1]

    if komut == "ses":
        hedef = sys.argv[2]
        os.makedirs(hedef, exist_ok=True)
        for b in BOLUMLER:
            kod_ses = f"{b['kod']}_SES"
            parcalar = []
            for i, satir in enumerate(b["metin"]):
                okunacak = tr_sayi.seslendir(satir) if b["dil"] == "tr" else satir
                parcalar.append({"ad": f"s{i + 1}", "metin": okunacak})
            istek = {
                "kod": kod_ses,
                "voice_id": b.get("voice", VOICE_ID),
                "model": "eleven_v3",
                "dil": b["dil"],
                "ayar": {"stability": 0.45, "similarity_boost": 0.9},
                "parcalar": parcalar,
            }
            with open(os.path.join(hedef, f"{kod_ses}.json"), "w", encoding="utf-8") as f:
                json.dump(istek, f, ensure_ascii=False, indent=1)
            print("ses istegi hazir:", kod_ses, len(parcalar), "parca")

    elif komut == "sahne":
        ham, ses_cikti, render_out = sys.argv[2], sys.argv[3], sys.argv[4]
        os.makedirs(render_out, exist_ok=True)
        amb_betik = os.path.join(KOK, "icerik", "arac", "ambiyans_uret.py")
        for b in BOLUMLER:
            amb_wav = os.path.abspath(os.path.join(render_out, f"amb_{b['ambiyans']}.wav"))
            if not os.path.exists(amb_wav):
                subprocess.run([sys.executable, amb_betik, amb_wav, "70", b["ambiyans"]], check=True)
            sahneler = []
            for sc in b["sahneler"]:
                yeni = dict(sc)
                g = gorsel_bul(ham, sc["img"])
                if g is None:  # görsel inmediyse aynı bölümün inen başka görseline düş
                    g = next((x for x in (gorsel_bul(ham, o["img"]) for o in b["sahneler"]) if x), None)
                    print("UYARI görsel yok, yedek kullanıldı:", sc["img"], "->", g)
                if g is None:
                    raise SystemExit(f"Görsel bulunamadı: {b['kod']}")
                yeni["img"] = os.path.abspath(g)
                sahneler.append(yeni)
            ses_dosyalari = [os.path.abspath(os.path.join(ses_cikti, f"{b['kod']}_SES__s{i + 1}.mp3")) for i in range(len(b["metin"]))]
            sj = {
                "kod": b["kod"],
                "dil": b["dil"],
                "format": "dikey",
                "metin": b["metin"],
                "ses": ses_dosyalari,
                "sahneler": sahneler,
                "muzik": amb_wav,
                "muzik_seviye": 0.09,
                "kanal": b["kanal_etiket"],
                "kapanis": b["kapanis"],
                "alt": ALT_BANT[b["dil"]],
                "cikti": os.path.abspath(os.path.join(render_out, f"{b['kod']}.mp4")),
            }
            sj_yol = os.path.join(render_out, f"{b['kod']}_sahne.json")
            with open(sj_yol, "w", encoding="utf-8") as f:
                json.dump(sj, f, ensure_ascii=False, indent=1)
            print("sahne hazir:", sj_yol)

    elif komut == "kuyruk":
        ham, render_out, kuyruk_out = sys.argv[2], sys.argv[3], sys.argv[4]
        os.makedirs(kuyruk_out, exist_ok=True)
        man = {}
        man_yol = os.path.join(ham, "manifest.json")
        if os.path.exists(man_yol):
            for d in json.load(open(man_yol, encoding="utf-8")).get("dosyalar", []):
                if "ad" in d and "lisans" in d:
                    man[os.path.splitext(d["ad"])[0]] = d
        for b in BOLUMLER:
            mp4 = os.path.join(render_out, f"{b['kod']}.mp4")
            if not os.path.exists(mp4):
                print("UYARI render yok:", mp4)
                continue
            kun, goruldu = [], set()
            for sc in b["sahneler"]:
                ad = sc["img"]
                if ad in goruldu or ad not in man:
                    continue
                goruldu.add(ad)
                d = man[ad]
                bas = d["baslik"].replace("File:", "").rsplit(".", 1)[0][:70]
                sanatci = f", {d['sanatci'][:50]}" if d.get("sanatci") and "CC" in d["lisans"] else ""
                kun.append(f"- {bas} ({d['lisans']}{sanatci}) {d.get('sayfa', '')}")
            dl = b["dil"]
            kb = {"tr": "Kaynaklar", "en": "Sources", "es": "Fuentes"}[dl]
            gk = {"tr": "Görsel künyeleri", "en": "Image credits", "es": "Créditos de imágenes"}[dl]
            kan_tag = {"TR": "#antikstüdyo #tablo #sanat #shorts", "KZ_TR": "#kozmoslab #uzay #astronomi #shorts", "KZ_EN": "#kozmoslab #space #astronomy #shorts", "EN": "#ancientstudio #arthistory #painting #shorts"}.get(b["kanal_kodu"], "#shorts")
            aciklama = (
                f"{b['govde']}\n\n{SORULAR[dl]}\n\n{kb}: {b['kaynak_metin']}\n\n{gk}:\n"
                + "\n".join(kun)
                + f"\n\n{NOTLAR[dl]}\n\n{kan_tag}"
            )
            kj = {
                "kod": b["kod"],
                "kanal": b["kanal_kodu"],
                "tur": "Short",
                "seri": b["seri"],
                "kategori": "28" if b["kanal_kodu"].startswith("KZ") else "27",
                "sentetik": True,
                "ust_bant_izinli": True,
                "ureten": "Claude",
                "publishAt": b["publishAt"],
                "baslik": b["baslik"],
                "aciklama": aciklama[:4900],
                "etiketler": b["etiketler"],
                "kaynaklar": [x[2:] for x in kun],
                "muzik_lisans": "Kanal üretimi özgün atmosferik ambiyans (telifsiz, matematiksel sentez - ambiyans_uret.py)",
            }
            with open(os.path.join(kuyruk_out, f"{b['kod']}.json"), "w", encoding="utf-8") as f:
                json.dump(kj, f, ensure_ascii=False, indent=1)
            shutil.copy(mp4, os.path.join(kuyruk_out, f"{b['kod']}.mp4"))
            kapak = mp4[:-4] + ".jpg"
            if os.path.exists(kapak):
                shutil.copy(kapak, os.path.join(kuyruk_out, f"{b['kod']}.jpg"))
            print("kuyruga hazir:", b["kod"], os.path.getsize(mp4) // 1024, "KB", b["publishAt"])


if __name__ == "__main__":
    ana()
