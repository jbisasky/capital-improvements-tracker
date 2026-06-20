import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  EXTRACTION_SCHEMA,
  buildGenerateContentUrl,
  parseGeminiErrorMessage,
  mapGeminiHttpError,
  extractFromDocument,
  testGeminiKey,
} from "./gemini";
import { saveGeminiKey, clearGeminiKey } from "./gemini-key";

function schemaPropertyTypes(schema: typeof EXTRACTION_SCHEMA): unknown[] {
  return Object.values(schema.properties).map((prop) => prop.type);
}

describe("EXTRACTION_SCHEMA", () => {
  it("uses single-string type fields compatible with Gemini (no JSON Schema unions)", () => {
    // Arrange
    const types = schemaPropertyTypes(EXTRACTION_SCHEMA);

    // Assert
    for (const type of types) {
      expect(Array.isArray(type)).toBe(false);
    }
  });

  it("does not include null in enum arrays", () => {
    const properties = Object.values(EXTRACTION_SCHEMA.properties);

    for (const prop of properties) {
      if (!("enum" in prop)) continue;
      expect(prop.enum).not.toContain(null);
    }
  });

  it("marks optional fields with nullable instead of union types", () => {
    expect(EXTRACTION_SCHEMA.properties.completionDate).toEqual({
      type: "string",
      nullable: true,
    });
    expect(EXTRACTION_SCHEMA.properties.totalCost).toEqual({
      type: "number",
      nullable: true,
    });
  });
});

describe("buildGenerateContentUrl", () => {
  it("URL-encodes special characters in the API key", () => {
    // Arrange
    const key = "AQ.test+key/with=special&chars";

    // Act
    const url = buildGenerateContentUrl(key);

    // Assert
    expect(url).toContain("key=AQ.test%2Bkey%2Fwith%3Dspecial%26chars");
    expect(url).not.toContain("key=AQ.test+key");
  });
});

describe("parseGeminiErrorMessage", () => {
  it("extracts the message from a Gemini error body", () => {
    const body = {
      error: {
        code: 400,
        message: "Invalid JSON payload received.",
        status: "INVALID_ARGUMENT",
      },
    };

    expect(parseGeminiErrorMessage(body)).toBe("Invalid JSON payload received.");
  });

  it("returns null for non-object bodies", () => {
    expect(parseGeminiErrorMessage(null)).toBeNull();
    expect(parseGeminiErrorMessage("error")).toBeNull();
  });
});

describe("mapGeminiHttpError", () => {
  it("maps API key errors to the Settings message", () => {
    const error = mapGeminiHttpError(400, {
      error: { message: "API key not valid. Please pass a valid API key." },
    });

    expect(error.message).toBe("Invalid API key. Check your Gemini key in Settings.");
  });

  it("does not mislabel schema errors as invalid API keys", () => {
    const error = mapGeminiHttpError(400, {
      error: {
        message:
          "Invalid JSON payload received. Unknown name \"type\" at 'generation_config.response_schema.properties[1].value'",
        status: "INVALID_ARGUMENT",
      },
    });

    expect(error.message).not.toContain("Invalid API key");
    expect(error.message).toContain("Gemini rejected the extraction request");
  });

  it("maps 403 to a permission message", () => {
    const error = mapGeminiHttpError(403, {
      error: { message: "Permission denied" },
    });

    expect(error.message).toContain("permission");
  });

  it("maps 429 to rate limited", () => {
    const error = mapGeminiHttpError(429, null);

    expect(error.code).toBe("RATE_LIMITED");
  });
});

describe("extractFromDocument", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    clearGeminiKey();
    saveGeminiKey("test-key", { expiryDays: 30, sessionOnly: false });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearGeminiKey();
  });

  it("sends a Gemini-compatible response_schema in the request body", async () => {
    // Arrange
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          finishReason: "STOP",
          content: {
            parts: [{
              text: JSON.stringify({
                title: "Roof repair",
                completionDate: "2024-01-15",
                totalCost: 1000,
                suggestedTreatment: "capital_improvement",
                costBasisAdjustment: 1000,
                deductibleAmount: 0,
                irsJustification: "Adds to basis.",
                vendor: "Acme Roofing",
                confidence: 0.9,
              }),
            }],
          },
        }],
        usageMetadata: { totalTokenCount: 42 },
      }),
    });

    const file = new File(["%PDF-1.4 test"], "invoice.pdf", { type: "application/pdf" });

    // Act
    await extractFromDocument(file);

    // Assert
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(typeof init.body).toBe("string");
    const body = JSON.parse(init.body as string) as {
      generationConfig: { response_schema: typeof EXTRACTION_SCHEMA };
    };
    expect(body.generationConfig.response_schema).toEqual(EXTRACTION_SCHEMA);
    expect(buildGenerateContentUrl("test-key")).toBe(fetchMock.mock.calls[0]?.[0]);
  });

  it("surfaces schema rejection without blaming the API key", async () => {
    // Arrange
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        error: {
          message: "Invalid JSON payload received. Unknown name \"type\"",
          status: "INVALID_ARGUMENT",
        },
      }),
    });

    const file = new File(["%PDF-1.4 test"], "invoice.pdf", { type: "application/pdf" });

    // Act
    const result = await extractFromDocument(file);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).not.toContain("Invalid API key");
    expect(result.error.message).toContain("Gemini rejected the extraction request");
  });
});

describe("testGeminiKey", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("URL-encodes keys with special characters", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    await testGeminiKey("AQ.key+plus");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(buildGenerateContentUrl("AQ.key+plus"));
  });
});
