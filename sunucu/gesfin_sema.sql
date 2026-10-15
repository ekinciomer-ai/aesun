select string_agg(distinct k,',') from (select jsonb_object_keys(ai_raw_response) k from invoice_extractions where jsonb_typeof(ai_raw_response)='object') t;
select string_agg(distinct k,',') from (select jsonb_object_keys(ai_raw_response->'invoice') k from invoice_extractions where jsonb_typeof(ai_raw_response->'invoice')='object') t;
