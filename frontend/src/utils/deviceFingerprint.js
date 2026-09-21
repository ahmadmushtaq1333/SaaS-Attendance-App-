/**
 * deviceFingerprint.js
 * Generates a stable device fingerprint using ONLY hardware constants
 * that do NOT change with screen orientation, tab focus, or browser state.
 *
 * Deliberately excluded (unstable):
 *   - screen.width / screen.height  → swap on phone rotation
 *   - window.innerWidth/innerHeight → change with zoom/resize
 */

export async function getDeviceFingerprint() {
  const components = [
    navigator.userAgent,           // browser + OS + device model string
    navigator.language,            // e.g. "en-US"
    navigator.hardwareConcurrency || "unknown",  // CPU core count
    navigator.deviceMemory || "unknown",         // RAM bucket (0.25/0.5/1/2/4/8 GB)
    window.screen.colorDepth,      // bits per color channel — hardware constant
    new Date().getTimezoneOffset(), // timezone offset in minutes — stable
  ];

  const rawString = components.join("|");

  const msgBuffer = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
