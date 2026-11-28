import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BadgeCheck, Gift, Handshake, Megaphone, Users } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RgNotice } from "@/components/rg-notice";
import { submitForm } from "@/lib/forms.functions";

export const Route = createFileRoute("/brand-ambassadors")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/brand-ambassadors" }],
    meta: [
      { title: "Brand Ambassadors | Puntr" },
      {
        name: "description",
        content:
          "Represent Puntr as a creator, influencer, tipster or community voice. Discover the ambassador assessment process and programme benefits.",
      },
    ],
  }),
  component: BrandAmbassadorsPage,
});

const requirements = [
  "Be at least 18 years old and based in a market where the programme is approved.",
  "Have an authentic audience or credible contribution to sports, content or community culture.",
  "Communicate responsibly. No guaranteed-win claims, misleading performance claims or pressure to gamble.",
  "Be willing to disclose sponsored content and follow Puntr brand and responsible-play guidelines.",
];

type Application = {
  name: string;
  email: string;
  location: string;
  role: string;
  platforms: string;
  handles: string;
  audience: string;
  examples: string;
  focus: string;
  availability: string;
  motivation: string;
  ageConfirmed: boolean;
  responsibleConfirmed: boolean;
  privacyConfirmed: boolean;
};

const EMPTY_APPLICATION: Application = {
  name: "",
  email: "",
  location: "",
  role: "",
  platforms: "",
  handles: "",
  audience: "",
  examples: "",
  focus: "",
  availability: "",
  motivation: "",
  ageConfirmed: false,
  responsibleConfirmed: false,
  privacyConfirmed: false,
};

