import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

import { createInitialApplicationState } from "./initialState";
import type { ApplicationState, PlayDocument, PlaySessionState } from "../domain/types";

export interface PlayStoreState extends ApplicationState {
  /** Internal commit surface for the shared application command layer. */
  commitDocument: (document: PlayDocument) => void;
  updateSession: (update: (session: PlaySessionState) => PlaySessionState) => void;
}

export type PlayStore = StoreApi<PlayStoreState>;

export function createPlayStore(initialState: ApplicationState = createInitialApplicationState()): PlayStore {
  return createStore<PlayStoreState>()((set) => ({
    ...structuredClone(initialState),
    commitDocument: (document) => set({ document }),
    updateSession: (update) =>
      set((state) => ({ session: update(state.session) })),
  }));
}

export const playStore = createPlayStore();
export function usePlayStore<T>(selector: (state: PlayStoreState) => T): T {
  return useStore(playStore, selector);
}
