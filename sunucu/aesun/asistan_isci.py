#!/usr/bin/env python3
"""Merkez Sunucu (159.198.76.80) Antigravity Tam Yetkili Sunucu Asistanı & Canlı YouTube Komut İşçisi.

aesun-api kapsayıcısı (/veri/asistan/kuyruk) üzerinden gelen yönetici (Ömer) onaylı
istekleri root yetkisiyle ve tam serbestlikle işler:
- Kod Okuma / Düzenleme / GitHub Push & Canlı Yayınlama (/opt/aesun/kod_aesun ve /opt/aesun-web/portal)
- Canlı YouTube API yönetimi (Antik Stüdyo TR & Ancient Studio EN): listeleme, planlama,
  başlık/açıklama/gizlilik değiştirme, silme, yorum okuma/yanıtlama, URL veya sunucu dosyasından yükleme
- Doğrudan Merkez Sunucu (159.198.76.80) kabuk/komut çalıştırma (docker, systemctl, git, dosya, log)
- Hızlı Çok Adımlı AI Araç Çağırma (Multi-Turn Tool-Calling) motoru
Hiçbir şifre, anahtar veya token çıktıya/dosyaya YAZILMAZ.
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

TZ = timezone(timedelta(hours=3))
YT_DIR = Path("/opt/aesun/youtube")
KOD_DIR = Path("/opt/aesun/kod_aesun")
PORTAL_CANLI_DIR = Path("/opt/aesun-web/portal")
KANALLAR = {
    "TR": ("UC77LyY3gqWmBNAKp2lbsGBg", "Antik Stüdyo"),
    "EN": ("UCFLJUlhUSgjcLbp9ad_t9PQ", "Ancient Studio"),
}

GIZLI_DESEN = re.compile(
    r"(AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|"
    r"sk-[0-9A-Za-z_-]{20,}|ya29\.[0-9A-Za-z_-]{20,}|1//[0-9A-Za-z_-]{20,}|"
    r"GOCSPX-[0-9A-Za-z_-]{15,})"
)

_ANT_AKTIF = False


def maskele(metin: str) -> str:
    if not metin:
        return ""
    return GIZLI_DESEN.sub("[GIZLI_ANAHTAR]", str(metin))


def ortam_yukle():
    """Sunucudaki mevcut .env dosyalarından (değerleri loglamadan) ortam değişkenlerini yükler."""
    for p in ("/opt/aesun/.env", "/opt/aesun/isler.env", "/opt/cutkoda/motor.env", "/opt/cutkoda/panel.env", "/opt/cutkoda/.env", "/opt/aesun/asistan.env"):
        try:
            yol = Path(p)
            if not yol.is_file():
                continue
            for satir in yol.read_text(encoding="utf-8", errors="ignore").splitlines():
                s = satir.strip()
                if not s or s.startswith("#") or "=" not in s:
                    continue
                k, v = s.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                if k and v and k not in os.environ:
                    os.environ[k] = v
        except Exception:
            pass


def veri_kok_bul() -> Path:
    env_p = os.environ.get("ASISTAN_VERI", "")
    if env_p and os.path.isdir(env_p):
        return Path(env_p)
    try:
        out = subprocess.check_output(
            ["docker", "inspect", "aesun-api", "--format",
             '{{range .Mounts}}{{if eq .Destination "/veri"}}{{.Source}}{{end}}{{end}}'],
            text=True, timeout=10
        ).strip()
        if out and os.path.isdir(out):
            return Path(out) / "asistan"
    except Exception:
        pass
    return Path("/var/lib/docker/volumes/aesun_aesun_veri/_data/asistan")


KOK = veri_kok_bul()
KUYRUK = KOK / "kuyruk"
DURUM_DOSYA = KOK / "durum.json"
MESAJ_DOSYA = KOK / "mesajlar.json"


def izin_ayarla(p: Path):
    try:
        os.chown(p, 1001, 1001)
    except Exception:
        pass


def klasor_hazirla():
    KOK.mkdir(parents=True, exist_ok=True)
    KUYRUK.mkdir(parents=True, exist_ok=True)
    izin_ayarla(KOK)
    izin_ayarla(KUYRUK)
    if not MESAJ_DOSYA.exists():
        mesaj_kaydet([
            {
                "id": "hosgeldin",
                "kim": "asistan",
                "zaman": datetime.now(TZ).isoformat(timespec="seconds"),
                "metin": (
                    "Merhaba Ömer! Merkez Sunucu (159.198.76.80) üzerinden doğrudan ve kısıtlamasız bağlısın.\n"
                    "Buradan bana serbestçe her şeyi yazabilirsin: portal/site kodlarını düzenleyip canlıya alabilir, "
                    "YouTube kanallarını (Antik Stüdyo TR & Ancient Studio EN) yönetebilir ve sunucu üzerinde istediğin işlemi yaptırabilirsin."
                ),
            }
        ])


def mesajlari_oku() -> list:
    try:
        if MESAJ_DOSYA.exists():
            return json.loads(MESAJ_DOSYA.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def mesaj_kaydet(liste: list):
    liste = liste[-120:]
    tmp = MESAJ_DOSYA.with_suffix(".tmp")
    tmp.write_text(json.dumps(liste, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, MESAJ_DOSYA)
    izin_ayarla(MESAJ_DOSYA)


def mesaj_ekle(kim: str, metin: str, ek: dict = None):
    m = mesajlari_oku()
    kayit = {
        "id": f"m_{int(time.time()*1000)}",
        "kim": kim,
        "zaman": datetime.now(TZ).isoformat(timespec="seconds"),
        "metin": maskele(metin),
    }
    if ek:
        kayit.update(ek)
    m.append(kayit)
    mesaj_kaydet(m)
    return kayit


def get_access_token(cid: str) -> str:
    ist = json.loads((YT_DIR / "istemci.json").read_text(encoding="utf-8"))
    kf = json.loads((YT_DIR / "kanallar" / f"{cid}.json").read_text(encoding="utf-8"))
    body = urllib.parse.urlencode({
        "client_id": ist["client_id"],
        "client_secret": ist["client_secret"],
        "refresh_token": kf["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=body)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.load(resp)["access_token"]


def yt_api(url: str, token: str, method: str = "GET", data: dict = None) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    raw = None
    if data is not None:
        raw = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=UTF-8"
    req = urllib.request.Request(url, data=raw, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw_resp = resp.read()
        return json.loads(raw_resp.decode("utf-8")) if raw_resp else {}


def sunucu_ozet() -> dict:
    out = {"zaman": datetime.now(TZ).isoformat(timespec="seconds")}
    try:
        ps = subprocess.check_output(
            ["docker", "ps", "--format", "{{.Names}}:{{.Status}}"], text=True, timeout=8
        ).strip().splitlines()
        out["kapsayicilar"] = ps
    except Exception:
        out["kapsayicilar"] = []
    try:
        mem = subprocess.check_output(["free", "-m"], text=True, timeout=5).splitlines()
        for l in mem:
            if l.startswith("Mem:"):
                p = l.split()
                out["bellek"] = f"{p[6]} MB boş / {p[1]} MB"
    except Exception:
        out["bellek"] = "?"
    try:
        df = subprocess.check_output(["df", "-h", "/"], text=True, timeout=5).splitlines()[-1].split()
        out["disk"] = f"{df[2]} / {df[1]} ({df[4]})"
    except Exception:
        out["disk"] = "?"
    return out


def durum_guncelle(yedek_al: bool = False) -> dict:
    videolar = []
    kanal_ozet = {}
    yedek_veri = {"zaman": datetime.now(TZ).isoformat(timespec="seconds"), "kanallar": {}}

    for dil, (cid, kad) in KANALLAR.items():
        try:
            tok = get_access_token(cid)
            ch = yt_api(
                f"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id={cid}",
                tok
            ).get("items", [{}])[0]
            st_ch = ch.get("statistics", {})
            kanal_ozet[dil] = {
                "id": cid,
                "ad": kad,
                "abone": int(st_ch.get("subscriberCount", 0)),
                "izlenme": int(st_ch.get("viewCount", 0)),
                "video_sayisi": int(st_ch.get("videoCount", 0)),
            }
            uploads_pid = "UU" + cid[2:]
            u = f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId={uploads_pid}&maxResults=50"
            vids = [it["contentDetails"]["videoId"] for it in yt_api(u, tok).get("items", [])]
            if vids:
                u2 = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics,contentDetails&id={','.join(vids[:50])}"
                items = yt_api(u2, tok).get("items", [])
                yedek_veri["kanallar"][cid] = items
                for v in items:
                    sn = v.get("snippet", {})
                    st = v.get("status", {})
                    stat = v.get("statistics", {})
                    cd = v.get("contentDetails", {})
                    gz = st.get("privacyStatus", "private")
                    pub_at = st.get("publishAt", "")
                    if gz == "public":
                        durum_etiket = "Yayında"
                        zaman_str = sn.get("publishedAt", "")
                    elif pub_at:
                        durum_etiket = "Planlı"
                        zaman_str = pub_at
                    else:
                        durum_etiket = "Özel"
                        zaman_str = sn.get("publishedAt", "")
                    tr_tarih, tr_saat = "", ""
                    if zaman_str:
                        try:
                            dt_obj = datetime.fromisoformat(zaman_str.replace("Z", "+00:00")).astimezone(TZ)
                            tr_tarih = dt_obj.strftime("%Y-%m-%d")
                            tr_saat = dt_obj.strftime("%H:%M")
                        except Exception:
                            pass
                    videolar.append({
                        "vid": v["id"],
                        "dil": dil,
                        "kanal": kad,
                        "baslik": sn.get("title", ""),
                        "aciklama": sn.get("description", ""),
                        "etiketler": sn.get("tags", []),
                        "categoryId": sn.get("categoryId", "27"),
                        "durum": durum_etiket,
                        "privacyStatus": gz,
                        "publishAt": pub_at,
                        "tarih": tr_tarih,
                        "saat": tr_saat,
                        "cozunurluk": cd.get("definition", "hd"),
                        "izlenme": int(stat.get("viewCount", 0)),
                        "begeni": int(stat.get("likeCount", 0)),
                        "yorum": int(stat.get("commentCount", 0)),
                        "sure": cd.get("duration", ""),
                        "link": f"https://youtube.com/shorts/{v['id']}",
                    })
        except Exception as e:
            kanal_ozet[dil] = {"id": cid, "ad": kad, "hata": str(e)[:160]}

    if yedek_al and yedek_veri["kanallar"]:
        yd = YT_DIR / "yedek"
        yd.mkdir(parents=True, exist_ok=True)
        yf = yd / f"durum_{datetime.now(TZ).strftime('%Y%m%d_%H%M%S')}.json"
        yf.write_text(json.dumps(yedek_veri, ensure_ascii=False, indent=1), encoding="utf-8")
        os.chmod(yf, 0o600)

    videolar.sort(key=lambda x: (0 if x["durum"] == "Planlı" else (1 if x["durum"] == "Özel" else 2),
                                 x.get("tarih", ""), x.get("saat", "")), reverse=False)
    durum = {
        "guncellendi": datetime.now(TZ).isoformat(timespec="seconds"),
        "sunucu": sunucu_ozet(),
        "kanallar": kanal_ozet,
        "videolar": videolar,
    }
    tmp = DURUM_DOSYA.with_suffix(".tmp")
    tmp.write_text(json.dumps(durum, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, DURUM_DOSYA)
    izin_ayarla(DURUM_DOSYA)
    return durum


def _video_dil_bul(vid: str, varsayilan: str = "TR") -> str:
    if DURUM_DOSYA.exists():
        try:
            d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8"))
            for x in d.get("videolar", []):
                if x.get("vid") == vid:
                    return x.get("dil", varsayilan)
        except Exception:
            pass
    return varsayilan


def video_guncelle(istek: dict) -> str:
    vid = str(istek.get("vid", "")).strip()
    if not vid:
        raise ValueError("Video ID (vid) zorunludur.")
    dil = str(istek.get("dil") or _video_dil_bul(vid)).strip().upper()
    if dil not in KANALLAR:
        dil = "TR"
    cid, kad = KANALLAR[dil]
    durum_guncelle(yedek_al=True)
    tok = get_access_token(cid)
    mevcut = yt_api(
        f"https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id={vid}",
        tok
    ).get("items", [])
    if not mevcut:
        diger = "EN" if dil == "TR" else "TR"
        cid2, kad2 = KANALLAR[diger]
        tok2 = get_access_token(cid2)
        mevcut2 = yt_api(f"https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id={vid}", tok2).get("items", [])
        if mevcut2:
            dil, cid, kad, tok, mevcut = diger, cid2, kad2, tok2, mevcut2
        else:
            raise ValueError(f"Video her iki kanalda da bulunamadı: {vid}")
    v = mevcut[0]
    sn = v["snippet"]
    st = v["status"]

    yeni_baslik = istek.get("baslik")
    if yeni_baslik:
        sn["title"] = str(yeni_baslik).strip()[:100]
    if "aciklama" in istek and istek["aciklama"] is not None:
        sn["description"] = str(istek["aciklama"])
    if "etiketler" in istek and isinstance(istek["etiketler"], list):
        sn["tags"] = [str(t) for t in istek["etiketler"]]
    if not sn.get("categoryId"):
        sn["categoryId"] = "27"

    plan_tarih = str(istek.get("tarih", "")).strip()
    plan_saat = str(istek.get("saat", "")).strip()
    gizlilik = str(istek.get("privacyStatus", "")).strip()

    yeni_status = {
        "selfDeclaredMadeForKids": False,
        "containsSyntheticMedia": True,
    }
    if plan_tarih and plan_saat:
        yeni_status["privacyStatus"] = "private"
        yeni_status["publishAt"] = f"{plan_tarih}T{plan_saat}:00+03:00"
    elif gizlilik in ("private", "public", "unlisted"):
        yeni_status["privacyStatus"] = gizlilik
    else:
        yeni_status["privacyStatus"] = st.get("privacyStatus", "private")
        if st.get("publishAt"):
            yeni_status["publishAt"] = st["publishAt"]

    yt_api(
        "https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
        tok,
        method="PUT",
        data={"id": vid, "snippet": {
            "title": sn["title"],
            "description": sn.get("description", ""),
            "tags": sn.get("tags", []),
            "categoryId": sn.get("categoryId", "27"),
            "defaultLanguage": "tr" if dil == "TR" else "en",
            "defaultAudioLanguage": "tr" if dil == "TR" else "en",
        }, "status": yeni_status}
    )
    durum_guncelle(yedek_al=False)
    ozet = f"{kad} ({dil}) · `{vid}` güncellendi: `{sn['title'][:60]}`"
    if yeni_status.get("publishAt"):
        ozet += f" → Planlı: {plan_tarih} {plan_saat} TSİ"
    else:
        ozet += f" → Durum: {yeni_status['privacyStatus']}"
    return ozet


def video_sil(vid: str, dil: str = "") -> str:
    vid = str(vid or "").strip()
    if not vid:
        raise ValueError("Silinecek video ID gerekli.")
    dil = (dil or _video_dil_bul(vid)).upper()
    if dil not in KANALLAR:
        dil = "TR"
    cid, kad = KANALLAR[dil]
    durum_guncelle(yedek_al=True)
    tok = get_access_token(cid)
    yt_api(f"https://www.googleapis.com/youtube/v3/videos?id={vid}", tok, method="DELETE")
    durum_guncelle(yedek_al=False)
    return f"🗑️ {kad} ({dil}) kanalından `{vid}` videosu yedek alınarak silindi."


def yorumlari_getir(dil: str = "TR", limit: int = 10) -> str:
    dil = dil.upper() if dil.upper() in KANALLAR else "TR"
    cid, kad = KANALLAR[dil]
    tok = get_access_token(cid)
    u = f"https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&allThreadsRelatedToChannelId={cid}&maxResults={min(limit, 25)}"
    items = yt_api(u, tok).get("items", [])
    if not items:
        return f"💬 {kad} ({dil}) kanalında henüz yorum bulunmuyor."
    satirlar = [f"💬 **{kad} ({dil}) Son Yorumlar:**"]
    for it in items[:limit]:
        top = it.get("snippet", {}).get("topLevelComment", {})
        cid_y = top.get("id", "")
        sn = top.get("snippet", {})
        yazar = sn.get("authorDisplayName", "?")
        metin = sn.get("textOriginal", "").replace("\n", " ")[:120]
        vid = sn.get("videoId", "")
        satirlar.append(f"- `{cid_y}` (Video `{vid}`) **{yazar}**: {metin}")
    return "\n".join(satirlar)


def yoruma_yanitla(parent_id: str, metin: str, dil: str = "TR") -> str:
    dil = dil.upper() if dil.upper() in KANALLAR else "TR"
    cid, kad = KANALLAR[dil]
    tok = get_access_token(cid)
    yt_api(
        "https://www.googleapis.com/youtube/v3/comments?part=snippet",
        tok,
        method="POST",
        data={"snippet": {"parentId": parent_id.strip(), "textOriginal": metin.strip()}},
    )
    return f"✅ {kad} ({dil}) kanalında `{parent_id}` yorumuna yanıt gönderildi: {metin}"


def video_yukle(istek: dict) -> str:
    dil = str(istek.get("dil", "TR")).strip().upper()
    url = str(istek.get("url", "")).strip()
    baslik = str(istek.get("baslik", "")).strip()
    aciklama = str(istek.get("aciklama", "")).strip()
    tarih = str(istek.get("tarih", "")).strip()
    saat = str(istek.get("saat", "")).strip()
    gizlilik = str(istek.get("privacyStatus", "private")).strip()
    if dil not in KANALLAR or not url or not baslik:
        raise ValueError("Kanal dili, video URL/dosya yolu ve başlık zorunludur.")
    cid, kad = KANALLAR[dil]
    durum_guncelle(yedek_al=True)
    medya_dir = YT_DIR / "medya"
    medya_dir.mkdir(parents=True, exist_ok=True)

    yerel_gecici = False
    if url.startswith(("http://", "https://")):
        yerel = medya_dir / f"panel_{int(time.time())}.mp4"
        yerel_gecici = True
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=180) as r, open(yerel, "wb") as f:
            while True:
                b = r.read(262144)
                if not b:
                    break
                f.write(b)
    else:
        yerel = Path(url) if url.startswith("/") else (medya_dir / url)
        if not yerel.is_file():
            raise ValueError(f"Sunucuda video dosyası bulunamadı: {yerel}")

    boyut = yerel.stat().st_size
    if boyut < 50000:
        if yerel_gecici:
            yerel.unlink(missing_ok=True)
        raise ValueError("Video dosyası çok küçük veya geçersiz.")
    tok = get_access_token(cid)
    lang_code = "tr" if dil == "TR" else "en"
    snippet = {
        "title": baslik[:100],
        "description": aciklama,
        "categoryId": "27",
        "defaultLanguage": lang_code,
        "defaultAudioLanguage": lang_code,
    }
    status_obj = {
        "privacyStatus": gizlilik if gizlilik in ("private", "public", "unlisted") else "private",
        "selfDeclaredMadeForKids": False,
        "containsSyntheticMedia": True,
    }
    if tarih and saat:
        status_obj["privacyStatus"] = "private"
        status_obj["publishAt"] = f"{tarih}T{saat}:00+03:00"
    init_req = urllib.request.Request(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        data=json.dumps({"snippet": snippet, "status": status_obj}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Length": str(boyut),
            "X-Upload-Content-Type": "video/mp4",
        },
        method="POST",
    )
    with urllib.request.urlopen(init_req, timeout=30) as resp:
        loc = resp.headers.get("Location")
    up_req = urllib.request.Request(
        loc,
        data=yerel.read_bytes(),
        headers={"Content-Type": "video/mp4", "Content-Length": str(boyut)},
        method="PUT",
    )
    with urllib.request.urlopen(up_req, timeout=300) as up_resp:
        sonuc = json.load(up_resp)
    if yerel_gecici:
        yerel.unlink(missing_ok=True)
    vid = sonuc["id"]
    durum_guncelle(yedek_al=False)
    return f"{kad} ({dil}) kanalına yüklendi! Video ID: `{vid}` · https://youtube.com/shorts/{vid}"


def sunucu_komut_calistir(komut: str, sure_sn: int = 30) -> str:
    """Merkez Sunucu üzerinde bash komutu çalıştırır (anahtar/sır içeren dosyaları okumayı reddeder)."""
    yasak = re.search(r"(/opt/aesun/youtube/(istemci|kanallar)|\.env\b|anahtarlar\.json|id_ed25519|sso_sir)", komut)
    if yasak:
        return "⛔ Güvenlik kuralı gereği sır/anahtar dosyaları doğrudan çıktıya basılamaz."
    calisma_dizin = str(KOD_DIR) if KOD_DIR.is_dir() else "/opt/aesun"
    try:
        p = subprocess.run(
            ["/bin/bash", "-c", komut],
            cwd=calisma_dizin,
            capture_output=True,
            text=True,
            timeout=min(max(sure_sn, 5), 40),
        )
        cikti = ((p.stdout or "") + ("\n" + p.stderr if p.stderr else "")).strip()
        cikti = maskele(cikti)
        if not cikti:
            cikti = f"(Komut tamamlandı, çıkış kodu: {p.returncode})"
        return f"💻 **Sunucu Komut Çıktısı (`exit={p.returncode}`):**\n```\n{cikti[:3000]}\n```"
    except subprocess.TimeoutExpired:
        return "⏱️ Komut zaman aşımına uğradı (40 sn)."
    except Exception as e:
        return f"❌ Komut hatası: {maskele(str(e))}"


def kod_dosya_oku(yol: str, baslangic: int = 1, bitis: int = 200) -> str:
    hedef = (KOD_DIR / yol.lstrip("/")).resolve()
    if not str(hedef).startswith(str(KOD_DIR.resolve())) or not hedef.is_file():
        return f"Dosya bulunamadı: {yol}"
    satirlar = hedef.read_text(encoding="utf-8", errors="replace").splitlines()
    b1 = max(1, int(baslangic or 1))
    b2 = min(len(satirlar), int(bitis or (b1 + 200)))
    secim = [f"{i}: {satirlar[i-1]}" for i in range(b1, b2 + 1)]
    return f"Dosya: {yol} (toplam {len(satirlar)} satır, gösterilen {b1}-{b2}):\n" + "\n".join(secim)


def kod_dosya_duzenle(yol: str, eski_metin: str, yeni_metin: str) -> str:
    hedef = (KOD_DIR / yol.lstrip("/")).resolve()
    if not str(hedef).startswith(str(KOD_DIR.resolve())) or not hedef.is_file():
        return f"Dosya bulunamadı: {yol}"
    icerik = hedef.read_text(encoding="utf-8")
    if eski_metin not in icerik:
        return f"Hata: `eski_metin` {yol} içinde birebir bulunamadı."
    yeni_icerik = icerik.replace(eski_metin, yeni_metin, 1)
    hedef.write_text(yeni_icerik, encoding="utf-8")
    return f"✅ {yol} güncellendi."


def kod_yayinla(commit_mesaji: str = "asistan: sunucu uzerinden guncelleme") -> str:
    if not KOD_DIR.is_dir():
        return "Hata: /opt/aesun/kod_aesun deposu bulunamadı."
    # Yerel /opt/aesun-web/portal dizinini de anında güncelle
    try:
        if (KOD_DIR / "docs/portal/index.html").is_file() and PORTAL_CANLI_DIR.is_dir():
            s = (KOD_DIR / "docs/portal/index.html").read_text(encoding="utf-8")
            s = s.replace('class="bag" href="../"', 'class="bag" href="https://aksarayenerji.net/"')
            (PORTAL_CANLI_DIR / "index.html").write_text(s, encoding="utf-8")
        for alt in ("asistan", "yayin", "denetci", "mimari", "kesif"):
            kay = KOD_DIR / "docs" / alt / "index.html"
            hed = PORTAL_CANLI_DIR / alt / "index.html"
            if kay.is_file() and hed.parent.is_dir():
                hed.write_text(kay.read_text(encoding="utf-8").replace("../portal/", "../"), encoding="utf-8")
    except Exception:
        pass
    komut = (
        "git pull --rebase --autostash origin main && "
        "git add -A && "
        f"git commit -m {json.dumps(commit_mesaji)} && "
        "git push origin main"
    )
    p = subprocess.run(["/bin/bash", "-c", komut], cwd=str(KOD_DIR), capture_output=True, text=True, timeout=35)
    out = maskele((p.stdout or "") + "\n" + (p.stderr or "")).strip()
    return f"🚀 Git & Canlı Dağıtım (`exit={p.returncode}`):\n{out[:1200]}"


def arac_calistir(ad: str, arg: dict) -> str:
    try:
        if ad == "yt_durum_getir":
            d = durum_guncelle(yedek_al=bool(arg.get("yedek"))) if arg.get("yenile", False) else (
                json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
            )
            return json.dumps({
                "guncellendi": d.get("guncellendi"),
                "sunucu": d.get("sunucu"),
                "kanallar": d.get("kanallar"),
                "videolar": [
                    {
                        "vid": v["vid"], "dil": v["dil"], "baslik": v["baslik"],
                        "durum": v["durum"], "tarih": v["tarih"], "saat": v["saat"],
                        "izlenme": v["izlenme"], "begeni": v["begeni"]
                    }
                    for v in d.get("videolar", [])
                ],
            }, ensure_ascii=False)
        if ad == "yt_video_guncelle":
            return video_guncelle(arg)
        if ad == "yt_video_yukle":
            return video_yukle(arg)
        if ad == "yt_video_sil":
            return video_sil(arg.get("vid", ""), arg.get("dil", ""))
        if ad == "yt_yorumlari_getir":
            return yorumlari_getir(arg.get("dil", "TR"), int(arg.get("limit", 10)))
        if ad == "yt_yoruma_yanitla":
            return yoruma_yanitla(arg.get("parent_id", ""), arg.get("metin", ""), arg.get("dil", "TR"))
        if ad == "kod_dosya_oku":
            return kod_dosya_oku(arg.get("yol", ""), int(arg.get("baslangic", 1)), int(arg.get("bitis", 200)))
        if ad == "kod_dosya_duzenle":
            return kod_dosya_duzenle(arg.get("yol", ""), arg.get("eski_metin", ""), arg.get("yeni_metin", ""))
        if ad == "kod_yayinla":
            return kod_yayinla(arg.get("commit_mesaji", "asistan: sunucu uzerinden guncelleme"))
        if ad == "sunucu_komut_calistir":
            return sunucu_komut_calistir(arg.get("komut", ""))
        return f"Bilinmeyen araç: {ad}"
    except Exception as e:
        return f"Araç hatası ({ad}): {maskele(str(e))}"


def _llm_tek_cagri(mesajlar: list) -> str:
    """En hızlı çalışan LLM ucuna (Claude varsa Claude, yoksa GPT-4o ucu) bağlanıp yanıt metnini döndürür."""
    global _ANT_AKTIF
    ant_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if ant_key and _ANT_AKTIF:
        sistem_m = next((m["content"] for m in mesajlar if m["role"] == "system"), "")
        diyalog = [m for m in mesajlar if m["role"] != "system"]
        try:
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=json.dumps({
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 2000,
                    "system": sistem_m,
                    "messages": diyalog,
                }).encode("utf-8"),
                headers={
                    "x-api-key": ant_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                resp_d = json.loads(r.read().decode("utf-8"))
                return "\n".join(b.get("text", "") for b in resp_d.get("content", []) if b.get("type") == "text").strip()
        except urllib.error.HTTPError as he:
            err_b = he.read().decode("utf-8", errors="ignore").lower()
            if he.code in (400, 401, 403) and ("credit" in err_b or "balance" in err_b or "invalid" in err_b):
                _ANT_AKTIF = False
        except Exception:
            pass

    # Hızlı GPT-4o OpenAI uyumlu uç (openai-fast 1-3 sn içinde yanıt verir)
    oai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    uclar = []
    if oai_key:
        uclar.append(("https://api.openai.com/v1/chat/completions", oai_key, "gpt-4o-mini", 12))
    uclar.append(("https://text.pollinations.ai/openai", "", "openai-fast", 14))
    uclar.append(("https://text.pollinations.ai/openai", "", "openai-fast", 16))
    uclar.append(("https://text.pollinations.ai/openai", "", "openai", 18))

    for u_url, u_key, u_mod, t_out in uclar:
        try:
            hdrs = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
            if u_key:
                hdrs["Authorization"] = f"Bearer {u_key}"
            govde = {"model": u_mod, "messages": mesajlar, "temperature": 0.2}
            req = urllib.request.Request(u_url, data=json.dumps(govde).encode("utf-8"), headers=hdrs, method="POST")
            with urllib.request.urlopen(req, timeout=t_out) as r:
                d = json.loads(r.read().decode("utf-8"))
            ic = ((d.get("choices") or [{}])[0].get("message") or {}).get("content", "").strip()
            if ic:
                return ic
        except Exception:
            time.sleep(0.3)
            continue
    return ""


def ai_ajan_calistir(metin: str) -> str:
    """Hızlı JSON Araç Protokolü (ARAC_JSON) ile çalışan çok adımlı (multi-turn) tam yetkili AI ajan."""
    ortam_yukle()
    d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
    kanallar_ozet = []
    for kd, kv in (d.get("kanallar") or {}).items():
        kanallar_ozet.append(f"- {kv.get('ad', kd)} ({kd}): Toplam {kv.get('izlenme', 0)} izlenme, {kv.get('abone', 0)} abone, {kv.get('video', 0)} video")
    kisa_videolar = [
        f"- {v['vid']} [{v['dil']}] ({v['durum']} {v.get('tarih','')} {v.get('saat','')}) | 👁️ {v.get('izlenme', 0)} izlenme, 👍 {v.get('begeni', 0)} beğeni, 💬 {v.get('yorum', 0)} yorum | {v['baslik'][:55]}"
        for v in d.get("videolar", [])[:30]
    ]
    sistem_ozeti = (
        f"Sen Aksaray Enerji & Antik Stüdyo'nun Merkez Sunucusu (159.198.76.80) üzerinde çalışan tam yetkili Antigravity Kodlama ve Sunucu Asistanısın.\n"
        f"Kullanıcın Ömer (kurucu/yönetici). Bugün: {datetime.now(TZ).strftime('%Y-%m-%d %H:%M')} TSİ.\n"
        f"Sunucu Durumu: Bellek {d.get('sunucu',{}).get('bellek','?')}, Disk {d.get('sunucu',{}).get('disk','?')}.\n"
        f"Sunucuda `/opt/aesun/kod_aesun` altında `ekinciomer-ai/aesun` deposu klonlu ve yazmaya hazırdır:\n"
        f"- Kurumsal Portal kodu: `docs/portal/index.html`\n"
        f"- Sunucu Asistanı kodu: `docs/asistan/index.html`\n"
        f"- Yayın Takibi kodu: `docs/yayin/index.html` ve `docs/yayin/yayin.json`\n"
        f"YouTube Kanal İstatistikleri:\n" + "\n".join(kanallar_ozet) + "\n"
        f"Mevcut YouTube Videoları ve Anlık İzlenme Sayıları:\n" + "\n".join(kisa_videolar) + "\n\n"
        "KULLANABİLECEĞİN ARAÇLAR:\n"
        "Bir işlem yapman gerektiğinde yanıtının İLK SATIRINDA yalnızca şu formatta tek satır JSON yaz:\n"
        'ARAC_JSON: {"ad": "<arac_adi>", "arg": {...}}\n'
        "Araç listesi:\n"
        '1. `yt_video_guncelle`: {"vid": "11_haneli_id", "dil": "TR|EN", "tarih": "YYYY-MM-DD", "saat": "HH:MM", "baslik": "...", "privacyStatus": "public|private"}\n'
        '2. `yt_video_sil`: {"vid": "11_haneli_id", "dil": "TR|EN"}\n'
        '3. `yt_yorumlari_getir`: {"dil": "TR|EN", "limit": 10}\n'
        '4. `yt_yoruma_yanitla`: {"parent_id": "...", "metin": "...", "dil": "TR|EN"}\n'
        '5. `sunucu_komut_calistir`: {"komut": "bash komutu"}\n'
        '6. `kod_dosya_oku`: {"yol": "docs/portal/index.html", "baslangic": 1, "bitis": 180}\n'
        '7. `kod_dosya_duzenle`: {"yol": "docs/portal/index.html", "eski_metin": "...", "yeni_metin": "..."}\n'
        '8. `kod_yayinla`: {"commit_mesaji": "..."}\n\n'
        "KURALLAR:\n"
        "- Araç çağırmak gerekmiyorsa (sohbet, soru, fikir, analiz) ARAC_JSON yazma, doğrudan Türkçe, samimi ve net yanıt ver.\n"
        "- ASLA 'ben kısıtlıyım' veya 'yapamam' deme; sunucu üzerinde tam yetkilisin."
    )

    gecmis = [{"role": "system", "content": sistem_ozeti}]
    onceki = [m for m in mesajlari_oku()[-5:] if m.get("metin", "").strip() != metin.strip()]
    for m in onceki[-4:]:
        rol = "user" if m.get("kim") in ("kullanici", "omer") else "assistant"
        ic = m.get("metin", "")[:500].strip()
        if not ic or "görev kutusuna kaydedildi" in ic:
            continue
        gecmis.append({"role": rol, "content": ic})
    gecmis.append({"role": "user", "content": metin})

    toplam_arac_ciktilari = []
    for _adim in range(3):
        yanit = _llm_tek_cagri(gecmis)
        if not yanit:
            break
        m_arac = re.search(r"ARAC_JSON:\s*(\{.*\})", yanit)
        if not m_arac:
            if toplam_arac_ciktilari:
                return "\n\n".join(toplam_arac_ciktilari + [yanit]).strip()
            return yanit.strip()
        try:
            cagri = json.loads(m_arac.group(1))
            ad = cagri.get("ad", "")
            arg = cagri.get("arg") or {}
            sonuc_str = arac_calistir(ad, arg)
            toplam_arac_ciktilari.append(sonuc_str)
            gecmis.append({"role": "assistant", "content": yanit})
            gecmis.append({"role": "user", "content": f"ARAÇ SONUCU ({ad}):\n{sonuc_str[:3000]}\n\nBaşka araç gerekmiyorsa ARAC_JSON yazmadan Ömer'e Türkçe özetle."})
        except Exception as e:
            temiz = re.sub(r"ARAC_JSON:\s*\{.*\}\s*", "", yanit).strip()
            return (temiz or f"İşlem hatası: {maskele(str(e))}")

    if toplam_arac_ciktilari:
        return "\n\n".join(toplam_arac_ciktilari)
    return ""


def akilli_komut_yorumla(metin: str) -> str:
    m_str = metin.strip()
    m_low = m_str.lower()

    # 1. Doğrudan kabuk komutu (!komut)
    if m_str.startswith(("!", "$", "/komut ", "/sh ", "komut:")):
        cmd = re.sub(r"^(!|\$|/komut\s+|/sh\s+|komut:\s*)", "", m_str, flags=re.I).strip()
        return sunucu_komut_calistir(cmd)

    # 2. Doğrudan yapay zeka ajanını çalıştır (her türlü serbest soru, sohbet, kod ve YouTube işlemi)
    ai_cevap = ai_ajan_calistir(m_str)
    if ai_cevap:
        return ai_cevap

    # 3. Yedek yerel yorumlayıcı (ağ geçici kesilirse)
    if any(k in m_low for k in ("docker", "kapsayıcı", "konteyner", "servis")):
        return sunucu_komut_calistir("docker ps --format 'table {{.Names}}\t{{.Status}}' && systemctl is-active aesun-asistan.service")
    if any(k in m_low for k in ("disk", "bellek", "ram", "cpu", "uptime")):
        return sunucu_komut_calistir("uptime && free -h && df -h /")

    d = durum_guncelle(yedek_al=False)
    vids = d.get("videolar", [])
    if any(k in m_low for k in ("izlenme", "abone", "beğeni", "begeni", "istatistik", "kaç kişi")):
        kan = d.get("kanallar") or {}
        satirlar = ["📊 **Canlı YouTube İzlenme & Kanal İstatistikleri:**"]
        for kd, kv in kan.items():
            satirlar.append(f"- **{kv.get('ad', kd)} ({kd}):** Toplam **{kv.get('izlenme', 0)}** izlenme · **{kv.get('abone', 0)}** abone · **{kv.get('video', 0)}** video")
        yayinda = [v for v in vids if v.get("durum") == "Yayında" or int(v.get("izlenme", 0)) > 0]
        if yayinda:
            satirlar.append("\n🎬 **Yayındaki / İzlenen Videolar:**")
            for v in sorted(yayinda, key=lambda x: int(x.get("izlenme", 0)), reverse=True)[:15]:
                satirlar.append(f"  • [{v['dil']}] **{v['baslik'][:48]}** — 👁️ **{v.get('izlenme', 0)}** izlenme · 👍 {v.get('begeni', 0)} beğeni (`{v['vid']}`)")
        return "\n".join(satirlar)
    planli = [v for v in vids if v["durum"] == "Planlı"]
    satirlar = [
        f"📡 **Merkez Sunucu (159.198.76.80) Canlı Durum ({d['guncellendi'][11:16]} TSİ):**",
        f"- **Sunucu:** Bellek {d['sunucu'].get('bellek', '?')} · Disk {d['sunucu'].get('disk', '?')}",
        f"- **Planlı Videolar ({len(planli)} adet):**",
    ]
    for v in sorted(planli, key=lambda x: (x.get("tarih", ""), x.get("saat", "")))[:10]:
        satirlar.append(f"  • `{v['tarih']} {v['saat']}` [{v['dil']}] **{v['baslik'][:50]}** (`{v['vid']}`)")
    return "\n".join(satirlar)


def istek_isle(istek: dict) -> dict:
    tip = str(istek.get("tip", "durum")).strip().lower()
    if tip in ("durum", "yt_yenile", "yenile"):
        d = durum_guncelle(yedek_al=bool(istek.get("yedek")))
        if istek.get("yedek"):
            mesaj_ekle("asistan", "💾 Her iki YouTube kanalının güncel yedeği `/opt/aesun/youtube/yedek/` altına alındı ve liste yenilendi.")
        return {"tamam": True, "durum": d, "mesajlar": mesajlari_oku()}

    if tip in ("yt_planla", "yt_guncelle"):
        ozet = video_guncelle(istek)
        mesaj_ekle("asistan", f"✅ {ozet}")
        return {"tamam": True, "bilgi": ozet, "durum": json.loads(DURUM_DOSYA.read_text(encoding="utf-8")), "mesajlar": mesajlari_oku()}

    if tip == "yt_sil":
        ozet = video_sil(istek.get("vid", ""), istek.get("dil", ""))
        mesaj_ekle("asistan", ozet)
        return {"tamam": True, "bilgi": ozet, "durum": json.loads(DURUM_DOSYA.read_text(encoding="utf-8")), "mesajlar": mesajlari_oku()}

    if tip == "yt_yukle":
        ozet = video_yukle(istek)
        mesaj_ekle("asistan", f"🚀 {ozet}")
        return {"tamam": True, "bilgi": ozet, "durum": json.loads(DURUM_DOSYA.read_text(encoding="utf-8")), "mesajlar": mesajlari_oku()}

    if tip == "komut":
        komut = str(istek.get("komut") or istek.get("metin") or "").strip()
        if not komut:
            raise ValueError("Çalıştırılacak komut boş olamaz.")
        mesaj_ekle("kullanici", f"!{komut}")
        yanit = sunucu_komut_calistir(komut)
        mesaj_ekle("asistan", yanit)
        d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
        return {"tamam": True, "yanit": yanit, "durum": d, "mesajlar": mesajlari_oku()}

    if tip in ("sohbet", "mesaj"):
        metin = str(istek.get("metin", "")).strip()
        if not metin:
            raise ValueError("Mesaj boş olamaz.")
        mesaj_ekle("kullanici", metin)
        yanit = akilli_komut_yorumla(metin)
        mesaj_ekle("asistan", yanit)
        d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
        return {"tamam": True, "yanit": yanit, "durum": d, "mesajlar": mesajlari_oku()}

    raise ValueError(f"Bilinmeyen işlem tipi: {tip}")


def main():
    ortam_yukle()
    klasor_hazirla()
    # Eğer mesajlar.json'da son mesaj kullanıcıdan kalmışsa veya yedek durum mesajına düşmüşse hemen AI ile yanıtla
    try:
        ms = mesajlari_oku()
        if ms:
            if ms[-1].get("kim") in ("kullanici", "omer"):
                son_soru = ms[-1].get("metin", "").strip()
                if son_soru:
                    yanit = akilli_komut_yorumla(son_soru)
                    mesaj_ekle("asistan", yanit)
            elif len(ms) >= 2 and ms[-1].get("kim") == "asistan" and "Merkez Sunucu" in ms[-1].get("metin", "") and ms[-2].get("kim") in ("kullanici", "omer"):
                son_soru = ms[-2].get("metin", "").strip()
                if son_soru and not any(k in son_soru.lower() for k in ("planlı", "durum", "sağlık")):
                    ms.pop()
                    mesaj_kaydet(ms)
                    yanit = akilli_komut_yorumla(son_soru)
                    mesaj_ekle("asistan", yanit)
    except Exception:
        pass
    son_otomatik = 0.0
    print(f"asistan_isci (hizli AI) basladi: {KOK}", flush=True)
    while True:
        try:
            if time.time() - son_otomatik > 900 or not DURUM_DOSYA.exists():
                durum_guncelle(yedek_al=False)
                son_otomatik = time.time()
            for p in sorted(KUYRUK.glob("istek_*.json")):
                stem = p.stem.replace("istek_", "", 1)
                yanit_yol = KUYRUK / f"yanit_{stem}.json"
                try:
                    istek = json.loads(p.read_text(encoding="utf-8"))
                    sonuc = istek_isle(istek)
                except urllib.error.HTTPError as e:
                    err_body = e.read().decode("utf-8", errors="replace")[:250]
                    sonuc = {"tamam": False, "hata": f"HTTP {e.code}: {maskele(err_body)}"}
                except Exception as e:
                    sonuc = {"tamam": False, "hata": maskele(str(e))[:250]}
                finally:
                    p.unlink(missing_ok=True)
                tmp = yanit_yol.with_suffix(".tmp")
                tmp.write_text(json.dumps(sonuc, ensure_ascii=False), encoding="utf-8")
                os.replace(tmp, yanit_yol)
                izin_ayarla(yanit_yol)
            simdi = time.time()
            for y in KUYRUK.glob("yanit_*.json"):
                if simdi - y.stat().st_mtime > 120:
                    y.unlink(missing_ok=True)
        except Exception as e:
            print("dongu hatasi:", maskele(str(e))[:160], flush=True)
        time.sleep(0.3)


if __name__ == "__main__":
    main()
