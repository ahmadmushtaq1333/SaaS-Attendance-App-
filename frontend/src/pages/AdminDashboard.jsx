import React, { useState } from "react";
import InstitutionsPanel from "../components/admin/InstitutionsPanel";
import UsersPanel from "../components/admin/UsersPanel";
import CoursesPanel from "../components/admin/CoursesPanel";
import SessionsPanel from "../components/admin/SessionsPanel";
import { School, Users, BookOpen, Clock, Shield } from "lucide-react";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("institutions");

  const tabs = [
    { id: "institutions", label: "Universities",      Icon: School },
    { id: "users",        label: "User Accounts",     Icon: Users },
    { id: "courses",      label: "Courses",           Icon: BookOpen },
    { id: "sessions",     label: "Active Sessions",   Icon: Clock },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Admin Hero */}
      <div className="glass-a" style={{ padding: "26px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, background: "radial-gradient(circle, rgba(123,97,255,0.15), transparent 70%)", borderRadius: "50%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 46, height: 46,
            background: "linear-gradient(135deg, rgba(123,97,255,0.25), rgba(57,217,138,0.15))",
            border: "1px solid rgba(123,97,255,0.35)",
            borderRadius: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={22} color="var(--purple)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>System Administration</h1>
            <p className="text-meta" style={{ marginTop: 3 }}>
              {user.email} · Platform Administrator
            </p>
          </div>
        </div>
      </div>

      {/* Glass Tab Bar */}
      <div className="glass-tabs">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`glass-tab ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)}
            aria-selected={activeTab === id}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div key={activeTab}>
        {activeTab === "institutions" && <InstitutionsPanel />}
        {activeTab === "users"        && <UsersPanel />}
        {activeTab === "courses"      && <CoursesPanel />}
        {activeTab === "sessions"     && <SessionsPanel />}
      </div>
    </div>
  );
}
