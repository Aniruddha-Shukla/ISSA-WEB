"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Download, Images, LayoutDashboard, ScanQrCode, Settings, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/check-in", label: "Check-in", icon: ScanQrCode },
  { href: "/admin/quizzes", label: "Quizzes", icon: Trophy },
  { href: "/admin/users", label: "Members", icon: Users },
  { href: "/admin/content", label: "Site content", icon: Images },
  { href: "/admin/exports", label: "Exports", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {adminNav.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "text-muted hover:bg-white/5 hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
