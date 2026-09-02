# AGENTS.md

## 1. Mission

Build **NextPlay**, a browser-native basketball tactics board for the WebMCP Challenge.

The product must prove one specific human-agent collaboration loop:

1. The agent reads the live play.
2. The agent constructs and animates a structured play.
3. The coach directly changes and locks part of the play.
4. The coach changes a live constraint, creating a deterministic validation failure.
5. The agent re-reads the live page and repairs only the unlocked actions.
6. The final play validates and animates while all locked coach decisions remain unchanged.

The official submission deadline is **Thursday, September 3, 2026 at 1:00 p.m. PT**. Optimize for a flawless three-minute demonstration, not breadth.

## 2. Source of truth

Resolve conflicts in this order:

1. The current phase brief in `docs/phases/`.
2. `docs/DESIGN.md` and its accepted architecture decisions.
3. `docs/GOLDEN_DEMO.md` and its observable acceptance criteria.
4. This file.
5. Existing code and tests.
6. General preferences or assumptions.

Never silently reinterpret a requirement. Record material deviations in `docs/PHASE_STATUS.md` under **Decisions / deviations**.

## 3. Competition-critical outcome

The build is successful only when both golden flows work on the deployed URL.

### Flow A — first construction

Expected semantic sequence:

```text
get_play_state
add_play_actions
validate_play
animate_play
```

Observable result:

- The SLOB preset is visible before the agent acts.
- Six structured actions appear on both court and timeline.
- The activity rail shows real site-tool activity.
- Deterministic validation passes.
- The play animates without refresh.

### Flow B — human edit and agent repair

The coach must be able to:

- Change O5's screen destination to the right elbow through a normal UI control.
- Lock O5's screen action.
- Lock O2's route action.
- Change the clock from 4.2 seconds to 2.0 seconds.

Expected semantic sequence after the coach edits:

```text
get_play_state
update_play_action
update_play_action
validate_play
animate_play
```

Observable result:

- The read returns the current revision, clock, coach changes, and locks.
- Locked actions remain bit-for-bit unchanged.
- Only unlocked pass/shot timing is modified.
- The clock error disappears.
- The final animation completes within 2.0 seconds.

Nothing may be called “done” until the relevant observable behavior is demonstrated.

## 4. Ruthless scope policy

### P0 — build and stabilize

- Vite + React + TypeScript shell.
- Static public deployment with no authentication.
- One half-court SLOB preset.
- Offensive and defensive markers.
- Five action types: `move`, `dribble`, `screen`, `pass`, `shot`.
- Court action rendering.
- One-row-per-player timeline.
- Action inspector with deterministic form controls.
- Human-only action lock/unlock.
- Editable play clock.
- Activity rail.
- Validation panel.
- Basic deterministic animation.
- WebMCP tools:
  - `get_play_state`
  - `add_play_actions`
  - `update_play_action`
  - `validate_play`
  - `animate_play`
- Reset-to-demo state.
- Unit and command-contract tests.
- Fresh-session deployed-browser test.

### P1 — only after both golden flows pass repeatedly

- Direct SVG dragging of an action endpoint.
- `set_starting_positions`.
- `set_defense_scheme`.
- `remove_play_actions`.
- Local persistence.
- Playwright smoke tests.
- Defender following.
- Export/share features.

### Explicitly forbidden before feature freeze

- Accounts, teams, payments, database, backend, authentication.
- External LLM/API calls inside the application.
- Video import or computer vision.
- Real NBA data, logos, marks, player likenesses, or team branding.
- Realistic physics or make/miss simulation.
- Tactical “optimization,” scoring probability, or success claims.
- Multiplayer, mobile app, full-court mode, branching reads, or multiple polished scenarios.
- A built-in chatbot.
- Broad refactors unrelated to the current phase.

When uncertain, cut scope rather than add abstractions.

## 5. Architectural invariants

### 5.1 One mutation path

All persistent changes must go through the shared application command layer.

```text
Human UI ----------\
WebMCP adapter ------> playCommands / command transaction -> Zustand store
Preset/reset -------/
```

React components and WebMCP handlers must not call Zustand setters directly for domain changes.

Allowed direct store updates are limited to transient view state such as selection, hover, and animation frame time.

### 5.2 Separate document state from session state

Persistent play content belongs under `state.document`:

- scenario
- clock
- defense scheme
- ball owner
- starting positions
- actions
- action locks
- play revision

Transient session state belongs under `state.session`:

- selected action
- validation report
- animation status/current time/speed
- WebMCP availability
- activity events
- expanded panels

Do not increment `playRevision` for selection, validation, animation, activity logging, or hover.

### 5.3 Revision semantics

A successful content command increments `playRevision` exactly once.

Examples that increment once:

- Add a batch of six actions.
- Update one action.
- Lock or unlock one action through the coach UI.
- Change the clock.
- Reset the demo.

Examples that do not increment:

- Read state.
- Run validation.
- Start/pause animation.
- Select an action.
- Log an activity event.
- A rejected or failed command.

If `expectedRevision` is present and does not equal the current revision, return `STALE_PLAY_STATE` before applying changes.

### 5.4 Atomic batch writes

