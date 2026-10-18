#!/bin/bash
echo "NOT: invoices sütunları: $(docker exec gesfin-db psql -U gesfin -d gesfin -At -c "select string_agg(column_name, ',') from information_schema.columns where table_name='invoices'" 2>&1 | cut -c1-900)"
Q="select string_agg(f.name||' t='||i.invoice_date||' '||coalesce(to_char(i.period_start,'YYYY-MM-DD'),'?')||'..'||coalesce(to_char(i.period_end,'YYYY-MM-DD'),'?'), '; ' order by i.invoice_date) from invoices i left join facilities f on f.installation_number=i.installation_number where i.invoice_type='SATIS' and f.name ilike 'Sera2%' and i.duplicate_of_invoice_id is null"
echo "NOT: dönemler: $(docker exec gesfin-db psql -U gesfin -d gesfin -At -c "$Q" 2>&1 | cut -c1-900)"
