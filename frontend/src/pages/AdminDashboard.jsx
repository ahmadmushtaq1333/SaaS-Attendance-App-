import React, { useState } from "react";
import InstitutionsPanel from "../components/admin/InstitutionsPanel";
import UsersPanel from "../components/admin/UsersPanel";
import CoursesPanel from "../components/admin/CoursesPanel";
import SessionsPanel from "../components/admin/SessionsPanel";
import { School, Users, BookOpen, Clock } from "lucide-react";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("institutions"); // institutions, users, courses, sessions

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "700" }}>System Administrator Dashboard</h1>
        <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>Logged in as: {user.email} (System Admin)</p>
      </div>

      {/* Tab selection toolbar */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("institutions")}
          className={activeTab === "institutions" ? "btn-primary" : "btn-secondary"}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px" }}
        >
          <School size={16} /> Universities (Tenants)
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={activeTab === "users" ? "btn-primary" : "btn-secondary"}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px" }}
        >
          <Users size={16} /> User Accounts
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={activeTab === "courses" ? "btn-primary" : "btn-secondary"}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px" }}
        >
          <BookOpen size={16} /> Course Management
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={activeTab === "sessions" ? "btn-primary" : "btn-secondary"}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px" }}
        >
          <Clock size={16} /> Active Sessions
        </button>
      </div>

      {/* Dynamic module content */}
      <div key={activeTab} className="animate-fade-in" style={{ marginTop: "12px" }}>
        {activeTab === "institutions" && <InstitutionsPanel />}
        {activeTab === "users" && <UsersPanel />}
        {activeTab === "courses" && <CoursesPanel />}
        {activeTab === "sessions" && <SessionsPanel />}
      </div>
    </div>
  );
}
