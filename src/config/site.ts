/**
 * Club-wide configuration. Edit this file to rebrand the site for your
 * college: names, contact details, socials and navigation all live here.
 */
export const siteConfig = {
  shortName: "ISSA",
  name: "ISSA Tech Club",
  fullName: "Information Systems Security Association",
  chapter: "Student Chapter",
  college: "Your College Name",
  tagline: "Hack. Defend. Build.",
  description:
    "ISSA is the cybersecurity and technology club on campus: hands-on workshops, CTFs, hackathons, live quizzes and open-source projects built by students.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "issa@yourcollege.edu",
  location: "CSE Block, Your College Name",
  // All event times are shown in this timezone, for every visitor.
  timezone: process.env.NEXT_PUBLIC_CLUB_TIMEZONE ?? "Asia/Kolkata",
  locale: "en-IN",
  founded: 2019,
  socials: {
    github: "https://github.com/",
    linkedin: "https://www.linkedin.com/",
    instagram: "https://www.instagram.com/",
    x: "https://x.com/",
    discord: "https://discord.com/",
    youtube: "https://www.youtube.com/",
  },
} as const;

export type NavItem = { label: string; href: string; section?: string };

/** Links with `section` point at landing-page anchors and drive the scroll-spy. */
export const mainNav: NavItem[] = [
  { label: "About", href: "/#about", section: "about" },
  { label: "Team", href: "/#team", section: "team" },
  { label: "Projects", href: "/#projects", section: "projects" },
  { label: "Events", href: "/events" },
  { label: "Quizzes", href: "/quizzes" },
  { label: "Learn", href: "/learn" },
  { label: "Hall of Fame", href: "/#hall-of-fame", section: "hall-of-fame" },
  { label: "Gallery", href: "/gallery" },
];
