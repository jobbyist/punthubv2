import { createFileRoute, Link } from "@tantml:function_calls>
import { motion } from "motion/react";
import {
  ArrowRight,
  Award,
  BarChart3,
  Brain,
  Gift,
  Heart,
  Lightbulb,
  LineChart,
  Lock,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Puntr | Africa's Sports Prediction & Intelligence Platform" },
      {
        name: "description",
        content:
          "Discover Puntr — a next-generation sports prediction platform combining AI insights, sports data, community predictions, rewards and intelligent betting tools.",
      },
      { property: "og:title", content: "About Puntr | Africa's Sports Prediction & Intelligence Platform" },
      {
        property: "og:description",
        content:
          "Discover Puntr — a next-generation sports prediction platform combining AI insights, sports data, community predictions, rewards and intelligent betting tools.",
      },
    ],
  }),
  component: About,
});

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const principles = [
  {
    icon: Users,
    title: "Community First",
    description: "Build together. Learn together. Win together.",
  },
  {
    icon: Shield,
    title: "Transparency",
    description: "Clear information. Honest interactions.",
  },
  {
    icon: Heart,
    title: "Responsible Gaming",
    description: "Promote informed, measured and responsible choices.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "Continuously improve the technology behind the experience.",
  },
  {
    icon: Award,
    title: "Fair Rewards",
    description: "Recognise genuine expertise and contribution.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Decisions",
    description: "Back predictions with evidence, not noise.",
  },
];

const ecosystemLayers = [
  { label: "Sports Data", description: "Live coverage and performance tracking" },
  { label: "AI Intelligence", description: "Machine learning prediction insights" },
  { label: "Community Predictions", description: "Collective wisdom and consensus" },
  { label: "Odds & Market Comparison", description: "Multi-platform aggregation" },
  { label: "Prediction Performance", description: "Track accuracy and learn" },
  { label: "PuntPoints", description: "Reward currency for the ecosystem" },
  { label: "Rewards & Premium Tools", description: "Unlock exclusive features" },
];

const technologies = [
  { name: "React", category: "Frontend", description: "Component-driven interfaces built for a fast, dynamic product experience." },
  { name: "Vite", category: "Frontend", description: "Lightning-fast build tool and dev server." },
  { name: "TypeScript", category: "Frontend", description: "Type-safe development for reliability." },
  { name: "Tailwind CSS", category: "Frontend", description: "Utility-first styling for rapid UI development." },
  { name: "TanStack Query", category: "Data Layer", description: "Efficient server-state management and real-time data experiences." },
  { name: "Supabase", category: "Backend", description: "Database, authentication and real-time subscriptions." },
  { name: "Vercel", category: "Infrastructure", description: "Scalable deployment and global application delivery." },
  { name: "VerifyNow", category: "Verification", description: "Identity and age verification infrastructure." },
  { name: "Paystack", category: "Payments", description: "Secure payment infrastructure for premium products and subscriptions." },
  { name: "Framer Motion", category: "UI/UX", description: "Production-ready animation library." },
  { name: "Recharts", category: "Analytics", description: "Data visualization and charting." },
  { name: "PUNT AI", category: "AI", description: "AI-powered prediction intelligence." },
];

const sportsLogos = [
  { name: "Premier League", category: "Football" },
  { name: "UEFA Champions League", category: "Football" },
  { name: "LaLiga", category: "Football" },
  { name: "PSL", category: "Football" },
  { name: "Serie A", category: "Football" },
  { name: "Bundesliga", category: "Football" },
  { name: "Springboks", category: "Rugby" },
  { name: "URC", category: "Rugby" },
  { name: "Proteas", category: "Cricket" },
  { name: "IPL", category: "Cricket" },
  { name: "NBA", category: "Basketball" },
  { name: "Formula 1", category: "Motorsport" },
];

const bettingPlatforms = [
  { name: "Hollywoodbets", logo: "/logos/hollywoodbets.png" },
  { name: "Sportingbet", logo: "/logos/sportingbet.png" },
  { name: "Supabets", logo: "/logos/supabets.png" },
  { name: "Betway", logo: "/logos/betway.png" },
];

const leaderboardData = [
  { rank: 1, username: "TipMaster87", accuracy: 78, predictions: 342, points: 12450, streak: 7, trend: "up" },
  { rank: 2, username: "TheSportsProphet", accuracy: 76, predictions: 289, points: 11230, streak: 5, trend: "up" },
  { rank: 3, username: "DataDrivenBets", accuracy: 74, predictions: 401, points: 10890, streak: 3, trend: "same" },
  { rank: 4, username: "You", accuracy: 68, predictions: 156, points: 6780, streak: 2, trend: "up" },
];

