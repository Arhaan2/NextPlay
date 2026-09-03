import { z } from "zod";

import type { AgentPlaySnapshot } from "../application/agentSnapshot";
import type { CommandErrorCode, CommandResult } from "../application/commandResults";
import type { ActionType, OffenseId } from "../domain/types";

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

export function commandFailureResult(
  result: Extract<CommandResult<unknown>, { ok: false }>,
): ToolFailure {
  return {
    ok: false,
    revision: result.revision,
    code: result.code,
    message: result.message,
    ...(result.details === undefined ? {} : { details: result.details }),
  };
}
