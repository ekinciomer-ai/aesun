#!/bin/bash
# Eski ekranda yanlışlıkla iki kez gönderilen video işlerini iptal klasörüne alır (silmez; geri koymak için bekleyen/'e taşınır).
K=/opt/sosyal/kuyruk; mkdir -p $K/iptal
for id in 20261106200012_6f962b 20261106200015_486531; do
  [ -f $K/bekleyen/$id.json ] && mv $K/bekleyen/$id.json $K/iptal/ && echo "NOT: $id iptal klasörüne alındı" || echo "NOT: $id sırada değil (başlamış ya da yok)"
done
echo "NOT: sırada kalan: $(ls $K/bekleyen | tr '\n' ' ')"
