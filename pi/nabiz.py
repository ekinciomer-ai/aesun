#!/usr/bin/env python3
"""Pi nabzı: durumu GitHub epias-ptf/n8n/pi_nabiz.json'a yazar (n8n kredisi harcamaz).
n8n Ana döngü her turda bu dosyayı okuyup aesun_nabiz tablosuna işler.
Yerel panel için GitHub'daki n8n/aesun_son.json önbelleğe alınır.
Yalnız standart kütüphane kullanır. Token: ~/.aesun/osos.env içindeki GITHUB_TOKEN."""
import base64, json, os, socket, subprocess, sys, urllib.error, urllib.request
from datetime import datetime, timezone
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import sunucu  # noqa: E402
REPO = "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/"
DOSYA = "n8n/pi_nabiz.json"


def env_oku():
    env = {}
    for f in (Path.home() / ".aesun/osos.env", KOK / "env.txt", KOK / ".env"):
        if f.exists():
            for s in f.read_text().splitlines():
                if "=" in s and not s.lstrip().startswith("#"):
                    k, v = s.split("=", 1)
                    env.setdefault(k.strip(), v.strip().strip('"'))
    env.update({k: v for k, v in os.environ.items() if k.startswith(("AESUN_", "GITHUB_"))})
    return env


def komut(*a):
    try:
        return subprocess.run(a, capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ""


def servisler(env):
    sv = {}
    # Eski systemd zamanlayıcıları (aesun-*.timer) artık kullanılmıyor; crontab ile çalışan işler aşağıda.
    for s in env.get("AESUN_SERVISLER", "altminer").replace("osos", "").split() or ["altminer"]:
        if not s.startswith("aesun-"):
            sv[s] = komut("systemctl", "is-active", s) or "unknown"
    if not sv:
        sv["altminer"] = komut("systemctl", "is-active", "altminer") or "unknown"
    cr = komut("crontab", "-l")
    for ad, iz in (("osos", "osos_toplayici.py"), ("fusionsolar", "fusionsolar_toplayici.py")):
        if iz in cr:
            sv[ad] = "active" if ad == "osos" else ("active" if komut("pgrep", "-f", iz) else "inactive")
    return sv


def ag_sayac():
    """Arayüz başına toplam alınan/gönderilen bayt (/proc/net/dev, açılıştan beri) — Denetçi 'Veri Akışı' ölçümü."""
    try:
        arayuz = {}
        for s in Path("/proc/net/dev").read_text().splitlines()[2:]:
            ad, veri = s.split(":", 1)
            ad, a = ad.strip(), veri.split()
            if ad == "lo" or ad.startswith(("docker", "veth", "br-")):
                continue
            arayuz[ad] = {"rx": int(a[0]), "tx": int(a[8])}
        varsayilan = ""
        for s in Path("/proc/net/route").read_text().splitlines()[1:]:
            a = s.split()
            if len(a) > 2 and a[1] == "00000000":
                varsayilan = a[0]
                break
        acilis = float(Path("/proc/uptime").read_text().split()[0])
        return {"t": int(datetime.now(timezone.utc).timestamp()), "acilis_sn": int(acilis),
                "varsayilan": varsayilan, "arayuz": arayuz}
    except Exception as e:
        return {"hata": str(e)[:120]}


def kapasite():
    """Pi depolama/bellek kapasitesi — Denetçi 'Veri Akışı → Kapasite' kartı ve SD kart büyütme kararı için."""
    import shutil
    k = {}
    try:
        du = shutil.disk_usage("/")
        k["disk"] = {"toplam": du.total, "dolu": du.used, "bos": du.free}
    except Exception as e:
        k["disk_hata"] = str(e)[:80]
    try:
        mi = {a.split(":")[0]: int(a.split()[1]) * 1024 for a in Path("/proc/meminfo").read_text().splitlines() if a.split()[1:]}
        k["ram"] = {"toplam": mi.get("MemTotal"), "bos": mi.get("MemAvailable"), "takas_toplam": mi.get("SwapTotal"), "takas_bos": mi.get("SwapFree")}
    except Exception:
        pass
    try:   # SD kartın fiziksel boyutu (bölüm büyütülmemişse disk toplamından büyük olabilir)
        for b in ("mmcblk0", "sda", "nvme0n1"):
            f = Path(f"/sys/block/{b}/size")
            if f.exists():
                k["kart"] = {"ad": b, "boyut": int(f.read_text()) * 512}
                break
    except Exception:
        pass
    try:   # yerel veri klasörleri (her nabızda değil, saatte bir — du pahalı olabilir)
        ob = KOK / "onbellek" / "klasor_boyut.json"
        eski = json.loads(ob.read_text()) if ob.exists() else {}
        if datetime.now(timezone.utc).timestamp() - eski.get("t", 0) > 3600:
            kl = {}
            for ad, yol in (("aesun", KOK), ("SAHA", Path.home() / "SAHA"), ("log", Path("/var/log"))):
                if yol.exists():
                    c = komut("du", "-sb", str(yol))
                    if c.split() and c.split()[0].isdigit():
                        kl[ad] = int(c.split()[0])
            eski = {"t": int(datetime.now(timezone.utc).timestamp()), "klasor": kl}
            ob.parent.mkdir(parents=True, exist_ok=True)
            ob.write_text(json.dumps(eski))
        k["klasor"] = eski.get("klasor", {})
    except Exception:
        pass
    k["yuk"] = (komut("cat", "/proc/loadavg").split() or ["?"])[0]
    return k


def son_satir(yol):
    try:
        return [s for s in Path(yol).read_text(errors="ignore").splitlines() if s.strip()][-1][:160]
    except Exception:
        return ""


def istek(url, token, veri=None, metot="GET"):
    h = {"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "User-Agent": "aesun-pi"}
    r = urllib.request.Request(url, data=json.dumps(veri).encode() if veri else None, headers=h, method=metot)
    with urllib.request.urlopen(r, timeout=30) as y:
        return json.loads(y.read() or b"{}")


def main():
    env = env_oku()
    token = env.get("GITHUB_TOKEN", "")
    if not token and not sunucu.yalniz_sunucu():
        sys.exit("GITHUB_TOKEN yok (~/.aesun/osos.env)")
    try:
        disk = komut("df", "-h", "/").splitlines()[1].split()[4]
    except Exception:
        disk = "?"
    try:
        isi = round(int(Path("/sys/class/thermal/thermal_zone0/temp").read_text()) / 1000)
    except Exception:
        isi = "?"
    govde = {
        "cihaz": "saha-pi",
        "son_ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "servisler": servisler(env),
        "not_": f"{socket.gethostname()} disk {disk}, CPU {isi}°C, {komut('uptime', '-p')}"[:300],
        "osos_son": son_satir(KOK / "osos.log"),
        # sürüm bekçisi (n8n Denetçi): Pi'deki aesun kodunun sürümü ve zamanı
        "kod_sha": komut("git", "-C", str(KOK), "rev-parse", "--short=10", "HEAD"),
        "kod_zaman": komut("git", "-C", str(KOK), "log", "-1", "--format=%cI"),
        "ag": ag_sayac(),
        "kapasite": kapasite(),
    }
    icerik = base64.b64encode(json.dumps(govde, ensure_ascii=False, indent=1).encode()).decode()
    for deneme in range(0 if sunucu.yalniz_sunucu() else 2):
        sha = None
        try:
            sha = istek(REPO + DOSYA, token).get("sha")
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
        v = {"message": "Pi nabız " + govde["son_ts"][:16], "content": icerik}
        if sha:
            v["sha"] = sha
        try:
            istek(REPO + DOSYA, token, v, "PUT")
            print("nabız yazıldı", govde["son_ts"])
            break
        except urllib.error.HTTPError as e:
            if e.code not in (409, 422) or deneme:
                raise
    if sunucu.yaz(DOSYA, govde, zorunlu=sunucu.yalniz_sunucu()):
        print("nabız sunucuya yazıldı")
    # Yerel panel önbelleği
    ob = Path(env.get("AESUN_ONBELLEK", KOK / "onbellek"))
    ob.mkdir(parents=True, exist_ok=True)
    try:
        if sunucu.anahtar():
            (ob / "son.json").write_text(json.dumps(sunucu.oku("n8n/aesun_son.json"), ensure_ascii=False))
            (ob / "kaynak.txt").write_text("sunucu\n")
        else:
            with urllib.request.urlopen("https://raw.githubusercontent.com/ekinciomer-ai/epias-ptf/main/n8n/aesun_son.json", timeout=30) as y:
                (ob / "son.json").write_bytes(y.read())
            (ob / "kaynak.txt").write_text("github\n")
    except Exception as e:
        (ob / "kaynak.txt").write_text("yok\n")
        print("aesun_son okunamadı:", e)


if __name__ == "__main__":
    main()
