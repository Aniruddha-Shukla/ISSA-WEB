"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "@/lib/types";
import { formatDate, youTubeId } from "@/lib/utils";
import { GenerativeArt } from "@/components/ui/generative-art";
import { SmartImage } from "@/components/ui/smart-image";

export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: GalleryItem[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  const item = open ? items[index] : null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  };

  const videoId = item?.media_type === "video" ? youTubeId(item.url) : null;

  return (
    <dialog
      ref={ref}
      aria-label={item ? `${item.title} (${(index ?? 0) + 1} of ${items.length})` : "Gallery viewer"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={onKeyDown}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/92 p-0 text-ink backdrop:bg-black/80"
    >
      {item ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="font-mono text-xs text-faint" aria-live="polite">
              {(index ?? 0) + 1} / {items.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-white/10 hover:text-ink"
              aria-label="Close gallery viewer"
              autoFocus
            >
              <X className="size-6" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
            <div className="relative h-full max-h-[78dvh] w-full max-w-6xl">
              {item.media_type === "video" ? (
                videoId ? (
                  <iframe
                    key={videoId}
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                    title={item.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 m-auto aspect-video max-h-full w-full rounded-xl border border-line"
                  />
                ) : item.url ? (
                  <video
                    key={item.url}
                    src={item.url}
                    controls
                    autoPlay
                    className="absolute inset-0 m-auto max-h-full w-full rounded-xl"
                  />
                ) : null
              ) : item.url ? (
                <SmartImage src={item.url} alt={item.caption ?? item.title} sizes="100vw" className="object-contain" priority />
              ) : (
                <div className="absolute inset-0 m-auto aspect-[16/10] max-h-full overflow-hidden rounded-xl border border-line">
                  <GenerativeArt seed={item.title} variant="photo" label={`Placeholder artwork for ${item.title}`} />
                </div>
              )}
            </div>

            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-line bg-black/50 p-2.5 text-ink backdrop-blur transition-colors hover:border-primary/50 hover:text-primary sm:left-4"
                  aria-label="Previous item"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-line bg-black/50 p-2.5 text-ink backdrop-blur transition-colors hover:border-primary/50 hover:text-primary sm:right-4"
                  aria-label="Next item"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            ) : null}
          </div>

          <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-6 text-center sm:px-6">
            <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
            {item.caption ? <p className="mt-1 text-sm text-muted">{item.caption}</p> : null}
            {item.taken_on ? <p className="mt-1 font-mono text-xs text-faint">{formatDate(item.taken_on)}</p> : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
