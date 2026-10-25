"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { buttonClasses } from "@/components/ui/button";

export function CopyLink({ url }: { url: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy", url);
    }
  };
  return (
    <button type="button" onClick={copy} className={buttonClasses({ variant: "outline" })}>
      {copied ? <Check className="size-4 text-success" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
