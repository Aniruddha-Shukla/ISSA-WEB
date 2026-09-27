import { ArrowRight } from "lucide-react";
import type { GalleryItem } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export function GallerySection({ items }: { items: GalleryItem[] }) {
  return (
    <section id="gallery" aria-labelledby="gallery-title" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          id="gallery-title"
          kicker="06 — Gallery"
          title="Moments from the lab"
          description="Photos and video recaps from Hack Nights, CTF finals, talks and hackathons."
          action={
            <ButtonLink href="/gallery" variant="outline">
              Full gallery <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <GalleryGrid items={items} />
      </Container>
    </section>
  );
}
