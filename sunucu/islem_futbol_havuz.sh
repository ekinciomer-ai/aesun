#!/bin/bash
# Futbol veri havuzunu tampon bölgeye kopyalar
mkdir -p /opt/tampon/futbol/havuz && cp sunucu/futbol/havuz/* /opt/tampon/futbol/havuz/ && echo "NOT: havuzda $(ls /opt/tampon/futbol/havuz | wc -l) dosya"
