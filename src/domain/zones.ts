import type { Point, ZoneId } from "./types";

export const ZONES = {
  inbound_left: { x: 0, y: 30 },
  inbound_right: { x: 100, y: 30 },
  rim: { x: 50, y: 13 },
  left_block: { x: 36, y: 26 },
  right_block: { x: 64, y: 26 },
  left_short_corner: { x: 18, y: 20 },
  right_short_corner: { x: 82, y: 20 },
  left_corner: { x: 8, y: 36 },
  right_corner: { x: 92, y: 36 },
  left_elbow: { x: 35, y: 44 },
  right_elbow: { x: 65, y: 44 },
  nail: { x: 50, y: 48 },
  top: { x: 50, y: 74 },
  left_slot: { x: 35, y: 65 },
  right_slot: { x: 65, y: 65 },
  left_wing: { x: 15, y: 57 },
  right_wing: { x: 85, y: 57 },
  backcourt_center: { x: 50, y: 94 },
} as const satisfies Record<ZoneId, Point>;

export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

export function isZoneId(value: unknown): value is ZoneId {
  return typeof value === "string" && value in ZONES;
}

export function getZonePoint(zoneId: ZoneId): Point {
  const point = ZONES[zoneId];
  return { x: point.x, y: point.y };
}

/** Ties resolve by ZONE_IDS order, which is intentionally the mapping order above. */
export function findClosestZone(point: Point): ZoneId {
  let closest = ZONE_IDS[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const zoneId of ZONE_IDS) {
    const zone = ZONES[zoneId];
    const distance = (zone.x - point.x) ** 2 + (zone.y - point.y) ** 2;
    if (distance < closestDistance) {
      closest = zoneId;
      closestDistance = distance;
    }
  }

  return closest;
}
