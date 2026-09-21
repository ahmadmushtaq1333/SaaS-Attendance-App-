import { apiClient } from '@/shared/api';

export interface StudentCourse {
  course_id: number;
  course_name: string;
  institution_name: string;
  attended_count: number;
  total_sessions: number;
  attendance_percentage: number;
  is_at_risk: boolean;
}

export interface StudentAttendanceSummary {
  courses: StudentCourse[];
}

export interface SessionLog {
  session_id: number;
  session_number: number;
  date: string;
  time: string;
  present: boolean;
}

export interface CourseDetail {
  session_log: SessionLog[];
}

export const studentApi = {
  async getAttendanceSummary(): Promise<StudentAttendanceSummary> {
    const response = await apiClient.get<StudentAttendanceSummary>('/reports/student/');
    return response.data;
  },

  async getCourseDetail(courseId: number): Promise<CourseDetail> {
    const response = await apiClient.get<CourseDetail>(`/reports/student/course/${courseId}/`);
    return response.data;
  },

  async markAttendance(tokenUuid: string): Promise<void> {
    await apiClient.post('/attendance/mark/', { token_uuid: tokenUuid });
  },
};
