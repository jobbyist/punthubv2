import { describe, expect, it } from "vitest";

import {
  badgeKey,
  badgePath,
  cleanManualLogoUrl,
  pickCrestImage,
  pickWikipediaTitle,
  searchName,
} from "./resolve";

describe("names", () => {
  it("normalises short forms", () => {
    expect(badgeKey("Man Utd")).toBe("manchester united");
    expect(badgeKey("Nott'm Forest")).toBe("nottingham forest");
    expect(searchName("Spurs")).toBe("Tottenham Hotspur");
    expect(badgePath("soccer", "Brighton")).toBe("teams/soccer/brighton-and-hove-albion.png");
  });
});

describe("pickWikipediaTitle", () => {
  it("takes the club article and skips seasons, files and unrelated pages", () => {
    const hits = [
      { url: "https://www.premierleague.com/clubs/1/Arsenal" },
      { url: "https://en.wikipedia.org/wiki/2025%E2%80%9326_Arsenal_F.C._season" },
      { url: "https://en.wikipedia.org/wiki/File:Arsenal_FC.svg" },
      { url: "https://en.wikipedia.org/wiki/Arsenal_F.C." },
    ];
    expect(pickWikipediaTitle(hits, "Arsenal")).toBe("Arsenal_F.C.");
    expect(
      pickWikipediaTitle([{ url: "https://en.wikipedia.org/wiki/Emirates_Stadium" }], "Arsenal"),
    ).toBeNull();
    expect(
      pickWikipediaTitle(
        [{ url: "https://en.wikipedia.org/wiki/Manchester_United_F.C." }],
        "Man Utd",
      ),
    ).toBe("Manchester_United_F.C.");
  });
});

describe("pickCrestImage", () => {
  const club = {
    type: "standard",
    description: "Association football club in London, England",
    thumbnail: {
      source:
        "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/320px-Arsenal_FC.svg.png",
    },
    originalimage: { source: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg" },
  };
  it("accepts a club crest", () => {
    expect(pickCrestImage(club)).toEqual({ ok: true, image: club.thumbnail.source });
  });
  it("refuses people, disambiguation pages, photos and other hosts", () => {
    expect(pickCrestImage({ ...club, description: "English footballer (born 1990)" }).ok).toBe(
      false,
    );
    expect(pickCrestImage({ ...club, type: "disambiguation" }).ok).toBe(false);
    expect(
      pickCrestImage({
        ...club,
        thumbnail: { source: "https://upload.wikimedia.org/x/Emirates_Stadium_aerial.jpg" },
        originalimage: { source: "https://upload.wikimedia.org/x/Emirates_Stadium_aerial.jpg" },
      }).ok,
    ).toBe(false);
    expect(
      pickCrestImage({
        ...club,
        thumbnail: { source: "https://example.com/a.png" },
        originalimage: {},
      }).ok,
    ).toBe(false);
  });
  it("needs a manual URL to be https", () => {
    expect(cleanManualLogoUrl("http://x.co/a.png")).toBeNull();
    expect(cleanManualLogoUrl("https://x.co/a.png")).toBe("https://x.co/a.png");
  });
});
