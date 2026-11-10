#!/bin/bash
# Tampon: Slidev (MIT) sunum aracı. Ayrık Docker kapsayıcısında çalışır (SSH kapanınca durmaz), /opt/tampon/slidev.
# Dışarı port açmaz, başka sisteme dokunmaz. Sonuç: islem slidev_bak
D=/opt/tampon/slidev; mkdir -p $D/proje /opt/tampon/disari
rm -rf $D/proje/ornek $D/proje/taseli; mkdir -p $D/proje/ornek && cp sunucu/slidev/slides.md $D/proje/ornek/ && cp -r sunucu/slidev/taseli $D/proje/
IMG=mcr.microsoft.com/playwright:v1.58.2-noble
docker image inspect $IMG >/dev/null 2>&1 || docker pull -q $IMG >/dev/null
cat > $D/proje/calis.sh <<'IS'
#!/bin/bash
cd /work; t0=$(date +%s); echo "başladı $(date +%H:%M)"
[ -f package.json ] || npm init -y >/dev/null
[ -d node_modules/@slidev/cli ] || npm i -s --no-audit --no-fund @slidev/cli @slidev/theme-default playwright-chromium@1.58.2 >npm.log 2>&1 || { tail -15 npm.log; echo BITTI; exit 1; }
echo "slidev $(npx slidev --version 2>/dev/null) kuruldu ($(( $(date +%s)-t0 )) sn)"
for k in taseli ornek; do cd /work/$k; ln -sfn /work/node_modules node_modules; S=/work/node_modules/.bin/slidev
 $S build slides.md --out dist --base ./ >b.log 2>&1 && echo "$k web tamam" || tail -8 b.log
 $S export slides.md --output sunum.pdf --timeout 180000 >p.log 2>&1 && echo "$k pdf tamam" || tail -8 p.log
 $S export slides.md --format pptx --output sunum.pptx --timeout 180000 >x.log 2>&1 && echo "$k pptx tamam" || tail -8 x.log
 [ $k = taseli ] && { $S export slides.md --format png --output png --timeout 180000 >g.log 2>&1 && echo "$k png tamam" || tail -8 g.log; }
 tar czf /disari/slidev_$k.tgz --exclude=node_modules dist sunum.pdf sunum.pptx $( [ -d png ] && echo png ) 2>/dev/null
done
echo "toplam $(( $(date +%s)-t0 )) sn"; echo BITTI
IS
chmod +x $D/proje/calis.sh
docker rm -f slidev-tampon >/dev/null 2>&1
docker run -d --name slidev-tampon -m 3g --cpus 2 -v $D/proje:/work -v /opt/tampon/disari:/disari $IMG bash -c '/work/calis.sh > /work/sonuc.txt 2>&1' >/dev/null && echo "NOT: Slidev kapsayıcısı başladı (ayrık)" || echo "NOT: HATA kapsayıcı başlamadı"
