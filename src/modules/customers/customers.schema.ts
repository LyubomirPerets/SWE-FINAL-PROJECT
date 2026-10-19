import { z } from 'zod';

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(150).optional(),
  linkedinUrl: z.string().trim().url('Invalid URL format').max(255).optional(),
  status: z.enum(['lead', 'prospect', 'customer']).default('lead'),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerParamsSchema = z.object({
  id: z.string().uuid('Invalid customer UUID'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
