-- Service catalog. services.name is unique, so existing services are left alone.
insert into services (name, description, price) values
  ('Basic Plan',      'Starter package for small teams',        29.00),
  ('Premium Plan',    'Full feature set with priority access',  99.00),
  ('Enterprise Plan', 'Custom limits and dedicated manager',   299.00),
  ('24/7 Support',    'Round-the-clock phone and chat support', 19.99),
  ('Onboarding',      'One-time setup and training session',   149.00)
on conflict (name) do nothing;
