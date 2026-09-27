import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section-heading";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-sm text-primary">HTTP 404</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">Nothing at this address</h1>
      <p className="mt-3 max-w-md text-muted">
        The page moved, never existed, or is still a draft. Try the events page or head home.
      </p>
      <p className="mt-6 font-mono text-sm text-faint">
        <span className="text-primary">$</span> curl: (404) route not found
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/events" variant="outline">
          Browse events
        </ButtonLink>
      </div>
    </Container>
  );
}
