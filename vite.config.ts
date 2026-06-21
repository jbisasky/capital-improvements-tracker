import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { injectPlausibleScript } from "./src/hosting/inject-plausible";
import { injectSiteMeta } from "./src/hosting/inject-site-meta";
import { DEFAULT_SITE_URL } from "./src/hosting/site-meta";

function htmlTransformPlugin(): Plugin {
  return {
    name: "html-transform",
    transformIndexHtml(html) {
      const siteUrl =
        process.env.VITE_SITE_URL ??
        (process.env.NODE_ENV === "production" ? DEFAULT_SITE_URL : undefined);
      const withMeta = injectSiteMeta(html, siteUrl);
      return injectPlausibleScript(withMeta, process.env.VITE_PLAUSIBLE_DOMAIN);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), htmlTransformPlugin()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
