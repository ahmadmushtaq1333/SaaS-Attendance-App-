import AdminDashboard from "../pages/AdminDashboard";
import Scanner from "../pages/Scanner";
import Dashboard from "../pages/Dashboard";
import Reports from "../pages/Reports";

export default function RoleRouter({ user, currentView, selectedCourseId, onViewReports, onBack }) {
  if (user.role === "admin" || user.is_staff) {
    return <AdminDashboard user={user} />;
  }
  if (user.role === "student") {
    return <Scanner user={user} />;
  }
  if (user.role === "teacher") {
    if (currentView === "dashboard") {
      return (
        <Dashboard
          user={user}
          onViewReports={onViewReports}
        />
      );
    }
    if (currentView === "reports") {
      return (
        <Reports
          courseId={selectedCourseId}
          onBack={onBack}
        />
      );
    }
  }
  return null;
}
