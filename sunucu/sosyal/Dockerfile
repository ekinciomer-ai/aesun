FROM python:3.12-slim
RUN pip install --no-cache-dir flask==3.1.3 gunicorn==23.0.0 \
 && useradd -m -u 1001 sosyal && mkdir -p /veri /kaynak && chown sosyal:sosyal /veri /kaynak
WORKDIR /app
COPY sosyal/ sosyal/
COPY calistir.py ./
ENV SOSYAL_VERI=/veri SOSYAL_KAYNAK=/kaynak
USER sosyal
# Üretim birkaç motoru sırayla çağırdığı için uzun sürebilir: zaman aşımı 300 sn.
CMD ["gunicorn", "-w", "1", "--threads", "4", "-t", "300", "-b", "0.0.0.0:8000", "calistir:app"]
