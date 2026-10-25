import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getRegistrationLinks } from "@/lib/data/public";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { RegistrationCard } from "@/components/register/registration-card";

export const metadata: Metadata = {
  title: "Register",
  description: `Open registrations for ${siteConfig.shortName} events: open the form or scan the QR code.`,
};

export const revalidate = 60;

export default async function RegisterPage() {
  const links = await getRegistrationLinks();
  return (
    <Container className="py-14 sm:py-20">
      <SectionHeading
        as="h1"
        kicker="Open registrations"
        title="Register"
        description="Tap “Register now” to open the form, or scan the QR code with your phone camera."
      />
      {links.length ? (
        <ul className="mx-auto grid max-w-5xl gap-6">
          {links.map((link) => (
            <li key={link.id}>
              <RegistrationCard link={link} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No registrations open right now"
          description="New events open here first. Follow us on Instagram so you don't miss the next one."
          action={
            siteConfig.socials.instagram ? (
              <ButtonLink href={siteConfig.socials.instagram} external variant="outline">
                Follow on Instagram
              </ButtonLink>
            ) : undefined
          }
        />
      )}
    </Container>
  );
}
