// Row types mirroring supabase/migrations. Keep in sync with the schema.

export type AppRole = "admin" | "member" | "guest";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  roll_no: string | null;
  branch: string | null;
  year: number | null;
  bio: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: boolean;
  allowed_domains: string[];
  restrict_signups: boolean;
  auto_member_for_domains: boolean;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  designation: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  email: string | null;
  tenure: string | null;
  sort_order: number;
  is_published: boolean;
}

export type ProjectStatus = "ongoing" | "completed";

export interface Project {
  id: string;
  title: string;
  summary: string;
  description: string | null;
  tags: string[];
  status: ProjectStatus;
  repo_url: string | null;
  demo_url: string | null;
  cover_url: string | null;
  contributors: string[];
  is_featured: boolean;
  sort_order: number;
  is_published: boolean;
}

export type AchievementCategory = "hackathon" | "ctf" | "certification" | "award" | "publication" | "other";

export interface Achievement {
  id: string;
  title: string;
  recipients: string;
  category: AchievementCategory;
  position: string | null;
  description: string | null;
  achieved_on: string | null;
  link_url: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_published: boolean;
}

export type EventCategory = "workshop" | "hackathon" | "ctf" | "talk" | "competition" | "meetup" | "other";
export type EventMode = "offline" | "online" | "hybrid";

export interface ClubEvent {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  category: EventCategory;
  cover_url: string | null;
  location: string | null;
  mode: EventMode;
  starts_at: string;
  ends_at: string | null;
  registration_deadline: string | null;
  capacity: number | null;
  registration_open: boolean;
  members_only: boolean;
  submissions_open: boolean;
  submission_deadline: string | null;
  submission_guidelines: string | null;
  tags: string[];
  is_featured: boolean;
  is_published: boolean;
  created_at?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  media_type: "image" | "video";
  url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  event_id: string | null;
  taken_on: string | null;
  sort_order: number;
  is_published: boolean;
}

export type RegistrationStatus = "registered" | "attended" | "cancelled";

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  ticket_code: string;
  status: RegistrationStatus;
  team_name: string | null;
  registered_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
}

export type SubmissionStatus = "submitted" | "under_review" | "accepted" | "rejected" | "winner";

export interface Submission {
  id: string;
  event_id: string;
  user_id: string;
  title: string;
  description: string | null;
  repo_url: string | null;
  demo_url: string | null;
  file_path: string | null;
  team_name: string | null;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  updated_at: string;
}

export type QuizMode = "live" | "self_paced";
export type QuizStatus = "draft" | "published" | "ended";
export type QuizPhase = "lobby" | "question" | "reveal";

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  event_id: string | null;
  mode: QuizMode;
  status: QuizStatus;
  phase: QuizPhase;
  current_index: number;
  question_started_at: string | null;
  opens_at: string | null;
  closes_at: string | null;
  members_only: boolean;
  created_at: string;
  updated_at: string;
}

/** A question as participants see it (never includes the answer). */
export interface QuizQuestionPublic {
  id: string;
  position: number;
  prompt: string;
  options: string[];
  time_limit: number;
  points: number;
  image_url: string | null;
}

/** Admin view of a question, joined with its answer key. */
export interface QuizQuestionAdmin extends QuizQuestionPublic {
  quiz_id: string;
  explanation: string | null;
  correct_index: number;
}

export interface LiveState {
  status: QuizStatus;
  mode: QuizMode;
  phase: QuizPhase;
  index: number;
  total: number;
  participants: number;
  server_now: string;
  me: {
    score: number;
    correct_count: number;
    answered_count: number;
    finished: boolean;
    current_index: number;
  } | null;
  question?: QuizQuestionPublic;
  started_at?: string;
  answered?: number;
  my_response?: { selected_index: number | null; is_correct: boolean | null; points: number | null };
  distribution?: number[];
  correct_index?: number | null;
  explanation?: string | null;
}

export interface SelfPacedStep {
  done: boolean;
  total: number;
  server_now: string;
  index?: number;
  question?: QuizQuestionPublic;
  started_at?: string;
}

export interface AnswerResult {
  accepted: boolean;
  response_ms: number;
  correct?: boolean;
  points?: number;
}

export interface LeaderboardRow {
  id: string;
  rank: number;
  display_name: string;
  avatar_url: string | null;
  score: number;
  correct_count: number;
  answered_count: number;
  total_time_ms: number;
  finished: boolean;
  is_me: boolean;
}

export interface ReviewItem {
  id: string;
  position: number;
  prompt: string;
  options: string[];
  image_url: string | null;
  correct_index: number | null;
  explanation: string | null;
  selected_index: number | null;
  is_correct: boolean | null;
  points: number | null;
}

export interface Badge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
}

export interface UserBadge {
  user_id: string;
  badge_slug: string;
  awarded_at: string;
  badges?: Badge;
}

export interface CheckInResult {
  already_checked_in: boolean;
  ticket_code: string;
  checked_in_at: string;
  team_name: string | null;
  attendee: { name: string | null; email: string; roll_no: string | null; branch: string | null; year: number | null };
  event: { id: string; title: string; starts_at: string };
}

export interface AdminOverview {
  users: number;
  members: number;
  admins: number;
  events_upcoming: number;
  events_total: number;
  registrations: number;
  attended: number;
  submissions: number;
  quiz_attempts: number;
  recent_events: {
    id: string;
    title: string;
    slug: string;
    starts_at: string;
    capacity: number | null;
    registered: number;
    attended: number;
  }[];
  signups_by_week: { week: string; count: number }[];
}
