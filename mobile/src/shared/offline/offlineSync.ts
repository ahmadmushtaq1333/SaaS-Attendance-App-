import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/shared/api';

const PENDING_SCANS_KEY = '@pending_scans';

export interface PendingScan {
  token_uuid: string;
  timestamp: string;
  session_end_time?: string;
}

export interface SyncResult {
  success_count: number;
  skipped_count?: number;
  errors: any[];
  expired_count?: number;
}

/** In-memory cache for the pending scan count. -1 means not yet loaded. */
let _cachedCount = -1;

export const offlineSync = {
  // Save scan locally if offline
  saveScanOffline: async (tokenUuid: string, sessionEndTime?: string): Promise<PendingScan> => {
    const timestamp = new Date().toISOString();
    const scan: PendingScan = { token_uuid: tokenUuid, timestamp, session_end_time: sessionEndTime };

    try {
      const existing = await AsyncStorage.getItem(PENDING_SCANS_KEY);
      const scans: PendingScan[] = existing ? JSON.parse(existing) : [];
      // Deduplicate locally if same token scanned twice offline
      if (!scans.some((s) => s.token_uuid === tokenUuid)) {
        scans.push(scan);
        await AsyncStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(scans));
        _cachedCount = scans.length; // update cache
      }
    } catch (e) {
      console.error('Failed to save scan offline', e);
      _cachedCount = -1; // invalidate on error
    }
    return scan;
  },

  // Get number of pending scans
  getPendingScansCount: async (): Promise<number> => {
    if (_cachedCount >= 0) return _cachedCount;
    try {
      const existing = await AsyncStorage.getItem(PENDING_SCANS_KEY);
      _cachedCount = existing ? JSON.parse(existing).length : 0;
      return _cachedCount;
    } catch (e) {
      console.error('Failed to get pending scans count', e);
      return 0;
    }
  },

  // Sync offline scans with server
  syncOfflineScans: async (): Promise<SyncResult> => {
    try {
      const existing = await AsyncStorage.getItem(PENDING_SCANS_KEY);
      if (!existing) {
        _cachedCount = 0;
        return { success_count: 0, errors: [], expired_count: 0 };
      }

      const scans: PendingScan[] = JSON.parse(existing);
      if (scans.length === 0) {
        _cachedCount = 0;
        return { success_count: 0, errors: [], expired_count: 0 };
      }

      // Client-side pre-validation: filter out definitely expired scans if session_end_time is set
      const now = new Date();
      const validScans = scans.filter((s) => !s.session_end_time || new Date(s.session_end_time) > now);
      const expiredCount = scans.length - validScans.length;

      if (validScans.length === 0) {
        await AsyncStorage.removeItem(PENDING_SCANS_KEY);
        _cachedCount = 0;
        return { success_count: 0, errors: [], expired_count: expiredCount };
      }

      // Make API call to the sync endpoint
      const res = await apiClient.post('/attendance/sync/', {
        records: validScans.map((s) => ({ token_uuid: s.token_uuid, timestamp: s.timestamp })),
      });

      // Clear sync queue on success
      await AsyncStorage.removeItem(PENDING_SCANS_KEY);
      _cachedCount = 0;

      return {
        ...res.data,
        expired_count: expiredCount,
      };
    } catch (error) {
      console.error('Sync failed', error);
      _cachedCount = -1; // invalidate on error
      throw error;
    }
  },
};
