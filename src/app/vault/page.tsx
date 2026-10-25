import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { huntFlags, rot13 } from "@/content/flag-hunt";
import { Container } from "@/components/ui/section-heading";

export const metadata: Metadata = { title: "Vault", robots: { index: false, follow: false } };

export default function VaultPage() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-20">
      <div className="w-full max-w-xl rounded-2xl border border-danger/30 bg-black/70 p-8 font-mono text-sm">
        <p className="flex items-center gap-2 text-danger">
          <Lock className="size-4" aria-hidden /> ACCESS DENIED
        </p>
        <p className="mt-4 text-muted">
          The robots were told to stay out of here. You are clearly not a robot.
          <br />
          The guard left a note on the door, scrambled the old-fashioned way:
        </p>
        <p className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-center text-lg text-gold">
          {rot13(huntFlags.robots)}
        </p>
        <p className="mt-6 text-xs text-faint">Unscramble it and submit it at /play/flag-hunt.</p>
      </div>
    </Container>
  );
}
