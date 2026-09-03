import type { Player, PlayerId, Point } from "../../domain/types";

const COURT_DISPLAY_MARGIN = 4;
const LABEL_HORIZONTAL_MARGIN = 6;

/** Maps saved normalized court coordinates into the marker-safe SVG display area. */
export function toCourtDisplayPoint(point: Point): Point {
  return {
    x: Math.min(100 - COURT_DISPLAY_MARGIN, Math.max(COURT_DISPLAY_MARGIN, point.x)),
    y: Math.min(100 - COURT_DISPLAY_MARGIN, Math.max(COURT_DISPLAY_MARGIN, point.y)),
  };
}

export function toCourtLabelDisplayPoint(point: Point): Point {
  return {
    x: Math.min(100 - LABEL_HORIZONTAL_MARGIN, Math.max(LABEL_HORIZONTAL_MARGIN, point.x)),
    y: Math.min(100 - COURT_DISPLAY_MARGIN, Math.max(COURT_DISPLAY_MARGIN, point.y)),
  };
}

/** Keeps the first player at the saved display point and fans out exact visual collisions. */
export function getCourtPlayerDisplayPoint(players: Player[], playerId: PlayerId): Point {
  const playerIndex = players.findIndex((player) => player.id === playerId);
  const player = players[playerIndex];
  if (player === undefined) {
    return { x: 50, y: 50 };
  }

  const base = toCourtDisplayPoint(player.startingPosition);
  const collisionIndex = players
    .slice(0, playerIndex)
    .map((candidate) => toCourtDisplayPoint(candidate.startingPosition))
    .filter((candidate) => candidate.x === base.x && candidate.y === base.y)
    .length;

  if (collisionIndex === 0) {
    return base;
  }

  const distance = 7 * Math.ceil(collisionIndex / 2);
  const preferredDirection = collisionIndex % 2 === 1 ? 1 : -1;
  const preferredX = base.x + (distance * preferredDirection);
  const x = preferredX > 96 || preferredX < 4
    ? base.x - (distance * preferredDirection)
    : preferredX;

  return toCourtDisplayPoint({ x, y: base.y });
}
