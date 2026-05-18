"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getFirebaseClient } from "@/lib/firebase/client";

type AuthMode = "sign-in" | "sign-up";

type LoginFormProps = {
  initialMode?: AuthMode;
};

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

function authErrorMessage(error: unknown, mode: AuthMode) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account already exists for this email. Sign in instead.";
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password. Please try again.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was closed before it completed.";
      case "auth/operation-not-allowed":
        return "This sign-in provider is not enabled in Firebase Authentication.";
      case "auth/unauthorized-domain":
        return "This domain is not allowed in Firebase Authentication.";
      case "auth/weak-password":
        return "Password must be at least 8 characters.";
      default:
        return mode === "sign-up"
          ? "Unable to create your account. Please try again."
          : "Unable to sign in. Please try again.";
    }
  }

  if (error instanceof Error) {
    if (error.message.startsWith("Missing Firebase config")) {
      return `${error.message}. Add these variables in Vercel and redeploy.`;
    }

    return error.message;
  }

  return mode === "sign-up"
    ? "Unable to create your account. Please try again."
    : "Unable to sign in. Please try again.";
}

export function LoginForm({ initialMode = "sign-in" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = validInternalPath(searchParams.get("callbackUrl"));
  const hasUrlError = searchParams.has("error");
  const sessionExpired = searchParams.get("reason") === "session_expired";
  const isSignUp = initialMode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<"email" | "google" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    sessionExpired || hasUrlError
      ? "Your session expired. Please sign in again."
      : null
  );

  const submitting = pendingProvider !== null;
  const isDemoMode = process.env.NODE_ENV !== "production" && !isSignUp;
  const switchHref = `${isSignUp ? "/login" : "/signup"}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const title = isSignUp ? "Create your AtomQuest account" : "Sign in to your workspace";
  const subtitle = isSignUp
    ? "Use email or Google to join your workspace."
    : "Use email or Google to continue.";

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

  async function createAppSession(idToken: string, displayName?: string | null) {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken, name: displayName }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? "Unable to create your app session.");
    }
  }

  async function prepareFirebaseAuth() {
    const { auth } = getFirebaseClient();
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );
    return auth;
  }

  function finishAuth(rememberedEmail?: string | null) {
    if (rememberedEmail) {
      rememberEmail(rememberedEmail);
    } else {
      rememberEmail(email);
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingProvider("email");
    setErrorMessage(null);

    try {
      const auth = await prepareFirebaseAuth();
      const normalizedEmail = email.trim().toLowerCase();
      const displayName = name.trim();
      const credential = isSignUp
        ? await createUserWithEmailAndPassword(auth, normalizedEmail, password)
        : await signInWithEmailAndPassword(auth, normalizedEmail, password);

      if (isSignUp && displayName) {
        await updateProfile(credential.user, { displayName });
      }

      const idToken = await credential.user.getIdToken(true);
      await createAppSession(idToken, displayName || credential.user.displayName);
      finishAuth(credential.user.email ?? normalizedEmail);
    } catch (error) {
      setErrorMessage(authErrorMessage(error, initialMode));
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleGoogleAuth() {
    setPendingProvider("google");
    setErrorMessage(null);

    try {
      const { googleProvider } = getFirebaseClient();
      const auth = await prepareFirebaseAuth();
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken(true);
      await createAppSession(idToken, credential.user.displayName);
      finishAuth(credential.user.email);
    } catch (error) {
      setErrorMessage(authErrorMessage(error, initialMode));
    } finally {
      setPendingProvider(null);
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
      <h1 id="login-heading">{title}</h1>
      <p className="login-subtitle">{subtitle}</p>

      <button
        className="oauth-button"
        disabled={submitting}
        type="button"
        onClick={handleGoogleAuth}
      >
        <span className="google-mark" aria-hidden="true">G</span>
        {pendingProvider === "google" ? "Connecting..." : "Continue with Google"}
      </button>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {isSignUp ? (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        ) : null}

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
              autoComplete={isSignUp ? "new-password" : "current-password"}
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
          {pendingProvider === "email" ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {isSignUp ? "Creating account..." : "Signing in..."}
            </>
          ) : (
            <>
              {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
              {isSignUp ? "Create Account" : "Sign In"}
            </>
          )}
        </button>

        {errorMessage ? (
          <div className="error-pill" role="alert">
            {errorMessage}
          </div>
        ) : null}
      </form>

      <p className="auth-switch">
        {isSignUp ? "Already have an account?" : "New to AtomQuest?"}{" "}
        <Link href={switchHref}>
          {isSignUp ? "Sign in" : "Create account"}
        </Link>
      </p>

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
