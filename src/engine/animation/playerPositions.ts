import { getZonePoint } from "../../domain/zones";
import type { PlayerId, PlayAction, PlayDocument, Point } from "../../domain/types";
import { actionEndSecond } from "../time/seconds";
import { interpolatePath } from "./pathInterpolation";

function spatialDestination(action: PlayAction): Point | undefined {
  switch (action.type) { case "move": case "dribble": case "screen": return action.destinationPosition ?? getZonePoint(action.destinationZone); default: return undefined; }
}
export function getPlayerPositionAt(document: PlayDocument, playerId: PlayerId, second: number): Point {
  const player = document.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) return { x: 50, y: 50 };
  if (player.team === "defense") return { ...player.startingPosition };
  let position = { ...player.startingPosition };
  const actions = document.actions.map((action, index) => ({ action, index })).filter(({ action }) => action.actorId === playerId && spatialDestination(action) !== undefined).sort((a, b) => a.action.startSecond - b.action.startSecond || a.index - b.index);
  for (const { action } of actions) {
    const end = actionEndSecond(action); const destination = spatialDestination(action);
    if (destination === undefined) continue;
    if (second < action.startSecond) return position;
    if (second >= end) { position = { ...destination }; continue; }
    return interpolatePath(position, destination, (second - action.startSecond) / action.durationSecond, action.pathStyle);
  }
  return position;
}
export function getPlayDuration(document: PlayDocument): number { return document.actions.reduce((duration, action) => Math.max(duration, actionEndSecond(action)), 0); }
