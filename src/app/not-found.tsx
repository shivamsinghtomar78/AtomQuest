import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <h1>404</h1>
      <p>This page does not exist.</p>
      <Link className="hero-primary" href="/">Go Home</Link>
    </main>
  );
}
