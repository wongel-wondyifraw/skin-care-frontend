"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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

      localStorage.setItem("adminToken", data.accessToken);
      localStorage.setItem("adminUser", JSON.stringify(data.admin));

      // Write the token to a cookie so middleware can read it server-side
      // and redirect unauthenticated users before the page renders.
      // SameSite=Strict keeps it first-party only; no HttpOnly so JS can clear it on sign-out.
      const maxAge = 60 * 60 * 24 * 7; // 7 days — matches JWT_EXPIRES_IN
      document.cookie = `adminToken=${data.accessToken}; path=/; max-age=${maxAge}; SameSite=Strict`;

      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <main className="flex-grow flex items-center justify-center relative overflow-hidden px-5 py-8 lg:px-20 lg:py-12">
        {/* Subtle ambient gradient blobs */}
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-64 h-64 lg:w-96 lg:h-96 rounded-full bg-[#ffe088] blur-[80px] lg:blur-[120px]" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 lg:w-96 lg:h-96 rounded-full bg-[#c8c6c2] blur-[80px] lg:blur-[120px]" />
        </div>

        {/* Login card container */}
        <div className="relative z-10 w-full max-w-[480px]">
          {/* Logo / brand */}
          <div className="flex flex-col items-center mb-10 lg:mb-12">
            <h1 className="uppercase text-2xl lg:text-3xl font-medium text-[#735c00] tracking-[0.2em] lg:tracking-[0.3em] text-center">
              Meadf Skin Care
            </h1>
          </div>

          {/* Card */}
          <div className="bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:shadow-[0_12px_32px_rgba(0,0,0,0.06)] p-8 lg:p-14 rounded-2xl lg:rounded-[20px]">
            {/* Card heading */}
            <div className="text-center mb-8 lg:mb-10">
              <h2 className="text-2xl lg:text-3xl font-medium text-[#1a1c1c] mb-2 lg:mb-3">
                Welcome Back
              </h2>
              <p className="text-sm lg:text-base text-[#5f5e5e]">
                Please enter your details to access the dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-8 lg:gap-9" noValidate>
              {/* Email */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="email"
                  className={`uppercase block transition-colors duration-300 text-[10px] lg:text-[11px] tracking-[0.12em] font-semibold ${
                    focusedField === "email" ? "text-[#735c00]" : "text-[#4d4635]"
                  }`}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@meadf.com"
                  required
                  autoComplete="email"
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className={`border border-[#d0c5af] rounded-xl px-4 py-3 bg-transparent w-full text-base text-[#1a1c1c] outline-none transition-colors duration-300 focus:border-[#735c00] ${
                    focusedField === "email" ? "border-[#735c00]" : "border-[#1a1a1a]"
                  }`}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className={`uppercase block transition-colors duration-300 text-[10px] lg:text-[11px] tracking-[0.12em] font-semibold ${
                      focusedField === "password" ? "text-[#735c00]" : "text-[#4d4635]"
                    }`}
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    className="transition-opacity hover:opacity-70 text-[10px] lg:text-[11px] tracking-[0.12em] font-semibold text-[#735c00] uppercase no-underline"
                  >
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className={`border border-[#d0c5af] rounded-xl px-4 py-3 pr-10 bg-transparent w-full text-base text-[#1a1c1c] outline-none transition-colors duration-300 focus:border-[#735c00] ${
                      focusedField === "password" ? "border-[#735c00]" : "border-[#1a1a1a]"
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-[#735c00] transition-colors p-0 bg-transparent border-none cursor-pointer"
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

              {/* Submit */}
              {error && (
                <p className="text-[13px] text-[#ba1a1a] tracking-[0.02em] -mt-2" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center gap-2 transition-all duration-300 uppercase tracking-[0.15em] text-[13px] font-semibold leading-5 py-5 px-6 border-none mt-2 rounded-xl text-white ${
                  loading ? "bg-[#4a3d00] cursor-not-allowed opacity-75" : "bg-[#1a1a1a] hover:bg-[#735c00] cursor-pointer"
                }`}
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
