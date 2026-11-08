#!/bin/bash
# Yalnız okur: Caddy kapsayıcısının bağlantı yapısı ve api bloğu (sırsız).
echo "NOT: caddy ağları: $(docker inspect gesfin-caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')"
echo "NOT: caddy bağlamaları: $(docker inspect gesfin-caddy -f '{{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}')"
echo "NOT: caddy portları: $(docker inspect gesfin-caddy -f '{{json .HostConfig.PortBindings}}' | cut -c1-200)"
echo "NOT: api bloğu: $(awk '/^api\.aksarayenerji\.net/,/^}/' /opt/caddy/Caddyfile | grep -v -i -E 'basicauth|\$2[aby]\$' | tr '\n' ' ' | cut -c1-700)"
echo "NOT: aesun-api ağları: $(docker inspect aesun-api -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}') · portlar $(docker inspect aesun-api -f '{{json .HostConfig.PortBindings}}' | cut -c1-120)"
echo "NOT: aesun compose: $(ls /opt/aesun) · $(docker inspect aesun-api -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')"
echo "NOT: caddy reload yolu: $(docker inspect gesfin-caddy -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')"