`add_play_actions` is all-or-nothing:

1. Parse the complete input.
2. Validate every action and reference.
3. Apply to a draft.
4. enforce lock and domain invariants.
5. Commit one new document state and one revision.

If any item is invalid, commit nothing.

### 5.5 Locks are a human authority boundary

- Only normal coach UI commands can lock or unlock an action.
- No WebMCP tool exposes lock or unlock.
- An agent mutation against a locked action returns `ACTION_LOCKED`.
- A failed lock mutation does not increment revision.
- Every persistent command must verify that pre-existing locked actions were not changed indirectly.
- Tests compare complete locked-action snapshots, not only `locked: true`.

Do not add player-level locks in the MVP. The collaboration story is action locking.

### 5.6 Runtime validation is mandatory

JSON Schema guides tool selection; Zod and domain checks enforce correctness.

Never trust tool input solely because it matched the declared schema. Validate:

- action type-specific required fields
- player IDs
- target references
- zone IDs
- finite numbers
- positive duration
- nonnegative start time
- expected revision
- locked-action preservation
- batch size
- label length

Return structured, actionable errors.

## 6. Domain rules

### 6.1 Supported IDs

```text
Offense: O1 O2 O3 O4 O5
Defense: X1 X2 X3 X4 X5
```

### 6.2 Supported action types

```text
move dribble screen pass shot
```

Type-specific required fields:

- `move`: `destinationZone`
- `dribble`: `destinationZone`
- `screen`: `destinationZone`, `targetPlayerId`, `screenType`
- `pass`: `targetPlayerId`
- `shot`: no extra field

### 6.3 Deterministic event ordering

Possession checks must use a stable order. At the same timestamp:

1. A pass completion transfers possession.
2. A shot start checks possession.
3. Other action starts are evaluated.

This allows a pass ending at `1.70` and a shot starting at `1.70` to be valid.

### 6.4 Validation claims

The validator may claim only deterministic structural facts:

- inside/outside the clock
- overlapping incompatible actions
- valid/invalid ball possession
- inbound pass present/missing
- shot present/missing
- valid/invalid references
- lock preservation

Never claim that a play is optimal, likely to score, or tactically guaranteed to work.

### 6.5 Animation claims

Call the output an **animated tactical diagram**. Do not call it a physics simulation.

Animation must be deterministic and derived from saved play state. It must not alter play content.

## 7. WebMCP rules

- Register tools in top-level page JavaScript through `document.modelContext.registerTool`.
- Do not use iframe registration.
- Detect support honestly; never display a fake connected state.
- Register a small, static tool surface.
- Keep names and schemas narrow.
- Set `additionalProperties: false` on object schemas.
- Set `readOnlyHint: true` for `get_play_state` and `validate_play`.
- Tool handlers are adapters. They call the same command layer as the UI.
- A write tool updates visible app state before returning success.
- Tool results must be concise and include enough state to verify the result: `ok`, current revision, changed IDs/summaries, lock-preservation count, and validation counts.
- Do not register `generate_play`, `optimize_play`, arbitrary JavaScript, lock, or unlock tools.
- Registration must be idempotent and safe under React development remounts.
- Abort or unregister tools during cleanup.
- Add TypeScript declarations for `document.modelContext`; do not use broad `any` throughout the adapter.

## 8. UI rules

- Desktop-first, usable at a 1280×720 demo viewport.
- SVG court with a stable `viewBox`; domain coordinates remain normalized from 0 to 100.
- Film-room aesthetic: dark shell, warm court, high contrast, restrained motion.
- The initial screen must show the preset and an example prompt; never show an empty broken canvas.
- The action inspector is the reliable P0 editing surface. Direct drag is P1.
- Locks must be visually obvious on court/timeline/inspector.
- Activity events must distinguish `COACH`, `AGENT`, and `SYSTEM`.
- Validation errors must identify the action and exact timing/reference involved.
- Reset must restore the exact golden preset and clear transient session state.
- The app remains manually usable when WebMCP is unavailable.

## 9. Coding conventions

- TypeScript strict mode. Avoid `any`; use `unknown` at untrusted boundaries and narrow it.
- Prefer named exports.
- Prefer pure functions in `src/domain/` and `src/engine/`.
- React components should render state and dispatch commands; keep domain logic out of JSX.
- Use exhaustive switches for action types and validation codes.
- Store time in seconds as finite numbers. Round only for display.
- Use semantic IDs and data attributes for tests.
- Keep dependencies minimal. Do not add a production dependency without explaining why the existing stack cannot do the job.
- No generated timestamps, random IDs, or nondeterministic animation behavior in tests. Inject an ID generator and clock where needed.
- Do not change public behavior without updating the design document and tests.
- Do not leave dead code, commented-out alternatives, or placeholder success messages.

## 10. Required commands

