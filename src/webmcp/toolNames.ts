export const WEBMCP_TOOL_NAMES = ["get_play_state", "add_play_actions", "validate_play", "animate_play"] as const;
/** Compatibility alias for the active P0 surface. */
export const P0_WEBMCP_TOOL_NAMES = WEBMCP_TOOL_NAMES;
export type P0WebMcpToolName = (typeof WEBMCP_TOOL_NAMES)[number];
