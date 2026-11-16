import { requestJson } from './client';
import type { Customer, CustomerInput } from '../types/customer';

export function listCustomers(signal?: AbortSignal) {
  return requestJson<{ customers: Customer[] }>('/api/customers', { signal, cache: 'no-store' });
}

export function createCustomer(input: CustomerInput) {
  return requestJson<{ customer: Customer }>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCustomer(id: number, input: CustomerInput) {
  return requestJson<{ customer: Customer }>(`/api/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteCustomer(id: number) {
  return requestJson<void>(`/api/customers/${id}`, { method: 'DELETE' });
}
