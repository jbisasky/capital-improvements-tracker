import { buildSiteMetaTags } from "./site-meta";

/** Build-time injection of SEO / Open Graph tags into index.html. */

const SITE_META_MARKER = "<!-- SITE_META -->";

export function injectSiteMeta(html: string, siteUrl: string | undefined): string {
  if (!html.includes(SITE_META_MARKER)) {
    throw new Error(`index.html is missing the ${SITE_META_MARKER} marker`);
  }
  const tags = buildSiteMetaTags({ siteUrl });
  return html.replace(SITE_META_MARKER, tags);
}
