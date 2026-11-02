import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ApiError, type FieldErrors } from '../api/client';
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from '../api/customers';
import { useAuth } from '../hooks/useAuth';
import {
  CONTACT_LABELS,
  SERVICE_LABELS,
  STATUS_LABELS,
  type ContactMethod,
  type Customer,
  type CustomerInput,
  type CustomerStatus,
  type ServiceType,
} from '../types/customer';
import './CustomersPage.css';

const EMPTY: CustomerInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  service: 'hvac',
  status: 'lead',
  preferredContact: 'text',
  followUpDate: '',
  notes: '',
};

function toInput(c: Customer): CustomerInput {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    service: c.service,
    status: c.status,
    preferredContact: c.preferredContact,
    followUpDate: c.followUpDate ?? '',
    notes: c.notes ?? '',
  };
}

function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type Editing = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null;

export function CustomersPage() {
  const auth = useAuth();
  const canEdit = auth.user?.role !== 'technician';
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CustomerStatus | ''>('');
  const [service, setService] = useState<ServiceType | ''>('');
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    listCustomers(controller.signal).then(
      (res) => {
        setCustomers(res.customers);
        setLoadError('');
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          err instanceof ApiError ? err.message : 'We couldn’t load customers. Try again.',
        );
      },
    );
    return () => controller.abort();
  }, [reloadKey]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers ?? []).filter((c) => {
      const haystack = [c.firstName, c.lastName, c.email, c.phone, c.address]
        .join(' ')
        .toLowerCase();
      return (
        (!q || haystack.includes(q)) &&
        (!status || c.status === status) &&
        (!service || c.service === service)
      );
    });
  }, [customers, query, status, service]);

  function saved(customer: Customer, verb: string) {
    setEditing(null);
    setNotice(`${customer.firstName} ${customer.lastName} ${verb}.`);
    setReloadKey((k) => k + 1);
  }

  async function remove(customer: Customer) {
    const name = `${customer.firstName} ${customer.lastName}`;
    if (!window.confirm(`Delete ${name}? This can’t be undone.`)) return;
    try {
      await deleteCustomer(customer.id);
      setEditing(null);
      setNotice(`${name} deleted.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : `We couldn’t delete ${name}.`);
    }
  }

  return (
    <div className="app-shell">
      <title>Customers | Sierra</title>
      <header className="app-header">
        <Link className="auth-brand" to="/" aria-label="Sierra home">
          <img src="/favicon-1.svg" width="28" height="28" alt="" /> Sierra
        </Link>
        <nav aria-label="Main">
          <Link to="/customers" aria-current="page">
            Customers
          </Link>
          <Link to="/dashboard">Account</Link>
        </nav>
      </header>

      <main className="app-main">
        <div className="page-title">
          <div>
            <h1>Customers</h1>
            <p>{customers ? `${customers.length} total` : 'Loading…'}</p>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setEditing({ mode: 'create' })}>
              Add customer
            </button>
          )}
        </div>

        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        {editing && (
          <CustomerForm
            key={editing.mode === 'edit' ? editing.customer.id : 'new'}
            customer={editing.mode === 'edit' ? editing.customer : null}
            onCancel={() => setEditing(null)}
            onSaved={saved}
            onDelete={remove}
          />
        )}

        <div className="filters">
          <input
            type="search"
            placeholder="Search by name, email, phone, or address"
            aria-label="Search customers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomerStatus | '')}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by service"
            value={service}
            onChange={(e) => setService(e.target.value as ServiceType | '')}
          >
            <option value="">All services</option>
            {Object.entries(SERVICE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loadError ? (
          <div className="auth-error" role="alert">
            {loadError}{' '}
            <button className="btn btn-link" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        ) : customers === null ? (
          <p className="muted">Loading customers…</p>
        ) : visible.length === 0 ? (
          <p className="muted">
            {customers.length === 0 ? 'No customers yet.' : 'No customers match your filters.'}
          </p>
        ) : (
          <table className="customer-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Service</th>
                <th scope="col">Status</th>
                <th scope="col" className="hide-sm">
                  Phone
                </th>
                <th scope="col">Next follow-up</th>
                {canEdit && (
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>
                      {c.firstName} {c.lastName}
                    </b>
                    <small>{c.email ?? c.phone}</small>
                  </td>
                  <td>{SERVICE_LABELS[c.service]}</td>
                  <td>
                    <span className={`tag tag-${c.status}`}>{STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="hide-sm">{c.phone ?? '—'}</td>
                  <td>{c.followUpDate ? formatDate(c.followUpDate) : '—'}</td>
                  {canEdit && (
                    <td>
                      <button
                        className="btn btn-link"
                        onClick={() => setEditing({ mode: 'edit', customer: c })}
                        aria-label={`Edit ${c.firstName} ${c.lastName}`}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

function CustomerForm({
  customer,
  onCancel,
  onSaved,
  onDelete,
}: {
  customer: Customer | null;
  onCancel: () => void;
  onSaved: (customer: Customer, verb: string) => void;
  onDelete: (customer: Customer) => void;
}) {
  const [values, setValues] = useState<CustomerInput>(customer ? toInput(customer) : EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  const set =
    <K extends keyof CustomerInput>(key: K) =>
    (e: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [key]: e.target.value as CustomerInput[K] }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: FieldErrors = {};
    if (!values.firstName.trim()) local.firstName = ['First name is required'];
    if (!values.lastName.trim()) local.lastName = ['Last name is required'];
    if (!values.email.trim() && !values.phone.trim())
      local.phone = ['Add an email or phone number so you can reach this customer.'];
    setErrors(local);
    setFormError('');
    if (Object.keys(local).length > 0) return;

    setPending(true);
    try {
      const res = customer
        ? await updateCustomer(customer.id, values)
        : await createCustomer(values);
      onSaved(res.customer, customer ? 'updated' : 'added');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
      } else {
        setFormError('We couldn’t save this customer. Check your connection and try again.');
      }
    } finally {
      setPending(false);
    }
  }

  const field = (key: keyof CustomerInput, label: string, input: ReactNode) => (
    <div className={`form-field${key === 'address' || key === 'notes' ? ' span2' : ''}`}>
      <label htmlFor={`f-${key}`}>{label}</label>
      {input}
      {errors[key] && (
        <p className="field-error" id={`f-${key}-error`}>
          {errors[key][0]}
        </p>
      )}
    </div>
  );
  const invalid = (key: keyof CustomerInput) => ({
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `f-${key}-error` : undefined,
  });
  const text = (key: keyof CustomerInput, type = 'text') => (
    <input id={`f-${key}`} type={type} value={values[key]} onChange={set(key)} {...invalid(key)} />
  );
  const select = (key: keyof CustomerInput, labels: Record<string, string>) => (
    <select id={`f-${key}`} value={values[key]} onChange={set(key)} {...invalid(key)}>
      {Object.entries(labels).map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );

  return (
    <form className="customer-form" onSubmit={submit} noValidate aria-labelledby="form-title">
      <h2 id="form-title">
        {customer ? `Edit ${customer.firstName} ${customer.lastName}` : 'New customer'}
      </h2>
      <fieldset disabled={pending}>
        <div className="form-grid">
          {field('firstName', 'First name', text('firstName'))}
          {field('lastName', 'Last name', text('lastName'))}
          {field('email', 'Email', text('email', 'email'))}
          {field('phone', 'Phone', text('phone', 'tel'))}
          {field('address', 'Address', text('address'))}
          {field('service', 'Service', select('service', SERVICE_LABELS))}
          {field('status', 'Status', select('status', STATUS_LABELS))}
          {field(
            'preferredContact',
            'Preferred contact',
            select('preferredContact', CONTACT_LABELS satisfies Record<ContactMethod, string>),
          )}
          {field('followUpDate', 'Next follow-up', text('followUpDate', 'date'))}
          {field(
            'notes',
            'Notes',
            <textarea id="f-notes" rows={3} value={values.notes} onChange={set('notes')} />,
          )}
        </div>
        {formError && (
          <p className="auth-error" role="alert">
            {formError}
          </p>
        )}
        <div className="form-actions">
          {customer && (
            <button type="button" className="btn btn-danger" onClick={() => onDelete(customer)}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {pending ? 'Saving…' : customer ? 'Save changes' : 'Add customer'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
