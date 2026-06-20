/**
 * Gemini multimodal extraction service — BYOK, inline base64, structured JSON output.
 * See LLD §8.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { ExtractionResultSchema, type ExtractionResult } from "@/domain/schemas";
import { getGeminiKey } from "@/services/gemini-key";
import { checkBudget, recordUsage } from "@/services/ai-budget";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash";

const MAX_INLINE_SIZE = 15 * 1024 * 1024; // 15 MiB

const EXTRACTION_PROMPT = `You are a financial document analyzer specializing in home capital improvements for US tax purposes.

Analyze the attached receipt/invoice and extract the following structured information:
- title: A concise project title (e.g. "Roof replacement", "HVAC installation")
- completionDate: The date of service/completion in YYYY-MM-DD format, or null if not found
- totalCost: The total amount paid in dollars (as a number, no $ sign), or null if not found
- suggestedTreatment: Classify as one of: "capital_improvement" (increases home value/extends useful life), "repair" (maintains current condition), "deductible" (for rental/business use), "credit" (qualifies for energy credit), "unknown" (cannot determine)
- costBasisAdjustment: The amount that adds to cost basis (usually same as totalCost for capital improvements), or null
- deductibleAmount: The amount that is deductible (usually 0 for primary residence improvements), or null
- irsJustification: A brief explanation of why this qualifies for the suggested tax treatment, referencing IRS Publication 523 or relevant rules
- vendor: The vendor/contractor business name, or null if not found
- confidence: Your confidence in the extraction accuracy from 0.0 to 1.0
- category: One of "roof", "hvac", "plumbing", "electrical", "landscaping", "kitchen", "bathroom", "flooring", "windows_doors", "insulation", "foundation", "energy_efficiency", "accessibility", "security", "other", or null
- paymentMethod: One of "cash", "check", "credit_card", "financing", "mixed", or null if not determinable
- permitNumber: Any permit number referenced, or null
- receiptDetailLevel: Whether the receipt shows itemized materials/labor line items vs a single lump-sum total. Use "itemized" if a line-item breakdown (materials, labor, parts, etc.) is visible; "lump_sum" if only a total or single-line amount appears; "unclear" if the image is too blurry or ambiguous to tell

Important rules:
- For primary residences, most improvements are capital improvements (add to cost basis), not deductions
- Repairs maintain existing condition; improvements add value or extend useful life
- Energy credits (25C, 25D) apply to qualifying efficiency upgrades
- Be conservative with confidence — if text is unclear or amounts ambiguous, lower the confidence
- Always provide an irsJustification even if confidence is low`;

const MULTI_FILE_SYNTHESIS_PROMPT = `You are a financial document analyzer specializing in home capital improvements for US tax purposes.

The user has attached multiple documents that may relate to ONE home capital improvement project. Documents may include receipts, invoices, payment confirmations, bank statements, permits, or screenshots.

Analyze ALL attached documents together and produce ONE synthesized ExtractionResult for the project:
- Prefer primary source documents (invoices, contractor receipts, itemized bills) over secondary sources (bank statements, payment app screenshots) when they conflict
- When documents disagree, choose the single value most likely to be accurate for tax reporting — do not flag uncertainty in the output; make your best reasoned choice
- Ignore documents that clearly do not describe a home improvement (e.g. unrelated bank activity) rather than letting them dominate fields like title
- Do not automatically sum amounts from different documents unless they clearly represent partial payments for the same single project
- Set confidence based on overall evidence quality across all documents (lower if sources are weak or contradictory)

Extract the following structured information:
- title: A concise project title (e.g. "Roof replacement", "HVAC installation")
- completionDate: The date of service/completion in YYYY-MM-DD format, or null if not found
- totalCost: The total amount paid in dollars (as a number, no $ sign), or null if not found
- suggestedTreatment: Classify as one of: "capital_improvement", "repair", "deductible", "credit", "unknown"
- costBasisAdjustment: The amount that adds to cost basis (usually same as totalCost for capital improvements), or null
- deductibleAmount: The amount that is deductible (usually 0 for primary residence improvements), or null
- irsJustification: A brief explanation of why this qualifies for the suggested tax treatment, referencing IRS Publication 523 or relevant rules
- vendor: The vendor/contractor business name, or null if not found
- confidence: Your confidence in the synthesized extraction from 0.0 to 1.0
- category: One of "roof", "hvac", "plumbing", "electrical", "landscaping", "kitchen", "bathroom", "flooring", "windows_doors", "insulation", "foundation", "energy_efficiency", "accessibility", "security", "other", or null
- paymentMethod: One of "cash", "check", "credit_card", "financing", "mixed", or null if not determinable
- permitNumber: Any permit number referenced, or null
- receiptDetailLevel: "itemized", "lump_sum", or "unclear"

Important rules:
- For primary residences, most improvements are capital improvements (add to cost basis), not deductions
- Repairs maintain existing condition; improvements add value or extend useful life
- Energy credits (25C, 25D) apply to qualifying efficiency upgrades
- Always provide an irsJustification even if confidence is low`;

/** Gemini-compatible response schema (single `type` strings + `nullable`, no union types). */
export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    completionDate: { type: "string", nullable: true },
    totalCost: { type: "number", nullable: true },
    suggestedTreatment: {
      type: "string",
      enum: ["capital_improvement", "repair", "deductible", "credit", "unknown"],
    },
    costBasisAdjustment: { type: "number", nullable: true },
    deductibleAmount: { type: "number", nullable: true },
    irsJustification: { type: "string" },
    vendor: { type: "string", nullable: true },
    confidence: { type: "number" },
    category: {
      type: "string",
      nullable: true,
      enum: [
        "roof", "hvac", "plumbing", "electrical", "landscaping", "kitchen",
        "bathroom", "flooring", "windows_doors", "insulation", "foundation",
        "energy_efficiency", "accessibility", "security", "other",
      ],
    },
    paymentMethod: {
      type: "string",
      nullable: true,
      enum: ["cash", "check", "credit_card", "financing", "mixed"],
    },
    permitNumber: { type: "string", nullable: true },
    receiptDetailLevel: {
      type: "string",
      enum: ["itemized", "lump_sum", "unclear"],
    },
  },
  required: [
    "title", "completionDate", "totalCost", "suggestedTreatment",
    "costBasisAdjustment", "deductibleAmount", "irsJustification",
    "vendor", "confidence", "receiptDetailLevel",
  ],
} as const;