The repository should expose these scripts:

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:unit
npm run test:integration
npm run build
npm run verify
```

Recommended definition:

```text
verify = typecheck + lint + tests + production build
```

If Playwright is added:

```bash
npm run test:e2e
```

Agents must report exact commands run and whether each passed.

## 11. Test policy

### 11.1 Tests are product contracts

Write tests from acceptance criteria and domain invariants, not from incidental implementation details.

Required command tests:

- locked action update returns `ACTION_LOCKED`
- locked action remains deeply unchanged
- failed lock write does not increment revision
- stale expected revision returns `STALE_PLAY_STATE`
- invalid batch commits no actions
- valid batch increments revision once
- reads/validation/animation do not increment revision
- coach lock/unlock increments revision once
- clock overflow references the exact action and times
- same-player incompatible overlap is detected
- possession transfers at pass completion
- shot without possession is rejected by validation
- activity event records actor, channel, operation, status, and revisions

Required WebMCP contract tests:

- exactly the intended P0 tools register
- registration can be cleaned up safely
- read-only annotations are correct
- schemas reject additional properties
- handlers call the command layer rather than mutating the store directly
- visible state is committed before a success result is returned
- tool results include the current revision

### 11.2 Never weaken the gate

An agent must not make a failing suite green by:

- deleting or skipping a valid test
- loosening an assertion without a design reason
- adding arbitrary delays
- swallowing exceptions
- changing production behavior only for the test environment
- mocking the exact unit under test
- lowering lint/type settings

If a test is believed to be wrong, the bug fixer must stop and return evidence to the orchestrator. The orchestrator routes the issue back to the test author or updates the design decision explicitly.

## 12. Multi-agent delivery protocol

The primary Codex thread is the **orchestrator**. It owns requirements, phase state, integration decisions, and commits. Subagents do bounded work and return concise handoffs.

For every phase, run this pipeline in order:

1. **Orchestrator**
   - Reads the phase brief and current status.
   - Confirms prerequisites and acceptance criteria.
   - Ensures the workspace is clean.
   - Delegates the bounded implementation task.

2. **phase_builder**
   - Changes production code only for the phase.
   - Runs typecheck/build and relevant existing tests.
   - Does not create or weaken tests assigned to `test_author`.
   - Returns files changed, behavior delivered, commands run, and known risks.

3. **test_author**
   - Reads the phase brief and delivered behavior.
   - Adds or updates tests only.
   - Tests public behavior, invariants, and failure paths.
   - Does not fix production code.
   - Returns coverage added and any ambiguity found.

4. **test_runner**
   - Makes no source edits.
   - Runs the narrow phase suite first, then `npm run verify` when practical.
   - Reports exact failing command, first meaningful stack trace, reproduction steps, and a failure classification.

5. **bug_fixer** — only when failures exist
   - Receives the runner report.
   - Makes the smallest production-code fix.
   - Does not edit tests unless the orchestrator explicitly reclassifies the issue as a test defect.
   - Runs the failing test and related suite.

6. **test_runner**
   - Re-runs the gate after each fix cycle.
   - Maximum two fixer cycles before the orchestrator reassesses scope or architecture.

7. **release_reviewer**
   - Read-only review against the phase brief, design invariants, and diff.
   - Prioritizes correctness, lock/revision safety, WebMCP behavior, regression risk, and missing tests.
   - Avoids style-only comments.

8. **Orchestrator**
   - Reviews the diff and subagent summaries.
   - Updates `docs/PHASE_STATUS.md`.
   - Commits only after the phase gate passes.

### Concurrency rule

Do not run multiple write-capable agents against the same phase files at the same time. Parallelize only independent read-heavy work or isolated worktrees. The implementation → tests → execution → fix sequence is intentionally serial.

### Git rule

- The orchestrator owns commits.
- Subagents must not force-push, rebase shared branches, or merge.
- Keep one coherent commit per accepted phase when possible.
- Never discard unrelated user changes.
- Before a phase begins, report `git status --short`.

## 13. Phase completion report

Every phase handoff must contain:

```text
Phase:
Status: PASS | FAIL | BLOCKED
Behavior delivered:
Files changed:
Tests added:
Commands run and results:
Acceptance criteria demonstrated:
Known risks / deferred work:
Recommended next phase:
```

“Tests pass” is insufficient without commands and results.

## 14. Emergency deadline rules

After feature freeze:

- No new tool, action type, persistence mechanism, or major interaction.
- Fix only P0 correctness, demo reliability, severe visual defects, and submission blockers.
- Prefer deleting an unstable P1 feature over debugging it late.
- Keep the last known-good deployment available.
- Test the deployed URL in a fresh session after every release candidate.
- Submit before the final hour; do not rely on the official deadline as the target time.

## 15. Definition of done

The project is release-ready only when:

- The public URL loads without authentication.
- The SLOB preset renders immediately.
- WebMCP support is detected accurately.
- The intended P0 tools are discoverable.
- The first golden prompt works end to end.
- Court and timeline show the same actions.
- Validation is deterministic and honest.
- Animation runs without refresh or state mutation.
- The coach can edit and lock actions.
- The agent cannot overwrite locked actions.
- The second golden prompt preserves coach edits and repairs the clock error.
- Activity visibly distinguishes coach, agent, and system.
- Reset restores the demo.
- `npm run verify` passes.
- The deployed build has passed five consecutive golden-flow attempts in fresh sessions.
- README, repository, public demo video, and submission materials are ready.
