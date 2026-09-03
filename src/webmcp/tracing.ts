import type { PlayCommands } from "../application/commands";
import type { ActivityStatus } from "../domain/types";

export function appendWebMcpActivity(
  commands: PlayCommands,
  event: {
    operation: string;
    toolName: string;
    summary: string;
    revision: number;
    status: Extract<ActivityStatus, "completed" | "failed">;
    details?: unknown;
  },
): void {
  commands.appendActivity({
    actor: "agent",
    channel: "webmcp",
    operation: event.operation,
    toolName: event.toolName,
    summary: event.summary,
    revisionBefore: event.revision,
    revisionAfter: event.revision,
    status: event.status,
    ...(event.details === undefined ? {} : { details: event.details }),
  });
}
