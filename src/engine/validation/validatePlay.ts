import { OFFENSE_IDS, type OffenseId, type PlayAction, type PlayDocument, type ValidationCheck, type ValidationCheckId, type ValidationErrorCode, type ValidationIssue, type ValidationReport } from "../../domain/types";
import { isZoneId } from "../../domain/zones";
import { actionEndSecond, formatSeconds, stableSeconds } from "../time/seconds";

const labels: Record<ValidationCheckId, string> = { references: "References", clock: "Clock", player_overlap: "Player overlap", inbound_pass: "Inbound pass", shot_present: "Shot present", pass_possession: "Pass possession", shot_possession: "Shot possession" };
const issue = (code: ValidationErrorCode, message: string, fields: Omit<ValidationIssue, "severity" | "code" | "message"> = {}): ValidationIssue => ({ severity: "error", code, message, ...fields });
const hasPlayer = (document: PlayDocument, id: unknown): id is OffenseId => typeof id === "string" && OFFENSE_IDS.includes(id as OffenseId) && document.players.some((player) => player.id === id && player.team === "offense");
const isSupportedActionType = (type: unknown): type is PlayAction["type"] => type === "move" || type === "dribble" || type === "screen" || type === "pass" || type === "shot";
const isScreenType = (screenType: unknown): boolean => screenType === "pin_down" || screenType === "flare" || screenType === "back_screen" || screenType === "ball_screen" || screenType === "cross_screen";

