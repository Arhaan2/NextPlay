import { getZonePoint } from "../../domain/zones";
import type { PlayAction, PlayDocument, Point } from "../../domain/types";
import { toCourtDisplayPoint, toCourtLabelDisplayPoint } from "./displayCoordinates";
import { quadraticControlPoint } from "../animation/pathInterpolation";
import { actionEndSecond } from "../time/seconds";

export interface ScreenBarGeometry {
  from: Point;
  to: Point;
}

export interface StaticActionGeometry {
  start: Point;
  end: Point;
  path: string;
  labelAnchor: Point;
  screenBar?: ScreenBarGeometry;
}

function actionEnd(action: PlayAction): number {
  return actionEndSecond(action);
}

function actionPosition(action: PlayAction): Point | undefined {
  switch (action.type) {
    case "move":
    case "dribble":
    case "screen":
      return action.destinationPosition ?? getZonePoint(action.destinationZone);
    case "pass":
    case "shot":
      return undefined;
  }
}

function labelPoint(start: Point, end: Point, control: Point | undefined): Point {
  const base = control === undefined
    ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    : {
      x: (start.x + (2 * control.x) + end.x) / 4,
      y: (start.y + (2 * control.y) + end.y) / 4,
    };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const labelOffset = 8;
  const normal = { x: (-dy / length) * labelOffset, y: (dx / length) * labelOffset };
  const first = toCourtLabelDisplayPoint({ x: base.x + normal.x, y: base.y + normal.y });
  const second = toCourtLabelDisplayPoint({ x: base.x - normal.x, y: base.y - normal.y });
  const firstAdjustment = Math.hypot(first.x - (base.x + normal.x), first.y - (base.y + normal.y));
  const secondAdjustment = Math.hypot(second.x - (base.x - normal.x), second.y - (base.y - normal.y));
  return firstAdjustment <= secondAdjustment ? first : second;
}

function createPath(start: Point, end: Point, control: Point | undefined): string {
  if (control === undefined) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

export function actionLabel(action: PlayAction): string {
  if (action.label !== undefined && action.label.length > 0) {
    return action.label;
  }

  switch (action.type) {
    case "move":
      return "Move";
    case "dribble":
      return "Dribble";
    case "screen":
      return "Screen";
    case "pass":
      return "Pass";
    case "shot":
      return "Shot";
  }
}

/** Returns the last completed spatial destination for a player at a static action boundary. */
export function staticPlayerPosition(document: PlayDocument, playerId: string, boundarySecond: number): Point {
  const candidates = document.actions
    .map((action, index) => ({ action, index, end: actionEnd(action) }))
    .filter(({ action, end }) => action.actorId === playerId && end <= boundarySecond && actionPosition(action) !== undefined)
    .sort((left, right) => left.end - right.end || left.index - right.index);
  const latest = candidates.at(-1)?.action;
  const movedPosition = latest === undefined ? undefined : actionPosition(latest);
  if (movedPosition !== undefined) {
    return movedPosition;
  }

  const player = document.players.find((candidate) => candidate.id === playerId);
  return player?.startingPosition ?? { x: 50, y: 50 };
}

export function getStaticActionGeometry(document: PlayDocument, action: PlayAction): StaticActionGeometry {
  const rawStart = staticPlayerPosition(document, action.actorId, action.startSecond);
  let rawEnd: Point;

  switch (action.type) {
    case "move":
    case "dribble":
    case "screen":
      rawEnd = action.destinationPosition ?? getZonePoint(action.destinationZone);
      break;
    case "pass":
      rawEnd = staticPlayerPosition(document, action.targetPlayerId, actionEnd(action));
      break;
    case "shot":
      rawEnd = getZonePoint("rim");
      break;
  }

  const start = toCourtDisplayPoint(rawStart);
  const end = toCourtDisplayPoint(rawEnd);
  const rawControl = quadraticControlPoint(rawStart, rawEnd, action.pathStyle, action.type === "shot");
  const control = rawControl === undefined ? undefined : toCourtDisplayPoint(rawControl);
  const geometry: StaticActionGeometry = {
    start,
    end,
    path: createPath(start, end, control),
    labelAnchor: labelPoint(start, end, control),
  };

  if (action.type === "screen") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const normalX = length === 0 ? 4 : (-dy / length) * 4;
    const normalY = length === 0 ? 0 : (dx / length) * 4;
    geometry.screenBar = {
      from: toCourtDisplayPoint({ x: end.x - normalX, y: end.y - normalY }),
      to: toCourtDisplayPoint({ x: end.x + normalX, y: end.y + normalY }),
    };
  }

  return geometry;
}
