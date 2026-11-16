import { z } from 'zod';

export const customerServices = ['hvac', 'lawn', 'garage_door'] as const;
export const customerStatuses = ['lead', 'active', 'past_customer'] as const;
export const contactMethods = ['text', 'call', 'email'] as const;

// Optional text fields: empty strings from forms become null, which also clears the field.
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

const baseFields = {
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().email('Enter an email like name@example.com').max(255).nullable().optional(),
  ),
  phone: optionalText(50),
  address: optionalText(300),
  service: z.enum(customerServices),
  status: z.enum(customerStatuses),
  preferredContact: z.enum(contactMethods),
  followUpDate: z.preprocess(
    (v) => (v === '' ? null : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
      .nullable()
      .optional(),
  ),
  notes: optionalText(5000),
};

export const CONTACT_METHOD_MESSAGE =
  'Add an email or phone number so you can reach this customer.';

// Customers are homeowners (B2C). Staff need an email or a phone number to reach them.
export const createCustomerSchema = z
  .object({
    ...baseFields,
    service: baseFields.service.default('hvac'),
    status: baseFields.status.default('lead'),
    preferredContact: baseFields.preferredContact.default('text'),
  })
  .refine((c) => c.email || c.phone, { message: CONTACT_METHOD_MESSAGE, path: ['phone'] });

// The email-or-phone rule for updates is enforced by the database, since it depends on the
// stored row (see customers.service.ts).
export const updateCustomerSchema = z.object(baseFields).partial();

export const customerParamsSchema = z.object({
  id: z.coerce.number().int('Invalid customer id').positive('Invalid customer id'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
