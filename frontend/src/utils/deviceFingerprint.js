/**
 * deviceFingerprint.js
 * Generates a stable, high-entropy device fingerprint using hardware constants
 * and a persisted random salt stored in localStorage.
 *
 * The salt approach solves two problems simultaneously:
 *   1. Fingerprint collisions: Students sharing the same phone model, OS,
 *      and network used to get the same hash and block each other.
 *   2. Stability: The fingerprint never changes for the same browser/device,
 *      even across sessions, because the salt is persisted in localStorage.
 *
 * Deliberately excluded (unstable):
 *   - screen.width / screen.height  → swap on phone rotation
 *   - window.innerWidth/innerHeight → change with zoom/resize
 */

const SALT_KEY = "quorum_device_salt";

function getOrCreateSalt() {
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    // Generate a cryptographically random 16-byte hex salt and persist it
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    salt = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(SALT_KEY, salt);
  }
  return salt;
}

export async function getDeviceFingerprint() {
  const salt = getOrCreateSalt();

  const components = [
    salt,                                         // unique per browser installation
    navigator.userAgent,                          // browser + OS + device model
    navigator.language,                           // e.g. "en-US"
    navigator.hardwareConcurrency || "unknown",   // CPU core count
    navigator.deviceMemory || "unknown",          // RAM bucket
    window.screen.colorDepth,                     // bits per color — hardware constant
    new Date().getTimezoneOffset(),               // timezone offset in minutes
  ];

  const rawString = components.join("|");

  const msgBuffer = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
