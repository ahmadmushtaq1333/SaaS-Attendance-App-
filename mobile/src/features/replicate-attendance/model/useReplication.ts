import { useState, useCallback } from 'react';
import { replicationApi, ReplicationResult, ConflictStrategy } from '../api/replication-api';

interface UseReplicationState {
  loading: boolean;
  result: ReplicationResult | null;
  error: string | null;
}

interface UseReplicationReturn extends UseReplicationState {
  replicate: (
    sourceSessionId: number,
    targetCourseId: number,
    strategy?: ConflictStrategy,
  ) => Promise<ReplicationResult | null>;
  reset: () => void;
}

const INITIAL_STATE: UseReplicationState = {
  loading: false,
  result: null,
  error: null,
};

/**
 * Hook that encapsulates replication state and the async replicate action.
 * Components only interact with this hook — never with the API directly.
 */
export function useReplication(): UseReplicationReturn {
  const [state, setState] = useState<UseReplicationState>(INITIAL_STATE);

  const replicate = useCallback(
    async (
      sourceSessionId: number,
      targetCourseId: number,
      strategy: ConflictStrategy = 'replace',
    ): Promise<ReplicationResult | null> => {
      setState({ loading: true, result: null, error: null });
      try {
        const data = await replicationApi.replicate(sourceSessionId, targetCourseId, strategy);
        setState({ loading: false, result: data, error: null });
        return data;
      } catch (err: any) {
        const message: string =
          err?.response?.data?.error ?? 'Replication failed. Please try again.';
        setState({ loading: false, result: null, error: message });
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, replicate, reset };
}
