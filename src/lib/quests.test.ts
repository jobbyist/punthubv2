import { describe, expect, it } from "vitest";

import { profileCompletion, summariseQuests, type Quest } from "./quests";

const q = (code: string, points: number, extra: Partial<Quest> = {}): Quest => ({
  code,
  title: code,
  description: "d",
  category: "social",
  verification: "review",
  points,
  action_url: null,
  handle_label: null,
  sort: 1,
  coming_soon: false,
  rewarded: true,
  ...extra,
});

describe("summariseQuests", () => {
  it("counts earned and remaining points and skips coming-soon quests", () => {
    const s = summariseQuests(
      [q("a", 50), q("b", 100), q("c", 70, { coming_soon: true }), q("d", 50, { rewarded: false })],
      [
        {
          quest_code: "a",
          status: "verified",
          evidence: null,
          review_note: null,
          points_awarded: 50,
        },
      ],
    );
    expect(s).toMatchObject({ earned: 50, available: 100, done: 1, total: 2 });
    expect(s.rows.find((r) => r.code === "b")?.status).toBe("todo");
  });
});

describe("profileCompletion", () => {
  it("is 100% only when everything is done", () => {
    const full = profileCompletion({
      avatarUrl: "https://x/a.png",
      displayName: "Thandi",
      details: {
        first_name: "T",
        last_name: "M",
        phone: "0600000000",
        date_of_birth: "1990-01-01",
        province: "GP",
      },
      emailConfirmed: true,
      hasMfa: true,
      identityVerified: true,
    });
    expect(full.percent).toBe(100);
    const half = profileCompletion({
      avatarUrl: null,
      displayName: "Thandi",
      details: null,
      emailConfirmed: true,
      hasMfa: false,
      identityVerified: false,
    });
    expect(half.percent).toBe(13);
    expect(half.items.filter((i) => !i.done).map((i) => i.key)).toContain("avatar");
  });
});
