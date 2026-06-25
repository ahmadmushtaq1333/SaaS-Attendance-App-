import localforage from "localforage";
import API from "./api";

// Configure localforage db
localforage.config({
  name: "AttendanceSaaS",
  storeName: "offline_scans"
});

// Save scan locally if offline
export async function saveScanOffline(token_uuid) {
  const timestamp = new Date().toISOString();
  const scan = { token_uuid, timestamp };
  
  // Retrieve existing queued scans
  const existingScans = (await localforage.getItem("pending_scans")) || [];
  existingScans.push(scan);
  await localforage.setItem("pending_scans", existingScans);
  return scan;
}

// Sync offline scans with server
export async function syncOfflineScans() {
  const scans = await localforage.getItem("pending_scans");
  if (!scans || scans.length === 0) return { success: 0, errors: [] };

  try {
    const res = await API.post("/attendance/sync/", { records: scans });
    // Clear sync queue on success or partial success
    await localforage.setItem("pending_scans", []);
    return res.data;
  } catch (error) {
    console.error("Sync failed", error);
    throw error;
  }
}

// Get number of pending scans
export async function getPendingScansCount() {
  const scans = await localforage.getItem("pending_scans");
  return scans ? scans.length : 0;
}
