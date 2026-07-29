"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    e.preventDefault(); if (!name.trim()) return;
    setNameBusy(true); setNameStatus(null);
    try {
      const res = await apiFetch<{ name: string }>("/admin-users/profile", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      setAdminName(res.name); setNameStatus({ ok: true, msg: "Name updated." });
    } catch (err: unknown) { setNameStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to update name." }); }
    finally { setNameBusy(false); }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwStatus({ ok: false, msg: "Passwords do not match." }); return; }
    if (newPassword.length < 6) { setPwStatus({ ok: false, msg: "Min 6 characters." }); return; }
    setPwBusy(true); setPwStatus(null);
    try {
      await apiFetch("/admin-users/profile", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) });
      setPwStatus({ ok: true, msg: "Password changed." }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) { setPwStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to change password." }); }
    finally { setPwBusy(false); }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">Update your display name or change your password.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Display Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            {nameStatus && <p className={`text-sm ${nameStatus.ok ? "text-primary" : "text-destructive"}`} role="alert">{nameStatus.msg}</p>}
            <Button type="submit" disabled={nameBusy} size="sm" className="self-start">{nameBusy ? "Saving…" : "Save Name"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            {([["Current Password", "current-pw", currentPassword, setCurrentPassword, "current-password"], ["New Password", "new-pw", newPassword, setNewPassword, "new-password"], ["Confirm", "confirm-pw", confirmPassword, setConfirmPassword, "new-password"]] as const).map(([label, id, val, setter, ac]) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input id={id} type="password" value={val} onChange={(e) => setter(e.target.value)} required autoComplete={ac} />
              </div>
            ))}
            {pwStatus && <p className={`text-sm ${pwStatus.ok ? "text-primary" : "text-destructive"}`} role="alert">{pwStatus.msg}</p>}
            <Button type="submit" disabled={pwBusy} size="sm" className="self-start">{pwBusy ? "Updating…" : "Change Password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
