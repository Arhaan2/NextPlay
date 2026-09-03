import type { PathStyle, Point } from "../../domain/types";
export function clampProgress(progress: number): number { return Math.min(1, Math.max(0, progress)); }
export function interpolateStraight(start: Point, end: Point, progress: number): Point { const t = clampProgress(progress); return { x: start.x + ((end.x - start.x) * t), y: start.y + ((end.y - start.y) * t) }; }
export function quadraticControlPoint(start: Point, end: Point, pathStyle: PathStyle | undefined, isShot = false): Point | undefined {
  const curved = isShot || ["curve_left", "curve_right", "curl", "flare", "backdoor", "slip"].includes(pathStyle ?? "");
  if (!curved) return undefined;
  const dx = end.x - start.x; const dy = end.y - start.y; const length = Math.hypot(dx, dy) || 1;
  const direction = pathStyle === "curve_right" || pathStyle === "backdoor" ? -1 : 1; const offset = isShot ? 10 : 6;
  return { x: (start.x + end.x) / 2 + ((-dy / length) * offset * direction), y: (start.y + end.y) / 2 + ((dx / length) * offset * direction) };
}
export function evaluateQuadratic(start: Point, control: Point, end: Point, progress: number): Point { const t = clampProgress(progress); const inverse = 1 - t; return { x: (inverse * inverse * start.x) + (2 * inverse * t * control.x) + (t * t * end.x), y: (inverse * inverse * start.y) + (2 * inverse * t * control.y) + (t * t * end.y) }; }
export function interpolatePath(start: Point, end: Point, progress: number, pathStyle?: PathStyle, isShot = false): Point { const control = quadraticControlPoint(start, end, pathStyle, isShot); return control === undefined ? interpolateStraight(start, end, progress) : evaluateQuadratic(start, control, end, progress); }
