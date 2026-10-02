import Link from "next/link";
import { siteConfig } from "@/config/site";
import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from "@/components/ui/brand-icons";
import { dottedName, LogoMark } from "./logo";

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
      { label: "Learning hub", href: "/learn" },
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

function ColumnTitle({ children }: { children: string }) {
  return (
    <h2 className="font-display text-xs font-bold tracking-[0.24em] text-ink uppercase">
      <span className="text-primary" aria-hidden>
        {"> "}
      </span>
      {children}
    </h2>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-24 bg-black/80">
      <div className="h-0.5 bg-gradient-to-r from-[#ef4444] via-accent to-[#3b82f6]" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label={`${siteConfig.shortName} home`}>
            <LogoMark gradientId="footer-logo" className="size-12" />
            <span className="text-chrome font-display text-3xl font-black tracking-[0.18em]">{dottedName}</span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
            {siteConfig.fullName} — {siteConfig.chapter}, {siteConfig.college}.
          </p>
          <ul className="mt-6 flex gap-2" aria-label="Social media">
            {socials.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-10 items-center justify-center rounded-full border border-line-strong text-muted transition-colors hover:border-primary/60 hover:text-primary hover:shadow-[0_0_18px_-4px_rgb(34_211_238/0.7)]"
                >
                  <Icon size={16} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <ColumnTitle>{col.title}</ColumnTitle>
            <ul className="mt-5 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-mono text-sm text-muted transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <ColumnTitle>Contact</ColumnTitle>
          <dl className="mt-5 space-y-4 font-mono text-sm">
            <div>
              <dt className="text-[0.7rem] tracking-[0.2em] text-faint uppercase">Email</dt>
              <dd className="mt-1">
                <a href={`mailto:${siteConfig.email}`} className="break-all text-muted hover:text-primary">
                  {siteConfig.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[0.7rem] tracking-[0.2em] text-faint uppercase">Find us</dt>
              <dd className="mt-1 text-muted">{siteConfig.location}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 font-mono text-xs text-faint sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Hack ethically.
          </p>
          <p>
            <span className="text-primary">$</span> built by the {siteConfig.shortName} tech team
          </p>
        </div>
      </div>
    </footer>
  );
}
