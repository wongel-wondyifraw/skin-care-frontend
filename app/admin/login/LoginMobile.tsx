"use client";

import { useState } from "react";

interface LoginMobileProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}

export default function LoginMobile({ onSubmit, loading }: LoginMobileProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      {/* Form section — vertically centered in viewport */}
      <main className="flex-grow flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
        <section className="space-y-8">
          {/* Brand name */}
          <div className="text-center pb-2">
            <h1
              className="text-[#735c00] uppercase tracking-[0.3em] font-medium"
              style={{ fontSize: "22px", lineHeight: "1.2" }}
            >
              Meadf Skin Care
            </h1>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2
              className="text-[#1a1c1c] font-normal"
              style={{ fontSize: "32px", lineHeight: "40px" }}
            >
              Welcome Back
            </h2>
            <p className="text-[#5f5e5e]" style={{ fontSize: "16px", lineHeight: "24px" }}>
              Sign in to access your admin portal.
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={onSubmit} className="space-y-8" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="mobile-email"
                className="uppercase block transition-colors duration-300"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  fontWeight: 600,
                  color: focusedField === "email" ? "#735c00" : "#5f5e5e",
                }}
              >
                Email Address
              </label>
              <input
                id="mobile-email"
                name="email"
                type="email"
                placeholder="admin@meadf.com"
                required
                autoComplete="email"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                style={{
                  border: "none",
                  borderBottom: `1px solid ${focusedField === "email" ? "#735c00" : "#1a1a1a"}`,
                  borderRadius: 0,
                  padding: "12px 0",
                  background: "transparent",
                  width: "100%",
                  fontSize: "16px",
                  lineHeight: "24px",
                  color: "#1a1c1c",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="mobile-password"
                  className="uppercase transition-colors duration-300"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: focusedField === "password" ? "#735c00" : "#5f5e5e",
                  }}
                >
                  Password
                </label>
                <a
                  href="#"
                  className="transition-opacity hover:opacity-70"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: "#735c00",
                    textDecoration: "none",
                    textTransform: "uppercase",
                  }}
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  id="mobile-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    border: "none",
                    borderBottom: `1px solid ${focusedField === "password" ? "#735c00" : "#1a1a1a"}`,
                    borderRadius: 0,
                    padding: "12px 0",
                    paddingRight: "36px",
                    background: "transparent",
                    width: "100%",
                    fontSize: "16px",
                    lineHeight: "24px",
                    color: "#1a1c1c",
                    outline: "none",
                    transition: "border-color 0.3s ease",
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors hover:text-[#735c00]"
                  style={{ color: "#5f5e5e", background: "none", border: "none", cursor: "pointer" }}
                >
                  {/* Eye icon */}
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
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 transition-all duration-300"
                style={{
                  backgroundColor: loading ? "#4a3d00" : "#1a1a1a",
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: "20px",
                  padding: "20px 24px",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#735c00";
                }}
                onMouseLeave={(e) => {
                  if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a1a";
                }}
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
            </div>
          </form>
        </section>
        </div>
      </main>
    </div>
  );
}
