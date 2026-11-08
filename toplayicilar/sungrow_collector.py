#!/usr/bin/env python3
"""
aesun — Sungrow iSolarCloud veri toplayıcı (OpenAPI, EU gateway)

Tarayıcı oturumundan bağımsız çalışır: appkey + secret + hesap bilgisiyle
kendisi login olur, token'ı saklar, süresi dolunca yeniden alır ve her
POLL_SECONDS saniyede bir santral + inverter verilerini SQLite'a yazar.

Ortam değişkenleri (.env):
  SUNGROW_APPKEY        Developer portal > Applications > appkey
  SUNGROW_SECRET        Developer portal > Applications > secret key (x-access-key)
  SUNGROW_USER          iSolarCloud kullanıcı adı
  SUNGROW_PASSWORD      iSolarCloud şifresi
  SUNGROW_RSA_PUBLIC    (opsiyonel) Uygulamada şifreleme açıksa portal'daki RSA public key
  SUNGROW_HOST          varsayılan https://gateway.isolarcloud.eu
  AESUN_DB              varsayılan ./aesun_sungrow.db
  POLL_SECONDS          varsayılan 300

Kullanım:
  python sungrow_collector.py --once      # tek tur topla, çık
  python sungrow_collector.py             # sürekli döngü (systemd ile)
  python sungrow_collector.py --list      # erişilen santralleri yazdır
"""
from __future__ import annotations

import argparse
import base64
import json
import logging
import os
import random
import sqlite3
import string
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

log = logging.getLogger("aesun.sungrow")


def _env_yukle():
    """Repo kokundeki .env (veya env.txt) dosyasini (varsa) ortam degiskenlerine yukler. Mevcut degiskenleri ezmez."""
    kok = Path(__file__).resolve().parent.parent
    adaylar = [d / ad for d in (Path.cwd(), kok) for ad in (".env", "env.txt", ".env.txt")]
    for yol in adaylar:
        if not yol.is_file():
            continue
        for satir in yol.read_text(encoding="utf-8").splitlines():
            satir = satir.strip()
            if not satir or satir.startswith("#") or "=" not in satir:
                continue
            k, v = satir.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        return


_env_yukle()

HOST = os.getenv("SUNGROW_HOST", "https://gateway.isolarcloud.eu").rstrip("/")
APPKEY = os.getenv("SUNGROW_APPKEY", "")
SECRET = os.getenv("SUNGROW_SECRET", "")
USER = os.getenv("SUNGROW_USER", "")
PASSWORD = os.getenv("SUNGROW_PASSWORD", "")
RSA_PUBLIC = os.getenv("SUNGROW_RSA_PUBLIC", "").strip()
DB_PATH = os.getenv("AESUN_DB", "aesun_sungrow.db")
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "300"))
TOKEN_FILE = Path(os.getenv("SUNGROW_TOKEN_FILE", ".sungrow_token.json"))
# Takip edilmeyecek santraller (ps_id). Akbulut GES (5052814) bize ait degil.
HARIC_PS = {"5052814"} | {x.strip() for x in os.getenv("SUNGROW_HARIC", "").split(",") if x.strip()}

# Santral (device_type 11) ölçüm noktaları
PLANT_POINTS = {
    "83033": ("power_w", "Anlık güç (W)"),
    "83022": ("daily_yield_wh", "Günlük üretim (Wh)"),
    "83024": ("total_yield_wh", "Toplam üretim (Wh)"),
    "83025": ("equiv_hours", "Eşdeğer saat"),
    "83023": ("pr", "PR"),
    "83012": ("irradiance_wm2", "Işınım (W/m²)"),
    "83013": ("daily_irradiation_whm2", "Günlük ışınım (Wh/m²)"),
    "83016": ("ambient_temp_c", "Ortam sıcaklığı"),
    "83017": ("module_temp_c", "Modül sıcaklığı"),
    "83072": ("feed_in_today_wh", "Bugün şebekeye verilen (Wh)"),
    "83102": ("purchased_today_wh", "Bugün şebekeden alınan (Wh)"),
}
# Inverter (device_type 1) ölçüm noktaları
INVERTER_POINTS = {
    "24": ("active_power_w", "Aktif güç"),
    "1": ("daily_yield_wh", "Günlük üretim"),
    "2": ("total_yield_wh", "Toplam üretim"),
    "4": ("internal_temp_c", "İç sıcaklık"),
}

TOKEN_ERRORS = {"E00003", "E900", "E00000", "er_token_login_invalid"}


# ---------------------------------------------------------------- şifreleme
def _rand(n: int) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=n))


