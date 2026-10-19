import { useEffect } from "react";
import { X, RefreshCw } from "lucide-react";

/**
 * QrZoomModal
 *
 * Fullscreen projection modal for QR attendance codes with:
 * - Real-time rotation countdown indicator
 * - Keyboard (ESC) & backdrop click-to-close listeners
 * - Responsive sizing and high-contrast projection frame
 * - Graceful loading placeholder if QR code is initializing
 */
export default function QrZoomModal({ qrCode, timeLeft, loading, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isUrgent = timeLeft <= 3;
  const progressPct = Math.max(0, Math.min(100, (timeLeft / 10) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Attendance QR Code Fullscreen"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(3, 7, 18, 0.90)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
      }}
    >
      <button
        onClick={onClose}
        className="btn-secondary"
        aria-label="Close fullscreen view"
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          padding: "10px 16px",
          gap: 6,
          zIndex: 1001,
          borderRadius: 10,
        }}
      >
        <X size={18} /> Close
      </button>

      {/* Projection Card Container */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 24,
          padding: "28px 24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(79, 142, 247, 0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "92vw",
          width: "auto",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            padding: 20,
            borderRadius: 20,
            boxShadow: "0 10px 35px rgba(0, 0, 0, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 240,
            minHeight: 240,
          }}
        >
          {qrCode ? (
            <img
              src={qrCode}
              alt="Live Attendance QR Code"
              style={{
                width: "min(400px, 72vw, 65vh)",
                height: "min(400px, 72vw, 65vh)",
                objectFit: "contain",
                display: "block",
                imageRendering: "pixelated",
              }}
            />
          ) : (
            <div
              className="skeleton"
              style={{
                width: "min(400px, 72vw, 65vh)",
                height: "min(400px, 72vw, 65vh)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
              }}
            >
              Loading QR Code…
            </div>
          )}
        </div>

        {/* Rotation Countdown & Status */}
        <div
          style={{
            marginTop: 22,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div className={`countdown-badge ${isUrgent ? "urgent" : ""}`}>
            <RefreshCw
              size={14}
              className={isUrgent || loading ? "animate-spin" : ""}
            />
            <span>Anti-Cheat Rotation in {timeLeft}s</span>
          </div>

          <div
            className="progress-bar"
            style={{ width: "min(260px, 70vw)", height: 6 }}
          >
            <div
              className={`progress-fill ${isUrgent ? "danger" : ""}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--text-secondary)",
              maxWidth: 360,
            }}
          >
            Token refreshes automatically to eliminate proxy attendance. Press ESC or click outside to exit.
          </p>
        </div>
      </div>
    </div>
  );
}
