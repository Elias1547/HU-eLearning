"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Star,
  User,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import AnnauncementBell from "@/components/annauncementBell";
import { ModeToggle } from "@/components/ui/toggle";
const roleDropdownConfigs = {
  student: [
    { href: "/student/profile", label: "Profile", icon: User },
    { href: "/student/dashboard", label: "My courses", icon: BookOpen },
    { href: "/student/settings", label: "Settings", icon: Settings },
  ],
  teacher: [
    { href: "/teacher/profile", label: "Profile", icon: User },
    { href: "/teacher/courses", label: "Courses", icon: BookOpen },
    { href: "/teacher/reviews", label: "Reviews", icon: Star },
    {
      href: "/teacher/courses/create",
      label: "Create course",
      icon: PlusCircle,
    },
    { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/teacher/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/admin/profile", label: "Profile", icon: User },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
} as const;

type LmsTopStripProps = {
  session: Session;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
};

export function LmsTopStrip({
  session,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
}: LmsTopStripProps) {
  const role = session.user?.role as keyof typeof roleDropdownConfigs | undefined;
  const dropdownItems =
    role && roleDropdownConfigs[role]
      ? roleDropdownConfigs[role]
      : roleDropdownConfigs.student;

  const getDashboardLink = () => {
    if (!session.user?.role) return "/role";
    return `/${session.user.role}/dashboard`;
  };

  const displayName =
    session.user?.name ||
    session.user?.email?.split("@")[0] ||
    session.user?.role?.toUpperCase() ||
    "User";

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:h-16 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted md:inline-flex"
          onClick={onToggleSidebarCollapse}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

       
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {(session.user?.role === "student"|| session.user?.role === "teacher") && (
          <div className="hidden sm:block">
            <AnnauncementBell />
          </div>
        )}
        <ModeToggle />
       
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 rounded-full pl-1 pr-2 sm:pr-3"
            >
              <Avatar className="h-8 w-8 border border-border/80 shadow-sm">
                <AvatarImage src={session.user?.image || ""} alt={displayName} />
                <AvatarFallback className="text-xs font-medium">
                  {session.user?.name?.charAt(0) ||
                    session.user?.email?.charAt(0)?.toUpperCase() ||
                    session.user?.role?.charAt(0)?.toUpperCase() ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                {displayName}
              </span>
              <ChevronDown className="hidden h-4 w-4 opacity-60 sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-start gap-2 p-2">
              <div className="min-w-0 flex-1 space-y-0.5 leading-none">
                <p className="truncate font-medium">{session.user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            {dropdownItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="cursor-pointer">
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
