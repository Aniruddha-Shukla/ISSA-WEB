"use client";

import { useRef } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { slugify } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";

/** The registration QR (generated from the form link, or the admin's own image) with a PNG download for posters. */
export function QrPanel({ url, title, imageUrl }: { url: string; title: string; imageUrl?: string | null }) {
  const canvasWrap = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = canvasWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${slugify(title) || "registration"}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-40 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_0_40px_-10px_rgb(34_211_238/0.6)]">
        {imageUrl ? (
          <SmartImage src={imageUrl} alt={`QR code to register for ${title}`} sizes="160px" className="object-contain" />
        ) : (
          <QRCodeSVG
            value={url}
            size={136}
            level="M"
            marginSize={0}
            title={`QR code to register for ${title}`}
            className="size-full"
          />
        )}
      </div>
      {imageUrl ? null : (
        <>
          {/* full-size copy for printing, never shown */}
          <div ref={canvasWrap} hidden>
            <QRCodeCanvas value={url} size={1024} level="M" marginSize={4} />
          </div>
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] tracking-[0.14em] text-faint uppercase transition-colors hover:text-primary"
          >
            <Download className="size-3.5" aria-hidden /> Download QR
          </button>
        </>
      )}
    </div>
  );
}
