"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { notifications, getPortalUser, type PortalRole } from "@/lib/portal-data";
import { usePortalStore } from "@/store/portal-store";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: PortalRole[];
  section?: "main" | "management" | "admin";
};

const navItems: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/app/goals", label: "My Goals", icon: Target, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/app/checkins", label: "My Check-ins", icon: ClipboardCheck, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/app/team-goals", label: "Team Goals", icon: Users, roles: ["manager", "admin"], section: "management" },
  { href: "/app/manager-checkins/emp-priya", label: "Manager Check-ins", icon: BriefcaseBusiness, roles: ["manager", "admin"], section: "management" },
  { href: "/app/dashboard#team-overview", label: "Team Overview", icon: Gauge, roles: ["manager", "admin"], section: "management" },
  { href: "/app/employees", label: "All Employees", icon: Users, roles: ["admin"], section: "admin" },
  { href: "/app/reports", label: "Reports", icon: FileSpreadsheet, roles: ["manager", "admin"], section: "management" },
  { href: "/app/audit", label: "Audit Trail", icon: History, roles: ["admin"], section: "admin" },
  { href: "/app/admin", label: "Admin Panel", icon: Settings, roles: ["admin"], section: "admin" },
  { href: "/app/notifications", label: "Notifications", icon: Bell, roles: ["employee", "manager", "admin"], section: "main" },
  { href: "/app/profile", label: "Profile", icon: User, roles: ["employee", "manager", "admin"], section: "main" },
];

const pageMeta: Record<string, { title: string; crumb: string }> = {
  "/app/dashboard": { title: "Dashboard", crumb: "Workspace / Dashboard" },
  "/app/goals": { title: "My Goals", crumb: "Workspace / Goal Sheet" },
  "/app/checkins": { title: "My Check-ins", crumb: "Workspace / Quarterly Updates" },
  "/app/team-goals": { title: "Team Goals", crumb: "Management / Team Goals" },
  "/app/reports": { title: "Reports", crumb: "Governance / Reports" },
  "/app/audit": { title: "Audit Trail", crumb: "Governance / Audit" },
  "/app/admin": { title: "Admin Panel", crumb: "Admin / Configuration" },
  "/app/employees": { title: "All Employees", crumb: "Admin / Org Hierarchy" },
  "/app/notifications": { title: "Notifications", crumb: "Workspace / Inbox" },
  "/app/profile": { title: "Profile", crumb: "Workspace / Profile" },
};

async function fetchUnreadCount() {
  const response = await fetch("/api/notifications/unread-count");
  if (!response.ok) throw new Error("Unable to load unread count");
  const payload = (await response.json()) as { data?: { count?: number } };
  return payload.data?.count ?? notifications.filter((item) => item.unread).length;
}

export function PortalShell({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
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
  session: Session | null;
}) {
  const pathname = usePathname();
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
    refetchInterval: 30_000,
    initialData: notifications.filter((item) => item.unread).length,
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("portal-dark", darkMode);
    window.localStorage.setItem("atomquest-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const meta =
    pageMeta[pathname] ??
    (pathname.includes("/team-goals/")
      ? { title: "Approval Review", crumb: "Management / Review" }
      : pathname.includes("/manager-checkins/")
        ? { title: "Manager Check-in", crumb: "Management / Check-ins" }
        : { title: "Workspace", crumb: "AtomQuest Portal" });

  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="portal-shell">
      <aside className={cn("portal-sidebar", sidebarOpen && "is-open")}>
        <div className="portal-sidebar-header">
          <Link className="portal-logo" href="/app/dashboard">
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
                  const active = pathname === item.href || (item.href !== "/app/dashboard" && pathname.startsWith(item.href));
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
            <button aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/login" })} type="button">
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
              <p>{meta.crumb}</p>
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
              {unreadQuery.data ? <span>{unreadQuery.data}</span> : null}
            </button>
            <button className="topbar-avatar" onClick={() => signOut({ callbackUrl: "/login" })} type="button">
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
        <button className="mark-read-button" onClick={() => toast.success("All notifications marked read")} type="button">
          Mark all read
        </button>
        <div className="notification-list">
          {notifications.map((item) => (
            <article className={cn("notification-item", item.unread && "is-unread")} key={item.id}>
              <div className={`notification-dot notification-${item.type}`} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <span>{item.time}</span>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </>
  );
}
