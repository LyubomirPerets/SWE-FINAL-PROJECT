import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerParamsSchema,
} from './customers.schema.js';

export const customersRouter = Router();

//protect routes
customersRouter.use(requireAuth);

//list customers
customersRouter.get('/', (_req, res) => {
  res.json({ customers: [] });
});

//retrieve customer
customersRouter.get('/:id', (req, res, next) => {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    res.status(501).json({ message: 'Pending database migration', id });
  } catch (err) {
    next(err);
  }
});

//new customer
customersRouter.post('/', (req, res, next) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    res.status(201).json({
      message: 'Customer validation passed (scaffold)',
      customer: { id: '00000000-0000-0000-0000-000000000000', ...data },
    });
  } catch (err) {
    next(err);
  }
});

//update customer
customersRouter.patch('/:id', (req, res, next) => {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    const data = updateCustomerSchema.parse(req.body);
    res.status(501).json({ message: 'Pending database migration', id, data });
  } catch (err) {
    next(err);
  }
});
//delete a customer
customersRouter.delete('/:id', (req, res, next) => {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    res.status(501).json({ message: 'Pending database migration', id });
  } catch (err) {
    next(err);
  }
});
