import { ActionPath } from "./ActionPath";
import { CourtLines } from "./CourtLines";
import { CourtPlayer } from "./CourtPlayer";
import { getCourtPlayerDisplayPoint, toCourtDisplayPoint } from "../../engine/geometry/displayCoordinates";
import { getBallStateAt } from "../../engine/animation/ballPosition";
import { getPlayerPositionAt } from "../../engine/animation/playerPositions";
import { stableSeconds } from "../../engine/time/seconds";
import type { AnimationSessionState, PlayDocument } from "../../domain/types";

interface CourtProps {
  document: PlayDocument;
  animation: AnimationSessionState;
  selectedActionId?: string;
  onSelectAction: (actionId: string) => void;
}

export function Court({ document, animation, selectedActionId, onSelectAction }: CourtProps) {
  const animated = animation.status !== "idle";
  const ballState = animated ? getBallStateAt(document, animation.currentSecond) : undefined;
  const ballOwner = document.players.find((player) => player.id === document.ballOwnerId);
  const ballOwnerPosition = ballOwner === undefined
    ? undefined
    : getCourtPlayerDisplayPoint(document.players, ballOwner.id);

  return (
    <section className="court-panel" aria-label="Basketball court workspace" data-testid="court" data-animation-status={animation.status} data-animation-current-second={stableSeconds(animation.currentSecond)}>
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
              position={animated && player.team === "offense" ? toCourtDisplayPoint(getPlayerPositionAt(document, player.id, animation.currentSecond)) : getCourtPlayerDisplayPoint(document.players, player.id)}
            />
          ))}
        </g>
        {ballOwner !== undefined && ballOwnerPosition !== undefined ? (() => { const position = ballState === undefined ? ballOwnerPosition : toCourtDisplayPoint(ballState.position); const label = ballState === undefined ? `Ball with ${document.ballOwnerId}` : ballState.ownerId === undefined ? `Ball ${ballState.phase}` : `Ball with ${ballState.ownerId}`; return <g className="ball-marker" data-testid="ball-owner-indicator" role="img" aria-label={label}><circle cx={position.x - 3.2} cy={position.y - 3.2} r="1.35" /><path d={`M ${position.x - 4.45} ${position.y - 3.2} H ${position.x - 1.95}`} /><path d={`M ${position.x - 3.2} ${position.y - 4.45} V ${position.y - 1.95}`} /></g>; })() : null}
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
