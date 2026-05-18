"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { BriefcaseBusiness, Code2, X } from "lucide-react";

type Article = {
  title: string;
  date: string;
  summary: string;
};

const articles: Article[] = [
  {
    title: "Why weightage rules matter more than goal count",
    date: "May 2026",
    summary:
      "A practical look at why balanced weightage creates better accountability than simply asking teams to add more goals.",
  },
  {
    title: "How we built the UoM score engine in 48 hours",
    date: "May 2026",
    summary:
      "Behind the scenes of the Min, Max, Timeline, and Zero formulas that power AtomQuest achievement tracking.",
  },
  {
    title: "OKRs vs KPIs: What AtomQuest actually tracks",
    date: "May 2026",
    summary:
      "AtomQuest borrows the clarity of OKRs and the rigor of KPIs, then turns them into quarterly check-in workflows.",
  },
];

function StaticContactModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="landing-modal-layer" role="dialog" aria-modal="true" aria-label="Contact AtomQuest">
      <button aria-label="Close contact form" className="landing-modal-backdrop" onClick={onClose} type="button" />
      <form className="contact-modal" onSubmit={submit}>
        <div className="demo-modal-header">
          <h2>Request a demo</h2>
          <button aria-label="Close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        {submitted ? (
          <div className="contact-success">
            <strong>Thanks. We'll reach out within 24 hours.</strong>
            <p>Your request is saved in this browser session for the demo flow.</p>
          </div>
        ) : (
          <div className="contact-fields">
            <label>
              <span>Name</span>
              <input required name="name" />
            </label>
            <label>
              <span>Company Email</span>
              <input required name="email" type="email" />
            </label>
            <label>
              <span>Team Size</span>
              <select required name="teamSize" defaultValue="">
                <option disabled value="">Choose team size</option>
                <option>1-25</option>
                <option>26-100</option>
                <option>101-500</option>
                <option>500+</option>
              </select>
            </label>
            <button className="hero-primary" type="submit">Send request</button>
          </div>
        )}
      </form>
    </div>
  );
}

function MarketingNav({ onContact }: { onContact: () => void }) {
  return (
    <header className="static-nav">
      <Link className="landing-logo" href="/">
        <span>Atom</span>Quest
      </Link>
      <nav>
        <Link href="/#features">Features</Link>
        <Link href="/#roles">Roles</Link>
        <Link href="/#how-it-works">How It Works</Link>
        <Link href="/#pricing">Pricing</Link>
        <button type="button" onClick={onContact}>Contact</button>
        <Link href="/login">Sign In</Link>
      </nav>
    </header>
  );
}

function MarketingFooter({ onContact }: { onContact: () => void }) {
  return (
    <footer className="static-footer">
      <span>© 2026 AtomQuest</span>
      <div>
        <Link href="/#features">Features</Link>
        <Link href="/#roles">Roles</Link>
        <Link href="/#faq">FAQ</Link>
        <button type="button" onClick={onContact}>Contact</button>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
    </footer>
  );
}

export function StaticPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <main className="static-page">
      <MarketingNav onContact={() => setContactOpen(true)} />
      <section className="static-hero">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <section className="static-content">{children}</section>
      <MarketingFooter onContact={() => setContactOpen(true)} />
      {contactOpen ? <StaticContactModal onClose={() => setContactOpen(false)} /> : null}
    </main>
  );
}

export function AboutPageContent() {
  return (
    <StaticPageShell
      eyebrow="About"
      title="We built AtomQuest to solve goal chaos"
      description="A focused hackathon product for teams that need cleaner goal setting, approvals, check-ins, and governance."
    >
      <div className="static-prose">
        <p>
          AtomQuest started as a Hackathon 1.0 build around a familiar workplace problem:
          goals are often created in scattered sheets, reviewed over chat, and revisited only
          when reporting becomes urgent. The product brings that work into one structured
          flow, from annual goal planning through quarterly achievement updates.
        </p>
        <p>
          The first version focuses on practical guardrails: a maximum of eight goals,
          exact 100% weightage, manager approval, locked sheets, audit trails, and scoring
          formulas that make progress visible without pretending to be a full appraisal system.
        </p>
      </div>
      <div className="static-card-grid">
        <article>
          <h2>Mission</h2>
          <p>Make structured performance management accessible to every team.</p>
        </article>
        <article>
          <h2>Builder</h2>
          <p>Shivam Singh Tomar</p>
          <Link href="https://github.com/shivamsinghtomar78/AtomQuest">
            <Code2 size={16} />
            GitHub repo
          </Link>
        </article>
      </div>
    </StaticPageShell>
  );
}

