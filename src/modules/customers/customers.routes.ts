import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  CONTACT_METHOD_MESSAGE,
  convertCustomerSchema,
  createCustomerSchema,
  customerParamsSchema,
  updateCustomerSchema,
} from './customers.schema.js';
import {
  AccountNotFoundError,
  MissingContactMethodError,
  PipelineConflictError,
  convertCustomer,
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from './customers.service.js';

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

const notFound = (res: Response) => res.status(404).json({ error: 'Customer not found' });

export const customersRouter = Router();

// Everyone signed in can read customers; technicians can't create, edit, or delete them.
customersRouter.use(requireAuth);
const officeOnly = requireRole('associate', 'manager');

customersRouter.get(
  '/',
  wrap(async (_req, res) => {
    res.json({ customers: await listCustomers() });
  }),
);

customersRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const { id } = customerParamsSchema.parse(req.params);
    const customer = await getCustomer(id);
    if (!customer) return void notFound(res);
    res.json({ customer });
  }),
);

customersRouter.post(
  '/',
  officeOnly,
  wrap(async (req, res) => {
    const data = createCustomerSchema.parse(req.body);
    const customer = await createCustomer(data, req.session.userId!);
    res.status(201).json({ customer });
  }),
);

customersRouter.patch(
  '/:id',
  officeOnly,
  wrap(async (req, res) => {
    const { id } = customerParamsSchema.parse(req.params);
    const data = updateCustomerSchema.parse(req.body);
    try {
      const customer = await updateCustomer(id, data);
      if (!customer) return void notFound(res);
      res.json({ customer });
    } catch (err) {
      if (err instanceof PipelineConflictError) {
        return void res.status(409).json({ error: err.message });
      }
      if (!(err instanceof MissingContactMethodError)) throw err;
      res
        .status(400)
        .json({ error: 'Validation failed', details: { phone: [CONTACT_METHOD_MESSAGE] } });
    }
  }),
);

// Opportunity -> converted: creates (or links) an account and a contact.
customersRouter.post(
  '/:id/convert',
  officeOnly,
  wrap(async (req, res) => {
    const { id } = customerParamsSchema.parse(req.params);
    const data = convertCustomerSchema.parse(req.body ?? {});
    try {
      const result = await convertCustomer(id, data);
      if (!result) return void notFound(res);
      res.json(result);
    } catch (err) {
      if (err instanceof PipelineConflictError) {
        return void res.status(409).json({ error: err.message });
      }
      if (!(err instanceof AccountNotFoundError)) throw err;
      res
        .status(400)
        .json({ error: 'Validation failed', details: { accountId: ['Account not found'] } });
    }
  }),
);

customersRouter.delete(
  '/:id',
  officeOnly,
  wrap(async (req, res) => {
    const { id } = customerParamsSchema.parse(req.params);
    if (!(await deleteCustomer(id))) return void notFound(res);
    res.status(204).end();
  }),
);
