import {
  Award,
  Brain,
  CalendarCheck,
  Code,
  Flag,
  Footprints,
  Hammer,
  Medal,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Icons referenced by name from the database (badges) and content files. */
const registry: Record<string, LucideIcon> = {
  award: Award,
  brain: Brain,
  "calendar-check": CalendarCheck,
  code: Code,
  flag: Flag,
  footprints: Footprints,
  hammer: Hammer,
  medal: Medal,
  shield: Shield,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  trophy: Trophy,
  users: Users,
};

export function NamedIcon({ name, className }: { name: string; className?: string }) {
  const Icon = registry[name] ?? Award;
  return <Icon className={className} aria-hidden />;
}
