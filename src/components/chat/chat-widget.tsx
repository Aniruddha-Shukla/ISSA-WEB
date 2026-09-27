"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X } from "lucide-react";

// The panel (and its markdown renderer) only loads when someone opens the chat.
const ChatPanel = dynamic(() => import("./chat-panel").then((m) => m.ChatPanel), { ssr: false });

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  const toggle = () => {
    setEverOpened(true);
    setOpen((v) => !v);
  };

  return (
    <>
      {everOpened ? <ChatPanel open={open} onClose={() => setOpen(false)} /> : null}
      <motion.button
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-expanded={open}
        aria-controls="issa-assistant"
        aria-label={open ? "Close ISSA assistant" : "Open ISSA assistant"}
        className="fixed right-5 bottom-5 z-[60] flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan text-on-primary shadow-[0_10px_40px_-8px_rgb(46_242_177/0.6)] ring-1 ring-white/20 sm:right-6 sm:bottom-6"
      >
        {!open && !everOpened ? (
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/60" aria-hidden />
        ) : null}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            {open ? <X className="size-6" aria-hidden /> : <Bot className="size-6" aria-hidden />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
