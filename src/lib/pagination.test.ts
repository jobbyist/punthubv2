import { describe, expect, it } from "vitest";

import { pageWindow, paginate } from "./pagination";

describe("pagination", () => {
  const items = Array.from({ length: 44 }, (_, i) => i);
  it("slices 10 per page and clamps out-of-range pages", () => {
    expect(paginate(items, undefined)).toMatchObject({ pages: 5, current: 1 });
    expect(paginate(items, 2).items).toEqual(items.slice(10, 20));
    expect(paginate(items, 99)).toMatchObject({ current: 5, items: [40, 41, 42, 43] });
    expect(paginate([], 3)).toMatchObject({ pages: 1, current: 1, items: [] });
  });
  it("shows first, last and neighbours with gaps", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, null, 5]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(5, 9)).toEqual([1, null, 4, 5, 6, null, 9]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
