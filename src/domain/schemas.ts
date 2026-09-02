import { z } from "zod";

import { DEFENSE_IDS, OFFENSE_IDS, type ActionPatch, type PlayActionInput } from "./types";
import { ZONE_IDS } from "./zones";

const finiteNumber = z.number().refine(Number.isFinite, "Must be a finite number.");
const positiveDuration = finiteNumber.positive("Duration must be greater than zero.");
const nonnegativeTime = finiteNumber.nonnegative("Start time cannot be negative.");
const pointSchema = z
  .object({ x: finiteNumber, y: finiteNumber })
  .strict();

export const offenseIdSchema = z.enum(OFFENSE_IDS);
export const defenseIdSchema = z.enum(DEFENSE_IDS);
export const zoneIdSchema = z.enum(ZONE_IDS as [string, ...string[]]);
export const pathStyleSchema = z.enum([
  "straight",
  "curve_left",
  "curve_right",
  "curl",
  "flare",
  "backdoor",
  "slip",
]);
export const screenTypeSchema = z.enum([
  "pin_down",
  "flare",
  "back_screen",
  "ball_screen",
  "cross_screen",
]);

const commonActionFields = {
  actorId: offenseIdSchema,
  destinationPosition: pointSchema.optional(),
  startSecond: nonnegativeTime,
  durationSecond: positiveDuration,
  pathStyle: pathStyleSchema.optional(),
  label: z.string().max(60).optional(),
};

export const moveActionInputSchema = z
  .object({ type: z.literal("move"), ...commonActionFields, destinationZone: zoneIdSchema })
  .strict();
export const dribbleActionInputSchema = z
  .object({ type: z.literal("dribble"), ...commonActionFields, destinationZone: zoneIdSchema })
  .strict();
export const screenActionInputSchema = z
  .object({
    type: z.literal("screen"),
    ...commonActionFields,
    destinationZone: zoneIdSchema,
    targetPlayerId: offenseIdSchema,
    screenType: screenTypeSchema,
  })
  .strict();
export const passActionInputSchema = z
  .object({ type: z.literal("pass"), ...commonActionFields, targetPlayerId: offenseIdSchema })
  .strict();
export const shotActionInputSchema = z.object({ type: z.literal("shot"), ...commonActionFields }).strict();

export const playActionInputSchema = z.discriminatedUnion("type", [
  moveActionInputSchema,
  dribbleActionInputSchema,
  screenActionInputSchema,
  passActionInputSchema,
  shotActionInputSchema,
]);

export const actionBatchSchema = z.array(playActionInputSchema).min(1).max(12);
export const actionPatchSchema = z
  .object({
    destinationZone: zoneIdSchema.optional(),
    destinationPosition: pointSchema.optional(),
    targetPlayerId: offenseIdSchema.optional(),
    startSecond: nonnegativeTime.optional(),
    durationSecond: positiveDuration.optional(),
    pathStyle: pathStyleSchema.optional(),
    screenType: screenTypeSchema.optional(),
    label: z.string().max(60).optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, "An action update needs at least one field.");

export const positiveClockSchema = finiteNumber.positive("Clock must be greater than zero.");

export function parseActionInput(value: unknown): PlayActionInput {
  return playActionInputSchema.parse(value) as PlayActionInput;
}

export function parseActionPatch(value: unknown): ActionPatch {
  return actionPatchSchema.parse(value) as ActionPatch;
}

export function isOffenseId(value: unknown): value is (typeof OFFENSE_IDS)[number] {
  return offenseIdSchema.safeParse(value).success;
}

export const validDefenseIds = DEFENSE_IDS;
