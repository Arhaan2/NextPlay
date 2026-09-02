# Phase 3 — WebMCP Read/Add Vertical Slice

## Objective

A real agent discovers page tools, reads the current preset, and visibly adds actions on the deployed court.

## In scope

- top-level modelContext TypeScript declaration
- honest support detection
- cleanup-safe registration
- tracing/activity wrapper
- `get_play_state`
- `add_play_actions`
- Zod input validation
- concise tool results

## Out of scope

Update/validate/animate tools, extra tools, polish.

## Required tests

- exactly intended tools register
- closed schemas and read-only annotation
- cleanup/Strict Mode lifecycle
- read does not increment revision
- add delegates to commands and commits before return
- invalid input returns descriptive error

## Acceptance

- [ ] Automated WebMCP contract tests pass.
- [ ] Deployed site lists both tools.
- [ ] Real `get_play_state` returns correct state.
- [ ] Real `add_play_actions` visibly updates court and timeline.
- [ ] Gate A is recorded in phase status.

## Rollback/cut strategy

If registration fails, stop all other work and reduce to these two tools until the external gate passes.
