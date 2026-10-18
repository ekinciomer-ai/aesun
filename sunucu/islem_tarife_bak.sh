#!/bin/bash
# Salt okuma: fatura sistemindeki (gesfin) satış faturası birim fiyatları — yalnız kalem adı + birim fiyat (tutar/kimlik yok).
Q="select f.name || ' ' || to_char(i.invoice_date,'YYYY-MM') || ': ' || string_agg(distinct regexp_replace(k.description,' ?\(.*\)','') || '=' || k.unit_price, ', ')
  from invoices i join invoice_items k on k.invoice_id=i.id left join facilities f on f.installation_number=i.installation_number
  where i.duplicate_of_invoice_id is null and i.invoice_type='SATIS' and i.invoice_date >= date '2026-01-01' and f.name ilike 'Sera%'
  group by f.name, to_char(i.invoice_date,'YYYY-MM') order by f.name, 1"
docker exec gesfin-db psql -U gesfin -d gesfin -At -c "$Q" 2>&1 > /tmp/t.txt
split -l 3 /tmp/t.txt /tmp/tp_; for f in $(ls /tmp/tp_* | head -9); do echo "NOT: $(tr '\n' ';' < $f | cut -c1-1000)"; done; rm -f /tmp/tp_* /tmp/t.txt
