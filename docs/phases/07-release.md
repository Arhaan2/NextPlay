# Phase 7 — Release Candidate and Submission

## Objective

Produce, verify, record, and submit a known-good public release.

## In scope

- full automated gate
- fresh production build
- deployed smoke tests
- five golden-flow runs
- blocker-only fixes
- README and exact testing instructions
- screenshots and public video
- Devpost fields and public permissions

## Out of scope

New features, architecture changes, P1 improvements.

## Required checks

```bash
npm ci
npm run verify
```

Plus real deployed Gate A and Gate B.

## Acceptance

- [ ] Five consecutive fresh-session runs pass.
- [ ] Public URL/repository/video are accessible.
- [ ] README and license are complete.
- [ ] Submission is sent by 11:45 a.m. PT.
- [ ] Final commit and deployment are recorded in phase status.

## Rollback strategy

Revert to the last known-good deployment or remove unstable P1 code. Never risk the core flow for late polish.
