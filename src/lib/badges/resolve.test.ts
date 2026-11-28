import { describe, expect, it } from "vitest";

import {
  badgeKey,
  badgePath,
  badgeSearchRequest,
  cleanManualLogoUrl,
  pickCrestImage,
  pickWikipediaTitle,
  isOfficialBadgeSource,
  isSofascoreImageHost,
  searchName,
  sofascoreCandidates,
  sofascoreImageUrls,
  wikipediaCandidates,
} from "./resolve";

describe("official badge source verification", () => {
  it("accepts official league pages and explicitly identified team websites", () => {
    expect(
      isOfficialBadgeSource(
        { url: "https://www.premierleague.com/clubs/1/Arsenal", title: "Arsenal Club Profile" },
        "Arsenal",
        "Premier League",
      ),
    ).toBe(true);
    expect(
      isOfficialBadgeSource(
        { url: "https://www.elchecf.es/en/club", title: "Official website of Elche CF" },
        "Elche CF",
        "La Liga",
      ),
    ).toBe(true);
  });

  it("rejects third-party logo repositories even when their titles mention a team crest", () => {
    expect(
      isOfficialBadgeSource(
        { url: "https://www.footylogos.com/logos/elche-cf", title: "Elche CF logo" },
        "Elche CF",
        "La Liga",
      ),
    ).toBe(false);
    expect(
      isOfficialBadgeSource(
        { url: "https://football-logos.cc/france/auxerre", title: "AJ Auxerre club crest" },
        "AJ Auxerre",
        "Ligue 1",
      ),
    ).toBe(false);
  });
});

describe("Parallel search requests", () => {
  it("uses sport- and competition-aware queries for marquee teams", () => {
    expect(badgeSearchRequest("Australia", "FIFA World Cup", "soccer").queries.join(" ")).toContain(
      "national football team",
    );
    expect(
      badgeSearchRequest("Los Angeles Lakers", "NBA", "basketball").queries.join(" "),
    ).toContain("professional basketball team");
    expect(
      badgeSearchRequest("Stormers", "United Rugby Championship", "rugby").queries.join(" "),
    ).toContain("rugby union team");
  });
});
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

describe("strict team-name matching", () => {
  it("does not confuse Iberia Tbilisi with Dinamo Tbilisi", () => {
    expect(
      wikipediaCandidates(
        [
          { url: "https://en.wikipedia.org/wiki/FC_Dinamo_Tbilisi" },
          { url: "https://en.wikipedia.org/wiki/FC_Iberia_1999" },
        ],
        "Iberia Tbilisi",
      ),
    ).toEqual(["FC_Iberia_1999"]);
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
  it("accepts thumb.wikimedia.org thumbnails and drops tracking parameters", () => {
    const src =
      "https://thumb.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/330px-Arsenal_FC.svg.png?utm_source=en.wikipedia.org";
    expect(
      pickCrestImage({ ...club, thumbnail: { source: src }, originalimage: { source: src } }),
    ).toEqual({
      ok: true,
      image:
        "https://thumb.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/330px-Arsenal_FC.svg.png",
    });
  });
  it("ranks club-like titles before town articles", () => {
    expect(
      wikipediaCandidates(
        [
          { url: "https://en.wikipedia.org/wiki/Bournemouth" },
          { url: "https://en.wikipedia.org/wiki/AFC_Bournemouth" },
        ],
        "Bournemouth",
      ),
    ).toEqual(["AFC_Bournemouth", "Bournemouth"]);
  });
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

describe("review fixes", () => {
  it("refuses internal hosts for manual badges", () => {
    for (const u of [
      "https://127.0.0.1/a.png",
      "https://localhost/a.png",
      "https://intranet/a.png",
      "https://x.internal/a.png",
      "https://[::1]/a.png",
      "https://x.co:8443/a.png",
    ])
      expect(cleanManualLogoUrl(u)).toBeNull();
  });
  it("matches women's sides only to women's articles", () => {
    const hits = [
      { url: "https://en.wikipedia.org/wiki/Arsenal_W.F.C._Women" },
      { url: "https://en.wikipedia.org/wiki/Arsenal_F.C." },
    ];
    expect(pickWikipediaTitle(hits, "Arsenal")).toBe("Arsenal_F.C.");
    expect(pickWikipediaTitle(hits, "Arsenal Women")).toBe("Arsenal_W.F.C._Women");
  });
});

describe("SofaScore candidates", () => {
  const hits = [
    { url: "https://www.sofascore.com/football/team/manchester-city-wfc/142658" },
    { url: "https://www.sofascore.com/football/team/manchester-city/17" },
    { url: "https://www.sofascore.com/es/football/team/manchester-city/17" },
    { url: "https://www.sofascore.com/football/team/manchester-united/35" },
    { url: "https://www.sofascore.com/basketball/team/manchester-giants/1234" },
  ];
  it("takes the senior men's team page for the right sport", () => {
    expect(sofascoreCandidates(hits, "Man City", "soccer")).toEqual([17]);
  });
  it("matches local clubs and ignores other sports", () => {
    expect(
      sofascoreCandidates(
        [
          { url: "https://www.sofascore.com/football/team/orlando-pirates/7668" },
          { url: "https://www.sofascore.com/en-us/football/team/mamelodi-sundowns/7665" },
        ],
        "Mamelodi Sundowns",
        "soccer",
      ),
    ).toEqual([7665]);
    expect(sofascoreCandidates(hits, "Manchester Giants", "soccer")).toEqual([]);
  });
  it("builds image addresses and checks hosts", () => {
    expect(sofascoreImageUrls(17)[0]).toBe("https://img.sofascore.com/api/v1/team/17/image");
    expect(isSofascoreImageHost("https://img.sofascore.com/api/v1/team/17/image")).toBe(true);
    expect(isSofascoreImageHost("https://evil.example/sofascore.com")).toBe(false);
  });
});
