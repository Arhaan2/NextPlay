# Recommended Repository Structure

The repository should stay small enough for a competition sprint while preserving strict boundaries between the basketball domain, state mutations, WebMCP adapters, and React rendering.

```text
NextPlay/
├── .codex/
│   ├── config.toml
│   └── agents/
│       ├── phase-builder.toml
│       ├── test-author.toml
│       ├── test-runner.toml
│       ├── bug-fixer.toml
│       └── release-reviewer.toml
│
├── .github/
│   └── workflows/
│       └── ci.yml                       # P1 if GitHub CI is fast to add
│
├── docs/
│   ├── DESIGN.md
│   ├── BUILD_PLAN.md
│   ├── REPOSITORY_STRUCTURE.md
│   ├── CODEX_RUNBOOK.md
│   ├── GOLDEN_DEMO.md
│   ├── PHASE_STATUS.md
│   ├── PHASE_BRIEF_TEMPLATE.md
│   ├── diagrams/
│   │   ├── runtime-architecture.svg
│   │   └── codex-pipeline.svg
│   └── phases/
│       ├── 00-foundation.md
│       ├── 01-domain-commands.md
│       ├── 02-court-timeline.md
│       ├── 03-webmcp-vertical-slice.md
│       ├── 04-validation-animation.md
│       ├── 05-lock-replan.md
│       ├── 06-polish.md
│       └── 07-release.md
│
├── public/
│   └── favicon.svg
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles.css
│   │
│   ├── domain/                         # Pure basketball vocabulary and invariants
│   │   ├── types.ts
│   │   ├── zones.ts
│   │   ├── schemas.ts
│   │   ├── presets.ts
│   │   ├── actionRules.ts
│   │   └── invariants.ts
│   │
│   ├── application/                    # Only persistent mutation path
│   │   ├── commands.ts
│   │   ├── transaction.ts
│   │   ├── commandMetadata.ts
│   │   ├── commandResults.ts
│   │   ├── agentSnapshot.ts
│   │   └── lockGuard.ts
│   │
│   ├── engine/                         # Pure derived behavior
│   │   ├── validation/
│   │   │   ├── index.ts
│   │   │   ├── clock.ts
│   │   │   ├── overlap.ts
│   │   │   ├── possession.ts
│   │   │   └── references.ts
│   │   ├── animation/
│   │   │   ├── positionAtTime.ts
│   │   │   ├── ballAtTime.ts
│   │   │   ├── controller.ts
│   │   │   └── types.ts
│   │   └── geometry/
│   │       ├── paths.ts
│   │       ├── bezier.ts
│   │       └── coordinates.ts
│   │
│   ├── state/                          # Zustand composition, no duplicate domain logic
│   │   ├── playStore.ts
│   │   ├── selectors.ts
│   │   └── initialState.ts
│   │
│   ├── webmcp/                         # Thin top-level browser adapter
│   │   ├── modelContext.d.ts
│   │   ├── toolNames.ts
│   │   ├── jsonSchemas.ts
│   │   ├── inputSchemas.ts
│   │   ├── registerTools.ts
│   │   ├── tracing.ts
│   │   └── toolResults.ts
│   │
│   ├── ui/
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx
│   │   ├── BrowserStatus.tsx
│   │   ├── ActivityRail.tsx
│   │   ├── ValidationPanel.tsx
│   │   ├── court/
│   │   │   ├── Court.tsx
│   │   │   ├── CourtLines.tsx
│   │   │   ├── CourtPlayer.tsx
│   │   │   ├── ActionPath.tsx
│   │   │   ├── ScreenMarker.tsx
│   │   │   └── Ball.tsx
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx
│   │   │   ├── TimelineRow.tsx
│   │   │   └── TimelineAction.tsx
│   │   └── inspector/
│   │       └── ActionInspector.tsx
│   │
│   └── test/
│       ├── setup.ts
│       ├── fixtures/
│       │   ├── goldenActions.ts
│       │   └── playDocuments.ts
│       └── helpers/
│           ├── createTestStore.ts
│           └── fakeModelContext.ts
│
├── tests/
│   ├── unit/
│   │   ├── schemas.test.ts
│   │   ├── zones.test.ts
│   │   ├── validation.test.ts
│   │   ├── possession.test.ts
│   │   └── animation.test.ts
│   ├── integration/
│   │   ├── commands.test.ts
│   │   ├── locking.test.ts
│   │   ├── revisions.test.ts
│   │   ├── webmcp-registration.test.ts
│   │   └── golden-flow.test.ts
│   └── e2e/                            # P1, only after core flows work
│       └── app-smoke.spec.ts
│
├── AGENTS.md
├── README.md
├── LICENSE
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
└── playwright.config.ts                # P1 only
```

## Boundary rules

### `src/domain/`

May import only domain-local modules and small standard utilities. It must not import React, Zustand, browser APIs, localStorage, or WebMCP.

### `src/application/`

Owns commands, transactions, revisions, lock enforcement, and structured results. It may call pure domain/engine logic and the store’s internal commit API. UI and WebMCP code must enter through this layer.

### `src/engine/`

Contains pure validation, possession, geometry, and animation derivation. It receives a document and returns data. The animation controller may touch `requestAnimationFrame`, but interpolation helpers remain pure.

### `src/state/`

Composes document and session state. It must not contain a second implementation of validation or lock logic. Keep the raw commit method private to the application layer where possible.

### `src/webmcp/`

Contains browser integration only. It validates untrusted tool inputs, logs the call, invokes commands, and returns concise results. It must not implement basketball logic or mutate the store directly.

### `src/ui/`

Renders selectors and dispatches normal coach commands. Domain calculations should be extracted to the engine. Components may change transient view state directly only when that state cannot affect the shared play document.

### `tests/`

Test behavior at the smallest sensible layer. Reuse fixtures but avoid sharing production implementation helpers that would make tests tautological.

## Files to create first

The first useful implementation needs only:

```text
src/domain/types.ts
src/domain/zones.ts
src/domain/presets.ts
src/application/commands.ts
src/application/transaction.ts
src/state/playStore.ts
src/ui/court/Court.tsx
src/webmcp/registerTools.ts
```

Do not create the full tree as empty placeholders. Add directories and files only as the phase requires them.

## Suggested package scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --pretty false",
    "lint": "eslint . --max-warnings 0",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest",
    "verify": "npm run typecheck && npm run lint && npm run test && npm run build",
    "preview": "vite preview"
  }
}
```

Add Playwright scripts only if Phase 5 is complete and the browser install does not threaten the deadline.
