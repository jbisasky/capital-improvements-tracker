/**
 * Cloudflare Pages Function — Google OAuth2 token exchange.
 *
 * Google's "Web application" OAuth clients require a client_secret for the
 * authorization-code → token exchange, even with PKCE. To keep the secret
 * off the client, the SPA POSTs the auth code + PKCE verifier here and we
 * perform the exchange server-side, returning only the token payload.
 *
 * Secrets (set via `wrangler pages secret put` or the CF dashboard, and
 * `.dev.vars` locally):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

interface TokenExchangeRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (env.GOOGLE_CLIENT_ID == null || env.GOOGLE_CLIENT_SECRET == null) {
    return json({ error: "server_misconfigured", error_description: "OAuth env vars not set." }, 500);
  }

  let payload: TokenExchangeRequest;
  try {
    payload = (await request.json()) as TokenExchangeRequest;
  } catch {
    return json({ error: "invalid_request", error_description: "Body must be JSON." }, 400);
  }

  const { code, code_verifier, redirect_uri } = payload;
  if (!code || !code_verifier || !redirect_uri) {
    return json(
      { error: "invalid_request", error_description: "code, code_verifier, and redirect_uri are required." },
      400,
    );
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code,
    code_verifier,
    grant_type: "authorization_code",
    redirect_uri,
  });

  const googleRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await googleRes.json()) as Record<string, unknown>;

  // Forward Google's status + body. Strip refresh_token if present — the SPA
  // is access-token-only (in-memory), so we never expose long-lived creds.
  if ("refresh_token" in data) {
    delete data["refresh_token"];
  }

  return json(data, googleRes.status);
};
