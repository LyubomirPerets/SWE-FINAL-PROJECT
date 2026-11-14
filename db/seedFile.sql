insert into "File" ("AccountID", "FileName", "Description", "URL")
select a."ID", v.file_name, v.description, v.url
from (values
  ('Acme Corp',   'acme_contract.pdf',     'Signed service contract',  'https://example.com/files/acme_contract.pdf'),
  ('Acme Corp',   'acme_logo.png',         'Company logo',             'https://example.com/files/acme_logo.png'),
  ('Globex Inc',  'globex_invoice_001.pdf','First invoice',            'https://example.com/files/globex_invoice_001.pdf'),
  ('Initech LLC', 'initech_w9.pdf',        'Tax form W-9',             'https://example.com/files/initech_w9.pdf'),
  ('Initech LLC', 'initech_proposal.docx', 'Project proposal',         'https://example.com/files/initech_proposal.docx'),
  ('Jane Doe',    'jane_id_scan.jpg',      'ID verification',          'https://example.com/files/jane_id_scan.jpg'),
  ('John Smith',  'john_agreement.pdf',    'Customer agreement',       'https://example.com/files/john_agreement.pdf')
) as v(account_name, file_name, description, url)
join "Account" a on a."Name" = v.account_name
returning *;