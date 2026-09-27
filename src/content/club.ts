import { siteConfig } from "@/config/site";

/**
 * Static club knowledge. Rendered on the site (About, FAQ) and injected into
 * the AI assistant's system prompt, so keep it accurate — the assistant will
 * repeat it to students.
 */

export const about = {
  headline: "A student community that learns security by doing.",
  mission:
    "We help every student — beginner or seasoned hacker — build real skills in cybersecurity and software engineering through hands-on workshops, competitions, research and open-source projects, with a strong emphasis on ethics.",
  story: `${siteConfig.shortName} started in ${siteConfig.founded} as a handful of students solving CTF challenges after class. Today we run weekly Hack Nights, an annual CTF and hackathon, industry talks and certification study groups, and maintain open-source security tools.`,
};

export const pillars = [
  {
    title: "Offensive & Defensive Security",
    description: "Web exploitation, reverse engineering, forensics, blue-team labs and CTF training.",
    icon: "shield",
  },
  {
    title: "Software Engineering",
    description: "Full-stack, cloud and DevSecOps projects shipped as open source.",
    icon: "code",
  },
  {
    title: "AI & Security Research",
    description: "Adversarial ML, LLM red-teaming, phishing detection and published student research.",
    icon: "brain",
  },
  {
    title: "Community & Outreach",
    description: "Cyber-awareness drives, mentorship for juniors and talks from industry experts.",
    icon: "users",
  },
] as const;

export const activities = [
  "Weekly Hack Nights (hands-on labs, beginner friendly)",
  "ISSA CTF — our flagship 24-hour capture-the-flag",
  "BuildSec — a 36-hour secure-by-design hackathon",
  "Live quiz nights and self-paced practice quizzes",
  "Guest talks from security professionals",
  "Certification study groups (Security+, CEH, cloud)",
];

export const membership = {
  howToJoin: `Create an account on this website. If you sign up with your college email address you are verified as a club member automatically; otherwise you join as a guest and a core member can upgrade you. Membership is free.`,
  roles: [
    {
      role: "Guest",
      description: "Anyone with an account. Can register for public events, play public quizzes and view their tickets.",
    },
    {
      role: "Member",
      description: "Verified students. Everything guests can do, plus members-only events (like ISSA CTF) and quizzes.",
    },
    {
      role: "Admin",
      description: "Core committee. Manages events, quizzes, check-ins, content and exports from the admin dashboard.",
    },
  ],
  benefits: [
    "Priority access to workshops with limited seats",
    "Members-only CTFs, study groups and project teams",
    "Badges and a profile that tracks your events and quiz scores",
    "Mentorship from seniors and alumni in the industry",
  ],
};

export const rules = {
  codeOfConduct: [
    "Hack ethically: only test systems you own or have explicit written permission to test. Unauthorised access is illegal and leads to removal from the club.",
    "Be respectful and inclusive. Harassment of any kind is not tolerated.",
    "Do not share flags, answers or solutions during live competitions.",
    "Credit other people's work; plagiarised submissions are disqualified.",
  ],
  events: [
    "Register on the event page before the deadline; seats are first come, first served.",
    "Your ticket (QR code and confirmation ID like ISSA-7F3K-92QX) is on the event page and in your profile.",
    "Show the QR code at the venue for check-in. Carry your college ID for offline events.",
    "You can cancel a registration from the event page until the event starts, which frees your seat for someone else.",
    "Members-only events require the Member role (sign up with your college email).",
  ],
  quizzes: [
    "Sign in to play. Each person gets one attempt per quiz.",
    "Live quizzes are run by a host: everyone sees the same question at the same time and the host reveals the answer after the timer.",
    "Self-paced quizzes can be played any time while they are open; the timer for each question starts when it is shown and keeps running if you reload.",
    "Each question has a countdown. A correct answer earns between 50% and 100% of the question's points (usually 500–1000) — the faster you answer, the more you earn. Wrong or missing answers earn 0; there is no negative marking.",
    "Answers are locked once submitted. Ties are broken by number of correct answers, then total response time.",
    "Correct answers and explanations for every question are shown once the quiz ends. Top three finishers earn the Podium badge; the winner earns Quiz Champion.",
  ],
  submissions: [
    "Only registered participants can submit, and only while submissions are open for the event.",
    "Teams submit once, from any one member's account, and enter the team name.",
    "Include a repository link; demo links and a single .zip/.pdf/.pptx/.png/.jpg file up to 10 MB are optional.",
    "You can update your submission any time before the deadline. The latest version is judged.",
  ],
};

export const faqs = [
  {
    question: "How do I join ISSA?",
    answer: membership.howToJoin,
  },
  {
    question: "Do I need prior experience?",
    answer:
      "Not at all. Most workshops are marked beginner-friendly and Hack Nights start from the basics. Curiosity is the only prerequisite.",
  },
  {
    question: "How do I register for an event and get my ticket?",
    answer:
      "Open the event on the Events page and press Register. Your ticket with a QR code and confirmation ID appears immediately on the event page and under My Tickets in your profile. Show it at the venue to check in.",
  },
  {
    question: "Can I cancel my registration?",
    answer: "Yes, from the event page, any time before the event starts. Your seat goes back to the pool.",
  },
  {
    question: "How are quizzes scored?",
    answer:
      "Each correct answer earns between 50% and 100% of the question's points depending on how quickly you answer. Wrong answers earn nothing, and there is no negative marking. Ties are broken by correct answers, then total time.",
  },
  {
    question: "How do hackathon submissions work?",
    answer:
      "Register for the hackathon first. While submissions are open, the event page shows a submission form: add your project title, repository link, optional demo link and an optional file. One submission per team — you can edit it until the deadline.",
  },
  {
    question: "Why can't I register for a members-only event?",
    answer:
      "Members-only events (such as ISSA CTF) need the Member role. Sign up with your college email to be verified automatically, or ask a core member to upgrade your account.",
  },
  {
    question: "Can I propose a talk, workshop or project?",
    answer: `Yes! Email ${siteConfig.email} or talk to any core committee member. We especially love student-led sessions.`,
  },
];

export const contact = {
  email: siteConfig.email,
  location: siteConfig.location,
  socials: siteConfig.socials,
};
