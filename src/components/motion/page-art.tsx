/**
 * Custom motion graphics for page banners. Each one is a small original SVG scene drawn with the brand tokens
 * (ink lines, Puntr green accents) and animated with the CSS classes in styles.css, so there is no JavaScript,
 * nothing to hydrate and everything stops for prefers-reduced-motion. Decorative only: always aria-hidden.
 */
import type { ReactNode } from "react";

export type PageArtKind =
  | "pitch"
  | "podium"
  | "scoreboard"
  | "chat"
  | "shield"
  | "coins"
  | "radar"
  | "news"
  | "route"
  | "gift";

const line = "stroke-foreground/25";
const soft = "fill-primary/12";

function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 240 150"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`h-full w-full ${className}`}
    >
      {children}
    </svg>
  );
}

/** Half pitch that draws itself; the ball follows a dashed pass into the box. */
function Pitch() {
  const path = "M28 118 C 70 30, 140 24, 196 74";
  return (
    <Frame>
      <rect className={`puntr-draw ${line}`} x="12" y="14" width="216" height="122" rx="6" />
      <line className={`puntr-draw ${line}`} x1="120" y1="14" x2="120" y2="136" />
      <circle className={`puntr-draw ${line}`} cx="120" cy="75" r="24" />
      <rect className={`puntr-draw ${line}`} x="188" y="40" width="40" height="70" />
      <rect className={`puntr-draw ${line}`} x="212" y="58" width="16" height="34" />
      <rect className={`puntr-draw ${line}`} x="12" y="40" width="40" height="70" />
      <path d={path} className="puntr-dash stroke-primary/70" />
      <circle cx="28" cy="118" r="5" className="fill-primary/25 stroke-primary" />
      <circle cx="196" cy="74" r="9" className="puntr-blink stroke-primary/60" />
      <g className="puntr-travel" style={{ offsetPath: `path("${path}")` }}>
        <circle r="7" className="fill-background stroke-foreground" />
        <path d="M-3 -2 L0 -4 L3 -2 L2 2 L-2 2 Z" className="fill-foreground" strokeWidth="0" />
      </g>
    </Frame>
  );
}

/** Three podium blocks rise in turn and a star settles over first place. */
function Podium() {
  return (
    <Frame>
      <line className={line} x1="20" y1="132" x2="220" y2="132" />
      <rect
        x="42"
        y="76"
        width="48"
        height="56"
        rx="4"
        className={`puntr-grow-y ${soft} stroke-primary/50`}
        style={{ ["--i" as string]: 1 }}
      />
      <rect
        x="96"
        y="46"
        width="48"
        height="86"
        rx="4"
        className="puntr-grow-y fill-primary/25 stroke-primary"
        style={{ ["--i" as string]: 2 }}
      />
      <rect
        x="150"
        y="94"
        width="48"
        height="38"
        rx="4"
        className={`puntr-grow-y ${soft} stroke-primary/50`}
        style={{ ["--i" as string]: 0 }}
      />
      <g
        className="font-display"
        fontWeight="800"
        fontSize="18"
        textAnchor="middle"
        strokeWidth="0"
      >
        <text x="66" y="110" className="fill-foreground/60">
          2
        </text>
        <text x="120" y="96" className="fill-primary">
          1
        </text>
        <text x="174" y="120" className="fill-foreground/60">
          3
        </text>
      </g>
      <g className="puntr-bob">
        <path
          d="M120 10 l5.3 10.7 11.8 1.7 -8.5 8.3 2 11.8 -10.6 -5.6 -10.6 5.6 2 -11.8 -8.5 -8.3 11.8 -1.7z"
          className="puntr-pop fill-primary stroke-primary"
          style={{ ["--i" as string]: 9, transformOrigin: "120px 26px" }}
        />
      </g>
      <circle cx="48" cy="40" r="3" className="puntr-blink fill-primary" strokeWidth="0" />
      <circle
        cx="196"
        cy="52"
        r="2.5"
        className="puntr-blink fill-primary"
        strokeWidth="0"
        style={{ ["--i" as string]: 3 }}
      />
      <circle
        cx="206"
        cy="24"
        r="2"
        className="puntr-blink fill-foreground/40"
        strokeWidth="0"
        style={{ ["--i" as string]: 5 }}
      />
    </Frame>
  );
}

