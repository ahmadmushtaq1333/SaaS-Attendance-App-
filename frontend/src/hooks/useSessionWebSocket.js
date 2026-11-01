import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useSessionWebSocket
 *
 * Establishes a real-time bidirectional WebSocket channel for live attendance updates.
 * Includes automatic reconnection with exponential backoff, ping/pong heartbeats,
 * and graceful fallback tracking.
 *
 * @param {Object} options
 * @param {number|null} options.sessionId - Active attendance session ID
 * @param {Function} [options.onAttendanceMarked] - Callback when student marks attendance
 * @param {Function} [options.onRosterOverride] - Callback when attendance is overridden
 * @param {Function} [options.onSessionStopped] - Callback when session is ended
 * @param {boolean} [options.enabled=true] - Whether to connect
 * @returns {{ isConnected: boolean, status: string, lastMessage: any }}
 */
export function useSessionWebSocket({
  sessionId,
  onAttendanceMarked,
  onRosterOverride,
  onSessionStopped,
  enabled = true,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("disconnected"); // "disconnected" | "connecting" | "connected" | "error"
  const [lastMessage, setLastMessage] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Keep callback refs fresh without resetting connection
  const callbacksRef = useRef({
    onAttendanceMarked,
    onRosterOverride,
    onSessionStopped,
  });
  useEffect(() => {
    callbacksRef.current = {
      onAttendanceMarked,
      onRosterOverride,
      onSessionStopped,
    };
  });

  const getWebSocketUrl = useCallback((id) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    let base = "";

    if (apiUrl) {
      // E.g. https://api.quorum.com/api -> wss://api.quorum.com/ws/sessions/123/
      base = apiUrl.replace(/\/api\/?$/, "");
      base = base.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    } else {
      // Dev fallback: use window.location host or localhost:8000
      const isHttps = window.location.protocol === "https:";
      const wsProto = isHttps ? "wss:" : "ws:";
      const host = window.location.hostname;
      // In Vite dev server, backend is typically on :8000
      const port = window.location.port === "5173" ? "8000" : window.location.port;
      base = `${wsProto}//${host}${port ? `:${port}` : ""}`;
    }

    return `${base}/ws/sessions/${id}/`;
  }, []);

  const connect = useCallback(() => {
    if (!sessionId || !enabled) return;

    // Clear existing socket if any
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        /* ignore */
      }
    }

    const wsUrl = getWebSocketUrl(sessionId);
    setStatus("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setStatus("connected");
        reconnectAttemptsRef.current = 0;

        // Start 30s heartbeat to keep connection alive through reverse proxies
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const payload = JSON.parse(event.data);
          setLastMessage(payload);

          if (payload.type === "attendance.marked") {
            callbacksRef.current.onAttendanceMarked?.(payload.data);
          } else if (payload.type === "roster.override") {
            callbacksRef.current.onRosterOverride?.(payload.data);
          } else if (payload.type === "session.stopped") {
            callbacksRef.current.onSessionStopped?.(payload.data);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        setStatus("error");
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        setStatus("disconnected");
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

        // Do not auto-reconnect if closed normally (1000) or unauthorized (4401/4403)
        if (event.code !== 1000 && event.code !== 4401 && event.code !== 4403) {
          const delay = Math.min(10000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.warn("WebSocket initialization failed, falling back to polling:", err);
      setStatus("error");
      setIsConnected(false);
    }
  }, [sessionId, enabled, getWebSocketUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounted");
      }
    };
  }, [connect]);

  return { isConnected, status, lastMessage };
}
