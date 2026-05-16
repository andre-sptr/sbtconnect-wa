"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookUser,
  CalendarClock,
  Inbox,
  LayoutTemplate,
  LogOut,
  Menu,
  Settings,
  ScrollText,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/contacts", label: "Contacts", icon: BookUser },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: CalendarClock },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  pathname,
  username,
  role,
  onNavigate,
}: {
  pathname: string;
  username: string;
  role: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700 text-white">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold leading-tight text-foreground">SBT Connect WA</p>
          <p className="text-xs text-muted-foreground">WAHA Broadcast Control</p>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-border/60 bg-muted/40 px-3 py-2">
        <p className="truncate text-xs font-medium text-foreground">{username}</p>
        <p className="text-xs capitalize text-muted-foreground">{role}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active && "bg-red-700 text-white",
                !active && "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Button variant="ghost" className="mt-2 w-full justify-start text-muted-foreground" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}

export function DashboardShell({ children, username, role }: { children: React.ReactNode; username: string; role: string }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card/95 shadow-soft backdrop-blur lg:block">
        <SidebarContent pathname={pathname} username={username} role={role} />
      </aside>

      {drawerOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setDrawerOpen(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r bg-card shadow-xl transition-transform duration-300 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button type="button" onClick={() => setDrawerOpen(false)} className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
        <SidebarContent pathname={pathname} username={username} role={role} onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-card/85 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-md border border-input bg-background p-2 text-muted-foreground lg:hidden" onClick={() => setDrawerOpen(true)}>
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-medium text-primary">Dashboard</p>
                <p className="hidden text-xs text-muted-foreground sm:block">Broadcast WhatsApp konservatif dengan WAHA queue.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:block">{username}</span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
