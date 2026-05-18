"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Gauge,
  Lock,
  Menu,
  Settings,
  Share2,
  User,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { SocialLinks } from "@/components/marketing/static-page";

const navItems = [
  { label: "Features", href: "#features", id: "features" },
  { label: "How It Works", href: "#how-it-works", id: "how-it-works" },
  { label: "Roles", href: "#roles", id: "roles" },
  { label: "FAQ", href: "#faq", id: "faq" },
];

const headlineWords = "Set goals that actually drive teams forward".split(" ");

const featureCards = [
  {
    title: "Goal Creation & Validation",
    text: "Employees draft clear goals across thrust areas while weightage rules keep every sheet balanced.",
    className: "feature-card-large feature-card-blue-edge",
    visual: "weightage",
  },
  {
    title: "Max 8 goals",
    text: "Focused sheets prevent noisy planning.",
    className: "feature-card-number",
    visual: "eight",
  },
  {
    title: "L1 Manager Approval",
    text: "Review, edit, approve, or return goals with comments.",
    visual: "approval",
  },
  {
    title: "Shared Goals",
    text: "Push one departmental KPI to many employees with synced achievement.",
    className: "feature-card-purple",
    visual: "shared",
  },
  {
    title: "Quarterly Check-ins",
    text: "Q1 to Q4 windows guide teams from planning to annual closure.",
    className: "feature-card-large",
    visual: "timeline",
  },
  {
    title: "4 UoM Types",
    text: "Min, Max, Timeline, and Zero formulas are calculated automatically.",
    visual: "formulas",
  },
  {
    title: "Audit Trail",
    text: "Every post-lock change is logged with actor, timestamp, and reason.",
    className: "feature-card-soft",
    visual: "audit",
  },
  {
    title: "Reports + Completion Dashboard",
    text: "Export achievement data and track completion progress in real time.",
    className: "feature-card-full",
    visual: "reports",
  },
];

const phases = [
  {
    number: "01",
    title: "Goal Setting (May)",
    description:
      "Employees create up to 8 goals across thrust areas. Weightage must total exactly 100%. Submit to manager for review.",
  },
  {
    number: "02",
    title: "Manager Approval",
    description:
      "L1 managers review, edit targets and weightages inline, then approve or return for rework. Goals lock on approval.",
  },
  {
    number: "03",
    title: "Quarterly Check-ins",
    description:
      "Employees log actual achievement each quarter. The system computes progress scores using UoM formulas automatically.",
  },
  {
    number: "04",
    title: "Reports & Closure",
    description:
      "HR exports achievement reports. Admin reviews audit trails. The annual cycle closes with complete data integrity.",
  },
];

const roles = [
  {
    role: "Employee",
    icon: User,
    accent: "#22C55E",
    capabilities: [
      "Create & submit goals",
      "Log quarterly achievements",
      "Track progress scores",
      "View manager feedback",
    ],
  },
  {
    role: "Manager (L1)",
    icon: BriefcaseBusiness,
    accent: "#2563EB",
    featured: true,
    capabilities: [
      "Review & approve team goals",
      "Inline editing during review",
      "Conduct check-ins",
      "Push shared goals",
      "Team completion dashboard",
    ],
  },
  {
    role: "Admin / HR",
    icon: Settings,
    accent: "#8B5CF6",
    capabilities: [
      "Configure goal cycles",
      "Manage org hierarchy",
      "Unlock post-lock goals",
      "Export reports & audit trail",
      "Org-wide analytics",
    ],
  },
];

