"use client";

import { useState } from "react";
import { apiFetch } from "../../../../../lib/api";

const fieldClass =
  "border border-outline-variant rounded-xl px-3 py-2.5 bg-transparent w-full text-[15px] leading-[22px] text-on-background outline-none font-inherit transition-colors focus:border-primary";
const labelClass =
  "block text-[11px] font-semibold tracking-[0.12em] uppercase text-outline mb-1";
const primaryBtn =
  "bg-[#1a1a1a] text-white border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl font-inherit hover:bg-primary transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

export default function AddAdminPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
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
      setStatus({
        ok: true,
        msg: `Admin "${res.name}" (${res.email}) created successfully.`,
      });
      setForm({ name: "", email: "", password: "" });
    } catch (err: unknown) {
      setStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to create admin.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[480px]">
      <h2 className="text-[22px] font-medium text-on-background mb-1">Add Admin</h2>
      <p className="text-sm text-outline mb-9">Create a new administrator account.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className={labelClass} htmlFor="add-admin-name">Full Name</label>
          <input
            id="add-admin-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="add-admin-email">Email Address</label>
          <input
            id="add-admin-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="add-admin-password">Password</label>
          <div className="relative">
            <input
              id="add-admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className={`${fieldClass} pr-10`}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-primary bg-transparent border-none cursor-pointer p-0"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {status && (
          <p
            className={`text-[13px] ${status.ok ? "text-primary" : "text-error"}`}
            role="alert"
          >
            {status.msg}
          </p>
        )}

        <div>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Creating…" : "Create Admin"}
          </button>
        </div>
      </form>
    </div>
  );
}
