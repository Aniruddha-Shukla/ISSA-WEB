import { dottedName, LogoMark } from "./logo";

/**
 * A short "system boot" splash shown on the first load of the home page only.
 * Pure CSS (see `.boot-screen` in globals.css): it lives in the root layout so
 * client-side navigation never replays it, it never blocks clicks once faded,
 * and it is skipped entirely for reduced-motion users.
 */
export function BootScreen() {
  return (
    <div className="boot-screen" aria-hidden>
      <div className="flex flex-col items-center gap-5">
        <LogoMark gradientId="boot-logo" className="size-14 drop-shadow-[0_0_20px_rgb(34_211_238/0.6)]" />
        <p className="text-chrome pl-[0.4em] font-display text-2xl font-black tracking-[0.4em]">{dottedName}</p>
        <div className="h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-left animate-boot-bar bg-gradient-to-r from-primary to-accent" />
        </div>
        <p className="font-mono text-[0.65rem] tracking-[0.3em] text-faint uppercase">initialising secure session</p>
      </div>
    </div>
  );
}
