-- Accounts. Skips any account whose name already exists, so it is safe to run twice.
insert into accounts (is_business, name, address_1, address_2, city, state, zipcode)
select v.is_business, v.name, v.address_1, v.address_2, v.city, v.state, v.zipcode
from (values
  (true,  'Acme Corp',   '100 Main St',  'Suite 200', 'Phoenix', 'AZ', '85001'),
  (true,  'Globex Inc',  '200 Oak Ave',  null,        'Austin',  'TX', '73301'),
  (true,  'Initech LLC', '450 Elm Blvd', 'Floor 3',   'Dallas',  'TX', '75201'),
  (false, 'Jane Doe',    '300 Pine Rd',  null,        'Denver',  'CO', '80201'),
  (false, 'John Smith',  '12 Cedar Ln',  'Apt 4B',    'Seattle', 'WA', '98101')
) as v(is_business, name, address_1, address_2, city, state, zipcode)
where not exists (select 1 from accounts a where a.name = v.name);
