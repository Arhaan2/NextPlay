# Phase Status

**Last updated:** September 2, 2026
**Current phase:** Phase 3 — WebMCP Read/Add Vertical Slice
**Overall status:** PHASE 3 ACCEPTED
**Integration branch:** `main`
**Known-good commit:** `590a2fcd00ce4ea5cd63aae69683428dbba4ed2b`
**Known-good deployment:** https://next-play-lake.vercel.app
**GitHub repository:** https://github.com/Arhaan2/NextPlay

## Phase table

| Phase | Status | Accepted commit | Automated gate | External gate | Notes |
|---|---|---|---|---|---|
| 0. Foundation/deploy | PASS | `03b64cb881b3b940b0cd0394f5e9ec17f517833b` | `npm ci`; `npm run verify` PASS (3 tests) | PASS — fresh no-auth browser load | Vercel production alias: https://next-play-lake.vercel.app |
| 1. Domain/commands | PASS | `462928fa53b995641e90c5c6effa23eaaba3220a` | `npm ci`; `npm run verify` PASS (24 tests) | n/a | Test files are included in root static typechecking. DEV harness and production-preview smoke passed. |
| 2. Court/timeline | PASS | `11fbb3e8a8c0a398632d1e500a3115d76f520f32` | `npm ci`; `npm run verify` PASS (38 tests) | PASS — 1280×720 local flow, production preview, and fresh public browser | Canonical A1–A6 fixture is rendered through the DEV-only command harness; acceptance screenshot: `artifacts/phase-2-coach-edit-1280x720.png`. |
| 3. WebMCP read/add | PASS | `590a2fcd00ce4ea5cd63aae69683428dbba4ed2b` | `npm ci`; `npm run verify` PASS (53 tests) | PASS — real deployed Gate A, r0 → r1 | Exactly `get_play_state` and `add_play_actions`; evidence in `artifacts/phase-3/`. |
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

- [x] The top-level page registers exactly `get_play_state` and `add_play_actions`; unsupported browsers remain in honest manual mode.
- [x] Registration is idempotent, React Strict Mode-safe, abortable on cleanup, and updates availability only after both tools register.
- [x] Both tool inputs use closed JSON schemas and strict Zod parsing at the untrusted boundary; `get_play_state` has `readOnlyHint: true`.
- [x] Both adapters use the shared command/session layers; no WebMCP handler mutates persistent Zustand document state directly.
- [x] Read results expose current revision, preset, clock, players, actions, and locks; write results expose revision and changed action summaries.
- [x] A valid batch is atomic, increments revision once, is visible before success returns, and records genuine AGENT/WebMCP activity without duplication.
- [x] Automated contract and integration coverage passes: 7 files and 53 tests, plus lint, root typecheck, and a 146-module production build.
- [x] Fresh deployed support detection reported `Agent tools available · 2 site tools`; source discovery listed only `get_play_state` and `add_play_actions`.
- [x] Real deployed Gate A read the pristine SLOB at r0 and 4.2 seconds, then one write returned r1 and A1–A6.
- [x] The deployed SVG court and O1–O5 timeline contained the identical A1–A6 set without reload; validation remained not run and animation remained idle.
- [x] Activity showed completed `GET PLAY STATE` r0 → r0 and `ADD ACTIONS` r0 → r1 events; console errors were zero and no DEV harness was present.
- [x] Gate A evidence is recorded in `artifacts/phase-3/GATE_A.md`, `artifacts/phase-3/available-site-tools.txt`, and the pristine/completed 1280×720 screenshots.

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
| September 2, 2026 | Agent snapshot `endSecond` values are normalized to 15 significant digits at serialization only. | Direct IEEE-754 addition exposed `0.9500000000000001` for A3, which is noisy and unsuitable for a concise agent read model. | Stored action timing, command behavior, and revision semantics remain unchanged; WebMCP snapshots return stable human-scale decimal values. |
| September 2, 2026 | Gate A's tool-list artifact uses the built-in browser WebMCP source view plus the page's honest two-tool status instead of a browser-chrome screenshot. | Codex computer control intentionally denies access to the Codex app itself, so its Site tools popover cannot be captured programmatically. | Exact production tool names, origin, annotations, closed-schema properties, and count are preserved in the evidence; the real site-tool read/write and page screenshots remain independently recorded. |

## Active blockers

None recorded.

## Known risks

- Vercel is not connected to GitHub for automatic deployments; releases require the CLI until the account connection is added.
- Deadline allows no broad P1 work before both golden gates pass.
- `update_play_action`, deterministic validation, and animation remain intentionally unavailable until their later phases.
- Built-in browser chrome is not capturable through Codex computer control; future external-gate records should continue pairing source-view discovery with page-state screenshots.

## Exact next action

Stop after Phase 3. Begin only Phase 4 — deterministic validation and animation.

## Last phase handoff

```text
Phase: Phase 3 — WebMCP Read/Add Vertical Slice
Status: PASS
Behavior delivered: Small top-level WebMCP surface; lifecycle-safe registration; honest support detection; concise agent snapshot; real read and atomic add adapters; visible-before-return state updates; genuine AGENT/WebMCP activity.
Files changed: WebMCP declarations, names, closed schemas, results, tracing, registration, and React hook; agent snapshot; transaction/session/status integration; activity empty state; independent unit/integration contracts; Gate A evidence artifacts.
Tests added: 15 Phase 3 tests; 53 total tests pass across 7 files (22 unit and 31 integration).
Commands run and results: untouched `npm ci` PASS; untouched baseline `npm run verify` PASS (38 tests); final `git diff --check` PASS; `npm run typecheck`, `npm run lint`, `npm run test:unit` (22), `npm run test:integration` (31), `npm run test` (53), `npm run build` (146 modules), and repeated `npm run verify` all PASS; Vercel production build READY.
Acceptance criteria demonstrated: Production discovery exposed exactly two tools; real `get_play_state` returned the live pristine r0 SLOB/4.2-second state; one `add_play_actions` call used expectedRevision 0 and returned r1/A1–A6; court/timeline ID parity and genuine activity were visible without reload; validation/animation remained untouched; console errors zero.
Known risks / deferred work: Phase 4 validation/animation, Phase 5 update/locks/replan, direct dragging, persistence, and automatic GitHub deployment remain deferred. Browser-chrome evidence capture is unavailable to Codex automation, so the source-view tool record is paired with page screenshots.
Recommended next phase: Phase 4 — deterministic validation and animation only.
```
