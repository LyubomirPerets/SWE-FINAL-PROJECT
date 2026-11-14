insert into "Contact" ("AccountID", "FirstName", "LastName", "Phone", "EmailAddress", "Address1", "Address2", "City", "State", "Zipcode")
select a."ID", v.first, v.last, v.phone, v.email, v.addr1, v.addr2, v.city, v.state, v.zip
from (values
  ('Acme Corp',   'Ann',   'Smith',   '602-555-1001', 'ann.smith@acme.example',     '100 Main St',  'Suite 200', 'Phoenix', 'AZ', '85001'),
  ('Acme Corp',   'Bob',   'Jones',   '602-555-1002', 'bob.jones@acme.example',     '100 Main St',  'Suite 200', 'Phoenix', 'AZ', '85001'),
  ('Globex Inc',  'Cara',  'Lee',     '512-555-2001', 'cara.lee@globex.example',    '200 Oak Ave',  null,        'Austin',  'TX', '73301'),
  ('Globex Inc',  'Dan',   'Park',    '512-555-2002', 'dan.park@globex.example',    '200 Oak Ave',  null,        'Austin',  'TX', '73301'),
  ('Initech LLC', 'Erin',  'Brooks',  '214-555-3001', 'erin.brooks@initech.example','450 Elm Blvd', 'Floor 3',   'Dallas',  'TX', '75201'),
  ('Jane Doe',    'Jane',  'Doe',     '303-555-4001', 'jane.doe@example.com',       '300 Pine Rd',  null,        'Denver',  'CO', '80201'),
  ('John Smith',  'John',  'Smith',   '206-555-5001', 'john.smith@example.com',     '12 Cedar Ln',  'Apt 4B',    'Seattle', 'WA', '98101')
) as v(account_name, first, last, phone, email, addr1, addr2, city, state, zip)
join "Account" a on a."Name" = v.account_name
returning *;