import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * QRCodeDisplay
 *
 * High-performance client-side QR renderer.
 * Encodes the token string locally in the browser on an HTML5 canvas,
 * eliminating the need for server-side image encoding & transmission.
 *
 * @param {Object} props
 * @param {string|null} props.value - The string/UUID to encode in the QR code
 * @param {string|null} [props.fallbackSrc] - Optional data URL fallback if value is not supplied
 * @param {number} [props.size=240] - Canvas width and height in px
 * @param {string} [props.className] - Optional CSS class
 * @param {Object} [props.style] - Optional CSS styles
 * @param {string} [props.alt] - Accessible label
 */
export default function QRCodeDisplay({
  value,
  fallbackSrc = null,
  size = 240,
  className = "",
  style = {},
  alt = "Attendance QR Code",
}) {
  const canvasRef = useRef(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!value) return;

    let isMounted = true;
    setRenderError(false);

    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        },
        (error) => {
          if (error && isMounted) {
            console.error("Client QR generation failed:", error);
            setRenderError(true);
          }
        }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  // If no value is provided, but a fallback base64 image is available
  if (!value && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          imageRendering: "pixelated",
          ...style,
        }}
      />
    );
  }

  // If client-side rendering had an error and fallback is available
  if (renderError && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        ...style,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        style={{
          width: "100%",
          height: "100%",
          display: value ? "block" : "none",
          borderRadius: 8,
        }}
      />
      {!value && !fallbackSrc && (
        <div
          className="skeleton"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          Generating QR…
        </div>
      )}
    </div>
  );
}
