select relname||'='||n_live_tup from pg_stat_user_tables order by relname;
select table_name||': '||string_agg(column_name||':'||data_type,',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name in ('facilities','invoices','invoice_items','invoice_extractions') group by table_name;
