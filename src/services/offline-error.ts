import { err, type Result } from "@/domain/result";

export const OFFLINE_ERROR_CODE = "OFFLINE";

export const OFFLINE_WRITE_MESSAGE =
  "You're offline — viewing last synced data. Write operations are disabled until connectivity returns.";

export function offlineWriteResult<T>(): Result<T> {
  return err({
    code: OFFLINE_ERROR_CODE,
    message: OFFLINE_WRITE_MESSAGE,
  });
}

export function isOfflineWriteError(error: { code: string }): boolean {
  return error.code === OFFLINE_ERROR_CODE;
}
