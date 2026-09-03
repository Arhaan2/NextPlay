# Phase Status

**Last updated:** September 2, 2026
**Current phase:** Phase 2 — Court, Timeline, and Coach Inspector
**Overall status:** PHASE 2 ACCEPTED
**Integration branch:** `main`
**Known-good commit:** `11fbb3e8a8c0a398632d1e500a3115d76f520f32`
**Known-good deployment:** https://next-play-lake.vercel.app
**GitHub repository:** https://github.com/Arhaan2/NextPlay

## Phase table

| Phase | Status | Accepted commit | Automated gate | External gate | Notes |
|---|---|---|---|---|---|
| 0. Foundation/deploy | PASS | `03b64cb881b3b940b0cd0394f5e9ec17f517833b` | `npm ci`; `npm run verify` PASS (3 tests) | PASS — fresh no-auth browser load | Vercel production alias: https://next-play-lake.vercel.app |
| 1. Domain/commands | PASS | `462928fa53b995641e90c5c6effa23eaaba3220a` | `npm ci`; `npm run verify` PASS (24 tests) | n/a | Test files are included in root static typechecking. DEV harness and production-preview smoke passed. |
| 2. Court/timeline | PASS | `11fbb3e8a8c0a398632d1e500a3115d76f520f32` | `npm ci`; `npm run verify` PASS (38 tests) | PASS — 1280×720 local flow, production preview, and fresh public browser | Canonical A1–A6 fixture is rendered through the DEV-only command harness; acceptance screenshot: `artifacts/phase-2-coach-edit-1280x720.png`. |
| 3. WebMCP read/add | NOT STARTED | | | Gate A | |
| 4. Validation/animation | NOT STARTED | | | first flow | |
| 5. Lock/replan | NOT STARTED | | | Gate B | |
| 6. Polish/freeze | NOT STARTED | | | video readability | |
| 7. Release candidate | NOT STARTED | | | two full runs | |
| 8. Final/submission | NOT STARTED | | | five full runs | |

## Current prerequisites

- [x] Repository created and verified public at https://github.com/Arhaan2/NextPlay.
- [x] Planning package copied into root and verified remotely at commit `76b1aff877ab1e52fc5ae934e14fc4d30656e3d5`.
- [x] Node `v24.18.0` and npm `11.16.0` recorded.
- [x] Vercel selected and production deployment verified.
- [x] Codex project trusted and all five custom agents loaded.

## Current phase acceptance

- [x] Accessible SVG half-court renders the complete SLOB preset, ten distinct player markers, and the ball at O1 from live document state.
- [x] The canonical DEV-only command harness loads A1–A6 once; court and O1–O5 timeline render the identical six-action ID set.
- [x] Move, dribble, screen, pass, and shot use deterministic document-derived geometry with visible selected, locked, and coach-modified treatments.
- [x] Court and timeline selection share `session.selectedActionId`; the inspector exposes the required A3 metadata and deterministic local form controls.
- [x] Coach update, lock/unlock, clock, and reset controls dispatch the accepted `playCommands` with current revisions and visible command feedback/activity.
- [x] The 1280×720 browser flow demonstrated A3 `right_block -> right_elbow`, A3 and A4 coach locks, clock `4.2 -> 2.0`, and reset to the pristine preset with monotonic revisions `r0 -> r1 -> r2 -> r3 -> r4 -> r5 -> r6`.
- [x] Timeline overflow remains accessible past the 2.0-second clock boundary without inventing a validation result.
- [x] Reset restores zero actions, clears selection, restores the 4.2-second clock and ten-player preset, and returns the ball to O1 without a page reload.
- [x] `npm run verify` passes: 5 files and 38 tests, plus lint, full root typecheck, and a 139-module production build.
- [x] Production preview and fresh HTTPS browser load contain no DEV harness, retain honest manual/WebMCP-unregistered and validation-not-run states, and report no blocking console error.

## Decisions / deviations

Record any accepted departure from `docs/DESIGN.md` here with date, reason, impact, and approving orchestrator.

