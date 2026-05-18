"use client";

import { signOut as firebaseSignOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ClipboardCheck,
  FileSpreadsheet,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Target,
  User,
  Users,
  X,
} from "lucide-react";
import { PortalQueryProvider } from "@/components/portal/query-provider";
import { getPortalUser, type PortalRole } from "@/lib/portal-data";
import { usePortalStore } from "@/store/portal-store";
import { cn } from "@/lib/utils";
import { getFirebaseClient } from "@/lib/firebase/client";
import type { PortalSession } from "@/lib/auth-types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: PortalRole[];
  section?: "main" | "management" | "admin";
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/goals", label: "My Goals", icon: Target, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/checkins", label: "My Check-ins", icon: ClipboardCheck, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/team-goals", label: "Team Goals", icon: Users, roles: ["manager", "admin"], section: "management" },
  { href: "/manager-checkins", label: "Manager Check-ins", icon: BriefcaseBusiness, roles: ["manager", "admin"], section: "management" },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet, roles: ["manager", "admin"], section: "management" },
  { href: "/audit", label: "Audit Trail", icon: History, roles: ["admin"], section: "admin" },
  { href: "/admin", label: "Admin Panel", icon: Settings, roles: ["admin"], section: "admin" },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/profile", label: "Profile", icon: User, roles: ["employee", "manager", "admin"], section: "main" },
];

const pageMeta: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Dashboard", crumb: "Workspace / Dashboard" },
  "/goals": { title: "My Goals", crumb: "Workspace / Goal Sheet" },
  "/checkins": { title: "My Check-ins", crumb: "Workspace / Quarterly Updates" },
  "/team-goals": { title: "Team Goals", crumb: "Management / Team Goals" },
  "/manager-checkins": { title: "Manager Check-ins", crumb: "Management / Check-ins" },
  "/reports": { title: "Reports", crumb: "Governance / Reports" },
  "/audit": { title: "Audit Trail", crumb: "Governance / Audit" },
  "/admin": { title: "Admin Panel", crumb: "Admin / Configuration" },
  "/notifications": { title: "Notifications", crumb: "Workspace / Inbox" },
  "/profile": { title: "Profile", crumb: "Workspace / Profile" },
};

function breadcrumbsForPath(pathname: string, fallbackTitle: string): BreadcrumbItem[] {
  if (pathname.includes("/team-goals/") && pathname.endsWith("/review")) {
    return [
      { label: "Team Goals", href: "/team-goals" },
      { label: "Goal Review" },
    ];
  }

  if (pathname.includes("/team-goals/")) {
    return [
      { label: "Team Goals", href: "/team-goals" },
      { label: "Employee Sheet" },
    ];
  }

  if (pathname.includes("/manager-checkins/")) {
    return [
      { label: "Manager Check-ins", href: "/manager-checkins" },
      { label: "Employee Check-in" },
    ];
  }

  if (pathname.startsWith("/admin/")) {
    const leaf = pathname.split("/").filter(Boolean).at(-1) ?? "Admin";
    return [
      { label: "Admin", href: "/admin" },
      {
        label: leaf
          .split("-")
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(" "),
      },
    ];
  }

  return [{ label: fallbackTitle }];
}

function BreadcrumbTrail({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="portal-breadcrumbs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`}>
            {item.href && !isLast ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
            {!isLast ? <em>/</em> : null}
          </span>
        );
      })}
    </nav>
  );
}

async function fetchUnreadCount() {
  const response = await fetch("/api/notifications/unread-count");
  if (!response.ok) throw new Error("Unable to load unread count");
  const payload = (await response.json()) as { data?: { count?: number } };
  return payload.data?.count ?? 0;
}

async function signOutEverywhere() {
  try {
    await firebaseSignOut(getFirebaseClient().auth);
  } catch {
    // Continue with app session cleanup even if Firebase is already signed out.
  }

  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
}

export function PortalShell({
  children,
  session,
}: {
  children: ReactNode;
  session: PortalSession | null;
}) {
  return (
    <PortalQueryProvider>
      <PortalShellContent session={session}>{children}</PortalShellContent>
    </PortalQueryProvider>
  );
}

