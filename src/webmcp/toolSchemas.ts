import { z } from "zod";

import { actionBatchSchema } from "../domain/schemas";
import { OFFENSE_IDS } from "../domain/types";
import { ZONE_IDS } from "../domain/zones";
import type { ModelContextJsonSchema } from "./modelContext";

export const getPlayStateInputSchema = z
  .object({ includeActionDetails: z.boolean().optional().default(true) })
  .strict();

export const addPlayActionsInputSchema = z
  .object({
    expectedRevision: z.number().finite().int().nonnegative().optional(),
    actions: actionBatchSchema,
  })
  .strict();

export type GetPlayStateInput = z.infer<typeof getPlayStateInputSchema>;
export type AddPlayActionsInput = z.infer<typeof addPlayActionsInputSchema>;

const pointSchema: ModelContextJsonSchema = {
  type: "object",
  properties: {
    x: { type: "number", description: "Normalized court x coordinate." },
    y: { type: "number", description: "Normalized court y coordinate." },
  },
  required: ["x", "y"],
  additionalProperties: false,
};

const actionItemSchema: ModelContextJsonSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["move", "dribble", "screen", "pass", "shot"] },
    actorId: { type: "string", enum: OFFENSE_IDS },
    targetPlayerId: { type: "string", enum: OFFENSE_IDS },
    destinationZone: { type: "string", enum: ZONE_IDS },
    destinationPosition: pointSchema,
    startSecond: { type: "number", minimum: 0 },
    durationSecond: { type: "number", exclusiveMinimum: 0 },
    pathStyle: {
      type: "string",
      enum: ["straight", "curve_left", "curve_right", "curl", "flare", "backdoor", "slip"],
    },
    screenType: {
      type: "string",
      enum: ["pin_down", "flare", "back_screen", "ball_screen", "cross_screen"],
    },
    label: { type: "string", maxLength: 60, description: "A concise label of at most 60 characters." },
  },
  required: ["type", "actorId", "startSecond", "durationSecond"],
  additionalProperties: false,
};

export const GET_PLAY_STATE_INPUT_JSON_SCHEMA: ModelContextJsonSchema = {
  type: "object",
  properties: {
    includeActionDetails: {
      type: "boolean",
      description: "Include full timing, destination, target, and lock fields.",
    },
  },
  additionalProperties: false,
};

export const ADD_PLAY_ACTIONS_INPUT_JSON_SCHEMA: ModelContextJsonSchema = {
  type: "object",
  properties: {
    expectedRevision: {
      type: "integer",
      minimum: 0,
      description: "Revision returned by get_play_state.",
    },
    actions: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: actionItemSchema,
    },
  },
  required: ["actions"],
  additionalProperties: false,
};

export const validatePlayInputSchema = z.object({}).strict();
export const animatePlayInputSchema = z.object({ speed: z.union([z.literal(0.5), z.literal(1), z.literal(1.5), z.literal(2)]).optional(), loop: z.boolean().optional() }).strict();
export type ValidatePlayInput = z.infer<typeof validatePlayInputSchema>;
export type AnimatePlayInput = z.infer<typeof animatePlayInputSchema>;
export const VALIDATE_PLAY_INPUT_JSON_SCHEMA: ModelContextJsonSchema = { type: "object", properties: {}, additionalProperties: false };
export const ANIMATE_PLAY_INPUT_JSON_SCHEMA: ModelContextJsonSchema = { type: "object", properties: { speed: { type: "number", enum: [0.5, 1, 1.5, 2], description: "Playback speed." }, loop: { type: "boolean", description: "Repeat the animation until paused." } }, additionalProperties: false };
