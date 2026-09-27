import { AboutSection } from "@/components/home/about-section";
import { EventsSection } from "@/components/home/events-section";
import { FaqSection, JoinCta } from "@/components/home/faq-and-join";
import { GallerySection } from "@/components/home/gallery-section";
import { HallOfFame } from "@/components/home/hall-of-fame";
import { LearnSection } from "@/components/home/learn-section";
import { Hero } from "@/components/home/hero";
import { ProjectsSection } from "@/components/home/projects-section";
import { TeamSection } from "@/components/home/team-section";
import {
  getAchievements,
  getEvents,
  getEventSeats,
  getGallery,
  getLearningResources,
  getProjects,
  getPublicStats,
  getTeam,
  partitionEvents,
} from "@/lib/data/public";

// Public content is regenerated at most once a minute (and on demand when admins publish changes).
export const revalidate = 60;

export default async function HomePage() {
  const [team, projects, events, achievements, gallery, stats, learning] = await Promise.all([
    getTeam(),
    getProjects(),
    getEvents(),
    getAchievements(),
    getGallery(),
    getPublicStats(),
    getLearningResources(),
  ]);
  const { upcoming, past } = partitionEvents(events);
  const seats = await getEventSeats(upcoming.map((e) => e.id));

  return (
    <>
      <Hero stats={stats} nextEvent={upcoming[0]} />
      <AboutSection />
      <TeamSection team={team} />
      <ProjectsSection projects={projects} />
      <EventsSection upcoming={upcoming.slice(0, 4)} past={past.slice(0, 4)} seats={seats} />
      <LearnSection resources={learning} />
      <HallOfFame achievements={achievements} />
      <GallerySection items={gallery.slice(0, 9)} />
      <FaqSection />
      <JoinCta />
    </>
  );
}
