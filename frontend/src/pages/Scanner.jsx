import React, { useRef, useState, useEffect } from "react";
import jsQR from "jsqr";
import API from "../services/api";
import { saveScanOffline, getPendingScansCount, syncOfflineScans } from "../services/offline";
import { Camera, RefreshCw, Wifi, WifiOff } from "lucide-react";

export default function Scanner({ user }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isScanningRef = useRef(false);
  const [scanResult, setScanResult] = useState("");
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    // Monitor connection
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check of offline count
    getPendingScansCount().then(setOfflineCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    const count = await getPendingScansCount();
    if (count > 0) {
      setStatusMsg({ text: "Syncing offline records...", type: "info" });
      try {
        const res = await syncOfflineScans();
        setStatusMsg({ text: `Successfully synced ${res.success_count} scans!`, type: "success" });
        setOfflineCount(0);
      } catch (err) {
        setStatusMsg({ text: "Sync failed. Will retry later.", type: "error" });
      }
    }
  };

  const startScanning = async () => {
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
      videoRef.current.play();
      setScanning(true);
      isScanningRef.current = true;
      requestAnimationFrame(tick);
    } catch (err) {
      console.error("Camera access error:", err);
      setStatusMsg({ 
        text: `Error accessing camera: ${err.name} - ${err.message}. Please ensure permissions are granted and you are using a secure context or enabled chrome://flags.`, 
        type: "error" 
      });
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setScanning(false);
    isScanningRef.current = false;
  };

  const tick = () => {
    if (!isScanningRef.current) return;
    
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d");
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        
        if (width > 0 && height > 0) {
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          context.drawImage(videoRef.current, 0, 0, width, height);
          
          const imageData = context.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            handleQRMark(code.data);
            stopScanning();
            return;
          }
        }
      }
    }
    if (isScanningRef.current) {
      requestAnimationFrame(tick);
    }
  };

  const handleQRMark = async (tokenUuid) => {
    setScanResult(tokenUuid);
    setStatusMsg({ text: "Processing attendance scan...", type: "info" });

    if (navigator.onLine) {
      try {
        await API.post("/attendance/mark/", { token_uuid: tokenUuid });
        setStatusMsg({ text: "Attendance marked successfully!", type: "success" });
      } catch (err) {
        const errorDetail = err.response?.data?.error || "Error marking attendance";
        setStatusMsg({ text: errorDetail, type: "error" });
      }
    } else {
      // Offline mode
      try {
        await saveScanOffline(tokenUuid);
        setStatusMsg({ text: "Offline: Scan saved locally. Will sync once connected.", type: "info" });
        const count = await getPendingScansCount();
        setOfflineCount(count);
      } catch (err) {
        setStatusMsg({ text: "Failed to save scan locally.", type: "error" });
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
      <div className="glass-panel" style={{ padding: "24px", width: "100%", maxWidth: "500px", textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px 0" }}>QR Attendance Scanner</h2>
        <p style={{ color: "#9ca3af", margin: "0 0 20px 0" }}>Logged in as student: {user.email}</p>

        {/* Connectivity indicator */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          {isOnline ? (
            <span className="badge-good" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Wifi size={14} /> Online Mode
            </span>
          ) : (
            <span className="badge-defaulter" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <WifiOff size={14} /> Offline Mode
            </span>
          )}
          {offlineCount > 0 && (
            <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "4px 8px", borderRadius: "6px", fontSize: "0.85rem" }}>
              {offlineCount} queued scan(s)
            </span>
          )}
        </div>

        {/* Status Messaging */}
        {statusMsg.text && (
          <div style={{
            background: statusMsg.type === "success" ? "rgba(34, 197, 94, 0.1)" : statusMsg.type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)",
            border: `1px solid ${statusMsg.type === "success" ? "#22c55e" : statusMsg.type === "error" ? "#ef4444" : "#6366f1"}`,
            color: statusMsg.type === "success" ? "#4ade80" : statusMsg.type === "error" ? "#f87171" : "#818cf8",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
            textAlign: "left"
          }}>
            {statusMsg.text}
          </div>
        )}

        {/* Camera presentation view */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#1f2937", borderRadius: "16px", overflow: "hidden", marginBottom: "20px" }}>
          <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          
          {!scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <button onClick={startScanning} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Camera size={18} /> Enable Camera
              </button>
            </div>
          )}
        </div>

        {scanning && (
          <button onClick={stopScanning} className="btn-secondary" style={{ width: "100%" }}>
            Cancel Scan
          </button>
        )}

        {offlineCount > 0 && isOnline && (
          <button onClick={triggerSync} className="btn-primary" style={{ width: "100%", marginTop: "12px" }}>
            Manual Sync
          </button>
        )}
      </div>
    </div>
  );
}
