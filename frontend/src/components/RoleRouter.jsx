import { lazy, Suspense } from "react";

const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const Scanner = lazy(() => import("../pages/Scanner"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Reports = lazy(() => import("../pages/Reports"));

const RouteLoadingFallback = () => (
  <div className="glass-spinner" style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
    <div className="spinner-ring" />
    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading view…</span>
  </div>
);

export default function RoleRouter({ user, currentView, selectedCourseId, onViewReports, onBack }) {
  let content = null;

  if (user.role === "admin" || user.is_staff) {
    content = <AdminDashboard user={user} />;
  } else if (user.role === "student") {
    content = <Scanner user={user} />;
  } else if (user.role === "teacher") {
    if (currentView === "dashboard") {
      content = (
        <Dashboard
          user={user}
          onViewReports={onViewReports}
        />
      );
    } else if (currentView === "reports") {
      content = (
        <Reports
          courseId={selectedCourseId}
          onBack={onBack}
        />
      );
    }
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      {content}
    </Suspense>
  );
}