| Date | Decision/deviation | Reason | Impact |
|---|---|---|---|
| September 2, 2026 | Product and repository name standardized as `NextPlay`; integration branch set to `main`. | Final naming decision for the public GitHub repository. | Proper-name references use NextPlay; product thesis, scope, and basketball vocabulary are unchanged. |
| September 2, 2026 | Vercel selected for Phase 0 production deployment. | The authenticated CLI provided the simplest supported static deployment. | Manual production deploy is live; automatic GitHub deploys remain unavailable until the Vercel account adds a GitHub login connection. |
| September 2, 2026 | Role-equivalent fallback subagents executed `phase_builder` and `bug_fixer` responsibilities. | The configured roles target `gpt-5.6`, which this ChatGPT-backed Codex host rejected before either role could run. | The same role boundaries and serial pipeline were preserved; configured `test_author`, `test_runner`, and `release_reviewer` ran directly. No production behavior changed. |
| September 2, 2026 | The configured `phase_builder` and `bug_fixer` roles now use available explicit models and ran directly for Phase 2. | The prior custom-role compatibility blocker was corrected before Phase 2 preflight. | The required serial role pipeline is available for future phases. |
| September 2, 2026 | Exact preset marker collisions receive a deterministic display-only horizontal fan-out; saved domain coordinates remain unchanged. | O5 and X5 share the accepted right-elbow coordinate and otherwise obscured one another on the static court. | Both markers remain legible while commands, geometry, validation inputs, and document state retain the canonical coordinates. |
| September 2, 2026 | The production `build` script typechecks app and Node projects; the separate `typecheck` and `verify` scripts still check the root project including tests. | Vercel correctly excludes tests via `.vercelignore`, so referencing `tsconfig.test.json` from the production build caused remote TS18003 despite a green local gate. | Remote production builds no longer depend on omitted test sources; the full 38-test/typecheck gate remains unchanged. |

## Active blockers

None recorded.

## Known risks

- Site-tool support must be tested on the deployed URL early.
- Vercel is not connected to GitHub for automatic deployments; releases require the CLI until the account connection is added.
- Deadline allows no broad P1 work before both golden gates pass.
- Production action creation remains intentionally unavailable until the Phase 3 WebMCP tools are registered.

## Exact next action

Stop after Phase 2. Begin only Phase 3 — WebMCP `get_play_state` and `add_play_actions`, culminating in Gate A.

## Last phase handoff

```text
Phase: Phase 2 — Court, Timeline, and Coach Inspector
Status: PASS
Behavior delivered: Accessible half-court; ten-player and ball markers; deterministic static action geometry; synchronized O1–O5 timeline; coach inspector edits and locks; clock editor; reset; activity rail; honest empty, manual, WebMCP-unregistered, and validation-not-run states.
Files changed: Phase 2 React/CSS shell; pure geometry helpers; court, timeline, inspector, activity, validation-placeholder components; Phase 2 integration tests; preserved shell tests; production-build boundary; 1280×720 acceptance screenshot.
Tests added: 14 Phase 2 UI tests; 38 total tests pass across 5 files (11 unit and 27 integration).
Commands run and results: untouched `npm ci` PASS; untouched baseline `npm run verify` PASS (24 tests); final `git diff --check` PASS; final `npm run verify` PASS (38 tests); unit 11 PASS; integration 27 PASS; production build PASS (139 modules); Vercel production build READY.
Acceptance criteria demonstrated: Pristine r0 SLOB state; command-loaded A1–A6 parity on court/timeline; A3 inspector metadata; A3 destination edit at r2; A3/A4 coach locks at r3/r4; clock 2.0 at r5 with visible overflow; reset at r6; no console errors; DEV harness absent from preview and public build.
Known risks / deferred work: WebMCP, validation, possession, animation, direct dragging, persistence, and production action creation remain intentionally deferred. Manual Vercel deployment remains required.
Recommended next phase: Phase 3 — WebMCP `get_play_state` and `add_play_actions`, culminating in Gate A.
```
