import { ActionPath } from "./ActionPath";
import { CourtLines } from "./CourtLines";
import { CourtPlayer } from "./CourtPlayer";
import { getCourtPlayerDisplayPoint } from "../../engine/geometry/displayCoordinates";
import type { PlayDocument } from "../../domain/types";

interface CourtProps {
  document: PlayDocument;
  selectedActionId?: string;
  onSelectAction: (actionId: string) => void;
}

export function Court({ document, selectedActionId, onSelectAction }: CourtProps) {
  const ballOwner = document.players.find((player) => player.id === document.ballOwnerId);
  const ballOwnerPosition = ballOwner === undefined
    ? undefined
    : getCourtPlayerDisplayPoint(document.players, ballOwner.id);

  return (
    <section className="court-panel" aria-label="Basketball court workspace" data-testid="court">
      <svg
        className="court"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Basketball court workspace"
        data-testid="court-placeholder"
      >
        <title>NextPlay half-court tactical diagram</title>
        <defs>
          <marker id="nextplay-action-arrow" markerWidth="5" markerHeight="5" refX="4.3" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 5 2.5 L 0 5 z" />
          </marker>
        </defs>
        <CourtLines />
        <g className="court-actions">
          {document.actions.map((action) => (
            <ActionPath
              key={action.id}
              action={action}
              document={document}
              selected={action.id === selectedActionId}
              onSelect={onSelectAction}
            />
          ))}
        </g>
        <g className="court-players">
          {document.players.map((player) => (
            <CourtPlayer
              key={player.id}
              player={player}
              position={getCourtPlayerDisplayPoint(document.players, player.id)}
            />
          ))}
        </g>
        {ballOwner !== undefined && ballOwnerPosition !== undefined ? (
          <g className="ball-marker" data-testid="ball-owner-indicator" role="img" aria-label={`Ball with ${document.ballOwnerId}`}>
            <circle cx={ballOwnerPosition.x - 3.2} cy={ballOwnerPosition.y - 3.2} r="1.35" />
            <path d={`M ${ballOwnerPosition.x - 4.45} ${ballOwnerPosition.y - 3.2} H ${ballOwnerPosition.x - 1.95}`} />
            <path d={`M ${ballOwnerPosition.x - 3.2} ${ballOwnerPosition.y - 4.45} V ${ballOwnerPosition.y - 1.95}`} />
          </g>
        ) : null}
      </svg>
      {document.actions.length === 0 ? (
        <div className="court-empty-state">
          <p className="eyebrow">Court workspace</p>
          <h2>The board is ready for the first play.</h2>
          <p>Load the canonical sequence in development, or use the coach controls once an action is available.</p>
        </div>
      ) : null}
    </section>
  );
}
