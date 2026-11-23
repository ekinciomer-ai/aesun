#!/bin/bash
# Tampon: Polyfork low-poly 3D model kataloğu (indeks serbest; modeller polyfork.dev/licensing: kişisel+ticari kullanım, atıf gerekmez).
# Sadece veri indirir (GLB + katalog). Hiçbir kod çalıştırmaz, port açmaz, başka sisteme dokunmaz. Yer: /opt/tampon/polyfork
D=/opt/tampon/polyfork; mkdir -p $D/glb $D/mjs $D/kapak /opt/tampon/disari; cd $D
rm -rf katalog; git clone -q --depth 1 https://github.com/lucas-martinic/polyfork-catalog.git katalog && echo "NOT: katalog indi ($(du -sh katalog | cut -f1))" || echo "NOT: HATA katalog inmedi"
UA="Mozilla/5.0 (aesun-tampon)"
for M in pop-top-camper-van-62a322 solar-array-rack-789c93 tracked-excavator-8ebd3c mobile-crane-671d3f articulated-dump-truck-ee50f3 pickup-truck-a34bf2 cargo-container-fd73bc arched-stone-bridge-9474cf; do
  curl -sfL -m 60 -A "$UA" -o glb/$M.glb https://polyfork.dev/cdn/$M.glb
  B=$(head -c4 glb/$M.glb 2>/dev/null)
  if [ "$B" = "glTF" ]; then echo "NOT: $M glb tamam $(stat -c%s glb/$M.glb) bayt"; else echo "NOT: HATA $M glb değil/inmedi"; rm -f glb/$M.glb; fi
  curl -sfL -m 30 -A "$UA" -o kapak/$M.png "https://polyfork.dev/files/$M/renders/hero.png" || rm -f kapak/$M.png
done
# Güvenlik: örnek modül kodu yalnız indirilip okunur (çalıştırılmaz) — dış bağlantı/fetch/eval aranır
curl -sfL -m 30 -A "$UA" -o mjs/van.mjs https://polyfork.dev/cdn/pop-top-camper-van-62a322.mjs && {
  echo "NOT: van.mjs $(stat -c%s mjs/van.mjs) bayt; import satırları: $(grep -oE "from ['\"][^'\"]+['\"]" mjs/van.mjs | sort -u | tr '\n' ' ')"
  echo "NOT: şüpheli çağrı sayısı (fetch/eval/XMLHttpRequest/WebSocket/localStorage/document.cookie): $(grep -cE 'fetch\(|eval\(|XMLHttpRequest|WebSocket|localStorage|document\.cookie|new Function' mjs/van.mjs)"
}
curl -sfL -m 30 -A "$UA" -o lisans.html https://polyfork.dev/licensing && echo "NOT: lisans sayfası kaydedildi"
tar czf /opt/tampon/disari/polyfork.tgz glb kapak mjs lisans.html katalog/LICENSE.md 2>/dev/null && echo "NOT: paket hazır $(du -h /opt/tampon/disari/polyfork.tgz | cut -f1)"
echo "NOT: tampon toplam $(du -sh $D | cut -f1)"
