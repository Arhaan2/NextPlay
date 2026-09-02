import { useState } from "react";

import { playCommands } from "../application/commands";
import type { CommandResult } from "../application/commandResults";
import { selectActions, selectActivity, selectPlayRevision } from "../state/selectors";
import { usePlayStore } from "../state/playStore";

export function DomainHarness() {
  const revision = usePlayStore(selectPlayRevision);
  const actions = usePlayStore(selectActions);
  const activity = usePlayStore(selectActivity);
  const [lastResult, setLastResult] = useState<CommandResult<{ actionIds: string[] } | { reset: true }>>();

  return (
    <section className="dev-domain-harness" aria-label="Development domain harness">
      <p className="eyebrow">Development-only domain harness</p>
      <p>Revision: <strong data-testid="dev-play-revision">{revision}</strong></p>
      <p>Actions: <strong data-testid="dev-action-count">{actions.length}</strong></p>
      <p>Activity: <strong data-testid="dev-activity-count">{activity.length}</strong></p>
      <div className="topbar-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => setLastResult(playCommands.addActions(playCommands.goldenActions()))}
        >
          Load golden actions
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setLastResult(playCommands.resetDemo())}
        >
          Reset domain state
        </button>
      </div>
      {lastResult !== undefined ? (
        <output data-testid="dev-last-command-result">{lastResult.ok ? `Success at revision ${lastResult.revision}` : `${lastResult.code}: ${lastResult.message}`}</output>
      ) : null}
    </section>
  );
}
