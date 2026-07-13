"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  Library,
  MessageCircle,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  User,

  BarChart3,
  VideoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import AnnauncementBell from "@/components/annauncementBell";
import type { LucideIcon } from "lucide-react";

export type SidebarRole = "student" | "teacher" | "admin";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navByRole: Record<SidebarRole, SidebarNavItem[]> = {
  student: [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    {
      href: "/student/dashboard#my-learning",
      label: "My Courses",
      icon: GraduationCap,
    },
    { href: "/courses#categories", label: "Categories", icon: LayoutGrid },
    { href: "/student/live-classes", label: "Live Class", icon: VideoIcon },
    { href: "/student/message", label: "Messages", icon: MessageCircle },
    { href: "/student/profile", label: "Profile", icon: User },
    { href: "/student/settings", label: "Settings", icon: Settings },
  ],
  teacher: [
    { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/teacher/courses", label: "My courses", icon: Library },
    { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/teacher/live-classes", label: "Live Class", icon: VideoIcon },

    { href: "/teacher/message", label: "Messages", icon: MessageCircle },
    { href: "/teacher/announcements", label: "Announcements", icon: Megaphone },
    { href: "/teacher/profile", label: "Profile", icon: User },
    { href: "/teacher/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/courses#categories", label: "Categories", icon: LayoutGrid },
    { href: "/admin/profile", label: "Profile", icon: User },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

function normalizePath(href: string) {
  const i = href.indexOf("#");
  return i >= 0 ? href.slice(0, i) : href;
}

function isRouteActive(pathname: string, href: string): boolean {
  const path = normalizePath(href);
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

type LmsSidebarProps = {
  role: SidebarRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
  showCollapseToggle?: boolean;
  /** Show announcements in the drawer only (mobile). */
  isMobileDrawer?: boolean;
};

export function LmsSidebar({
  role,
  collapsed,
  onToggleCollapse,
  onNavigate,
  className,
  showCollapseToggle = true,
  isMobileDrawer = false,
}: LmsSidebarProps) {
  const pathname = usePathname() || "/";
  const items = navByRole[role] ?? navByRole.student;

  return (
    <div
      className={cn(
        "flex h-full flex-col border-sidebar-border bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-lg outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2",
            collapsed ? "justify-center p-2" : "px-2 py-1.5"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight">
                HUDC LMS
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
              
              </span>
            </span>
          )}
        </Link>
        {showCollapseToggle && !collapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isRouteActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/80"
                    : "text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200",
                    active && "text-sidebar-primary",
                    !active && "group-hover:scale-105"
                  )}
                  aria-hidden
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {isMobileDrawer && role === "student" && (
        <div className="shrink-0 border-t border-sidebar-border p-3 md:hidden">
          <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Announcements
            </span>
            <AnnauncementBell />
          </div>
        </div>
      )}

      {showCollapseToggle && collapsed && (
        <div className="hidden shrink-0 border-t border-sidebar-border p-2 md:block">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-full text-muted-foreground hover:bg-sidebar-accent"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
