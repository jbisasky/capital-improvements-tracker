# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Landing page >> "See a demo" button navigates to /demo/dashboard
- Location: e2e/landing.spec.ts:16:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /var/folders/qq/6_4z78x17319z8185gsxc7gr0000gn/T/cursor-sandbox-cache/55850637d42d52adbf87b66e84924d26/playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```