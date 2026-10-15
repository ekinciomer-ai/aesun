select string_agg(id||'|'||installation_number||'|'||name,' ; ' order by id) from facilities;
select string_agg(x,' ; ') from (select coalesce(invoice_type,'-')||'|'||coalesce(installation_number,'-')||'|'||to_char(invoice_date,'YYYY-MM')||'|'||count(*)||'|'||coalesce(validation_status::text,'')||'|dup'||count(duplicate_of_invoice_id) x from invoices group by 1,installation_number,to_char(invoice_date,'YYYY-MM'),invoice_type,validation_status order by installation_number,3) t;
select string_agg(d||'['||u||']x'||n,' ; ') from (select left(description,45) d, coalesce(unit,'') u, count(*) n from invoice_items group by 1,2 order by 3 desc limit 60) t;
select string_agg(k,',') from (select distinct jsonb_object_keys(other_charges) k from invoices where jsonb_typeof(other_charges)='object') t;
