import { createFileRoute } from "@tanstack/react-router";
import { TheGoodSportEpisodePage } from "@/components/podcast/the-good-sport";

export const Route = createFileRoute("/the-good-sport/episode-01")({
  head: () => ({
    meta: [
      { title: "The Game Before the Game — Episode 01 | The Good Sport" },
      {
        name: "description",
        content:
          "The premiere episode of The Good Sport, a Puntr original podcast. Listen from 1 December 2026.",
      },
      { property: "og:title", content: "The Game Before the Game — The Good Sport Episode 01" },
      {
        property: "og:description",
        content:
          "The stories, stats and split-second decisions that shape the way we see sport. Premieres 1 December 2026.",
      },
    ],
  }),
  component: TheGoodSportEpisodePage,
});
