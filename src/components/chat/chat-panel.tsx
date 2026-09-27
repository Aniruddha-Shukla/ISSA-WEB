"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CornerDownLeft, RotateCcw, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "user" | "assistant"; content: string; error?: boolean };

const STORAGE_KEY = "issa-assistant-v1";
const suggestions = [
  "What events are coming up?",
  "How do I register and get my ticket?",
  "Explain the quiz rules",
  "Who are the office bearers?",
];
const greeting: Message = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi! I'm the **ISSA Assistant**. Ask me about upcoming events, registration and tickets, quiz rules, or how to join the club.",
};

const uid = () => Math.random().toString(36).slice(2, 10);

function loadHistory(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Message[]) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : [greeting];
  } catch {
    return [greeting];
  }
}

const markdownComponents: Components = {
  a({ href, children }) {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className="text-primary underline underline-offset-2">
          {children}
        </Link>
      );
    }
    const safe = href && /^https?:\/\//.test(href) ? href : undefined;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
        {children}
      </a>
    );
  },
  img: () => null,
};

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"gemini" | "offline" | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // storage unavailable (private mode): the chat still works
    }
  }, [messages]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      const userMessage: Message = { id: uid(), role: "user", content };
      const replyId = uid();
      const history = [...messages.filter((m) => !m.error && m.id !== "greeting"), userMessage];
      setMessages((all) => [...all, userMessage, { id: replyId, role: "assistant", content: "" }]);
      setInput("");
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.map(({ role, content: c }) => ({ role, content: c.slice(0, 2000) })) }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "The assistant is unavailable right now.");
        }
        setMode(response.headers.get("X-Assistant-Mode") === "gemini" ? "gemini" : "offline");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const snapshot = acc;
          setMessages((all) => all.map((m) => (m.id === replyId ? { ...m, content: snapshot } : m)));
        }
        if (!acc.trim()) throw new Error("I couldn't come up with an answer. Please try rephrasing.");
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Something went wrong.";
        setMessages((all) => all.map((m) => (m.id === replyId ? { ...m, content: message, error: true } : m)));
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setBusy(false);
    setMessages([greeting]);
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const showSuggestions = messages.length <= 1;

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          id="issa-assistant"
          aria-label="ISSA assistant"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-3 bottom-24 z-[60] flex h-[min(38rem,calc(100dvh-8rem))] w-[calc(100vw-1.5rem)] max-w-[25rem] origin-bottom-right flex-col overflow-hidden rounded-2xl glass shadow-2xl shadow-black/60 sm:right-6 sm:bottom-24"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-cyan/20 text-primary ring-1 ring-primary/30">
              <Bot className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-ink">ISSA Assistant</h2>
              <p className="flex items-center gap-1.5 text-xs text-faint">
                <span className={cn("size-1.5 rounded-full", mode === "offline" ? "bg-warning" : "bg-primary")} aria-hidden />
                {mode === "offline" ? "Offline mode · answers from the club FAQ" : "Powered by Gemini · may make mistakes"}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg p-2 text-faint transition-colors hover:bg-white/5 hover:text-ink"
              aria-label="Start a new conversation"
              title="New conversation"
            >
              <RotateCcw className="size-4" />
            </button>
          </header>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-md bg-primary/90 text-on-primary"
                      : m.error
                        ? "rounded-bl-md border border-danger/30 bg-danger/10 text-danger"
                        : "rounded-bl-md border border-line bg-surface-2 text-ink",
                  )}
                >
                  {m.role === "assistant" && !m.error ? (
                    m.content ? (
                      <div className="prose-issa text-sm text-ink/90 [&_p]:m-0 [&_ul]:my-1">
                        <ReactMarkdown components={markdownComponents} skipHtml>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="flex gap-1 py-1" aria-label="Assistant is typing">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="size-1.5 animate-bounce rounded-full bg-primary"
                            style={{ animationDelay: `${i * 120}ms` }}
                          />
                        ))}
                      </span>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.error && lastUser ? (
                    <button
                      type="button"
                      onClick={() => void send(lastUser.content)}
                      className="mt-2 text-xs font-medium text-ink underline"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {showSuggestions ? (
              <div className="pt-1">
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[0.68rem] tracking-[0.18em] text-faint uppercase">
                  <Sparkles className="size-3" aria-hidden /> Try asking
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-line px-3 py-1.5 text-left text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="border-t border-line p-3">
            <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface-2 p-1.5 focus-within:border-primary/50">
              <label htmlFor="assistant-input" className="sr-only">
                Message the ISSA assistant
              </label>
              <textarea
                id="assistant-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={2000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about events, quizzes, rules…"
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-faint focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-opacity disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 flex items-center gap-1 px-1 text-[0.68rem] text-faint">
              <CornerDownLeft className="size-3" aria-hidden /> Enter to send · Shift+Enter for a new line
            </p>
          </form>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
