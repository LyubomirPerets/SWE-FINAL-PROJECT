import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  createJobSchema,
  jobParamsSchema,
  technicianUpdateJobSchema,
  updateJobSchema,
} from './jobs.schema.js';

export const jobsRouter = Router();

// Office staff (associates, managers) manage all jobs.
// Technicians see and update only the jobs assigned to them. That ownership check needs
// the jobs table, so it's marked TODO below until the migration lands.
const officeOnly = requireRole('associate', 'manager');

jobsRouter.use(requireAuth);

// list jobs (TODO: technicians get only WHERE assigned_to = session userId)
jobsRouter.get('/', (_req, res) => {
  res.json({ jobs: [] });
});

// retrieve job (TODO: 404 for a technician who isn't assigned to it)
jobsRouter.get('/:id', (req, res, next) => {
  try {
    const { id } = jobParamsSchema.parse(req.params);
    res.status(501).json({ message: 'Pending database migration', id });
  } catch (err) {
    next(err);
  }
});

// new job
jobsRouter.post('/', officeOnly, (req, res, next) => {
  try {
    const data = createJobSchema.parse(req.body);
    res.status(201).json({
      message: 'Job validation passed (scaffold)',
      job: { id: 0, ...data },
    });
  } catch (err) {
    next(err);
  }
});

// update job: technicians may change only status and notes
jobsRouter.patch('/:id', (req, res, next) => {
  try {
    const { id } = jobParamsSchema.parse(req.params);
    const schema = req.session.role === 'technician' ? technicianUpdateJobSchema : updateJobSchema;
    const data = schema.parse(req.body);
    res.status(501).json({ message: 'Pending database migration', id, data });
  } catch (err) {
    next(err);
  }
});

// delete job
jobsRouter.delete('/:id', officeOnly, (req, res, next) => {
  try {
    const { id } = jobParamsSchema.parse(req.params);
    res.status(501).json({ message: 'Pending database migration', id });
  } catch (err) {
    next(err);
  }
});
