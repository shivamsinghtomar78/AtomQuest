"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getFirebaseClient } from "@/lib/firebase/client";

type DemoUser = {
  label: string;
  email: string;
  password: string;
};

const demoUsers: DemoUser[] = [
  { label: "Employee", email: "emp1@atomquest.com", password: "Employee@1234" },
  { label: "Manager", email: "manager@atomquest.com", password: "Manager@1234" },
  { label: "Admin", email: "admin@atomquest.com", password: "Admin@1234" },
];

function validInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/api/") || value.startsWith("/_next/")) return "/dashboard";
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = validInternalPath(searchParams.get("callbackUrl"));
  const hasUrlError = searchParams.has("error");
  const sessionExpired = searchParams.get("reason") === "session_expired";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    sessionExpired || hasUrlError
      ? "Your session expired. Please sign in again."
      : null
  );

  const isDemoMode = process.env.NODE_ENV !== "production";

  const passwordInputType = useMemo(
    () => (showPassword ? "text" : "password"),
    [showPassword]
  );

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("atomquest:remember-email");

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  function rememberEmail(value = email) {
    if (remember) {
      localStorage.setItem("atomquest:remember-email", value);
    } else {
      localStorage.removeItem("atomquest:remember-email");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { auth } = getFirebaseClient();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Invalid email or password. Please try again.");
      }

      rememberEmail(email);
      router.replace(callbackUrl);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoUser(user: DemoUser) {
    setEmail(user.email);
    setPassword(user.password);
    setErrorMessage(null);
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

        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        {errorMessage ? (
          <div className="error-pill" role="alert">
            {errorMessage}
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
                disabled={submitting}
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
