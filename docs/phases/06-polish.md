# Phase 6 — Demo Polish and Feature Freeze

## Objective

Make the already-working golden flow visually clear enough for a two-and-a-half-minute video.

## In scope, in order

1. layout hierarchy at 1280×720
2. obvious locks and actor labels
3. concise validation language
4. copyable golden prompts
5. expandable activity details
6. subtle state transitions
7. optional direct destination drag only if gates already pass

## Out of scope

Any new domain capability, tool, persistence layer, backend, or major interaction.

## Required tests

Regression tests for changed interaction behavior; full `npm run verify`.

## Acceptance

- [ ] Court, activity, checks, and timeline are readable in recording.
- [ ] Viewer can distinguish coach, agent, and system actions.
- [ ] Gate A and B still pass.
- [ ] Feature freeze begins at 10:30 p.m. PT.

## Cut strategy

Remove optional drag or animation flourish immediately if it destabilizes the core flow.
