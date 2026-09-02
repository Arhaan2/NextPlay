import type { PlayActionInput, PlayDocument, Player } from "./types";
import { getZonePoint } from "./zones";

const offensivePlayers: Player[] = [
  { id: "O1", team: "offense", role: "inbounder", startingZone: "inbound_right", startingPosition: getZonePoint("inbound_right"), lastModifiedBy: "system" },
  { id: "O2", team: "offense", role: "shooter", startingZone: "right_block", startingPosition: getZonePoint("right_block"), lastModifiedBy: "system" },
  { id: "O3", team: "offense", role: "weak-side wing", startingZone: "left_corner", startingPosition: getZonePoint("left_corner"), lastModifiedBy: "system" },
  { id: "O4", team: "offense", role: "decoy cutter", startingZone: "left_elbow", startingPosition: getZonePoint("left_elbow"), lastModifiedBy: "system" },
  { id: "O5", team: "offense", role: "screener", startingZone: "right_elbow", startingPosition: getZonePoint("right_elbow"), lastModifiedBy: "system" },
];

const defensivePlayers: Player[] = [
  { id: "X1", team: "defense", role: "inbound defender", startingZone: "right_wing", startingPosition: getZonePoint("right_wing"), matchupId: "O1", lastModifiedBy: "system" },
  { id: "X2", team: "defense", role: "shooter defender", startingZone: "right_short_corner", startingPosition: getZonePoint("right_short_corner"), matchupId: "O2", lastModifiedBy: "system" },
  { id: "X3", team: "defense", role: "wing defender", startingZone: "left_wing", startingPosition: getZonePoint("left_wing"), matchupId: "O3", lastModifiedBy: "system" },
  { id: "X4", team: "defense", role: "cutter defender", startingZone: "left_block", startingPosition: getZonePoint("left_block"), matchupId: "O4", lastModifiedBy: "system" },
  { id: "X5", team: "defense", role: "screener defender", startingZone: "right_elbow", startingPosition: getZonePoint("right_elbow"), matchupId: "O5", lastModifiedBy: "system" },
];

export function createDemoPreset(): PlayDocument {
  return {
    id: "nextplay-slob-demo",
    playRevision: 0,
    title: "NextPlay SLOB Right-Corner Three",
    scenario: "sideline_out_of_bounds",
    clockSeconds: 4.2,
    defenseScheme: "man",
    targetOutcome: "Right-corner three for O2",
    ballOwnerId: "O1",
    players: structuredClone([...offensivePlayers, ...defensivePlayers]),
    actions: [],
  };
}

export function createGoldenActionBatch(): PlayActionInput[] {
  return [
    { type: "move", actorId: "O3", destinationZone: "left_wing", startSecond: 0, durationSecond: 0.75, label: "Clear" },
    { type: "move", actorId: "O4", destinationZone: "rim", startSecond: 0, durationSecond: 0.85, label: "Decoy cut" },
    { type: "screen", actorId: "O5", targetPlayerId: "O2", destinationZone: "right_block", screenType: "pin_down", startSecond: 0.15, durationSecond: 0.8, label: "Pin-down" },
    { type: "move", actorId: "O2", destinationZone: "right_corner", pathStyle: "flare", startSecond: 0.3, durationSecond: 1.05, label: "Corner flare" },
    { type: "pass", actorId: "O1", targetPlayerId: "O2", startSecond: 1.4, durationSecond: 0.3, label: "Inbound pass" },
    { type: "shot", actorId: "O2", startSecond: 1.72, durationSecond: 0.43, label: "Corner three" },
  ];
}
