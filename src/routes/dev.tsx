import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, LogOut } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import blueprintCss from "../styles/dev-blueprint.css?url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { devSignIn, devSignOut, getDevPage } from "@/lib/dev-gate.functions";

/**
 * /dev: the MVP blueprint, for the Puntr team only. Internal and English-only by design
 * (excluded from i18n:check). Not in the sitemap or any nav; robots.txt disallows it;
 * noindex in the head and the X-Robots-Tag header. The document is decrypted on the server
 * only after the gate email + password are entered (see src/lib/dev-gate.server.ts).
 */
export const Route = createFileRoute("/dev")({
  loader: () => getDevPage(),
  staleTime: 0,
  head: () => ({
    meta: [
      { title: "Puntr · Dev" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "stylesheet", href: blueprintCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: DevPage,
});

function DevPage() {
  const page = Route.useLoaderData();
  if (page.status === "locked") return <Gate />;
  return <Blueprint html={page.html} builtAt={page.builtAt} />;
}

function Gate() {
  const router = useRouter();
  const signIn = useServerFn(devSignIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signIn({ data: { email, password } });
      if (res.ok) {
        setPassword("");
        await router.invalidate();
      } else if (res.reason === "limited") {
        setError("Too many attempts. Wait 10 minutes and try again.");
      } else if (res.reason === "busy") {
        setError("The server is busy. Try again in a few seconds.");
      } else {
        setError("That email and password don't match. Try again.");
      }
    } catch {
      setError("Enter a valid email address and your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[420px] items-center px-4 py-16">
      <form onSubmit={onSubmit} className="card-surface w-full space-y-5 p-6 sm:p-8" noValidate>
        <div className="space-y-2">
          <span className="grid size-10 place-items-center bg-primary/10 text-primary">
            <Lock className="size-5" aria-hidden />
          </span>
          <h1 className="text-2xl">Team access</h1>
          <p className="text-sm text-muted-foreground">
            This area is for the Puntr team. Sign in with the team email and password.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dev-email">Email</Label>
          <Input
            id="dev-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dev-password">Password</Label>
          <Input
            id="dev-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>
          {busy ? "Checking…" : "Open"}
        </Button>
      </form>
    </div>
  );
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error("clipboard unavailable"));
}

function selectNode(el: Element) {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {
    /* ignore */
  }
}

function Blueprint({ html, builtAt }: { html: string; builtAt: string }) {
  const router = useRouter();
  const signOut = useServerFn(devSignOut);
  const ref = useRef<HTMLDivElement>(null);

  // The blueprint's own behaviour, rebuilt in React: copy buttons, "Show full prompt", copy all.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
    const on = (el: Element, fn: () => void) => {
      el.addEventListener("click", fn);
      cleanups.push(() => el.removeEventListener("click", fn));
    };
    const flash = (btn: HTMLElement, text: string) => {
      const old = btn.textContent;
      btn.textContent = text;
      btn.classList.add("done");
      window.setTimeout(() => {
        btn.textContent = old;
        btn.classList.remove("done");
      }, 1600);
    };

    root.querySelectorAll<HTMLElement>(".copy").forEach((btn) => {
      on(btn, () => {
        const pre = root.querySelector(`#${CSS.escape(btn.dataset["target"] ?? "")}`);
        if (!pre) return;
        copyText(pre.textContent ?? "").then(
          () => flash(btn, "Copied"),
          () => {
            pre.classList.add("open");
            selectNode(pre);
            flash(btn, "Selected");
          },
        );
      });
    });

    root.querySelectorAll<HTMLElement>(".pcard pre").forEach((pre) => {
      if (pre.scrollHeight <= pre.clientHeight + 4) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "expand";
      b.textContent = "Show full prompt";
      on(b, () => {
        const open = pre.classList.toggle("open");
        b.textContent = open ? "Collapse" : "Show full prompt";
      });
      pre.insertAdjacentElement("afterend", b);
      cleanups.push(() => b.remove());
    });

    const all = root.querySelector("#copyall");
    const msg = root.querySelector("#copyall-msg");
    if (all) {
      on(all, () => {
        const parts: string[] = [];
        root.querySelectorAll("#prompts .pcard:not(.later)").forEach((card) => {
          parts.push(
            `=== ${card.querySelector(".pid")?.textContent ?? ""} · ${
              card.querySelector("h3")?.textContent ?? ""
            } ===\n${card.querySelector("pre")?.textContent ?? ""}`,
          );
        });
        copyText(parts.join("\n\n")).then(
          () => {
            if (msg) msg.textContent = `Copied ${parts.length} prompts.`;
          },
          () => {
            if (msg)
              msg.textContent = "Your browser blocked copying. Use each prompt's Copy button.";
          },
        );
      });
    }
    return () => cleanups.forEach((fn) => fn());
  }, [html]);

  async function onSignOut() {
    await signOut();
    await router.invalidate();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2 text-xs text-muted-foreground sm:px-6">
        <span>
          Team only · do not share · built{" "}
          {new Date(builtAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
        </span>
        <Button variant="ghost" size="sm" onClick={onSignOut}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
      <div ref={ref} className="bp" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
