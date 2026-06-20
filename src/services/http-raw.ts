/**
 * Raw fetch wrapper — returns status, headers, and body for non-JSON flows
 * (e.g. Drive resumable upload). See LLD §7.2.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { getAccessToken, ensureFreshToken } from "@/services/auth";

const DEFAULT_TIMEOUT_MS = 60_000;

interface HttpRawOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | Blob | FormData | null;
  timeout?: number;
  skipAuth?: boolean;
}

export interface HttpRawResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  body: ArrayBuffer | null;
  text: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function httpRawFetch(
  url: string,
  options: HttpRawOptions = {},
): Promise<Result<HttpRawResponse>> {
  const {
    method = "GET",
    headers = {},
    body = null,
    timeout = DEFAULT_TIMEOUT_MS,
    skipAuth = false,
  } = options;

  let did401Retry = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const reqHeaders: Record<string, string> = { ...headers };

      if (!skipAuth) {
        const token = getAccessToken();
        if (token != null) {
          reqHeaders["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(url, {
        method,
        headers: reqHeaders,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401 && !did401Retry && !skipAuth) {
        did401Retry = true;
        const freshToken = await ensureFreshToken();
        if (freshToken != null) {
          continue;
        }
        return err(appError("AUTH_REQUIRED", "Authentication required"));
      }

      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);

      return ok({
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        body: buffer.byteLength > 0 ? buffer : null,
        text,
      });
    } catch (error: unknown) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === "AbortError") {
        return err(appError("NETWORK_ERROR", "Request timed out"));
      }
      if (attempt === 0) {
        await sleep(250);
        continue;
      }
      return err(
        appError(
          "NETWORK_ERROR",
          error instanceof Error ? error.message : "Network error",
          error,
        ),
      );
    }
  }

  return err(appError("NETWORK_ERROR", "Request failed"));
}
