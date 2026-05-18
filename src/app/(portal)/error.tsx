"use client";

import Link from "next/link";

export default function PortalError({ reset }: { reset: () => void }) {
  return (
    <div className="portal-page">
      <div className="empty-state">
        <h2>Something went wrong on this page</h2>
        <p>Try again, or return to the dashboard.</p>
        <div className="portal-inline-actions">
          <button className="aq-button aq-button-primary aq-button-md" onClick={reset} type="button">Try again</button>
          <Link className="aq-button aq-button-secondary aq-button-md" href="/dashboard">Go to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
