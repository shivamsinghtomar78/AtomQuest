"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <h1>Something went wrong</h1>
      {process.env.NODE_ENV === "development" ? <p>{error.message}</p> : <p>Please try again.</p>}
      <button className="hero-primary" onClick={reset} type="button">Retry</button>
    </main>
  );
}
