import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { injectPlausibleScript } from "./inject-plausible";
import {
  INDEX_HTML_CACHE_CONTROL,
  REQUIRED_CSP_FRAGMENTS,
  REQUIRED_RESPONSE_HEADERS,
} from "./required-security-headers";

const publicDir = join(import.meta.dirname, "../../public");

describe("injectPlausibleScript", () => {
  it("inserts the Plausible script when a domain is set", () => {
    // Arrange
    const html = "<head><!-- PLAUSIBLE --></head>";

    // Act
    const result = injectPlausibleScript(html, "capital-improvements-tracker.pages.dev");

    // Assert
    expect(result).toContain('data-domain="capital-improvements-tracker.pages.dev"');
    expect(result).toContain("https://plausible.io/js/script.js");
    expect(result).not.toContain("<!-- PLAUSIBLE -->");
  });

  it("removes the marker when no domain is configured", () => {
    // Arrange
    const html = "<head><!-- PLAUSIBLE --></head>";

    // Act
    const result = injectPlausibleScript(html, undefined);

    // Assert
    expect(result).toBe("<head></head>");
    expect(result).not.toContain("plausible.io");
  });

  it("throws when the marker is missing", () => {
    expect(() => injectPlausibleScript("<head></head>", "example.com")).toThrow(
      /PLAUSIBLE/,
    );
  });
});

describe("Cloudflare Pages static hosting files", () => {
  it("ships _headers with the required CSP and security headers", () => {
    // Arrange
    const headers = readFileSync(join(publicDir, "_headers"), "utf8");

    // Assert
    for (const fragment of REQUIRED_CSP_FRAGMENTS) {
      expect(headers).toContain(fragment);
    }
    for (const header of REQUIRED_RESPONSE_HEADERS) {
      expect(headers).toContain(header);
    }
    expect(headers).toContain(INDEX_HTML_CACHE_CONTROL);
  });

  it("ships _redirects with SPA fallback to index.html", () => {
    // Arrange
    const redirects = readFileSync(join(publicDir, "_redirects"), "utf8");

    // Assert
    expect(redirects.trim()).toBe("/*    /index.html   200");
  });
});
