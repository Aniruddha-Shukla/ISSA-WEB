"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Check, CircleCheck, Copy, Download } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { ClubEvent, Registration } from "@/lib/types";
import { cn, formatDateTime, formatEventWhen } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function checkInUrl(code: string) {
  const origin = typeof window === "undefined" ? siteConfig.url : window.location.origin;
  return `${origin}/admin/check-in?code=${encodeURIComponent(code)}`;
}

/** Renders a shareable PNG of the ticket (QR + details) and downloads it. */
function downloadTicketImage(qrCanvas: HTMLCanvasElement, event: ClubEvent, registration: Registration, holder: string) {
  const W = 720;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, W);
  glow.addColorStop(0, "rgba(46,242,177,0.25)");
  glow.addColorStop(1, "rgba(46,242,177,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#2ef2b1";
  ctx.font = "600 22px monospace";
  ctx.fillText(`${siteConfig.shortName} // EVENT TICKET`, 56, 80);

  ctx.fillStyle = "#e7edf5";
  ctx.font = "700 40px sans-serif";
  const words = event.title.split(" ");
  let line = "";
  let y = 150;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > W - 112) {
      ctx.fillText(line, 56, y);
      line = word;
      y += 50;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, 56, y);

  ctx.fillStyle = "#9aa8bb";
  ctx.font = "400 24px sans-serif";
  ctx.fillText(formatEventWhen(event.starts_at, event.ends_at), 56, y + 50);
  if (event.location) ctx.fillText(event.location, 56, y + 86);

  const qrSize = 360;
  const qrX = (W - qrSize) / 2;
  const qrY = y + 130;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 24);
  ctx.fill();
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#e7edf5";
  ctx.font = "700 42px monospace";
  ctx.textAlign = "center";
  ctx.fillText(registration.ticket_code, W / 2, qrY + qrSize + 90);
  ctx.fillStyle = "#9aa8bb";
  ctx.font = "400 22px sans-serif";
  ctx.fillText(holder, W / 2, qrY + qrSize + 130);

  const link = document.createElement("a");
  link.download = `${registration.ticket_code}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function TicketCard({
  event,
  registration,
  holderName,
  className,
}: {
  event: ClubEvent;
  registration: Registration;
  holderName: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const hiddenQrRef = useRef<HTMLCanvasElement>(null);
  const url = checkInUrl(registration.ticket_code);
  const attended = registration.status === "attended";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(registration.ticket_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked; the code is visible on screen anyway
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/[0.08] to-surface",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <p className="font-mono text-[0.68rem] tracking-[0.2em] text-primary uppercase">Your ticket</p>
        {attended ? (
          <Badge tone="success" dot>
            Checked in
          </Badge>
        ) : (
          <Badge tone="primary" dot pulse>
            Confirmed
          </Badge>
        )}
      </div>

      <div className="flex flex-col items-center px-5 pt-4 pb-5">
        <div className="rounded-xl bg-white p-3 shadow-[0_0_40px_-8px_rgb(46_242_177/0.5)]">
          <QRCodeSVG
            value={url}
            size={168}
            bgColor="#ffffff"
            fgColor="#05070b"
            level="M"
            title={`Check-in QR code for ticket ${registration.ticket_code}`}
          />
        </div>
        <QRCodeCanvas
          ref={hiddenQrRef}
          value={url}
          size={480}
          bgColor="#ffffff"
          fgColor="#05070b"
          level="M"
          className="hidden"
          aria-hidden
        />

        <button
          type="button"
          onClick={copy}
          className="group mt-4 flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-xl font-bold tracking-wider text-ink transition-colors hover:text-primary"
          aria-label={`Copy confirmation ID ${registration.ticket_code}`}
        >
          {registration.ticket_code}
          {copied ? (
            <Check className="size-4 text-primary" aria-hidden />
          ) : (
            <Copy className="size-4 text-faint group-hover:text-primary" aria-hidden />
          )}
        </button>
        <p className="mt-1 text-sm text-muted">{holderName}</p>
        {registration.team_name ? <p className="text-xs text-faint">Team {registration.team_name}</p> : null}
        <span className="sr-only" aria-live="polite">
          {copied ? "Confirmation ID copied" : ""}
        </span>
      </div>

      {/* perforation */}
      <div className="relative h-px border-t border-dashed border-line-strong">
        <span className="absolute -top-3 -left-3 size-6 rounded-full border border-line bg-base" aria-hidden />
        <span className="absolute -top-3 -right-3 size-6 rounded-full border border-line bg-base" aria-hidden />
      </div>

      <div className="space-y-3 px-5 py-4 text-sm">
        {attended && registration.checked_in_at ? (
          <p className="flex items-center gap-2 text-success">
            <CircleCheck className="size-4" aria-hidden /> Checked in {formatDateTime(registration.checked_in_at)}
          </p>
        ) : (
          <p className="text-muted">Show this QR code at the venue. Screenshots work too.</p>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => hiddenQrRef.current && downloadTicketImage(hiddenQrRef.current, event, registration, holderName)}
        >
          <Download className="size-4" aria-hidden /> Save ticket image
        </Button>
      </div>
    </div>
  );
}
