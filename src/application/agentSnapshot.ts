import type {
  ApplicationState,
  OffenseId,
  PathStyle,
  Player,
  PlayAction,
  Point,
  ScreenType,
  ZoneId,
} from "../domain/types";
import { actionEndSecond } from "../engine/time/seconds";

export interface AgentPlayerSnapshot {
  id: Player["id"];
  team: Player["team"];
  role: string;
  startingZone: Player["startingZone"];
  startingPosition: Player["startingPosition"];
  matchupId?: Player["matchupId"];
  lastModifiedBy: Player["lastModifiedBy"];
}

export interface AgentActionSnapshot {
  id: string;
  type: PlayAction["type"];
  actorId: PlayAction["actorId"];
  targetPlayerId?: OffenseId;
  destinationZone?: ZoneId;
  destinationPosition?: Point;
  startSecond: number;
  durationSecond: number;
  endSecond: number;
  pathStyle?: PathStyle;
  screenType?: ScreenType;
  label?: string;
  locked: boolean;
  lockOwner?: "coach";
  createdBy: PlayAction["createdBy"];
  lastModifiedBy: PlayAction["lastModifiedBy"];
  updatedAtRevision: number;
}

export interface CompactAgentActionSnapshot {
  id: string;
  type: PlayAction["type"];
  actorId: PlayAction["actorId"];
  startSecond: number;
  endSecond: number;
  locked: boolean;
}

export interface AgentPlaySnapshot {
  revision: number;
  title: string;
  scenario: ApplicationState["document"]["scenario"];
  clockSeconds: number;
  defenseScheme: ApplicationState["document"]["defenseScheme"];
  targetOutcome?: string;
  ballOwnerId: ApplicationState["document"]["ballOwnerId"];
  players: AgentPlayerSnapshot[];
  actions: AgentActionSnapshot[] | CompactAgentActionSnapshot[];
  lockedActionIds: string[];
  lockedActionCount: number;
  validationStatus: ApplicationState["session"]["validation"]["status"];
  validation: ApplicationState["session"]["validation"];
}

function snapshotPlayer(player: Player): AgentPlayerSnapshot {
  return {
    id: player.id,
    team: player.team,
    role: player.role,
    startingZone: player.startingZone,
    startingPosition: { ...player.startingPosition },
    ...(player.matchupId === undefined ? {} : { matchupId: player.matchupId }),
    lastModifiedBy: player.lastModifiedBy,
  };
}

function snapshotEndSecond(action: PlayAction): number {
  return actionEndSecond(action);
}

export function createAgentActionSnapshot(action: PlayAction): AgentActionSnapshot {
  const targetPlayerId = "targetPlayerId" in action ? action.targetPlayerId : undefined;
  const destinationZone = "destinationZone" in action ? action.destinationZone : undefined;
  const screenType = "screenType" in action ? action.screenType : undefined;
  return {
    id: action.id,
    type: action.type,
    actorId: action.actorId,
    ...(targetPlayerId === undefined ? {} : { targetPlayerId }),
    ...(destinationZone === undefined ? {} : { destinationZone }),
    ...(action.destinationPosition === undefined
      ? {}
      : { destinationPosition: { ...action.destinationPosition } }),
    startSecond: action.startSecond,
    durationSecond: action.durationSecond,
    endSecond: snapshotEndSecond(action),
    ...(action.pathStyle === undefined ? {} : { pathStyle: action.pathStyle }),
    ...(screenType === undefined ? {} : { screenType }),
    ...(action.label === undefined ? {} : { label: action.label }),
    locked: action.locked,
    ...(action.lockOwner === undefined ? {} : { lockOwner: action.lockOwner }),
    createdBy: action.createdBy,
    lastModifiedBy: action.lastModifiedBy,
    updatedAtRevision: action.updatedAtRevision,
  };
}

function compactAction(action: PlayAction): CompactAgentActionSnapshot {
  return {
    id: action.id,
    type: action.type,
    actorId: action.actorId,
    startSecond: action.startSecond,
    endSecond: snapshotEndSecond(action),
    locked: action.locked,
  };
}

/** Builds a fresh, serializable agent view from the current application state. */
export function createAgentPlaySnapshot(
  state: ApplicationState,
  includeActionDetails = true,
): AgentPlaySnapshot {
  const { document, session } = state;
  const lockedActionIds = document.actions
    .filter((action) => action.locked)
    .map((action) => action.id);

  return {
    revision: document.playRevision,
    title: document.title,
    scenario: document.scenario,
    clockSeconds: document.clockSeconds,
    defenseScheme: document.defenseScheme,
    ...(document.targetOutcome === undefined ? {} : { targetOutcome: document.targetOutcome }),
    ballOwnerId: document.ballOwnerId,
    players: document.players.map(snapshotPlayer),
    actions: includeActionDetails
      ? document.actions.map(createAgentActionSnapshot)
      : document.actions.map(compactAction),
    lockedActionIds,
    lockedActionCount: lockedActionIds.length,
    validationStatus: session.validation.status,
    validation: structuredClone(session.validation),
  };
}
