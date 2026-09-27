"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { mainNav } from "@/config/site";
import { useAuth } from "@/components/providers/auth-provider";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

function useScrollSpy(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const ids = mainNav.map((n) => n.section).filter((s): s is string => Boolean(s));
    const sections = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [enabled]);
  return enabled ? active : null;
}

export function Navbar() {
  const pathname = usePathname();
  const { configured, loading, user, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const activeSection = useScrollSpy(pathname === "/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the mobile menu on navigation (state adjusted during render, not in an effect)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const isActive = (href: string, section?: string) =>
    section ? pathname === "/" && activeSection === section : pathname === href || pathname.startsWith(`${href}/`);

  const authArea = !configured ? (
    <ButtonLink href="/signup" size="sm">
      Join club
    </ButtonLink>
  ) : loading ? (
    <Skeleton className="h-9 w-24 rounded-full" />
  ) : user ? (
    <div className="flex items-center gap-2">
      {isAdmin ? (
        <ButtonLink href="/admin" variant="ghost" size="sm" className="hidden xl:inline-flex">
          <LayoutDashboard className="size-4" aria-hidden /> Admin
        </ButtonLink>
      ) : null}
      <UserMenu />
    </div>
  ) : (
    <div className="flex items-center gap-1.5">
      <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="ghost" size="sm">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup" size="sm">
        Join club
      </ButtonLink>
    </div>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || mobileOpen ? "border-x-0 border-t-0 border-line glass" : "border-transparent bg-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => {
            const active = isActive(item.href, item.section);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? (item.section ? "location" : "page") : undefined}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {item.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-primary to-cyan"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">{authArea}</div>
          <button
            ref={toggleRef}
            type="button"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-white/5 hover:text-ink lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 font-medium text-base",
                      isActive(item.href, item.section) ? "bg-white/5 text-ink" : "text-muted hover:bg-white/5 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="mt-3 border-t border-line pt-4 sm:hidden">{authArea}</li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
