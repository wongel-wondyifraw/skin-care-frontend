"use client";

import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ─── Unified Profile Card (inline on mobile + desktop) ─────── */

function ProfileCard() {
  const toast = useToast();
  const { adminName, setAdminName } = useAdmin();
  const [name, setName] = useState(adminName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    const wantsPasswordChange =
      currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;

    if (wantsPasswordChange) {
      if (!currentPassword) {
        toast.error("Enter your current password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ name: string }>("/admin-users/profile", {
        method: "PATCH",
        toastOnError: false,
        body: JSON.stringify({
          name: trimmedName,
          ...(wantsPasswordChange ? { currentPassword, newPassword } : {}),
        }),
      });
      setAdminName(res.name);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(
        wantsPasswordChange ? "Profile and password updated" : "Profile updated",
      );
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your Profile</CardTitle>
        <CardDescription>
          Update your display name and password in one place.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Display Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Change Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leave blank if you only want to update your name.
              </p>
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
          </div>

          <Button type="submit" disabled={busy} className="self-start" size="sm">
            {busy ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Add Admin Form ───────────────────────────────────────── */

function AddAdminForm() {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ name: string; email: string }>("/admin-users", {
        method: "POST",
        toastOnError: false,
        body: JSON.stringify(form),
      });
      toast.success("Admin created", `${res.name} (${res.email}) can now sign in.`);
      setForm({ name: "", email: "", password: "" });
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
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
      <Button type="submit" disabled={busy} size="sm" className="self-start">{busy ? "Creating…" : "Create Admin"}</Button>
    </form>
  );
}

/* ─── Main Settings Page ───────────────────────────────────── */

export default function SettingsPage() {
  const [addAdminOpen, setAddAdminOpen] = useState(false);

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your profile and admin accounts.</p>
        </div>
        <Button
          onClick={() => setAddAdminOpen(true)}
          size="sm"
          className="lg:hidden"
        >
          <UserPlus className="size-4" /> Add Admin
        </Button>
      </div>

      {/* Desktop: tabs with unified profile card + add admin */}
      <div className="hidden lg:block">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="add-admin">Add Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileCard />
          </TabsContent>

          <TabsContent value="add-admin">
            <Card className="max-w-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Create Administrator</CardTitle>
                <CardDescription>Invite another admin to manage the catalogue.</CardDescription>
              </CardHeader>
              <CardContent>
                <AddAdminForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile: profile is a single card; add admin via dialog */}
      <div className="lg:hidden">
        <ProfileCard />
      </div>

      <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Admin</DialogTitle></DialogHeader>
          <AddAdminForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
