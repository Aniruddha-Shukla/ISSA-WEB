"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Ticket, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, roleLabel } from "@/lib/utils";

export function UserMenu() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const name = profile?.full_name || user.email?.split("@")[0] || "Account";

  const item =
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-ink";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex items-center gap-2 rounded-full border border-line py-1 pr-2.5 pl-1 transition-colors hover:border-line-strong"
      >
        <Avatar name={name} src={profile?.avatar_url} size={30} />
        <span className="sr-only">Open account menu for</span>
        <span className="hidden max-w-28 truncate text-sm font-medium text-ink sm:block">{name}</span>
        <ChevronDown className={cn("size-4 text-faint transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-64 rounded-2xl glass p-2 shadow-2xl shadow-black/50"
        >
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-faint">{user.email}</p>
            {profile ? (
              <Badge tone={isAdmin ? "accent" : profile.role === "member" ? "primary" : "neutral"} className="mt-2">
                {roleLabel[profile.role]}
              </Badge>
            ) : null}
          </div>
          <nav aria-label="Account" className="flex flex-col gap-0.5 pt-2">
            <Link href="/profile" className={item} onClick={() => setOpen(false)}>
              <UserRound className="size-4" aria-hidden /> Profile
            </Link>
            <Link href="/profile#tickets" className={item} onClick={() => setOpen(false)}>
              <Ticket className="size-4" aria-hidden /> My tickets
            </Link>
            {isAdmin ? (
              <Link href="/admin" className={item} onClick={() => setOpen(false)}>
                <LayoutDashboard className="size-4" aria-hidden /> Admin dashboard
              </Link>
            ) : null}
            <button
              type="button"
              className={cn(item, "w-full text-left hover:text-danger")}
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
