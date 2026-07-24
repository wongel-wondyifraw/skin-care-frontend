"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginMobile from "./LoginMobile";
import LoginDesktop from "./LoginDesktop";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    setLoading(true);
    try {
      // TODO: replace with real auth call, e.g. signIn(email, password)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Login attempt:", { email, password });
      router.push("/admin/dashboard");
    } catch {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Mobile layout: shown below lg breakpoint */}
      <div className="block lg:hidden">
        <LoginMobile onSubmit={handleSubmit} loading={loading} />
      </div>

      {/* Desktop layout: shown at lg breakpoint and above */}
      <div className="hidden lg:block">
        <LoginDesktop onSubmit={handleSubmit} loading={loading} />
      </div>
    </>
  );
}