/** A scoreboard whose result ticks pop in one by one, over a form line that draws itself. */
function Scoreboard() {
  const marks = ["W", "W", "L", "W", "V"] as const;
  return (
    <Frame>
      <rect x="18" y="16" width="204" height="64" rx="8" className={`${line} fill-card`} />
      <line x1="120" y1="24" x2="120" y2="72" className={line} />
      <g
        className="font-display"
        fontWeight="800"
        fontSize="30"
        textAnchor="middle"
        strokeWidth="0"
      >
        <text x="70" y="60" className="puntr-pop fill-foreground" style={{ ["--i" as string]: 2 }}>
          2
        </text>
        <text
          x="170"
          y="60"
          className="puntr-pop fill-foreground/55"
          style={{ ["--i" as string]: 4 }}
        >
          1
        </text>
      </g>
      <circle cx="205" cy="28" r="3" className="puntr-blink fill-primary" strokeWidth="0" />
      {marks.map((m, i) => (
        <g
          key={i}
          className="puntr-pop"
          style={{ ["--i" as string]: 5 + i, transformOrigin: `${40 + i * 40}px 112px` }}
        >
          <rect
            x={24 + i * 40}
            y="96"
            width="32"
            height="32"
            rx="6"
            className={
              m === "W"
                ? "fill-primary/20 stroke-primary"
                : m === "L"
                  ? "fill-foreground/5 stroke-foreground/40"
                  : "fill-muted stroke-foreground/20"
            }
          />
          <text
            x={40 + i * 40}
            y="118"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            strokeWidth="0"
            className={`font-display ${m === "W" ? "fill-primary" : "fill-foreground/60"}`}
          >
            {m}
          </text>
        </g>
      ))}
    </Frame>
  );
}

/** Conversation bubbles pop in, the last one still typing. */
function Chat() {
  return (
    <Frame>
      <g className="puntr-pop" style={{ ["--i" as string]: 1, transformOrigin: "70px 40px" }}>
        <path
          d="M20 18 h100 a10 10 0 0 1 10 10 v24 a10 10 0 0 1 -10 10 H46 l-14 12 v-12 H20 a10 10 0 0 1 -10 -10 V28 a10 10 0 0 1 10 -10z"
          className={`${line} fill-card`}
        />
        <line x1="26" y1="34" x2="108" y2="34" className={line} />
        <line x1="26" y1="46" x2="84" y2="46" className={line} />
      </g>
      <g className="puntr-pop" style={{ ["--i" as string]: 4, transformOrigin: "170px 78px" }}>
        <path
          d="M112 58 h100 a10 10 0 0 1 10 10 v22 a10 10 0 0 1 -10 10 h-4 v12 l-14 -12 h-82 a10 10 0 0 1 -10 -10 V68 a10 10 0 0 1 10 -10z"
          className="fill-primary/15 stroke-primary"
        />
        <line x1="126" y1="74" x2="200" y2="74" className="stroke-primary/60" />
        <line x1="126" y1="86" x2="176" y2="86" className="stroke-primary/60" />
      </g>
      <g className="puntr-pop" style={{ ["--i" as string]: 7, transformOrigin: "52px 118px" }}>
        <rect x="16" y="102" width="72" height="32" rx="16" className={`${line} fill-card`} />
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={38 + i * 14}
            cy="118"
            r="3.5"
            strokeWidth="0"
            className="puntr-blink fill-foreground/60"
            style={{ ["--i" as string]: i }}
          />
        ))}
      </g>
      <g className="puntr-bob">
        <path
          d="M196 22 l8 0 0 -6 6 0 0 6 8 0 0 6 -8 0 0 6 -6 0 0 -6 -8 0z"
          className="fill-primary/20 stroke-primary/60"
          strokeWidth="1.5"
        />
      </g>
    </Frame>
  );
}

