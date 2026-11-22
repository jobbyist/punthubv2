import { useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Headphones,
  ListMusic,
  Pause,
  Play,
  Radio,
  Volume2,
  X,
} from "lucide-react";
import { subscribeToPodcastPremiere } from "@/lib/podcast-notifications.functions";
import { useSession } from "@/components/session";

export const GOOD_SPORT_EPISODES = [
  {
    number: "01",
    title: "The game before the game",
    description:
      "A season opener on the culture, the numbers and the decisions that shape how we watch sport.",
    date: "1 December 2026",
    status: "Premiere",
  },
  {
    number: "02",
    title: "The odds are never the whole story",
    description: "Reading the market without letting the market do all the thinking.",
    date: "Coming soon",
    status: "Upcoming",
  },
  {
    number: "03",
    title: "Fandom, form and a little bit of faith",
    description: "Why supporters believe, what the data says and where the two meet.",
    date: "Coming soon",
    status: "Upcoming",
  },
  {
    number: "04",
    title: "The beautiful game, behind the numbers",
    description: "The stats, stories and people that make matchday matter.",
    date: "Coming soon",
    status: "Upcoming",
  },
  {
    number: "05",
    title: "Play the game. Keep your head.",
    description: "A candid conversation about smarter sports engagement and responsible play.",
    date: "Coming soon",
    status: "Upcoming",
  },
] as const;
const YOUTUBE_URL =
  (import.meta.env["VITE_PUNTR_YOUTUBE_URL"] as string | undefined) ||
  "https://youtube.com/@puntr_za?si=URxhuKhi1Yl82gqh";
const AUDIO_URL = import.meta.env["VITE_GOOD_SPORT_EPISODE_01_AUDIO_URL"] as string | undefined;
const COVER_URL = import.meta.env["VITE_GOOD_SPORT_COVER_ART_URL"] as string | undefined;
const PREMIERE_AT = Date.parse("2026-12-01T07:00:00Z");
const premiereUpcoming = () => Date.now() < PREMIERE_AT;

function CoverArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative isolate grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[#101410] ${compact ? "max-w-[112px]" : "max-w-[270px]"}`}
    >
      {COVER_URL ? (
        <img
          src={COVER_URL}
          alt="The Good Sport official podcast cover art"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <>
          <div className="absolute -right-12 -top-12 size-48 rounded-full bg-[#16A34A]/30 blur-3xl" />
          <div className="absolute -bottom-12 -left-10 size-44 rounded-full bg-[#16A34A]/20 blur-3xl" />
          <div className="relative px-4 text-center">
            <span className="text-[9px] font-black uppercase tracking-[.25em] text-[#4ADE80]">
              PUNTR PRESENTS
            </span>
            <div
              className={`mt-2 font-display font-black uppercase leading-[.82] tracking-[-.08em] text-white ${compact ? "text-xl" : "text-4xl sm:text-5xl"}`}
            >
              THE
              <br />
              <span className="text-[#4ADE80]">GOOD</span>
              <br />
              SPORT
            </div>
            {!compact && (
              <p className="mt-4 text-[9px] font-semibold uppercase tracking-[.2em] text-white/40">
                Official artwork coming soon
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function EpisodeList({ close }: { close: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-3 sm:items-center"
      onClick={close}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="good-sport-episodes-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#101210] p-5 text-white shadow-2xl sm:p-7"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#4ADE80]">
              Debut season
            </p>
            <h2 id="good-sport-episodes-title" className="mt-1 font-display text-2xl font-black">
              Coming up on The Good Sport
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close episode list"
            className="rounded-full p-2 text-white/60 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <ol className="mt-6 divide-y divide-white/10">
          {GOOD_SPORT_EPISODES.map((ep) => (
            <li key={ep.number} className="flex gap-4 py-4">
              <span className="font-display text-2xl font-black text-[#4ADE80]/75">
                {ep.number}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{ep.title}</h3>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50">
                    {ep.status}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{ep.description}</p>
                <p className="mt-2 text-[11px] font-semibold text-[#4ADE80]">{ep.date}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-white/40">
          Episode titles and dates after the premiere are provisional editorial working titles.
        </p>
      </section>
    </div>
  );
}
function NotifyForm({ close }: { close: () => void }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const result = await subscribeToPodcastPremiere({ data: { email, consent, website } });
      if (result.ok) setSuccess(true);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="good-sport-notify-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101210] p-6 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#4ADE80]">
            Premiere alert
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-full p-2 text-white/60 hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>
        <h2 id="good-sport-notify-title" className="mt-3 font-display text-2xl font-black">
          Be first to press play.
        </h2>
        {success ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[#4ADE80]">
            <Check className="size-4" /> You’re on the premiere notification list.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label htmlFor="good-sport-email" className="block text-sm font-semibold">
              Email address
            </label>
            <input
              id="good-sport-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm outline-none focus:border-[#4ADE80]"
            />
            <label className="flex items-start gap-3 text-xs leading-relaxed text-white/60">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-[#16A34A]"
              />
              Email me once when The Good Sport episode one is released.
            </label>
            <input
              aria-hidden="true"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />
            <button
              type="submit"
              disabled={busy || !consent}
              className="h-12 w-full rounded-xl bg-[#16A34A] px-5 text-sm font-extrabold text-white hover:bg-[#15803D] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Notify me on release"}
            </button>
            {error && (
              <p role="alert" className="text-xs text-red-300">
                We couldn’t save your request. Please try again shortly.
              </p>
            )}
          </form>
        )}
        <p className="mt-4 text-[10px] leading-relaxed text-white/35">
          Your email is used only to fulfil this one-off episode release notification. To withdraw
          before release, contact support@puntr.co.za.
        </p>
      </section>
    </div>
  );
}

function AuthPromptModal({ close }: { close: () => void }) {
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/80 p-4" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="good-sport-auth-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101210] p-6 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#4ADE80]">Members-only listening</span>
          <button type="button" onClick={close} aria-label="Close" className="rounded-full p-2 text-white/60 hover:bg-white/10">
            <X className="size-4" />
          </button>
        </div>
        <h2 id="good-sport-auth-title" className="mt-3 font-display text-2xl font-black">Join the conversation.</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Create a free Puntr account or log in to listen to The Good Sport. The series is open to explore; episode playback is reserved for members.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link to="/join" className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#16A34A] px-4 text-sm font-extrabold text-white hover:bg-[#15803D]">
            Sign up or log in
          </Link>
          <button type="button" onClick={close} className="h-11 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/75 hover:bg-white/10">
            Maybe later
          </button>
        </div>
      </section>
    </div>
  );
}

export function TheGoodSportPromo() {
  const { isSignedIn } = useSession();
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  async function toggle() {
    if (!isSignedIn || !AUDIO_URL || !audio.current) return;
    if (audio.current.paused) await audio.current.play();
    else audio.current.pause();
  }
  if (!isSignedIn) return null;
  return (
    <section className="relative isolate mt-12 overflow-hidden rounded-[2rem] border border-border bg-[#0c100d] p-5 text-white sm:mt-16 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-[#16A34A]/15 blur-3xl" />
      <div className="grid items-center gap-7 md:grid-cols-[minmax(0,1fr)_minmax(250px,340px)]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#4ADE80]">
            <Radio className="size-3.5" /> A Puntr original podcast
          </div>
          <h2 className="mt-3 font-display text-4xl font-black leading-[.92] tracking-[-.06em] sm:text-6xl">
            THE GOOD
            <br />
            <span className="text-[#4ADE80]">SPORT.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Big games. Bigger opinions. Better questions. The Good Sport gets into the stories,
            stats and spirited debates behind the beautiful game — without taking itself too
            seriously.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/the-good-sport"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#16A34A] px-5 text-sm font-extrabold text-white hover:bg-[#15803D]"
            >
              Explore the series <ArrowUpRight className="size-4" />
            </Link>
            {premiereUpcoming() ? (
              <button
                type="button"
                onClick={() => setNotifyOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-bold text-white hover:bg-white/10"
              >
                Get premiere alert
              </button>
            ) : (
              <Link
                to="/the-good-sport/episode-01"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-bold text-white hover:bg-white/10"
              >
                Listen now <ArrowUpRight className="size-4" />
              </Link>
            )}
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">
            Season one · Episode one · 1 December 2026
          </p>
        </div>
        <div className="mx-auto w-full max-w-[340px]">
          <div className="rounded-3xl border border-white/10 bg-white/[.045] p-4 shadow-2xl">
            <div className="flex gap-4">
              <CoverArt compact />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#4ADE80]">
                  Now announced
                </p>
                <h3 className="mt-1 font-display text-lg font-black">The Good Sport</h3>
                <p className="mt-1 text-xs text-white/50">Episode 01 · The game before the game</p>
              </div>
            </div>
            {AUDIO_URL && isSignedIn && (
              <audio
                ref={audio}
                src={AUDIO_URL}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                controls
                className="mt-4 w-full accent-[#16A34A]"
                preload="none"
              />
            )}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void toggle()}
                disabled={!AUDIO_URL && isSignedIn}
                aria-label={playing ? "Pause podcast" : "Play podcast"}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-[#16A34A] text-white disabled:opacity-50"
              >
                {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full w-[8%] rounded-full bg-[#4ADE80] ${playing ? "animate-pulse" : ""}`}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-semibold uppercase tracking-wider text-white/35">
                  <span>{AUDIO_URL ? (isSignedIn ? "Episode preview" : "Sign in to listen") : "Premieres 1 Dec"}</span>
                  <span>—:—</span>
                </div>
              </div>
              <Volume2 className="size-4 text-white/40" />
            </div>
            <button
              type="button"
              onClick={() => setEpisodesOpen(true)}
              className="mt-4 flex w-full items-center justify-between border-t border-white/10 pt-4 text-left text-xs font-bold text-white/75 hover:text-[#4ADE80]"
            >
              <span className="flex items-center gap-2">
                <ListMusic className="size-4" /> Explore season episodes
              </span>
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[9px] font-semibold uppercase tracking-[.16em] text-white/35">
            {YOUTUBE_URL ? (
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#4ADE80] hover:text-white"
              >
                Watch & subscribe on YouTube <ArrowUpRight className="size-3" />
              </a>
            ) : (
              <span>YouTube subscribe link coming soon</span>
            )}
            <span>Extended video editions on the Puntr channel</span>
          </div>
        </div>
      </div>
      {episodesOpen && <EpisodeList close={() => setEpisodesOpen(false)} />}
      {notifyOpen && <NotifyForm close={() => setNotifyOpen(false)} />}
      {authOpen && <AuthPromptModal close={() => setAuthOpen(false)} />}
    </section>
  );
}

export function TheGoodSportPage() {
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_320px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
            Puntr original podcast · Debut season
          </p>
          <h1 className="mt-4 font-display text-5xl font-black leading-[.9] tracking-[-.07em] sm:text-7xl">
            THE GOOD
            <br />
            <span className="text-primary">SPORT.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Big games. Bigger opinions. Better questions. The Good Sport gets into the stories,
            stats and spirited debates behind the beautiful game — with sharp takes, curious minds
            and absolutely no need for a referee.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {premiereUpcoming() ? (
              <button
                type="button"
                onClick={() => setNotifyOpen(true)}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
              >
                Get notified for episode one <ArrowUpRight className="size-4" />
              </button>
            ) : (
              <Link
                to="/the-good-sport/episode-01"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
              >
                Listen to episode one <ArrowUpRight className="size-4" />
              </Link>
            )}
            {YOUTUBE_URL ? (
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-border px-5 text-sm font-bold"
              >
                Watch & subscribe on YouTube <ArrowUpRight className="size-4" />
              </a>
            ) : (
              <span className="inline-flex h-12 items-center rounded-xl border border-border px-5 text-xs text-muted-foreground">
                YouTube channel link coming soon
              </span>
            )}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Episode 01 premieres Tuesday, 1 December 2026
          </p>
        </div>
        <CoverArt />
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-[1.1fr_.9fr]">
        <section className="card-surface p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">
            The debut season
          </p>
          <h2 className="mt-2 font-display text-3xl font-black">
            Good conversation. No bad takes left unchallenged.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A mix of matchday culture, sports data, fan perspective and responsible conversations
            about the game. The episode slate below is a working editorial lineup.
          </p>
          <button
            type="button"
            onClick={() => setEpisodesOpen(true)}
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            View all upcoming episodes <ListMusic className="size-4" />
          </button>
        </section>
        <section className="card-surface p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">
            Watch the extended cut
          </p>
          <h2 className="mt-2 font-display text-3xl font-black">More than the highlights.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every episode gets an extended video edition on the Puntr YouTube channel, with the full
            conversations and extra moments.
          </p>
          {YOUTUBE_URL ? (
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary"
            >
              Subscribe to Puntr on YouTube <ArrowUpRight className="size-4" />
            </a>
          ) : (
            <p className="mt-5 text-xs text-muted-foreground">
              Channel URL will be connected before premiere.
            </p>
          )}
        </section>
      </div>
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">First up</p>
            <h2 className="mt-2 font-display text-3xl font-black">Episode 01</h2>
          </div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            1 December 2026
          </span>
        </div>
        <div className="card-surface mt-5 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Headphones className="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-black">The game before the game</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A season opener on the culture, the numbers and the decisions that shape how we watch
              sport.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Audio and official cover art will appear here ahead of release.
            </p>
          </div>
          <Link
            to="/the-good-sport/episode-01"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            Episode details <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
      {episodesOpen && <EpisodeList close={() => setEpisodesOpen(false)} />}
      {notifyOpen && <NotifyForm close={() => setNotifyOpen(false)} />}
    </main>
  );
}

export function TheGoodSportEpisodePage() {
  const { isSignedIn } = useSession();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <Link to="/the-good-sport" className="text-sm font-semibold text-primary">
        ← The Good Sport
      </Link>
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">
            Season 01 · Episode 01
          </p>
          <h1 className="mt-4 font-display text-4xl font-black leading-[.95] tracking-[-.06em] sm:text-6xl">
            The game
            <br />
            before the game.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            The stories, stats and split-second decisions that shape the way we see sport. A first
            conversation about what happens before the whistle — and why the game is always bigger
            than the score.
          </p>
          <p className="mt-5 text-sm font-semibold">Premieres 1 December 2026</p>
          {premiereUpcoming() ? (
            <button
              type="button"
              onClick={() => setNotifyOpen(true)}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
            >
              Notify me when it drops <ArrowUpRight className="size-4" />
            </button>
          ) : (
            <a
              href="#episode-player"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
            >
              Listen to the episode <Play className="size-4" />
            </a>
          )}
        </div>
        <CoverArt />
      </div>
      <section id="episode-player" className="card-surface mt-12 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Radio className="size-5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Episode player</p>
        </div>
        <h2 className="mt-3 font-display text-2xl font-black">The Good Sport · Episode 01</h2>
        {AUDIO_URL && isSignedIn ? (
          <audio controls preload="none" src={AUDIO_URL} className="mt-5 w-full" />
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center">
            <Play className="mx-auto size-7 text-primary" />
            <p className="mt-3 text-sm font-bold">
              {!isSignedIn
                ? "Create a free account or log in to listen."
                : premiereUpcoming()
                  ? "Audio drops on launch day."
                  : "The episode audio is being prepared."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSignedIn ? "The player will activate when the episode master is uploaded." : "Episode playback is reserved for Puntr members."}
            </p>
            {!isSignedIn && !premiereUpcoming() && (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
              >
                Sign up or log in to listen
              </button>
            )}
          </div>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold">In this episode</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A launch-season conversation on matchday culture, the role of data in sport and how
              fans make sense of the moments that matter.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold">Release notes</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Full SEO-ready transcript, chapter timestamps and key takeaways will be published
              alongside the episode audio.
            </p>
          </div>
        </div>
      </section>
      <section className="mt-10 rounded-3xl bg-[#0c100d] p-6 text-white sm:p-8">
        <h2 className="font-display text-2xl font-black">Want the full conversation?</h2>
        <p className="mt-2 max-w-xl text-sm text-white/60">
          Subscribe to the Puntr YouTube channel for extended video versions of every episode.
        </p>
        {YOUTUBE_URL ? (
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#16A34A] px-5 text-sm font-bold"
          >
            Watch & subscribe on YouTube <ArrowUpRight className="size-4" />
          </a>
        ) : (
          <p className="mt-4 text-xs text-white/40">
            YouTube channel URL will be added before premiere.
          </p>
        )}
      </section>
      {notifyOpen && <NotifyForm close={() => setNotifyOpen(false)} />}
      {authOpen && <AuthPromptModal close={() => setAuthOpen(false)} />}
    </main>
  );
}
