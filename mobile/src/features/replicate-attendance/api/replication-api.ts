import { apiClient } from '@/shared/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConflictStrategy = 'replace' | 'merge' | 'skip';

export interface ReplicationResult {
  status: 'success' | 'skipped';
  // success fields
  target_session_id?: number;
  target_course_id?: number;
  target_course_name?: string;
  records_cloned?: number;
  records_skipped_not_enrolled?: number;
  records_skipped_already_present?: number;
  // skipped fields
  reason?: string;
  existing_session_id?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const replicationApi = {
  /**
   * Replicate attendance records from sourceSessionId to targetCourseId.
   * POST /api/sessions/replicate/
   */
  replicate: async (
    sourceSessionId: number,
    targetCourseId: number,
    conflictStrategy: ConflictStrategy = 'replace',
  ): Promise<ReplicationResult> => {
    const res = await apiClient.post('/sessions/replicate/', {
      source_session_id: sourceSessionId,
      target_course_id: targetCourseId,
      conflict_strategy: conflictStrategy,
    });
    return res.data;
  },
};