function About() {
  const { openEarlyAccess } = useSession();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="overflow-hidden bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] overflow-hidden bg-[#111111] text-white">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#16A34A] opacity-10 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[1.05] tracking-tight">
              Where Sports Intelligence
              <br />
              Meets <span className="text-[#16A34A]">Community</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
              Puntr is building a smarter way for sports fans to predict, compete and earn — combining data, AI,
              community insight and rewards in one powerful ecosystem.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-13 bg-[#16A34A] px-8 text-base hover:bg-[#16A34A]/90" onClick={() => openEarlyAccess()}>
                Explore Puntr
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10"
                asChild
              >
                <a href="#ecosystem">Meet the Ecosystem</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Why We Exist */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-tight">
                Sports Should Be More <span className="text-primary">Intelligent</span>.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Sports fans already have opinions. Puntr gives those opinions a place to compete, improve and become
                more valuable.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                The sports betting landscape is fragmented. Fans move between bookmakers, social media tipsters,
                statistics websites and disconnected prediction communities. Puntr brings the experience together.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: BarChart3, title: "Data", description: "Turn information into insight." },
                { icon: Users, title: "Community", description: "See what other predictors think." },
                { icon: Brain, title: "AI", description: "Augment your analysis with intelligent insights." },
                { icon: Gift, title: "Rewards", description: "Get recognised for knowledge, accuracy and engagement." },
              ].map((item) => (
                <motion.div
                  key={item.title}
                  whileHover={{ y: -4 }}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <item.icon className="size-8 text-primary" strokeWidth={1.5} />
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Mission / Vision */}
        <motion.section {...fade} className="py-16">
          <div className="grid gap-8 rounded-2xl bg-[#111111] p-8 text-white lg:grid-cols-2 lg:p-12">
            <div className="relative">
              <div className="absolute -left-4 -top-4 text-[120px] font-extrabold leading-none text-[#16A34A] opacity-10">
                P
              </div>
              <div className="relative">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#16A34A]">Mission</h3>
                <p className="mt-4 text-xl font-semibold leading-relaxed lg:text-2xl">
                  To build Africa's most trusted prediction community where sports knowledge is rewarded.
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#16A34A]">Vision</h3>
              <p className="mt-4 text-xl font-semibold leading-relaxed lg:text-2xl">
                To become the leading sports prediction ecosystem across Africa, connecting millions of sports fans
                through data, community and rewards.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Our Principles */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              Built On Better <span className="text-primary">Principles</span>.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((principle) => (
              <motion.div
                key={principle.title}
                whileHover={{ y: -4 }}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <principle.icon className="size-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{principle.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{principle.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* The Puntr Ecosystem */}
        <motion.section {...fade} id="ecosystem" className="py-16 lg:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              One Platform. Multiple Layers of <span className="text-primary">Intelligence</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Puntr connects every layer of the sports prediction experience into one unified ecosystem.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="space-y-4">
                {ecosystemLayers.map((layer, index) => (
                  <motion.div
                    key={layer.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    onHoverStart={() => setHoveredNode(layer.label)}
                    onHoverEnd={() => setHoveredNode(null)}
                    className="group relative flex items-center gap-4 rounded-xl border border-border bg-background p-4 transition-all hover:border-primary hover:shadow-md"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Zap className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary">{layer.label}</h4>
                      <p className="mt-0.5 text-sm text-muted-foreground">{layer.description}</p>
                    </div>
                    {index < ecosystemLayers.length - 1 && (
                      <div className="absolute -bottom-2 left-9 h-4 w-0.5 bg-border" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Sports Ecosystem */}
        <motion.section {...fade} className="py-16">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              Built Around The Sports You <span className="text-primary">Love</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Puntr brings fans closer to the sports, competitions and platforms that power the modern sports ecosystem.
            </p>
          </div>
          <div className="mt-12">
            <div className="rounded-xl border border-border bg-card p-8">
              <h3 className="text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Sports & Competitions We Cover
              </h3>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {sportsLogos.map((sport) => (
                  <div
                    key={sport.name}
                    className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-4 text-center transition-all hover:border-primary"
                  >
                    <Trophy className="size-8 text-primary opacity-60" />
                    <p className="mt-2 text-xs font-medium">{sport.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{sport.category}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Betting & Platform Ecosystem */}
        <motion.section {...fade} className="py-16">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              Connected To The Sports <span className="text-primary">Economy</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Puntr helps fans compare opportunities across the wider sports betting ecosystem without replacing the
              licensed operators they use.
            </p>
          </div>
          <div className="mt-12">
            <div className="rounded-xl border border-border bg-card p-8">
              <h3 className="text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Platforms Within Our Aggregation Ecosystem
              </h3>
              <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {bettingPlatforms.map((platform) => (
                  <div
                    key={platform.name}
                    className="flex items-center justify-center rounded-lg border border-border bg-background p-6 opacity-60 transition-all hover:opacity-100"
                  >
                    <img src={platform.logo} alt={platform.name} className="max-h-12 w-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Technology Stack */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              Engineered For <span className="text-primary">Scale</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
              Puntr is built as a modern, scalable web application designed for real-time sports data, high-volume
              community interaction and intelligent prediction experiences.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {technologies.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{tech.name}</h3>
                    <p className="text-xs font-medium text-primary">{tech.category}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tech.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Architecture Visualization */}
        <motion.section {...fade} className="py-16">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              How Puntr <span className="text-primary">Works</span>
            </h2>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h4 className="font-semibold">Core Application</h4>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Puntr Web App</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Authentication</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Prediction Engine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Community / Leaderboards</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex lg:items-center lg:justify-center">
                  <div className="h-full w-0.5 bg-border" />
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <h4 className="font-semibold">Infrastructure & Services</h4>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Vercel (Hosting)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Supabase (Database)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">VerifyNow (Verification)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Paystack (Payments)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Built for the Community */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
                Your Knowledge Has <span className="text-primary">Value</span>.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Puntr is designed to recognise the people who know their sports.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Target, title: "Predict", description: "Make your call." },
                  { icon: TrendingUp, title: "Compete", description: "See how you rank." },
                  { icon: LineChart, title: "Learn", description: "Understand where you improve." },
                  { icon: Gift, title: "Earn", description: "Turn participation and performance into rewards." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <item.icon className="size-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-semibold">Top Predictors</h3>
                  <Trophy className="size-5 text-primary" />
                </div>
                <div className="mt-4 space-y-3">
                  {leaderboardData.map((user) => (
                    <div
                      key={user.rank}
                      className={`flex items-center gap-3 rounded-lg p-3 ${
                        user.username === "You" ? "bg-primary-soft" : "bg-muted/30"
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold tnum ${
                          user.username === "You" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {user.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{user.username}</p>
                          {user.streak > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-500">
                              🔥 {user.streak}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{user.accuracy}% accuracy</span>
                          <span>·</span>
                          <span>{user.predictions} predictions</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary tnum">{user.points.toLocaleString()} PP</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {user.trend === "up" ? "↗" : user.trend === "down" ? "↘" : "→"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* PuntPoints */}
        <motion.section {...fade} className="py-16">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 lg:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
                Every Prediction <span className="text-primary">Counts</span>.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                PuntPoints are the platform's reward currency — recognising accuracy, engagement and contribution.
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {[
                  { icon: Target, title: "Accuracy", description: "Get recognised for getting it right." },
                  { icon: Users, title: "Engagement", description: "Participate, contribute and build your reputation." },
                  { icon: Gift, title: "Referrals", description: "Help grow the community and unlock additional rewards." },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-border bg-card p-6">
                    <div className="mx-auto grid size-12 place-items-center rounded-lg bg-primary-soft text-primary">
                      <item.icon className="size-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Responsible Gaming */}
        <motion.section {...fade} className="py-16">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-border bg-card p-8 lg:p-12">
              <div className="text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
                  <Shield className="size-8" strokeWidth={1.5} />
                </div>
                <h2 className="mt-6 text-[clamp(1.8rem,3vw,2.4rem)] font-bold">
                  Predict Smart. Play <span className="text-primary">Responsibly</span>.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                  Puntr exists to make sports prediction more informed — not to encourage reckless gambling.
                </p>
              </div>
              <div className="mt-10 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  • Puntr does not guarantee betting outcomes. All predictions and AI insights are informational and
                  should not be considered professional advice.
                </p>
                <p>• No persons under the age of 18 are permitted to use betting-related features.</p>
                <p>
                  • We encourage users to understand risk, set limits and make informed decisions about their betting
                  activity.
                </p>
                <p className="font-semibold text-foreground">
                  If you or someone you know needs support: National Responsible Gambling Programme Helpline:{" "}
                  <a href="tel:0800006008" className="text-primary hover:underline">
                    0800 006 008
                  </a>
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* The Road Ahead */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              We're Just Getting <span className="text-primary">Started</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Puntr is a platform that can expand beyond prediction into a comprehensive sports intelligence ecosystem.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-4 pb-4">
                {[
                  "Sports Intelligence",
                  "Community",
                  "Media",
                  "AI",
                  "Rewards",
                  "Partner Ecosystem",
                  "African Market Expansion",
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex-1 min-w-[200px]"
                  >
                    <div className="rounded-xl border border-border bg-card p-6 text-center">
                      <div className="mx-auto grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                        <Zap className="size-5" />
                      </div>
                      <p className="mt-3 font-semibold">{item}</p>
                    </div>
                    {index < 6 && (
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Final CTA */}
      <section className="bg-[#111111] text-white">
        <div className="mx-auto max-w-[1400px] px-4 py-20 text-center sm:px-6 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-extrabold leading-tight">
              Think You Know <span className="text-[#16A34A]">Sports</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-300">Put your predictions to the test.</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-13 bg-[#16A34A] px-8 text-base hover:bg-[#16A34A]/90" onClick={() => openEarlyAccess()}>
                Join Puntr
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10"
                asChild
              >
                <Link to="/predictions">Explore Predictions</Link>
              </Button>
            </div>
            <p className="mt-8 text-sm font-semibold text-[#16A34A]">Predict. Earn. Win Together.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
