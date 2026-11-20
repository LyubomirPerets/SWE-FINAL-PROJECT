export type ServiceType =
  | 'hvac'
  | 'garage_door'
  | 'painting_interior'
  | 'painting_exterior'
  | 'plumbing'
  | 'flooring'
  | 'tree'
  | 'lawn';
/** Pipeline: lead -> opportunity -> converted (only via the Convert button). */
export type CustomerStatus = 'lead' | 'opportunity' | 'converted';
export type EditableStatus = Exclude<CustomerStatus, 'converted'>;
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
  accountId: number | null;
  convertedAt: string | null;
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
  /** Left out for converted customers, whose status can't change. */
  status?: EditableStatus;
  preferredContact: ContactMethod;
  followUpDate: string;
  notes: string;
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  hvac: 'HVAC',
  garage_door: 'Garage door',
  painting_interior: 'Interior painting',
  painting_exterior: 'Exterior painting',
  plumbing: 'Plumbing',
  flooring: 'Flooring',
  tree: 'Tree service',
  lawn: 'Lawn care',
};

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  lead: 'Lead',
  opportunity: 'Opportunity',
  converted: 'Converted',
};

export const EDITABLE_STATUS_LABELS: Record<EditableStatus, string> = {
  lead: 'Lead',
  opportunity: 'Opportunity',
};

export const CONTACT_LABELS: Record<ContactMethod, string> = {
  text: 'Text',
  call: 'Call',
  email: 'Email',
};
