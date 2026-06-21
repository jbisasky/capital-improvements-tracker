/** Build-time injection of the Plausible script tag into index.html (LLD §18.4). */

const PLAUSIBLE_MARKER = "<!-- PLAUSIBLE -->";

export function injectPlausibleScript(html: string, domain: string | undefined): string {
  const tag =
    domain && domain.length > 0
      ? `<script defer data-domain="${domain}" src="https://plausible.io/js/script.js"></script>`
      : "";
  if (!html.includes(PLAUSIBLE_MARKER)) {
    throw new Error(`index.html is missing the ${PLAUSIBLE_MARKER} marker`);
  }
  return html.replace(PLAUSIBLE_MARKER, tag);
}