function referenceIssues(document: PlayDocument): ValidationIssue[] {
  const found = new Set<string>(); const errors: ValidationIssue[] = [];
  document.actions.forEach((action, index) => {
    const add = (message: string) => errors.push(issue("INVALID_ACTION_REFERENCE", message, { actionId: action.id, playerId: typeof action.actorId === "string" && OFFENSE_IDS.includes(action.actorId) ? action.actorId : undefined }));
    if (found.has(action.id)) add(`Action ${action.id} has a duplicate action ID.`); found.add(action.id);
    if (!isSupportedActionType(action.type)) { add(`Action ${action.id} has an unsupported action type.`); return; }
    if (!hasPlayer(document, action.actorId)) add(`Action ${action.id} has an invalid offensive actor reference.`);
    if ((action.type === "screen" || action.type === "pass") && !hasPlayer(document, action.targetPlayerId)) add(`Action ${action.id} has an invalid offensive target reference.`);
    if ((action.type === "move" || action.type === "dribble" || action.type === "screen") && !isZoneId(action.destinationZone)) add(`Action ${action.id} has an invalid destination zone.`);
    if (action.type === "screen" && !isScreenType(action.screenType)) add(`Action ${action.id} has an invalid screen type.`);
    if (action.destinationPosition !== undefined && (!Number.isFinite(action.destinationPosition.x) || !Number.isFinite(action.destinationPosition.y))) add(`Action ${action.id} has an invalid destination position.`);
    if (!Number.isFinite(action.startSecond) || action.startSecond < 0 || !Number.isFinite(action.durationSecond) || action.durationSecond <= 0) add(`Action ${action.id} has invalid timing.`);
    if (index < 0) add("Invalid action order.");
  });
  return errors;
}
function clockIssues(document: PlayDocument): ValidationIssue[] { return document.actions.flatMap((action) => { const end = actionEndSecond(action); const over = stableSeconds(end - document.clockSeconds); return end > document.clockSeconds + 1e-9 ? [issue("CLOCK_OVERFLOW", `${action.id} (${action.actorId} ${action.type}) ends at ${formatSeconds(end)}s, after the ${formatSeconds(document.clockSeconds)}s clock by ${formatSeconds(over)}s.`, { actionId: action.id, playerId: action.actorId, startSecond: action.startSecond, endSecond: end, clockSeconds: document.clockSeconds, overBySeconds: over })] : []; }); }
function overlapIssues(document: PlayDocument): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  OFFENSE_IDS.forEach((playerId) => {
    const actions = document.actions.map((action, index) => ({ action, index })).filter(({ action }) => action.actorId === playerId).sort((a,b) => a.action.startSecond - b.action.startSecond || a.index - b.index);
    for (let left = 0; left < actions.length; left += 1) for (let right = left + 1; right < actions.length; right += 1) { const a = actions[left].action; const b = actions[right].action; const start = Math.max(a.startSecond, b.startSecond); const end = Math.min(actionEndSecond(a), actionEndSecond(b)); if (start < end - 1e-9) errors.push(issue("PLAYER_ACTION_OVERLAP", `${playerId} has overlapping actions ${a.id} and ${b.id} from ${formatSeconds(start)}s to ${formatSeconds(end)}s.`, { actionId: a.id, relatedActionId: b.id, playerId, startSecond: stableSeconds(start), endSecond: stableSeconds(end) })); }
  }); return errors;
}
export interface PossessionEvent { time: number; priority: number; action: PlayAction; index: number; kind: "pass_complete" | "pass_start" | "shot_start"; }
export function possessionEvents(document: PlayDocument): PossessionEvent[] { return document.actions.flatMap((action, index): PossessionEvent[] => action.type === "pass" ? [{ time: actionEndSecond(action), priority: 0, action, index, kind: "pass_complete" }, { time: action.startSecond, priority: 1, action, index, kind: "pass_start" }] : action.type === "shot" ? [{ time: action.startSecond, priority: 2, action, index, kind: "shot_start" }] : []).sort((a,b) => a.time - b.time || a.priority - b.priority || a.index - b.index); }
export function possessionIssues(document: PlayDocument): Pick<Record<"pass" | "shot", ValidationIssue[]>, "pass" | "shot"> { let owner: OffenseId = document.ballOwnerId; const validPasses = new Set<string>(); const pass: ValidationIssue[] = []; const shot: ValidationIssue[] = []; for (const event of possessionEvents(document)) { if (event.kind === "pass_start") { if (event.action.actorId === owner) validPasses.add(event.action.id); else pass.push(issue("INVALID_PASS_POSSESSION", `${event.action.id} cannot pass because ${event.action.actorId} does not have the ball; ${owner} does.`, { actionId: event.action.id, playerId: event.action.actorId, expectedOwnerId: event.action.actorId, actualOwnerId: owner, startSecond: event.time })); } else if (event.kind === "pass_complete") { if (validPasses.has(event.action.id) && event.action.type === "pass") owner = event.action.targetPlayerId; } else if (event.action.actorId !== owner) shot.push(issue("INVALID_SHOT_POSSESSION", `${event.action.id} cannot shoot because ${event.action.actorId} does not have the ball; ${owner} does.`, { actionId: event.action.id, playerId: event.action.actorId, expectedOwnerId: event.action.actorId, actualOwnerId: owner, startSecond: event.time })); } return { pass, shot }; }
function check(id: ValidationCheckId, errors: ValidationIssue[], applicable = true): ValidationCheck { return { id, label: labels[id], status: applicable ? (errors.length === 0 ? "passed" : "failed") : "not_applicable", errorCount: errors.length }; }
export function validatePlay(document: PlayDocument): Extract<ValidationReport, { status: "complete" }> {
  const references = referenceIssues(document); const clock = clockIssues(document); const overlaps = overlapIssues(document);
  const inboundApplicable = document.scenario === "sideline_out_of_bounds" || document.scenario === "baseline_out_of_bounds";
  const inbound = inboundApplicable && !document.actions.some((action) => action.type === "pass" && action.actorId === document.ballOwnerId) ? [issue("MISSING_INBOUND_PASS", `An inbound pass from ${document.ballOwnerId} is required for this scenario.`, { playerId: document.ballOwnerId })] : [];
  const shot = document.actions.some((action) => action.type === "shot") ? [] : [issue("MISSING_SHOT", "A shot action is required.")]; const possession = possessionIssues(document);
  const checks = [check("references", references), check("clock", clock), check("player_overlap", overlaps), check("inbound_pass", inbound, inboundApplicable), check("shot_present", shot), check("pass_possession", possession.pass), check("shot_possession", possession.shot)];
  const errors = [...references, ...clock, ...overlaps, ...inbound, ...shot, ...possession.pass, ...possession.shot]; const checksTotal = checks.filter((item) => item.status !== "not_applicable").length;
  return { status: "complete", validatedRevision: document.playRevision, valid: errors.length === 0, checks, checksPassed: checks.filter((item) => item.status === "passed").length, checksTotal, errors, warnings: [] };
}
