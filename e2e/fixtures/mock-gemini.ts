import { type Page } from "@playwright/test";

const GEMINI_GLOB = "**/generativelanguage.googleapis.com/**";

/**
 * A valid ExtractionResult payload that passes ExtractionResultSchema.
 * Used as the canned happy-path response.
 */
export const CANNED_EXTRACTION = {
  title: "HVAC System Replacement",
  completionDate: "2025-03-20",
  totalCost: 8500,
  suggestedTreatment: "capital_improvement",
  costBasisAdjustment: 8500,
  deductibleAmount: 0,
  irsJustification: "Full HVAC system replacement extends the useful life of the property.",
  vendor: "AirPro HVAC Services",
  confidence: 0.92,
  category: "hvac",
  paymentMethod: "check",
  permitNumber: null,
  receiptDetailLevel: "itemized",
};

/** A zero-confidence extraction that triggers the non-receipt error path. */
export const ZERO_CONFIDENCE_EXTRACTION = {
  title: "Unknown",
  completionDate: null,
  totalCost: null,
  suggestedTreatment: "unknown",
  costBasisAdjustment: null,
  deductibleAmount: null,
  irsJustification: "",
  vendor: null,
  confidence: 0,
  category: null,
  paymentMethod: null,
  permitNumber: null,
  receiptDetailLevel: "unclear",
};

/**
 * Build the Gemini generateContent response envelope that wraps a JSON-stringified
 * ExtractionResult inside `candidates[0].content.parts[0].text`.
 */
export function buildGeminiSuccessBody(extraction: object): string {
  return JSON.stringify({
    candidates: [
      {
        content: { parts: [{ text: JSON.stringify(extraction) }] },
        finishReason: "STOP",
      },
    ],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
  });
}

/**
 * Install a Gemini API intercept that returns a successful extraction.
 * Must be called before page.goto().
 *
 * @param extraction  Override the default CANNED_EXTRACTION if needed.
 */
export async function setupMockGemini(
  page: Page,
  extraction: object = CANNED_EXTRACTION,
): Promise<void> {
  await page.route(GEMINI_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: buildGeminiSuccessBody(extraction),
    });
  });
}

/**
 * Install a Gemini API intercept that returns an HTTP error.
 * Useful for E5 (network abort), E6 (bad key 400), E7 (zero-confidence).
 */
export async function setupMockGeminiError(
  page: Page,
  status: number,
  errorMessage: string,
): Promise<void> {
  await page.route(GEMINI_GLOB, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: errorMessage } }),
    });
  });
}
