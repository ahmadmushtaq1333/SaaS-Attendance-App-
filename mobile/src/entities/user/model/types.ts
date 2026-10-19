export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  first_name?: string | null;
  registration_number?: string | null;
  is_superuser?: boolean;
  institution_name?: string | null;
  role: Role;
  is_email_verified: boolean;
  institution?: {
    id: number;
    name: string;
  };
  section?: {
    id: number;
    name: string;
    semester?: {
      id: number;
      number: number;
      department?: {
        id: number;
        name: string;
      }
    }
  };
}
