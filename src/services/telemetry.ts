/**
 * OpenTelemetry browser instrumentation — exports traces to Honeycomb.
 * Silently no-ops when VITE_HONEYCOMB_API_KEY is unset (local dev default).
 *
 * All OTel packages are dynamically imported so Vite code-splits them into a
 * separate chunk (~100 kB gzipped) that is only fetched when the API key is
 * present, keeping the initial bundle lean.
 *
 * @see LLD §19, EARS §30 (OTEL-01–17)
 */

const HONEYCOMB_ENDPOINT = "https://api.honeycomb.io/v1/traces";

let initialized = false;

export async function initTelemetry(): Promise<void> {
  const apiKey = import.meta.env["VITE_HONEYCOMB_API_KEY"] as string | undefined;
  if (!apiKey || initialized) return;

  initialized = true;

  const sampleRate = parseFloat(
    (import.meta.env["VITE_OTEL_SAMPLE_RATE"] as string | undefined) ?? "0.1",
  );

  const [
    { WebTracerProvider },
    { BatchSpanProcessor },
    { OTLPTraceExporter },
    { resourceFromAttributes },
    { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
    { registerInstrumentations },
    { getWebAutoInstrumentations },
  ] = await Promise.all([
    import("@opentelemetry/sdk-trace-web"),
    import("@opentelemetry/sdk-trace-base"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/semantic-conventions"),
    import("@opentelemetry/instrumentation"),
    import("@opentelemetry/auto-instrumentations-web"),
  ]);

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