def _aes_encrypt(text: str, key: str) -> str:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives.padding import PKCS7
    k = key.encode().ljust(16)[:16]
    p = PKCS7(128).padder()
    data = p.update(text.encode()) + p.finalize()
    enc = Cipher(algorithms.AES(k), modes.ECB()).encryptor()
    return (enc.update(data) + enc.finalize()).hex().upper()


def _aes_decrypt(hex_text: str, key: str) -> str:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives.padding import PKCS7
    k = key.encode().ljust(16)[:16]
    dec = Cipher(algorithms.AES(k), modes.ECB()).decryptor()
    raw = dec.update(bytes.fromhex(hex_text)) + dec.finalize()
    u = PKCS7(128).unpadder()
    return (u.update(raw) + u.finalize()).decode()


def _rsa_encrypt(text: str, pub_b64: str) -> str:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    pad = "=" * (-len(pub_b64) % 4)
    key = serialization.load_der_public_key(base64.urlsafe_b64decode(pub_b64 + pad))
    chunk = key.key_size // 8 - 11
    data = text.encode()
    out = b"".join(key.encrypt(data[i:i + chunk], padding.PKCS1v15())
                   for i in range(0, len(data), chunk))
    return base64.urlsafe_b64encode(out).decode()


# ---------------------------------------------------------------- istemci
class SungrowError(RuntimeError):
    def __init__(self, code: str, msg: str):
        super().__init__(f"{code}: {msg}")
        self.code = code


class SungrowClient:
    def __init__(self):
        missing = [n for n, v in [("SUNGROW_APPKEY", APPKEY), ("SUNGROW_SECRET", SECRET),
                                  ("SUNGROW_USER", USER), ("SUNGROW_PASSWORD", PASSWORD)] if not v]
        if missing:
            raise SystemExit(f"Eksik ortam değişkeni: {', '.join(missing)}")
        self.s = requests.Session()
        self.token = self._load_token()

    # token önbelleği
    def _load_token(self) -> str | None:
        try:
            return json.loads(TOKEN_FILE.read_text()).get("token")
        except Exception:
            return None

    def _save_token(self, token: str):
        TOKEN_FILE.write_text(json.dumps({"token": token, "ts": int(time.time())}))
        try:
            os.chmod(TOKEN_FILE, 0o600)
        except OSError:
            pass

    def _post(self, path: str, body: dict, with_token: bool = True) -> dict:
        body = {**body, "appkey": APPKEY, "lang": "_en_US"}
        headers = {"Content-Type": "application/json", "x-access-key": SECRET,
                   "sys_code": "901", "User-Agent": "aesun/1.0"}
        if with_token:
            body["token"] = self.token
            headers["token"] = self.token or ""
        if RSA_PUBLIC:
            body["api_key_param"] = {"nonce": _rand(32), "timestamp": str(int(time.time() * 1000))}
            aes_key = _rand(16)
            headers["x-random-secret-key"] = _rsa_encrypt(aes_key, RSA_PUBLIC)
            r = self.s.post(HOST + path, data=_aes_encrypt(json.dumps(body), aes_key),
                            headers=headers, timeout=30)
            r.raise_for_status()
            txt = r.text.strip()
            data = json.loads(txt) if txt.startswith("{") else json.loads(_aes_decrypt(txt, aes_key))
        else:
            r = self.s.post(HOST + path, json=body, headers=headers, timeout=30)
            r.raise_for_status()
            data = r.json()
        code = str(data.get("result_code"))
        if code != "1":
            raise SungrowError(code, data.get("result_msg", ""))
        return data.get("result_data") or {}

    def login(self):
        rd = self._post("/openapi/login",
                        {"user_account": USER, "user_password": PASSWORD, "login_type": "1"},
                        with_token=False)
        if str(rd.get("login_state")) != "1" or not rd.get("token"):
            raise SungrowError("LOGIN", f"login_state={rd.get('login_state')} msg={rd.get('msg')}")
        self.token = rd["token"]
        self._save_token(self.token)
        log.info("Login OK")

    def call(self, path: str, body: dict) -> dict:
        if not self.token:
            self.login()
        try:
            return self._post(path, body)
        except SungrowError as e:
            if e.code in TOKEN_ERRORS or "token" in str(e).lower():
                log.info("Token geçersiz, yeniden login")
                self.login()
                return self._post(path, body)
            raise

    # --- uç noktalar
    def plants(self) -> list[dict]:
        out, page = [], 1
        while True:
            rd = self.call("/openapi/getPowerStationList", {"curPage": page, "size": 100})
            rows = rd.get("pageList") or []
            out += rows
            if len(out) >= int(rd.get("rowCount") or 0) or not rows:
                return [p for p in out if str(p.get("ps_id")) not in HARIC_PS]
            page += 1

    def devices(self, ps_id) -> list[dict]:
        rd = self.call("/openapi/getDeviceList", {"ps_id": str(ps_id), "curPage": 1, "size": 200})
        return rd.get("pageList") or []

    def realtime(self, device_type: int, ps_keys: list[str], points: list[str]) -> list[dict]:
        rd = self.call("/openapi/getDeviceRealTimeData",
                       {"device_type": device_type, "ps_key_list": ps_keys, "point_id_list": points})
        return rd.get("device_point_list") or []


