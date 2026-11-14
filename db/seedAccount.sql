insert into "Account" ("isBusiness", "Name", "Address1", "Address2", "City", "State", "Zipcode") values
  (true,  'Acme Corp',        '100 Main St',   'Suite 200', 'Phoenix',   'AZ', '85001'),
  (true,  'Globex Inc',       '200 Oak Ave',   null,        'Austin',    'TX', '73301'),
  (true,  'Initech LLC',      '450 Elm Blvd',  'Floor 3',   'Dallas',    'TX', '75201'),
  (false, 'Jane Doe',         '300 Pine Rd',   null,        'Denver',    'CO', '80201'),
  (false, 'John Smith',       '12 Cedar Ln',   'Apt 4B',    'Seattle',   'WA', '98101')
returning *;