import type { Player, Point } from "../../domain/types";

interface CourtPlayerProps {
  player: Player;
  position: Point;
}

export function CourtPlayer({ player, position }: CourtPlayerProps) {
  const label = player.team === "offense"
    ? `Offense ${player.id} — ${player.role} — ${player.startingZone.replaceAll("_", " ")}`
    : `Defense ${player.id} — ${player.role}`;

  return (
    <g
      className={`court-player court-player--${player.team}`}
      data-testid={`court-player-${player.id}`}
      role="img"
      aria-label={label}
    >
      <circle cx={position.x} cy={position.y} r="3.1" />
      <text x={position.x} y={position.y + 0.4} textAnchor="middle">
        {player.id}
      </text>
    </g>
  );
}
