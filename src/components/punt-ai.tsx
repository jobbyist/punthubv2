import { AnimatePresence, motion } from "motion/react";
import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/components/session";

type Msg = { role: "user" | "ai"; text: string };

const suggestions = [
  "Analyse Pirates vs Chiefs",
  "Find today's value bets",
  "Build me a 3-fold acca",
  "How should I manage my bankroll?",
];

const canned =
  "Here's my read: Orlando Pirates have won 4 of their last 5 at home and concede under 1.0 goals per match, which supports the 1X market at 1.62. Kaizer Chiefs' xG away sits at 0.94 — modest. My model gives Pirates a 61% win probability, so there's small positive value.\n\nRemember: no bet is a sure thing. Stake only what you can afford to lose, never chase losses, and take a break if it stops being fun. Support: 0800 006 008.";

export function PuntAI() {
  const { openEarlyAccess } = useSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi 👋 I'm PUNT AI. Ask me about matches, value bets, odds movement or bankroll strategy." },
  ]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTyping(true);
    let i = 0;
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { role: "ai", text: "" }]);
      const timer = setInterval(() => {
        i += 6;
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "ai", text: canned.slice(0, i) };
          return next;
        });
        if (i >= canned.length) clearInterval(timer);
      }, 16);
    }, 700);
  }

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
        Punt AI
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
                    <p className="font-display text-sm font-extrabold uppercase tracking-wide">Punt AI</p>
                    <p className="text-xs text-muted-foreground">Your betting assistant</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close assistant" className="grid size-8 place-items-center rounded-full hover:bg-muted">
                  <X className="size-4" />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {typing && (
                  <div className="flex w-16 items-center justify-center gap-1 rounded-2xl bg-muted py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                        className="size-1.5 rounded-full bg-muted-foreground"
                      />
                    ))}
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-border px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-4 pr-1.5"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask PUNT AI anything…"
                    aria-label="Message PUNT AI"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button type="submit" aria-label="Send" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Send className="size-4" />
                  </button>
                </form>
                <button
                  onClick={() => openEarlyAccess("PUNT AI is included with PuntHub AI — join the beta for early access.")}
                  className="mt-3 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Preview mode · unlock full AI with PuntHub AI (R249/month)
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
