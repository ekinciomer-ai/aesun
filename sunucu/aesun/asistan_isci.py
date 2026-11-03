#!/usr/bin/env python3
"""Merkez Sunucu (159.198.76.80) Antigravity Tam Yetkili Sunucu Asistanı & Canlı YouTube Komut İşçisi.

aesun-api kapsayıcısı (/veri/asistan/kuyruk) üzerinden gelen yönetici (Ömer) onaylı
istekleri root yetkisiyle ve tam serbestlikle işler:
- Kod Okuma / Düzenleme / GitHub Push & Canlı Yayınlama (/opt/aesun/kod_aesun)
- Canlı YouTube API yönetimi (Antik Stüdyo TR & Ancient Studio EN): listeleme, planlama,
  başlık/açıklama/gizlilik değiştirme, silme, yorum okuma/yanıtlama, URL veya sunucu dosyasından yükleme
- Doğrudan Merkez Sunucu (159.198.76.80) kabuk/komut çalıştırma (docker, systemctl, git, dosya, log)
- Çok Adımlı AI Araç Çağırma (Multi-Turn Tool-Calling) motoru (Claude / OpenAI / GitHub Models / Gemini)
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
KANALLAR = {
    "TR": ("UC77LyY3gqWmBNAKp2lbsGBg", "Antik Stüdyo"),
    "EN": ("UCFLJUlhUSgjcLbp9ad_t9PQ", "Ancient Studio"),
}

GIZLI_DESEN = re.compile(
    r"(AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|"
    r"sk-[0-9A-Za-z_-]{20,}|ya29\.[0-9A-Za-z_-]{20,}|1//[0-9A-Za-z_-]{20,}|"
    r"GOCSPX-[0-9A-Za-z_-]{15,})"
)


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


def sunucu_komut_calistir(komut: str, sure_sn: int = 45) -> str:
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
            timeout=min(max(sure_sn, 5), 90),
        )
        cikti = ((p.stdout or "") + ("\n" + p.stderr if p.stderr else "")).strip()
        cikti = maskele(cikti)
        if not cikti:
            cikti = f"(Komut tamamlandı, çıkış kodu: {p.returncode})"
        return f"💻 **Sunucu Komut Çıktısı (`exit={p.returncode}`):**\n```\n{cikti[:3500]}\n```"
    except subprocess.TimeoutExpired:
        return "⏱️ Komut zaman aşımına uğradı (90 sn)."
    except Exception as e:
        return f"❌ Komut hatası: {maskele(str(e))}"


def kod_dosya_oku(yol: str, baslangic: int = 1, bitis: int = 250) -> str:
    hedef = (KOD_DIR / yol.lstrip("/")).resolve()
    if not str(hedef).startswith(str(KOD_DIR.resolve())) or not hedef.is_file():
        return f"Dosya bulunamadı: {yol}"
    satirlar = hedef.read_text(encoding="utf-8", errors="replace").splitlines()
    b1 = max(1, int(baslangic or 1))
    b2 = min(len(satirlar), int(bitis or (b1 + 250)))
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


def kod_dosya_yaz(yol: str, icerik: str) -> str:
    hedef = (KOD_DIR / yol.lstrip("/")).resolve()
    if not str(hedef).startswith(str(KOD_DIR.resolve())):
        return "Geçersiz dosya yolu."
    hedef.parent.mkdir(parents=True, exist_ok=True)
    hedef.write_text(icerik, encoding="utf-8")
    return f"✅ {yol} yazıldı ({len(icerik)} karakter)."


def kod_yayinla(commit_mesaji: str = "asistan: sunucu uzerinden guncelleme") -> str:
    if not KOD_DIR.is_dir():
        return "Hata: /opt/aesun/kod_aesun deposu bulunamadı."
    komut = (
        "git pull --rebase --autostash origin main && "
        "git add -A && "
        f"git commit -m {json.dumps(commit_mesaji)} && "
        "git push origin main"
    )
    p = subprocess.run(["/bin/bash", "-c", komut], cwd=str(KOD_DIR), capture_output=True, text=True, timeout=60)
    out = maskele((p.stdout or "") + "\n" + (p.stderr or "")).strip()
    return f"🚀 Git & Canlı Dağıtım (`exit={p.returncode}`):\n{out[:1500]}"


# ==================== AI ARAÇ ÇAĞIRMA (TOOL-CALLING) MOTORU ====================
ARAC_SEMALARI = [
    {
        "type": "function",
        "function": {
            "name": "yt_durum_getir",
            "description": "Antik Stüdyo (TR) ve Ancient Studio (EN) YouTube kanallarının canlı videolarını, planlarını, abone/izlenme sayılarını ve sunucu durumunu getirir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "yenile": {"type": "boolean", "description": "YouTube API'den taze veri çekilsin mi"},
                    "yedek": {"type": "boolean", "description": "İşlem öncesi yedek alınsın mı"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "yt_video_guncelle",
            "description": "Bir YouTube videosunun başlığını, açıklamasını, yayın saatini/tarihini (Planlı) veya gizlilik durumunu (public/private/unlisted) değiştirir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vid": {"type": "string", "description": "11 haneli YouTube video ID (ör. t6cTwqVJXm0)"},
                    "dil": {"type": "string", "enum": ["TR", "EN"], "description": "Kanal dili (TR veya EN)"},
                    "baslik": {"type": "string", "description": "Yeni başlık (değişmeyecekse boş bırak)"},
                    "aciklama": {"type": "string", "description": "Yeni açıklama (değişmeyecekse boş bırak)"},
                    "tarih": {"type": "string", "description": "Planlanacak tarih YYYY-MM-DD (ör. 2026-11-05)"},
                    "saat": {"type": "string", "description": "Planlanacak Türkiye saati HH:MM (ör. 20:00)"},
                    "privacyStatus": {"type": "string", "enum": ["public", "private", "unlisted"], "description": "Hemen yayına almak için public, gizlemek için private"},
                },
                "required": ["vid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "yt_video_yukle",
            "description": "Sunucudaki bir MP4 dosyasını veya video URL'sini YouTube kanalına yükler ve isteğe bağlı olarak planlar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dil": {"type": "string", "enum": ["TR", "EN"]},
                    "url": {"type": "string", "description": "MP4 URL'si veya /opt/aesun/youtube/medya/ altındaki dosya adı"},
                    "baslik": {"type": "string"},
                    "aciklama": {"type": "string"},
                    "tarih": {"type": "string", "description": "YYYY-MM-DD"},
                    "saat": {"type": "string", "description": "HH:MM"},
                    "privacyStatus": {"type": "string", "enum": ["private", "public", "unlisted"]},
                },
                "required": ["dil", "url", "baslik"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "yt_video_sil",
            "description": "Belirtilen YouTube videosunu kanaldan siler (önce otomatik yedek alır).",
            "parameters": {
                "type": "object",
                "properties": {
                    "vid": {"type": "string"},
                    "dil": {"type": "string", "enum": ["TR", "EN"]},
                },
                "required": ["vid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "yt_yorumlari_getir",
            "description": "YouTube kanalındaki son yorumları getirir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dil": {"type": "string", "enum": ["TR", "EN"]},
                    "limit": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "yt_yoruma_yanitla",
            "description": "Bir YouTube yorumuna kanal sahibi olarak yanıt yazar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "parent_id": {"type": "string"},
                    "metin": {"type": "string"},
                    "dil": {"type": "string", "enum": ["TR", "EN"]},
                },
                "required": ["parent_id", "metin"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "kod_dosya_oku",
            "description": "aesun deposundaki (ör. docs/portal/index.html, docs/yayin/index.html, docs/asistan/index.html) bir kaynak kod dosyasının satırlarını okur.",
            "parameters": {
                "type": "object",
                "properties": {
                    "yol": {"type": "string", "description": "Depo içi dosya yolu, örn. docs/portal/index.html"},
                    "baslangic": {"type": "integer", "description": "Başlangıç satır numarası (1 tabanlı)"},
                    "bitis": {"type": "integer", "description": "Bitiş satır numarası"},
                },
                "required": ["yol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "kod_dosya_duzenle",
            "description": "aesun deposundaki bir dosyada eski_metin bloğunu yeni_metin ile değiştirir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "yol": {"type": "string"},
                    "eski_metin": {"type": "string"},
                    "yeni_metin": {"type": "string"},
                },
                "required": ["yol", "eski_metin", "yeni_metin"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "kod_yayinla",
            "description": "aesun deposunda yapılan kod değişikliklerini git commit + git push ile GitHub'a gönderir ve portal.aksarayenerji.net üzerinde canlıya alır.",
            "parameters": {
                "type": "object",
                "properties": {
                    "commit_mesaji": {"type": "string", "description": "Git commit açıklaması"},
                },
                "required": ["commit_mesaji"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "sunucu_komut_calistir",
            "description": "Merkez Sunucu (159.198.76.80) üzerinde doğrudan Linux bash komutu çalıştırır (docker, systemctl, git, python3, disk/bellek/log kontrolü, dosya işlemleri).",
            "parameters": {
                "type": "object",
                "properties": {
                    "komut": {"type": "string", "description": "Çalıştırılacak bash komutu"},
                },
                "required": ["komut"],
            },
        },
    },
]


def arac_calistir(ad: str, arg: dict) -> str:
    try:
        if ad == "yt_durum_getir":
            d = durum_guncelle(yedek_al=bool(arg.get("yedek"))) if arg.get("yenile", True) else (
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
                        "izlenme": v["izlenme"], "begeni": v["begeni"], "cozunurluk": v.get("cozunurluk", "hd")
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
            return kod_dosya_oku(arg.get("yol", ""), int(arg.get("baslangic", 1)), int(arg.get("bitis", 250)))
        if ad == "kod_dosya_duzenle":
            return kod_dosya_duzenle(arg.get("yol", ""), arg.get("eski_metin", ""), arg.get("yeni_metin", ""))
        if ad == "kod_yayinla":
            return kod_yayinla(arg.get("commit_mesaji", "asistan: sunucu uzerinden guncelleme"))
        if ad == "sunucu_komut_calistir":
            return sunucu_komut_calistir(arg.get("komut", ""))
        return f"Bilinmeyen araç: {ad}"
    except Exception as e:
        return f"Araç hatası ({ad}): {maskele(str(e))}"


def _llm_openai_tur(saglayici_url: str, anahtar: str, model: str, sistem_ozeti: str, metin: str) -> str:
    """OpenAI uyumlu uçlar (OpenAI, GitHub Models, Pollinations GPT-4o) üzerinden çok adımlı (multi-turn) araç çağırma."""
    gecmis = [{"role": "system", "content": sistem_ozeti}]
    for m in mesajlari_oku()[-8:]:
        rol = "user" if m.get("kim") in ("kullanici", "omer") else "assistant"
        ic = m.get("metin", "")[:800].strip()
        if not ic or "görev kutusuna kaydedildi" in ic:
            continue
        gecmis.append({"role": rol, "content": ic})
    gecmis.append({"role": "user", "content": metin})

    hdrs = {"Content-Type": "application/json", "User-Agent": "aesun-asistan/2.0"}
    if anahtar:
        hdrs["Authorization"] = f"Bearer {anahtar}"

    for _adim in range(5):
        govde = {"model": model, "messages": gecmis, "tools": ARAC_SEMALARI, "tool_choice": "auto", "temperature": 0.2}
        req = urllib.request.Request(saglayici_url, data=json.dumps(govde).encode("utf-8"), headers=hdrs, method="POST")
        with urllib.request.urlopen(req, timeout=55) as r:
            yanit_obj = json.loads(r.read().decode("utf-8"))
        secim = (yanit_obj.get("choices") or [{}])[0].get("message") or {}
        arac_cagrilari = secim.get("tool_calls") or []
        if not arac_cagrilari:
            ic_metin = (secim.get("content") or "").strip()
            if ic_metin:
                return ic_metin
            break
        gecmis.append(secim)
        for tc in arac_cagrilari[:5]:
            fn = tc.get("function", {}).get("name", "")
            raw_arg = tc.get("function", {}).get("arguments") or "{}"
            try:
                fargs = json.loads(raw_arg) if isinstance(raw_arg, str) else raw_arg
            except Exception:
                fargs = {}
            sonuc_str = arac_calistir(fn, fargs)
            gecmis.append({
                "role": "tool",
                "tool_call_id": tc.get("id", "call_1"),
                "name": fn,
                "content": sonuc_str[:5000],
            })
    # Son özet çağrısı (araçsız)
    govde_son = {"model": model, "messages": gecmis, "temperature": 0.2}
    req_son = urllib.request.Request(saglayici_url, data=json.dumps(govde_son).encode("utf-8"), headers=hdrs, method="POST")
    with urllib.request.urlopen(req_son, timeout=55) as rs:
        son_obj = json.loads(rs.read().decode("utf-8"))
    return ((son_obj.get("choices") or [{}])[0].get("message") or {}).get("content", "").strip()


def ai_ajan_calistir(metin: str) -> str:
    """Anthropic Claude, OpenAI, GitHub Models veya GPT-4o ucu ile çok adımlı (multi-turn) tam yetkili araç çağırma çalıştırır."""
    ortam_yukle()
    d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
    kisa_videolar = [
        f"{v['vid']} [{v['dil']}] ({v['durum']} {v.get('tarih','')} {v.get('saat','')}) {v['baslik'][:55]}"
        for v in d.get("videolar", [])[:30]
    ]
    sistem_ozeti = (
        f"Sen Aksaray Enerji & Antik Stüdyo'nun Merkez Sunucusu (159.198.76.80) üzerinde çalışan tam yetkili Antigravity Kodlama ve Sunucu Asistanısın. "
        f"Kullanıcın Ömer (yönetici). Bugün: {datetime.now(TZ).strftime('%Y-%m-%d %H:%M')} TSİ.\n"
        f"Sunucu: Bellek {d.get('sunucu',{}).get('bellek','?')}, Disk {d.get('sunucu',{}).get('disk','?')}.\n"
        f"Sunucuda `/opt/aesun/kod_aesun` altında `ekinciomer-ai/aesun` deposu klonlu ve yazmaya hazırdır:\n"
        f"- Kurumsal Portal kodu: `docs/portal/index.html`\n"
        f"- Sunucu Asistanı kodu: `docs/asistan/index.html`\n"
        f"- Yayın Takibi kodu: `docs/yayin/index.html` ve `docs/yayin/yayin.json`\n"
        f"Mevcut YouTube Videoları:\n" + "\n".join(kisa_videolar) + "\n\n"
        "KURALLAR:\n"
        "1. Ömer senden bir arayüz/kod değişikliği, YouTube işlemi veya sunucu işlemi istediğinde ASLA 'yapamam' veya 'kısıtlıyım' deme; "
        "doğrudan araçlarını (`kod_dosya_oku`, `kod_dosya_duzenle`, `kod_yayinla`, `sunucu_komut_calistir`, `yt_video_guncelle` vb.) kullanarak işlemi ŞİMDİ gerçekleştir!\n"
        "2. Kod değiştirdiğinde mutlaka `kod_yayinla` aracını çağırarak GitHub'a pushla.\n"
        "3. Yanıtlarını Türkçe, samimi, net ve doğrudan tut."
    )

    ant_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if ant_key:
        ant_tools = [
            {
                "name": t["function"]["name"],
                "description": t["function"]["description"],
                "input_schema": t["function"]["parameters"],
            }
            for t in ARAC_SEMALARI
        ]
        ant_msgs = []
        for m in mesajlari_oku()[-8:]:
            rol = "user" if m.get("kim") in ("kullanici", "omer") else "assistant"
            ic = m.get("metin", "")[:800].strip()
            if not ic or "görev kutusuna kaydedildi" in ic:
                continue
            if not ant_msgs or ant_msgs[-1]["role"] != rol:
                ant_msgs.append({"role": rol, "content": ic})
        if ant_msgs and ant_msgs[-1]["role"] == "user":
            ant_msgs[-1]["content"] += "\n" + metin
        else:
            ant_msgs.append({"role": "user", "content": metin})
        if ant_msgs and ant_msgs[0]["role"] != "user":
            ant_msgs = ant_msgs[1:]

        aday_modeller = [
            os.environ.get("CK_MODEL", "").strip(),
            "claude-sonnet-4-5-20250929",
            "claude-sonnet-4-20250514",
            "claude-3-7-sonnet-20250219",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-haiku-20240307",
        ]
        secilen_model = None
        ilk_yanit = None
        for m_ad in aday_modeller:
            if not m_ad:
                continue
            try:
                req = urllib.request.Request(
                    "https://api.anthropic.com/v1/messages",
                    data=json.dumps({
                        "model": m_ad,
                        "max_tokens": 3000,
                        "system": sistem_ozeti,
                        "tools": ant_tools,
                        "messages": ant_msgs,
                    }).encode("utf-8"),
                    headers={
                        "x-api-key": ant_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=55) as r:
                    ilk_yanit = json.loads(r.read().decode("utf-8"))
                    secilen_model = m_ad
                    break
            except urllib.error.HTTPError as he:
                if he.code in (400, 404):
                    continue
                break
            except Exception:
                continue

        if ilk_yanit and secilen_model:
            try:
                resp_d = ilk_yanit
                for _adim in range(6):
                    content_blocks = resp_d.get("content", [])
                    tool_uses = [b for b in content_blocks if b.get("type") == "tool_use"]
                    if not tool_uses:
                        metin_out = "\n".join(b.get("text", "") for b in content_blocks if b.get("type") == "text").strip()
                        if metin_out:
                            return metin_out
                        break
                    ant_msgs.append({"role": "assistant", "content": content_blocks})
                    tool_results = []
                    for tu in tool_uses[:6]:
                        sonuc_str = arac_calistir(tu["name"], tu.get("input") or {})
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tu["id"],
                            "content": sonuc_str[:6000],
                        })
                    ant_msgs.append({"role": "user", "content": tool_results})
                    req_next = urllib.request.Request(
                        "https://api.anthropic.com/v1/messages",
                        data=json.dumps({
                            "model": secilen_model,
                            "max_tokens": 3000,
                            "system": sistem_ozeti,
                            "tools": ant_tools,
                            "messages": ant_msgs,
                        }).encode("utf-8"),
                        headers={
                            "x-api-key": ant_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        method="POST",
                    )
                    with urllib.request.urlopen(req_next, timeout=55) as rn:
                        resp_d = json.loads(rn.read().decode("utf-8"))
                metin_son = "\n".join(b.get("text", "") for b in resp_d.get("content", []) if b.get("type") == "text").strip()
                if metin_son:
                    return metin_son
            except Exception:
                pass

    # OpenAI / GitHub Models / Pollinations GPT-4o çok adımlı araç çağırma
    oai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    gh_key = (os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or os.environ.get("AESUN_GH_OKU") or "").strip()
    aday_uclar = [
        ("https://api.openai.com/v1/chat/completions", oai_key, "gpt-4o-mini"),
        ("https://models.inference.ai.azure.com/chat/completions", gh_key, "gpt-4o"),
        ("https://models.github.ai/inference/chat/completions", gh_key, "openai/gpt-4o-mini"),
        ("https://text.pollinations.ai/openai", "", "openai"),
    ]
    for u_url, u_key, u_mod in aday_uclar:
        if u_url != "https://text.pollinations.ai/openai" and not u_key:
            continue
        try:
            cvp = _llm_openai_tur(u_url, u_key, u_mod, sistem_ozeti, metin)
            if cvp:
                return cvp
        except Exception:
            continue

    return ""


def akilli_komut_yorumla(metin: str) -> str:
    m_str = metin.strip()
    m_low = m_str.lower()

    if m_str.startswith(("!", "$", "/komut ", "/sh ", "komut:")):
        cmd = re.sub(r"^(!|\$|/komut\s+|/sh\s+|komut:\s*)", "", m_str, flags=re.I).strip()
        return sunucu_komut_calistir(cmd)

    ai_cevap = ai_ajan_calistir(m_str)
    if ai_cevap:
        return ai_cevap

    vid_eslesme = re.search(r"\b([A-Za-z0-9_-]{11})\b", m_str)
    saat_eslesme = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", m_str)
    tarih_eslesme = re.search(r"\b(202\d-\d{2}-\d{2})\b", m_str)

    if vid_eslesme and vid_eslesme.group(1) not in ("AntikStudyo", "AncientStud"):
        vid = vid_eslesme.group(1)
        d = json.loads(DURUM_DOSYA.read_text(encoding="utf-8")) if DURUM_DOSYA.exists() else durum_guncelle()
        v = next((x for x in d.get("videolar", []) if x["vid"] == vid), None)
        if v:
            if any(k in m_low for k in ("sil", "kaldır")):
                return video_sil(vid, v["dil"])
            if any(k in m_low for k in ("yayına al", "herkese açık", "public yap", "hemen yayınla")):
                return "✅ " + video_guncelle({"vid": vid, "dil": v["dil"], "privacyStatus": "public"})
            if any(k in m_low for k in ("gizle", "özel yap", "private yap", "taslağa çek")):
                return "✅ " + video_guncelle({"vid": vid, "dil": v["dil"], "privacyStatus": "private"})
            m_bas = re.search(r"(?:başlığı|başlığını|basligi|title)\s*[:=]?\s*[\"“']?(.+?)[\"”']?$", m_str, re.I)
            if m_bas:
                return "✅ " + video_guncelle({"vid": vid, "dil": v["dil"], "baslik": m_bas.group(1).strip()})
            if saat_eslesme:
                saat_str = f"{int(saat_eslesme.group(1)):02d}:{saat_eslesme.group(2)}"
                if tarih_eslesme:
                    tarih_str = tarih_eslesme.group(1)
                elif "yarın" in m_low or "yarin" in m_low:
                    tarih_str = (datetime.now(TZ) + timedelta(days=1)).strftime("%Y-%m-%d")
                elif "bugün" in m_low or "bugun" in m_low:
                    tarih_str = datetime.now(TZ).strftime("%Y-%m-%d")
                else:
                    tarih_str = v.get("tarih") or datetime.now(TZ).strftime("%Y-%m-%d")
                return "✅ " + video_guncelle({"vid": vid, "dil": v["dil"], "tarih": tarih_str, "saat": saat_str})

    if "yorum" in m_low:
        dil = "EN" if ("en" in m_low.split() or "ancient" in m_low) else "TR"
        return yorumlari_getir(dil)

    if any(k in m_low for k in ("docker", "kapsayıcı", "konteyner", "container", "servis", "systemctl")):
        return sunucu_komut_calistir("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' && echo '---' && systemctl is-active aesun-asistan.service")
    if any(k in m_low for k in ("disk", "bellek", "ram", "cpu", "uptime", "yük")):
        return sunucu_komut_calistir("uptime && echo '---' && free -h && echo '---' && df -h /")

    d = durum_guncelle(yedek_al=("yedek" in m_low))
    vids = d.get("videolar", [])
    planli = [v for v in vids if v["durum"] == "Planlı"]
    ozel = [v for v in vids if v["durum"] == "Özel"]
    yayinda = [v for v in vids if v["durum"] == "Yayında"]
    satirlar = [
        f"📡 **Merkez Sunucu (159.198.76.80) Canlı Raporu ({d['guncellendi'][11:16]} TSİ):**",
        f"- **Sunucu:** Bellek {d['sunucu'].get('bellek', '?')} · Disk {d['sunucu'].get('disk', '?')}",
        f"- **YouTube Toplam:** {len(planli)} Planlı · {len(ozel)} Özel/Taslak · {len(yayinda)} Yayında",
        "",
        "**Yaklaşan Planlı Videolar:**",
    ]
    for v in sorted(planli, key=lambda x: (x.get("tarih", ""), x.get("saat", "")))[:12]:
        satirlar.append(f"- `{v['tarih']} {v['saat']}` [{v['dil']}] **{v['baslik'][:50]}** (`{v['vid']}`)")
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
    son_otomatik = 0.0
    print(f"asistan_isci (tam yetkili AI) basladi: {KOK}", flush=True)
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
        time.sleep(0.4)


if __name__ == "__main__":
    main()
