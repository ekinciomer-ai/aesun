-- fatura.aksarayenerji.net (gesfin) → monitoring için özet. Kimlik bilgileri (müşteri adı, vergi no, ETTN, dosya bağlantısı) dışarı ALINMAZ.
select json_build_object(
  'olusturma', to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD"T"HH24:MI:SS'),
  'kaynak', 'fatura.aksarayenerji.net (gesfin)',
  'tesisler', (select json_agg(json_build_object('id', id, 'tesisat', installation_number, 'ad', name) order by id) from facilities),
  'faturalar', (select json_agg(json_build_object(
      'id', i.id, 'tesisat', i.installation_number, 'tarih', i.invoice_date, 'son_odeme', i.due_date,
      'tur', i.invoice_type, 'tedarikci', i.supplier_name, 'tarife', i.tariff, 'no', i.invoice_number,
      'ara_toplam', i.subtotal_amount, 'kdv', i.tax_amount, 'toplam', i.invoice_total, 'odenecek', i.payable_total,
      'diger', i.other_charges, 'durum', i.validation_status::text, 'inceleme', i.needs_manual_review, 'klasor', i.drive_folder_path,
      'kalemler', (select json_agg(json_build_object('a', k.description, 'm', k.quantity, 'b', k.unit, 'f', k.unit_price, 'ara', k.subtotal, 'kdv', k.tax_amount, 't', k.total_amount) order by k.id) from invoice_items k where k.invoice_id = i.id)
    ) order by i.invoice_date, i.id) from invoices i where i.duplicate_of_invoice_id is null)
);
