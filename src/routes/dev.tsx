import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, GitBranch, Zap, Shield, CheckCircle2, FileCode } from "lucide-react";

export const Route = createFileRoute("/dev")({
  head: () => ({
    meta: [
      { title: "Development Process | Puntr" },
      {
        name: "description",
        content: "Platform development process and guidelines for the Puntr team.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Development Process | Puntr" },
      {
        property: "og:description",
        content: "Platform development process and guidelines for the Puntr team.",
      },
    ],
  }),
  component: DevelopmentProcess,
});

function DevelopmentProcess() {
  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-xl bg-primary-soft">
          <Code className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-[clamp(2rem,4.5vw,2.7rem)] leading-tight">
            Platform <span className="text-primary">Development Process</span>
          </h1>
          <Badge variant="secondary" className="mt-1">Internal Documentation</Badge>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        This page outlines our development workflow, coding standards, and deployment processes for the Puntr platform.
      </p>

      {/* Development Workflow */}
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2">
          <GitBranch className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Development Workflow</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Branch Strategy</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span><code className="rounded bg-muted px-1.5 py-0.5 text-xs">main</code> - Production branch, always stable and deployable</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span><code className="rounded bg-muted px-1.5 py-0.5 text-xs">develop</code> - Integration branch for features</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span><code className="rounded bg-muted px-1.5 py-0.5 text-xs">feature/*</code> - New features and enhancements</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span><code className="rounded bg-muted px-1.5 py-0.5 text-xs">hotfix/*</code> - Critical production fixes</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Code Standards */}
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2">
          <FileCode className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Code Standards</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">TypeScript & React</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Use TypeScript for type safety across all components</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Follow React hooks best practices and avoid unnecessary re-renders</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Ensure proper error boundaries and loading states</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Use ESLint and Prettier for consistent code formatting</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Deployment */}
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Deployment Process</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>Our deployment pipeline follows a continuous integration approach:</p>
          <ol className="mt-2 space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">1</span>
              <span>All code must pass automated tests and linting checks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">2</span>
              <span>Pull requests require at least one code review approval</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">3</span>
              <span>Merge to develop triggers staging deployment for testing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">4</span>
              <span>Production deployments from main branch are automated via CI/CD</span>
            </li>
          </ol>
        </div>
      </Card>

      <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <Shield className="mb-2 size-5 text-primary" />
        <strong>Note:</strong> This page is for internal team use only and is not indexed by search engines.
      </div>
    </AppShell>
  );
}
