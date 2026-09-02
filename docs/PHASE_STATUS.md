# Phase Status

**Last updated:** September 2, 2026
**Current phase:** Phase 0 — Repository, toolchain, and live deployment
**Overall status:** NOT STARTED
**Integration branch:** `main`
**Known-good commit:** none
**Known-good deployment:** none

## Phase table

| Phase | Status | Accepted commit | Automated gate | External gate | Notes |
|---|---|---|---|---|---|
| 0. Foundation/deploy | NOT STARTED | | | public load | |
| 1. Domain/commands | NOT STARTED | | | n/a | |
| 2. Court/timeline | NOT STARTED | | | visual fixture | |
| 3. WebMCP read/add | NOT STARTED | | | Gate A | |
| 4. Validation/animation | NOT STARTED | | | first flow | |
| 5. Lock/replan | NOT STARTED | | | Gate B | |
| 6. Polish/freeze | NOT STARTED | | | video readability | |
| 7. Release candidate | NOT STARTED | | | two full runs | |
| 8. Final/submission | NOT STARTED | | | five full runs | |

## Current prerequisites

- [ ] Repository created.
- [ ] Planning package copied into root.
- [ ] Node/npm versions recorded.
- [ ] Deployment provider selected.
- [ ] Codex project trusted and custom agents loaded.

## Current phase acceptance

- [ ] Public HTTPS URL loads without auth.
- [ ] Product shell renders.
- [ ] `npm run verify` passes.
- [ ] License and docs are present.

## Decisions / deviations

Record any accepted departure from `docs/DESIGN.md` here with date, reason, impact, and approving orchestrator.

| Date | Decision/deviation | Reason | Impact |
|---|---|---|---|
| September 2, 2026 | Product and repository name standardized as `NextPlay`; integration branch set to `main`. | Final naming decision for the public GitHub repository. | Proper-name references use NextPlay; product thesis, scope, and basketball vocabulary are unchanged. |

## Active blockers

None recorded.

## Known risks

- Site-tool support must be tested on the deployed URL early.
- Deadline allows no broad P1 work before both golden gates pass.

## Exact next action

Run the Phase 0 orchestration prompt from `docs/CODEX_RUNBOOK.md`.

## Last phase handoff

```text
Phase:
Status:
Behavior delivered:
Files changed:
Tests added:
Commands run and results:
Acceptance criteria demonstrated:
Known risks / deferred work:
Recommended next phase:
```
