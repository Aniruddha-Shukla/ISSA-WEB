"use client";

import { useMemo, useState } from "react";
import { Images, Play } from "lucide-react";
import type { GalleryItem } from "@/lib/types";
import { cn, youTubeId } from "@/lib/utils";
import { EmptyState } from "@/components/ui/feedback";
import { GenerativeArt } from "@/components/ui/generative-art";
import { SmartImage } from "@/components/ui/smart-image";
import { Lightbox } from "./lightbox";

type Filter = "all" | "image" | "video";

// A repeating mosaic: some tiles span two rows/columns on large screens.
const spans = ["lg:col-span-2 lg:row-span-2", "", "lg:row-span-2", "", "", "lg:col-span-2", "", "lg:row-span-2", ""];

function thumbnailFor(item: GalleryItem) {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.media_type === "video") {
    const id = youTubeId(item.url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }
  return item.url;
}

export function GalleryGrid({ items, showFilters = false }: { items: GalleryItem[]; showFilters?: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState<number | null>(null);

  const visible = useMemo(() => (filter === "all" ? items : items.filter((i) => i.media_type === filter)), [items, filter]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Images className="size-5" />}
        title="No photos yet"
        description="Event photos and video recaps will appear here."
      />
    );
  }

  return (
    <>
      {showFilters ? (
        <div
          role="group"
          aria-label="Filter gallery"
          className="mb-6 inline-flex rounded-full border border-line-strong bg-black/60 p-1"
        >
          {(
            [
              ["all", "All"],
              ["image", "Photos"],
              ["video", "Videos"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-4 py-1 font-display text-[0.65rem] font-semibold tracking-[0.16em] uppercase transition-colors",
                filter === value ? "bg-surface-3 text-ink ring-1 ring-primary/40" : "text-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-3 lg:grid-cols-4">
        {visible.map((item, i) => {
          const thumb = thumbnailFor(item);
          return (
            <li
              key={item.id}
              className={cn("group relative overflow-hidden bg-surface [--chamfer:20px] chamfer", spans[i % spans.length])}
            >
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="absolute inset-0 h-full w-full text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
                aria-label={`Open ${item.media_type === "video" ? "video" : "photo"}: ${item.title}`}
              >
                {thumb ? (
                  <SmartImage
                    src={thumb}
                    alt=""
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <GenerativeArt
                    seed={item.title}
                    variant="photo"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                {item.media_type === "video" ? (
                  <span className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur transition-transform group-hover:scale-110">
                    <Play className="ml-0.5 size-6 fill-current" aria-hidden />
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 p-3.5">
                  <span className="block truncate text-sm font-medium text-white">{item.title}</span>
                  {item.caption ? <span className="mt-0.5 line-clamp-1 block text-xs text-white/70">{item.caption}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Lightbox items={visible} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}
