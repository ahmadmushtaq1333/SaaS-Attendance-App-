export interface Institution {
  id: number;
  name: string;
  domain?: string;
  slug?: string;
  created_at?: string;
}

export interface Department {
  id: number;
  name: string;
  institution: number;
  institution_name?: string;
}

export interface Semester {
  id: number;
  number: number;
  department: number;
  department_name?: string;
}

export interface Section {
  id: number;
  name: string;
  semester: number;
  semester_number?: number;
  department_name?: string;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  role: 'student' | 'teacher' | 'admin';
  registration_number: string | null;
  institution: number | null;
  institution_name?: string;
  department: number | null;
  department_name?: string;
  section: number | null;
  section_name?: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  has_bound_device?: boolean;
  has_passkey?: boolean;
  assigned_courses?: { id: number; name: string }[];
}

export interface AdminCourse {
  id: number;
  name: string;
  code?: string;
  institution: number | { id: number; name: string };
  institution_name?: string;
  department?: number | { id: number; name: string } | null;
  department_name?: string;
  section?: number | { id: number; name: string; semester_number?: number } | null;
  section_name?: string;
  enrollment_count?: number;
  course_instructors?: { instructor: { id: number; full_name: string; email: string } }[];
  enrolled_students?: { enrollment_id: number; student_id: number; email: string }[];
}

export interface AdminSession {
  id: number;
  course: number;
  course_name?: string;
  teacher_name?: string;
  start_time: string;
  expiry_time: string;
  is_active: boolean;
  records_count?: number;
}

export interface AdminStats {
  totalUsers: number;
  students: number;
  teachers: number;
  institutions: number;
  courses: number;
  unverified: number;
  activeSessions: number;
  activeUsers: number;
  activePct: number;
}

export interface ImportPreviewResponse {
  headers: string[];
  preview_rows: string[][];
  total_rows: number;
}

export interface ImportResultResponse {
  message?: string;
  valid_count?: number;
  errors?: string[];
  warnings?: string[];
  created_count?: number;
  error?: string;
}