const fieldClass =
  "mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const textAreaClass =
  "mt-1.5 min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function AmbassadorApplicationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [application, setApplication] = useState<Application>(EMPTY_APPLICATION);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deliveryIssue, setDeliveryIssue] = useState(false);

  const update = <K extends keyof Application>(key: K, value: Application[K]) => {
    setApplication((current) => ({ ...current, [key]: value }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!application.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) {
        setError("Add your name and a valid email address to continue.");
        return false;
      }
      if (!application.location.trim() || !application.ageConfirmed) {
        setError("Add your location and confirm that you are 18 or older.");
        return false;
      }
    }
    if (
      step === 1 &&
      (!application.role || !application.platforms.trim() || !application.handles.trim())
    ) {
      setError("Tell us what you do, which platforms you use and where we can find you.");
      return false;
    }
    if (step === 2 && !application.examples.trim()) {
      setError("Add at least one link to an example of your work.");
      return false;
    }
    if (
      step === 3 &&
      (application.motivation.trim().length < 40 || !application.responsibleConfirmed)
    ) {
      setError(
        "Tell us a little more about why you want to join (at least 40 characters) and confirm the responsible-play commitment.",
      );
      return false;
    }
    setError("");
    return true;
  };

  const next = () => {
    if (validateStep()) setStep((current) => Math.min(4, current + 1));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!application.privacyConfirmed) {
      setError("Please acknowledge the privacy notice before submitting.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const result = await submitForm({
        data: {
          form: "other",
          name: application.name.trim(),
          email: application.email.trim(),
          message: application.motivation.trim(),
          meta: {
            application_type: "brand_ambassador",
            location: application.location.trim(),
            role: application.role,
            platforms: application.platforms.trim(),
            social_handles_and_links: application.handles.trim(),
            audience_size: application.audience.trim() || "Not supplied",
            content_examples: application.examples.trim(),
            sports_and_content_focus: application.focus.trim() || "Not supplied",
            availability: application.availability || "To be discussed",
            age_confirmed: "18+",
            responsible_play_commitment: "Confirmed",
            privacy_notice_acknowledged: "Confirmed",
          },
        },
      });
      if (!result.ok) {
        setError(
          result.error === "rate_limited"
            ? "We have received several submissions from this email recently. Please try again later."
            : "We could not save your application. Please try again in a moment.",
        );
        return;
      }
      setDeliveryIssue(result.emailSent === false);
      setSubmitted(true);
    } catch {
      setError("We could not submit your application just now. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const close = (value: boolean) => {
    if (!value && !sending) onOpenChange(false);
  };

  const steps = ["About you", "Your audience", "Your work", "Your approach", "Review"];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] max-w-2xl gap-0 overflow-y-auto rounded-2xl border-border bg-background p-0 sm:max-h-[90dvh]">
        {submitted ? (
          <div className="p-6 sm:p-9">
            <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
              <BadgeCheck className="size-6" />
            </div>
            <DialogHeader className="mt-5 text-left">
              <DialogTitle className="text-2xl">Application received</DialogTitle>
              <DialogDescription className="mt-2 leading-relaxed">
                {deliveryIssue
                  ? "Your application has been saved, but our email provider did not confirm delivery to the partners inbox. Please send us a copy directly using the email link below."
                  : "Your application has been sent to the Puntr partnerships team. We will review your details and contact you if there is a potential fit."}
              </DialogDescription>
            </DialogHeader>
            {deliveryIssue && (
              <a
                className="mt-4 inline-flex font-semibold text-primary underline underline-offset-4"
                href="mailto:partners@puntr.co.za?subject=PUNTR%20Brand%20Ambassador%20Application"
              >
                Email partners@puntr.co.za
              </a>
            )}
            <div className="mt-7 flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-6 pb-5 pt-7 sm:px-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
                Puntr Brand Ambassador Programme
              </p>
              <DialogHeader className="mt-2 text-left">
                <DialogTitle className="text-2xl sm:text-3xl">Let’s get to know you.</DialogTitle>
                <DialogDescription className="mt-2 max-w-xl leading-relaxed">
                  A few quick steps. Your application goes directly to partners@puntr.co.za.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-foreground">
                  Step {step + 1} of {steps.length} · {steps[step]}
                </span>
                <span className="font-semibold tabular-nums text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Application progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <form onSubmit={submit} className="px-6 py-6 sm:px-8 sm:py-8">
              <div
                key={step}
                className="min-h-[260px] animate-in fade-in slide-in-from-right-3 duration-300"
              >
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-extrabold">First, the basics.</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        How can the partnerships team reach you?
                      </p>
                    </div>
                    <label className="block text-sm font-semibold">
                      Full name
                      <input
                        className={fieldClass}
                        autoComplete="name"
                        value={application.name}
                        onChange={(e) => update("name", e.target.value)}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Email address
                      <input
                        className={fieldClass}
                        type="email"
                        autoComplete="email"
                        value={application.email}
                        onChange={(e) => update("email", e.target.value)}
                        maxLength={254}
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      City and country
                      <input
                        className={fieldClass}
                        autoComplete="country-name"
                        placeholder="e.g. Johannesburg, South Africa"
                        value={application.location}
                        onChange={(e) => update("location", e.target.value)}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="flex items-start gap-3 text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={application.ageConfirmed}
                        onChange={(e) => update("ageConfirmed", e.target.checked)}
                      />
                      <span>I confirm that I am at least 18 years old.</span>
                    </label>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-extrabold">Where do you show up?</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tell us about your audience and the communities you reach.
                      </p>
                    </div>
                    <label className="block text-sm font-semibold">
                      Which best describes you?
                      <select
                        className={fieldClass}
                        value={application.role}
                        onChange={(e) => update("role", e.target.value)}
                        required
                      >
                        <option value="">Choose your role</option>
                        <option>Influencer</option>
                        <option>Content creator</option>
                        <option>Tipster / sports analyst</option>
                        <option>Sports community organiser</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label className="block text-sm font-semibold">
                      Main platforms
                      <input
                        className={fieldClass}
                        placeholder="e.g. TikTok, YouTube, Instagram, X, Twitch"
                        value={application.platforms}
                        onChange={(e) => update("platforms", e.target.value)}
                        maxLength={240}
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Your handles and profile links
                      <textarea
                        className={textAreaClass}
                        placeholder="Paste your public profile links or usernames"
                        value={application.handles}
                        onChange={(e) => update("handles", e.target.value)}
                        maxLength={300}
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Approximate audience size{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                      <input
                        className={fieldClass}
                        placeholder="Across your main platforms"
                        value={application.audience}
                        onChange={(e) => update("audience", e.target.value)}
                        maxLength={120}
                      />
                    </label>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-extrabold">Show us what you make.</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Links are perfect. No uploads needed.
                      </p>
                    </div>
                    <label className="block text-sm font-semibold">
                      Examples of your content or work
                      <textarea
                        className={textAreaClass}
                        placeholder="Share one to three links to posts, videos, analysis or community projects"
                        value={application.examples}
                        onChange={(e) => update("examples", e.target.value)}
                        maxLength={300}
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Sports, leagues or content themes you focus on{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                      <textarea
                        className={textAreaClass}
                        placeholder="e.g. PSL, Premier League, football analysis, sports culture"
                        value={application.focus}
                        onChange={(e) => update("focus", e.target.value)}
                        maxLength={300}
                      />
                    </label>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-extrabold">
                        What would building with Puntr look like?
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        We value consistency, credibility and responsible communication.
                      </p>
                    </div>
                    <label className="block text-sm font-semibold">
                      Why do you want to represent Puntr?
                      <textarea
                        className={textAreaClass}
                        placeholder="Tell us what you would bring to the community and the kind of content or activations you would like to create."
                        value={application.motivation}
                        onChange={(e) => update("motivation", e.target.value)}
                        maxLength={3000}
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Availability
                      <select
                        className={fieldClass}
                        value={application.availability}
                        onChange={(e) => update("availability", e.target.value)}
                      >
                        <option value="">Choose an option</option>
                        <option>Flexible / project-based</option>
                        <option>Part-time ongoing</option>
                        <option>Full-time collaboration</option>
                        <option>To be discussed</option>
                      </select>
                    </label>
                    <label className="flex items-start gap-3 text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={application.responsibleConfirmed}
                        onChange={(e) => update("responsibleConfirmed", e.target.checked)}
                      />
                      <span>
                        I agree to follow Puntr’s responsible-play and advertising standards. I will
                        not make guaranteed-win claims, promote chasing losses or pressure anyone to
                        gamble.
                      </span>
                    </label>
                  </div>
                )}
                {step === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-extrabold">Ready to send?</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Check your details. The partnerships team will use them to assess your
                        application and contact you.
                      </p>
                    </div>
                    <dl className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">Name</dt>
                        <dd className="mt-1 break-words font-semibold">{application.name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Email</dt>
                        <dd className="mt-1 break-words font-semibold">{application.email}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Location</dt>
                        <dd className="mt-1 break-words font-semibold">{application.location}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Role</dt>
                        <dd className="mt-1 break-words font-semibold">{application.role}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">Platforms and profiles</dt>
                        <dd className="mt-1 break-words font-semibold">
                          {application.platforms} · {application.handles}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">Work examples</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words font-semibold">
                          {application.examples}
                        </dd>
                      </div>
                    </dl>
                    <label className="flex items-start gap-3 text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={application.privacyConfirmed}
                        onChange={(e) => update("privacyConfirmed", e.target.checked)}
                      />
                      <span>
                        I have read the{" "}
                        <Link
                          to="/privacy"
                          className="font-semibold text-primary underline underline-offset-4"
                        >
                          Privacy Notice
                        </Link>{" "}
                        and understand that Puntr will use these details to review my application
                        and contact me about the programme.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {error && (
                <p
                  className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setError("");
                    setStep((current) => Math.max(0, current - 1));
                  }}
                  disabled={step === 0 || sending}
                >
                  <ArrowLeft className="mr-1 size-4" /> Back
                </Button>
                {step < 4 ? (
                  <Button type="button" onClick={next}>
                    Continue <ArrowRight className="ml-1 size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={sending || !application.privacyConfirmed}>
                    {sending ? "Sending…" : "Submit application"}{" "}
                    <ArrowRight className="ml-1 size-4" />
                  </Button>
                )}
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BrandAmbassadorsPage() {
  const [applicationOpen, setApplicationOpen] = useState(false);
  return (
    <AppShell>
      <PageHeading
        art="ambassadors"
        title="Represent the game. Build with Puntr."
        subtitle="The Puntr Brand Ambassador Programme is for creators, influencers, tipsters and community builders who want to help shape a more accountable sports culture."
      />
      <div className="mx-auto max-w-5xl space-y-7">
        <section className="relative overflow-hidden border border-primary/30 bg-card p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-primary/10 blur-3xl" />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            Puntr community partners
          </p>
          <h2 className="relative mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
            Your voice. Your community. A bigger game.
          </h2>
          <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            We are building a network of people who can introduce Puntr to the right audiences,
            create useful sports content and help grow a community built around transparent,
            timestamped predictions.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setApplicationOpen(true)}>
              Start Your Application <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/how-it-works">See how Puntr works</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Users,
              title: "Influencers",
              body: "Creators with an engaged audience and a genuine connection to sport.",
            },
            {
              icon: Megaphone,
              title: "Content creators",
              body: "Video makers, publishers, streamers and social-first storytellers.",
            },
            {
              icon: BadgeCheck,
              title: "Tipsters",
              body: "Sports analysts who value transparent records over unverified claims.",
            },
            {
              icon: Handshake,
              title: "Community voices",
              body: "Organisers, fans and connectors who bring people together.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <article key={title} className="card-surface p-5">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">What selected ambassadors can receive</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The programme is designed around a mix of predictable collaboration and measurable
            outcomes. Benefits are agreed individually and are subject to selection, campaign scope
            and a written agreement.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              [
                "Fixed monthly retainer",
                "A fixed monthly fee for ambassadors who complete the qualification process and agree to an ongoing scope of work.",
              ],
              [
                "Performance-based rewards",
                "Additional bonuses and commissions linked to agreed campaign outcomes and eligible referrals.",
              ],
              [
                "Vouchers and merchandise",
                "Free vouchers, Puntr merchandise and community drops where available.",
              ],
              [
                "Partner-sponsored campaigns",
                "Sponsored giveaways and activations supported by Puntr affiliates and commercial partners.",
              ],
            ].map(([title, body]) => (
              <div key={title} className="border border-border p-4">
                <Gift className="size-5 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">A 30–45 day qualification period</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Applications are reviewed first. Shortlisted candidates then enter a 30–45 day
            assessment period so we can evaluate consistency, content quality, audience fit,
            engagement, professionalism and responsible brand conduct.
          </p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [
                "01",
                "Apply",
                "Share your platforms, audience profile, content examples and why you want to work with Puntr.",
              ],
              [
                "02",
                "Demonstrate",
                "Create or participate in agreed trial activity during the assessment period.",
              ],
              [
                "03",
                "Get selected",
                "Successful candidates may receive an ambassador offer with a defined retainer, deliverables and performance terms.",
              ],
            ].map(([number, title, body]) => (
              <li key={number} className="border border-border p-4">
                <span className="font-display text-2xl font-black text-primary">{number}</span>
                <h3 className="mt-2 font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">Who we are looking for</h2>
          <ul className="mt-4 space-y-3">
            {requirements.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Applying does not guarantee selection, a retainer, commission or rewards. Retainers,
            deliverables, payment terms, commission eligibility and campaign benefits are confirmed
            in writing for each selected ambassador. Any referral commission is governed by the
            separate approved referral or affiliate agreement.
          </p>
        </section>

        <section className="border border-border bg-primary-soft/40 p-6 text-center sm:p-8">
          <h2 className="text-2xl font-black">Ready to build with Puntr?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Tell us what you create, who you reach and why you want to be part of the community. We
            will review your application and respond if there is a fit.
          </p>
          <Button size="lg" className="mt-5" onClick={() => setApplicationOpen(true)}>
            Start Your Application <ArrowRight className="ml-2 size-4" />
          </Button>
        </section>
        <RgNotice variant="compact" />
      </div>
      <AmbassadorApplicationDialog open={applicationOpen} onOpenChange={setApplicationOpen} />
    </AppShell>
  );
}
