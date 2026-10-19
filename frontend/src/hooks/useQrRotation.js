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
  onSessionExpired,
  onError,
}) {
  const [qrCode, setQrCode] = useState(initialQrCode);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_ROTATION_SEC);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  // Sync initialQrCode if provided on session switch
  useEffect(() => {
    if (initialQrCode) {
      setQrCode(initialQrCode);
      setTimeLeft(DEFAULT_ROTATION_SEC);
    }
  }, [sessionId, initialQrCode]);

  const fetchQr = useCallback(async (isManual = false) => {
    if (!sessionId) return;
    if (isFetchingRef.current && !isManual) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const res = await API.get(`/sessions/${sessionId}/qr/`, {
        signal: ctrl.signal,
      });

      if (!isMountedRef.current) return;

      if (res.data?.session_expired) {
        setQrCode(null);
        onSessionExpired?.();
        return;
      }

      if (res.data?.qr_code) {
        setQrCode(res.data.qr_code);
      }

      if (res.data?.token_expires_at) {
        const msLeft = new Date(res.data.token_expires_at).getTime() - Date.now();
        const secondsLeft = Math.max(1, Math.round(msLeft / 1000));
        setTimeLeft(secondsLeft);
      } else {
        setTimeLeft(DEFAULT_ROTATION_SEC);
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        return;
      }
      if (!isMountedRef.current) return;

      const errMsg = err.response?.data?.error || "Failed to rotate QR code";
      onError?.(errMsg);
      // Backoff for 4 seconds on error to prevent tight error loops
      setTimeLeft(4);
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId, onSessionExpired, onError]);

  // Initial fetch on mount or session change (if no initialQrCode)
  useEffect(() => {
    isMountedRef.current = true;
    if (!sessionId) {
      setQrCode(null);
      setTimeLeft(DEFAULT_ROTATION_SEC);
      return;
    }

    if (!initialQrCode) {
      fetchQr(true);
    }

    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [sessionId, initialQrCode, fetchQr]);

  // Countdown timer effect
  useEffect(() => {
    if (!sessionId) return;

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

  return { qrCode, timeLeft, loading, forceRotate };
}
