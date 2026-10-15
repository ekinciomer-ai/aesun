#!/bin/bash
P=$(curl -s --max-time 20 "https://portal.aksarayenerji.net/?t=$(date +%s)")
echo "NOT: portal: apiOzet=$(echo "$P" | grep -c 'async function apiOzet') parasalAnahtar=$(echo "$P" | grep -c 'async function parasalAnahtar') boyut=$(echo "$P" | wc -c) $(curl -sI --max-time 20 https://portal.aksarayenerji.net/ | grep -iE '^(last-modified|cache-control|etag)' | tr '\r\n' '  ')"
echo "NOT: api: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/saglik | cut -c1-200)"