# ---------------------------------------------------------------- veritabanı
SCHEMA = """
CREATE TABLE IF NOT EXISTS sg_plant (
  ps_id TEXT PRIMARY KEY, name TEXT, capacity_kwp REAL, status TEXT,
  location TEXT, raw TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS sg_device (
  ps_key TEXT PRIMARY KEY, ps_id TEXT, device_type INTEGER, name TEXT,
  sn TEXT, fault_status TEXT, raw TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS sg_reading (
  ts TEXT, ps_id TEXT, ps_key TEXT, device_type INTEGER,
  metric TEXT, value REAL, PRIMARY KEY (ts, ps_key, metric));
CREATE INDEX IF NOT EXISTS ix_reading_ps ON sg_reading(ps_id, ts);
"""


def db() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.executescript(SCHEMA)
    return c


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def collect(cli: SungrowClient, con: sqlite3.Connection) -> int:
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0).isoformat()
    n = 0
    for ps in HARIC_PS:  # haric tutulan santrallerin eski kayitlarini temizle
        for t in ("sg_reading", "sg_device", "sg_plant"):
            con.execute(f"DELETE FROM {t} WHERE ps_id=?", (ps,))
    plants = cli.plants()
    for p in plants:
        ps_id = str(p.get("ps_id"))
        cap = _num((p.get("total_capcity") or {}).get("value")) if isinstance(p.get("total_capcity"), dict) else _num(p.get("design_capacity"))
        con.execute("INSERT OR REPLACE INTO sg_plant VALUES (?,?,?,?,?,?,?)",
                    (ps_id, p.get("ps_name"), cap, str(p.get("ps_fault_status") or p.get("ps_status")),
                     p.get("ps_location"), json.dumps(p, ensure_ascii=False), now))

        # santral seviyesi
        key = f"{ps_id}_11_0_0"
        for row in cli.realtime(11, [key], list(PLANT_POINTS)):
            pt = row.get("device_point", row)
            for pid, (metric, _) in PLANT_POINTS.items():
                v = _num(pt.get("p" + pid))
                if v is not None:
                    con.execute("INSERT OR REPLACE INTO sg_reading VALUES (?,?,?,?,?,?)",
                                (now, ps_id, key, 11, metric, v)); n += 1

        # inverterler
        inv_keys = []
        for d in cli.devices(ps_id):
            k = d.get("ps_key")
            con.execute("INSERT OR REPLACE INTO sg_device VALUES (?,?,?,?,?,?,?,?)",
                        (k, ps_id, d.get("device_type"), d.get("device_name"), d.get("device_sn"),
                         str(d.get("dev_fault_status")), json.dumps(d, ensure_ascii=False), now))
            if int(d.get("device_type") or 0) == 1 and k:
                inv_keys.append(k)
        for i in range(0, len(inv_keys), 50):
            for row in cli.realtime(1, inv_keys[i:i + 50], list(INVERTER_POINTS)):
                pt = row.get("device_point", row)
                k = pt.get("ps_key")
                for pid, (metric, _) in INVERTER_POINTS.items():
                    v = _num(pt.get("p" + pid))
                    if v is not None:
                        con.execute("INSERT OR REPLACE INTO sg_reading VALUES (?,?,?,?,?,?)",
                                    (now, ps_id, k, 1, metric, v)); n += 1
    con.commit()
    log.info("%d santral, %d ölçüm yazıldı", len(plants), n)
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    cli = SungrowClient()
    if a.list:
        for p in cli.plants():
            print(p.get("ps_id"), "|", p.get("ps_name"), "|", p.get("ps_status"))
        return
    con = db()
    while True:
        try:
            collect(cli, con)
        except Exception as e:  # döngü düşmesin
            log.error("Toplama hatası: %s", e)
        if a.once:
            return
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    sys.exit(main())
