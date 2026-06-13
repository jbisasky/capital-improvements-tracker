/**
 * Discriminated union for type-safe error handling.
 * Service methods return Result<T> rather than throwing,
 * so callers must handle failure explicitly.
 */

export interface AppError {
  code: string;
  message: string;
  cause?: unknown;
}

export interface Ok<T> { ok: true; value: T }
export interface Err<E extends AppError = AppError> { ok: false; error: E }
export type Result<T, E extends AppError = AppError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E extends AppError = AppError>(error: E): Err<E> {
  return { ok: false, error };
}
