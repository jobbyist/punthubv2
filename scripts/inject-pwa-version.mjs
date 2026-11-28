import { readFile, writeFile } from "node:fs/promises";

const workerPath = new URL("../public/sw.js", import.meta.url);
const source = await readFile(workerPath, "utf8");
const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local";
const version = /^[a-f0-9]{7,64}$/i.test(commit)
  ? commit.slice(0, 12)
  : commit.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "local";
if (!source.includes("__PUNTR_BUILD_VERSION__")) {
  throw new Error("PWA build version marker is missing from public/sw.js");
}
await writeFile(workerPath, source.replaceAll("__PUNTR_BUILD_VERSION__", version));
console.info(`[Puntr PWA] Service worker build version: ${version}`);
