import { ShieldCheck, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { calculateSafetyMetrics } from "../../utils/attendanceCalculator";

export default function SafetyBadge({ attended = 0, total = 0, targetPct = 75 }) {
  const metrics = calculateSafetyMetrics(attended, total, targetPct);

  const icons = {
    safe: ShieldCheck,
    edge: AlertTriangle,
    warning: AlertTriangle,
    critical: AlertCircle,
    unstarted: Clock,
  };
  const Icon = icons[metrics.status] || AlertCircle;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 6,
        background: metrics.badgeBg,
        color: metrics.badgeColor,
        border: `1px solid ${metrics.badgeColor}33`,
        whiteSpace: "nowrap",
        letterSpacing: "0.2px"
      }}
      title={metrics.description}
    >
      <Icon size={12} />
      <span>{metrics.badgeText}</span>
    </span>
  );
}
