import { createFileRoute } from "@tanstack/react-router";
import { TheGoodSportPage } from "@/components/podcast/the-good-sport";

export const Route = createFileRoute("/the-good-sport")({
  head: () => ({
    meta: [
      { title: "The Good Sport | Puntr Original Podcast" },
      {
        name: "description",
        content:
          "Big games. Bigger opinions. Better questions. Meet The Good Sport, Puntr's original sports podcast. Season one premieres 5 January 2027.",
      },
      { property: "og:title", content: "The Good Sport | Puntr" },
      {
        property: "og:description",
        content:
          "Stories, stats and spirited debates behind the beautiful game. A Puntr original podcast.",
      },
    ],
  }),
  component: TheGoodSportPage,
});