/** A shield with a tick that draws itself inside a slowly turning dashed ring. */
function Shield() {
  return (
    <Frame>
      <circle
        cx="120"
        cy="75"
        r="62"
        className="puntr-spin stroke-foreground/15"
        strokeDasharray="3 9"
      />
      <circle
        cx="120"
        cy="75"
        r="48"
        className="puntr-spin stroke-primary/40"
        strokeDasharray="14 10"
        style={{ animationDirection: "reverse", animationDuration: "22s" }}
      />
      <path
        d="M120 34 l30 11 v24 c0 20 -13 34 -30 41 c-17 -7 -30 -21 -30 -41 V45z"
        className="puntr-pop fill-primary/15 stroke-primary"
        style={{ transformOrigin: "120px 75px" }}
      />
      <path d="M106 74 l10 10 l20 -22" className="puntr-draw stroke-primary" strokeWidth="4" />
      <circle cx="58" cy="30" r="3" className="puntr-blink fill-primary" strokeWidth="0" />
      <circle
        cx="188"
        cy="118"
        r="3"
        className="puntr-blink fill-foreground/40"
        strokeWidth="0"
        style={{ ["--i" as string]: 3 }}
      />
    </Frame>
  );
}

/** PuntPoints tokens stack up; a plus mark floats above them. */
function Coins() {
  const stack = (x: number, n: number, base: number) =>
    Array.from({ length: n }, (_, i) => (
      <g
        key={`${x}-${i}`}
        className="puntr-pop"
        style={{ ["--i" as string]: base + i, transformOrigin: `${x}px ${122 - i * 13}px` }}
      >
        <ellipse
          cx={x}
          cy={122 - i * 13}
          rx="30"
          ry="9"
          className={i === n - 1 ? "fill-primary/30 stroke-primary" : "fill-card stroke-primary/55"}
        />
      </g>
    ));
  return (
    <Frame>
      <line className={line} x1="16" y1="134" x2="224" y2="134" />
      {stack(62, 3, 0)}
      {stack(128, 6, 2)}
      {stack(192, 4, 4)}
      <text
        x="128"
        y="61"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        strokeWidth="0"
        className="puntr-pop font-display fill-primary"
        style={{ ["--i" as string]: 9, transformOrigin: "128px 57px" }}
      >
        PP
      </text>
      <g className="puntr-bob">
        <path d="M192 30 v20 M182 40 h20" className="stroke-primary" strokeWidth="4" />
      </g>
      <circle cx="40" cy="48" r="3" className="puntr-blink fill-primary" strokeWidth="0" />
    </Frame>
  );
}

/** Radar sweep with fixtures appearing as blips. */
function Radar() {
  return (
    <Frame>
      {[58, 40, 22].map((r) => (
        <circle key={r} cx="120" cy="75" r={r} className={line} />
      ))}
      <line x1="56" y1="75" x2="184" y2="75" className="stroke-foreground/12" />
      <line x1="120" y1="13" x2="120" y2="137" className="stroke-foreground/12" />
      <g className="puntr-sweep" style={{ transformOrigin: "120px 75px" }}>
        <path
          d="M120 75 L120 17 A58 58 0 0 1 170 46 Z"
          className="fill-primary/20"
          strokeWidth="0"
        />
        <line x1="120" y1="75" x2="120" y2="17" className="stroke-primary" />
      </g>
      <circle cx="120" cy="75" r="4" className="fill-primary" strokeWidth="0" />
      {(
        [
          [150, 52, 0],
          [92, 98, 2],
          [146, 104, 4],
          [84, 50, 6],
        ] as const
      ).map(([x, y, i]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="4"
          strokeWidth="0"
          className="puntr-blink fill-primary"
          style={{ ["--i" as string]: i }}
        />
      ))}
      <rect
        x="194"
        y="24"
        width="34"
        height="12"
        rx="6"
        className="puntr-blink fill-primary/20 stroke-primary/60"
      />
    </Frame>
  );
}

