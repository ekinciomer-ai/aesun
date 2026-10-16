#!/bin/bash
# fatura (gesfin) tanı 3 — YALNIZ OKUMA. Yalnız Caddy fatura bloğu (maskeli), parça parça.
CF=/opt/caddy/Caddyfile
mask(){ sed -E 's/(Authorization|Bearer|key|secret|token|password)[^ ]*/\1 ***/Ig; s/[{]/[/g; s/[}]/]/g; s/[":]/ /g'; }
BLOK=$(awk '/^fatura\.aksarayenerji\.net/{f=1} f{print} f&&/^}/{exit}' $CF | grep -v '^\s*$' | sed 's/^\s\+/ /' | mask | tr '\n' '|' | tr -s ' ')
for i in 0 1 2 3; do p=${BLOK:$((i*300)):300}; [ -n "$p" ] && echo "NOT: blok$i $p"; done
Y=$(ls -t $CF.yedek-* 2>/dev/null | head -1)
D=$(diff <(grep -v '^\s*$' $Y) <(grep -v '^\s*$' $CF) | grep '^[<>]' | mask | tr '\n' '|' | tr -s ' ')
for i in 0 1 2; do p=${D:$((i*300)):300}; [ -n "$p" ] && echo "NOT: fark$i $p"; done
