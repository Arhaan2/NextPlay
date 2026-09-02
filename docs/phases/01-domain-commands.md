# Phase 1 — Domain, Preset, Store, and Commands

## Objective

A deterministic SLOB play can be mutated only through atomic shared commands with correct lock and revision behavior.

## In scope

- domain types, zones, schemas, preset
- document/session state split
- Zustand store composition
- command transaction wrapper
- add/update/clock/reset/coach-lock commands
- activity metadata and result envelopes

## Out of scope

React court rendering, WebMCP, animation, persistence, player locks.

## Required tests

- deterministic preset
- valid batch commits once
- invalid batch commits nothing
- stale revision fails cleanly
- coach lock increments once
- agent update of locked action fails with no revision
- indirect locked mutation is caught
- session-only changes do not increment content revision

## Acceptance

- [ ] Golden action batch can be loaded through `playCommands`.
- [ ] State/revision/activity are correct.
- [ ] No component or adapter bypasses the command layer.
- [ ] Phase tests, typecheck, and build pass.

## Cut strategy

Keep command APIs explicit. Do not build generic event sourcing, undo/redo, or plugin architecture.
