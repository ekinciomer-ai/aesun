select string_agg(column_name||':'||data_type,',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='invoices';
select string_agg(id||'|'||installation_number||'|'||name,' ; ' order by id) from facilities;
