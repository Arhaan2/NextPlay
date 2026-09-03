import { COACH_UI } from "../application/commandMetadata";
import { playCommands } from "../application/commands";
import type { AnimationSessionState, PlayDocument } from "../domain/types";
import { getPlayDuration } from "../engine/animation/playerPositions";
interface Props { document: PlayDocument; animation: AnimationSessionState; onMessage: (tone: "success" | "error", message: string) => void; }

function playbackStatus(status: AnimationSessionState["status"]): string {
  switch (status) {
    case "idle": return "Idle";
    case "playing": return "Playing";
    case "paused": return "Paused";
  }
}

export function PlaybackControls({ document, animation, onMessage }: Props) {
  const duration = getPlayDuration(document);
  const hasTimedActions = document.actions.length > 0;
  const disabled = !hasTimedActions || animation.status === "playing";
  const start = () => {
    const result = playCommands.restartAnimation({ speed: animation.speed, loop: animation.loop }, COACH_UI);
    onMessage(result.ok ? "success" : "error", result.ok ? `Animation started at revision ${result.revision}.` : `${result.code}: ${result.message}`);
  };

  return <section className="playback-controls" aria-label="Animation controls">
    <div className="playback-controls__readout" role="status" aria-live="polite">
      <strong>Animated tactical diagram</strong>
      <span>{playbackStatus(animation.status)} · {animation.currentSecond.toFixed(2)}s / {duration.toFixed(2)}s</span>
    </div>
    <button className="primary-button" type="button" disabled={disabled} onClick={start} aria-describedby={hasTimedActions ? undefined : "playback-empty-state"}>{animation.status === "paused" ? "Replay" : "Play from start"}</button>
    {animation.status === "playing" ? <button className="secondary-button" type="button" onClick={() => playCommands.pauseAnimation()}>Pause</button> : animation.status === "paused" && animation.currentSecond < duration ? <button className="secondary-button" type="button" onClick={() => playCommands.resumeAnimation()}>Resume</button> : null}
    <label>Speed<select aria-label="Playback speed" value={animation.speed} onChange={(event) => playCommands.setAnimationSpeed(Number(event.target.value) as AnimationSessionState["speed"])}>{[0.5,1,1.5,2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
    <label className="loop-control"><input type="checkbox" checked={animation.loop} onChange={(event) => playCommands.setAnimationLoop(event.target.checked)} /> Loop</label>
    {hasTimedActions ? null : <span className="playback-controls__notice" id="playback-empty-state">Add timed actions before playback.</span>}
  </section>;
}
