export const OFFENSE_IDS = ["O1", "O2", "O3", "O4", "O5"] as const;
export const DEFENSE_IDS = ["X1", "X2", "X3", "X4", "X5"] as const;

export type OffenseId = (typeof OFFENSE_IDS)[number];
export type DefenseId = (typeof DEFENSE_IDS)[number];
export type PlayerId = OffenseId | DefenseId;
export type Scenario =
  | "sideline_out_of_bounds"
  | "baseline_out_of_bounds"
  | "half_court";
export type DefenseScheme = "man" | "switch_all" | "two_three_zone" | "drop";
export type ActionType = "move" | "dribble" | "screen" | "pass" | "shot";
export type PathStyle =
  | "straight"
  | "curve_left"
  | "curve_right"
  | "curl"
  | "flare"
  | "backdoor"
  | "slip";
export type ScreenType =
  | "pin_down"
  | "flare"
  | "back_screen"
  | "ball_screen"
  | "cross_screen";
export type Actor = "coach" | "agent" | "system";
export type CommandChannel = "ui" | "webmcp" | "preset";
export type ActivityStatus = "started" | "completed" | "failed";

export interface Point {
  x: number;
  y: number;
}

export interface Player {
  id: PlayerId;
  team: "offense" | "defense";
  role: string;
  startingPosition: Point;
  startingZone: ZoneId;
  matchupId?: PlayerId;
  lastModifiedBy: Actor;
}

export type ZoneId =
  | "inbound_left"
  | "inbound_right"
  | "rim"
  | "left_block"
  | "right_block"
  | "left_short_corner"
  | "right_short_corner"
  | "left_corner"
  | "right_corner"
  | "left_elbow"
  | "right_elbow"
  | "nail"
  | "top"
  | "left_slot"
  | "right_slot"
  | "left_wing"
  | "right_wing"
  | "backcourt_center";

interface ActionFields {
  actorId: OffenseId;
  destinationPosition?: Point;
  startSecond: number;
  durationSecond: number;
  pathStyle?: PathStyle;
  label?: string;
}

export interface MoveActionInput extends ActionFields {
  type: "move";
  destinationZone: ZoneId;
}

export interface DribbleActionInput extends ActionFields {
  type: "dribble";
  destinationZone: ZoneId;
}

export interface ScreenActionInput extends ActionFields {
  type: "screen";
  destinationZone: ZoneId;
  targetPlayerId: OffenseId;
  screenType: ScreenType;
}

export interface PassActionInput extends ActionFields {
  type: "pass";
  targetPlayerId: OffenseId;
}

export interface ShotActionInput extends ActionFields {
  type: "shot";
}

export type PlayActionInput =
  | MoveActionInput
  | DribbleActionInput
  | ScreenActionInput
  | PassActionInput
  | ShotActionInput;

export interface ActionPatch {
  destinationZone?: ZoneId;
  destinationPosition?: Point;
  targetPlayerId?: OffenseId;
  startSecond?: number;
  durationSecond?: number;
  pathStyle?: PathStyle;
  screenType?: ScreenType;
  label?: string;
}

export type PlayAction = PlayActionInput & {
  id: string;
  locked: boolean;
  lockOwner?: "coach";
  createdBy: Exclude<Actor, "system">;
  lastModifiedBy: Exclude<Actor, "system">;
  createdAtRevision: number;
  updatedAtRevision: number;
};

export interface PlayDocument {
  id: string;
  playRevision: number;
  title: string;
  scenario: Scenario;
  clockSeconds: number;
  defenseScheme: DefenseScheme;
  targetOutcome?: string;
  ballOwnerId: OffenseId;
  players: Player[];
  actions: PlayAction[];
}

export interface ValidationReport {
  status: "not_run" | "complete";
  errors: unknown[];
  warnings: unknown[];
}

export interface AnimationSessionState {
  status: "idle" | "playing" | "paused";
  currentSecond: number;
  speed: 0.5 | 1 | 1.5 | 2;
  loop: boolean;
}

export interface WebMcpSessionState {
  available: boolean;
  registeredToolNames: string[];
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  actor: Actor;
  channel: CommandChannel;
  operation: string;
  summary: string;
  revisionBefore: number;
  revisionAfter: number;
  status: ActivityStatus;
  details?: unknown;
}

export interface PlaySessionState {
  selectedActionId?: string;
  validation: ValidationReport;
  animation: AnimationSessionState;
  webmcp: WebMcpSessionState;
  activity: ActivityEvent[];
  nextActivitySequence: number;
}

export interface ApplicationState {
  document: PlayDocument;
  session: PlaySessionState;
}
