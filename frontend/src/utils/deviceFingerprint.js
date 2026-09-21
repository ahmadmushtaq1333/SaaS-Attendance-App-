/**
 * deviceFingerprint.js
 * Generates a stable, privacy-preserving client-side hash based on
 * available browser properties to identify the physical device/browser.
 */

export async function getDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    window.screen.width,
    window.screen.height,
    window.screen.colorDepth,
    navigator.language,
    navigator.hardwareConcurrency || "unknown",
    navigator.deviceMemory || "unknown",
    new Date().getTimezoneOffset(),
  ];
  
  const rawString = components.join("|");
  
  // Hash the string using the subtle crypto API
  const msgBuffer = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return hashHex;
}
