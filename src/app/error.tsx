"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section-heading";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-sm text-danger">runtime error</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">Something broke on our side</h1>
      <p className="mt-3 max-w-md text-muted">
        Please try again. If it keeps happening, let the core team know{error.digest ? ` and mention code ${error.digest}` : ""}.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">
          Go home
        </ButtonLink>
      </div>
    </Container>
  );
}
