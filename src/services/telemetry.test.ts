/**
 * Unit tests for telemetry.ts — dynamic-import OTel code-split.
 *
 * Strategy: mock all @opentelemetry/* modules so no real network / browser
 * API is exercised. Verify initTelemetry() is a no-op without an API key and
 * that it wires up the provider exactly once when a key is present.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Stubs for every OTel symbol that telemetry.ts destructures
// ---------------------------------------------------------------------------

const mockRegister = vi.fn();
let providerCtorCallCount = 0;

class MockWebTracerProvider {
  register = mockRegister;
  constructor(_opts?: unknown) {
    providerCtorCallCount++;
  }
}

const mockRegisterInstrumentations = vi.fn();
const mockGetWebAutoInstrumentations = vi.fn(() => []);

vi.mock("@opentelemetry/sdk-trace-web", () => ({
  WebTracerProvider: MockWebTracerProvider,
}));

vi.mock("@opentelemetry/sdk-trace-base", () => ({
  BatchSpanProcessor: vi.fn(),
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: vi.fn(),
}));

vi.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes: vi.fn(() => ({})),
}));

vi.mock("@opentelemetry/semantic-conventions", () => ({
  ATTR_SERVICE_NAME: "service.name",
  ATTR_SERVICE_VERSION: "service.version",
}));

vi.mock("@opentelemetry/instrumentation", () => ({
  registerInstrumentations: mockRegisterInstrumentations,
}));

vi.mock("@opentelemetry/auto-instrumentations-web", () => ({
  getWebAutoInstrumentations: mockGetWebAutoInstrumentations,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetModuleEnv(apiKey: string | undefined): void {
  vi.stubEnv("VITE_HONEYCOMB_API_KEY", apiKey ?? "");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("initTelemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    providerCtorCallCount = 0;
    resetModuleEnv(undefined);
  });

  it("is a no-op and returns void when VITE_HONEYCOMB_API_KEY is absent", async () => {
    // Arrange
    resetModuleEnv(undefined);
    const { initTelemetry } = await import("./telemetry");

    // Act
    await initTelemetry();

    // Assert — no OTel modules should have been touched
    expect(providerCtorCallCount).toBe(0);
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockRegisterInstrumentations).not.toHaveBeenCalled();
  });

  it("is a no-op when VITE_HONEYCOMB_API_KEY is an empty string", async () => {
    // Arrange
    resetModuleEnv("");
    const { initTelemetry } = await import("./telemetry");

    // Act
    await initTelemetry();

    // Assert
    expect(providerCtorCallCount).toBe(0);
  });

  it("initialises the OTel provider when an API key is present", async () => {
    // Arrange
    resetModuleEnv("test-honeycomb-key");
    const { initTelemetry } = await import("./telemetry");

    // Act
    await initTelemetry();

    // Assert
    expect(providerCtorCallCount).toBe(1);
    expect(mockRegister).toHaveBeenCalledOnce();
    expect(mockRegisterInstrumentations).toHaveBeenCalledOnce();
    expect(mockGetWebAutoInstrumentations).toHaveBeenCalledOnce();
  });

  it("only initialises once even if called multiple times (idempotent)", async () => {
    // Arrange
    resetModuleEnv("test-honeycomb-key");
    const { initTelemetry } = await import("./telemetry");

    // Act
    await initTelemetry();
    await initTelemetry();
    await initTelemetry();

    // Assert — provider constructed exactly once despite three calls
    expect(providerCtorCallCount).toBe(1);
    expect(mockRegister).toHaveBeenCalledOnce();
  });

  it("passes the Honeycomb API key as a header to OTLPTraceExporter", async () => {
    // Arrange
    resetModuleEnv("my-secret-key");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
    const { initTelemetry } = await import("./telemetry");

    // Act
    await initTelemetry();

    // Assert
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { "x-honeycomb-team": "my-secret-key" },
      }),
    );
  });
});
