# Phase 3 Gate A Evidence

## Run identity

- Result: PASS
- Successful run completed: September 2, 2026 at 20:23 PDT
- Production URL: https://next-play-lake.vercel.app/
- Deployment: `dpl_EVCDzLqVyrwkbCxSvTFX9YHsddYR`
- Deployed feature commit: `590a2fcd00ce4ea5cd63aae69683428dbba4ed2b`
- Environment: Codex desktop built-in browser with page-scoped Site tools enabled
- Model: `gpt-5.6-sol` (`xhigh` reasoning)
- ChatGPT/Codex desktop version: not exposed to browser automation in this run

## Fresh-page preconditions

- The public HTTPS page loaded without authentication.
- The SLOB preset showed all ten players with the ball at O1.
- Clock: 4.2 seconds.
- Revision: r0.
- Actions: 0; timeline empty.
- WebMCP status: `Agent tools available · 2 site tools`.
- Validation: not run.
- No DEV harness was present.
- Console errors: 0.

The built-in browser's WebMCP source view discovered exactly:

1. `get_play_state` (`readOnlyHint: true`)
2. `add_play_actions`

Both top-level input schemas were closed with `additionalProperties: false`; the
write action-item schema was also closed. The source-view capture is preserved
in `artifacts/phase-3/available-site-tools.txt`. Browser chrome itself cannot be
captured by Codex computer control because the Codex app is intentionally denied
to that interface; the page screenshots retain the honest two-tool status pill.

## Exact acceptance prompt

> Use only this page’s site tools for the basketball action. First call
> get_play_state and use the returned revision as expectedRevision. Then call
> add_play_actions exactly once with these six actions:
>
> O3 move to left_wing from 0.00 for 0.75 seconds, label Clear.
> O4 move to rim from 0.00 for 0.85 seconds, label Decoy cut.
> O5 set a pin_down screen for O2 at right_block from 0.15 for 0.80 seconds,
> label Pin-down.
> O2 move to right_corner using pathStyle flare from 0.30 for 1.05 seconds,
> label Corner flare.
> O1 pass to O2 from 1.40 for 0.30 seconds, label Inbound pass.
> O2 shoot from 1.72 for 0.43 seconds, label Corner three.
> Do not use ordinary page clicks to add the actions. After the tool call, inspect
> the live page and report the returned revision, action IDs, and whether the
> court and timeline both show all six actions.

## Genuine site-tool results

`get_play_state` returned:

```json
{
  "ok": true,
  "revision": 0,
  "scenario": "sideline_out_of_bounds",
  "clockSeconds": 4.2,
  "ballOwnerId": "O1",
  "playerCount": 10,
  "actions": [],
  "lockedActionCount": 0,
  "validationStatus": "not_run"
}
```

`add_play_actions` was then called exactly once with `expectedRevision: 0` and
the six prompt actions. It returned:

```json
{
  "ok": true,
  "revision": 1,
  "actionCount": 6,
  "actionIds": ["A1", "A2", "A3", "A4", "A5", "A6"],
  "lockedActionsPreserved": 0
}
```

No write confirmation was requested by this browser environment.

## Postconditions

- Start revision: r0; end revision: r1; exactly one revision increment.
- SVG court IDs: A1, A2, A3, A4, A5, A6.
- Timeline IDs: A1, A2, A3, A4, A5, A6.
- Court/timeline parity: exact match.
- Activity rail contained exactly two completed AGENT/WebMCP operations:
  `GET PLAY STATE` (r0 → r0) and `ADD ACTIONS` (r0 → r1).
- The page updated before the write result was returned; no reload was used.
- Validation remained `not_run`; no validation result was fabricated.
- No animation began.
- No DEV harness was present or used.
- The page remained manually usable.
- Console errors after execution: 0.
- Tool discovery still contained exactly the same two tools after execution.

## Visual evidence

- `artifacts/phase-3/gate-a-pristine-1280x720.jpg`
- `artifacts/phase-3/gate-a-complete-1280x720.jpg`
- `artifacts/phase-3/available-site-tools.txt`

The extra `artifacts/phase-3/gate-a-pristine.jpg` is the original full-page
capture retained for provenance; the 1280×720 capture is the acceptance image.
