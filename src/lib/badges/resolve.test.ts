import { describe, expect, it } from "vitest";

import {
  badgeKey,
  badgePath,
  badgeSearchRequest,
  cleanManualLogoUrl,
  pickCrestImage,
  pickWikipediaTitle,
  searchName,
  wikipediaCandidates,
} from "./resolve";

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
  ¶»§q«^