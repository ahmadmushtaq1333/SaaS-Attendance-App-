import { useMemo } from "react";
import { ShieldCheck, AlertTriangle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { calculateSafetyMetrics } from "../../utils/attendanceCalculator";

export default function AttendanceSafetyCalculator({ courses = [] }) {
  // 75% is the standard university minimum attendance requirement
  const TARGET_PCT = 75;

  const courseList = useMemo(() => {
    return courses.map(course => {
      const attended = course.attended_count || 0;
      const total = course.total_sessions || 0;
      const metrics = calculateSafetyMetrics(attended, total, TARGET_PCT);
      return {
        ...course,
        attended,
        total,
        metrics,
      };
    });
  }, [courses]);

  const atRiskCount = courseList.filter(
    c => c.metrics.status === "warning" || c.metrics.status === "critical" || c.metrics.status === "edge"
  ).length;

  if (courses.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
        No enrolled courses found.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Overall Health Summary Banner */}
      <div style={{
        background: atRiskCount > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
        border: `1px solid ${atRiskCount > 0 ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)"}`,
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
        {atRiskCount > 0 ? (
          <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
        ) : (
          <CheckCircle2 size={20} color="var(--emerald)" style={{ flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {atRiskCount > 0
              ? `${atRiskCount} course${atRiskCount > 1 ? "s" : ""} need${atRiskCount === 1 ? "s" : ""} attention`
              : "All courses are in good standing"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Minimum required attendance is {TARGET_PCT}%.
          </div>
        </div>
      </div>

      {/* Clean list of courses */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {courseList.map(item => {
          const { metrics } = item;
          const isSafe = metrics.status === "safe";
          const isEdge = metrics.status === "edge";
          const isUnstarted = metrics.status === "unstarted";

          return (
            <div
              key={item.course_id}
              style={{
                background: "var(--glass-a)",
                border: "1px solid var(--glass-border)",
                borderRadius: 14,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}
            >
              {/* Header: Course Name & Percentage */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.course_name}
                  </h4>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {item.total > 0
                      ? `${item.attended} of ${item.total} classes attended`
                      : "No classes held yet"}
                  </span>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: isUnstarted ? "var(--text-muted)" : item.metrics.currentPct >= TARGET_PCT ? "var(--emerald)" : "var(--danger)"
                  }}>
                    {item.total > 0 ? `${item.metrics.currentPct}%` : "—"}
                  </span>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Target: {TARGET_PCT}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              {item.total > 0 && (
                <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, item.metrics.currentPct)}%`,
                    height: "100%",
                    background: item.metrics.currentPct >= TARGET_PCT ? "var(--emerald)" : "var(--danger)",
                    borderRadius: 3,
                    transition: "width 0.3s ease"
                  }} />
                </div>
              )}

              {/* The Bottom Line: What this means for the student */}
              <div style={{
                background: metrics.badgeBg,
                border: `1px solid ${metrics.badgeColor}33`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 2
              }}>
                {isSafe && <ShieldCheck size={18} color={metrics.badgeColor} style={{ flexShrink: 0 }} />}
                {isEdge && <AlertTriangle size={18} color={metrics.badgeColor} style={{ flexShrink: 0 }} />}
                {!isSafe && !isEdge && !isUnstarted && <AlertCircle size={18} color={metrics.badgeColor} style={{ flexShrink: 0 }} />}
                {isUnstarted && <Clock size={18} color={metrics.badgeColor} style={{ flexShrink: 0 }} />}

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: metrics.badgeColor }}>
                    {metrics.headline}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {metrics.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
