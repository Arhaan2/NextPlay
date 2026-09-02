export type CommandErrorCode =
  | "INVALID_INPUT"
  | "STALE_PLAY_STATE"
  | "ACTION_NOT_FOUND"
  | "ACTION_LOCKED"
  | "LOCK_VIOLATION"
  | "INVALID_ACTION_REFERENCE"
  | "UNAUTHORIZED_LOCK_CHANGE";

export interface ValidationCounts {
  errors: number;
  warnings: number;
}

export type CommandResult<T> =
  | { ok: true; revision: number; data: T; validation: ValidationCounts }
  | { ok: false; revision: number; code: CommandErrorCode; message: string; details?: unknown };

export class ExpectedCommandError extends Error {
  public constructor(
    public readonly code: CommandErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ExpectedCommandError";
  }
}

export function commandFailure<T>(
  revision: number,
  error: ExpectedCommandError,
): CommandResult<T> {
  return { ok: false, revision, code: error.code, message: error.message, details: error.details };
}
