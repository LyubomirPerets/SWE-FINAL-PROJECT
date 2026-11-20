-- Contacts, matched to accounts by name. Skips a contact whose email already
-- exists on that account.
insert into contacts (account_id, first_name, last_name, phone, email_address,
  address_1, address_2, city, state, zipcode)
select a.id, v.first_name, v.last_name, v.phone, v.email_address,
  v.address_1, v.address_2, v.city, v.state, v.zipcode
from (values
  ('Acme Corp',   'Ann',  'Smith',  '602-555-1001', 'ann.smith@acme.example',      '100 Main St',  'Suite 200', 'Phoenix', 'AZ', '85001'),
  ('Acme Corp',   'Bob',  'Jones',  '602-555-1002', 'bob.jones@acme.example',      '100 Main St',  'Suite 200', 'Phoenix', 'AZ', '85001'),
  ('Globex Inc',  'Cara', 'Lee',    '512-555-2001', 'cara.lee@globex.example',     '200 Oak Ave',  null,        'Austin',  'TX', '73301'),
  ('Globex Inc',  'Dan',  'Park',   '512-555-2002', 'dan.park@globex.example',     '200 Oak Ave',  null,        'Austin',  'TX', '73301'),
  ('Initech LLC', 'Erin', 'Brooks', '214-555-3001', 'erin.brooks@initech.example', '450 Elm Blvd', 'Floor 3',   'Dallas',  'TX', '75201'),
  ('Jane Doe',    'Jane', 'Doe',    '303-555-4001', 'jane.doe@example.com',        '300 Pine Rd',  null,        'Denver',  'CO', '80201'),
  ('John Smith',  'John', 'Smith',  '206-555-5001', 'john.smith@example.com',      '12 Cedar Ln',  'Apt 4B',    'Seattle', 'WA', '98101')
) as v(account_name, first_name, last_name, phone, email_address, address_1, address_2, city, state, zipcode)
join accounts a on a.name = v.account_name
where not exists (
  select 1 from contacts c where c.account_id = a.id and c.email_address = v.email_address
);
