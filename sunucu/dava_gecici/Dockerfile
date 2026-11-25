FROM python:3.12-slim
RUN pip install --no-cache-dir cryptography==43.0.3 && useradd -u 1001 -M -s /usr/sbin/nologin dg
COPY app.py index.html /app/
USER 1001
CMD ["python", "-I", "/app/app.py"]
