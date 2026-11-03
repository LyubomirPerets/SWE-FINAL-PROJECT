export interface User {
  id: number;
  name: string;
  email: string;
  role: 'associate' | 'manager' | 'technician';
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput extends LoginInput {
  name: string;
}
