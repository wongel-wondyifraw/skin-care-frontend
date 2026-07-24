"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api";

const inputStyle: React.CSSProperties = {
  border: "none",
  borderBottom: "1px solid #1a1a1a",
  borderRadius: 0,
  padding: "10px 0",
  background: "transparent",
  width: "100%",
  fontSize: "15px",
  lineHeight: "22px",
  color: "#1a1c1c",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.25s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7f7663",
  marginBottom: "4px",
};

const btnStyle: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  color: "#fff",
  border: "none",
  padding: "12px 28px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "background-color 0.2s ease",
  fontFamily: "inherit",
};

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [nameBusy, setNameBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  // Pre-fill name from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("adminUser");
      if (raw) setName((JSON.parse(raw) as { name: string }).name);
    } catch { /* ignore */ }
  }, []);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameBusy(true);
    setNameStatus(null);
    try {
      const res = await apiFetch<{ name: string }>("/admin-users/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      // update localStorage
      try {
        const raw = localStorage.getItem("adminUser");
        if (raw) {
          const u = JSON.parse(raw);
          localStorage.setItem("adminUser", JSON.stringify({ ...u, name: res.name }));
        }
      } catch { /* ignore */ }
      setNameStatus({ ok: true, msg: "Name updated successfully." });
    } catch (err: unknown) {
      setNameStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to update name." });
    } finally {
      setNameBusy(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwStatus({ ok: false, msg: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPwStatus({ ok: false, msg: "New password must be at least 6 characters." });
      return;
    }
    setPwBusy(true);
    setPwStatus(null);
    try {
      await apiFetch("/admin-users/profile", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwStatus({ ok: true, msg: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to change password." });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: "480px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 500, color: "#1a1c1c", marginBottom: "4px" }}>
        Profile
      </h2>
      <p style={{ fontSize: "14px", color: "#7f7663", marginBottom: "36px" }}>
        Update your display name or change your password.
      </p>

      {/* ── Name section ── */}
      <section style={{ marginBottom: "48px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4d4635", marginBottom: "20px", paddingBottom: "8px", borderBottom: "1px solid #d0c5af" }}>
          Display Name
        </h3>
        <form onSubmit={handleNameSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={labelStyle} htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderBottomColor = "#735c00")}
              onBlur={(e) => (e.target.style.borderBottomColor = "#1a1a1a")}
            />
          </div>
          {nameStatus && (
            <p style={{ fontSize: "13px", color: nameStatus.ok ? "#2e7d32" : "#ba1a1a" }} role="alert">
              {nameStatus.msg}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={nameBusy}
              style={{ ...btnStyle, opacity: nameBusy ? 0.6 : 1, cursor: nameBusy ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!nameBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#735c00"; }}
              onMouseLeave={(e) => { if (!nameBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a1a"; }}
            >
              {nameBusy ? "Saving…" : "Save Name"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Password section ── */}
      <section>
        <h3 style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4d4635", marginBottom: "20px", paddingBottom: "8px", borderBottom: "1px solid #d0c5af" }}>
          Change Password
        </h3>
        <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {(["Current Password", "New Password", "Confirm New Password"] as const).map((label, i) => {
            const id = ["current-pw", "new-pw", "confirm-pw"][i];
            const val = [currentPassword, newPassword, confirmPassword][i];
            const setter = [setCurrentPassword, setNewPassword, setConfirmPassword][i];
            return (
              <div key={id}>
                <label style={labelStyle} htmlFor={id}>{label}</label>
                <input
                  id={id}
                  type="password"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  required
                  autoComplete={i === 0 ? "current-password" : "new-password"}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderBottomColor = "#735c00")}
                  onBlur={(e) => (e.target.style.borderBottomColor = "#1a1a1a")}
                />
              </div>
            );
          })}
          {pwStatus && (
            <p style={{ fontSize: "13px", color: pwStatus.ok ? "#2e7d32" : "#ba1a1a" }} role="alert">
              {pwStatus.msg}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={pwBusy}
              style={{ ...btnStyle, opacity: pwBusy ? 0.6 : 1, cursor: pwBusy ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!pwBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#735c00"; }}
              onMouseLeave={(e) => { if (!pwBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a1a"; }}
            >
              {pwBusy ? "Updating…" : "Change Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
