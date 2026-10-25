import { Eye, FileSearch, Globe, KeyRound, Puzzle, type LucideIcon } from "lucide-react";
import type { ChallengeCategory, ChallengeDifficulty } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/badge";

export const categoryMeta: Record<ChallengeCategory, { label: string; icon: LucideIcon }> = {
  web: { label: "Web", icon: Globe },
  crypto: { label: "Crypto", icon: KeyRound },
  forensics: { label: "Forensics", icon: FileSearch },
  osint: { label: "OSINT", icon: Eye },
  misc: { label: "Misc", icon: Puzzle },
};

export const difficultyTone: Record<ChallengeDifficulty, BadgeTone> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export const badgeNames: Record<string, string> = {
  "first-blood": "First Blood",
  "flag-hunter": "Flag Hunter",
  "phish-spotter": "Phish Spotter",
};

/** Fired after a correct flag so stats and scoreboards on the page refresh. */
export const SOLVED_EVENT = "issa:flag-solved";
