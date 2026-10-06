#!/usr/bin/env python3
"""Pi nabzı: durumu GitHub epias-ptf/n8n/pi_nabiz.json'a yazar (n8n kredisi harcamaz).
n8n Ana döngü her turda bu dosyayı okuyup aesun_nabiz tablosuna işler.
Yerel panel için GitHub'daki n8n/aesun_son.json önbelleğe alınır.
Yalnız standart kütüphane kullanır. Token: ~/.aesun/osos.env içindeki GITHUB_TOKEN."""
import base64, json, os, socket, subprocess, sys, urllib.error, urllib.request
from datetime import datetime, timezone
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
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
    for s in env.get("AESUN_SERVISLER", "altminer").split():
        sv[s] = komut("systemctl", "is-active", s) or "unknown"
    cr = komut("crontab", "-l")
    for ad, iz in (("osos", "osos_toplayici.py"), ("fusionsolar", "fusionsolar_toplayici.py")):
        if iz in cr:
            sv[ad] = "active" if ad == "osos" else ("active" if komut("pgrep", "-f", iz) else "inactive")
    return sv


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
    if not token:
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
    }
    icerik = base64.b64encode(json.dumps(govde, ensure_ascii=False, indent=1).encode()).decode()
    for deneme in range(2):
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
    # Yerel panel önbelleği
    ob = Path(env.get("AESUN_ONBELLEK", KOK / "onbellek"))
    ob.mkdir(parents=True, exist_ok=True)
    try:
        with urllib.request.urlopen("https://raw.githubusercontent.com/ekinciomer-ai/epias-ptf/main/n8n/aesun_son.json", timeout=30) as y:
            (ob / "son.json").write_bytes(y.read())
        (ob / "kaynak.txt").write_text("github\n")
    except Exception as e:
        (ob / "kaynak.txt").write_text("yok\n")
        print("aesun_son okunamadı:", e)


if __name__ == "__main__":
    main()
