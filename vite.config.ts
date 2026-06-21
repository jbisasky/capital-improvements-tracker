import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { injectPlausibleScript } from "./src/hosting/inject-plausible";

function plausibleDomainPlugin(): Plugin {
  return {
    name: "plausible-domain",
    transformIndexHtml(html) {
      const domain = process.env.VITE_PLAUSIBLE_DOMAIN;
      return injectPlausibleScript(html, domain);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), plausibleDomainPlugin()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
