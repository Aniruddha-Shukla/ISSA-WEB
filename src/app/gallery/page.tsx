import type { Metadata } from "next";
import { getGallery } from "@/lib/data/public";
import { Container, SectionHeading } from "@/components/ui/section-heading";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos and video recaps from ISSA workshops, CTFs, hackathons and talks.",
};

export const revalidate = 60;

export default async function GalleryPage() {
  const items = await getGallery();
  return (
    <Container className="py-14 sm:py-20">
      <SectionHeading
        as="h1"
        kicker="Gallery"
        title="Moments from the lab"
        description="Click any photo or video to open it full screen. Use the arrow keys to browse."
      />
      <GalleryGrid items={items} showFilters />
    </Container>
  );
}
