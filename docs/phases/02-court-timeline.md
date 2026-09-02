# Phase 2 — Court, Timeline, and Coach Inspector

## Objective

The golden play is legible on an SVG court and timeline, and the coach can edit/lock it through deterministic controls.

## In scope

- half-court SVG
- player markers
- move/dribble/screen/pass/shot path rendering
- player timeline rows
- action selection
- inspector timing/destination/label controls
- human-only lock toggle
- editable clock and reset

## Out of scope

Direct drag, responsive mobile redesign, sophisticated motion, WebMCP.

## Required tests

- preset markers render
- court and timeline use same actions
- selection shows correct inspector
- UI dispatches commands
- lock state is visible
- clock edit and reset work

## Acceptance

- [ ] Six-action fixture is immediately understandable.
- [ ] A3 destination can be changed to right elbow.
- [ ] A3/A4 can be locked through UI.
- [ ] 1280×720 layout is usable.
- [ ] Phase tests and build pass.

## Cut strategy

Use simple path geometry and plain numeric/select inputs. Dragging is not required.
