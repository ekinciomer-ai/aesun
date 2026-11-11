"""Keşif → görsel/video araçları için "üreticinin kendi örneği" ve donanım ihtiyacı: docs/kesif/uretici_ornek.json

Gerçek tampon denemesi yapılamayan (ör. GPU isteyen) araçlar için aracın README'sindeki demo görsel/videoların
ADRESLERİ toplanır. Dosyalar kopyalanmaz (telif): sayfa kaynağından gösterir ve "üreticinin örneği" diye etiketler.
Donanım eklendikçe gerçek test tampon/deneme ile yapılır; o zaman kartta bizim örneğimiz öne geçer.
Yapay zekâ kullanmaz. GitHub API (GITHUB_TOKEN/gh) ile çalışır; hata olursa eski kaydı korur.
"""
import base64, json, os, re, subprocess, sys, time

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI = os.path.join(KOK, "docs", "kesif", "uretici_ornek.json")
GRUPLAR = ("gorsel", "edit")
ROZET = re.compile(r"shields\.io|badge|badgen|star-history|stars?\.svg|contrib\.rocks|codecov|travis|circleci|"
                   r"github\.com/.+/actions|readthedocs|discord|twitter|x\.com|sponsor|buymeacoffee|ko-fi|logo|icon|"
                   r"trendshift|producthunt|deepwiki|visitor|hits|wechat|qr|avatar|emoji|\.ico$", re.I)
MEDYA = re.compile(r"\.(png|jpe?g|gif|webp|mp4|webm)(\?|$)", re.I)
GPU = re.compile(r"\b(cuda|vram|gpu|nvidia|rtx|a100|h100|\d+\s?gb (of )?vram)\b", re.I)


def gh(yol):
    r = subprocess.run(["gh", "api", yol], capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout) if r.returncode == 0 else None


def adresler(md, sahip, depo, dal):
    bul = re.findall(r"!\[[^\]]*\]\(\s*<?([^)\s>]+)", md)
    bul += re.findall(r"<(?:img|video|source)[^>]+src=[\"']([^\"']+)", md, re.I)
    bul += re.findall(r"(https://github\.com/user-attachments/assets/[0-9a-f-]{36})", md)
    bul += re.findall(r"(https://github\.com/[\w.-]+/[\w.-]+/assets/\d+/[0-9a-f-]{36})", md)
    cikis = []
    for u in bul:
        u = u.strip()
        if u.startswith("./"):
            u = u[2:]
        if not u.startswith("http"):
            u = f"https://raw.githubusercontent.com/{sahip}/{depo}/{dal}/{u.lstrip('/')}"
        u = re.sub(r"https://github\.com/([^/]+)/([^/]+)/(?:blob|raw)/", r"https://raw.githubusercontent.com/\1/\2/", u)
        if ROZET.search(u):
            continue
        ek = "assets" in u and "github.com" in u
        if not (MEDYA.search(u) or ek):
            continue
        tur = "video" if re.search(r"\.(mp4|webm)", u, re.I) or (ek and "user-attachments" in u and not MEDYA.search(u)) else "img"
        if u not in [c["f"] for c in cikis]:
            cikis.append({"f": u, "tur": tur})
    return cikis[:4]


def main():
    katalog = json.load(open(os.path.join(KOK, "docs", "kesif", "katalog.json"), encoding="utf-8"))
    eski = {}
    try:
        eski = json.load(open(CIKTI, encoding="utf-8"))
    except Exception:
        pass
    sonuc = {}
    araclar = [x for x in katalog["kayit"] if x["g"] in GRUPLAR and "github.com/" in (x.get("u") or "")]
    for x in araclar:
        m = re.match(r"https://github\.com/([\w.-]+)/([\w.-]+)", x["u"])
        if not m:
            continue
        sahip, depo = m.group(1), m.group(2).removesuffix(".git")
        r = gh(f"repos/{sahip}/{depo}/readme")
        if not r:
            if x["ad"] in eski:
                sonuc[x["ad"]] = eski[x["ad"]]
            continue
        md = base64.b64decode(r.get("content", "")).decode("utf-8", "replace")
        dal = (re.search(r"raw\.githubusercontent\.com/[^/]+/[^/]+/([^/]+)/", r.get("download_url") or "") or [None, "HEAD"])[1]
        gpu = len(GPU.findall(md))
        sonuc[x["ad"]] = {"dosyalar": adresler(md, sahip, depo, dal),
                          "donanim": "gpu" if gpu >= 2 else "cpu",
                          "kaynak": x["u"]}
        time.sleep(0.2)
    if not sonuc and eski:
        print("hiç README okunamadı; eski kayıt korunuyor"); return 0
    with open(CIKTI, "w", encoding="utf-8") as f:
        json.dump(sonuc, f, ensure_ascii=False, indent=1)
    ornekli = sum(1 for v in sonuc.values() if v["dosyalar"])
    print(f"uretici_ornek.json: {len(sonuc)} araç, {ornekli} tanesinde üretici örneği, "
          f"{sum(v['donanim'] == 'gpu' for v in sonuc.values())} GPU isteyen")


if __name__ == "__main__":
    sys.exit(main())
