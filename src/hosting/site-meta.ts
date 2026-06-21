/** Site-wide SEO / Open Graph defaults (LLD §1.7, EARS §23). */

export const SITE_NAME = "Capital Improvements Tracker";

export const SITE_DESCRIPTION =
  "Track home improvements and their tax impact — privately, in your own Google Drive. AI receipt scanning, IRS documentation health, zero backend.";

export const SITE_TAGLINE =
  "Track home improvements & their tax impact — privately, in your own Google Drive.";

/** Production URL (Cloudflare Pages). Used as build-time default in `.env.example`. */
export const DEFAULT_SITE_URL = "https://capital-improvements-tracker.pages.dev";

export const OG_IMAGE_PATH = "/og-image.jpg";

export const THEME_COLOR = "#11262c";

export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export interface SiteMetaOptions {
  siteUrl?: string | undefined;
}

export function buildSiteMetaTags(options: SiteMetaOptions): string {
  const lines = [
    `<title>${SITE_NAME}</title>`,
    `<meta name="description" content="${escapeHtmlAttr(SITE_DESCRIPTION)}" />`,
    `<meta name="theme-color" content="${THEME_COLOR}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtmlAttr(SITE_NAME)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttr(SITE_DESCRIPTION)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtmlAttr(SITE_NAME)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttr(SITE_DESCRIPTION)}" />`,
  ];

  const siteUrl =
    options.siteUrl && options.siteUrl.length > 0
      ? normalizeSiteUrl(options.siteUrl)
      : undefined;

  if (siteUrl) {
    const ogImage = `${siteUrl}${OG_IMAGE_PATH}`;
    lines.push(
      `<link rel="canonical" href="${escapeHtmlAttr(siteUrl)}/" />`,
      `<meta property="og:url" content="${escapeHtmlAttr(siteUrl)}/" />`,
      `<meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`,
      `<meta name="twitter:image" content="${escapeHtmlAttr(ogImage)}" />`,
    );
  }

  return lines.join("\n    ");
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
