import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, FileText, Sparkles, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tools")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/tools" }],
    meta: [
      { title: "Sports Tools | Puntr" },
      { name: "description", content: "Explore upcoming Puntr tools: a free Betting Slip Converter, AI Edge Finder summary cards and Punt AI v1.0." },
    ],
  }),
  component: ToolsPage,
});

const TOOLS = [
  {
    icon: FileText,
    name: "Betting Slip Converter",
    access: "Free",
    status: "Coming soon",
    description: "Convert supported bookmaker slip formats into a cleaner, easier-to-read format. Designed as a convenience tool, not a way to place bets.",
    paid: false,
  },
  {
    icon: Sparkles,
    name: 'AI "Edge Finder" Summary Cards',
    access: "Puntr Pro",
    status: "Paid feature",
    description: "Concise, data-led match summary cards that surface relevant form, context and statistical signals. They are decision-support summaries, not guarantees or instructions to wager.",
    paid: true,
  },
  {
    icon: Bot,
    name: "Punt AI v1.0 Chatbot",
    access: "Puntr Pro",
    status: "Paid feature",
    description: "An AI sports assistant for exploring match context, asking questions about available data and understanding the numbers behind a fixture.",
    paid: true,
  },
] as const;

function ToolsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 border border-primary/30 bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Wrench className="size-3.5" /> Puntr toolkit
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">Practical tools. <span className="text-primary">Sharper insight.</span></h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">A growing toolkit for South African sports fans who want clearer context and better ways to understand the game. The features below are in development and are not yet available.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {TOOLS.map((tool) => (
            <article key={tool.name} className="card-surface flex h-full flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><tool.icon className="size-5" /></span>
                <span className={tool.paid ? "border border-primary/30 bg-primary-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary" : "border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"}>{tool.access}</span>
              </div>
              <h2 className="mt-5 text-lg font-bold leading-snug">{tool.name}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs font-semibold text-muted-foreground">{tool.status}</span>
                {tool.paid && <span className="text-xs font-bold text-primary">R99 / month</span>}
              </div>
            </article>
          ))}
        </div>
        <section className="mt-7 flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-bold">Go deeper with Puntr Pro</h2>
            <p className="mt-1 text-sm text-muted-foreground">These optional tools are planned for Puntr Pro at R99 per month. Core community features remain free.</p>
          </div>
          <Button asChild className="shrink-0"><Link to="/pricing">Explore Pro <ArrowRight className="size-4" /></Link></Button>
        </section>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Tools provide information and context for general use. AI-generated content may be incomplete or inaccurate; check important details independently. Nothing on Puntr guarantees an outcome or constitutes financial advice. 18+ only. Gamble responsibly.</p>
      </div>
    </AppShell>
  );
}
