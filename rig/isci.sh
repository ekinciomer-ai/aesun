#!/bin/bash
# Nabız + (imaj değişince bir kez) hız denemesi. Sonuçlar sunucuya rig/<ad>/ altına yazılır (rig anahtarı yalnız bu alana yazabilir).
set -u
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin   # cron yolu kısa; docker /usr/local/bin altında
K=/opt/aerig; API=https://api.aksarayenerji.net; cd $K || exit 1
AD=$(cat ad); AN=$(cat anahtar)
gonder(){ curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST -H "X-AE-Anahtar: $AN" -H 'Content-Type: application/json' \
          --data-binary @"$K/is/$1" "$API/v1/veri?a=yaz&yol=rig/$AD/$1"; }
mkdir -p is; cp deneme.sh is/
KUTU="docker run --rm --device /dev/dri -e VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/radeon_icd.x86_64.json -v $K/is:/is aerig:1"   # yalnız AMD Vulkan sürücüsü
# Vulkan aygıt sırası (Intel çıkışı da sayılır); araçlara yalnız AMD aygıtlarının sıra numaraları verilir
VKL=$($KUTU vulkaninfo 2>/dev/null | grep -iE 'deviceName *=' | sed 's/.*= *//')
GPUS=$(echo "$VKL" | grep -i -e amd -e radeon | paste -sd';')
NG=$(echo "$GPUS" | tr ';' '\n' | grep -c .)
GL=$(echo "$VKL" | awk 'tolower($0)~/amd|radeon/{printf "%s%d",(n++?",":""),NR-1}')
# VAAPI için AMD'nin render düğümü (vendor 0x1002)
RD=$(for r in /sys/class/drm/renderD*; do [ "$(cat $r/device/vendor 2>/dev/null)" = 0x1002 ] && { basename $r; break; }; done)
# deneme betiği değişince deneme yeniden yapılır
DS=$(cat deneme.sh isci.sh | sha256sum | cut -c1-12)
[ "$(cat deneme_tamam 2>/dev/null)" = "$DS" ] || rm -f deneme_tamam
# kart görünmüyorsa teşhis: /dev/dri, Vulkan ve VAAPI çıktısının son satırları
VKT=""
if [ "$NG" -eq 0 ]; then
  VKT="dri=$(ls /dev/dri 2>/dev/null | tr '\n' ' ') · vk=$($KUTU sh -c 'vulkaninfo 2>&1 | grep -iE "deviceName *=|error|fail" | head -n 6' 2>&1 | tr '\n' '|' | tr -d '"\\' | cut -c1-500) · mod=$(lsmod | grep -c '^amdgpu')"
fi
# nabız kutusuz üretilir (kutu yoksa da rapor gider); son hatalar dahil
HATA=$(grep -h HATA kur.log guncelle.log 2>/dev/null | tail -n 4 | tr '\n' '|' | tr -d '"\\' | cut -c1-900)
printf '{"ad":"%s","zaman":"%s","gpu_sayisi":%s,"gpular":"%s","imaj":"%s","docker":"%s","yuk":"%s","pci_amd":%s,"vk_tani":"%s","son_hatalar":"%s"}\n' \
  "$AD" "$(date -u +%FT%TZ)" "$NG" "$(echo "$GPUS" | tr -d '"\\')" "$(cat imaj_surum 2>/dev/null)" "$(docker --version 2>/dev/null | cut -c1-40)" \
  "$(cut -d' ' -f1-3 /proc/loadavg)" "$(lspci 2>/dev/null | grep -ciE 'vga.*(amd|ati)')" "$VKT" "$HATA" > is/nabiz.json
NB=$(gonder nabiz.json); echo "$(date '+%F %T') nabız: $NB · gpu $NG"
[ "$NB" = 200 ] || { echo "nabız gönderilemedi, deneme atlandı"; exit 0; }
# hız denemesi (imaj başına bir kez)
if [ -z "${DENEMESIZ:-}" ] && [ ! -f deneme_tamam ] && [ "$NG" -gt 0 ]; then
  rm -f is/deneme.json
  docker rm -f aerig_deneme >/dev/null 2>&1
  timeout 900 ${KUTU/docker run --rm/docker run --rm --name aerig_deneme} bash /is/deneme.sh "$GL" "${RD:-renderD128}" > is/kutu.log 2>&1 \
    || { docker rm -f aerig_deneme >/dev/null 2>&1; echo "$(date '+%F %T') HATA deneme 15 dk'da bitmedi (takıldı)"; }
  if [ -s is/deneme.json ]; then
    R=$(gonder deneme.json); echo "$(date '+%F %T') deneme: $R $(cat is/deneme.json)"
    [ "$R" = 200 ] && echo "$DS" > deneme_tamam
  else echo "$(date '+%F %T') HATA deneme: $(tail -c 400 is/kutu.log)"; fi
fi
