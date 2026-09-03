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
          <span className="brand-mark" aria-hidden="true">NP</span>
          <div>
            <p className="eyebrow">Basketball tactics board</p>
            <h1>NextPlay</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <p className="status-pill" data-testid="webmcp-status">
            <span aria-hidden="true">{session.webmcp.available ? "●" : "○"}</span> {webMcpStatus}
            {session.webmcp.available ? ` · ${session.webmcp.registeredToolNames.length} site tools` : ""}
          </p>
          <button className="secondary-button" type="button" onClick={resetDemo}>Reset demo</button>
        </div>
      </header>

      <section className="play-meta" aria-label="Demo scenario summary">
        <div><span>Scenario</span><strong>Sideline out of bounds</strong></div>
        <div><span>Defense</span><strong>Man-to-man</strong></div>
        <div><span>Clock</span><strong>{document.clockSeconds.toFixed(1)} seconds</strong></div>
        <div><span>Revision</span><strong>r{document.playRevision}</strong></div>
        <ClockEditor key={String(document.clockSeconds)} clockSeconds={document.clockSeconds} revision={document.playRevision} onResult={handleResult} />
        <PlaybackControls document={document} animation={session.animation} onMessage={showMessage} />
      </section>

      <section className="workspace" aria-label="Play workspace">
        <Court document={document} animation={session.animation} selectedActionId={session.selectedActionId} onSelectAction={selectAction} />
        <aside className="side-rail" aria-label="Agent and validation status">
          <ActionInspector key={selectedAction === undefined ? "empty" : `${selectedAction.id}-${selectedAction.updatedAtRevision}`} action={selectedAction} revision={document.playRevision} onResult={handleResult} />
          <ActivityRail activity={activity} webMcpAvailable={session.webmcp.available} />
          <ValidationPanel report={session.validation} onMessage={showMessage} />
          <CommandFeedback feedback={feedback} />
        </aside>
      </section>

      <Timeline actions={document.actions} clockSeconds={document.clockSeconds} currentSecond={session.animation.currentSecond} selectedActionId={session.selectedActionId} onSelectAction={selectAction} />

      <footer className="prompt-bar">
        <span>Example prompt</span>
        <p>“Read this SLOB setup, add the six-action right-corner sequence, then validate it.”</p>
      </footer>

      {import.meta.env.DEV ? <DomainHarness /> : null}
    </main>
  );
}
