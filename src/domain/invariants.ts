import type { PlayAction, PlayDocument, PlayerId } from "./types";
import { isOffenseId } from "./schemas";
import { isZoneId } from "./zones";

export class StructuralInvariantError extends Error {
  public constructor(public readonly details: string[]) {
    super(details.join(" "));
    this.name = "StructuralInvariantError";
  }
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function isFinitePoint(point: { x: number; y: number }): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function playerIds(document: PlayDocument): Set<PlayerId> {
  return new Set(document.players.map((player) => player.id));
}

export function findStructuralInvariantFailures(document: PlayDocument): string[] {
  const failures: string[] = [];
  const ids = playerIds(document);

  if (!unique(document.players.map((player) => player.id))) {
    failures.push("Player IDs must be unique.");
  }
  if (!unique(document.actions.map((action) => action.id))) {
    failures.push("Action IDs must be unique.");
  }
  if (!isOffenseId(document.ballOwnerId) || !ids.has(document.ballOwnerId)) {
    failures.push("Ball owner must reference an offensive player in the document.");
  }
  for (const player of document.players) {
    if (!isZoneId(player.startingZone) || !isFinitePoint(player.startingPosition)) {
      failures.push(`Player ${player.id} has an invalid starting position.`);
    }
    if (player.matchupId !== undefined && !ids.has(player.matchupId)) {
      failures.push(`Player ${player.id} has an invalid matchup reference.`);
    }
  }
  for (const action of document.actions) {
    validateActionStructuralReferences(action, ids, failures);
  }
  return failures;
}

function validateActionStructuralReferences(
  action: PlayAction,
  ids: Set<PlayerId>,
  failures: string[],
): void {
  if (!isOffenseId(action.actorId) || !ids.has(action.actorId)) {
    failures.push(`Action ${action.id} has an invalid actor reference.`);
  }
  if ("targetPlayerId" in action && action.targetPlayerId !== undefined && (!isOffenseId(action.targetPlayerId) || !ids.has(action.targetPlayerId))) {
    failures.push(`Action ${action.id} has an invalid target reference.`);
  }
  if ("destinationZone" in action && action.destinationZone !== undefined && !isZoneId(action.destinationZone)) {
    failures.push(`Action ${action.id} has an invalid destination zone.`);
  }
  if (action.destinationPosition !== undefined && !isFinitePoint(action.destinationPosition)) {
    failures.push(`Action ${action.id} has an invalid destination point.`);
  }
  if (!Number.isFinite(action.startSecond) || action.startSecond < 0 || !Number.isFinite(action.durationSecond) || action.durationSecond <= 0) {
    failures.push(`Action ${action.id} has invalid timing.`);
  }
  if (action.locked !== (action.lockOwner === "coach")) {
    failures.push(`Action ${action.id} has inconsistent lock metadata.`);
  }
  if (action.createdAtRevision < 1 || action.updatedAtRevision < action.createdAtRevision) {
    failures.push(`Action ${action.id} has inconsistent revision metadata.`);
  }
}

export function assertStructuralInvariants(document: PlayDocument): void {
  const failures = findStructuralInvariantFailures(document);
  if (failures.length > 0) {
    throw new StructuralInvariantError(failures);
  }
}
