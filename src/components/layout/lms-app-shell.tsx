"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { LmsSidebar, type SidebarRole } from "@/components/layout/lms-sidebar";
import { LmsTopStrip } from "@/components/layout/lms-top-strip";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lms-sidebar-collapsed";

function isAuthSurfacePath(pathname: string) {
  if (pathname === "/role") return true;
  if (pathname.includes("/signin")) return true;
  if (pathname.includes("/signup")) return true;
  return false;
}

export function LmsAppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    persistCollapsed(!collapsed);
  }, [collapsed, persistCollapsed]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSidebarOpen]);

  const sidebarWidth = collapsed ? "72px" : "256px";
  const authenticated = status === "authenticated" && !!session?.user;
  const showLmsChrome = authenticated && !isAuthSurfacePath(pathname);
  const role = (session?.user?.role as SidebarRole) || "student";

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col bg-muted/20 dark:bg-muted/10">
        <header className="sticky top-0 z-50 h-14 shrink-0 border-b border-border/60 bg-muted/60 animate-pulse sm:h-16" />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </div>
    );
  }

  if (!showLmsChrome) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/20 dark:bg-muted/10">
        <MarketingHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-muted/20 dark:bg-muted/10"
      style={
        {
          ["--sidebar-width" as string]: sidebarWidth,
        } as React.CSSProperties
      }
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar shadow-sm transition-[width] duration-300 ease-out md:flex"
        )}
        style={{ width: "var(--sidebar-width)" }}
      >
        <LmsSidebar
          role={role}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      {mobileSidebarOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200 md:hidden"
            aria-label="Close navigation menu"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-2rem))] max-w-full border-r border-sidebar-border bg-sidebar shadow-2xl animate-in slide-in-from-left duration-300 md:hidden"
          >
            <LmsSidebar
              role={role}
              collapsed={false}
              onToggleCollapse={() => {}}
              onNavigate={() => setMobileSidebarOpen(false)}
              showCollapseToggle={false}
              isMobileDrawer
            />
          </aside>
        </>
      )}

      <div
        className="flex min-h-screen flex-col transition-[padding] duration-300 ease-out md:pl-[var(--sidebar-width)]"
      >
        {session && (
          <LmsTopStrip
            session={session}
            sidebarCollapsed={collapsed}
            onToggleSidebarCollapse={toggleCollapsed}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          />
        )}
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
