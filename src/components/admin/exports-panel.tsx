"use client";

import { useState } from "react";
import { FileBraces, FileSpreadsheet } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

type Option = { id: string; title: string };
type Dataset = {
  id: "members" | "registrations" | "attendance" | "quiz_leaderboard" | "quiz_responses" | "submissions";
  title: string;
  description: string;
  scope?: "event" | "quiz";
  required?: boolean;
};

const datasets: Dataset[] = [
  { id: "members", title: "Members", description: "Name, email, roll no, branch, year, role and join date for every account." },
  {
    id: "registrations",
    title: "Event registrations",
    description: "Every registration with ticket code, status and attendee details.",
    scope: "event",
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Checked-in attendees with check-in time — ready for certificates.",
    scope: "event",
  },
  {
    id: "quiz_leaderboard",
    title: "Quiz leaderboard",
    description: "Final ranking with scores, correct answers and total time.",
    scope: "quiz",
    required: true,
  },
  {
    id: "quiz_responses",
    title: "Quiz responses",
    description: "Every answer: question, option chosen, correctness, points and speed.",
    scope: "quiz",
    required: true,
  },
  {
    id: "submissions",
    title: "Submissions",
    description: "Hackathon and challenge submissions with links, status and scores.",
    scope: "event",
  },
];

export function ExportsPanel({ events, quizzes }: { events: Option[]; quizzes: Option[] }) {
  const [eventId, setEventId] = useState<Record<string, string>>({});
  const [quizId, setQuizId] = useState<Record<string, string>>({});

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {datasets.map((d) => {
        const scopeId = d.scope === "event" ? eventId[d.id] : d.scope === "quiz" ? quizId[d.id] : undefined;
        const blocked = d.required && !scopeId;
        const href = (format: "csv" | "json") => {
          const params = new URLSearchParams({ dataset: d.id, format });
          if (scopeId) params.set(d.scope === "event" ? "event_id" : "quiz_id", scopeId);
          return `/api/admin/export?${params}`;
        };
        return (
          <li key={d.id} className="flex flex-col card p-5">
            <h2 className="font-semibold text-ink">{d.title}</h2>
            <p className="mt-1 text-sm text-muted">{d.description}</p>
            {d.scope ? (
              <div className="mt-4">
                <label htmlFor={`scope-${d.id}`} className="sr-only">
                  {d.scope === "event" ? "Event" : "Quiz"}
                </label>
                <Select
                  id={`scope-${d.id}`}
                  value={scopeId ?? ""}
                  onChange={(e) =>
                    d.scope === "event"
                      ? setEventId((all) => ({ ...all, [d.id]: e.target.value }))
                      : setQuizId((all) => ({ ...all, [d.id]: e.target.value }))
                  }
                >
                  <option value="">{d.required ? "Choose a quiz…" : "All events"}</option>
                  {(d.scope === "event" ? events : quizzes).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="mt-auto flex gap-2 pt-5">
              <a
                href={blocked ? undefined : href("csv")}
                aria-disabled={blocked || undefined}
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                <FileSpreadsheet className="size-4" aria-hidden /> CSV
              </a>
              <a
                href={blocked ? undefined : href("json")}
                aria-disabled={blocked || undefined}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                <FileBraces className="size-4" aria-hidden /> JSON
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
