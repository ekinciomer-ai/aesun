# Kamu malı (NASA) ve aracın kendi demo görseli; inmezse kendi karemiz kullanılır
cd "$GIRDI"
curl -sfL -o astronot.jpg "https://images-assets.nasa.gov/image/as11-40-5903/as11-40-5903~medium.jpg" || cp kare.jpg astronot.jpg
curl -sfL -o otobus.jpg "https://ultralytics.com/images/bus.jpg" || curl -sfL -o otobus.jpg "https://github.com/ultralytics/assets/releases/download/v0.0.0/bus.jpg" || cp kare.jpg otobus.jpg
ls -la "$GIRDI"
