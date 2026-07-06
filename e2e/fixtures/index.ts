import { test as base, type Page } from "@playwright/test";
import { seedAuthToken } from "./auth-state";
import { setupMockDrive } from "./mock-drive";

interface AuthedFixtures {
  /** A page that is pre-authenticated (sessionStorage seeded) with Drive API mocked. */
  authedPage: Page;
}

export const test = base.extend<AuthedFixtures>({
  // eslint-disable-next-line react-hooks/rules-of-hooks
  authedPage: async ({ page }, use) => {
    // Both must run before page.goto() — addInitScript and route intercepts
    // are registered lazily and apply to the next navigation.
    await seedAuthToken(page);
    await setupMockDrive(page);
    await page.goto("/dashboard");
    await use(page);
  },
});

export { expect } from "@playwright/test";
