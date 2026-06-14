/**
 * Type declarations for Google Identity Services (GIS) OAuth2 token client.
 * @see https://developers.google.com/identity/oauth2/web/reference/js-reference
 */

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface TokenClientConfig {
  client_id: string;
  scope: string;
  prompt?: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: GisError) => void;
}

export interface GisError {
  type: string;
  message?: string;
}

export interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

export interface GoogleOAuth2 {
  initTokenClient: (config: TokenClientConfig) => TokenClient;
  revoke: (token: string, callback: () => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleOAuth2;
      };
    };
  }
}
