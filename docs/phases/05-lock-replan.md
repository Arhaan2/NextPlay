# Phase 5 — Human Lock and Agent Replan

## Objective

After coach edits and locks, a real agent re-reads the play and repairs only unlocked timing.

## In scope

- `update_play_action`
- current locks/modifiers/exact positions in agent snapshot
- direct and indirect lock enforcement
- stale-revision guidance
- coach/agent/system activity distinctions
- lock-preservation summary

## Out of scope

Agent lock/unlock, removal, starting-position and defense tools, generalized conflict resolution.

## Required tests

- patch schema cannot alter lock state
- direct locked update returns `ACTION_LOCKED`
- A3/A4 remain deeply equal after A5/A6 updates
- stale write returns `STALE_PLAY_STATE`
- next read includes coach changes
- correct actor/channel activity

## Acceptance

- [ ] Human intervention creates visible clock conflict.
- [ ] Second prompt uses live state.
- [ ] Only unlocked actions change.
- [ ] Final validation passes and animation runs.
- [ ] Gate B is recorded after real deployed execution.

## Cut strategy

Do not add any other WebMCP tool until this gate is reliable.
