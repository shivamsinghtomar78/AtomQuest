import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <Suspense fallback={<div className="login-card">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
