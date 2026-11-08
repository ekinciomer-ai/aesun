#!/bin/bash
# ns1 sır anahtarı (RSA 3072): özel anahtar yalnız sunucuda; açık anahtar yazdırılır, GitHub iş akışı sırları bununla şifreler.
set -euo pipefail
D=/opt/aesun/sir; mkdir -p $D
[ -f $D/ozel.pem ] || openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out $D/ozel.pem 2>/dev/null
openssl pkey -in $D/ozel.pem -pubout -out $D/acik.pem
chown -R 1001:1001 $D; chmod 700 $D; chmod 600 $D/ozel.pem
echo "NOT: ACIK $(grep -v -- '-----' $D/acik.pem | tr -d '\n')"
