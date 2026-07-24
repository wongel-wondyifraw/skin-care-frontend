"use client";

import { useState } from "react";
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

export default function AddAdminPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      setStatus({ ok: false, msg: "Password must be at least 6 characters." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await apiFetch<{ name: string; email: string }>("/admin-users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStatus({ ok: true, msg: `Admin "${res.name}" (${res.email}) created successfully.` });
      setForm({ name: "", email: "", password: "" });
    } catch (err: unknown) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to create admin." });
    } finally {
      setBusy(false);
    }
  }

  const fields: { label: string; name: keyof typeof form; type: string; autoComplete: string }[] = [
    { label: "Full Name", name: "name", type: "text", autoComplete: "off" },
    { label: "Email Address", name: "email", type: "email", autoComplete: "off" },
    { label: "Password", name: "password", type: "password", autoComplete: "new-password" },
  ];

  return (
    <div style={{ maxWidth: "480px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 500, color: "#1a1c1c", marginBottom: "4px" }}>
        Add Admin
      </h2>
      <p style={{ fontSize: "14px", color: "#7f7663", marginBottom: "36px" }}>
        Create a new administrator account.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {fields.map(({ label, name, type, autoComplete }) => (
          <div key={name}>
            <label style={labelStyle} htmlFor={`add-admin-${name}`}>{label}</label>
            <input
              id={`add-admin-${name}`}
              name={name}
              type={type}
              value={form[name]}
              onChange={handleChange}
              required
              autoComplete={autoComplete}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderBottomColor = "#735c00")}
              onBlur={(e) => (e.target.style.borderBottomColor = "#1a1a1a")}
            />
          </div>
        ))}

        {status && (
          <p style={{ fontSize: "13px", color: status.ok ? "#2e7d32" : "#ba1a1a" }} role="alert">
            {status.msg}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={busy}
            style={{
              backgroundColor: "#1a1a1a",
              color: "#fff",
              border: "none",
              padding: "12px 28px",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
              transition: "background-color 0.2s ease",
              fontFamily: "inherit",
              borderRadius: "10px",
            }}
            onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#735c00"; }}
            onMouseLeave={(e) => { if (!busy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a1a"; }}
          >
            {busy ? "Creating…" : "Create Admin"}
          </button>
        </div>
      </form>
    </div>
  );
}
