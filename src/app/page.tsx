import { huntFlags } from "@/content/flag-hunt";
import { ScrollMarquee } from "@/components/fx/scroll-marquee";
import { AboutSection } from "@/components/home/about-section";
import { EventsSection } from "@/components/home/events-section";
import { FaqSection, JoinCta } from "@/components/home/faq-and-join";
import { GallerySection } from "@/components/home/gallery-section";
import { LearnSection } from "@/components/home/learn-section";
import { PlaySection } from "@/components/home/play-section";
import { RegisterSection } from "@/components/home/register-section";
import { Hero } from "@/components/home/hero";
import { ProjectsSection } from "@/components/home/projects-section";
import { TeamSection } from "@/components/home/team-section";
import {
  getEvents,
  getEventSeats,
  getGallery,
  getLearningResources,
  getProjects,
  getRegistrationLinks,
  getPublicStats,
  getTeam,
  partitionEvents,
} from "@/lib/data/public";

// Public content is regenerated at most once a minute (and on demand when admins publish changes).
export const revalidate = 60;

export default async function HomePage() {
  const [team, projects, events, gallery, stats, learning, registrations] = await Promise.all([
    getTeam(),
    getProjects(),
    getEvents(),
    getGallery(),
    getPublicStats(),
    getLearningResources(),
    getRegistrationLinks(),
  ]);
  const { upcoming, past } = partitionEvents(events);
  const seats = await getEventSeats(upcoming.map((e) => e.id));

  return (
    <>
      {/* flag hunt: visible in "view page source" */}
      <div
        hidden
        dangerouslySetInnerHTML={{ __html: `<!-- you found it: ${huntFlags.source} (submit at /play/flag-hunt) -->` }}
      />
      <Hero stats={stats} nextEvent={upcoming[0]} />
      <ScrollMarquee words={["Hack", "Defend", "Build", "Learn", "Share"]} />
      <AboutSection />
      <TeamSection team={team} />
      <ProjectsSection projects={projects} />
      <ScrollMarquee words={["Workshops", "CTFs", "Hackathons", "Quiz nights", "Talks"]} baseVelocity={-2} />
      <EventsSection upcoming={upcoming.slice(0, 6)} past={past.slice(0, 6)} seats={seats} />
      <RegisterSection links={registrations} />
      <LearnSection resources={learning} />
      <PlaySection />
      <GallerySection items={gallery.slice(0, 9)} />
      <FaqSection />
      <JoinCta />
    </>
  );
}
