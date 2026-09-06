import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import Reports from "./pages/Reports";
import AdminDashboard from "./pages/AdminDashboard";
import API from "./services/api";
import { LogOut, Bell, Settings, Activity, BarChart2, Home, Sun, Moon } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("theme") !== "dark");

  useEffect(() => {
    if (lightMode) {
      document.documentElement.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
    }
  }, [lightMode]);

  useEffect(() => {
    // Attempt to restore session via HTTPOnly cookie — no localStorage check needed
    API.get("/auth/me/")
      .then((res) => {
        setUser(res.data);
        if (res.data.role === "student") setCurrentView("scanner");
        else if (res.data.role === "admin" || res.data.is_staff) setCurrentView("admin");
        else setCurrentView("dashboard");
      })
      .catch(() => {
        // No valid session cookie — show login
      })
      .finally(() => setLoading(false));

    // Listen for irrecoverable 401 from api.js token refresh failure
    const onLogout = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout/"); // clears HTTPOnly cookies server-side
    } catch {
      // Ignore errors — still clear client state
    }
    setUser(null);
  };

  const getInitials = (email) => {
    if (!email) return "?";
    return email.split("@")[0].slice(0, 2).toUpperCase();
  };

  const teacherLinks = [
    { id: "dashboard", label: "Overview", icon: <Home size={14} /> },
    { id: "reports", label: "Reports", icon: <BarChart2 size={14} /> },
  ];
  const adminLinks = [
    { id: "admin", label: "Dashboard", icon: <Home size={14} /> },
  ];
  const studentLinks = [
    { id: "scanner", label: "Scanner", icon: <Activity size={14} /> },
  ];

  const navLinks =
    !user ? [] :
    user.role === "teacher" ? teacherLinks :
    (user.role === "admin" || user.is_staff) ? adminLinks :
    studentLinks;

  if (loading) {
    return (
      <>
        <div className="app-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <div className="glass-spinner">
          <div className="spinner-ring" />
          <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading Quorum…</span>
        </div>
      </>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => {
      setUser(loggedInUser);
      if (loggedInUser.role === "student") setCurrentView("scanner");
      else if (loggedInUser.role === "admin" || loggedInUser.is_staff) setCurrentView("admin");
      else setCurrentView("dashboard");
    }} lightMode={lightMode} setLightMode={setLightMode} />;
  }

  return (
    <>
      <div className="app-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="app-content">
        <nav className="glass-nav" role="navigation" aria-label="Main navigation">
          <div className="nav-brand">
            <div className="nav-logo" style={{ background: "linear-gradient(135deg, var(--emerald), var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={15} color="#07111F" strokeWidth={2.5} />
            </div>
            <span className="nav-title">Quorum</span>
          </div>

          <div className="nav-links">
            {navLinks.map(link => (
              <button
                key={link.id}
                className={`nav-link ${currentView === link.id ? "active" : ""}`}
                onClick={() => {
                  setCurrentView(link.id);
                }}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <button className="nav-icon-btn" onClick={() => setLightMode(!lightMode)} title={lightMode ? "Dark Mode" : "Light Mode"} aria-label="Theme toggle">
              {lightMode ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button className="nav-icon-btn desktop-only" title="Notifications" aria-label="Notifications" onClick={() => alert("Notifications: No new alerts.")}>
              <Bell size={15} />
            </button>
            <button className="nav-icon-btn desktop-only" title="Settings" aria-label="Settings" onClick={() => alert("Settings panel coming soon.")}>
              <Settings size={15} />
            </button>
            <div
              className="nav-avatar"
              title={`${user.email} (${user.role})`}
              aria-label={`User: ${user.email}`}
            >
              {getInitials(user.email)}
            </div>
            <button
              className="btn-danger btn-logout"
              onClick={handleLogout}
              style={{ padding: "8px 12px", fontSize: 13 }}
              title="Logout"
            >
              <LogOut size={14} />
              <span className="btn-logout-text">Logout</span>
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Bar (visible only on screens <= 768px when navLinks > 1) */}
        {navLinks.length > 1 && (
          <div className="mobile-nav-bar">
            {navLinks.map(link => (
              <button
                key={link.id}
                className={`mobile-nav-link ${currentView === link.id ? "active" : ""}`}
                onClick={() => setCurrentView(link.id)}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Page content with ultra-high 90+ FPS GPU acceleration */}
        <main className="page-main page-enter" key={currentView} role="main">
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
    </>
  );
}
