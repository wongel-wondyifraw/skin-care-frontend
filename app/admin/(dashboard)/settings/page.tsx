"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Pencil, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ─── Profile Section ──────────────────────────────────────── */

function ProfileSection() {
  const { adminName, setAdminName } = useAdmin();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(adminName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function openModal() {
    setName(adminName);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setStatus(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setStatus({ ok: false, msg: "Name is required." });
      return;
    }

    const wantsPasswordChange =
      currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;

    if (wantsPasswordChange) {
      if (!currentPassword) {
        setStatus({ ok: false, msg: "Enter your current password." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatus({ ok: false, msg: "Passwords do not match." });
        return;
      }
      if (newPassword.length < 6) {
        setStatus({ ok: false, msg: "New password must be at least 6 characters." });
        return;
      }
    }

    setBusy(true);
    setStatus(null);
    try {
      const res = await apiFetch<{ name: string }>("/admin-users/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: trimmedName,
          ...(wantsPasswordChange ? { currentPassword, newPassword } : {}),
        }),
      });
      setAdminName(res.name);
      setStatus({
        ok: true,
        msg: wantsPasswordChange ? "Profile and password updated." : "Profile updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch (err: unknown) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to update profile." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Display Name</p>
              <p className="text-sm font-medium text-foreground">{adminName || "Administrator"}</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Name and password</p>
                <p className="text-xs text-muted-foreground">
                  Update your display name and password from one shared edit flow.
                </p>
              </div>
            </div>
            {status && (
              <p
                className={`text-sm ${status.ok ? "text-primary" : "text-destructive"}`}
                role="alert"
              >
                {status.msg}
              </p>
            )}
            <Button type="button" size="sm" className="self-start" onClick={openModal}>
              <Pencil className="size-4" /> Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-autofocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current-pw">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                >
                  {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-pw"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave the password fields empty if you only want to change your name.
            </p>
            {status && open && (
              <p
                className={`text-sm ${status.ok ? "text-primary" : "text-destructive"}`}
                role="alert"
              >
                {status.msg}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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

      {/* Mobile: same profile edit flow as desktop */}
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
