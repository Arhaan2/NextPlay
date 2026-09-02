import { DomainHarness } from "./dev/DomainHarness";

export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            NP
          </span>
          <div>
            <p className="eyebrow">Basketball tactics board</p>
            <h1>NextPlay</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <p className="status-pill" data-testid="webmcp-status">
            <span aria-hidden="true">○</span> Manual mode
          </p>
          <button
            className="secondary-button"
            type="button"
            disabled
            title="Reset becomes available with the interactive play state."
          >
            Reset demo
          </button>
        </div>
      </header>

      <section className="play-meta" aria-label="Demo scenario summary">
        <div>
          <span>Scenario</span>
          <strong>Sideline out of bounds</strong>
        </div>
        <div>
          <span>Clock</span>
          <strong>4.2 seconds</strong>
        </div>
        <div>
          <span>Defense</span>
          <strong>Man-to-man</strong>
        </div>
        <p className="phase-label">Foundation build</p>
      </section>

      <section className="workspace" aria-label="Play workspace">
        <div
          className="court-placeholder"
          role="img"
          aria-label="Basketball court workspace placeholder"
          data-testid="court-placeholder"
        >
          <div className="placeholder-copy">
            <p className="eyebrow">Court workspace</p>
            <h2>The board is ready for the first play.</h2>
            <p>
              Court rendering and structured actions arrive in the next build
              phase.
            </p>
          </div>
        </div>

        <aside className="side-rail" aria-label="Agent and validation status">
          <section>
            <div className="panel-heading">
              <h2>Agent activity</h2>
              <span>0</span>
            </div>
            <p className="empty-state">WebMCP tools are not registered yet.</p>
          </section>

          <section>
            <div className="panel-heading">
              <h2>Play checks</h2>
              <span>—</span>
            </div>
            <p className="empty-state">
              Validation will appear after actions are added.
            </p>
          </section>
        </aside>
      </section>

      <section className="timeline-shell" aria-labelledby="timeline-title">
        <div>
          <p className="eyebrow">Player timeline</p>
          <h2 id="timeline-title">No actions yet</h2>
        </div>
        <p>Timeline rows will stay aligned with the live court.</p>
      </section>

      <footer className="prompt-bar">
        <span>Example prompt</span>
        <p>
          “Read this SLOB setup, add the six-action right-corner sequence, then
          validate it.”
        </p>
      </footer>

      {import.meta.env.DEV ? <DomainHarness /> : null}
    </main>
  );
}
