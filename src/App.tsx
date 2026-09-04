import { useEffect, useState } from "react";

import { COACH_UI } from "./application/commandMetadata";
import { playCommands } from "./application/commands";
import type { CommandResult } from "./application/commandResults";
import { DomainHarness } from "./dev/DomainHarness";
import { usePlayStore } from "./state/playStore";
import { selectActivity, selectDocument, selectSession } from "./state/selectors";
import { ActivityRail } from "./ui/ActivityRail";
import { ValidationPanel } from "./ui/ValidationPanel";
import { PlaybackControls } from "./ui/PlaybackControls";
import { Court } from "./ui/court/Court";
import { ActionInspector } from "./ui/inspector/ActionInspector";
import { ClockEditor } from "./ui/inspector/ClockEditor";
import { CommandFeedback } from "./ui/inspector/CommandFeedback";
import { Timeline } from "./ui/timeline/Timeline";
import { DemoPrompts } from "./ui/DemoPrompts";
import { useWebMcpTools } from "./webmcp/useWebMcpTools";

interface Feedback {
  tone: "success" | "error";
  message: string;
}

export function App() {
  useWebMcpTools();
  useEffect(() => () => playCommands.stopAnimation(), []);
  const document = usePlayStore(selectDocument);
  const session = usePlayStore(selectSession);
  const activity = usePlayStore(selectActivity);
  const [feedback, setFeedback] = useState<Feedback>();
  const selectedAction = document.actions.find((action) => action.id === session.selectedActionId);
  const webMcpStatus = session.webmcp.available
    ? "Agent tools available"
    : "Manual mode";

  function showMessage(tone: Feedback["tone"], message: string): void { setFeedback({ tone, message }); }

  function handleResult<T>(result: CommandResult<T>): void {
    if (result.ok) {
      setFeedback({ tone: "success", message: `Saved at revision ${result.revision}.` });
      return;
    }
    setFeedback({ tone: "error", message: `${result.code}: ${result.message}` });
  }

  function selectAction(actionId: string): void {
    playCommands.selectAction(actionId);
  }

  function resetDemo(): void {
    handleResult(playCommands.resetDemo({ expectedRevision: document.playRevision }, COACH_UI));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div>
            <p className="eyebrow">Basketball tactics board</p>
            <h1>NextPlay</h1>
          </div>
        </div>

        <section className="play-meta" aria-label="Demo scenario summary">
          <div className="play-context"><span>Scenario</span><strong>SLOB · Man · {document.clockSeconds.toFixed(1)} seconds · r{document.playRevision}</strong><span className="context-accessibility-copy">Sideline out of bounds · Man-to-man</span></div>
          <ClockEditor key={String(document.clockSeconds)} clockSeconds={document.clockSeconds} revision={document.playRevision} onResult={handleResult} />
          <p className={`status-pill status-pill--${session.webmcp.available ? "available" : "manual"}`} data-testid="webmcp-status" role="status" aria-live="polite">
            <span aria-hidden="true">{session.webmcp.available ? "●" : "○"}</span> {webMcpStatus}
            {session.webmcp.available ? ` · ${session.webmcp.registeredToolNames.length} site tools` : <small>Site tools are unavailable in this browser.</small>}
          </p>
          <DemoPrompts />
          <button className="secondary-button" type="button" onClick={resetDemo}>Reset demo</button>
        </section>
      </header>

      <section className="workspace" aria-label="Play workspace">
        <div className="court-stage">
          <Court document={document} animation={session.animation} selectedActionId={session.selectedActionId} webMcpAvailable={session.webmcp.available} onSelectAction={selectAction} />
          <div className="playback-dock">
            <PlaybackControls document={document} animation={session.animation} onMessage={showMessage} />
          </div>
        </div>
        <aside className={`side-rail${selectedAction === undefined ? "" : " side-rail--action-selected"}`} aria-label="Agent and validation status">
          <ActionInspector key={selectedAction === undefined ? "empty" : `${selectedAction.id}-${selectedAction.updatedAtRevision}`} action={selectedAction} revision={document.playRevision} onResult={handleResult} />
          <ValidationPanel report={session.validation} onMessage={showMessage} />
          <ActivityRail activity={activity} webMcpAvailable={session.webmcp.available} />
          <CommandFeedback feedback={feedback} />
        </aside>
      </section>

      <Timeline actions={document.actions} clockSeconds={document.clockSeconds} currentSecond={session.animation.currentSecond} selectedActionId={session.selectedActionId} onSelectAction={selectAction} />

      {import.meta.env.DEV ? <DomainHarness /> : null}
    </main>
  );
}
