#!/bin/bash
# Tampon: Taşeli GES iş planı sunumu (Slidev) → web, PDF, PowerPoint. Kurulu Slidev'i (/opt/tampon/slidev/proje) kullanır.
D=/opt/tampon/slidev; P=$D/proje; T=$P/taseli
[ -d $P/node_modules/@slidev/cli ] || { echo "NOT: HATA önce slidev_tampon_kur bitmeli"; exit 1; }
rm -rf $T && mkdir -p $T && cp -r sunucu/slidev/taseli/. $T/
cat > $D/is_taseli.sh <<'IS'
#!/bin/bash
D=/opt/tampon/slidev; : > $D/sonuc_taseli.txt; t0=$(date +%s)
docker run --rm --name slidev-taseli -m 2g --cpus 2 -v $D/proje:/work -w /work/taseli mcr.microsoft.com/playwright:v1.49.1-noble bash -c '
 S=/work/node_modules/.bin/slidev; ln -sfn /work/node_modules node_modules
 $S build slides.md --out dist --base ./ >b.log 2>&1 && echo "web tamam" || { tail -12 b.log; exit 1; }
 $S export slides.md --output Taseli_GES_Sunum.pdf --timeout 180000 >p.log 2>&1 && echo "pdf tamam" || tail -12 p.log
 $S export slides.md --format pptx --output Taseli_GES_Sunum.pptx --timeout 180000 >x.log 2>&1 && echo "pptx tamam" || tail -12 x.log
 $S export slides.md --format png --output png --timeout 180000 >g.log 2>&1 && echo "png tamam" || tail -12 g.log
' >>$D/sonuc_taseli.txt 2>&1
echo "kod $? · $(( $(date +%s)-t0 )) sn" >>$D/sonuc_taseli.txt
mkdir -p /opt/tampon/disari && cd $D/proje/taseli && tar czf /opt/tampon/disari/taseli.tgz dist Taseli_GES_Sunum.pdf Taseli_GES_Sunum.pptx png 2>>$D/sonuc_taseli.txt
echo BITTI >>$D/sonuc_taseli.txt
IS
chmod +x $D/is_taseli.sh; nohup $D/is_taseli.sh >/dev/null 2>&1 &
echo "NOT: Taşeli sunumu arka planda üretiliyor"
