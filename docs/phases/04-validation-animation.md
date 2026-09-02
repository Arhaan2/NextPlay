# Phase 4 — Validation and Animation

## Objective

The first golden play passes deterministic structural checks and animates cuts, screen, pass, and shot.

## In scope

- reference, clock, overlap, inbound, shot, and possession checks
- stable possession event ordering
- validation panel
- pure player/ball position helpers
- requestAnimationFrame controller
- basic curved paths/screen marker
- `validate_play`
- `animate_play`

## Out of scope

Defensive AI, make/miss physics, quality scores, advanced warnings.

## Required tests

- exact clock overflow details
- pass completion before same-time shot start
- invalid shot possession
- deterministic boundary positions
- validation/animation do not change play revision

## Acceptance

- [ ] Golden play validates at 4.2 seconds.
- [ ] It shows a clear A6 overflow at 2.0 seconds.
- [ ] Animation is understandable and stable.
- [ ] First golden prompt works end to end on deployed URL.

## Cut strategy

Keep defenders static and use straight/quadratic movement only.
