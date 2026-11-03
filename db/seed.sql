USE final_project;
SET FOREIGN_KEY_CHECKS = 0;

REPLACE INTO contact (contact_id, name, phone, email_address, address_1, address_2, city, state, zipcode, notes) VALUES
('c0000000-0000-0000-0000-000000000001', 'Dana Whitfield', '704-555-0101', 'dana@carolinalawn.example.com', '120 Main St', NULL, 'Huntersville', 'NC', '28078', 'Prefers email'),
('c0000000-0000-0000-0000-000000000002', 'Marcus Reyes', '980-555-0102', 'marcus@queencityplumbing.example.com', '45 Trade St', 'Suite 200', 'Charlotte', 'NC', '28202', NULL),
('c0000000-0000-0000-0000-000000000003', 'Priya Patel', '704-555-0103', 'priya@lakenormancafe.example.com', '9 Harbor Rd', NULL, 'Cornelius', 'NC', '28031', 'Call after 2pm'),
('c0000000-0000-0000-0000-000000000004', 'Tom Alvarez', '704-555-0104', 'tom@piedmontdental.example.com', '310 Park Ave', NULL, 'Davidson', 'NC', '28036', NULL),
('c0000000-0000-0000-0000-000000000005', 'Jenna Brooks', '980-555-0105', 'jenna@harborfitness.example.com', '77 Lakeshore Dr', NULL, 'Mooresville', 'NC', '28117', 'Referred by Dana');

REPLACE INTO files (file_id, file_name, file_url, file_type) VALUES
('f0000000-0000-0000-0000-000000000001', 'piedmont-quote.pdf', 'https://example-bucket.s3.us-west-2.amazonaws.com/quotes/piedmont-quote.pdf', 'application/pdf'),
('f0000000-0000-0000-0000-000000000002', 'carolina-lawn-contract.pdf', 'https://example-bucket.s3.us-west-2.amazonaws.com/contracts/carolina-lawn-contract.pdf', 'application/pdf'),
('f0000000-0000-0000-0000-000000000003', 'plumbing-site-photo.jpg', 'https://example-bucket.s3.us-west-2.amazonaws.com/photos/plumbing-site-photo.jpg', 'image/jpeg'),
('f0000000-0000-0000-0000-000000000004', 'cafe-invoice-1001.pdf', 'https://example-bucket.s3.us-west-2.amazonaws.com/invoices/cafe-invoice-1001.pdf', 'application/pdf');

REPLACE INTO leads (lead_id, business_name, contact_id, file_id) VALUES
('10000000-0000-0000-0000-000000000001', 'Piedmont Dental', 'c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000002', 'Harbor Fitness', 'c0000000-0000-0000-0000-000000000005', NULL);

REPLACE INTO account (account_id, business_name, contact_id, service_id, file_id, opportunity_id) VALUES
('a0000000-0000-0000-0000-000000000001', 'Carolina Lawn Care', 'c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', '0b000000-0000-0000-0000-000000000002'),
('a0000000-0000-0000-0000-000000000002', 'Queen City Plumbing', 'c0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', NULL, '0b000000-0000-0000-0000-000000000003'),
('a0000000-0000-0000-0000-000000000003', 'Lake Norman Cafe', 'c0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', NULL, NULL);

REPLACE INTO opportunity (opp_id, account_id, lead_id, contact_id, file_id, notes) VALUES
('0b000000-0000-0000-0000-000000000001', NULL, '10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001', 'New customer. Quote sent, est. $4,500. Follow up Friday.'),
('0b000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', NULL, 'Upsell: add irrigation maintenance, est. $1,200/yr.'),
('0b000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', NULL, 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 'Renewal discussion, est. $8,000.');

REPLACE INTO services (service_id, account_id, contact_id, status, assignee, file_id, notes) VALUES
('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Open', 'Sam Carter', NULL, 'Spring cleanup and mulching'),
('50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Closed', 'Sam Carter', NULL, 'Fall leaf removal, completed'),
('50000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'In Progress', 'Lee Nguyen', 'f0000000-0000-0000-0000-000000000003', 'Pipe inspection at Trade St office'),
('50000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Open', 'Lee Nguyen', 'f0000000-0000-0000-0000-000000000004', 'Grease trap service');

SET FOREIGN_KEY_CHECKS = 1;
