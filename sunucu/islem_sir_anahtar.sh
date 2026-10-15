#!/bin/bash
# Sır devri için ns1'e özel RSA anahtarı (yoksa üretir). Özel anahtar yalnız root okur; açık anahtar tek satır base64 yazdırılır.
set -euo pipefail
D=/opt/aesun/sir; mkdir -p $D; chmod 700 $D
[ -f $D/ns1.pem ] || openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out $D/ns1.pem 2>/dev/null
chmod 600 $D/ns1.pem
echo "NOT: ACIK $(openssl pkey -in $D/ns1.pem -pubout | base64 -w0)"
