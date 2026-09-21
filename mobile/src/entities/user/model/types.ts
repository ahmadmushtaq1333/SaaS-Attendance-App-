export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  email: string;
  role: Role;
  first_name: string;
  last_name: string;
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
