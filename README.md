# NextPlay — Planning and Codex Orchestration Package

This package converts the supplied product specification into a competition-ready implementation system.

## Copy into the repository root

Copy all files in this package into the root of the new `NextPlay` repository before starting Codex Phase 0.

## Included

- `AGENTS.md` — durable repository instructions, architecture invariants, scope, test policy, and phase workflow.
- `.codex/config.toml` — multi-agent settings.
- `.codex/agents/` — specialized builder, test author, test runner, bug fixer, and release reviewer roles.
- `docs/DESIGN.md` — full technical design.
- `docs/BUILD_PLAN.md` — time-boxed, gated build sequence through submission.
- `docs/REPOSITORY_STRUCTURE.md` — exact recommended tree and import boundaries.
- `docs/CODEX_RUNBOOK.md` — prompts and handoff protocol for the multi-agent pipeline.
- `docs/GOLDEN_DEMO.md` — exact live demo and acceptance contract.
- `docs/PHASE_STATUS.md` — durable status file for phase-to-phase handoffs.
- `docs/phases/` — one bounded brief per build phase.
- `docs/diagrams/` — runtime architecture and Codex pipeline in DOT, SVG, and PNG.
- `snippets/` — copyable package scripts and first orchestrator prompt.

## First action

1. Create/scaffold the repository.
2. Copy this package into it.
3. Trust the project in Codex so project configuration loads.
4. Open `docs/CODEX_RUNBOOK.md`.
5. Paste `snippets/first-orchestrator-prompt.txt` into the primary Codex thread.

## Critical correction to the source schedule

The official deadline is Thursday, September 3, 2026 at 1:00 p.m. PT. This package uses a 10:30 p.m. Wednesday feature freeze and an 11:45 a.m. Thursday internal submission target.

## Naming note

Codex discovers the plural filename `AGENTS.md`. Do not rename it to `agent.md`.
