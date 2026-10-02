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
          kicker="07 · Moments from the lab"
          title="Gallery"
          description="Photos and video recaps from Hack Nights, CTF finals, talks and hackathons."
        />
        <GalleryGrid items={items} />
        <div className="mt-12 flex justify-center">
          <ButtonLink href="/gallery" variant="neon" className="px-6 font-display text-[0.7rem] tracking-[0.18em] uppercase">
            Full gallery <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
