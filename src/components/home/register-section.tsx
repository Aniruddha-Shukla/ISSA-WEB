import { ArrowRight } from "lucide-react";
import type { RegistrationLink } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { RegistrationCard } from "@/components/register/registration-card";

/** Open registrations on the home page; hidden when nothing is open. */
export function RegisterSection({ links }: { links: RegistrationLink[] }) {
  if (!links.length) return null;
  return (
    <section id="register" aria-labelledby="register-title" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="register-title"
          kicker="05 · Registrations open"
          title="Register"
          description="Grab your spot: open the form, or scan the QR code with your phone."
        />
        <ul className="mx-auto grid max-w-5xl gap-6">
          {links.slice(0, 2).map((link) => (
            <li key={link.id}>
              <RegistrationCard link={link} />
            </li>
          ))}
        </ul>
        {links.length > 2 ? (
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/register" variant="neon" className="px-6 font-display text-[0.7rem] tracking-[0.18em] uppercase">
              All {links.length} registrations <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
