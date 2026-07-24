"use client";

import { useState } from "react";

interface LoginDesktopProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error?: string | null;
}

export default function LoginDesktop({ onSubmit, loading, error }: LoginDesktopProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: "#ffffff" }}
    >
      <main
        className="flex-grow flex items-center justify-center relative overflow-hidden"
        style={{ padding: "48px 80px" }}
      >
        {/* Subtle ambient gradient blobs */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ opacity: 0.18 }}
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              top: "-96px",
              right: "-96px",
              width: "384px",
              height: "384px",
              borderRadius: "50%",
              backgroundColor: "#ffe088",
              filter: "blur(120px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-96px",
              left: "-96px",
              width: "384px",
              height: "384px",
              borderRadius: "50%",
              backgroundColor: "#c8c6c2",
              filter: "blur(120px)",
            }}
          />
        </div>

        {/* Login card container */}
        <div className="relative z-10 w-full" style={{ maxWidth: "480px" }}>
          {/* Logo / brand */}
          <div
            className="flex flex-col items-center"
            style={{ marginBottom: "48px" }}
          >
            <h1
              className="uppercase"
              style={{
                fontSize: "28px",
                lineHeight: "36px",
                fontWeight: 500,
                color: "#735c00",
                letterSpacing: "0.3em",
              }}
            >
              Meadf Skin Care
            </h1>
          </div>

          {/* Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0px 12px 32px rgba(0,0,0,0.06)",
              padding: "56px",
            }}
          >
            {/* Card heading */}
            <div
              className="text-center"
              style={{ marginBottom: "40px" }}
            >
              <h2
                style={{
                  fontSize: "28px",
                  lineHeight: "36px",
                  fontWeight: 500,
                  color: "#1a1c1c",
                  marginBottom: "8px",
                }}
              >
                Welcome Back
              </h2>
              <p style={{ fontSize: "16px", lineHeight: "24px", color: "#5f5e5e" }}>
                Please enter your details to access the dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="flex flex-col" style={{ gap: "36px" }} noValidate>
              {/* Email */}
              <div className="flex flex-col" style={{ gap: "4px" }}>
                <label
                  htmlFor="desktop-email"
                  className="uppercase block transition-colors duration-300"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: focusedField === "email" ? "#735c00" : "#4d4635",
                  }}
                >
                  Email Address
                </label>
                <input
                  id="desktop-email"
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
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col" style={{ gap: "4px" }}>
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="desktop-password"
                    className="uppercase transition-colors duration-300"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.12em",
                      fontWeight: 600,
                      color: focusedField === "password" ? "#735c00" : "#4d4635",
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
                    id="desktop-password"
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
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors"
                    style={{
                      color: "#5f5e5e",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#735c00")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#5f5e5e")}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ width: "20px", height: "20px" }} aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ width: "20px", height: "20px" }} aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              {error && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#ba1a1a",
                    letterSpacing: "0.02em",
                    marginTop: "-8px",
                  }}
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 transition-all duration-300"
                style={{
                  backgroundColor: loading ? "#4a3d00" : "#1a1a1a",
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: "20px",
                  padding: "20px 24px",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  fontFamily: "inherit",
                  marginTop: "8px",
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
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
