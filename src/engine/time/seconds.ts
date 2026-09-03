import type { PlayAction } from "../../domain/types";

/** Normalizes computed seconds for concise, stable presentation without changing saved timing. */
export function stableSeconds(value: number): number { return Number.parseFloat(value.toPrecision(15)); }
export function actionEndSecond(action: Pick<PlayAction, "startSecond" | "durationSecond">): number { return stableSeconds(action.startSecond + action.durationSecond); }
export function formatSeconds(value: number, decimals = 2): string { return stableSeconds(value).toFixed(decimals); }