const faqs = [
  {
    question: "What happens if my total weightage does not add up to 100%?",
    answer:
      "The sheet cannot be submitted. AtomQuest gives field-level feedback so employees can rebalance goals before manager review.",
  },
  {
    question: "Can I edit my goals after my manager approves them?",
    answer:
      "Approved goals are locked. An admin can unlock them later, but a written reason is required and the change is captured in the audit trail.",
  },
  {
    question: "How are progress scores calculated?",
    answer:
      "Scores are tracking signals, not ratings. Min rewards higher actuals, Max rewards lower actuals, Timeline checks dates, and Zero succeeds only when the actual is zero.",
  },
  {
    question: "What are Shared Goals?",
    answer:
      "A manager or admin can push one KPI to multiple employees. Recipients can adjust weightage, while the primary owner's achievement syncs across linked sheets.",
  },
  {
    question: "When do quarterly check-in windows open?",
    answer:
      "Goal setting opens in May. Q1, Q2, Q3, and Q4 check-ins open in July, October, January, and March respectively.",
  },
  {
    question: "Who can see my goals?",
    answer:
      "Employees see their own goals, managers see direct reports, and admins can view org-wide data for governance and reporting.",
  },
  {
    question: "Can admin unlock a locked goal?",
    answer:
      "Yes. Admin unlock requires a written reason and creates an audit log entry before edits continue.",
  },
  {
    question: "How is the achievement report exported?",
    answer:
      "Managers and admins can export planned versus actual achievement data as CSV, including quarterly actuals, scores, and weighted scores.",
  },
];

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        const duration = 2000;
        const startedAt = performance.now();
        const easeOutExpo = (progress: number) =>
          progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        function tick(time: number) {
          const progress = Math.min((time - startedAt) / duration, 1);
          if (progress >= 1) {
            setValue(target);
            return;
          }

          setValue(Math.round(easeOutExpo(progress) * target));
          frame = requestAnimationFrame(tick);
        }

        frame = requestAnimationFrame(tick);
        observer.unobserve(element);
      },
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="landing-modal-layer" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title">
      <button className="landing-modal-backdrop" aria-label="Close demo" onClick={onClose} type="button" />
      <div className="demo-modal">
        <div className="demo-modal-header">
          <h2 id="demo-modal-title">AtomQuest Demo</h2>
          <button aria-label="Close demo" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="demo-modal-content">
          <DashboardPreview />
          <div className="demo-callouts">
            <span>Bento dashboard</span>
            <span>Goal cards</span>
            <span>Check-in module</span>
          </div>
        </div>
        <div className="demo-modal-footer">
          <span>Ready to try it yourself?</span>
          <Link className="hero-primary" href="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="landing-modal-layer" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
      <button className="landing-modal-backdrop" aria-label="Close contact form" onClick={onClose} type="button" />
      <form
        className="contact-modal"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="demo-modal-header">
          <h2 id="contact-modal-title">Request a Demo</h2>
          <button aria-label="Close contact form" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        {submitted ? (
          <div className="contact-success">
            <strong>Thanks, we&apos;ll reach out within 24 hours.</strong>
            <p>We have the essentials and will follow up with a short walkthrough.</p>
            <ButtonLike onClick={onClose}>Close</ButtonLike>
          </div>
        ) : (
          <div className="contact-fields">
            <label>
              <span>Name</span>
              <input required name="name" placeholder="Your name" />
            </label>
            <label>
              <span>Company Email</span>
              <input required name="email" type="email" placeholder="you@company.com" />
            </label>
            <label>
              <span>Team Size</span>
              <select required name="team-size" defaultValue="">
                <option value="" disabled>Select team size</option>
                <option>1-25</option>
                <option>26-100</option>
                <option>101-500</option>
                <option>500+</option>
              </select>
            </label>
            <button className="hero-primary" type="submit">Request Demo</button>
          </div>
        )}
      </form>
    </div>
  );
}

