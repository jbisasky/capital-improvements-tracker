# Custom domain (optional)

Production default: **https://capital-improvements-tracker.pages.dev**

## Steps

1. **Cloudflare Pages** → your project → **Custom domains** → add domain.
2. Follow Cloudflare DNS instructions (CNAME or nameservers).
3. **Google Cloud Console** → OAuth Web Client → **Authorized JavaScript origins**:
   - Add `https://your-domain.com` (keep `pages.dev` and `localhost:5173`).
4. **Cloudflare Pages** → Environment variables → update and redeploy:
   - `VITE_SITE_URL=https://your-domain.com`
   - `VITE_PLAUSIBLE_DOMAIN=your-domain.com` (register in Plausible too).
5. Smoke test sign-in and `/demo` on the new domain.

No application code changes are required — see HLD §8.1 (hosting is swappable).
