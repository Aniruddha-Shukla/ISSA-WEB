import { ArrowRight, ChevronDown, CircleCheck, MessageCircle } from "lucide-react";
import { faqs, membership } from "@/content/club";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/section-heading";

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 sm:py-28">
      <Container className="max-w-4xl">
        <SectionHeading
          id="faq-title"
          kicker="08 · Questions, answered"
          title="FAQ"
          description="Can't find what you're looking for? Ask the ISSA assistant in the corner — it knows our rules, events and schedules."
        />
        <p className="-mt-8 mb-10 flex items-center justify-center gap-2 text-sm text-faint">
          <MessageCircle className="size-4 text-primary" aria-hidden /> The assistant is available on every page.
        </p>
        <div className="divide-y divide-line rounded-3xl glass">
          {faqs.map((faq) => (
            <details key={faq.question} className="group px-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold text-ink transition-colors hover:text-primary">
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
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-primary/70 via-white/10 to-accent/70 p-px [--chamfer:40px] chamfer">
          <div className="relative isolate overflow-hidden bg-surface px-6 py-14 [--chamfer:39.6px] chamfer sm:px-12 lg:py-16">
            <div className="absolute inset-0 -z-10 bg-grid mask-radial opacity-60" aria-hidden />
            <div
              className="absolute -top-48 -left-48 -z-10 size-[32rem] bg-[radial-gradient(closest-side,rgb(34_211_238/0.2),transparent)]"
              aria-hidden
            />
            <div
              className="absolute -right-48 -bottom-48 -z-10 size-[32rem] bg-[radial-gradient(closest-side,rgb(232_121_249/0.2),transparent)]"
              aria-hidden
            />
            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="font-mono text-xs tracking-[0.22em] text-gold uppercase">$ sudo join issa</p>
                <h2
                  id="join-title"
                  className="mt-4 text-chrome font-display text-2xl font-extrabold tracking-[0.06em] uppercase sm:text-4xl"
                >
                  Your security journey starts with one command.
                </h2>
                <p className="mt-4 max-w-xl text-muted">{membership.howToJoin}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href="/signup" size="lg" variant="neon">
                    Create your account <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                  <ButtonLink href="/events" size="lg" variant="outline">
                    Browse events
                  </ButtonLink>
                </div>
              </div>
              <ul className="space-y-3">
                {membership.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 rounded-2xl glass px-4 py-3 text-sm text-ink/90">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
