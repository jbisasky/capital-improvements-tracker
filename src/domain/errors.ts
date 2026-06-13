import { type AppError } from "@/domain/result";

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "NETWORK_ERROR"
  | "DRIVE_NOT_FOUND"
  | "DRIVE_CONFLICT"
  | "DRIVE_QUOTA"
  | "READ_CORRUPT"
  | "WRITE_FAILED"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "AI_EXTRACTION_FAILED"
  | "AI_BUDGET_EXCEEDED"
  | "RATE_LIMITED"
  | "UNKNOWN";

export function appError(
  code: ErrorCode,
  message: string,
  cause?: unknown,
): AppError {
  return { code, message, cause };
}
