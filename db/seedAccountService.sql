insert into "Account_Service" ("AccountID", "ServiceID")
select a."ID", s."ID"
from (values
  ('Acme Corp',   'Premium Plan'),
  ('Acme Corp',   '24/7 Support'),
  ('Acme Corp',   'Onboarding'),
  ('Globex Inc',  'Basic Plan'),
  ('Globex Inc',  '24/7 Support'),
  ('Initech LLC', 'Enterprise Plan'),
  ('Initech LLC', 'Onboarding'),
  ('Jane Doe',    'Basic Plan'),
  ('John Smith',  'Premium Plan')
) as v(account_name, service_name)
join "Account" a on a."Name" = v.account_name
join "Service" s on s."Name" = v.service_name
returning *;