import React, { useRef, useState, useEffect } from "react";
import jsQR from "jsqr";
import API from "../services/api";
import { saveScanOffline, getPendingScansCount, syncOfflineScans } from "../services/offline";
import { Camera, RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Info, ScanLine } from "lucide-react";

export default function Scanner({ user }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isScanningRef = useRef(false);
  const [scanResult, setScanResult] = useState("");
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [scanning, setScanning] = useState(false);

  const firstName = user.email?.split("@")[0]?.split(".")[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "Student";

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); triggerSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    getPendingScansCount().then(setOfflineCount);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    const count = await getPendingScansCount();
    if (count > 0) {
      setStatusMsg({ text: "Syncing offline records…", type: "info" });
      try {
        const res = await syncOfflineScans();
        setStatusMsg({ text: `Successfully synced ${res.success_count} scans!`, type: "success" });
        setOfflineCount(0);
      } catch {
        setStatusMsg({ text: "Sync failed. Will retry later.", type: "error" });
      }
    }
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", true);
      videoRef.current.play();
      setScanning(true);
      isScanningRef.current = true;
      requestAnimationFrame(tick);
    } catch (err) {
      setStatusMsg({ text: `Camera access error: ${err.message}. Please grant camera permission.`, type: "error" });
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setScanning(false);
    isScanningRef.current = false;
  };

  const tick = () => {
    if (!isScanningRef.current) return;
    if (videoRef.current?.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const w = videoRef.current.videoWidth;
        const h = videoRef.current.videoHeight;
        if (w > 0 && h > 0) {
          canvas.width = w; canvas.height = h;
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          if (code) { handleQRMark(code.data); stopScanning(); return; }
        }
      }
    }
    if (isScanningRef.current) requestAnimationFrame(tick);
  };

  const handleQRMark = async (tokenUuid) => {
    setScanResult(tokenUuid);
    setStatusMsg({ text: "Processing attendance scan…", type: "info" });
    if (navigator.onLine) {
      try {
        await API.post("/attendance/mark/", { token_uuid: tokenUuid });
        setStatusMsg({ text: "Attendance marked successfully!", type: "success" });
      } catch (err) {
        setStatusMsg({ text: err.response?.data?.error || "Error marking attendance", type: "error" });
      }
    } else {
      try {
        await saveScanOffline(tokenUuid);
        setStatusMsg({ text: "Offline: Scan saved locally. Will sync when connected.", type: "info" });
        const count = await getPendingScansCount();
        setOfflineCount(count);
      } catch {
        setStatusMsg({ text: "Failed to save scan locally.", type: "error" });
      }
    }
  };

  const statusConfig = {
    success: { cls: "alert-success", Icon: CheckCircle },
    error:   { cls: "alert-danger",  Icon: AlertCircle },
    info:    { cls: "alert-info",    Icon: Info },
  };
  const sc = statusConfig[statusMsg.type] || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingTop: 12 }}>

      {/* Welcome */}
      <div className="glass-a" style={{ width: "100%", maxWidth: 540, padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>QR Scanner</h2>
            <p className="text-meta" style={{ marginTop: 4 }}>Welcome back, {displayName}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${isOnline ? "badge-good" : "badge-defaulter"}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? "Online" : "Offline"}
            </span>
            {offlineCount > 0 && (
              <span className="badge badge-warning">{offlineCount} queued</span>
            )}
          </div>
        </div>
      </div>

      {/* Scanner Card */}
      <div className="glass-b" style={{ width: "100%", maxWidth: 540, padding: 28 }}>

        {/* Status message */}
        {statusMsg.text && (
          <div className={`alert ${sc.cls}`} style={{ marginBottom: 20 }}>
            {sc.Icon && <sc.Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Camera viewport */}
        <div style={{
          position: "relative",
          width: "100%", aspectRatio: "4/3",
          background: "rgba(7,17,31,0.8)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          overflow: "hidden",
          marginBottom: 20,
        }}>
          <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Scan frame overlay */}
          {scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{
                width: 180, height: 180,
                border: "2px solid var(--emerald)",
                borderRadius: 12,
                boxShadow: "0 0 24px rgba(57,217,138,0.4), inset 0 0 24px rgba(57,217,138,0.08)",
                animation: "scanPulse 2s ease-in-out infinite",
              }} />
              <style>{`
                @keyframes scanPulse {
                  0%, 100% { box-shadow: 0 0 20px rgba(57,217,138,0.3), inset 0 0 20px rgba(57,217,138,0.06); }
                  50% { box-shadow: 0 0 40px rgba(57,217,138,0.5), inset 0 0 30px rgba(57,217,138,0.12); }
                }
              `}</style>
            </div>
          )}

          {/* Enable camera overlay */}
          {!scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "rgba(7,17,31,0.6)", backdropFilter: "blur(4px)" }}>
              <div style={{
                width: 60, height: 60,
                background: "var(--emerald-dim)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(57,217,138,0.3)",
              }}>
                <Camera size={26} color="var(--emerald)" />
              </div>
              <button onClick={startScanning} className="btn-primary" style={{ gap: 8 }}>
                <ScanLine size={16} /> Enable Camera
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scanning && (
            <button onClick={stopScanning} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
              Cancel Scan
            </button>
          )}
          {offlineCount > 0 && isOnline && (
            <button onClick={triggerSync} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              <RefreshCw size={15} /> Sync {offlineCount} Offline Scan{offlineCount > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Hint */}
        <p className="text-meta" style={{ textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
          Point your camera at the QR code displayed by your instructor. The code auto-rotates every 2 minutes.
        </p>
      </div>
    </div>
  );
}
