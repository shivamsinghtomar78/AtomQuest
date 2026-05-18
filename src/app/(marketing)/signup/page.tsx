import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function SignupPage() {
  return (
    <main className="login-page">
      <Suspense fallback={<div className="login-card">Loading sign up...</div>}>
        <LoginForm initialMode="sign-up" />
      </Suspense>
    </main>
  );
}
