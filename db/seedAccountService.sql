-- Which services each account has, matched by name. The (account_id, service_id)
-- pair is unique, so existing links are left alone.
insert into account_services (account_id, service_id)
select a.id, s.id
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
join accounts a on a.name = v.account_name
join services s on s.name = v.service_name
on conflict on constraint account_services_unique do nothing;
