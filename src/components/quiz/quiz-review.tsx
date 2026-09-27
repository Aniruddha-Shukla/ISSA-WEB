"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReviewItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Notice, Skeleton } from "@/components/ui/feedback";

export function QuizReview({ quizId }: { quizId: string }) {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSupabaseBrowserClient()
      .rpc("get_quiz_review", { p_quiz_id: quizId })
      .then(({ data, error: rpcError }) => {
        if (!active) return;
        if (rpcError) setError(rpcError.message);
        else setItems((data as ReviewItem[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [quizId]);

  if (error)
    return (
      <Notice tone="info" title="Answer review">
        {error}
      </Notice>
    );
  if (!items) return <Skeleton className="h-40 w-full" />;

  return (
    <section aria-labelledby="review-title">
      <h2 id="review-title" className="flex items-center gap-2 text-lg font-semibold text-ink">
        <BookOpen className="size-5 text-primary" aria-hidden /> Answer review
      </h2>
      <ol className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium text-ink">
                <span className="mr-2 font-mono text-sm text-faint">Q{item.position + 1}.</span>
                {item.prompt}
              </p>
              {item.selected_index === null || item.selected_index === undefined ? (
                <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-faint">
                  {item.is_correct === null ? "not answered" : "timed out"}
                </span>
              ) : item.is_correct ? (
                <span className="shrink-0 rounded-md bg-success/10 px-2 py-0.5 font-mono text-xs text-success">
                  +{item.points}
                </span>
              ) : (
                <span className="shrink-0 rounded-md bg-danger/10 px-2 py-0.5 font-mono text-xs text-danger">0</span>
              )}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {item.options.map((option, index) => {
                const correct = index === item.correct_index;
                const picked = index === item.selected_index;
                return (
                  <li
                    key={index}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      correct
                        ? "border-success/50 bg-success/10 text-ink"
                        : picked
                          ? "border-danger/50 bg-danger/10 text-ink"
                          : "border-line text-muted",
                    )}
                  >
                    {correct ? (
                      <Check className="size-4 shrink-0 text-success" aria-label="Correct answer" />
                    ) : picked ? (
                      <X className="size-4 shrink-0 text-danger" aria-label="Your answer" />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                    {option}
                    {picked ? <span className="ml-auto font-mono text-[0.65rem] text-faint uppercase">you</span> : null}
                  </li>
                );
              })}
            </ul>
            {item.explanation ? <p className="mt-3 text-sm text-muted">{item.explanation}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
