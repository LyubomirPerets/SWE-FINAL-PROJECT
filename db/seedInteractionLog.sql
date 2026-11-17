-- Interaction log entries, matched to contacts by email. Skips an entry whose
-- contact, type and notes already exist, so it is safe to run twice.
insert into interaction_log (contact_id, type, notes)
select c.id, v.type, v.notes
from (values
  ('ann.smith@acme.example',      'call',    'Intro call. Interested in the Premium Plan.'),
  ('ann.smith@acme.example',      'email',   'Sent signed contract for countersignature.'),
  ('bob.jones@acme.example',      'meeting', 'Onboarding session scheduled for next Tuesday.'),
  ('cara.lee@globex.example',     'email',   'Sent first invoice.'),
  ('erin.brooks@initech.example', 'visit',   'Site visit to review the project proposal.'),
  ('jane.doe@example.com',        'text',    'Confirmed ID verification received.'),
  ('john.smith@example.com',      'note',    'Prefers contact after 5pm.')
) as v(email_address, type, notes)
join contacts c on c.email_address = v.email_address
where not exists (
  select 1 from interaction_log l
  where l.contact_id = c.id and l.type = v.type and l.notes = v.notes
);