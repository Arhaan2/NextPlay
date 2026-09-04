import type { KeyboardEvent } from "react";

import { actionLabel, getStaticActionGeometry } from "../../engine/geometry/actionGeometry";
import type { PlayAction, PlayDocument } from "../../domain/types";

interface ActionPathProps {
  action: PlayAction;
  document: PlayDocument;
  selected: boolean;
  onSelect: (actionId: string) => void;
}

function selectWithKeyboard(event: KeyboardEvent<SVGGElement>, actionId: string, onSelect: (id: string) => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect(actionId);
  }
}

export function ActionPath({ action, document, selected, onSelect }: ActionPathProps) {
  const geometry = getStaticActionGeometry(document, action);
  const classNames = [
    "court-action",
    `court-action--${action.type}`,
    selected ? "is-selected" : "",
    action.locked ? "is-locked" : "",
    action.lastModifiedBy === "coach" ? "is-coach-modified" : "",
  ].filter(Boolean).join(" ");

  return (
    <g
      className={classNames}
      data-testid={`court-action-${action.id}`}
      data-action-id={action.id}
      role="button"
      tabIndex={0}
      aria-label={`${action.id}: ${actionLabel(action)}${action.locked ? ". Coach locked." : ""} Select action.`}
      aria-pressed={selected}
      onClick={() => onSelect(action.id)}
      onKeyDown={(event) => selectWithKeyboard(event, action.id, onSelect)}
    >
      <path className="court-action__hit-area" d={geometry.path} />
      <path className="court-action__line" d={geometry.path} markerEnd="url(#nextplay-action-arrow)" />
      {geometry.screenBar !== undefined ? (
        <path
          className="court-action__screen-bar"
          d={`M ${geometry.screenBar.from.x} ${geometry.screenBar.from.y} L ${geometry.screenBar.to.x} ${geometry.screenBar.to.y}`}
        />
      ) : null}
      <g className="court-action__label" pointerEvents="none">
        <rect x={geometry.labelAnchor.x - 5} y={geometry.labelAnchor.y - 3.2} width="10" height="4.5" rx="1" />
        <text x={geometry.labelAnchor.x} y={geometry.labelAnchor.y - 0.2} textAnchor="middle">
          {action.locked ? "▣ " : ""}{actionLabel(action)}
        </text>
      </g>
      {action.locked ? (
        <g className="court-action__lock-badge" aria-hidden="true" pointerEvents="none">
          <circle cx={geometry.labelAnchor.x + 4.1} cy={geometry.labelAnchor.y - 3.1} r="1.45" />
          <path d={`M ${geometry.labelAnchor.x + 3.45} ${geometry.labelAnchor.y - 3.05} V ${geometry.labelAnchor.y - 3.7} A 0.65 0.65 0 0 1 ${geometry.labelAnchor.x + 4.75} ${geometry.labelAnchor.y - 3.7} V ${geometry.labelAnchor.y - 3.05}`} />
        </g>
      ) : null}
    </g>
  );
}
