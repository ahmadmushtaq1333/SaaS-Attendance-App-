import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import Reports from "./pages/Reports";
import AdminDashboard from "./pages/AdminDashboard";
import API from "./services/api";
import { LogOut, User, Activity } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard, scanner, reports
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  useEffect(() => {
    // Attempt login restoration
    const token = localStorage.getItem("access_token");
    if (token) {
      API.get("/auth/me/")
        .then((res) => {
          setUser(res.data);
          if (res.data.role === "student") {
            setCurrentView("scanner");
          } else if (res.data.role === "admin" || res.data.is_staff) {
            setCurrentView("admin");
          } else {
            setCurrentView("dashboard");
          }
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h3 style={{ color: "#9ca3af" }}>Loading...</h3>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => {
      setUser(loggedInUser);
      if (loggedInUser.role === "student") {
        setCurrentView("scanner");
      } else if (loggedInUser.role === "admin" || loggedInUser.is_staff) {
        setCurrentView("admin");
      } else {
        setCurrentView("dashboard");
      }
    }} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar header */}
      <header className="glass-panel" style={{ margin: "16px", padding: "16px 24px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Activity color="#6366f1" size={28} />
          <span style={{ fontSize: "1.4rem", fontWeight: "800", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AttendanceSaaS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.9rem" }}>
            <User size={16} />
            {user.email} ({user.role})
          </span>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Primary body section */}
      <main style={{ flex: 1, padding: "0 16px 32px 16px", maxWidth: "1200px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {(user.role === "admin" || user.is_staff) && <AdminDashboard user={user} />}
        {user.role === "student" && <Scanner user={user} />}
        {user.role === "teacher" && (
          <>
            {currentView === "dashboard" && (
              <Dashboard
                user={user}
                onViewReports={(courseId) => {
                  setSelectedCourseId(courseId);
                  setCurrentView("reports");
                }}
              />
            )}
            {currentView === "reports" && (
              <Reports
                courseId={selectedCourseId}
                onBack={() => setCurrentView("dashboard")}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
