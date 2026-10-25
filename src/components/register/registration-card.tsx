import Link from "next/link";
import { CalendarDays, Clock, ExternalLink } from "lucide-react";
import type { RegistrationLink } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ChamferFrame } from "@/components/ui/chamfer-frame";
import { CopyLink } from "./copy-link";
import { QrPanel } from "./qr-panel";

/** A registration: what it's for, the form button, and a QR code to scan from posters or screens. */
export function RegistrationCard({ link }: { link: RegistrationLink }) {
  return (
    <ChamferFrame size={26} tone="neon" className="h-full" innerClassName="h-full bg-surface/95 p-6 sm:p-7">
      <div className="flex h-full flex-col gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.62rem] font-semibold tracking-[0.24em] text-gold uppercase">Registrations open</p>
          <h3 className="mt-2 font-display text-xl font-bold tracking-[0.06em] text-ink uppercase sm:text-2xl">{link.title}</h3>
          {link.description ? <p className="mt-3 text-sm leading-relaxed text-muted">{link.description}</p> : null}
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            {link.event ? (
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 text-faint" aria-hidden />
                <Link href={`/events/${link.event.slug}`} className="hover:text-primary">
                  {link.event.title} · {formatDateTime(link.event.starts_at)}
                </Link>
              </li>
            ) : null}
            {link.closes_at ? (
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-faint" aria-hidden />
                Closes {formatDateTime(link.closes_at)}
              </li>
            ) : null}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={link.form_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({
                variant: "neon",
                className: "px-6 font-display text-[0.7rem] tracking-[0.16em] uppercase",
              })}
            >
              Register now <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only"> for {link.title} (opens the form in a new tab)</span>
            </a>
            <CopyLink url={link.form_url} />
          </div>
        </div>
        <QrPanel url={link.form_url} title={link.title} imageUrl={link.qr_image_url} />
      </div>
    </ChamferFrame>
  );
}
