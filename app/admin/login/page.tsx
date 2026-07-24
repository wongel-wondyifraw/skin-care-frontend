"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginMobile from "./LoginMobile";
import LoginDesktop from "./LoginDesktop";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Invalid credentials");
      }

      const data: { accessToken: string; admin: { id: string; name: string; email: string } } =
        await res.json();

      // Persist token for subsequent authenticated requests
      localStorage.setItem("adminToken", data.accessToken);
      localStorage.setItem("adminUser", JSON.stringify(data.admin));

      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Mobile layout */}
      <div className="block lg:hidden">
        <LoginMobile onSubmit={handleSubmit} loading={loading} error={error} />
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <LoginDesktop onSubmit={handleSubmit} loading={loading} error={error} />
      </div>
    </>
  );
}
