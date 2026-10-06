"""Pi betiklerinin ortak yardımcıları (yalnız standart kütüphane).
Token: ~/.aesun/osos.env içindeki GITHUB_TOKEN (koda yazılmaz)."""
import base64, json, os, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/"
TR = timezone(timedelta(hours=3))
AESUN = Path.home() / ".aesun"


def log(*a):
    print(datetime.now(TR).strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)


def token():
    for f in (AESUN / "osos.env", Path.home() / "aesun/env.txt"):
        if f.exists():
            for s in f.read_text().splitlines():
                if s.startswith("GITHUB_TOKEN="):
                    return s.split("=", 1)[1].strip()
    return os.environ.get("GITHUB_TOKEN", "")


TOK = token()


def gh(yol, veri=None, sha=None, mesaj=None):
    """GitHub epias-ptf dosyası oku (veri=None) ya da yaz. Okuma (json, sha) döner; yoksa (None, None)."""
    h = {"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json", "User-Agent": "aesun-pi"}
    if veri is None:
        try:
            with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers=h), timeout=30) as r:
                m = json.loads(r.read())
            if m.get("content"):
                return json.loads(base64.b64decode(m["content"]).decode()), m["sha"]
            with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers={**h, "Accept": "application/vnd.github.raw+json"}), timeout=60) as r:
                return json.loads(r.read()), m["sha"]
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None, None
            raise
    govde = {"message": mesaj or ("aesun " + datetime.now(TR).strftime("%Y-%m-%d %H:%M")),
             "content": base64.b64encode(json.dumps(veri, ensure_ascii=False, indent=1).encode()).decode()}
    if sha:
        govde["sha"] = sha
    for deneme in range(2):
        try:
            r = urllib.request.Request(REPO + yol, data=json.dumps(govde).encode(), headers={**h, "Content-Type": "application/json"}, method="PUT")
            with urllib.request.urlopen(r, timeout=30) as y:
                return json.loads(y.read())
        except urllib.error.HTTPError as e:
            if e.code in (409, 422) and not deneme:   # sha eskimiş: tazele ve bir kez daha dene
                _, govde["sha"] = gh(yol)
                continue
            raise


def zaman(s):
    """ISO metni -> TR saat dilimli datetime (dilimsiz metin yerel/TR kabul edilir)."""
    t = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    return t.replace(tzinfo=TR) if t.tzinfo is None else t.astimezone(TR)
