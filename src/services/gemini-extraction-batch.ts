/**
 * Multi-file project extraction — one Gemini call synthesizes the best project fields.
 * See LLD §8.5.
 */

import { type Result, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import {
  extractFromDocument,
  extractFromDocumentsCombined,
  type ExtractionResponse,
} from "@/services/gemini";

/** Extract one synthesized project result from one or more documents. */
export async function extractProjectFromDocuments(
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

  return extractFromDocumentsCombined(files);
}
