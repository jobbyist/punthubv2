import { defineConfig, devices } from "@playwright/test";

const workers = Math.max(1, Math.min(3, Number(process.env.SYNTHETIC_WORKERS || 1)));
const headless = process.env.PW_HEADLESS !== "false";

if (!process.env.PUNTR_BASE_URL) {
  throw new Error("Set PUNTR_BASE_URL explicitly. Do not guess the production hostname.");
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.PUNTR_BASE_URL,
    headless,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    serviceWorkers: "block",
    extraHTTPHeaders: {
      "x-puntr-synthetic-test": "true",
      "x-puntr-experiment": "puntr-30-day-synthetic-2026-11-27",
    },
    ...devices["Desktop Chrome"],
  },
});
