import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ExternalLink, HeartHandshake, Phone, ShieldCheck } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/components/rg-notice";

export const Route = createFileRoute("/responsible-play")({
  head: () => {
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/responsible-play" }],
      meta: [
        { title: "Responsible Play | Puntr" },
        { name: "description", content: "Practical safer-gambling guidance, self-exclusion information and confidential support resources for South Africans." },
        { name: "robots", content: "index, follow" },
      ],
    };
  },
  component: ResponsiblePlayPage,
});

function ResourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4">
      {children}<ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

function ResponsiblePlayPage() {
  return (
    <AppShell showAffiliateBanner={false}>
      <PageHeading art="responsible" title="Responsible Play" subtitle="Keep sport enjoyable. Stay informed, stay in control, and know where to turn for support." />
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="card-surface border-primary/40 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-6 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">18+ only · Your wellbeing comes first</p>
              <h2 className="mt-2 text-2xl font-bold">Gambling is never a way to make money.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Betting should never come before your health, relationships, work or financial responsibilities. Never stake money you need for essentials, never borrow to gamble and never chase losses. If gambling stops being enjoyable, take a break and speak to someone.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2" aria-label="Safer play habits">
          <article className="card-surface p-5">
            <h2 className="text-lg font-bold">Set limits before you start</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Decide in advance how much time and money you can afford to spend.</li>
              <li>Stick to your limits. Do not increase them to recover losses.</li>
              <li>Take regular breaks and keep betting separate from everyday finances.</li>
              <li>Do not gamble when distressed, under the influence or trying to solve a money problem.</li>
            </ul>
          </article>
          <article className="card-surface p-5">
            <h2 className="text-lg font-bold">Know when to step back</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Warning signs can include spending more time or money than planned, hiding gambling, borrowing, chasing losses, feeling anxious when not gambling, or seeing gambling affect work and relationships.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You do not need to wait until things feel out of control before asking for help.
            </p>
          </article>
        </section>

        <section className="card-surface p-5 sm:p-7" aria-labelledby="self-exclusion-title">
          <div className="flex items-start gap-3">
            <HeartHandshake className="mt-1 size-6 shrink-0 text-primary" />
            <div>
              <h2 id="self-exclusion-title" className="text-xl font-bold">Taking a break or self-excluding</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                If you want to stop gambling, contact the bookmaker or gambling operator directly and ask its security or responsible-gambling team for its self-exclusion process and forms. The operator submits the completed request to the relevant Provincial Licensing Authority and the National Gambling Board for record-keeping.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The National Gambling Board describes a minimum six-month exclusion period. Upliftment is not automatic after six months and involves counselling requirements. Ask the relevant operator and licensing authority for the current process that applies to you.
              </p>
              <p className="mt-3 text-sm">
                <ResourceLink href="https://www.ngb.org.za/stakeholder-information/national-responsible-gambling-programme/">Read the National Gambling Board’s self-exclusion guidance</ResourceLink>
              </p>
            </div>
          </div>
        </section>

        <section className="card-surface p-5 sm:p-7" aria-labelledby="support-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Free · Confidential · 24 hours a day</p>
              <h2 id="support-title" className="mt-2 text-2xl font-bold">Talk to someone. You are not on your own.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                The South African Responsible Gambling Foundation provides free, confidential counselling, assessment and referrals to treatment.
              </p>
            </div>
            <Phone className="size-8 shrink-0 text-primary" />
          </div>
          <a href={HELPLINE_TEL} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-lg font-extrabold text-primary-foreground">
            <Phone className="size-4" /> {HELPLINE_DISPLAY}
          </a>
          <p className="mt-3 text-sm text-muted-foreground">WhatsApp: <a className="font-semibold text-foreground underline" href="https://wa.me/27766750710" target="_blank" rel="noreferrer">076 675 0710</a></p>
          <p className="mt-2 text-sm"><ResourceLink href="https://responsiblegambling.org.za/">Visit the South African Responsible Gambling Foundation</ResourceLink></p>
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">Where Puntr fits in</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Puntr is a sports prediction, insights and community platform. We do not accept bets, set bookmaker odds, hold betting funds or operate as a bookmaker. Our bookmaker directory and any affiliate links lead to independent third-party businesses. If you choose to bet, use only an operator whose relevant licence and online betting authorisation you have checked with the appropriate regulator.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Commercial relationships do not influence Puntr prediction records, grading, rankings or editorial decisions. Partner links and sponsored placements are identified in line with our <a href="/affiliate-disclosure" className="font-semibold text-primary underline underline-offset-4">Affiliate Disclosure</a>.
          </p>
        </section>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Puntr is not a counselling service or a substitute for professional support. If you or someone else is in immediate danger, contact local emergency services.
        </p>
      </div>
    </AppShell>
  );
}
