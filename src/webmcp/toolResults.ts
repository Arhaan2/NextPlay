import { z } from "zod";

import type { AgentActionSnapshot, AgentPlaySnapshot } from "../application/agentSnapshot";
import type { CommandErrorCode, CommandResult } from "../application/commandResults";
import type { ActionType, OffenseId, ValidationIssue } from "../domain/types";

export interface ToolValidationError { code: string; actionId?: string; message: string; }

export interface ToolInputIssue {
  path: string;
  message: string;
}

export interface GetPlayStateSuccess {
  ok: true;
  revision: number;
  play: AgentPlaySnapshot;
}

export interface ToolFailure {
  ok: false;
  revision: number;
  code: CommandErrorCode | "INVALID_INPUT" | "WEBMCP_READ_FAILED";
  message: string;
  validationErrorCount?: number;
  errors?: ToolValidationError[];
  details?: unknown;
}

export interface AddPlayActionsSuccess {
  ok: true;
  revision: number;
  added: Array<{ id: string; type: ActionType; actorId: OffenseId; summary: string }>;
  actionCount: number;
  lockedActionsPreserved: number;
}

export function zodIssues(error: z.ZodError): ToolInputIssue[] {
  return error.issues.slice(0, 4).map((issue) => ({
    path: issue.path.length === 0 ? "input" : issue.path.map(String).join("."),
    message: issue.message,
  }));
}

export function invalidInputResult(revision: number, error: z.ZodError): ToolFailure {
  return {
    ok: false,
    revision,
    code: "INVALID_INPUT",
    message: "Tool input is invalid.",
    details: zodIssues(error),
  };
}

function playInvalidErrorDetails(details: unknown): { validationErrorCount: number; errors: ToolValidationError[] } | undefined {
  if (typeof details !== "object" || details === null) return undefined;
  const { errors, validationErrorCount } = details as { errors?: unknown; validationErrorCount?: unknown };
  if (!Array.isArray(errors)) return undefined;
  return { validationErrorCount: typeof validationErrorCount === "number" ? validationErrorCount : errors.length, errors: errors.flatMap((entry): ToolValidationError[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const candidate = entry as { code?: unknown; actionId?: unknown; message?: unknown };
    if (typeof candidate.code !== "string" || typeof candidate.message !== "string") return [];
    return [{ code: candidate.code, ...(typeof candidate.actionId === "string" ? { actionId: candidate.actionId } : {}), message: candidate.message }];
  }) };
}

export function commandFailureResult(
  result: Extract<CommandResult<unknown>, { ok: false }>,
): ToolFailure {
  const playInvalid = result.code === "PLAY_INVALID" ? playInvalidErrorDetails(result.details) : undefined;
  return {
    ok: false,
    revision: result.revision,
    code: result.code,
    message: result.message,
    ...(playInvalid === undefined ? {} : playInvalid),
    ...(result.details === undefined ? {} : { details: result.details }),
  };
}

export interface UpdatePlayActionSuccess {
  ok: true;
  revision: number;
  updated: AgentActionSnapshot;
  changedFields: string[];
  lockedActionsPreserved: string[];
  validation: {
    status: "not_run" | "complete";
    valid?: boolean;
    checksPassed?: number;
    checksTotal?: number;
    errors?: ToolValidationError[];
  };
}

export interface ValidatePlaySuccess { ok: true; revision: number; valid: boolean; checksPassed: number; checksTotal: number; errors: ValidationIssue[]; warnings: ValidationIssue[]; }
export interface AnimatePlaySuccess { ok: true; revision: number; status: "playing"; durationSeconds: number; speed: 0.5 | 1 | 1.5 | 2; loop: boolean; validation: { valid: boolean; errors: number; warnings: number }; }
