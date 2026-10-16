#!/bin/bash
# fatura (gesfin) tanı 3 — YALNIZ OKUMA. Yalnız Caddy fatura bloğu (maskeli) ve yedekle farkı.
CF=/opt/caddy/Caddyfile
mask(){ sed -E 's/(Authorization|Bearer|key|secret|token|password)[^ ]*/\1 ***/Ig' | cut -c1-200; }
BLOK=$(awk '/^fatura\.aksarayenerji\.net/{f=1} f{print} f&&/^}/{exit}' $CF | grep -v '^\s*$' | sed 's/^\s\+/ /' | mask | tr '\n' '¶')
echo "NOT: fatura bloğu A: ${BLOK:0:450}"
echo "NOT: fatura bloğu B: ${BLOK:450:450}"
Y=$(ls -t $CF.yedek-* 2>/dev/null | head -1)
[ -n "$Y" ] && echo "NOT: yedek($(basename $Y)) fark: $(diff <(grep -v '^\s*$' $Y) <(grep -v '^\s*$' $CF) | grep '^[<>]' | mask | head -14 | tr '\n' '¶' | cut -c1-900)"
echo "NOT: Caddyfile boyut: $(wc -l < $CF) satır · yedek: $(wc -l < $Y) satır · site blokları: $(grep -o -E '^[a-z0-9.-]+\.aksarayenerji\.net' $CF | tr '\n' ' ')"
