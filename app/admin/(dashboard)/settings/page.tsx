"use client";

import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ─── Profile Section ──────────────────────────────────────── */

function ProfileSection() {
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
    } catch (err: unknown) { setNameStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to update." }); }
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
    <div className="max-w-md space-y-5">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Display Name</CardTitle></CardHeader>
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
        <CardHeader className="pb-3"><CardTitle className="text-sm">Change Password</CardTitle></CardHeader>
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

/* ─── Add Admin Form (shared between tab and dialog) ───────── */

function AddAdminForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { setStatus({ ok: false, msg: "Password must be at least 6 characters." }); return; }
    setBusy(true); setStatus(null);
    try {
      const res = await apiFetch<{ name: string; email: string }>("/admin-users", { method: "POST", body: JSON.stringify(form) });
      setStatus({ ok: true, msg: `Admin "${res.name}" (${res.email}) created.` });
      setForm({ name: "", email: "", password: "" });
    } catch (err: unknown) { setStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to create admin." }); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="add-admin-name">Full Name</Label>
        <Input id="add-admin-name" name="name" value={form.name} onChange={handleChange} required autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-admin-email">Email</Label>
        <Input id="add-admin-email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-admin-password">Password</Label>
        <div className="relative">
          <Input id="add-admin-password" name="password" type={showPassword ? "text" : "password"} value={form.password}
            onChange={handleChange} required autoComplete="new-password" className="pr-9" />
          <Button type="button" variant="ghost" size="icon-xs"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide" : "Show"}>
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </div>
      {status && <p className={`text-sm ${status.ok ? "text-primary" : "text-destructive"}`} role="alert">{status.msg}</p>}
      <Button type="submit" disabled={busy} size="sm" className="self-start">{busy ? "Creating…" : "Create Admin"}</Button>
    </form>
  );
}

/* ─── Main Settings Page ───────────────────────────────────── */

export default function SettingsPage() {
  const [addAdminOpen, setAddAdminOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your profile and admin accounts.</p>
        </div>
        {/* Mobile-only button to open Add Admin as a dialog */}
        <Button
          onClick={() => setAddAdminOpen(true)}
          size="sm"
          className="lg:hidden"
        >
          <UserPlus className="size-4" /> Add Admin
        </Button>
      </div>

      {/* Desktop: Tabs for Profile and Add Admin */}
      <div className="hidden lg:block">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="add-admin">Add Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSection />
          </TabsContent>

          <TabsContent value="add-admin">
            <div className="max-w-md">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Create Administrator</CardTitle></CardHeader>
                <CardContent>
                  <AddAdminForm />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile: Profile inline, Add Admin via dialog */}
      <div className="lg:hidden">
        <ProfileSection />
      </div>

      {/* Mobile Add Admin Dialog */}
      <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Admin</DialogTitle></DialogHeader>
          <AddAdminForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
