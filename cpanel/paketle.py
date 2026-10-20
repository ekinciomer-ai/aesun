#!/usr/bin/env python3
"""cPanel paketleri:
  dist_site/   → aksarayenerji.net          (kurumsal web sitesi)
  dist_portal/ → portal.aksarayenerji.net   (portal kökte; /monitoring/ /demo/ /saha/)
Portal oturumu tarayıcıda alan adına bağlı olduğu için portal ve uygulamalar aynı alt alandadır."""
import os, re, shutil, sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS, CP = os.path.join(KOK, "docs"), os.path.join(KOK, "cpanel")
SAHA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(KOK, "_saha")
SITE_URL, PORTAL_URL = "https://aksarayenerji.net/", "https://portal.aksarayenerji.net/"


def oku(p):
    return open(p, encoding="utf-8").read()


def yaz(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8").write(s)


def kopya(src, dst, haric=()):
    shutil.copytree(src, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns(*haric))


for d in ("dist_site", "dist_portal"):
    shutil.rmtree(os.path.join(KOK, d), ignore_errors=True)
S, P = os.path.join(KOK, "dist_site"), os.path.join(KOK, "dist_portal")

# ---- site ----
for f in ("index.html", "referanslar.html", "gundem.html", "iletisim.html", "kvkk.html", "favicon.svg"):
    s = oku(os.path.join(DOCS, f)) if f.endswith(".html") else None
    if s is None:
        os.makedirs(S, exist_ok=True); shutil.copy(os.path.join(DOCS, f), S); continue
    s = s.replace('href="portal/"', f'href="{PORTAL_URL}"').replace('href="demo/"', f'href="{PORTAL_URL}demo/"')
    s = s.replace('location.replace("monitoring/"+location.hash)', f'location.replace("{PORTAL_URL}monitoring/"+location.hash)')
    if f == "iletisim.html":   # cPanel'de form PHP ile gönderilir; GitHub sürümündeki mailto yedeği kaldırılır
        s = re.sub(r"<script>\s*\(function\(\)\{\s*var f=document\.querySelector\('form\.f'\).*?</script>", "", s, flags=re.S)
    yaz(os.path.join(S, f), s)
kopya(os.path.join(DOCS, "assets"), os.path.join(S, "assets"))
for f in (".htaccess", "robots.txt", "sitemap.xml", "iletisim.php"):
    shutil.copy(os.path.join(CP, f), S)

# ---- portal alt alanı ----
s = oku(os.path.join(DOCS, "portal", "index.html"))
s = s.replace('class="bag" href="../"', f'class="bag" href="{SITE_URL}"')
yaz(os.path.join(P, "index.html"), s)
for app in ("monitoring", "demo"):
    s = oku(os.path.join(DOCS, app, "index.html"))
    s = s.replace("../portal/", "../")
    yaz(os.path.join(P, app, "index.html"), s)
# Enerji Gündemi (portal içi derin sürüm; token'lı /portal ucunu çeker)
kopya(os.path.join(DOCS, "gundem"), os.path.join(P, "gundem"))
yaz(os.path.join(P, "gundem", "index.html"), oku(os.path.join(DOCS, "gundem", "index.html")).replace("../portal/", "../"))
# Kapasite Paneli (portal içi; TEİAŞ TM kapasite JSON'u yerel)
kopya(os.path.join(DOCS, "kapasite"), os.path.join(P, "kapasite"))
yaz(os.path.join(P, "kapasite", "index.html"), oku(os.path.join(DOCS, "kapasite", "index.html")).replace("../portal/", "../"))
kopya(SAHA, os.path.join(P, "saha"), haric=(".git", ".github", "*.md", "eski.html"))
# CAD (portal oturumuyla açılır; DWG okuyucu wasm + pdf.js yerel)
kopya(os.path.join(DOCS, "aecad"), os.path.join(P, "aecad"))
yaz(os.path.join(P, "aecad", "index.html"), oku(os.path.join(DOCS, "aecad", "index.html")).replace("../portal/", "../"))
shutil.copy(os.path.join(DOCS, "favicon.svg"), P)
# Portal alt alanı PHP 8.3 ister (str_contains, never, adlandırılmış argümanlar). cPanel sürümü .htaccess işleyicisiyle
# seçer; bu blok olmadan üst alanın (aksarayenerji.net, PHP 7.2) işleyicisi devreye girer ve api/*.php 500 verir (18 Eki).
yaz(os.path.join(P, ".htaccess"), oku(os.path.join(CP, ".htaccess")).rstrip() + """

# php -- BEGIN cPanel-generated handler, do not edit
# Set the “ea-php83” package as the default “PHP” programming language.
<IfModule mime_module>
  AddHandler application/x-httpd-ea-php83 .php .php8 .phtml
</IfModule>
# php -- END cPanel-generated handler, do not edit
""")
kopya(os.path.join(CP, "api"), os.path.join(P, "api"))   # anlık izleme deposu (canli.php)
yaz(os.path.join(P, "robots.txt"), "User-agent: *\nDisallow: /\n")

for d in (S, P):
    n = sum(len(f) for _, _, f in os.walk(d))
    print(d, n, "dosya")
kalan = [p for p in ("../portal/",) if p in oku(os.path.join(P, "monitoring", "index.html")) + oku(os.path.join(P, "demo", "index.html")) + oku(os.path.join(P, "aecad", "index.html")) + oku(os.path.join(P, "gundem", "index.html")) + oku(os.path.join(P, "kapasite", "index.html"))]
if kalan or 'href="portal/"' in oku(os.path.join(S, "index.html")):
    sys.exit("bağlantı dönüşümü eksik")
