import { createDemoPreset } from "../domain/presets";
import type { ApplicationState, PlaySessionState } from "../domain/types";

export function createInitialSessionState(): PlaySessionState {
  return {
    validation: { status: "not_run", checks: [], checksPassed: 0, checksTotal: 0, errors: [], warnings: [] },
    animation: { status: "idle", currentSecond: 0, speed: 1, loop: false },
    webmcp: { available: false, registeredToolNames: [] },
    activity: [],
    nextActivitySequence: 1,
  };
}

export function createInitialApplicationState(): ApplicationState {
  return { document: createDemoPreset(), session: createInitialSessionState() };
}
