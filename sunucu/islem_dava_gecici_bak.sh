#!/bin/bash
# Davalar geçici bağlantısının güncel adresini ve durumunu gösterir (tünel yeniden başlarsa adres değişir).
echo "NOT: $(docker ps --filter name=dava- --format '{{.Names}}: {{.Status}}' | tr '\n' ' ')"
echo "NOT: ADRES $(docker logs dava-tunel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)"
