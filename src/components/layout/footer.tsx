import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { siteConfig } from "@/config/site";
import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from "@/components/ui/brand-icons";
import { Logo } from "./logo";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "About", href: "/#about" },
      { label: "Office bearers", href: "/#team" },
      { label: "Projects", href: "/#projects" },
      { label: "Hall of Fame", href: "/#hall-of-fame" },
    ],
  },
  {
    title: "Participate",
    links: [
      { label: "Events", href: "/events" },
      { label: "Quizzes", href: "/quizzes" },
      { label: "Gallery", href: "/gallery" },
      { label: "Join the club", href: "/signup" },
    ],
  },
];

const socials = [
  { label: "GitHub", href: siteConfig.socials.github, icon: GithubIcon },
  { label: "LinkedIn", href: siteConfig.socials.linkedin, icon: LinkedinIcon },
  { label: "Instagram", href: siteConfig.socials.instagram, icon: InstagramIcon },
  { label: "X", href: siteConfig.socials.x, icon: XIcon },
  { label: "YouTube", href: siteConfig.socials.youtube, icon: YoutubeIcon },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-line">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            {siteConfig.fullName} — {siteConfig.chapter}, {siteConfig.college}.
          </p>
          <ul className="mt-5 flex gap-2" aria-label="Social media">
            {socials.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Icon size={16} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="font-mono text-xs tracking-[0.2em] text-faint uppercase">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="font-mono text-xs tracking-[0.2em] text-faint uppercase">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-primary">
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{siteConfig.location}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-faint sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Hack ethically.
          </p>
          <p className="font-mono">
            <span className="text-primary">$</span> built by the ISSA tech team
          </p>
        </div>
      </div>
    </footer>
  );
}