export function BlogPageContent() {
  return (
    <StaticPageShell
      eyebrow="Blog"
      title="Blog"
      description="Thoughts on goal-setting, performance management, and product building."
    >
      <div className="article-grid">
        {articles.map((article) => (
          <article key={article.title}>
            <span>{article.date}</span>
            <h2>{article.title}</h2>
            <p>{article.summary}</p>
            <strong>Coming soon</strong>
          </article>
        ))}
      </div>
    </StaticPageShell>
  );
}

export function CareersPageContent() {
  return (
    <StaticPageShell
      eyebrow="Careers"
      title="We're building the future of performance management"
      description="No open roles right now, but we'd love to hear from you."
    >
      <div className="static-card-grid">
        <article>
          <h2>Send your resume</h2>
          <Link href="mailto:admin@atomquest.com">admin@atomquest.com</Link>
        </article>
        {["Clarity over theater", "Governance with empathy", "Build fast, keep trust"].map((value) => (
          <article key={value}>
            <h2>{value}</h2>
            <p>Small teams do their best work when systems are simple, visible, and fair.</p>
          </article>
        ))}
      </div>
    </StaticPageShell>
  );
}

export function PolicyPageContent({ type }: { type: "privacy" | "terms" | "cookies" }) {
  const isPrivacy = type === "privacy";
  const isTerms = type === "terms";

  return (
    <StaticPageShell
      eyebrow="Last updated: May 2026"
      title={
        isPrivacy ? "Privacy Policy" : isTerms ? "Terms of Service" : "Cookie Policy"
      }
      description={
        isPrivacy
          ? "How this demo SaaS app handles account, goal, and usage data."
          : isTerms
            ? "The basic terms for using the AtomQuest demo workspace."
            : "How AtomQuest may use essential cookies for authentication and app preferences."
      }
    >
      <div className="static-prose">
        {isPrivacy ? (
          <>
            <h2>Data Collected</h2>
            <p>AtomQuest stores user profiles, role information, goal sheets, quarterly updates, manager comments, notifications, and audit entries needed to run the demo workflow.</p>
            <h2>How We Use It</h2>
            <p>Data is used to authenticate users, enforce role-based access, calculate achievement scores, show dashboards, and maintain an audit trail.</p>
            <h2>Data Storage</h2>
            <p>Demo data is stored in the configured application database. Passwords are handled by Firebase Authentication and are never stored in the AtomQuest database.</p>
            <h2>User Rights</h2>
            <p>Users can request correction or deletion of demo data by contacting the project owner.</p>
            <h2>Contact</h2>
            <p>Contact admin@atomquest.com for privacy questions about this demo.</p>
          </>
        ) : isTerms ? (
          <>
            <h2>Acceptance</h2>
            <p>By using AtomQuest, you agree to use the demo workspace responsibly and only for evaluation or hackathon review.</p>
            <h2>Account Responsibilities</h2>
            <p>You are responsible for keeping demo credentials private and for actions performed under your account.</p>
            <h2>Permitted Use</h2>
            <p>You may create, review, and report on goal data within the intended product workflow.</p>
            <h2>Limitation of Liability</h2>
            <p>AtomQuest is provided as a demo application without production service guarantees.</p>
          </>
        ) : (
          <>
            <h2>Essential Cookies</h2>
            <p>AtomQuest may use authentication cookies and local browser storage to keep users signed in and remember interface preferences.</p>
            <h2>Analytics</h2>
            <p>No third-party analytics cookies are required for the demo experience.</p>
            <h2>Contact</h2>
            <p>Contact admin@atomquest.com with cookie policy questions.</p>
          </>
        )}
      </div>
    </StaticPageShell>
  );
}

export function SocialLinks() {
  return (
    <div className="footer-socials">
      <Link aria-label="GitHub" href="https://github.com/shivamsinghtomar78/AtomQuest">
        <Code2 size={16} />
      </Link>
      <Link aria-label="LinkedIn" href="https://www.linkedin.com">
        <BriefcaseBusiness size={16} />
      </Link>
    </div>
  );
}
