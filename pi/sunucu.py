"""Aksaray Enerji sunucusu (portal.aksarayenerji.net) veri deposu istemcisi — yalnız standart kütüphane.

Ayarlar ~/.aesun/osos.env içinde (koda yazılmaz):
  AE_SUNUCU_ANAHTAR=...   toplayıcı anahtarı (yoksa sunucu kullanılmaz, eski davranış sürer)
  AE_KAYNAK=github        (varsayılan) GitHub ana kaynak; her yazım sunucuya da kopyalanır
  AE_KAYNAK=sunucu        okuma/yazma yalnız sunucu (GitHub devre dışı)
"""
import json, os, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ADRES = os.environ.get("AE_SUNUCU_ADRES", "https://portal.aksarayenerji.net/api/veri.php")
_AYAR = None


def ayar(ad, vars_=""):
    global _AYAR
    if _AYAR is None:
        _AYAR = {}
        for f in (Path.home() / ".aesun" / "osos.env", Path.home() / "aesun" / "env.txt"):
            if f.exists():
                for s in f.read_text(encoding="utf-8-sig").splitlines():
                    if "=" in s and not s.lstrip().startswith("#"):
                        k, v = s.split("=", 1)
                        _AYAR.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return os.environ.get(ad) or _AYAR.get(ad, vars_)


def anahtar():
    return ayar("AE_SUNUCU_ANAHTAR")


def yalniz_sunucu():
    """True: GitHub hiç kullanılmaz."""
    return bool(anahtar()) and ayar("AE_KAYNAK", "github").lower() == "sunucu"


def _istek(a, yol, govde=None):
    url = ADRES + "?" + urllib.parse.urlencode({"a": a, "yol": yol})
    h = {"X-AE-Anahtar": anahtar(), "User-Agent": "aesun-pi", "Accept": "application/json"}
    if govde is not None:
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=govde, headers=h, method="POST" if govde is not None else "GET")
    with urllib.request.urlopen(r, timeout=60) as y:
        return y.read()


def oku(yol):
    """Sunucudaki JSON dosyası; yoksa None."""
    try:
        return json.loads(_istek("oku", yol))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def yaz(yol, veri, zorunlu=False):
    """JSON'u sunucuya yazar. zorunlu=False iken hata yalnız günlüğe düşer (GitHub akışı bozulmaz)."""
    if not anahtar():
        if zorunlu:
            raise RuntimeError("AE_SUNUCU_ANAHTAR yok (~/.aesun/osos.env)")
        return False
    try:
        _istek("yaz", yol, json.dumps(veri, ensure_ascii=False, separators=(",", ":")).encode())
        return True
    except Exception as e:
        if zorunlu:
            raise
        print("sunucuya yazılamadı:", yol, e, flush=True)
        return False
