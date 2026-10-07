import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/shared/api';

const PENDING_SCANS_KEY = '@pending_scans';

export interface PendingScan {
  token_uuid: string;
  timestamp: string;
}

export const offlineSync = {
  // Save scan locally if offline
  saveScanOffline: async (tokenUuid: string): Promise<PendingScan> => {
    const timestamp = new Date().toISOString();
    const scan: PendingScan = { token_uuid: tokenUuid, timestamp };
    
    try {
      const existing = await AsyncStorage.getItem(PENDING_SCANS_KEY);
      const scans: PendingScan[] = existing ? JSON.parse(existing) : [];
      scans.push(scan);
      await AsyncStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(scans));
    } catch (e) {
      console.error('Failed to save scan offline', e);
    }
    return scan;
  },

  // Get number of pending scans
  getPendingScansCount: async (): Promise<number> => {
    try {
      const existing = await AsyncStorage.getItem(PENDING_SCANS_KEY);
      if (!existing) return 0;
      const scans: PendingScan[] = JSON.parse(existing);
      return scans.length;
    } catch (e) {
      console.error('Failed to get pending scans count', e);
      return 0;
    }
  },

  // Sync offline scans with server
  syncOfflineScans: async (): Promise<{ success_count: number; errors: any[] }> => {
    try {
      const existing = await AsyncStorage.getItem(PENDING_SCANS_KEY);
      if (!existing) return { success_count: 0, errors: [] };
      
      const scans: PendingScan[] = JSON.parse(existing);
      if (scans.length === 0) return { success_count: 0, errors: [] };

      // Make API call to the sync endpoint
      const res = await apiClient.post('/attendance/sync/', { records: scans });
      
      // Clear sync queue on success
      await AsyncStorage.removeItem(PENDING_SCANS_KEY);
      
      return res.data;
    } catch (error) {
      console.error('Sync failed', error);
      throw error;
    }
  }
};
