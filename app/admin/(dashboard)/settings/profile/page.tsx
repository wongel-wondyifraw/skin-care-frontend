"use client";

import { useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import { useAdmin } from "../../../../../lib/admin-context";

const fieldClass =
  "border border-outline-variant rounded-xl px-3 py-2.5 bg-transparent w-full text-[15px] leading-[22px] text-on-background outline-none font-inherit transition-colors focus:border-primary";
const labelClass =
  "block text-[11px] font-semibold tracking-[0.12em] uppercase text-outline mb-1";
const primaryBtn =
  "bg-[#1a1a1a] text-white border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl font-inherit hover:bg-primary transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
const sectionTitle =
  "text-[13px] font-semibold tracking-[0.1em] uppercase text-[#4d4635] mb-5 pb-2 border-b border-outline-variant";

export default function ProfilePage() {
  const { adminName, setAdminName } = useAdmin();
  const [name, setName] = useState(adminName);
  const [nameStatus, setNameStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [nameBusy, setNameBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

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
      setAdminName(res.name);
      setNameStatus({ ok: true, msg: "Name updated successfully." });
    } catch (err: unknown) {
      setNameStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to update name.",
      });
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
      setPwStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to change password.",
      });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="max-w-[480px]">
      <h2 className="text-[22px] font-medium text-on-background mb-1">Profile</h2>
      <p className="text-sm text-outline mb-9">
        Update your display name or change your password.
      </p>

      <section className="mb-12">
        <h3 className={sectionTitle}>Display Name</h3>
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-5">
          <div>
            <label className={labelClass} htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          {nameStatus && (
            <p
              className={`text-[13px] ${nameStatus.ok ? "text-primary" : "text-error"}`}
              role="alert"
            >
              {nameStatus.msg}
            </p>
          )}
          <div>
            <button type="submit" disabled={nameBusy} className={primaryBtn}>
              {nameBusy ? "Saving…" : "Save Name"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h3 className={sectionTitle}>Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
          {(
            [
              ["Current Password", "current-pw", currentPassword, setCurrentPassword, "current-password"],
              ["New Password", "new-pw", newPassword, setNewPassword, "new-password"],
              ["Confirm New Password", "confirm-pw", confirmPassword, setConfirmPassword, "new-password"],
            ] as const
          ).map(([label, id, val, setter, autoComplete]) => (
            <div key={id}>
              <label className={labelClass} htmlFor={id}>{label}</label>
              <input
                id={id}
                type="password"
                value={val}
                onChange={(e) => setter(e.target.value)}
                required
                autoComplete={autoComplete}
                className={fieldClass}
              />
            </div>
          ))}
          {pwStatus && (
            <p
              className={`text-[13px] ${pwStatus.ok ? "text-primary" : "text-error"}`}
              role="alert"
            >
              {pwStatus.msg}
            </p>
          )}
          <div>
            <button type="submit" disabled={pwBusy} className={primaryBtn}>
              {pwBusy ? "Updating…" : "Change Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
