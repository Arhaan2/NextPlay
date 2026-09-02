import type { Actor, CommandChannel } from "../domain/types";

export interface CommandMetadata {
  actor: Actor;
  channel: CommandChannel;
  operation: string;
  toolName?: string;
}

export type CommandIdentity = Pick<CommandMetadata, "actor" | "channel" | "toolName">;

export const COACH_UI: CommandIdentity = { actor: "coach", channel: "ui" };
export const AGENT_WEBMCP: CommandIdentity = { actor: "agent", channel: "webmcp" };
export const SYSTEM_PRESET: CommandIdentity = { actor: "system", channel: "preset" };

export function metadataFor(operation: string, identity: CommandIdentity): CommandMetadata {
  return { ...identity, operation };
}
