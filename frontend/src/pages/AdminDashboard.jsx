import React, { useState, useEffect, useCallback } from "react";
import InstitutionsPanel from "../components/admin/InstitutionsPanel";
import UsersPanel from "../components/admin/UsersPanel";
import CoursesPanel from "../components/admin/CoursesPanel";
import SessionsPanel from "../components/admin/SessionsPanel";
import {
  School, Users, BookOpen, Clock,
  CheckCircle, AlertTriangle, RefreshCw,
  ChevronRight, Activity
} from "lucide-react";
import API from "../services/api";

/* ─────────────────────────────────────────────────────────────────
   KPI CARD WITH MINI CHART
───────────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, iconColor, glowColor, label, value, sub, barPct, trending, sparklineData }) {
  const [hovered, setHovered] = useState(false);
  
  // Calculate SVG path for the sparkline
  const generatePath = (data, isFill) => {
    if (!data || data.length === 0) return "";
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((val - min) / range) * 25; // Scale height to 25px max to leave padding
      return `${x},${y}`;
    });
    
    if (isFill) {
      return `M 0,30 L ${points.join(" L ")} L 100,30 Z`;
    }
    return `M ${points.join(" L ")}`;
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--glass-a)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        padding: "18px 16px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.03)",
        transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease",
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 120, height: 120, borderRadius: "50%",
        background: glowColor, opacity: 0.08,
        transform: "translate(30%, -30%)", pointerEvents: "none"
      }} />

      {/* Mini Chart / Sparkline */}
      {sparklineData && (
        <div style={{ 
          position: "absolute", bottom: 0, left: 0, right: 0, height: 45, 
          opacity: hovered ? 0.6 : 0.3, transition: "opacity 300ms ease",
          pointerEvents: "none" 
        }}>
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            <defs>
              <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={iconColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={iconColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={generatePath(sparklineData, true)} fill={`url(#grad-${label.replace(/\s/g, '')})`} />
            <path d={generatePath(sparklineData, false)} fill="none" stroke={iconColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, position: "relative", zIndex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${glowColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Icon size={18} color={iconColor} />
        </div>
        {trending !== undefined && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 6,
            background: trending >= 0 ? "rgba(79,142,247,0.12)" : "rgba(248,113,113,0.12)",
            color: trending >= 0 ? "var(--emerald)" : "var(--danger)"
          }}>
            {trending >= 0 ? "↑" : "↓"} {Math.abs(trending)}%
          </span>
        )}
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1, marginBottom: 4, position: "relative", zIndex: 1, color: "var(--text-primary)" }}>
        {value ?? <span style={{ color: "var(--text-muted)", fontSize: 18 }}>—</span>}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", position: "relative", zIndex: 1 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8, position: "relative", zIndex: 1 }}>{sub}</div>}

      {barPct !== undefined && !sparklineData && (
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 10, overflow: "hidden", position: "relative", zIndex: 1 }}>
          <div style={{
            height: "100%", borderRadius: 2, background: iconColor,
            width: `${Math.min(100, barPct)}%`,
            transition: "width 700ms ease"
          }} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VERTICAL SIDEBAR NAV ITEM
───────────────────────────────────────────────────────────────── */
function SideNavItem({ id, label, Icon, count, description, active, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  const isHighlit = active || hovered;

  return (
    <button
      onClick={() => onClick(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-selected={active}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        borderRadius: 12,
        cursor: "pointer",
        border: active
          ? `1px solid ${color}40`
          : "1px solid transparent",
        background: active
          ? `${color}14`
          : hovered
            ? "rgba(255,255,255,0.05)"
            : "transparent",
        transition: "all 140ms ease",
        textAlign: "left",
        fontFamily: "inherit",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", left: 0, top: "20%", bottom: "20%",
          width: 3, borderRadius: "0 3px 3px 0",
          background: color,
          boxShadow: `0 0 8px ${color}80`
        }} />
      )}

      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: active ? `${color}25` : isHighlit ? `${color}15` : "rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 140ms ease",
      }}>
        <Icon size={16} color={active ? color : isHighlit ? color : "var(--text-muted)"} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: active ? 700 : 500,
          color: active ? color : isHighlit ? "var(--text-primary)" : "var(--text-secondary)",
          transition: "color 140ms ease",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
        }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {description}
          </div>
        )}
      </div>

      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 7px",
          borderRadius: 6, flexShrink: 0,
          background: active ? `${color}25` : "rgba(255,255,255,0.07)",
          color: active ? color : "var(--text-muted)",
          transition: "all 140ms ease",
        }}>
          {count}
        </span>
      )}

      <ChevronRight
        size={13}
        color={active ? color : "var(--text-muted)"}
        style={{
          opacity: active || hovered ? 1 : 0,
          transform: active ? "translateX(0)" : "translateX(-4px)",
          transition: "all 140ms ease",
          flexShrink: 0
        }}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ADMIN INFO CHIP
