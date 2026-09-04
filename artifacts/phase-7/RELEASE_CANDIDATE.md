# NextPlay RC1 — Release Candidate Record

## Candidate identity

- Candidate name: **NextPlay RC1**
- Repository: https://github.com/Arhaan2/NextPlay
- Branch: `main`
- Source HEAD / candidate code commit: `e774e5a7b1725720be1987827cf8e5a8dcbaf505`
- Production URL: https://next-play-lake.vercel.app
- Deployment ID: `dpl_BSr1FpJv5gfe4BrcwyAjL7yWvMop`
- Previous known-good code commit: `41814991f1b2d5132fae67c162cda08a16a93bac`
- Previous known-good deployment ID: `dpl_yx74y3fxaySjh3BfzitxRcdfbSLA`

## Reproducibility and automated gate

- Runtime: Node `v24.18.0`; npm `11.16.0`
- Dependency install: clean `npm ci --prefer-online --no-audit --no-fund` with an isolated temporary npm cache; 237 packages installed.
- Primary-checkout verification: **PASS**. Typecheck, zero-warning lint, 32 unit tests, 55 integration tests, 87 total tests across 15 files, production build, full `npm run verify`, and `git diff --check` passed.
- Exact-candidate fresh clone: **PASS**. Clone path `/private/tmp/nextplay-p7-final-clone.dgZTeT` was verified at the exact candidate commit and then removed; isolated cache `/private/tmp/nextplay-p7-final-cache.Ei9FJW` was retained.
- Dependency tree: **PASS**. `@bramus/specificity@2.4.2` and `jsdom@30.0.1` resolve correctly; direct ESM import of `@bramus/specificity` passed without adding it as a direct dependency.
- Fresh-clone verification: **PASS**. `npm run verify` passed with 87 tests across 15 files and a 156-module production build; clone status and diff check were clean.
- Test-integrity audit: **PASS**. No skipped/focused suites, TypeScript or ESLint suppressions, arbitrary sleeps, environment-only production bypasses, weakened lock assertions, or mocked units under test were found.

## Repository, bundle, and documentation

- Public repository/default branch/license: **PASS** — public `Arhaan2/NextPlay`, `main`, MIT.
- README/license status: **PASS** — product-focused README, public demo, exact prompts, exact tool surface, architecture, local setup, verification, limitations, and MIT license are documented.
- Tool surface: `get_play_state`, `add_play_actions`, `validate_play`, `animate_play`, `update_play_action` in that order. No lock or unlock WebMCP tool exists.
- Bundle audit: **PASS** — production HTML 579 bytes, JavaScript 337,214 bytes, CSS 14,405 bytes; all assets return HTTP 200. The bundle contains the five intended tool names, NextPlay/SLOB identity and prompts, and no DEV harness, forbidden tools, source maps, test fixtures, or unexpected dependency growth.

## Browser and production evidence

- Ordinary-browser smoke: **PASS** — clean Chrome context loaded without authentication, showed NextPlay, the pristine ten-player SLOB, O1 possession, a 4.2-second clock, zero actions, validation not run, idle animation, Reset, exact prompt controls, and honest Manual mode.
- Layout: **PASS** — deployed measurements equal the viewport with no outer overflow at 1280×720, 1440×900, and 1920×1080; all required controls were visible. The prior 19px 1280×720 overflow was reproduced, covered by a structural regression, fixed without overlap, reviewed, and rechecked in production.
- Focus/reduced motion: **PASS** — live keyboard focus showed a 2px solid visible outline with 3px offset; the reduced-motion rule and its automated contract remain unchanged.
- External Flow A: **PASS twice** — each fresh context read r0, added A1–A6 at r1, validated 7/7, and animated to 2.15 seconds with six court paths, six timeline actions, visible playhead motion, and activity events.
- External Flow B: **PASS twice** — coach edit/locks advanced r1→r5; A6 reported exact 2.15-second end and 0.15-second overflow; agent reads at r5, updates only A5 then A6 at r6/r7, validates 7/7, and animates to 1.95 seconds. Complete A3/A4 snapshots compared deeply equal before and after; the only changed actions were A5/A6.
- Reset: **PASS twice** — restored the 4.2-second pristine preset, ten players, O1 possession, zero actions, validation not run, and idle animation.
- Manual fallback: **PASS** — real clean-Chrome pristine/manual mode plus automated UI contracts cover visible court, coach inspector/locks, clock, validation, playback, Reset, prompt copying, zero fake agent activity, and no model-context requirement.
- Console: **PASS** — zero page console errors in both official in-app browser runs and the isolated negative run.
- Negative checks: **PASS** — locked A3 update returned `ACTION_LOCKED`; stale update returned `STALE_PLAY_STATE`; invalid animation returned `PLAY_INVALID`; invalid batch returned `INVALID_INPUT` and left revision/actions at r0/zero.

## Evidence files

- `artifacts/phase-7/rc-pristine-1280x720.png` — clean ordinary-Chrome production view showing the repaired 1280×720 containment and honest Manual mode.
- This record contains the exact revision, validation, animation, reset, console, and negative-check outcomes from the two WebMCP-capable deployed runs.

The in-app browser exposed and executed all WebMCP tools successfully, but its screenshot endpoint failed and Codex correctly prohibited OS-level capture of its own window. No screenshot or external result was fabricated. Phase 8 must capture the final submission images/video through an available user-visible capture path.

## Rollback and remaining risk

If the candidate must be rolled back, promote previous deployment `dpl_yx74y3fxaySjh3BfzitxRcdfbSLA` to the production alias and revert `e774e5a7b1725720be1987827cf8e5a8dcbaf505` in a new commit; then repeat `npm run verify` and the two golden flows. Do not rewrite shared history.

Unresolved product blockers: none for Phase 7. The only tooling limitation is the protected in-app screenshot path described above. Phase 8 final five-run acceptance, video, submission screenshots/copy, uploads, and submission have not begun.

## Decision

**PASS — PHASE 7 RELEASE CANDIDATE ACCEPTED.**
