import { describe, expect, it } from "vitest";

import { normalise, scoreItem, searchItems, type SearchItem } from "./search-index";

const items: SearchItem[] = [
  { id: "chiefs", kind: "team", title: "Kaizer Chiefs", to: "/", keywords: ["amakhosi"] },
  { id: "pirates", kind: "team", title: "Orlando Pirates", to: "/", keywords: ["bucs"] },
  { id: "sundowns", kind: "team", title: "Mamelodi Sundowns", to: "/", keywords: ["masandawana"] },
  { id: "atletico", kind: "team", title: "Atlético Madrid", to: "/" },
  {
    id: "f1",
    kind: "fixture",
    title: "Kaizer Chiefs vs Orlando Pirates",
    subtitle: "Betway Premiership",
    to: "/",
  },
  {
    id: "psl",
    kind: "competition",
    title: "Betway Premiership",
    to: "/",
    keywords: ["psl", "dstv"],
  },
  {
    id: "tables",
    kind: "page",
    title: "League tables",
    to: "/tables",
    keywords: ["standings", "log"],
  },
];

describe("normalise", () => {
  it("lower-cases and strips accents", () => {
    expect(normalise("  Atlético ")).toBe("atletico");
  });
});

describe("scoreItem", () => {
  it("ranks exact over prefix over word over contains", () => {
    const chiefs = items[0]!;
    expect(scoreItem(chiefs, "kaizer chiefs")).toBe(100);
    expect(scoreItem(chiefs, "kai")).toBe(80);
    expect(scoreItem(chiefs, "chi")).toBe(60);
    expect(scoreItem(chiefs, "iefs")).toBe(40);
    expect(scoreItem(chiefs, "amak")).toBe(30);
    expect(scoreItem(chiefs, "xyz")).toBe(0);
  });
  it("matches accents both ways", () => {
    expect(scoreItem(items[3]!, "atletico")).toBe(80);
  });
});

describe("searchItems", () => {
  it("groups by kind in a fixed order and respects limits", () => {
    const groups = searchItems(items, "chiefs", { team: 1 });
    expect(groups.map((g) => g.kind)).toEqual(["team", "fixture"]);
    expect(groups[0]!.items).toHaveLength(1);
  });
  it("finds pages and competitions by synonyms", () => {
    expect(searchItems(items, "log").map((g) => g.kind)).toEqual(["page"]);
    expect(searchItems(items, "psl")[0]!.items[0]!.id).toBe("psl");
  });
  it("returns nothing for an empty term", () => {
    expect(searchItems(items, "  ")).toEqual([]);
  });
});
