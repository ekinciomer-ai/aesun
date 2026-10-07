"""Antminer web (CGI) erişimi — aesun Pi betiklerinin ortak modülü.

Kimlik bilgisi koda yazılmaz: toplayıcının (altminer, ~/SAHA/antminer/antminer_panel.py) kullandığı
digest kimliği, onun http_query fonksiyonunun requests'e verdiği auth nesnesinden yakalanır.
Toplayıcının venv'i ile çalıştırılmalı:  ~/SAHA/antminer/venv/bin/python ...
"""
import json, sys
from pathlib import Path

SAHA = Path.home() / "SAHA/antminer"
sys.path.insert(0, str(SAHA))
import requests                                   # noqa: E402

_AUTH = None


def filo_auth():
    global _AUTH
    if _AUTH is not None:
        return _AUTH
    import antminer_panel as A                    # noqa: E402
    yak, eski_g, eski_p = {}, requests.get, requests.post
    def sahte(url, **k):
        yak["a"] = k.get("auth"); raise RuntimeError("yakalandi")
    requests.get = requests.post = sahte
    try:
        A.http_query("127.0.0.1", "x")
    except Exception:
        pass
    finally:
        requests.get, requests.post = eski_g, eski_p
    _AUTH = yak.get("a")
    return _AUTH


def cgi(ip, uc, govde=None, timeout=15, auth=None):
    """(http_kodu, json|metin|None). Ağ hatasında (-1, hata metni)."""
    url = f"http://{ip}/cgi-bin/{uc}"
    try:
        a = auth or filo_auth()
        r = (requests.post(url, auth=a, json=govde, timeout=timeout) if govde is not None
             else requests.get(url, auth=a, timeout=timeout))
    except Exception as e:
        return -1, str(e)[:120]
    t = r.text
    try:
        return r.status_code, json.loads(t.replace("\x00", ""))
    except Exception:
        return r.status_code, t[:300]


def ayar_saglam(c):
    """get_miner_conf sonucu kullanılabilir mi (havuz tanımlı)?"""
    return isinstance(c, dict) and bool(c.get("pools")) and any((p or {}).get("url") for p in c["pools"])
