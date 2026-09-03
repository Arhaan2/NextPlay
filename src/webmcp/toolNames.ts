export const P0_WEBMCP_TOOL_NAMES = [
  "get_play_state",
  "add_play_actions",
] as const;

export type P0WebMcpToolName = (typeof P0_WEBMCP_TOOL_NAMES)[number];
