import { api } from '@/shared/api';
import {
  Institution,
  Department,
  Semester,
  Section,
  AdminUser,
  AdminCourse,
  AdminSession,
  AdminStats,
  ImportPreviewResponse,
  ImportResultResponse,
} from '../model/types';

export const adminApi = {
  // ── KPI / Overview Stats ──
  getStats: async (): Promise<AdminStats> => {
    const [usersRes, instsRes, coursesRes, sessionsRes] = await Promise.all([
      api.get('/admin/users/', { params: { page_size: 1 } }),
      api.get('/admin/institutions/'),
      api.get('/admin/courses/'),
      api.get('/admin/sessions/'),
    ]);

    const totalUsers = usersRes.data.count ?? (usersRes.data.results || usersRes.data || []).length;

    const [studentsRes, teachersRes, unverifiedRes, activeRes] = await Promise.all([
      api.get('/admin/users/', { params: { role: 'student', page_size: 1 } }),
      api.get('/admin/users/', { params: { role: 'teacher', page_size: 1 } }),
      api.get('/admin/users/', { params: { is_email_verified: 'false', page_size: 1 } }),
      api.get('/admin/users/', { params: { is_active: 'true', page_size: 1 } }),
    ]);

    const insts = instsRes.data.results || instsRes.data || [];
    const courses = coursesRes.data.results || coursesRes.data || [];
    const sessions = (sessionsRes.data.results || sessionsRes.data || []) as AdminSession[];

    const totalStudents = studentsRes.data.count ?? 0;
    const totalTeachers = teachersRes.data.count ?? 0;
    const totalUnverified = unverifiedRes.data.count ?? 0;
    const totalActive = activeRes.data.count ?? 0;
    const activeSessions = sessions.filter(s => s.is_active).length;

    return {
      totalUsers,
      students: totalStudents,
      teachers: totalTeachers,
      institutions: insts.length,
      courses: courses.length,
      unverified: totalUnverified,
      activeSessions,
      activeUsers: totalActive,
      activePct: totalUsers ? Math.round((totalActive / totalUsers) * 100) : 0,
    };
  },

  // ── Institutions CRUD ──
  getInstitutions: async (): Promise<Institution[]> => {
    const res = await api.get('/admin/institutions/');
    return res.data.results || res.data || [];
  },

  createInstitution: async (data: { name: string; domain?: string }): Promise<Institution> => {
    const res = await api.post('/admin/institutions/', data);
    return res.data;
  },

  updateInstitution: async (id: number, data: { name?: string; domain?: string }): Promise<Institution> => {
    const res = await api.patch(`/admin/institutions/${id}/`, data);
    return res.data;
  },

  deleteInstitution: async (id: number): Promise<void> => {
    await api.delete(`/admin/institutions/${id}/`);
  },

  // ── Departments CRUD ──
  getDepartments: async (institutionId?: number): Promise<Department[]> => {
    const params = institutionId ? { institution: institutionId } : undefined;
    const res = await api.get('/admin/departments/', { params });
    return res.data.results || res.data || [];
  },

  createDepartment: async (data: { name: string; institution: number }): Promise<Department> => {
    const res = await api.post('/admin/departments/', data);
    return res.data;
  },

  updateDepartment: async (id: number, data: { name: string }): Promise<Department> => {
    const res = await api.patch(`/admin/departments/${id}/`, data);
    return res.data;
  },

  deleteDepartment: async (id: number): Promise<void> => {
    await api.delete(`/admin/departments/${id}/`);
  },

  // ── Semesters CRUD ──
  getSemesters: async (departmentId?: number): Promise<Semester[]> => {
    const params = departmentId ? { department: departmentId } : undefined;
    const res = await api.get('/admin/semesters/', { params });
    return res.data.results || res.data || [];
  },

  createSemester: async (data: { number: number; department: number }): Promise<Semester> => {
    const res = await api.post('/admin/semesters/', data);
    return res.data;
  },

  updateSemester: async (id: number, data: { number: number }): Promise<Semester> => {
    const res = await api.patch(`/admin/semesters/${id}/`, data);
    return res.data;
  },

  deleteSemester: async (id: number): Promise<void> => {
    await api.delete(`/admin/semesters/${id}/`);
  },

  // ── Sections CRUD ──
  getSections: async (semesterId?: number): Promise<Section[]> => {
    const params = semesterId ? { semester: semesterId } : undefined;
    const res = await api.get('/admin/sections/', { params });
    return res.data.results || res.data || [];
  },

  createSection: async (data: { name: string; semester: number }): Promise<Section> => {
    const res = await api.post('/admin/sections/', data);
    return res.data;
  },

  updateSection: async (id: number, data: { name: string }): Promise<Section> => {
    const res = await api.patch(`/admin/sections/${id}/`, data);
    return res.data;
  },

  deleteSection: async (id: number): Promise<void> => {
    await api.delete(`/admin/sections/${id}/`);
  },

  // ── Users CRUD & Overrides ──
  getUsers: async (params?: {
    role?: string;
    institution?: number;
    search?: string;
    is_email_verified?: boolean;
    is_active?: boolean;
    page?: number;
    page_size?: number;
    all?: boolean;
  }): Promise<{ count: number; results: AdminUser[] }> => {
    const res = await api.get('/admin/users/', { params });
    if (Array.isArray(res.data)) {
      return { count: res.data.length, results: res.data };
    }
    return {
      count: res.data.count ?? res.data.results?.length ?? 0,
      results: res.data.results || [],
    };
  },

  createUser: async (data: Partial<AdminUser> & { password?: string }): Promise<AdminUser> => {
    const res = await api.post('/admin/users/', data);
    return res.data;
  },

  updateUser: async (id: number, data: Partial<AdminUser> & { password?: string }): Promise<AdminUser> => {
    const res = await api.patch(`/admin/users/${id}/`, data);
    return res.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}/`);
  },

  resetDevice: async (userId: number): Promise<{ message: string }> => {
    const res = await api.post(`/admin/users/${userId}/reset-device/`);
    return res.data;
  },

  resetPasskey: async (userId: number): Promise<{ message: string; deleted_count?: number }> => {
    const res = await api.post(`/admin/users/${userId}/reset-passkey/`);
    return res.data;
  },

  resetDailyLock: async (userId: number): Promise<{ message: string }> => {
    const res = await api.post(`/admin/users/${userId}/reset-daily-lock/`);
    return res.data;
  },

  bulkGenerateUsers: async (data: {
    section_id: number;
    count: number;
    prefix?: string;
    course_id?: number;
    password?: string;
  }): Promise<{ users: any[]; message: string }> => {
    const res = await api.post('/admin/users/bulk-generate/', data);
    return res.data;
  },

  // ── Excel / CSV File Import ──
  previewImportFile: async (file: { uri: string; name: string; type: string }): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as any);

    const res = await api.post('/admin/users/import-file/?get_preview=true', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  executeImportFile: async (
    file: { uri: string; name: string; type: string },
    options: {
      dry_run?: boolean;
      auto_create_structure?: boolean;
      password_strategy?: string;
      custom_password?: string;
      course_id?: number;
      global_role?: string;
      global_institution?: number | string;
      global_department_id?: number | string;
      global_semester_id?: number | string;
      global_section_id?: number | string;
      column_mapping?: Record<string, string>;
    }
  ): Promise<ImportResultResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as any);
    formData.append('dry_run', options.dry_run ? 'true' : 'false');
    formData.append('auto_create_structure', options.auto_create_structure ? 'true' : 'false');
    if (options.password_strategy) formData.append('password_strategy', options.password_strategy);
    if (options.custom_password) formData.append('custom_password', options.custom_password);
    if (options.course_id) formData.append('course_id', String(options.course_id));
    if (options.global_role) formData.append('global_role', options.global_role);
    if (options.global_institution) formData.append('global_institution', String(options.global_institution));
    if (options.global_department_id) formData.append('global_department_id', String(options.global_department_id));
    if (options.global_semester_id) formData.append('global_semester_id', String(options.global_semester_id));
    if (options.global_section_id) formData.append('global_section_id', String(options.global_section_id));
    if (options.column_mapping) formData.append('column_mapping', JSON.stringify(options.column_mapping));

    const res = await api.post('/admin/users/import-file/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // ── Courses CRUD & Enrollments ──
  getCourses: async (): Promise<AdminCourse[]> => {
    const res = await api.get('/admin/courses/');
    return res.data.results || res.data || [];
  },

  createCourse: async (data: {
    name: string;
    code?: string;
    institution: number;
    department?: number;
    section?: number;
  }): Promise<AdminCourse> => {
    const res = await api.post('/admin/courses/', data);
    return res.data;
  },

  updateCourse: async (id: number, data: Partial<AdminCourse>): Promise<AdminCourse> => {
    const res = await api.patch(`/admin/courses/${id}/`, data);
    return res.data;
  },

  deleteCourse: async (id: number): Promise<void> => {
    await api.delete(`/admin/courses/${id}/`);
  },

  bulkAssignEnrollments: async (courseId: number, studentIds: number[]): Promise<{ message: string }> => {
    const res = await api.post('/admin/enrollments/bulk/', {
      course: courseId,
      student_ids: studentIds,
    });
    return res.data;
  },

  // ── Sessions & Emergency Reset ──
  getSessions: async (courseId?: number): Promise<AdminSession[]> => {
    const params = courseId ? { course: courseId } : undefined;
    const res = await api.get('/admin/sessions/', { params });
    return res.data.results || res.data || [];
  },

  resetSession: async (sessionId: number): Promise<{ message: string }> => {
    const res = await api.post('/admin/sessions/reset/', { session_id: sessionId });
    return res.data;
  },
};
