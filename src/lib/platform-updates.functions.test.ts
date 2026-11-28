import { describe, expect, it } from "vitest";

import { validateSavePlatformTaskInput } from "./platform-updates.functions";

const valid = {
  title: "Verify PFIE standings",
  description: "Check current tables and form.",
  category: "PFIE",
  status: "planned",
  priority: "high",
  progress: 0,
  dueDate: "2026-12-01",
  sortOrder: 1,
};

describe("validateSavePlatformTaskInput", () => {
  it("rejects non-object payloads", () => {
    expect(() => validateSavePlatformTaskInput(null)).toThrow("Invalid implementation task payload");
    expect(() => validateSavePlatformTaskInput([])).toThrow("Invalid implementation task payload");
  });

  it("rejects missing or incorrectly typed fields", () => {
    expect(() => validateSavePlatformTaskInput({ ...valid, title: undefined })).toThrow("Task title is required");
    expect(() => validateSavePlatformTaskInput({ ...valid, status: "done" })).toThrow("Invalid task status");
    expect(() => validateSavePlatformTaskInput({ ...valid, progress: "not-a-number" })).toThrow("Task progress must be a number");
  });

  it("normalises valid task input without silently clamping invalid progress", () => {
    expect(validateSavePlatformTaskInput(valid)).toMatchObject({
      title: valid.title,
      status: "planned",
      priority: "high",
      progress: 0,
      dueDate: valid.dueDate,
    });
    expect(() => validateSavePlatformTaskInput({ ...valid, progress: 101 })).not.toThrow();
  });
});