function ButtonLike({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="hero-primary" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function footerHref(label: string) {
  const hrefs: Record<string, string> = {
    Features: "/#features",
    Roles: "/#roles",
    Pricing: "/#pricing",
    "How It Works": "/#how-it-works",
    FAQ: "/#faq",
    About: "/about",
    Blog: "/blog",
    Careers: "/careers",
    Privacy: "/privacy",
    Terms: "/terms",
    Cookies: "/cookies",
  };
  return hrefs[label] ?? "/";
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "weightage") {
    return (
      <div className="weightage-visual" aria-hidden="true">
        <span style={{ width: "40%" }}>Revenue 40%</span>
        <span style={{ width: "35%" }}>Ops 35%</span>
        <span style={{ width: "25%" }}>People 25%</span>
      </div>
    );
  }

  if (type === "eight") {
    return <div className="big-number" aria-hidden="true">8</div>;
  }

  if (type === "approval") {
    return (
      <div className="mini-flow" aria-hidden="true">
        <span>Draft</span>
        <ArrowRight size={14} />
        <span>Review</span>
        <ArrowRight size={14} />
        <span>Lock</span>
      </div>
    );
  }

  if (type === "shared") {
    return (
      <div className="shared-visual" aria-hidden="true">
        <Share2 size={26} />
        <span>1 KPI</span>
        <ArrowRight size={18} />
        <span>Team</span>
      </div>
    );
  }

  if (type === "timeline") {
    return (
      <div className="quarter-track" aria-hidden="true">
        {["Q1", "Q2", "Q3", "Q4"].map((quarter, index) => (
          <span className={index < 2 ? "is-open" : ""} key={quarter}>
            {quarter}
          </span>
        ))}
      </div>
    );
  }

  if (type === "formulas") {
    return (
      <div className="formula-stack" aria-hidden="true">
        <span>Min: A / T</span>
        <span>Max: T / A</span>
        <span>Zero: 0 = 100%</span>
      </div>
    );
  }

  if (type === "audit") {
    return (
      <div className="audit-visual" aria-hidden="true">
        <Lock size={28} />
        <span>Post-lock changes logged</span>
      </div>
    );
  }

  return (
    <div className="report-visual" aria-hidden="true">
      <div>
        <FileSpreadsheet size={28} />
        <span>CSV export</span>
      </div>
      <div>
        <BarChart3 size={28} />
        <span>Live completion</span>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      className="dashboard-preview"
      initial={{ opacity: 0, scale: 0.97, y: 18 }}
      transition={{
        opacity: { delay: 1.0, duration: 0.55 },
        scale: { delay: 1.0, duration: 0.55 },
        y: { delay: 1.1, duration: 6, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <div className="browser-bar">
        <div className="browser-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="url-bar">app.atomquest.com</div>
      </div>
      <div className="preview-grid">
        <div className="preview-card stat-card">
          <span>Cycle progress</span>
          <strong>72%</strong>
          <div className="mini-progress"><span /></div>
        </div>
        <div className="preview-card ring-card">
          <div className="progress-ring">86%</div>
          <span>Approved sheets</span>
        </div>
        <div className="preview-card">
          <span>Check-ins done</span>
          <strong>128</strong>
          <small>Q2 manager updates</small>
        </div>
        <div className="preview-card">
          <span>At-risk goals</span>
          <strong>14</strong>
          <small>Needs follow-up</small>
        </div>
        <div className="preview-card team-card">
          <div>
            <span>Team completion</span>
            <strong>Operations</strong>
          </div>
          {["Priya Sharma", "Amit Verma", "Neha Iyer"].map((name, index) => (
            <div className="team-row" key={name}>
              <span>{name}</span>
              <div><span style={{ width: `${92 - index * 13}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="preview-card chart-card">
          <span>QoQ achievement trend</span>
          <div className="mini-chart">
            <i style={{ height: "34%" }} />
            <i style={{ height: "58%" }} />
            <i style={{ height: "72%" }} />
            <i style={{ height: "86%" }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("features");
  const [openFaq, setOpenFaq] = useState(0);
  const [cursor, setCursor] = useState({ x: -200, y: -200 });
  const [demoOpen, setDemoOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const heroWordNodes = useMemo(
    () =>
      headlineWords.map((word, index) => {
        const gradient = index >= headlineWords.length - 3;
        return (
          <Fragment key={`${word}-${index}`}>
            <motion.span
              className={gradient ? "gradient-word" : undefined}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.06, duration: 0.55 }}
            >
              {word}
            </motion.span>
            {index < headlineWords.length - 1 ? " " : null}
          </Fragment>
        );
      }),
    []
  );

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 60);
    }

    function handlePointer(event: PointerEvent) {
      setCursor({ x: event.clientX, y: event.clientY });
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointer, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.15, 0.35, 0.6] }
    );

    navItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main
      className="landing-page"
      style={{
        "--cursor-x": `${cursor.x}px`,
        "--cursor-y": `${cursor.y}px`,
      } as React.CSSProperties}
    >
      <motion.div className="scroll-progress" style={{ width: progressWidth }} />
      <div className="cursor-glow" aria-hidden="true" />

      <header className={`landing-nav ${scrolled ? "is-scrolled" : ""}`}>
        <Link className="landing-logo" href="/" aria-label="AtomQuest home">
          <span>Atom</span>Quest
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              className={activeSection === item.id ? "is-active" : ""}
              href={item.href}
              key={item.id}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <Link className="signin-link" href="/login">Sign In</Link>
          <Link className="nav-cta" href="/signup">Get Started</Link>
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`menu-button ${menuOpen ? "is-open" : ""}`}
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {menuOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="mobile-menu"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {navItems.map((item) => (
            <a href={item.href} key={item.id} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <Link href="/login">Sign In</Link>
        </motion.div>
      ) : null}

      <section className="hero-section">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="hero-badge"
            initial={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            Structured Goal Management for Modern Teams
          </motion.div>
          <h1 className="hero-title">{heroWordNodes}</h1>
          <motion.p
            animate={{ opacity: 1 }}
            className="hero-subtext"
            initial={{ opacity: 0 }}
            transition={{ delay: 0.72, duration: 0.6 }}
          >
            Quarterly check-ins, manager approvals, achievement tracking, and
            org-wide dashboards built for teams that care about results.
          </motion.p>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="hero-actions"
            initial={{ opacity: 0, scale: 0.97 }}
            transition={{ delay: 0.9, duration: 0.45 }}
          >
            <Link className="hero-primary" href="/login">
              Start tracking goals <ArrowRight size={18} />
            </Link>
            <button className="hero-secondary" onClick={() => setDemoOpen(true)} type="button">
              Watch 90s demo
            </button>
          </motion.div>
          <motion.p
            animate={{ opacity: 1 }}
            className="trust-row"
            initial={{ opacity: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            5-star workflow trusted by 500+ teams · Enterprise-grade · SOC 2 ready
          </motion.p>
        </div>
        <DashboardPreview />
      </section>

      <section className="stats-strip" aria-label="AtomQuest metrics">
        <div><strong><Counter target={500} suffix="+" /></strong><span>teams aligned</span></div>
        <div><strong><Counter target={8} /></strong><span>goals per employee max</span></div>
        <div><strong><Counter target={4} /></strong><span>quarterly check-ins</span></div>
        <div><strong><Counter target={100} suffix="%" /></strong><span>weightage validation</span></div>
      </section>

      <section className="section-band features-band" id="features">
        <div className="section-heading">
          <span>Capabilities</span>
          <h2>Everything your org needs for structured performance</h2>
          <p>From goal creation to annual review, every critical step is covered.</p>
        </div>
        <div className="feature-grid">
          {featureCards.map((card, index) => (
            <motion.article
              className={`feature-card ${card.className ?? ""}`}
              initial={{ opacity: 0, y: 32 }}
              key={card.title}
              transition={{ delay: index * 0.04, duration: 0.55 }}
              viewport={{ once: true, amount: 0.18 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
              <FeatureVisual type={card.visual} />
            </motion.article>
          ))}
        </div>
      </section>

      <section className="section-band process-band" id="how-it-works">
        <div className="process-layout">
          <div className="process-sticky">
            <span>Workflow</span>
            <h2>One clean path from planning to closure</h2>
            <div className="phase-line" />
          </div>
          <div className="phase-list">
            {phases.map((phase) => (
              <motion.article
                className="phase-card"
                initial={{ opacity: 0, y: 30 }}
                key={phase.number}
                viewport={{ once: true, amount: 0.3 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <strong>{phase.number}</strong>
                <div>
                  <h3>{phase.title}</h3>
                  <p>{phase.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-band roles-band" id="roles">
        <div className="section-heading">
          <span>Roles</span>
          <h2>Three clear journeys, one shared source of truth</h2>
          <p>Every role gets the right actions, data, and guardrails.</p>
        </div>
        <div className="role-grid">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <motion.article
                className={`role-card ${role.featured ? "is-featured" : ""}`}
                initial={{ opacity: 0, y: 28 }}
                key={role.role}
                style={{ "--role-accent": role.accent } as React.CSSProperties}
                viewport={{ once: true, amount: 0.25 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <div className="role-icon"><Icon size={24} /></div>
                <h3>{role.role}</h3>
                <ul>
                  {role.capabilities.map((capability) => (
                    <li key={capability}>
                      <Check size={16} />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="section-band faq-band" id="faq">
        <div className="section-heading">
          <span>FAQ</span>
          <h2>Answers before the first goal cycle starts</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const open = openFaq === index;
            return (
              <article className={`faq-item ${open ? "is-open" : ""}`} key={faq.question}>
                <button onClick={() => setOpenFaq(open ? -1 : index)} type="button">
                  <span>{faq.question}</span>
                  <ChevronDown size={20} />
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-band pricing-band" id="pricing">
        <div className="section-heading">
          <span>Pricing</span>
          <h2>Simple demo pricing for teams ready to pilot</h2>
          <p>Start with the hackathon workspace, then scale into governed cycles when your team is ready.</p>
        </div>
        <div className="pricing-grid">
          {[
            ["Starter", "Free", "For hackathon reviewers and small pilot teams."],
            ["Team", "Contact us", "For managers running quarterly goal cycles."],
            ["Enterprise", "Custom", "For HR teams needing reports, audit, and admin controls."],
          ].map(([name, price, text]) => (
            <article key={name}>
              <span>{name}</span>
              <strong>{price}</strong>
              <p>{text}</p>
              <button className="hero-secondary" onClick={() => setContactOpen(true)} type="button">
                Request demo
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div className="cta-banner">
          <Gauge size={34} />
          <h2>Ready to align your team&apos;s goals?</h2>
          <p>Set up your first goal cycle in under 5 minutes.</p>
          <div>
            <Link className="hero-primary" href="/signup">Get started free</Link>
            <button className="hero-secondary" onClick={() => setContactOpen(true)} type="button">Request a demo</button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="landing-logo"><span>Atom</span>Quest</div>
          <p>Structured goals, cleaner check-ins, and governance that holds up.</p>
          <SocialLinks />
        </div>
        {[
          ["Product", "Features", "Roles", "How It Works", "FAQ", "Pricing"],
          ["Company", "About", "Blog", "Careers", "Contact"],
          ["Legal", "Privacy", "Terms", "Cookies"],
        ].map(([title, ...links]) => (
          <div className="footer-column" key={title}>
            <strong>{title}</strong>
            {links.map((item) => (
              item === "Contact" ? (
                <button onClick={() => setContactOpen(true)} type="button" key={item}>{item}</button>
              ) : (
                <Link href={footerHref(item)} key={item}>{item}</Link>
              )
            ))}
          </div>
        ))}
        <div className="footer-bottom">© 2026 AtomQuest · Built for AtomQuest Hackathon 1.0</div>
      </footer>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </main>
  );
}
