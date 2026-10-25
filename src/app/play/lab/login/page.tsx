import type { Metadata } from "next";
import { Container } from "@/components/ui/section-heading";
import { LabLogin } from "@/components/play/lab-login";

export const metadata: Metadata = { title: "Admin portal (CTF lab)", robots: { index: false, follow: false } };

export default function LabLoginPage() {
  return (
    <Container className="flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center font-mono text-xs text-faint">
          Simulation for the ISSA CTF arena · nothing here is a real system
        </p>
        <LabLogin />
      </div>
    </Container>
  );
}
