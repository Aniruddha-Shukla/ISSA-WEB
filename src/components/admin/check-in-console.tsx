"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, CircleAlert, CircleCheck, History, ScanLine, TriangleAlert } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CheckInResult } from "@/lib/types";
import { cn, errorMessage, formatDateTime, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";

// Minimal typing for the Shape Detection API (Chrome/Edge/Android).
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

type Outcome =
  | { kind: "success"; result: CheckInResult; at: number }
  | { kind: "duplicate"; result: CheckInResult; at: number }
  | { kind: "error"; message: string; code: string; at: number };

export function extractTicketCode(raw: string) {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const code = url.searchParams.get("code");
    if (code) return code.toUpperCase();
  } catch {
    // not a URL — fall through
  }
  const match = text.toUpperCase().match(/ISSA-[0-9A-Z]{4}-[0-9A-Z]{4}/);
  return match ? match[0] : text.toUpperCase();
}

export function CheckInConsole({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<Outcome | null>(null);
  const [log, setLog] = useState<Outcome[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const hydrated = useHydrated();
  const supportsScanner = hydrated && "BarcodeDetector" in window;
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);
  const initialDone = useRef(false);

  const checkIn = useCallback(async (raw: string) => {
    const ticket = extractTicketCode(raw);
    if (!ticket) return;
    setBusy(true);
    const { data, error } = await getSupabaseBrowserClient().rpc("check_in_ticket", { p_code: ticket });
    setBusy(false);
    const outcome: Outcome = error
      ? { kind: "error", message: errorMessage(error), code: ticket, at: Date.now() }
      : (data as CheckInResult).already_checked_in
        ? { kind: "duplicate", result: data as CheckInResult, at: Date.now() }
        : { kind: "success", result: data as CheckInResult, at: Date.now() };
    setCurrent(outcome);
    setLog((all) => [outcome, ...all].slice(0, 25));
    setCode("");
    if (typeof navigator !== "undefined" && "vibrate" in navigator)
      navigator.vibrate(outcome.kind === "success" ? 80 : [60, 60, 60]);
    inputRef.current?.focus();
  }, []);

  // Phone camera scanned the ticket QR -> /admin/check-in?code=… -> check in automatically.
  useEffect(() => {
    if (!initialCode || initialDone.current) return;
    initialDone.current = true;
    const run = async () => {
      await checkIn(initialCode);
    };
    void run();
  }, [initialCode, checkIn]);

  // In-browser camera scanning where the BarcodeDetector API exists.
  useEffect(() => {
    if (!scanning) return;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const detector = new Detector({ formats: ["qr_code"] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        timer = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (!value) return;
            const ticket = extractTicketCode(value);
            const now = Date.now();
            if (lastScan.current && lastScan.current.code === ticket && now - lastScan.current.at < 4000) return;
            lastScan.current = { code: ticket, at: now };
            void checkIn(ticket);
          } catch {
            // transient detection errors are expected
          }
        }, 350);
      })
      .catch((err: unknown) => {
        setCameraError(errorMessage(err, "Camera access was blocked."));
        setScanning(false);
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, checkIn]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.trim()) void checkIn(code);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 card p-5 sm:flex-row">
          <label htmlFor="ticket-code" className="sr-only">
            Ticket code or QR link
          </label>
          <Input
            id="ticket-code"
            ref={inputRef}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Scan with a USB scanner or type ISSA-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 font-mono tracking-wider text-base uppercase"
          />
          <Button type="submit" size="lg" loading={busy}>
            <ScanLine className="size-4" aria-hidden /> Check in
          </Button>
        </form>

        <div className="overflow-hidden card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <p className="text-sm font-medium text-ink">Camera scanner</p>
            {supportsScanner ? (
              <Button size="sm" variant={scanning ? "danger" : "secondary"} onClick={() => setScanning((s) => !s)}>
                {scanning ? <CameraOff className="size-4" aria-hidden /> : <Camera className="size-4" aria-hidden />}
                {scanning ? "Stop camera" : "Start camera"}
              </Button>
            ) : null}
          </div>
          {supportsScanner ? (
            <div className={cn("relative bg-black", scanning ? "aspect-video" : "hidden")}>
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                <div className="size-52 rounded-3xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
              </div>
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-muted">
              This browser can&apos;t scan QR codes directly. Point your phone&apos;s camera at the ticket instead — the link
              opens this page and checks the attendee in automatically.
            </p>
          )}
          {cameraError ? (
            <Notice tone="error" className="m-4">
              {cameraError}
            </Notice>
          ) : null}
        </div>

        <div aria-live="assertive">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.at}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "rounded-2xl border p-6",
                  current.kind === "success" && "border-success/40 bg-success/10",
                  current.kind === "duplicate" && "border-warning/40 bg-warning/10",
                  current.kind === "error" && "border-danger/40 bg-danger/10",
                )}
              >
                {current.kind === "error" ? (
                  <div className="flex items-start gap-4">
                    <CircleAlert className="size-8 shrink-0 text-danger" aria-hidden />
                    <div>
                      <p className="text-xl font-semibold text-ink">Not checked in</p>
                      <p className="mt-1 text-muted">{current.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {current.kind === "success" ? (
                      <CircleCheck className="size-8 shrink-0 text-success" aria-hidden />
                    ) : (
                      <TriangleAlert className="size-8 shrink-0 text-warning" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="text-xl font-semibold text-ink">
                        {current.kind === "success" ? "Welcome, " : "Already checked in: "}
                        {current.result.attendee.name ?? current.result.attendee.email}
                      </p>
                      <p className="mt-1 text-muted">
                        {current.result.event.title}
                        {current.result.team_name ? ` · Team ${current.result.team_name}` : ""}
                      </p>
                      <p className="mt-2 font-mono text-sm text-faint">
                        {current.result.ticket_code} ·{" "}
                        {[
                          current.result.attendee.roll_no,
                          current.result.attendee.branch,
                          current.result.attendee.year ? `Year ${current.result.attendee.year}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || current.result.attendee.email}
                      </p>
                      {current.kind === "duplicate" ? (
                        <p className="mt-2 text-sm text-warning">
                          First checked in {formatDateTime(current.result.checked_in_at)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <p className="text-sm text-faint">
                Results appear here. The input stays focused so a USB/Bluetooth scanner works as a keyboard.
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <aside className="h-fit card p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <History className="size-4 text-primary" aria-hidden /> This session
        </h2>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-faint">No scans yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {log.map((o) => (
              <li key={o.at} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    o.kind === "success" ? "bg-success" : o.kind === "duplicate" ? "bg-warning" : "bg-danger",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-muted">
                  {o.kind === "error" ? `${o.code} — ${o.message}` : (o.result.attendee.name ?? o.result.attendee.email)}
                </span>
                <span className="font-mono text-xs text-faint">{formatTime(new Date(o.at))}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
