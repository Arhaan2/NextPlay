# Codex Multi-Agent Runbook

## 1. Why this workflow

The proposed builder → test author → test runner → bug fixer pipeline is directionally strong, but it should not be four agents writing simultaneously to the same checkout. The code phases are dependent, and parallel write-heavy work creates conflict and invalidates test assumptions.

Use a primary Codex thread as the orchestrator. It delegates bounded roles sequentially, preserves the requirements/decision context, and commits only after the phase gate passes. Parallelism is reserved for independent read-heavy review or isolated worktrees.

## 2. Roles

| Role | Writes | Responsibility | Forbidden |
|---|---|---|---|
| Orchestrator | status/docs/commits | phase scope, ordering, integration, decisions | delegating vague whole-project tasks |
| `phase_builder` | production | implement one phase | tests, commits, unrelated refactors |
| `test_author` | tests/helpers | independent acceptance and invariant tests | production fixes |
| `test_runner` | none | execute and classify failures | any source edit |
| `bug_fixer` | production | smallest verified fix | weakening tests, broad refactor |
| `release_reviewer` | none | owner-level gate review | style-only review, source edits |

The custom role definitions are in `.codex/agents/`.

## 3. Session setup

1. Open the repository in Codex local or a Codex worktree.
2. Confirm the project is trusted so `.codex/config.toml` loads.
3. Confirm `AGENTS.md` is visible to the session.
4. Run:

```bash
git status --short
node --version
npm --version
```

5. Keep the main thread on the coherent outcome “complete the current phase.” Do not use one giant chat for the entire project if it becomes noisy; start a fresh phase chat with the status/design files as durable context.

## 4. Recommended branch model for the deadline

### Fastest safe option

Use one integration branch, for example:

```text
demo
```

The orchestrator runs subagents sequentially in the same phase workspace and commits after each accepted phase:

```text
phase-0: scaffold and deploy
phase-1: domain and commands
phase-2: court and timeline
...
```

This minimizes cherry-pick/rebase overhead.

### Worktree option

Use a separate worktree only for independent work, such as:

- README/submission copy while the release candidate is frozen
- video script and screenshots documentation
- read-only architecture review

Do not put Phase 4 and Phase 5 production work in parallel worktrees because Phase 5 depends on Phase 4 interfaces and behavior.

## 5. Standard phase prompt

Paste this into the primary Codex thread, replacing placeholders:

```text
Act as the primary orchestrator for NextPlay.

Read, in order:
- AGENTS.md
- docs/DESIGN.md
- docs/BUILD_PLAN.md
- docs/PHASE_STATUS.md
- docs/phases/<CURRENT_PHASE_FILE>

Execute only <PHASE NAME>. Preserve all existing user changes.

Use configured subagents in this order and wait between write-capable roles:
1. Spawn phase_builder with the phase brief and acceptance criteria.
2. After it returns, inspect its diff and handoff.
3. Spawn test_author to add independent tests for the delivered behavior.
4. Spawn test_runner to run the phase suite and broader required gates.
5. On failure, spawn bug_fixer with the exact runner evidence, then spawn
   test_runner again. Allow at most two fix cycles.
6. Spawn release_reviewer for a read-only gate review.
7. As orchestrator, inspect the final diff, update PHASE_STATUS.md, and commit
   only if the phase passes.

Subagents must not commit, merge, rebase, force-push, or edit outside their role.
Report the phase status using the handoff format required by AGENTS.md.
```

## 6. Role-specific delegation prompts

Codex can select custom agents by name. These prompts add phase-specific boundaries.

### 6.1 Builder

```text
Spawn phase_builder for <PHASE>. Read the phase brief and implement only its
production behavior. Do not add tests or commit. Run existing relevant tests,
typecheck, and build. Return a structured handoff with files, behavior, commands,
acceptance evidence, risks, and deferred work.
```

### 6.2 Test author

```text
Spawn test_author for <PHASE>. Read the phase brief, design invariants, and the
builder diff/handoff. Add tests only. Cover positive, negative, atomicity,
revision, lock, and adapter behavior relevant to this phase. Do not fix
production code or commit. Return coverage and any design ambiguity.
```

### 6.3 Test runner

```text
Spawn test_runner for <PHASE>. Make no source edits. Run the narrow phase tests,
then npm run verify if the narrow suite passes. Classify each failure and return
exact commands, exit codes, first meaningful traces, reproduction, and affected
acceptance criteria. Confirm git status after execution.
```

### 6.4 Bug fixer

```text
Spawn bug_fixer with this verified failure report:

<PASTE TEST_RUNNER REPORT>

Reproduce it, fix the smallest production-code root cause, and do not change
tests. Run the exact failing test and related checks. Do not commit. Return root
cause, diff summary, commands/results, and remaining risk.
```

