#!/bin/bash
# Salt okuma: fatura sistemindeki (gesfin) birim fiyatlar — yalnız kalem adı + birim fiyat (tutar/kimlik yok).
Q="select string_agg(x, ' | ') from (select distinct on (f.name, to_char(i.invoice_date,'YYYY-MM'), k.description)
  f.name || ' ' || to_char(i.invoice_date,'YYYY-MM') || ' [' || coalesce(i.invoice_type,'') || '/' || coalesce(i.tariff,'') || '] ' || k.description || '=' || k.unit_price || ' ' || coalesce(k.unit,'') as x
  from invoices i join invoice_items k on k.invoice_id=i.id left join facilities f on f.installation_number=i.installation_number
  where i.duplicate_of_invoice_id is null and i.invoice_date >= date '2026-07-01'
    and (k.description ilike '%aktif%' or k.description ilike '%sistem%' or k.description ilike '%dağıtım%' or k.description ilike '%dagitim%' or k.description ilike '%terim%' or k.description ilike '%enerji%')
  order by f.name, to_char(i.invoice_date,'YYYY-MM') desc, k.description) t"
OUT=$(docker exec gesfin-db psql -U gesfin -d gesfin -At -c "$Q" 2>&1)
echo "$OUT" | tr '|' '\n' | sed 's/^ *//' | awk 'NF' > /tmp/tarife.txt
n=$(wc -l < /tmp/tarife.txt); echo "NOT: kalem sayısı $n"
split -l 6 /tmp/tarife.txt /tmp/tarp_; for f in $(ls /tmp/tarp_* | head -8); do echo "NOT: $(tr '\n' ';' < $f | cut -c1-900)"; done; rm -f /tmp/tarp_* /tmp/tarife.txt
