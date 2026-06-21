import { describe, expect, it } from "vitest";
import { injectSiteMeta } from "./inject-site-meta";
import {
  DEFAULT_SITE_URL,
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  buildSiteMetaTags,
} from "./site-meta";

describe("buildSiteMetaTags", () => {
  it("includes title, description, and Open Graph tags", () => {
    // Act
    const tags = buildSiteMetaTags({ siteUrl: DEFAULT_SITE_URL });

    // Assert
    expect(tags).toContain(`<title>${SITE_NAME}</title>`);
    expect(tags).toContain(SITE_DESCRIPTION);
    expect(tags).toContain('property="og:title"');
    expect(tags).toContain('name="twitter:card" content="summary_large_image"');
    expect(tags).toContain(`content="${DEFAULT_SITE_URL}/"`);
    expect(tags).toContain(`${DEFAULT_SITE_URL}${OG_IMAGE_PATH}`);
  });

  it("omits canonical and absolute og:image when site URL is unset", () => {
    // Act
    const tags = buildSiteMetaTags({});

    // Assert
    expect(tags).not.toContain("rel=\"canonical\"");
    expect(tags).not.toContain("property=\"og:url\"");
    expect(tags).not.toContain("property=\"og:image\"");
  });
});

describe("injectSiteMeta", () => {
  it("replaces the SITE_META marker in index.html", () => {
    // Arrange
    const html = "<head><!-- SITE_META --></head>";

    // Act
    const result = injectSiteMeta(html, DEFAULT_SITE_URL);

    // Assert
    expect(result).toContain("<title>Capital Improvements Tracker</title>");
    expect(result).not.toContain("<!-- SITE_META -->");
  });

  it("throws when the marker is missing", () => {
    expect(() => injectSiteMeta("<head></head>", DEFAULT_SITE_URL)).toThrow(/SITE_META/);
  });
});
