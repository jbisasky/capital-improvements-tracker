import { defineConfig } from "@playwright/test";

/** Playwright config for smoke tests against the live Cloudflare Pages deployment. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "production-smoke.spec.ts",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "https://capital-improvements-tracker.pages.dev",
    headless: true,
  },
});
