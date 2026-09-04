# Phase 7 — Release Candidate and Hardening

## Objective

Produce and record one known-good technical release candidate under the active feature freeze.

## In scope

- clean primary-checkout and fresh-clone reproducibility
- full automated gate and test-integrity audit
- repository, dependency, bundle, and public-access audits
- viewport and accessibility smoke checks
- blocker-only fixes with regression coverage
- truthful README and technical release documentation
- two complete fresh-context production golden-flow runs
- release-candidate commit, deployment, evidence, and rollback record

## Out of scope

- new product capability or architecture changes
- five consecutive final runs
- public demo video
- submission screenshots and copy
- uploads or Devpost submission

The excluded release-presentation and submission work belongs to Phase 8.

## Required checks

```bash
npm ci
npm run verify
```

Also require fresh-clone verification, production HTTP/bundle inspection, exact five-tool discovery, the two deployed golden flows, reset proof, and the three target viewport checks.

## Acceptance

- [ ] Primary and fresh-clone installs and full verification pass.
- [ ] Public URL and repository are accessible without authentication.
- [ ] Exactly the intended five WebMCP tools are discoverable.
- [ ] Two complete fresh-context deployed golden-flow runs pass.
- [ ] Locked coach actions remain deeply unchanged during both replans.
- [ ] Final validation is 7/7 and final animation completes within 2.0 seconds.
- [ ] The 1280×720, 1440×900, and 1920×1080 viewports have no unwanted outer-page overflow or hidden required controls.
- [ ] README, license, release manifest, candidate commits, deployment, and rollback target are recorded truthfully.

## Rollback strategy

Keep the previous known-good deployment available. If a blocker cannot be corrected within two small production-fix cycles, stop and restore the last accepted build rather than expanding scope.

## Phase boundary clarification

The explicit September 3, 2026 release brief supersedes the earlier combined release/submission wording: Phase 7 ends after the technical release candidate and two complete production runs. Phase 8 owns five consecutive final runs, video, submission screenshots and copy, uploads, and submission execution.
