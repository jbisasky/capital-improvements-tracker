/**
 * Raw fetch for Drive resumable uploads — returns Response without JSON parsing.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { getAccessToken, ensureFreshToken } from "@/services/auth";

const DEFAULT_TIMEOUT_MS = 120_000;

interface HttpRawOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Blob | ArrayBuffer;
  timeout?: number;
  skipAuth?: boolean;
}

export async function httpFetchRaw(
  url: string,
  options: HttpRawOptions = {},
): Promise<Result<Response>> {
  const {
    method = "GET",
    headers = {},
    body,
    timeout = DEFAULT_TIMEOUT_MS,
    skipAuth = false,
  } = options;

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
      body: body ?? null,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401 && !skipAuth) {
      const freshToken = await ensureFreshToken();
      if (freshToken != null) {
        return await httpFetchRaw(url, { ...options, skipAuth: false });
      }
      return err(appError("AUTH_REQUIRED", "Authentication required"));
    }

    return ok(response);
  } catch (error: unknown) {
    clearTimeout(timer);
    return err(
      appError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error",
        error,
      ),
    );
  }
}
