/**
 * Typed fetch wrapper — auth header injection, retry with backoff, 401 handling.
 * See LLD §1.4 and §1.5.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError, type ErrorCode } from "@/domain/errors";
import { getAccessToken, ensureFreshToken } from "@/services/auth";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | Blob;
  timeout?: number;
  skipAuth?: boolean;
}

function statusToErrorCode(status: number): ErrorCode {
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "AUTH_EXPIRED";
  if (status === 404) return "DRIVE_NOT_FOUND";
  if (status === 409 || status === 412) return "DRIVE_CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  return "NETWORK_ERROR";
}

function jitteredDelay(attempt: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, MAX_DELAY_MS);
  return Math.random() * capped;
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get("Retry-After");
  if (header == null) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function httpFetch<T>(
  url: string,
  options: HttpOptions = {},
): Promise<Result<T>> {
  const { method = "GET", headers = {}, body, timeout = DEFAULT_TIMEOUT_MS, skipAuth = false } = options;

  let did401Retry = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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

      if (response.ok) {
        const contentType = response.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await response.json()) as T;
          return ok(data);
        }
        // For non-JSON responses (e.g. raw file content), return text as unknown
        const text = await response.text();
        return ok(text as unknown as T);
      }

      // 401 — attempt one silent refresh + replay
      if (response.status === 401 && !did401Retry && !skipAuth) {
        did401Retry = true;
        const freshToken = await ensureFreshToken();
        if (freshToken != null) {
          continue;
        }
        return err(appError("AUTH_REQUIRED", "Authentication required"));
      }

      // Non-retryable status
      if (!RETRYABLE_STATUSES.has(response.status)) {
        const errorText = await response.text().catch(() => "");
        return err(
          appError(
            statusToErrorCode(response.status),
            `HTTP ${String(response.status)}: ${errorText}`,
          ),
        );
      }

      // Retryable — compute delay
      if (attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = parseRetryAfter(response);
        const delay = retryAfter ?? jitteredDelay(attempt);
        await sleep(delay);
      }
    } catch (error: unknown) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === "AbortError") {
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(jitteredDelay(attempt));
          continue;
        }
        return err(appError("NETWORK_ERROR", "Request timed out"));
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(jitteredDelay(attempt));
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

  return err(appError("NETWORK_ERROR", "Max retry attempts exceeded"));
}