/** A front page whose headline and columns write themselves. */
function News() {
  return (
    <Frame>
      <rect x="34" y="14" width="172" height="122" rx="8" className={`${line} fill-card`} />
      <rect
        x="48"
        y="28"
        width="60"
        height="42"
        rx="4"
        className="puntr-pop fill-primary/20 stroke-primary/60"
      />
      <path d="M54 62 l14 -16 l10 10 l8 -6 l16 12" className="puntr-draw stroke-primary" />
      {(
        [
          [118, 32, 74, "stroke-foreground/60", 4],
          [118, 46, 60, line, 2],
          [118, 58, 68, line, 2],
          [48, 84, 144, line, 2],
          [48, 96, 132, line, 2],
          [48, 108, 144, line, 2],
          [48, 120, 96, line, 2],
        ] as const
      ).map(([x, y, w, cls, sw], i) => (
        <line
          key={y}
          x1={x}
          y1={y}
          x2={x + w}
          y2={y}
          strokeWidth={sw}
          className={`puntr-grow-x ${cls}`}
          style={{ ["--i" as string]: i + 2, transformBox: "fill-box" }}
        />
      ))}
      <circle cx="196" cy="24" r="4" className="puntr-blink fill-primary" strokeWidth="0" />
    </Frame>
  );
}

/** A route with milestones that light up in order. */
function RouteArt() {
  const path = "M20 120 C 60 120, 60 60, 100 60 S 150 100, 180 70 S 215 30, 222 26";
  return (
    <Frame>
      <path d={path} className="stroke-foreground/15" strokeWidth="6" />
      <path d={path} className="puntr-dash stroke-primary" />
      {(
        [
          [20, 120],
          [100, 60],
          [180, 70],
        ] as const
      ).map(([x, y], i) => (
        <g
          key={x}
          className="puntr-pop"
          style={{ ["--i" as string]: i * 3, transformOrigin: `${x}px ${y}px` }}
        >
          <circle cx={x} cy={y} r="9" className="fill-card stroke-primary" />
          <circle cx={x} cy={y} r="3.5" className="fill-primary" strokeWidth="0" />
        </g>
      ))}
      <g className="puntr-bob">
        <path d="M222 26 v-16 l-16 6 l16 6" className="fill-primary/30 stroke-primary" />
      </g>
      <g className="puntr-travel" style={{ offsetPath: `path("${path}")` }}>
        <circle r="5" className="fill-foreground" strokeWidth="0" />
      </g>
    </Frame>
  );
}

/** A reward box whose lid floats while sparks blink around it. */
function Gift() {
  return (
    <Frame>
      <rect
        x="76"
        y="70"
        width="88"
        height="62"
        rx="6"
        className="fill-primary/15 stroke-primary"
      />
      <line x1="120" y1="70" x2="120" y2="132" className="stroke-primary" />
      <g className="puntr-bob">
        <rect x="68" y="50" width="104" height="20" rx="5" className="fill-card stroke-primary" />
        <path
          d="M120 50 c-10 -22 -34 -18 -26 -4 c4 6 16 4 26 4 c10 0 22 2 26 -4 c8 -14 -16 -18 -26 4z"
          className="fill-primary/25 stroke-primary"
        />
      </g>
      {(
        [
          [44, 44, 0],
          [198, 60, 2],
          [52, 104, 4],
          [192, 112, 6],
          [120, 14, 3],
        ] as const
      ).map(([x, y, i]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - 7} v14 M${x - 7} ${y} h14`}
          className="puntr-blink stroke-primary"
          style={{ ["--i" as string]: i }}
        />
      ))}
    </Frame>
  );
}

const ART: Record<PageArtKind, () => ReactNode> = {
  pitch: Pitch,
  podium: Podium,
  scoreboard: Scoreboard,
  chat: Chat,
  shield: Shield,
  coins: Coins,
  radar: Radar,
  news: News,
  route: RouteArt,
  gift: Gift,
};

export function PageArt({ kind, className = "" }: { kind: PageArtKind; className?: string }) {
  const Art = ART[kind];
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <Art />
    </div>
  );
}
