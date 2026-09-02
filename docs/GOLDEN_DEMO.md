# Golden Demo Contract

This document is the observable acceptance contract for the competition submission. Automated tests support it, but real deployed site-tool execution is required.

## 1. Pristine preset

After a fresh load or **Reset Demo**:

```text
Scenario: Sideline out of bounds
Clock: 4.2 seconds
Defense: Man-to-man
Primary target: Right-corner three for O2
Ball owner: O1
Play revision: deterministic initial value
Actions: none
Animation: idle at 0.0 seconds
```

The court shows all ten players in the defined SLOB preset. The timeline is empty but usable. WebMCP status is honest.

## 2. First prompt

```text
Use this page's tools to create a sideline out-of-bounds play that produces a
right-corner three for O2. O5 should screen for O2, O4 should cut as a decoy,
and the entire play must finish within 4.2 seconds. Read the current play first,
add the actions, validate the result, and animate it.
```

## 3. Expected first tool sequence

```text
get_play_state
add_play_actions
validate_play
animate_play
```

The exact number of update calls may vary only if the agent self-corrects a rejected input. A normal successful run should use one atomic `add_play_actions` call.

## 4. Expected first play

The agent may choose small timing differences, but the tested golden fixture is:

| ID | Type | Actor | Target/destination | Start | Duration | End |
|---|---|---|---|---:|---:|---:|
| A1 | move | O3 | left_wing | 0.00 | 0.75 | 0.75 |
| A2 | move | O4 | rim | 0.00 | 0.85 | 0.85 |
| A3 | screen | O5 | O2 at right_block | 0.15 | 0.80 | 0.95 |
| A4 | move | O2 | right_corner | 0.30 | 1.05 | 1.35 |
| A5 | pass | O1 | O2 | 1.40 | 0.30 | 1.70 |
| A6 | shot | O2 | rim | 1.72 | 0.43 | 2.15 |

Expected structural state:

- play has an inbound pass
- play has a shot
- O1 owns ball at A5 start
- O2 owns ball at A6 start
- no same-player incompatible overlap
- all actions finish by 4.2 seconds
- no locked actions yet

## 5. First-flow visual acceptance

- [ ] Actions appear on court.
- [ ] The same actions appear on the timeline.
- [ ] Activity shows read, add, validate, and animate.
- [ ] Validation shows all required checks passing.
- [ ] Animation visibly includes cuts, screen, pass, and shot.
- [ ] No reload is required.
- [ ] Play revision increments only for the add batch.

## 6. Human intervention

Through normal UI controls, the coach:

1. selects A3
2. changes A3 destination to `right_elbow`
3. locks A3
4. locks A4
5. changes the clock from 4.2 to 2.0 seconds

Expected results:

- A3 `lastModifiedBy` is `coach`
- A3 destination and nearest semantic zone are current
- A3 and A4 show visible locks
- each successful content edit increments revision once
- validation identifies A6 as ending at 2.15, beyond 2.0
- activity distinguishes the coach edits from agent activity

Capture deep snapshots of A3 and A4 for locked-preservation tests.

## 7. Second prompt

```text
I moved the screen, locked the screen and O2's route, and shortened the clock to
2.0 seconds. Re-read the live play and retime only the unlocked actions so the
play finishes within the new clock. Preserve every locked action, validate it,
and animate it again.
```

## 8. Expected second tool sequence

```text
get_play_state
update_play_action
update_play_action
validate_play
animate_play
```

The intended updates are A5 and A6. The agent must not write A3 or A4.

## 9. Second-flow data acceptance

- [ ] `get_play_state` returns the current 2.0-second clock.
- [ ] It returns A3/A4 as locked and coach-modified.
- [ ] It returns the current play revision.
- [ ] It returns A3 at the coach-selected location.
- [ ] The agent updates only unlocked actions.
- [ ] A3 after the agent turn deeply equals the captured A3 lock snapshot.
- [ ] A4 after the agent turn deeply equals the captured A4 lock snapshot.
- [ ] Updated pass/shot complete no later than 2.0 seconds.
- [ ] Validation returns no blocking errors.
- [ ] Animation begins from the updated document.
- [ ] Activity includes a system lock-preservation summary.

## 10. Required negative demonstrations

These do not all need to appear in the video, but must be tested:

### Locked update

Attempting to update A3 through `update_play_action` returns:

```json
{
  "ok": false,
  "code": "ACTION_LOCKED",
  "message": "A3 is locked by the coach and cannot be changed. Update an unlocked action instead."
}
```

State and play revision remain unchanged.

### Stale revision

After a coach edit, a write using an older expected revision returns `STALE_PLAY_STATE` and asks the agent to read again.

### Invalid batch

One invalid action in `add_play_actions` prevents every action in the batch from committing.

## 11. Five-run release table

| Run | Date/time | Fresh session | First flow | Human edits | Second flow | Reset | Notes |
|---:|---|---|---|---|---|---|---|
| 1 | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 2 | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 3 | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 4 | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| 5 | | [ ] | [ ] | [ ] | [ ] | [ ] | |

## 12. Video proof order

1. Open on the working court, not a title card.
2. Show first agent construction and animation.
3. Show the coach edit, locks, and shorter clock.
4. Show the validation failure.
5. Show second agent read and unlocked repair.
6. Show final passing checks and animation.
7. Briefly explain why semantic page tools matter.

Target runtime: 2:30–2:40.
