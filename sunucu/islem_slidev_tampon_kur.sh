#!/bin/bash
# Tampon: Slidev (MIT) sunum aracı. Docker kapsayıcısında, /opt/tampon/slidev. Başka sisteme dokunmaz, dışarı port açmaz.
D=/opt/tampon/slidev; mkdir -p $D/proje $D/cikti; cp sunucu/slidev/slides.md $D/proje/
IMG=mcr.microsoft.com/playwright:v1.49.1-noble
cat > $D/is.sh <<'IS'
#!/bin/bash
D=/opt/tampon/slidev; cd $D; : > sonuc.txt; t0=$(date +%s)
docker pull -q mcr.microsoft.com/playwright:v1.49.1-noble >>sonuc.txt 2>&1
docker rm -f slidev-tampon >/dev/null 2>&1
docker run --rm --name slidev-tampon -m 2g --cpus 2 -v $D/proje:/work -w /work mcr.microsoft.com/playwright:v1.49.1-noble bash -c '
 [ -f package.json ] || npm init -y >/dev/null
 npm i -s --no-audit --no-fund @slidev/cli @slidev/theme-default playwright-chromium@1.49.1 >/work/npm.log 2>&1 || { tail -15 /work/npm.log; exit 1; }
 echo "slidev $(npx slidev --version 2>/dev/null)"
 npx slidev build slides.md --out dist >/work/build.log 2>&1 && echo "build tamam" || { tail -15 /work/build.log; exit 1; }
 npx slidev export slides.md --output sunum.pdf --timeout 120000 >/work/pdf.log 2>&1 && echo "pdf tamam" || tail -15 /work/pdf.log
 npx slidev export slides.md --format pptx --output sunum.pptx --timeout 120000 >/work/pptx.log 2>&1 && echo "pptx tamam" || tail -15 /work/pptx.log
' >>sonuc.txt 2>&1
echo "kod $? · $(( $(date +%s)-t0 )) sn" >>sonuc.txt
cp -r proje/dist proje/sunum.pdf proje/sunum.pptx cikti/ 2>/dev/null; ls -la cikti >>sonuc.txt; echo BITTI >>sonuc.txt
IS
chmod +x $D/is.sh; nohup $D/is.sh >/dev/null 2>&1 &
echo "NOT: Slidev kurulumu arka planda başladı ($D)"
