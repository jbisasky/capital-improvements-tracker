/**
 * OpenTelemetry browser instrumentation — exports traces to Honeycomb.
 * Silently no-ops when VITE_HONEYCOMB_API_KEY is unset (local dev default).
 *
 * @see LLD §19, EARS §30 (OTEL-01–17)
 */

import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";

const HONEYCOMB_ENDPOINT = "https://api.honeycomb.io/v1/traces";

let initialized = false;

export function initTelemetry(): void {
  const apiKey = import.meta.env["VITE_HONEYCOMB_API_KEY"] as string | undefined;
  if (!apiKey || initialized) return;

  initialized = true;

  const sampleRate = parseFloat(
    (import.meta.env["VITE_OTEL_SAMPLE_RATE"] as string | undefined) ?? "0.1",
  );

  const exporter = new OTLPTraceExporter({
    url: HONEYCOMB_ENDPOINT,
    headers: { "x-honeycomb-team": apiKey },
  });

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "capital-tracker-web",
    [ATTR_SERVICE_VERSION]:
      (import.meta.env["VITE_APP_VERSION"] as string | undefined) ?? "dev",
  });

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
    sampler: { shouldSample: () => ({ decision: Math.random() < sampleRate ? 1 : 0 }) },
  });

  provider.register();

  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        "@opentelemetry/instrumentation-document-load": {},
        "@opentelemetry/instrumentation-user-interaction": {},
        "@opentelemetry/instrumentation-fetch": {
          ignoreUrls: [/plausible\.io/],
        },
        "@opentelemetry/instrumentation-xml-http-request": { enabled: false },
      }),
    ],
  });
}