───────────────────────────────────────────────────────────────── */
function AdminChip({ user }) {
  const initials = user.email.slice(0, 2).toUpperCase();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "var(--glass-b)", border: "1px solid var(--glass-border)",
      borderRadius: 14, padding: "10px 14px",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      flexShrink: 0
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: "linear-gradient(135deg, var(--purple), var(--cyan))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13,
        border: "1px solid rgba(167,139,250,0.35)"
      }}>{initials}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {user.email.split("@")[0]}
        </div>
        <span style={{
          fontSize: 10,
          background: user.is_superuser ? "rgba(79,142,247,0.12)" : "rgba(167,139,250,0.12)",
          color: user.is_superuser ? "var(--emerald)" : "var(--purple)",
          borderRadius: 4, padding: "2px 7px", display: "inline-block", marginTop: 2,
          fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase"
        }}>
          {user.is_superuser ? "Superuser" : `Admin · ${user.institution_name || "Global"}`}
        </span>
      </div>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald-glow)",
        animation: "pulse 2s infinite"
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("institutions");
  const [stats, setStats]         = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Mock historical data for sparklines to simulate activity trends
  const [sparklines] = useState({
    users: [30, 45, 42, 60, 58, 75, 82, 100],
    insts: [5, 5, 6, 6, 7, 7, 7, 8],
    teachers: [10, 12, 15, 14, 18, 22, 25, 30],
    pending: [15, 12, 18, 10, 8, 12, 5, 2]
  });

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [usersRes, instsRes, coursesRes, sessionsRes] = await Promise.all([
        API.get("/admin/users/", { params: { page_size: 1 } }),  // We only need the count
        API.get("/admin/institutions/"),
        API.get("/admin/courses/"),
        API.get("/admin/sessions/"),
      ]);

      // Paginated responses expose the real total in `.count`
      const totalUsers = usersRes.data.count ?? (usersRes.data.results || usersRes.data || []).length;

      // Fetch role-specific counts in parallel using the server filter
      const [studentsRes, teachersRes, unverifiedRes, activeRes] = await Promise.all([
        API.get("/admin/users/", { params: { role: "student",  page_size: 1 } }),
        API.get("/admin/users/", { params: { role: "teacher",  page_size: 1 } }),
        API.get("/admin/users/", { params: { is_email_verified: "false", page_size: 1 } }),
        API.get("/admin/users/", { params: { is_active: "true",  page_size: 1 } }),
      ]);

      const insts    = instsRes.data.results    || instsRes.data    || [];
      const courses  = coursesRes.data.results  || coursesRes.data  || [];
      const sessions = sessionsRes.data.results || sessionsRes.data || [];

      const totalStudents   = studentsRes.data.count   ?? 0;
      const totalTeachers   = teachersRes.data.count   ?? 0;
      const totalUnverified = unverifiedRes.data.count ?? 0;
      const totalActive     = activeRes.data.count     ?? 0;
      const activeSess      = sessions.filter(s => s.is_active);

      setStats({
        totalUsers,
        students: totalStudents,
        teachers: totalTeachers,
        institutions: insts.length,
        courses: courses.length,
        unverified: totalUnverified,
        activeSessions: activeSess.length,
        activeUsers: totalActive,
        activePct: totalUsers ? Math.round((totalActive / totalUsers) * 100) : 0,
      });
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const navItems = [
    {
      id: "institutions",
      label: "Universities",
      Icon: School,
      color: "var(--cyan)",
      count: stats?.institutions,
      description: "Manage institutions & domains",
    },
    {
      id: "users",
      label: "User Accounts",
      Icon: Users,
      color: "var(--emerald)",
      count: stats?.totalUsers,
      description: `${stats?.students ?? "—"} students · ${stats?.teachers ?? "—"} teachers`,
    },
    {
      id: "courses",
      label: "Courses",
      Icon: BookOpen,
      color: "var(--purple)",
      count: stats?.courses,
      description: "Assignments & enrollments",
    },
    {
      id: "sessions",
      label: "Live Sessions",
      Icon: Clock,
      color: "var(--warning)",
      count: stats?.activeSessions,
      description: "Active QR attendance sessions",
    },
  ];

  const activeNav = navItems.find(n => n.id === activeTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ── PAGE TITLE + ADMIN CHIP ─────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
            System Administration
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Manage users, institutions, and sessions across{" "}
            <span style={{ color: "var(--cyan)", fontWeight: 600 }}>
              {stats ? `${stats.institutions} institution${stats.institutions !== 1 ? "s" : ""}` : "all institutions"}
            </span>
            &nbsp;·&nbsp;
            <button onClick={fetchStats} disabled={loadingStats} style={{
              background: "none", border: "none", color: "var(--text-muted)",
              cursor: "pointer", padding: 0, fontSize: 12,
              display: "inline-flex", alignItems: "center", gap: 4,
              fontFamily: "inherit", opacity: loadingStats ? 0.5 : 1
            }}>
              <RefreshCw size={11} style={{ animation: loadingStats ? "spin 1s linear infinite" : "none" }} />
              {loadingStats ? "Loading…" : "Refresh"}
            </button>
          </p>
        </div>
        <AdminChip user={user} />
      </div>

      {/* ── KPI CARDS WITH MINI CHARTS ──────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard
          icon={Users}
          iconColor="var(--emerald)"
          glowColor="#4F8EF7"
          label="Total Users"
          value={loadingStats ? "…" : stats?.totalUsers}
          sub={`${stats?.activeUsers ?? "—"} active accounts`}
          trending={12}
          sparklineData={sparklines.users}
        />
        <KpiCard
          icon={School}
          iconColor="var(--cyan)"
          glowColor="#818CF8"
          label="Institutions"
          value={loadingStats ? "…" : stats?.institutions}
          sub={`${stats?.courses ?? "—"} courses total`}
          trending={3}
          sparklineData={sparklines.insts}
        />
        <KpiCard
          icon={CheckCircle}
          iconColor="var(--purple)"
          glowColor="#A78BFA"
          label="Teachers"
          value={loadingStats ? "…" : stats?.teachers}
          sub={`${stats?.students ?? "—"} students enrolled`}
          trending={8}
          sparklineData={sparklines.teachers}
        />
        <KpiCard
          icon={AlertTriangle}
          iconColor="var(--warning)"
          glowColor="#FBBF24"
          label="Pending Activation"
          value={loadingStats ? "…" : stats?.unverified}
          sub={`${stats?.activeSessions ?? "—"} live sessions now`}
          trending={-5}
          sparklineData={sparklines.pending}
        />
      </div>

      {/* ── SIDEBAR + CONTENT LAYOUT ─────────────────────── */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginTop: 8 }}>

        {/* ── LEFT VERTICAL SIDEBAR ───────────────────── */}
        <div style={{
          width: 240,
          minWidth: 240,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "var(--glass-a)",
          border: "1px solid var(--glass-border)",
          borderRadius: 16,
          padding: 12,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          position: "sticky",
          top: 80,
          boxShadow: "0 12px 32px rgba(0,0,0,0.05)"
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: "8px 14px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={11} />
              Admin Panels
            </div>
          </div>

          {navItems.map(item => (
            <SideNavItem
              key={item.id}
              {...item}
              active={activeTab === item.id}
              onClick={setActiveTab}
            />
          ))}

          {/* Sidebar footer — quick stats */}
          <div style={{
            marginTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "12px 14px 4px"
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 4 }}>
              Quick Stats
            </div>
            {[
              { label: "Active sessions", value: stats?.activeSessions ?? "—", color: "var(--warning)" },
              { label: "Unverified users", value: stats?.unverified ?? "—", color: "var(--danger)" },
              { label: "Total courses",   value: stats?.courses ?? "—",      color: "var(--purple)" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PANEL CONTENT ───────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div key={activeTab}>
            {activeTab === "institutions" && <InstitutionsPanel user={user} />}
            {activeTab === "users"        && <UsersPanel user={user} />}
            {activeTab === "courses"      && <CoursesPanel user={user} />}
            {activeTab === "sessions"     && <SessionsPanel user={user} />}
          </div>
        </div>

      </div>
    </div>
  );
}
