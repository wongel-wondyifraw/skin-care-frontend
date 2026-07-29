"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="max-w-md">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Add Admin</h2>
        <p className="text-sm text-muted-foreground">Create a new administrator account.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </div>
  );
}