interface GeminiErrorBody {
  error?: {
    message?: string;
    status?: string;
  };
}

/** Build the generateContent URL with a safely encoded API key. */
export function buildGenerateContentUrl(apiKey: string): string {
  return `${GEMINI_API_BASE}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

/** Parse the error message from a Gemini API JSON error body. */
export function parseGeminiErrorMessage(body: unknown): string | null {
  if (typeof body !== "object" || body == null) return null;
  const message = (body as GeminiErrorBody).error?.message;
  return typeof message === "string" && message.length > 0 ? message : null;
}

function isApiKeyInvalidMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("api key not valid")
    || lower.includes("api_key_invalid")
    || lower.includes("invalid api key")
  );
}

/** Map a Gemini HTTP error to a user-facing app error. */
export function mapGeminiHttpError(
  status: number,
  errorBody: unknown,
): ReturnType<typeof appError> {
  const apiMessage = parseGeminiErrorMessage(errorBody);

  if (status === 400) {
    if (apiMessage != null && isApiKeyInvalidMessage(apiMessage)) {
      return appError(
        "AI_EXTRACTION_FAILED",
        "Invalid API key. Check your Gemini key in Settings.",
      );
    }
    if (apiMessage != null) {
      return appError(
        "AI_EXTRACTION_FAILED",
        "Gemini rejected the extraction request. Try again or enter details manually.",
      );
    }
    return appError(
      "AI_EXTRACTION_FAILED",
      "Gemini rejected the extraction request. Try again or enter details manually.",
    );
  }

  if (status === 403) {
    return appError(
      "AI_EXTRACTION_FAILED",
      "API key does not have permission. Ensure the Gemini API is enabled and the key is restricted to it.",
    );
  }

  if (status === 429) {
    return appError("RATE_LIMITED", "Gemini API quota exceeded. Try again later.");
  }

  return appError(
    "AI_EXTRACTION_FAILED",
    `Gemini API error (HTTP ${String(status)}). Try again later.`,
  );
}

async function readGeminiHttpError(response: Response): Promise<ReturnType<typeof appError>> {
  try {
    const body: unknown = await response.json();
    return mapGeminiHttpError(response.status, body);
  } catch {
    return mapGeminiHttpError(response.status, null);
  }
}

export interface ExtractionResponse {
  result: ExtractionResult;
  tokensUsed: number;
}

interface GeminiCandidate {
  content: { parts: { text: string }[] };
  finishReason: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip "data:mime;base64," prefix
      const base64 = dataUrl.split(",")[1];
      if (base64 != null) {
        resolve(base64);
      } else {
        reject(new Error("Failed to encode file"));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

type GeminiContentPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function generateExtractionFromParts(
  parts: GeminiContentPart[],
): Promise<Result<ExtractionResponse>> {
  const apiKey = getGeminiKey();
  if (apiKey == null) {
    return err(
      appError(
        "AI_EXTRACTION_FAILED",
        "No Gemini API key configured. Add your key in Settings.",
      ),
    );
  }

  const budgetCheck = checkBudget();
  if (!budgetCheck.ok) {
    return err(budgetCheck.error);
  }

  const body = JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0,
      response_mime_type: "application/json",
      response_schema: EXTRACTION_SCHEMA,
    },
  });

  let response: Response;
  try {
    response = await fetch(buildGenerateContentUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    return err(appError("NETWORK_ERROR", "Network error connecting to Gemini API."));
  }

  if (!response.ok) {
    return err(await readGeminiHttpError(response));
  }

  let geminiResponse: GeminiResponse;
  try {
    geminiResponse = (await response.json()) as GeminiResponse;
  } catch {
    return err(
      appError("AI_EXTRACTION_FAILED", "Invalid response from Gemini API."),
    );
  }

  const tokensUsed = geminiResponse.usageMetadata?.totalTokenCount ?? 0;
  recordUsage(tokensUsed);

  const candidate = geminiResponse.candidates?.[0];
  if (candidate == null) {
    return err(
      appError("AI_EXTRACTION_FAILED", "No response generated. Try again."),
    );
  }

  if (candidate.finishReason !== "STOP") {
    return err(
      appError(
        "AI_EXTRACTION_FAILED",
        `Extraction incomplete (reason: ${candidate.finishReason}). Enter details manually.`,
      ),
    );
  }

  const text = candidate.content.parts[0]?.text;
  if (text == null) {
    return err(
      appError("AI_EXTRACTION_FAILED", "Empty response from Gemini."),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return err(
      appError(
        "AI_EXTRACTION_FAILED",
        "Could not parse AI response. Enter details manually.",
      ),
    );
  }

  const validated = ExtractionResultSchema.safeParse(parsed);
  if (!validated.success) {
    return err(
      appError(
        "AI_EXTRACTION_FAILED",
        "AI response did not match expected format. Enter details manually.",
      ),
    );
  }

  return ok({ result: validated.data, tokensUsed });
}

/** Extract structured data from a receipt/invoice file using Gemini. */
export async function extractFromDocument(
  file: File,
): Promise<Result<ExtractionResponse>> {
  if (file.size > MAX_INLINE_SIZE) {
    return err(
      appError(
        "AI_EXTRACTION_FAILED",
        `File too large for extraction (${String(Math.round(file.size / 1024 / 1024))} MB). Maximum is 15 MB.`,
      ),
    );
  }

  let base64: string;
  try {
    base64 = await fileToBase64(file);
  } catch {
    return err(
      appError("AI_EXTRACTION_FAILED", "Failed to read the file."),
    );
  }

  return generateExtractionFromParts([
    { text: EXTRACTION_PROMPT },
    { inline_data: { mime_type: file.type, data: base64 } },
  ]);
}

/** Synthesize one project extraction from multiple documents in a single Gemini call. */
export async function extractFromDocumentsCombined(
  files: File[],
): Promise<Result<ExtractionResponse>> {
  if (files.length === 0) {
    return err(appError("AI_EXTRACTION_FAILED", "No files to extract."));
  }

  if (files.length === 1) {
    const file = files[0];
    if (file == null) {
      return err(appError("AI_EXTRACTION_FAILED", "No files to extract."));
    }
    return extractFromDocument(file);
  }

  const parts: GeminiContentPart[] = [{ text: MULTI_FILE_SYNTHESIS_PROMPT }];

  for (const file of files) {
    if (file.size > MAX_INLINE_SIZE) {
      return err(
        appError(
          "AI_EXTRACTION_FAILED",
          `${file.name} is too large (${String(Math.round(file.size / 1024 / 1024))} MB). Maximum is 15 MB per file.`,
        ),
      );
    }

    let base64: string;
    try {
      base64 = await fileToBase64(file);
    } catch {
      return err(
        appError("AI_EXTRACTION_FAILED", `Failed to read ${file.name}.`),
      );
    }

    parts.push({ inline_data: { mime_type: file.type, data: base64 } });
  }

  return generateExtractionFromParts(parts);
}

/** Test if the API key is valid by making a minimal request. */
export async function testGeminiKey(apiKey: string): Promise<Result<void>> {
  try {
    const response = await fetch(buildGenerateContentUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with OK" }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 5 },
      }),
    });

    if (response.ok) return ok(undefined);

    if (response.status === 400 || response.status === 403) {
      return err(
        appError("AI_EXTRACTION_FAILED", "Invalid or restricted API key."),
      );
    }
    if (response.status === 429) {
      return err(appError("RATE_LIMITED", "API key is valid but quota exceeded."));
    }
    return err(
      appError(
        "AI_EXTRACTION_FAILED",
        `Unexpected status ${String(response.status)}.`,
      ),
    );
  } catch {
    return err(appError("NETWORK_ERROR", "Could not connect to Gemini API."));
  }
}