### 6.5 Release reviewer

```text
Spawn release_reviewer for <PHASE>. Review the diff against AGENTS.md, the design,
the phase brief, and test evidence. Focus on golden-demo correctness, WebMCP
contracts, command-layer ownership, locks, revisions, atomicity, determinism, and
missing high-value tests. Do not edit. Return PASS, PASS WITH NONBLOCKING NOTES,
or FAIL with concrete file/symbol evidence.
```

## 7. Phase handoff protocol

The orchestrator should give each downstream agent only the relevant distilled context:

### Builder → test author

- phase acceptance criteria
- files changed
- public interfaces added/changed
- known edge cases
- exact behavior claimed

### Test author → test runner

- test files added
- commands to run
- expected high-value cases
- any intentionally untested behavior

### Test runner → bug fixer

- exact failing command
- exact test and assertion
- first meaningful stack trace
- deterministic reproduction
- classification and confidence
- expected versus actual behavior

### Fixer → runner

- root cause
- exact files changed
- why the change restores design behavior
- targeted command already run
- possible regression surface

Do not dump entire logs into the primary thread when a short evidence summary and saved artifact are enough.

## 8. Failure taxonomy

The test runner must classify failures before a fixer is spawned.

### Production defect

The implementation violates accepted behavior. Route to `bug_fixer`.

### Test defect

The test conflicts with the phase brief or accepted design. Route back to `test_author`; do not let the fixer rewrite it.

### Environment/tooling defect

Dependency, browser, OS, missing binary, or configuration problem. The orchestrator decides whether to fix tooling or use a documented fallback.

### Flaky/unknown

Re-run targeted test once, collect evidence, and isolate nondeterminism. Do not hide it with retries or sleeps.

## 9. Gate commands by phase

### Phase 0

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### Phase 1

```bash
npm run test:unit -- schemas zones
npm run test:integration -- commands locking revisions
npm run typecheck
npm run build
```

### Phase 2

```bash
npm run test:integration -- court timeline inspector
npm run typecheck
npm run build
```

### Phase 3

```bash
npm run test:integration -- webmcp-registration
npm run verify
```

Then manual deployed Gate A.

### Phase 4

```bash
npm run test:unit -- validation possession animation
npm run test:integration -- golden-flow
npm run verify
```

### Phase 5

```bash
npm run test:integration -- locking revisions webmcp-registration golden-flow
npm run verify
```

Then manual deployed Gate B.

### Release

```bash
npm ci
npm run verify
```

Run optional e2e only if it is already installed and stable.

## 10. Status file discipline

`docs/PHASE_STATUS.md` is the durable handoff between phase chats.

Update it only after the orchestrator reviews evidence. Record:

- current phase and status
- accepted commit
- deployment URL
- tests and external gates
- deviations from design
- known blockers
- exact next action

Do not mark a phase complete because an agent says it is complete. The orchestrator must verify the diff and gate evidence.

## 11. Preventing agents from gaming tests

Keep these rules explicit in every fixer prompt:

- no `.skip`, `.only`, disabled suites, or lowered thresholds
- no deletion or loosening of a valid assertion
- no environment-specific production branch for tests
- no arbitrary sleep or retry to mask races
- no mocking of the exact command/validator under test
- no type/lint suppression without an accepted design reason
- no changing the golden fixture merely to match incorrect output

The release reviewer should specifically scan for these patterns.

## 12. External WebMCP testing protocol

Automated tests cannot prove ChatGPT discovers and uses the page tools. At Phases 3 and 5, the orchestrator must pause the code pipeline and execute the deployed acceptance gate.

Record:

```text
Date/time:
Deployment URL:
ChatGPT desktop app version:
Model:
Site tools listed:
Prompt used:
Observed tool sequence:
Visible UI result:
Failure, if any:
Screenshot/video artifact:
```

Use a fresh session for final acceptance. Reset the board between attempts.

## 13. Emergency orchestration after feature freeze

After 10:30 p.m. Wednesday:

1. Keep the release candidate branch stable.
2. Spawn `test_runner` before every fix.
3. Spawn `bug_fixer` only for a reproduced P0 blocker.
4. Re-run targeted tests, `npm run verify`, and the affected deployed flow.
5. Do not spawn a builder for new features.
6. Revert or remove unstable P1 work rather than expanding the fix.
7. Keep the last known-good deployment URL recorded.

## 14. Final review prompt

```text
Review the current release candidate with subagents, without making changes.
Use one release_reviewer focused on product/domain invariants and one test_runner
focused on the full quality gate. Wait for both. Then, as orchestrator, compare
their evidence against docs/GOLDEN_DEMO.md and give a release decision. Do not
approve the release without a passing npm run verify and recorded deployed Gate A
and Gate B results.
```
