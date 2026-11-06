#!/usr/bin/env python3
"""Sosyal Stüdyo araç işçisi (sunucuda, kapsayıcı dışında; systemd zamanlayıcısıyla dakikada bir).

Kuyruk: /opt/sosyal/kuyruk/bekleyen/<id>.json  →  cikti/<id>/durum.json (+ ses.mp3 / video.mp4 / kaynaklar.json / kalite.json)
Tampon araçları (GitHub'dan alınıp yalıtılmış kapsayıcılarda duran):
  - Piper (tr_TR-fahrettin, CC0)         : tampon-ses:1 imajı, /opt/tampon/ses/onbellek
  - Chatterbox Multilingual (MIT)        : tampon-ses:1 imajı (TR/EN/ES, yavaş)
  - Wikimedia Commons görselleri         : /opt/aesun/motor/commons_gorsel.py (yalnız serbest lisans, yazılı görsel elenir)
  - MoneyPrinterTurbo (MIT)              : tampon-mpt, 127.0.0.1:8180 (Edge ses + altyazı + yakınlaşma, 9:16)
  - Kalite kapısı                        : /opt/aesun/kalite_kapisi.py (engel varsa video gösterilmez)
Sır okumaz, port açmaz. Aynı anda tek iş (kilit dosyası).
"""
import fcntl
import glob
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def zaman():
    """Saat dilimiyle (UTC) ISO zaman; ekran Türkiye saatine çevirir."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

KUYRUK = Path(os.getenv("SOSYAL_KUYRUK_HOST", "/opt/sosyal/kuyruk"))
SES_KOK = Path("/opt/tampon/ses")
SES_IMAJ = "tampon-ses:1"
MPT_REPO = Path("/opt/tampon/mpt/repo")
MPT_API = "http://127.0.0.1:8180/api/v1"
COMMONS = "/opt/aesun/motor/commons_gorsel.py"
KALITE = "/opt/aesun/kalite_kapisi.py"
EDGE_SES = {"tr": "tr-TR-AhmetNeural-Male", "en": "en-US-GuyNeural-Male", "es": "es-ES-AlvaroNeural-Male"}
PIPER_TR = ("tr_TR-fahrettin-medium", "tr/tr_TR/fahrettin/medium/tr_TR-fahrettin-medium")
PIPER_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/"


def calis(komut, sure=1800):
    r = subprocess.run(komut, capture_output=True, text=True, timeout=sure)
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout)[-400:])
    return r.stdout


def docker_ses(betik, girdi_klasor):
    """tampon-ses imajında yalıtılmış çalıştırır: --rm, ağ yalnız model indirmek için, yetkisiz kullanıcı."""
    bellek = min(8192, int(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2 / 1e6))
    calis(["docker", "run", "--rm", "--memory", f"{bellek}m", "--cpus", str(max(1, (os.cpu_count() or 2) // 2)),
           "--pids-limit", "512", "--security-opt", "no-new-privileges", "--cap-drop", "ALL",
           "-e", "HF_HOME=/work/onbellek", "-v", f"{SES_KOK}/onbellek:/work/onbellek",
           "-v", f"{girdi_klasor}:/work/is", SES_IMAJ, "python", "-c", betik], sure=2400)


def ses_uret(j, klasor: Path):
    (klasor / "metin.txt").write_text(j["metin"], encoding="utf-8")
    os.chmod(klasor, 0o777)
    motor = j.get("ses") or ("piper" if j.get("dil") == "tr" else "chatterbox")
    if motor == "piper":
        if j.get("dil") != "tr":
            raise RuntimeError("Piper yalnız Türkçe için (CC0 lisanslı ses). EN/ES için chatterbox seçin.")
        ad, yol = PIPER_TR
        model = SES_KOK / "onbellek" / f"{ad}.onnx"
        for uz in ("", ".json"):
            if not Path(str(model) + uz).exists():
                urllib.request.urlretrieve(PIPER_URL + yol + ".onnx" + uz, str(model) + uz)
        betik = (f"import subprocess;subprocess.run(['python','-m','piper','-m','/work/onbellek/{ad}.onnx','-f',"
                 "'/work/is/ses.wav','--',open('/work/is/metin.txt',encoding='utf-8').read()],check=True)")
        lisans = "Piper tr_TR-fahrettin-medium (CC0)"
    else:
        betik = ("import re,torch,torchaudio\nfrom chatterbox.mtl_tts import ChatterboxMultilingualTTS\n"
                 "m=ChatterboxMultilingualTTS.from_pretrained(device='cpu');p=[]\n"
                 "t=open('/work/is/metin.txt',encoding='utf-8').read()\n"
                 "for c in [x.strip() for x in re.split(r'(?<=[.?!])\\s+',t) if x.strip()]:\n"
                 " with torch.inference_mode(): p.append(m.generate(c,language_id='" + j.get("dil", "tr") + "'))\n"
                 " p.append(torch.zeros(1,int(m.sr*0.25)))\n"
                 "torchaudio.save('/work/is/ses.wav',torch.cat(p,dim=1),m.sr)")
        lisans = "Chatterbox Multilingual (MIT), sentetik ses"
    docker_ses(betik, klasor)
    calis(["ffmpeg", "-loglevel", "error", "-y", "-i", str(klasor / "ses.wav"), "-af", "loudnorm=I=-16:TP=-1.5",
           "-b:a", "128k", str(klasor / "ses.mp3")])
    (klasor / "ses.wav").unlink(missing_ok=True)
    return {"dosyalar": ["ses.mp3"], "lisans": lisans, "kalite": {"gecti": True, "engel": [], "uyari": []}}


def _post(yol, govde):
    r = urllib.request.Request(f"{MPT_API}/{yol}", data=json.dumps(govde).encode(),
                               headers={"Content-Type": "application/json"}, method="POST")
    return json.load(urllib.request.urlopen(r, timeout=180))


def video_uret(j, klasor: Path):
    is_ad = "sosyal_" + j["id"]
    gorsel = MPT_REPO / "storage" / "local_videos" / is_ad
    terimler = [t for t in j.get("terimler", []) if t][:12] or [j["konu"]]
    calis([sys.executable, COMMONS, str(gorsel), *terimler], sure=900)
    resimler = sorted(glob.glob(str(gorsel / "g*.png")))
    if len(resimler) < 3:
        raise RuntimeError(f"Wikimedia'da yeterli serbest lisanslı görsel bulunamadı ({len(resimler)}).")
    mat = [{"provider": "local", "url": f"/MoneyPrinterTurbo/storage/local_videos/{is_ad}/{Path(x).name}"}
           for x in resimler]
    govde = {"video_subject": j["konu"], "video_script": j["metin"], "video_source": "local", "video_materials": mat,
             "video_concat_mode": "sequential", "image_motion": "zoom", "video_language": j.get("dil", "tr"),
             "video_aspect": "9:16", "voice_name": EDGE_SES.get(j.get("dil"), EDGE_SES["tr"]), "bgm_type": "",
             "subtitle_enabled": True, "font_name": "BeVietnamPro-Bold.ttf", "font_size": 58, "stroke_width": 2.5,
             "video_clip_duration": 4, "video_count": 1, "n_threads": 2}
    gorev = (_post("videos", govde).get("data") or {}).get("task_id")
    if not gorev:
        raise RuntimeError("MoneyPrinterTurbo görevi başlatmadı.")
    for _ in range(120):
        d = json.load(urllib.request.urlopen(f"{MPT_API}/tasks/{gorev}", timeout=20)).get("data") or {}
        if d.get("state") in (1, -1):
            break
        time.sleep(10)
    mp4 = MPT_REPO / "storage" / "tasks" / gorev / "final-1.mp4"
    if not mp4.exists():
        raise RuntimeError("Video üretilemedi (MoneyPrinterTurbo).")
    shutil.copy(mp4, klasor / "video.mp4")
    shutil.copy(gorsel / "kaynaklar.json", klasor / "kaynaklar.json")
    kayit = klasor / "kayit.json"
    kayit.write_text(json.dumps({"sentetik": True, "kaynaklar": json.load(open(gorsel / "kaynaklar.json"))}))
    r = subprocess.run([sys.executable, KALITE, str(klasor / "video.mp4"), str(kayit)],
                       capture_output=True, text=True, timeout=900)
    try:
        kalite = json.loads(r.stdout)
    except json.JSONDecodeError:
        kalite = {"gecti": False, "engel": ["Kalite kapısı çalışmadı: " + (r.stderr or "")[-200:]], "uyari": []}
    dosyalar = ["video.mp4", "kaynaklar.json"]
    if not kalite.get("gecti"):
        (klasor / "video.mp4").unlink(missing_ok=True)  # kapıdan geçmeyen video saklanmaz, gösterilmez
        dosyalar = ["kaynaklar.json"]
    return {"dosyalar": dosyalar, "kalite": kalite, "mpt_gorev": gorev,
            "lisans": f"Ses: Microsoft Edge ({govde['voice_name']}), görseller: Wikimedia Commons (kaynaklar.json)"}


def araclar():
    """Hangi tampon aracı hazır: programın Araçlar ekranında gösterilir."""
    def imaj(ad):
        return subprocess.run(["docker", "image", "inspect", ad], capture_output=True).returncode == 0
    try:
        mpt = urllib.request.urlopen("http://127.0.0.1:8180/docs", timeout=5).status == 200
    except Exception:
        mpt = False
    return {"zaman": zaman(),
            "piper": imaj(SES_IMAJ), "chatterbox": imaj(SES_IMAJ), "mpt": mpt,
            "commons": os.path.exists(COMMONS), "kalite": os.path.exists(KALITE),
            "ffmpeg": shutil.which("ffmpeg") is not None}


def yaz(yol: Path, veri):
    gecici = yol.with_suffix(".tmp")
    gecici.write_text(json.dumps(veri, ensure_ascii=False, indent=1), encoding="utf-8")
    os.chmod(gecici, 0o644)
    gecici.replace(yol)


def bir_tur():
    for d in ("bekleyen", "cikti"):
        (KUYRUK / d).mkdir(parents=True, exist_ok=True)
    yaz(KUYRUK / "araclar.json", araclar())
    for dosya in sorted((KUYRUK / "bekleyen").glob("*.json")):
        try:
            j = json.loads(dosya.read_text(encoding="utf-8"))
            if not str(j.get("id", "")).replace("_", "").isalnum():
                raise ValueError("geçersiz iş kimliği")
            if j.get("dil") not in EDGE_SES or j.get("tur") not in ("ses", "video"):
                raise ValueError("geçersiz dil ya da iş türü")
        except Exception as e:
            dosya.rename(dosya.with_suffix(".bozuk"))
            print("bozuk iş:", dosya.name, e)
            continue
        klasor = KUYRUK / "cikti" / j["id"]
        klasor.mkdir(parents=True, exist_ok=True)
        yaz(klasor / "durum.json", {"durum": "isleniyor", "basla": zaman()})
        dosya.replace(klasor / "is.json")  # iş kaybolmaz, çıktının yanında saklanır
        t = time.time()
        try:
            sonuc = (video_uret if j.get("tur") == "video" else ses_uret)(j, klasor)
            sonuc.update(durum="bitti", sure_sn=round(time.time() - t))
        except Exception as e:
            sonuc = {"durum": "hata", "mesaj": str(e)[:400], "sure_sn": round(time.time() - t)}
        for f in klasor.iterdir():
            os.chmod(f, 0o644)
        yaz(klasor / "durum.json", sonuc)
        print(j["id"], sonuc["durum"])


if __name__ == "__main__":
    KUYRUK.mkdir(parents=True, exist_ok=True)
    with open(KUYRUK / ".kilit", "w") as k:
        try:
            fcntl.flock(k, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            sys.exit(0)  # önceki tur sürüyor
        bir_tur()
