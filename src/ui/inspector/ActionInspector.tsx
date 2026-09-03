import { useState } from "react";

import { COACH_UI } from "../../application/commandMetadata";
import { playCommands } from "../../application/commands";
import type { CommandResult } from "../../application/commandResults";
import { ZONE_IDS } from "../../domain/zones";
import type { PlayAction } from "../../domain/types";

interface ActionInspectorProps {
  action?: PlayAction;
  revision: number;
  onResult: (result: CommandResult<unknown>) => void;
}

interface ActionDraft {
  startSecond: string;
  durationSecond: string;
  destinationZone?: string;
  label: string;
}

function createDraft(action: PlayAction): ActionDraft {
  return {
    startSecond: String(action.startSecond),
    durationSecond: String(action.durationSecond),
    destinationZone: "destinationZone" in action ? action.destinationZone : undefined,
    label: action.label ?? "",
  };
}

function hasDestination(action: PlayAction): action is Extract<PlayAction, { destinationZone: string }> {
  return action.type === "move" || action.type === "dribble" || action.type === "screen";
}

function present(value: string | undefined): string {
  return value === undefined ? "—" : value.replaceAll("_", " ");
}

export function ActionInspector({ action, revision, onResult }: ActionInspectorProps) {
  const [draft, setDraft] = useState<ActionDraft | undefined>(action === undefined ? undefined : createDraft(action));

  if (action === undefined || draft === undefined) {
    return (
      <section className="rail-section inspector" aria-labelledby="inspector-title">
        <div className="panel-heading"><h2 id="inspector-title">Action inspector</h2><span>—</span></div>
        <p className="empty-state">Select an action on the court or timeline to inspect it.</p>
      </section>
    );
  }
  const selectedAction = action;
  const actionDraft = draft;

  function updateDraft(field: keyof ActionDraft, value: string): void {
    setDraft((current) => current === undefined ? current : { ...current, [field]: value });
  }

  function apply(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const startSecond = Number(actionDraft.startSecond);
    const durationSecond = Number(actionDraft.durationSecond);
    if (!Number.isFinite(startSecond) || startSecond < 0 || !Number.isFinite(durationSecond) || durationSecond <= 0) {
      onResult({ ok: false, revision, code: "INVALID_INPUT", message: "Start must be nonnegative and duration must be greater than zero." });
      return;
    }
    const patch: Record<string, string | number> = {};
    if (startSecond !== selectedAction.startSecond) patch.startSecond = startSecond;
    if (durationSecond !== selectedAction.durationSecond) patch.durationSecond = durationSecond;
    if (actionDraft.label !== (selectedAction.label ?? "")) patch.label = actionDraft.label;
    if (hasDestination(selectedAction) && actionDraft.destinationZone !== selectedAction.destinationZone) patch.destinationZone = actionDraft.destinationZone ?? selectedAction.destinationZone;
    if (Object.keys(patch).length === 0) {
      onResult({ ok: false, revision, code: "INVALID_INPUT", message: "No action changes to apply." });
      return;
    }
    onResult(playCommands.updateAction({ actionId: selectedAction.id, patch, expectedRevision: revision }, COACH_UI));
  }

  function toggleLock(): void {
    onResult(playCommands.setActionLocked({ actionId: selectedAction.id, locked: !selectedAction.locked, expectedRevision: revision }, COACH_UI));
  }

  return (
    <section className="rail-section inspector" aria-labelledby="inspector-title">
      <div className="panel-heading"><h2 id="inspector-title">Action inspector</h2><span>{selectedAction.id}</span></div>
      <dl className="action-details">
        <div><dt>Type</dt><dd>{selectedAction.type}</dd></div>
        <div><dt>Actor</dt><dd>{selectedAction.actorId}</dd></div>
        <div><dt>Target</dt><dd>{"targetPlayerId" in selectedAction ? selectedAction.targetPlayerId : "—"}</dd></div>
        <div><dt>Screen</dt><dd>{"screenType" in selectedAction ? present(selectedAction.screenType) : "—"}</dd></div>
        <div><dt>Path</dt><dd>{present(selectedAction.pathStyle)}</dd></div>
        <div><dt>End</dt><dd>{(selectedAction.startSecond + selectedAction.durationSecond).toFixed(2)}s</dd></div>
        <div><dt>Lock</dt><dd>{selectedAction.locked ? "🔒 Coach locked" : "Unlocked"}</dd></div>
        <div><dt>Created</dt><dd>{selectedAction.createdBy}</dd></div>
        <div><dt>Modified</dt><dd>{selectedAction.lastModifiedBy} · r{selectedAction.updatedAtRevision}</dd></div>
      </dl>
      {selectedAction.locked ? <p className="lock-notice" role="status">Coach locked — tactical fields are protected from agent edits.</p> : null}
      <form className="inspector-form" onSubmit={apply} noValidate>
        <label>Start second<input type="number" step="0.01" min="0" value={actionDraft.startSecond} disabled={selectedAction.locked} onChange={(event) => updateDraft("startSecond", event.target.value)} /></label>
        <label>Duration second<input type="number" step="0.01" min="0.01" value={actionDraft.durationSecond} disabled={selectedAction.locked} onChange={(event) => updateDraft("durationSecond", event.target.value)} /></label>
        {hasDestination(selectedAction) ? (
          <label>Destination<select value={actionDraft.destinationZone} disabled={selectedAction.locked} onChange={(event) => updateDraft("destinationZone", event.target.value)}>
            {ZONE_IDS.map((zoneId) => <option key={zoneId} value={zoneId}>{zoneId.replaceAll("_", " ")}</option>)}
          </select></label>
        ) : null}
        <label>Label<input maxLength={60} value={actionDraft.label} disabled={selectedAction.locked} onChange={(event) => updateDraft("label", event.target.value)} /></label>
        <div className="inspector-form__actions">
          <button className="primary-button" type="submit" disabled={selectedAction.locked}>Apply action</button>
          <button className="secondary-button" type="button" onClick={toggleLock}>{selectedAction.locked ? "Unlock action" : "Lock action"}</button>
        </div>
      </form>
    </section>
  );
}
