import { ArrowRight, ChevronDown, CircleCheck, MessageCircle } from "lucide-react";
import { faqs, membership } from "@/content/club";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/section-heading";

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading
            id="faq-title"
            kicker="08 — FAQ"
            title="Questions, answered"
            description="Can't find what you're looking for? Ask the ISSA assistant in the corner — it knows our rules, events and schedules."
          />
          <p className="-mt-4 flex items-center gap-2 text-sm text-faint">
            <MessageCircle className="size-4 text-primary" aria-hidden /> The assistant is available on every page.
          </p>
        </div>
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {faqs.map((faq) => (
            <details key={faq.question} className="group px-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium text-ink transition-colors hover:text-primary">
                {faq.question}
                <ChevronDown
                  className="size-5 shrink-0 text-faint transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function JoinCta() {
  return (
    <section aria-labelledby="join-title" className="py-12">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl border border-primary/20 bg-surface px-6 py-14 sm:px-12 lg:py-16">
          <div className="absolute inset-0 -z-10 bg-grid mask-radial opacity-60" aria-hidden />
          <div className="absolute -top-24 -left-24 -z-10 size-80 rounded-full bg-primary/20 blur-[100px]" aria-hidden />
          <div className="absolute -right-24 -bottom-24 -z-10 size-80 rounded-full bg-accent/20 blur-[100px]" aria-hidden />
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="font-mono text-xs tracking-[0.22em] text-primary uppercase">$ sudo join issa</p>
              <h2 id="join-title" className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">
                Your security journey starts with one command.
              </h2>
              <p className="mt-4 max-w-xl text-muted">{membership.howToJoin}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg">
                  Create your account <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/events" size="lg" variant="outline">
                  Browse events
                </ButtonLink>
              </div>
            </div>
            <ul className="space-y-3">
              {membership.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 rounded-xl glass px-4 py-3 text-sm text-ink/90">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