function PortalShellContent({
  children,
  session,
}: {
  children: ReactNode;
  session: PortalSession | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = getPortalUser(session);
  const sidebarOpen = usePortalStore((state) => state.sidebarOpen);
  const notificationOpen = usePortalStore((state) => state.notificationOpen);
  const darkMode = usePortalStore((state) => state.darkMode);
  const setSidebarOpen = usePortalStore((state) => state.setSidebarOpen);
  const toggleSidebar = usePortalStore((state) => state.toggleSidebar);
  const setNotificationOpen = usePortalStore((state) => state.setNotificationOpen);
  const toggleDarkMode = usePortalStore((state) => state.toggleDarkMode);

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    initialData: 0,
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("portal-dark", darkMode);
    window.localStorage.setItem("atomquest-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    function refreshOnFocus() {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      }
    }

    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => document.removeEventListener("visibilitychange", refreshOnFocus);
  }, [queryClient]);

  const meta =
    pageMeta[pathname] ??
    (pathname.includes("/team-goals/")
      ? { title: "Approval Review", crumb: "Management / Review" }
      : pathname.includes("/manager-checkins/")
        ? { title: "Manager Check-in", crumb: "Management / Check-ins" }
        : { title: "Workspace", crumb: "AtomQuest Portal" });
  const breadcrumbs = breadcrumbsForPath(pathname, meta.title);

  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="portal-shell">
      <aside className={cn("portal-sidebar", sidebarOpen && "is-open")}>
        <div className="portal-sidebar-header">
          <Link className="portal-logo" href="/dashboard">
            <span>Atom</span>Quest
          </Link>
          <span className="cycle-badge">FY 2025-26</span>
          <button aria-label="Close menu" className="sidebar-close" onClick={() => setSidebarOpen(false)} type="button">
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="portal-nav" aria-label="Portal navigation">
          {(["main", "management", "admin"] as const).map((section) => {
            const sectionItems = visibleNav.filter((item) => item.section === section);
            if (!sectionItems.length) return null;
            return (
              <div className="portal-nav-section" key={section}>
                <span>{section === "main" ? "Workspace" : section === "management" ? "Management" : "Admin"}</span>
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link className={cn("portal-nav-link", active && "is-active")} href={item.href} key={item.href}>
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-user-mini">
            <div className="avatar">{user.initials}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>
          <div className="portal-sidebar-actions">
            <button
              aria-label="Toggle dark mode"
              onClick={() => {
                toggleDarkMode();
                toast.info(darkMode ? "Light mode enabled" : "Dark mode enabled");
              }}
              type="button"
            >
              <Moon size={16} />
            </button>
            <button
              aria-label="Sign out"
              onClick={async () => {
                await signOutEverywhere();
                router.replace("/login");
                router.refresh();
              }}
              type="button"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <button
        aria-label="Close sidebar backdrop"
        className={cn("portal-backdrop", sidebarOpen && "is-visible")}
        onClick={() => setSidebarOpen(false)}
        type="button"
      />

      <div className="portal-main">
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button aria-label="Open menu" className="portal-mobile-menu" onClick={toggleSidebar} type="button">
              <Menu size={20} />
            </button>
            <div>
              <h1>{meta.title}</h1>
              <BreadcrumbTrail items={breadcrumbs} />
            </div>
          </div>

          <div className="portal-topbar-right">
            <div className="portal-search">
              <Search size={16} />
              <span>Search goals, people, reports</span>
            </div>
            <span className="active-cycle-chip">
              <ShieldCheck size={15} />
              FY 2025-26 / Goal Setting Open
            </span>
            <button className="notification-button" onClick={() => setNotificationOpen(true)} type="button">
              <Bell size={18} />
              {unreadQuery.data ? <span>{unreadQuery.data > 9 ? "9+" : unreadQuery.data}</span> : null}
            </button>
            <button
              className="topbar-avatar"
              onClick={async () => {
                await signOutEverywhere();
                router.replace("/login");
                router.refresh();
              }}
              type="button"
            >
              {user.initials}
            </button>
          </div>
        </header>

        <main className="portal-content">{children}</main>
      </div>

      <NotificationDrawer open={notificationOpen} onClose={() => setNotificationOpen(false)} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  async function markAllRead() {
    const response = await fetch("/api/notifications/read-all", { method: "PATCH" });
    if (!response.ok) {
      toast.error("Unable to mark notifications read");
      return;
    }

    toast.success("All notifications marked read");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <>
      <button
        aria-label="Close notifications"
        className={cn("drawer-scrim", open && "is-visible")}
        onClick={onClose}
        type="button"
      />
      <aside className={cn("notification-drawer", open && "is-open")}>
        <div className="drawer-header">
          <div>
            <span>Inbox</span>
            <h2>Notifications</h2>
          </div>
          <button aria-label="Close notifications" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <button className="mark-read-button" onClick={markAllRead} type="button">
          Mark all read
        </button>
        <div className="notification-list">
          <NotificationDrawerList />
        </div>
      </aside>
    </>
  );
}

type NotificationRecord = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
};

async function fetchNotifications() {
  const response = await fetch("/api/notifications");
  if (!response.ok) throw new Error("Unable to load notifications");
  const payload = (await response.json()) as { data?: NotificationRecord[] };
  return payload.data ?? [];
}

function NotificationDrawerList() {
  const query = useQuery({
    queryKey: ["notifications", "drawer"],
    queryFn: fetchNotifications,
    initialData: [],
  });

  if (!query.data.length) {
    return (
      <article className="notification-item">
        <div className="notification-dot notification-system" />
        <div>
          <strong>You&apos;re all caught up</strong>
          <p>No new notifications.</p>
        </div>
      </article>
    );
  }

  return (
    <>
      {query.data.map((item) => (
        <article className={cn("notification-item", !item.isRead && "is-unread")} key={item.id}>
          <div className={`notification-dot notification-${item.type}`} />
          <div>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </div>
        </article>
      ))}
    </>
  );
}
