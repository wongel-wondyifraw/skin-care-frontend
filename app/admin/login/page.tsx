import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Skeleton className="h-80 w-full max-w-sm rounded-xl" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
