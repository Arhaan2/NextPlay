import type { KeyboardEvent } from "react";

import { actionLabel } from "../../engine/geometry/actionGeometry";
import { OFFENSE_IDS, type PlayAction } from "../../domain/types";

interface TimelineProps {
  actions: PlayAction[];
  clockSeconds: number;
  currentSecond: number;
  selectedActionId?: string;
  onSelectAction: (actionId: string) => void;
}

function formatSecond(value: number): string {
  return `${value.toFixed(2)}s`;
}

function actionKeyboardSelect(event: KeyboardEvent<HTMLButtonElement>, actionId: string, onSelectAction: (id: string) => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelectAction(actionId);
  }
}

export function Timeline({ actions, clockSeconds, currentSecond, selectedActionId, onSelectAction }: TimelineProps) {
  const timelineRange = Math.max(clockSeconds, ...actions.map((action) => action.startSecond + action.durationSecond), 0.1);

  return (
    <section className="timeline-shell" aria-label={actions.length === 0 ? "No actions yet" : "Player timeline"} aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <p className="eyebrow">Player timeline</p>
        <h2 id="timeline-title">{actions.length === 0 ? "No actions yet" : "Live action timing"}</h2>
        {actions.length === 0 ? <p className="timeline-empty-copy">Actions will appear here after the coach or agent adds them.</p> : null}
      </div>
      <div
        className="timeline-scale"
        aria-label={`Timeline scale ending at ${clockSeconds} seconds`}
        aria-description={timelineRange > clockSeconds ? `Overflow actions extend the visual scale to ${timelineRange.toFixed(2)} seconds.` : undefined}
      >
        <div className="timeline-scale__ticks" aria-hidden="true">
          <span>0.00</span><span>{(timelineRange / 2).toFixed(2)}</span><span>{timelineRange.toFixed(2)}s</span>
        </div>
        {OFFENSE_IDS.map((playerId) => {
          const playerActions = actions.filter((action) => action.actorId === playerId);
          return (
            <div className="timeline-row" key={playerId} data-testid={`timeline-row-${playerId}`}>
              <div className="timeline-row__label">{playerId}</div>
              <div className="timeline-row__track">
                <span className="timeline-playhead" data-testid="timeline-playhead" aria-label={`Animation time ${formatSecond(currentSecond)}`} style={{ left: `${Math.min(100, (currentSecond / timelineRange) * 100)}%` }} />
                <span className="timeline-row__boundary" aria-hidden="true" style={{ left: `${(clockSeconds / timelineRange) * 100}%` }} />
                {playerActions.map((action) => {
                  const start = (action.startSecond / timelineRange) * 100;
                  const width = (action.durationSecond / timelineRange) * 100;
                  const selected = action.id === selectedActionId;
                  return (
                    <button
                      className={`timeline-action timeline-action--${action.type}${selected ? " is-selected" : ""}${action.locked ? " is-locked" : ""}${action.lastModifiedBy === "coach" ? " is-coach-modified" : ""}`}
                      data-testid={`timeline-action-${action.id}`}
                      data-action-id={action.id}
                      key={action.id}
                      type="button"
                      style={{ left: `${start}%`, width: `${Math.max(width, 5)}%` }}
                      aria-pressed={selected}
                      aria-label={`${action.id}, ${actionLabel(action)}, starts ${formatSecond(action.startSecond)}, lasts ${formatSecond(action.durationSecond)}${action.locked ? ", coach locked" : ""}`}
                      onClick={() => onSelectAction(action.id)}
                      onKeyDown={(event) => actionKeyboardSelect(event, action.id, onSelectAction)}
                    >
                      <span>{action.locked ? "▣ " : ""}{actionLabel(action)}</span>
                      <small>{action.id} · {formatSecond(action.startSecond)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
