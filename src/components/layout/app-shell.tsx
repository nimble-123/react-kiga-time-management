"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  CheckSquare,
  CalendarHeart,
  LogOut,
  User,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    displayName: string;
    role: string;
  };
}

const userLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/time-entry", label: "Wochenansicht", icon: Clock },
  { href: "/monthly", label: "Monatsansicht", icon: CalendarDays },
  { href: "/profile", label: "Profil", icon: User },
];

const adminLinks = [
  { href: "/admin/approvals", label: "Genehmigungen", icon: CheckSquare },
  { href: "/admin/users", label: "Benutzerverwaltung", icon: Users },
  { href: "/admin/holidays", label: "Feiertage", icon: CalendarHeart },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-primary">Zeiterfassung</h1>
          <p className="text-xs text-muted-foreground">KITA Mitte</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {userLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          {user.role === "ADMIN" && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              </div>
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      pathname === link.href || pathname.startsWith(link.href + "/")
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User info + logout */}
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === "ADMIN" ? "Administrator" : "Benutzer"}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent w-full transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
