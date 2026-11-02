import { z } from 'zod';

export const serviceTypes = ['hvac', 'lawn', 'garage_door'] as const;
export const jobStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

const id = (label: string) =>
  z.coerce.number().int(`Invalid ${label}`).positive(`Invalid ${label}`);

// A job is one scheduled visit to a customer's home (the ERD calls this "Services").
export const createJobSchema = z.object({
  customerId: id('customer id'),
  serviceType: z.enum(serviceTypes),
  scheduledAt: z.string().datetime({ offset: true, message: 'Invalid date/time (use ISO 8601)' }),
  // The technician doing the work. Can be left empty and assigned later.
  assignedTo: id('technician id').optional(),
  status: z.enum(jobStatuses).default('scheduled'),
  notes: z.string().trim().max(5000).optional(),
});

export const updateJobSchema = createJobSchema.partial();

// Technicians can only update progress and notes on their own jobs, not reassign or reschedule.
export const technicianUpdateJobSchema = createJobSchema
  .pick({ status: true, notes: true })
  .partial()
  .strict();

export const jobParamsSchema = z.object({
  id: id('job id'),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type TechnicianUpdateJobInput = z.infer<typeof technicianUpdateJobSchema>;
