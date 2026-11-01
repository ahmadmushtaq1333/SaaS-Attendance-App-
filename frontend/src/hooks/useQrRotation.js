import { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";

const DEFAULT_ROTATION_SEC = 10;

/**
 * Custom hook to manage robust, modular auto-rotation of attendance QR codes.
 *
 * Fixes addressed:
 * - Prevents QR disappearance: never wipes existing qrCode to null while a new token is fetched.
 * - Accurate TTL sync: synchronizes countdown with backend token_expires_at timestamp.
 * - Infinite loop & error resilience: enforces a backoff delay if an API error occurs.
 * - Clean teardown: uses AbortController to discard obsolete in-flight requests.
 *
 * @param {Object} options
 * @param {number|null} options.sessionId - Active attendance session ID
 * @param {string} [options.initialQrCode] - Optional initial QR data URI from session start
 * @param {Function} [options.onSessionExpired] - Callback when backend signals the session ended
 * @param {Function} [options.onError] - Callback on rotation failure
 * @returns {{ qrCode: string|null, timeLeft: number, loading: boolean, forceRotate: () => Promise<void> }}
 */
export function useQrRotation({
  sessionId,
  initialQrCode = null,
  initialTokenUuid = null,
  rotationInterval = 10,
  onSessionExpired,
  onError,
}) {
  const [tokenUuid, setTokenUuid] = useState(initialTokenUuid);
  const [qrCode, setQrCode] = useState(initialQrCode);
  const [timeLeft, setTimeLeft] = useState(rotationInterval);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const isExpiredRef = useRef(false);

  // Sync initial values if provided on session switch
  useEffect(() => {
    isExpiredRef.current = false;
    if (initialTokenUuid || initialQrCode) {
      if (initialTokenUuid) setTokenUuid(initialTokenUuid);
      if (initialQrCode) setQrCode(initialQrCode);
      setTimeLeft(rotationInterval);
    }
  }, [sessionId, initialQrCode, initialTokenUuid, rotationInterval]);

  const fetchQr = useCallback(async (isManual = false) => {
    if (!sessionId || isExpiredRef.current) return;
    if (isFetchingRef.current && !isManual) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const res = await API.get(`/sessions/${sessionId}/qr/?interval=${rotationInterval}`, {
        signal: ctrl.signal,
      });

      if (!isMountedRef.current) return;

      if (res.data?.session_expired) {
        isExpiredRef.current = true;
        setTokenUuid(null);
        setQrCode(null);
        onSessionExpired?.();
        return;
      }

      if (res.data?.token_uuid) {
        setTokenUuid(res.data.token_uuid);
      }
      if (res.data?.qr_code) {
        setQrCode(res.data.qr_code);
      }

      // Priority 1: Use server-computed expires_in to eliminate client-server clock drift
      if (typeof res.data?.expires_in === "number") {
        const cappedSeconds = Math.min(rotationInterval, Math.max(1, Math.round(res.data.expires_in)));
        setTimeLeft(cappedSeconds);
      } else if (res.data?.token_expires_at) {
        // Fallback: strictly clamp calculated seconds to rotationInterval
        const msLeft = new Date(res.data.token_expires_at).getTime() - Date.now();
        const secondsLeft = Math.min(rotationInterval, Math.max(1, Math.round(msLeft / 1000)));
        setTimeLeft(secondsLeft);
      } else {
        setTimeLeft(rotationInterval);
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        return;
      }
      if (!isMountedRef.current) return;

      const errMsg = err.response?.data?.error || "Failed to rotate QR code";
      onError?.(errMsg);
      // Backoff for short delay on error to prevent tight error loops
      setTimeLeft(Math.min(4, rotationInterval));
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId, rotationInterval, onSessionExpired, onError]);

  // Initial fetch on mount or session change (if no initial token/QR)
  useEffect(() => {
    isMountedRef.current = true;
    if (!sessionId) {
      setTokenUuid(null);
      setQrCode(null);
      setTimeLeft(DEFAULT_ROTATION_SEC);
      return;
    }

    if (!initialTokenUuid && !initialQrCode) {
      fetchQr(true);
    }

    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [sessionId, initialQrCode, initialTokenUuid, fetchQr]);

  // Countdown timer effect
  useEffect(() => {
    if (!sessionId || isExpiredRef.current) return;

    if (timeLeft <= 0) {
      fetchQr();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, sessionId, fetchQr]);

  const forceRotate = useCallback(async () => {
    await fetchQr(true);
  }, [fetchQr]);

  return { tokenUuid, qrCode, timeLeft, loading, forceRotate };
}
