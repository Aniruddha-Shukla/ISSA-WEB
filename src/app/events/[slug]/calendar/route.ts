import { siteConfig } from "@/config/site";
import { getEventBySlug } from "@/lib/data/public";
import { eventToIcs } from "@/lib/ics";

export async function GET(request: Request, { params }: RouteContext<"/events/[slug]/calendar">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return new Response("Event not found", { status: 404 });

  const url = new URL(`/events/${event.slug}`, request.url).toString();
  return new Response(eventToIcs(event, url, siteConfig.shortName), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
