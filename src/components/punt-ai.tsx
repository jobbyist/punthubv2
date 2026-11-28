import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useSession } from "@/components/session";
import { askPuntAi } from "@/lib/punt-ai.functions";

type AiSource = { title: string; url: string; domain?: string };
type Msg = {
  role: "user" | "ai";
  text: string;
  sources?: AiSource[];
  mode?: "internal" | "live_web";
  notice?: string;
  creditsCharged?: number;
};

const suggestions = [
  "How does Puntr lock a pick?",
  "What do units and ROI mean?",
  "What is the current Premier League table?",
];

function errorMessage(
  code: "not_launched" | "rate_limited" | "account_restricted" | "unavailable",
): string {
  if (code === "not_launched")
    return "PUNT AI will be available when your Puntr launch access is active.";
  if (code === "rate_limited")
    return "You've reached the current PUNT AI usage limit. Try again later.";
  if (code === "account_restricted")
    return "PUNT AI requires an age-verified account in good standing. Complete your account verification or contact support.";
  return "PUNT AI is temporarily unavailable. Please try again shortly.";
}

export function PuntAI() {
  const { isSignedIn } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "I'm PUNT AI. Ask about Puntr's verified fixtures and league tables, football, or how the platform works. I'll distinguish stored Puntr data from live web research.",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send(value: string) {
    const text = value.trim();
    if (!text || typing) return;
    if (!isSignedIn) {
      void navigate({ to: "/join" });
      return;
    }

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setTyping(true);
    try {
      const result = await askPuntAi({ data: { message: text } });
      if (!result.ok) {
        setMessages((current) => [...current, { role: "ai", text: errorMessage(result.code) }]);
        return;
      }
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: result.answer,
          sources: result.sources,
          mode: result.mode,
          notice: result.notice,
          creditsCharged: result.creditsCharged,
        },
      ]);
    } catch (error) {
      console.error("PUNT AI request failed", error);
      setMessages((current) => [
        ...current,
        { role: "ai", text: "PUNT AI is temporarily unavailable. Please try again shortly." },
      ]);
    } finally {
      setTyping(false);
    }
  }

  const isHomepage = pathname === "/";
  const shouldHideButton = isHomepage && !isSignedIn;
  if (shouldHideButton) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        aria-label="Open PUNT AI assistant"
        className="ai-glow-border fixed bottom-[84px] right-4 z-45 flex items-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink shadow-lift lg:bottom-6 lg:right-6"
      >
        <Sparkles className="size-4 text-primary" />
        PUNT AI
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
            />
            <motion.aside
              role="dialog"
              aria-label="PUNT AI assistant"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-lift"
            >
              <header className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-full bg-ink text-ink-foreground">
                    <Sparkles className="size-4 text-primary" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-extrabold uppercase tracking-wide">
                      PUNT AI
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sports intelligence · Puntr data first
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  className="grid size-8 place-items-center rounded-full hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </header>

              <div
                className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
                role="log"
                aria-live="polite"
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {message.mode && (
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {message.mode === "live_web" ? "Live web research" : "Puntr verified data"}
                        {message.creditsCharged ? ` · ${message.creditsCharged} credits` : ""}
                      </p>
                    )}
                    {message.notice && (
                      <p className="mb-2 rounded-lg border border-border bg-background/70 px-2.5 py-2 text-xs text-muted-foreground">
                        {message.notice}
                      </p>
                    )}
                    <div className="whitespace-pre-wrap">{message.text}</div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 border-t border-border/70 pt-2">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source) => (
                            <a
                              key={source.url}
                              href={source.url}
                              target={source.url.startsWith("http") ? "_blank" : undefined}
                              rel={
                                source.url.startsWith("http") ? "noopener noreferrer" : undefined
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary"
                            >
                              {source.title}
                              {source.url.startsWith("http") && <ExternalLink className="size-3" />}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex w-16 items-center justify-center gap-1 rounded-2xl bg-muted py-3">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
                        className="size-1.5 rounded-full bg-muted-foreground"
                      />
                    ))}
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-border px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => void send(suggestion)}
                      disabled={typing}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send(input);
                  }}
                  className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-4 pr-1.5"
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask PUNT AI anything…"
                    aria-label="Message PUNT AI"
                    maxLength={1_000}
                    disabled={typing}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={typing || !input.trim()}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
                <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
                  18+ only. No prediction is guaranteed. Never chase losses. Gambling support: 0800
                  006 008.
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
