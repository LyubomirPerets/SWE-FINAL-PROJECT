export type ServiceType = 'hvac' | 'lawn' | 'garage_door';
export type CustomerStatus = 'lead' | 'active' | 'past_customer';
export type ContactMethod = 'text' | 'call' | 'email';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  service: ServiceType;
  status: CustomerStatus;
  preferredContact: ContactMethod;
  /** YYYY-MM-DD */
  followUpDate: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

/** What the form sends. Empty strings clear optional fields on the backend. */
export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  service: ServiceType;
  status: CustomerStatus;
  preferredContact: ContactMethod;
  followUpDate: string;
  notes: string;
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  hvac: 'HVAC',
  lawn: 'Lawn care',
  garage_door: 'Garage door',
};

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  lead: 'Lead',
  active: 'Active',
  past_customer: 'Past customer',
};

export const CONTACT_LABELS: Record<ContactMethod, string> = {
  text: 'Text',
  call: 'Call',
  email: 'Email',
};
