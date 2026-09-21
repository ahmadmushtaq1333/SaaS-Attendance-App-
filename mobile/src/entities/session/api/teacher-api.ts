import { apiClient } from '@/shared/api';

export interface Course {
  id: number;
  name: string;
  institution: string;
  department: string;
}

export interface Session {
  id: number;
  course: number;
  start_time: string;
  expiry_time: string;
  qr_code: string;
}

export const teacherApi = {
  // Fetch courses assigned to this teacher
  getCourses: async (): Promise<Course[]> => {
    const res = await apiClient.get('/auth/courses/');
    return res.data;
  },

  // Get active and recent sessions
  getSessions: async (): Promise<Session[]> => {
    const res = await apiClient.get('/sessions/');
    return res.data;
  },

  // Start a new session
  startSession: async (courseId: number, durationMinutes: number): Promise<Session> => {
    const res = await apiClient.post('/sessions/', {
      course_id: courseId,
      duration_minutes: durationMinutes,
    });
    return res.data;
  },

  // Stop active session
  stopSession: async (sessionId: number): Promise<void> => {
    await apiClient.post(`/sessions/${sessionId}/stop/`);
  },

  // Get live session report (students and their attendance)
  getLiveReport: async (courseId: number) => {
    const res = await apiClient.get(`/reports/course/${courseId}/`);
    return res.data;
  },

  // Bulk override attendance (uses our new backend modification)
  bulkOverride: async (sessionId: number, studentIds: number[], action: 'present' | 'absent') => {
    const res = await apiClient.post('/attendance/override/', {
      session_id: sessionId,
      student_ids: studentIds,
      action,
    });
    return res.data;
  },

  // Fetch defaulters list for a course (students below 75%)
  getDefaulters: async (courseId: number) => {
    const res = await apiClient.get(`/reports/course/${courseId}/`);
    return res.data; // contains defaulters_list with tier and attendance_percentage
  },

  // Send bulk notice email to a risk tier for a course
  sendBulkNotice: async (courseId: number, tier: string) => {
    const res = await apiClient.post('/reports/notify-tier/', {
      course_id: courseId,
      tier,
    });
    return res.data;
  },
};
