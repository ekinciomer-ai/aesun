"""Saha uygulaması eşitleme API'si (n8n 'Saha Sync API' + 'Saha Foto API' yerine; kendi sunucumuz, kota yok).
Depo: SQLite /veri/saha.db (aesun_veri birimi → gece restic yedeğine girer). Sözleşme n8n ile birebir aynıdır:
  GET  /v1/saha/saha-get?proje=X        → [{proje,anahtar,deger,cihaz,guncellendi}]
  POST /v1/saha/saha-set  {proje,cihaz,items:[{anahtar,deger}]}  (deger null → "null" silme damgası)
  GET  /v1/saha/foto-get?proje=X&fid=Y  → [{proje,fid,veri,tur,guncellendi}] (yoksa [])
  POST /v1/saha/foto-set  {proje,items:[{fid,veri,tur}]}
Yazma yalnız portal kaynağından; github.io arşivi salt okunur (403)."""
import json, os, re, sqlite3, threading
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

DB = os.environ.get("AESUN_SAHA_DB", "/veri/saha.db")
MAX_ADET, MAX_KV, MAX_FOTO = 200, 1024 * 1024, 2 * 1024 * 1024
PROJE = re.compile(r"^[A-Za-z0-9_.:-]{1,60}$")
router = APIRouter()
_kilit = threading.Lock()
_hazir = False


def _simdi():
    t = datetime.now(timezone.utc)
    return t.strftime("%Y-%m-%dT%H:%M:%S.") + f"{t.microsecond // 1000:03d}Z"


def _baglan():
    global _hazir
    c = sqlite3.connect(DB, timeout=30)
    c.row_factory = sqlite3.Row
    if not _hazir:
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("CREATE TABLE IF NOT EXISTS kv(proje TEXT NOT NULL, anahtar TEXT NOT NULL, deger TEXT, cihaz TEXT DEFAULT '', "
                  "guncellendi TEXT NOT NULL, PRIMARY KEY(proje, anahtar))")
        c.execute("CREATE TABLE IF NOT EXISTS foto(proje TEXT NOT NULL, fid TEXT NOT NULL, veri TEXT, tur TEXT DEFAULT 'img', "
                  "guncellendi TEXT NOT NULL, PRIMARY KEY(proje, fid))")
        c.commit()
        _hazir = True
    return c


def _ret(kod, hata):
    return JSONResponse({"ok": False, "hata": hata}, status_code=kod)


def _arsiv(req: Request):
    return "github.io" in (req.headers.get("origin", "") + req.headers.get("referer", "")).lower()


async def _govde(req: Request):
    try:
        b = json.loads((await req.body()).decode("utf-8"))
        return b if isinstance(b, dict) else {}
    except Exception:
        return {}


@router.get("/v1/saha/saha-get")
def saha_get(proje: str = ""):
    proje = proje.strip()
    if not proje or not PROJE.match(proje):
        return _ret(400, "proje zorunlu")
    with _kilit:
        c = _baglan()
        try:
            rows = [dict(r) for r in c.execute("SELECT proje,anahtar,deger,cihaz,guncellendi FROM kv WHERE proje=? ORDER BY rowid", (proje,))]
        finally:
            c.close()
    return JSONResponse(rows, headers={"Cache-Control": "no-store"})


@router.post("/v1/saha/saha-set")
async def saha_set(req: Request):
    if _arsiv(req):
        return _ret(403, "arşiv salt okunur — yazma yalnız portal.aksarayenerji.net")
    b = await _govde(req)
    proje = str(b.get("proje") or "").strip()
    if not proje or not PROJE.match(proje):
        return _ret(400, "proje zorunlu")
    items = b.get("items") if isinstance(b.get("items"), list) else []
    if not items:
        return {"ok": True, "yazilan": 0}
    if len(items) > MAX_ADET:
        return _ret(413, f"istek basina en fazla {MAX_ADET} kayit")
    cihaz, now, out = str(b.get("cihaz") or "")[:40], _simdi(), []
    for i, it in enumerate(items):
        it = it if isinstance(it, dict) else {}
        k = str(it.get("anahtar") or "").strip()
        if not k:
            return _ret(400, f"{i + 1}. kayitta anahtar yok")
        d = it.get("deger")
        d = d if isinstance(d, str) else json.dumps(d, ensure_ascii=False, separators=(",", ":"))
        if len(d) > MAX_KV:
            return _ret(413, f"{k} cok buyuk ({len(d) // 1024} KB, sinir 1 MB)")
        out.append((proje, k, d, cihaz, now))
    with _kilit:
        c = _baglan()
        try:
            c.executemany("INSERT INTO kv(proje,anahtar,deger,cihaz,guncellendi) VALUES(?,?,?,?,?) "
                          "ON CONFLICT(proje,anahtar) DO UPDATE SET deger=excluded.deger,cihaz=excluded.cihaz,guncellendi=excluded.guncellendi", out)
            c.commit()
        finally:
            c.close()
    return {"ok": True, "yazilan": len(out)}


@router.get("/v1/saha/foto-get")
def foto_get(proje: str = "", fid: str = ""):
    proje, fid = proje.strip(), fid.strip()
    if not proje or not fid or not PROJE.match(proje):
        return _ret(400, "proje ve fid zorunlu")
    with _kilit:
        c = _baglan()
        try:
            rows = [dict(r) for r in c.execute("SELECT proje,fid,veri,tur,guncellendi FROM foto WHERE proje=? AND fid=?", (proje, fid))]
        finally:
            c.close()
    return JSONResponse(rows, headers={"Cache-Control": "no-store"})


@router.post("/v1/saha/foto-set")
async def foto_set(req: Request):
    if _arsiv(req):
        return _ret(403, "arşiv salt okunur — yazma yalnız portal.aksarayenerji.net")
    b = await _govde(req)
    proje = str(b.get("proje") or "").strip()
    if not proje or not PROJE.match(proje):
        return _ret(400, "proje zorunlu")
    items = b.get("items") if isinstance(b.get("items"), list) else []
    if not items:
        return {"ok": True, "yazilan": 0}
    if len(items) > MAX_ADET:
        return _ret(413, f"istek basina en fazla {MAX_ADET} foto")
    now, out = _simdi(), []
    for i, it in enumerate(items):
        it = it if isinstance(it, dict) else {}
        fid = str(it.get("fid") or "").strip()
        if not fid:
            return _ret(400, f"{i + 1}. kayitta fid yok")
        v = "" if it.get("veri") is None else str(it.get("veri"))
        if len(v) > MAX_FOTO:
            return _ret(413, f"{fid} cok buyuk ({len(v) // 1024} KB, sinir 2 MB)")
        out.append((proje, fid, v, str(it.get("tur") or "img")[:12], now))
    with _kilit:
        c = _baglan()
        try:
            c.executemany("INSERT INTO foto(proje,fid,veri,tur,guncellendi) VALUES(?,?,?,?,?) "
                          "ON CONFLICT(proje,fid) DO UPDATE SET veri=excluded.veri,tur=excluded.tur,guncellendi=excluded.guncellendi", out)
            c.commit()
        finally:
            c.close()
    return {"ok": True, "yazilan": len(out)}
