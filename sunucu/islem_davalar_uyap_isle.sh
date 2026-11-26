#!/bin/bash
# UYAP'tan doğrudan gelen evrak paketlerini (gelen/<ad>/ şifreli parçalar + TAMAM) Davalar sunumuna EKLER (merge, hiçbir evrak silinmez).
# Her paket: tar (meta.json + e/<evrakId>.<uzantı>). meta.json: {etiket, esas, birim, konu, grup, gkod, durusma, evrak:[...]}.
# Çevirme: UDF → metin, TIF → PDF (Pillow). Açık metin yalnız ağsız, geçici kapsayıcıda bellekte/tmpfs'te işlenir; host diskine yazılmaz.
# İşlenen paket klasörü 'islendi/' altına taşınır (şifreli kalır); sunum dizininin önceki hâli dizin.sifreli.onceki'de durur.
set -euo pipefail
D=/opt/aesun/ozel/davalar; S="$D/sunum"; G="$D/gelen"
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA anahtar yok"; exit 1; }
[ -f "$S/dizin.sifreli" ] || { echo "NOT: HATA mevcut dizin yok"; exit 1; }
HAZIR=$(for k in "$G"/*/; do [ -f "$k/TAMAM" ] && basename "$k"; done 2>/dev/null | tr '\n' ' ')
[ -n "$HAZIR" ] || { echo "NOT: işlenecek tamamlanmış paket yok"; ls -la "$G" | tail -n +2 | sed 's/^/NOT: /'; exit 0; }
echo "NOT: işlenecek paketler: $HAZIR"
T=$(mktemp -d /root/uyap_isle.XXXXXX); trap 'rm -rf "$T"' EXIT
cat > "$T/Dockerfile" <<'DF'
FROM python:3.12-slim
RUN pip install --no-cache-dir cryptography==43.0.3 pillow==11.0.0 && useradd -u 1001 aesun
USER aesun
DF
docker build -q -t aesun-uyap-isle "$T" >/dev/null && echo "NOT: işleme görüntüsü hazır"
cat > "$T/isle.py" <<'P'
import os, io, json, re, tarfile, zipfile, hashlib, sys
from pathlib import Path
from xml.etree import ElementTree as ET
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from PIL import Image
key = Path("/k").read_bytes()[:32]; A = AESGCM(key)
def coz(b): return A.decrypt(b[:12], b[12:], None)
def sif(b):
    n = os.urandom(12); return n + A.encrypt(n, b, None)
S = Path("/sunum"); G = Path("/gelen")
dizin = json.loads(coz((S / "dizin.sifreli").read_bytes()))
dizin.setdefault("davalar", []); dizin.setdefault("evrak", {})
(S / "e").mkdir(exist_ok=True)
def udf_metin(b):
    try:
        root = ET.fromstring(zipfile.ZipFile(io.BytesIO(b)).read("content.xml"))
        c = root.find("content"); t = (c.text or "") if c is not None else ""
        return t.replace("\r", "").strip() or None
    except Exception: return None
def tif_pdf(b):
    try:
        im = Image.open(io.BytesIO(b)); kar = []
        i = 0
        while True:
            try: im.seek(i)
            except EOFError: break
            f = im.convert("RGB")
            if max(f.size) > 2400:
                r = 2400 / max(f.size); f = f.resize((int(f.size[0] * r), int(f.size[1] * r)))
            kar.append(f); i += 1
        o = io.BytesIO(); kar[0].save(o, "PDF", save_all=True, append_images=kar[1:], resolution=150, quality=70); return o.getvalue()
    except Exception: return None
def tarih(s):
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", s or ""); return f"{m.group(1)}.{m.group(2)}.{m.group(3)}" if m else ""
def sk(x):
    t = x.get("tarih") or ""; return (t[6:10] + t[3:5] + t[0:2]) if t else ""
ozet = []
for ad in sys.argv[1:]:
    k = G / ad
    parca = sorted(k.glob("*.sifreli"))
    ham = b"".join(coz(p.read_bytes()) for p in parca)
    tf = tarfile.open(fileobj=io.BytesIO(ham)); del ham
    meta = json.load(tf.extractfile("meta.json"))
    klasor = {}; n = bos = 0
    for e in meta["evrak"]:
        if e.get("hata") or not e.get("boy"): bos += 1; continue
        try: b = tf.extractfile(f"e/{e['id']}.{e['ext']}").read()
        except KeyError: bos += 1; continue
        ext = (e.get("ext") or "bin").lower(); tur = ext; veri = b
        if ext == "udf":
            t = udf_metin(b)
            if t: tur, veri = "txt", t.encode()
        elif ext in ("tif", "tiff"):
            p = tif_pdf(b)
            if p: tur, veri = "pdf", p
        elif ext == "jpeg": tur = "jpg"
        elif ext not in ("pdf", "html", "png", "jpg", "txt", "zip"): tur = "udf" if ext == "udf" else ("zip" if ext in ("rar", "zip") else "pdf" if veri[:4] == b"%PDF" else ext)
        eid = hashlib.sha1(("uyap:" + e["id"]).encode()).hexdigest()[:24]
        (S / "e" / f"{eid}.sifreli").write_bytes(sif(veri))
        dizin["evrak"][eid] = {"tur": tur}
        yol = [y for y in (e.get("yol") or "").split(" / ") if y]
        isim = e.get("ad") or ""
        # klasör = evrak türü (tarih atılmış ad); ekler ana evrakın türüne gider
        taban = yol[-2] if (re.fullmatch(r"Ek \d+", isim) and len(yol) >= 2) else isim
        kl = re.sub(r"\s*\d{2}/\d{2}/\d{4}\s*$", "", taban).strip() or "Diğer"
        if re.fullmatch(r"Ek \d+", isim) and len(yol) >= 2: isim = yol[-2] + " — " + isim
        klasor.setdefault(kl, []).append({"id": eid, "ad": isim, "tur": tur, "tarih": tarih(isim) or (tarih(yol[-2]) if len(yol) > 1 else "")})
        n += 1
    kls = []
    for kad, v in klasor.items():
        v.sort(key=sk, reverse=True); kls.append({"ad": kad, "evraklar": v})
    ONCE = ["Dava Dilekçesi", "Cevap Dilekçesi", "Cevaba Cevap Dilekçesi", "İkinci Cevap Dilekçesi", "Duruşma Zaptı", "Ön İnceleme Zaptı", "Tensip Zaptı", "Bilirkişi Raporu", "Bilirkişi Ek Raporu", "Karar", "Gerekçeli Karar"]
    kls.sort(key=lambda x: (ONCE.index(x["ad"]) if x["ad"] in ONCE else 99, -len(x["evraklar"]), x["ad"]))
    tum = sorted([x for kk in kls for x in kk["evraklar"]], key=sk, reverse=True)
    dava = {kk: meta.get(kk, "") for kk in ("esas", "birim", "konu", "grup", "gkod", "durusma", "taraflar", "ozet")}
    dava["baslik"] = meta.get("baslik") or (meta.get("birim", "") + " " + meta.get("esas", "")).strip()
    dava["guncelleme"] = meta.get("guncelleme", ""); dava["klasorler"] = kls
    dava["son"] = [{"id": x["id"], "ad": x["ad"], "tarih": x["tarih"], "tur": x["tur"]} for x in tum[:5]]
    idx = {str(d.get("esas", "")): i for i, d in enumerate(dizin["davalar"])}
    if dava["esas"] in idx: dizin["davalar"][idx[dava["esas"]]] = dava
    else: dizin["davalar"].append(dava)
    ozet.append(f"{ad}: {n} evrak eklendi, {bos} boş/hatalı, klasör: " + ", ".join(f"{x['ad']} ({len(x['evraklar'])})" for x in kls))
if os.environ.get("GUNCEL"): dizin["guncel"] = os.environ["GUNCEL"]
tmp = S / "dizin.sifreli.yeni"; tmp.write_bytes(sif(json.dumps(dizin, ensure_ascii=False).encode()))
try: (S / "dizin.sifreli").replace(S / "dizin.sifreli.onceki")
except Exception: pass
tmp.replace(S / "dizin.sifreli")
for o in ozet: print(o)
print(f"toplam dava {len(dizin['davalar'])}, toplam evrak {len(dizin['evrak'])}")
P
chmod a+r "$T/isle.py"
docker run --rm --network none --user 1001 --memory 1500m -v "$D/anahtar.bin":/k:ro -v "$S":/sunum -v "$G":/gelen:ro -v "$T/isle.py":/i.py:ro \
  -e GUNCEL="$(TZ=Europe/Istanbul date '+%d.%m.%Y %H:%M')" aesun-uyap-isle python /i.py $HAZIR | sed 's/^/NOT: /'
mkdir -p "$G/islendi"; for a in $HAZIR; do mv "$G/$a" "$G/islendi/${a}_$(date +%Y%m%d%H%M)"; done
chown -R 1001:1001 "$S" "$G"; chmod 700 "$S" "$S/e"
docker restart aesun-api >/dev/null && sleep 6
echo "NOT: yetkisiz istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/dizin) (401 beklenir)"
