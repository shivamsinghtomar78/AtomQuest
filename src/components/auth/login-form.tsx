"use client";

import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type DemoUser = {
  label: string;
  email: string;
};

const demoUsers: DemoUser[] = [
  { label: "Employee", email: "emp1@atomquest.com" },
  { label: "Manager", email: "manager@atomquest.com" },
  { label: "Admin", email: "admin@atomquest.com" },
];

const demoPassword = "AtomQuest@123";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";
  const hasUrlError = searchParams.has("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const showError = hasUrlError || hasSubmitError;
  const isDemoMode = process.env.NODE_ENV !== "production";

  const passwordInputType = useMemo(
    () => (showPassword ? "text" : "password"),
    [showPassword]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setHasSubmitError(false);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (!result?.ok) {
      setHasSubmitError(true);
      return;
    }

    if (remember) {
      localStorage.setItem("atomquest:remember-email", email);
    } else {
      localStorage.removeItem("atomquest:remember-email");
    }

    router.push(result.url || callbackUrl);
    router.refresh();
  }

  function fillDemoUser(user: DemoUser) {
    setEmail(user.email);
    setPassword(demoPassword);
    setHasSubmitError(false);
  }

  return (
    <section className="login-card" aria-labelledby="login-heading">
      <div className="wordmark">AtomQuest</div>
      <h1 id="login-heading">Sign in to your workspace</h1>
      <p className="login-subtitle">Use your work email to continue.</p>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-control">
            <input
              id="password"
              name="password"
              type={passwordInputType}
              autoComplete="current-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="icon-button"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className="remember-row">
          <input
            checked={remember}
            type="checkbox"
            onChange={(event) => setRemember(event.target.checked)}
          />
          Remember me
        </label>

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        {showError ? (
          <div className="error-pill" role="alert">
            Invalid credentials. Please try again.
          </div>
        ) : null}
      </form>

      {isDemoMode ? (
        <div className="demo-switcher" aria-label="Demo role switcher">
          <p>Demo access</p>
          <div className="demo-buttons">
            {demoUsers.map((user) => (
              <button
                className="secondary-button"
                key={user.email}
                type="button"
                onClick={() => fillDemoUser(user)}
              >
                {user.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
