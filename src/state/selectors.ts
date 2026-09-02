import type { PlayStoreState } from "./playStore";

export const selectDocument = (state: PlayStoreState) => state.document;
export const selectSession = (state: PlayStoreState) => state.session;
export const selectPlayRevision = (state: PlayStoreState) => state.document.playRevision;
export const selectActions = (state: PlayStoreState) => state.document.actions;
export const selectActivity = (state: PlayStoreState) => state.session.activity;
