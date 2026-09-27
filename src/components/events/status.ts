import type { SubmissionStatus } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/badge";

export const submissionStatusTone: Record<SubmissionStatus, BadgeTone> = {
  submitted: "cyan",
  under_review: "warning",
  accepted: "success",
  rejected: "danger",
  winner: "accent",
};
