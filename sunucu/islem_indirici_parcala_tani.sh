#!/bin/bash
# Teşhis: parcala.py'yi tek kısa videoda çalıştırır, hatayı gösterir.
KOK=/opt/tampon/indirici
F=$(ls $KOK/rank/11_*.mp4 | head -1)
echo "NOT: python $($KOK/venv/bin/python -V 2>&1) · cv2 $($KOK/venv/bin/python -c 'import cv2;print(cv2.__version__)' 2>&1 | tail -1)"
echo "NOT: rapidocr $($KOK/venv/bin/python -c 'import rapidocr_onnxruntime;print(1)' 2>&1 | tail -1) · scenedetect $($KOK/venv/bin/python -c 'import scenedetect;print(scenedetect.__version__)' 2>&1 | tail -1)"
rm -rf /tmp/pt && timeout 900 $KOK/venv/bin/python $KOK/parcala.py "$F" /tmp/pt > /tmp/pt.out 2>/tmp/pt.err; echo "NOT: çıkış kodu $?"
tail -6 /tmp/pt.err | sed 's/^/NOT: err /' | cut -c1-200
tail -c 300 /tmp/pt.out | sed 's/^/NOT: out /'
ls /tmp/pt | head | sed 's/^/NOT: dosya /'; rm -rf /tmp/pt
