import { useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import QRCodeDisplay from "./QRCodeDisplay";

/**
 * QrZoomModal
 *
 * Fullscreen projection modal for QR attendance codes with:
 * - Theme-aware styling (adapts seamlessly between Dark and Light mode)
 * - Real-time rotation countdown indicator
 * - Keyboard (ESC) & backdrop click-to-close listeners
 * - High-performance client-side QR rendering
 * - Responsive sizing and high-contrast projection frame
 */
export default function QrZoomModal({ qrCode, tokenUuid, timeLeft, rotationInterval = 10, loading, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isUrgent = timeLeft <= Math.max(2, Math.floor(rotationInterval * 0.3));
  const progressPct = Math.max(0, Math.min(100, (timeLeft / rotationInterval) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Attendance QR Code Fullscreen"
      className="qr-zoom-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
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
      <div className="qr-zoom-card">
        <div className="qr-zoom-qr-box">
          <QRCodeDisplay
            value={tokenUuid}
            fallbackSrc={qrCode}
            size={Math.min(400, Math.floor(window.innerWidth * 0.72))}
            style={{
              maxWidth: "min(400px, 72vw, 65vh)",
              maxHeight: "min(400px, 72vw, 65vh)",
            }}
            alt="Fullscreen Live Attendance QR Code"
          />
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
            <span>Code rotates in {timeLeft}s</span>
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
            Code refreshes automatically. Press ESC or click anywhere outside to exit.
          </p>
        </div>
      </div>
    </div>
  );
}
